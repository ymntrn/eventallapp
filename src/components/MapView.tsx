import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { Venue, VenueWithEvents } from '../types';
import type { Theme } from '../lib/theme';
import { ANKARA_CENTER, DEFAULT_ZOOM } from '../lib/geo';
import { t } from '../i18n/tr';

// MapLibre 6 runs its worker from a separate file; let Vite serve it.
setWorkerUrl(workerUrl);

const SOURCE_ID = 'venues';

/**
 * OpenFreeMap vector styles: "Positron" (light, almost white) and "Dark".
 * Free, no API key; data © OpenStreetMap. See README for production notes.
 */
const STYLE_URL: Record<Theme, string> = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

/** Paper-white (or app-dark) background so the map matches the UI. */
const BACKGROUND: Record<Theme, string> = { light: '#ffffff', dark: '#0f1115' };

export interface MapViewHandle {
  flyTo(lat: number, lng: number, opts?: { zoom?: number; forPanel?: boolean }): void;
  /** Zooms out/in so all given venues are visible. */
  fitTo(venues: Venue[]): void;
  setUserLocation(lat: number, lng: number): void;
}

interface Props {
  theme: Theme;
  activeVenues: VenueWithEvents[];
  /** Venues without matching events; drawn as small hollow dots. */
  inactiveVenues: Venue[];
  selectedVenueId: string | null;
  onSelectVenue(id: string): void;
  onReady(): void;
  onError(): void;
}

type VenueFeature = Feature<Point, { venueId: string; name: string; count: number }>;

function toGeoJSON(venues: VenueWithEvents[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: venues.map(
      (v): VenueFeature => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [v.venue.lng, v.venue.lat] },
        properties: { venueId: v.venue.id, name: v.venue.name, count: v.events.length },
      }),
    ),
  };
}

/** Pins are plain HTML buttons styled in CSS, so they follow the light/dark theme. */
function pinElement(className: string, label: string, text: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.setAttribute('aria-label', label);
  el.title = label;
  // 44px transparent hit area around a smaller visible shape.
  const shape = document.createElement('span');
  shape.className = `${className.split(' ')[0]}__shape`;
  shape.textContent = text;
  el.append(shape);
  return el;
}

/** Zoom at which clustering stops, so a selected venue is always its own pin. */
const CLUSTER_MAX_ZOOM = 15;
const SELECT_ZOOM = CLUSTER_MAX_ZOOM + 1;

/** Map padding that keeps pins clear of the floating search bar, sheet and nav. */
function viewPadding() {
  const desktop = window.matchMedia('(min-width: 768px)').matches;
  return desktop ? { top: 100, bottom: 60, left: 60, right: 60 } : { top: 110, bottom: 110, left: 40, right: 40 };
}

/**
 * Panel/sheet covers part of the map; shift the target so the pin lands in the
 * visible area (left of the desktop panel, above the mobile sheet).
 */
function panelOffset(container: HTMLElement): [number, number] {
  if (window.matchMedia('(min-width: 1024px)').matches) return [-210, 0];
  const rect = container.getBoundingClientRect();
  // Visible band: below the floating search/filter block, above the sheet.
  const top = document.querySelector('.map-top')?.getBoundingClientRect().bottom ?? rect.top;
  const sheetTop = document.querySelector('.sheet')?.getBoundingClientRect().top ?? rect.top + rect.height * 0.5;
  const visibleCenter = (top + sheetTop) / 2;
  return [0, Math.round(visibleCenter - (rect.top + rect.height / 2))];
}

