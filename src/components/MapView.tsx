import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { Venue, VenueWithEvents } from '../types';
import { CATEGORY_COLORS, DIMMED_COLOR } from '../lib/categories';
import { ANKARA_CENTER, DEFAULT_ZOOM } from '../lib/geo';
import { t } from '../i18n/tr';

// MapLibre 6 runs its worker from a separate file; let Vite serve it.
setWorkerUrl(workerUrl);

const SOURCE_ID = 'venues';

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> katkıcıları',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export interface MapViewHandle {
  flyTo(lat: number, lng: number, opts?: { zoom?: number; forPanel?: boolean }): void;
  setUserLocation(lat: number, lng: number): void;
}

interface Props {
  activeVenues: VenueWithEvents[];
  /** Venues without matching events; drawn dimmed when non-empty. */
  inactiveVenues: Venue[];
  selectedVenueId: string | null;
  onSelectVenue(id: string): void;
  onReady(): void;
  onError(): void;
}

type VenueFeature = Feature<Point, { venueId: string; name: string; color: string; count: number }>;

function toGeoJSON(venues: VenueWithEvents[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: venues.map(
      (v): VenueFeature => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [v.venue.lng, v.venue.lat] },
        properties: {
          venueId: v.venue.id,
          name: v.venue.name,
          color: v.dominantCategory ? CATEGORY_COLORS[v.dominantCategory] : DIMMED_COLOR,
          count: v.events.length,
        },
      }),
    ),
  };
}

function pinElement(className: string, color: string, label: string, text: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.style.setProperty('--pin-color', color);
  el.setAttribute('aria-label', label);
  el.title = label;
  if (className.startsWith('pin')) {
    // 44px transparent hit area around a smaller visible dot.
    const dot = document.createElement('span');
    dot.className = 'pin__dot';
    dot.textContent = text;
    el.append(dot);
  } else {
    el.textContent = text;
  }
  return el;
}

/** Zoom at which clustering stops, so a selected venue is always its own pin. */
const CLUSTER_MAX_ZOOM = 15;
const SELECT_ZOOM = CLUSTER_MAX_ZOOM + 1;

/**
 * Panel/sheet covers part of the map; shift the target so the pin lands in the
 * visible area (left of the desktop panel, above the mobile sheet at 50dvh).
 */
function panelOffset(container: HTMLElement): [number, number] {
  if (window.matchMedia('(min-width: 768px)').matches) return [-200, 0];
  const rect = container.getBoundingClientRect();
  const sheetTop = window.innerHeight * 0.5;
  const visibleCenter = (rect.top + sheetTop) / 2;
  return [0, Math.round(visibleCenter - (rect.top + rect.height / 2))];
}

export const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  { activeVenues, inactiveVenues, selectedVenueId, onSelectVenue, onReady, onError },
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
        style: STYLE,
        center: ANKARA_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 8,
        maxZoom: 19,
        attributionControl: { compact: false },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      // Most likely WebGL is unavailable.
      callbacks.current.onError();
      return;
    }
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
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
            const el = pinElement('cluster', '#1f2937', t.clusterLabel(n), String(n));
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
          const color = p.color as string;
          const count = p.count as number;
          key = `v:${venueId}:${color}:${count}`;
          create = () => {
            const el = pinElement('pin', color, t.venuePinLabel(p.name as string, count), String(count));
            el.dataset.venueId = venueId;
            if (venueId === selectedRef.current) el.classList.add('is-selected');
            el.addEventListener('click', () => callbacks.current.onSelectVenue(venueId));
            return new Marker({ element: el }).setLngLat(coords);
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

    // 'style.load' (not 'load') so pins appear without waiting for every tile.
    map.once('style.load', () => {
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
      loadedRef.current = true;
      callbacks.current.onReady();
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

  // Push new data into the clustered source.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(toGeoJSON(activeVenues));
  }, [activeVenues]);

  // Dimmed (no matching events) venues: plain, unclustered markers.
  useEffect(() => {
    const map = mapRef.current;
    dimmedMarkersRef.current.forEach((m) => m.remove());
    dimmedMarkersRef.current = [];
    if (!map) return;
    dimmedMarkersRef.current = inactiveVenues.map((v) => {
      const el = pinElement('pin pin--dimmed', DIMMED_COLOR, t.venuePinLabel(v.name, 0), '');
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