export const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  { theme, activeVenues, inactiveVenues, selectedVenueId, onSelectVenue, onReady, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  /** Markers for clustered source features, keyed by identity + content. */
  const markersRef = useRef(new Map<string, Marker>());
  const dimmedMarkersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const callbacks = useRef({ onSelectVenue, onReady, onError });
  callbacks.current = { onSelectVenue, onReady, onError };
  const selectedRef = useRef(selectedVenueId);
  selectedRef.current = selectedVenueId;
  const dataRef = useRef(activeVenues);
  dataRef.current = activeVenues;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  /** Theme of the style currently loaded in the map. */
  const appliedTheme = useRef(theme);

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, opts = {}) {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({
        center: [lng, lat],
        zoom: opts.zoom ?? Math.max(map.getZoom(), SELECT_ZOOM),
        offset: opts.forPanel ? panelOffset(map.getContainer()) : [0, 0],
        essential: true,
      });
    },
    fitTo(venues) {
      const map = mapRef.current;
      if (!map || venues.length === 0) return;
      const bounds = new LngLatBounds();
      for (const v of venues) bounds.extend([v.lng, v.lat]);
      map.fitBounds(bounds, { padding: viewPadding(), maxZoom: 14, duration: 700 });
    },
    setUserLocation(lat, lng) {
      const map = mapRef.current;
      if (!map) return;
      if (!userMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'user-dot';
        el.setAttribute('role', 'img');
        el.setAttribute('aria-label', t.youAreHere);
        userMarkerRef.current = new Marker({ element: el });
      }
      userMarkerRef.current.setLngLat([lng, lat]).addTo(map);
    },
  }));

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL[appliedTheme.current],
        center: ANKARA_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 8,
        maxZoom: 19,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      // Most likely WebGL is unavailable.
      callbacks.current.onError();
      return;
    }
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;
    const markers = markersRef.current;

    const syncMarkers = () => {
      if (!loadedRef.current || !map.getSource(SOURCE_ID) || !map.isSourceLoaded(SOURCE_ID)) return;
      const seen = new Set<string>();
      for (const f of map.querySourceFeatures(SOURCE_ID)) {
        const p = f.properties as Record<string, unknown>;
        const coords = (f.geometry as Point).coordinates as [number, number];
        let key: string;
        let create: () => Marker;
        if (p.cluster) {
          const clusterId = p.cluster_id as number;
          const n = p.point_count as number;
          key = `c:${clusterId}:${n}`;
          create = () => {
            const el = pinElement('cluster', t.clusterLabel(n), String(n));
            el.addEventListener('click', async () => {
              const source = map.getSource<GeoJSONSource>(SOURCE_ID);
              if (!source) return;
              const zoom = await source.getClusterExpansionZoom(clusterId);
              map.easeTo({ center: coords, zoom: Math.min(zoom, 19) });
            });
            return new Marker({ element: el }).setLngLat(coords);
          };
        } else {
          const venueId = p.venueId as string;
          const count = p.count as number;
          key = `v:${venueId}:${count}`;
          create = () => {
            const el = pinElement('pin', t.venuePinLabel(p.name as string, count), String(count));
            el.dataset.venueId = venueId;
            if (venueId === selectedRef.current) el.classList.add('is-selected');
            el.addEventListener('click', () => callbacks.current.onSelectVenue(venueId));
            return new Marker({ element: el, anchor: 'bottom' }).setLngLat(coords);
          };
        }
        if (seen.has(key)) continue; // features repeat across tile boundaries
        seen.add(key);
        if (!markers.has(key)) markers.set(key, create().addTo(map));
      }
      for (const [key, m] of markers) {
        if (!seen.has(key)) {
          m.remove();
          markers.delete(key);
        }
      }
    };

    // Runs on the first style and again after every theme switch (setStyle drops
    // custom sources). 'style.load' (not 'load') so pins appear before all tiles.
    map.on('style.load', () => {
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'background')
          map.setPaintProperty(layer.id, 'background-color', BACKGROUND[appliedTheme.current]);
      }
      if (map.getSource(SOURCE_ID)) return;
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toGeoJSON(dataRef.current),
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
      });
      // Invisible layer: required so the source gets tiled; markers are drawn as HTML.
      map.addLayer({
        id: 'venues-hidden',
        type: 'circle',
        source: SOURCE_ID,
        paint: { 'circle-radius': 1, 'circle-opacity': 0 },
      });
      if (!loadedRef.current) {
        loadedRef.current = true;
        callbacks.current.onReady();
      }
    });
    map.on('render', syncMarkers);

    return () => {
      markers.forEach((m) => m.remove());
      markers.clear();
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Light/dark basemap.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    map.setStyle(STYLE_URL[theme], { diff: false });
  }, [theme]);

  // Push new data into the clustered source.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(toGeoJSON(activeVenues));
  }, [activeVenues]);

  // Venues without matching events: small hollow dots, unclustered.
  useEffect(() => {
    const map = mapRef.current;
    dimmedMarkersRef.current.forEach((m) => m.remove());
    dimmedMarkersRef.current = [];
    if (!map) return;
    dimmedMarkersRef.current = inactiveVenues.map((v) => {
      const el = pinElement('dot', t.venuePinLabel(v.name, 0), '');
      el.dataset.venueId = v.id;
      if (v.id === selectedRef.current) el.classList.add('is-selected');
      el.addEventListener('click', () => callbacks.current.onSelectVenue(v.id));
      return new Marker({ element: el }).setLngLat([v.lng, v.lat]).addTo(map);
    });
  }, [inactiveVenues]);

  // Highlight the selected pin.
  useEffect(() => {
    const all = [...markersRef.current.values(), ...dimmedMarkersRef.current];
    for (const m of all) {
      const el = m.getElement();
      el.classList.toggle('is-selected', !!selectedVenueId && el.dataset.venueId === selectedVenueId);
    }
  }, [selectedVenueId]);

  return <div ref={containerRef} className="map" role="region" aria-label={t.mapLabel} />;
});
