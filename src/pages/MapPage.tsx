import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../lib/data';
import { filterEvents, groupByVenue, isSampleEvent } from '../lib/data';
import type { Theme } from '../lib/theme';
import { actions, getState, useAppState } from '../lib/store';
import { navigate, paths } from '../lib/router';
import { cityAt } from '../lib/geo';
import { CITIES } from '../types';
import { showToast } from '../lib/toast';
import { t } from '../i18n/tr';
import { MapView, type MapViewHandle } from '../components/MapView';
import { SearchBox } from '../components/SearchBox';
import { VenueSheet } from '../components/VenueSheet';
import { IconClose, IconLocate, IconSliders } from '../components/icons';

interface Props {
  data: AppData | null;
  loadError: boolean;
  onRetry(): void;
  now: number;
  theme: Theme;
  /** Venue to open, from the URL (#/venue/:id). */
  venueId?: string;
  /** False while another page covers the map. */
  active: boolean;
  onOpenFilters(): void;
}

export function MapPage({ data, loadError, onRetry, now, theme, venueId, active, onOpenFilters }: Props) {
  const state = useAppState();
  const { prefs } = state;
  const { city } = prefs;
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapViewHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // While another page or the filter pop-up covers the map, take it out of tab order.
  useEffect(() => {
    rootRef.current?.toggleAttribute('inert', !active);
  }, [active]);

  const upcoming = useMemo(
    () => (data ? filterEvents(data.events, { date: 'all', categories: [] }, now) : []),
    [data, now],
  );
  const filtered = useMemo(
    () => (data ? filterEvents(data.events, { date: prefs.date, categories: prefs.categories, city }, now) : []),
    [data, prefs.date, prefs.categories, city, now],
  );
  const activeVenues = useMemo(() => groupByVenue(filtered), [filtered]);
  const inactiveVenues = useMemo(() => {
    if (!data) return [];
    const active = new Set(activeVenues.map((v) => v.venue.id));
    // The open venue always keeps a marker, even if the filters hide its events.
    return data.venues.filter(
      (v) => !active.has(v.id) && ((prefs.showAllVenues && v.city === city) || v.id === venueId),
    );
  }, [data, prefs.showAllVenues, city, activeVenues, venueId]);

  const selectedVenue = (venueId && data?.venues.find((v) => v.id === venueId)) || null;
  const selectedEvents = useMemo(() => filtered.filter((e) => e.venueId === venueId), [filtered, venueId]);

  // A venue in the other city (search, event page, URL) switches the city.
  // Its own flyTo below wins over the city fit.
  // Runs once per opened venue, so closing the sheet and switching city in the
  // same click cannot bounce back to the old city.
  const lastCity = useRef(city);
  const handledVenue = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedVenue || handledVenue.current === selectedVenue.id) return;
    handledVenue.current = selectedVenue.id;
    if (selectedVenue.city === getState().prefs.city) return;
    lastCity.current = selectedVenue.city;
    actions.setCity(selectedVenue.city);
  }, [selectedVenue]);
  useEffect(() => {
    if (!venueId) handledVenue.current = null;
  }, [venueId]);

  // Fly to a venue opened by URL (e.g. "Haritada göster" on an event page).
  useEffect(() => {
    if (!mapReady || !selectedVenue) return;
    mapRef.current?.flyTo(selectedVenue.lat, selectedVenue.lng, { forPanel: true });
  }, [mapReady, selectedVenue]);

  // City switched: fit the map to that city's venues with matching events,
  // or to all its venues when nothing matches.
  useEffect(() => {
    if (!mapReady || !data || lastCity.current === city) return;
    lastCity.current = city;
    const withEvents = activeVenues.map((v) => v.venue);
    mapRef.current?.fitTo(withEvents.length > 0 ? withEvents : data.venues.filter((v) => v.city === city));
  }, [city, mapReady, data, activeVenues]);

  // When the filters change, bring every matching venue into view.
  const filterKey = `${prefs.date}|${prefs.categories.join(',')}`;
  const lastKey = useRef(filterKey);
  useEffect(() => {
    if (!mapReady || lastKey.current === filterKey) return;
    lastKey.current = filterKey;
    // Keep the open venue in view instead of zooming out to everything.
    if (venueId) return;
    mapRef.current?.fitTo(activeVenues.map((v) => v.venue));
  }, [filterKey, mapReady, activeVenues, venueId]);

  const selectVenue = useCallback((id: string) => {
    navigate(paths.venue(id), { replace: true });
  }, []);
  const closeSheet = useCallback(() => navigate(paths.map(), { replace: true }), []);

  const locate = () => {
    if (!('geolocation' in navigator)) return showToast(t.geoUnsupported);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        const here = cityAt(latitude, longitude);
        if (!here) return showToast(t.geoOutside);
        if (here !== city) {
          // Skip the city fit; we fly to the user instead.
          lastCity.current = here;
          actions.setCity(here);
        }
        mapRef.current?.setUserLocation(latitude, longitude);
        mapRef.current?.flyTo(latitude, longitude, { zoom: 14 });
      },
      (err) => {
        setLocating(false);
        showToast(err.code === err.PERMISSION_DENIED ? t.geoDenied : t.geoUnavailable);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const activeFilterCount = (prefs.date !== 'all' ? 1 : 0) + (prefs.categories.length > 0 ? 1 : 0);
  const summary =
    t.dateFilters[prefs.date] +
    ', ' +
    (prefs.categories.length === 0
      ? t.allCategories.toLocaleLowerCase('tr-TR')
      : prefs.categories.length === 1
        ? t.categories[prefs.categories[0]]
        : t.categoriesSelected(prefs.categories.length));
  const isEmpty = data !== null && filtered.length === 0;
  const hasSampleEvents = useMemo(() => data?.events.some(isSampleEvent) ?? false, [data]);

  return (
    <div ref={rootRef} className={`map-page${selectedVenue ? ' has-sheet' : ''}`}>
      {!mapError && (
        <MapView
          ref={mapRef}
          theme={theme}
          initialCity={city}
          activeVenues={activeVenues}
          inactiveVenues={inactiveVenues}
          selectedVenueId={venueId ?? null}
          onSelectVenue={selectVenue}
          onReady={() => setMapReady(true)}
          onError={() => setMapError(true)}
        />
      )}

      <div className="map-top">
        <div className="map-top__row">
          <SearchBox
            venues={data?.venues ?? []}
            events={upcoming}
            performers={data?.performers ?? []}
            onPickVenue={selectVenue}
          />
          <button
            type="button"
            className="filter-btn"
            onClick={onOpenFilters}
            aria-label={t.filterButtonLabel(activeFilterCount)}
          >
            <IconSliders />
            {activeFilterCount > 0 && <span className="filter-btn__badge">{activeFilterCount}</span>}
          </button>
        </div>
        <div className="map-top__chips">
          <div className="seg city-seg" role="radiogroup" aria-label={t.cityPickerLabel}>
            {CITIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={city === c}
                className="seg__opt"
                onClick={() => {
                  if (venueId) closeSheet();
                  actions.setCity(c);
                }}
              >
                {t.cities[c]}
              </button>
            ))}
          </div>
          <button type="button" className="summary-chip" onClick={onOpenFilters}>
            {summary}
          </button>
        </div>
        {/* Venues are real (OSM); only the events are still samples. Disappears with real events. */}
        {state.settings.showSampleBanner && hasSampleEvents && (
          <div className="banner banner--small">
            <span>{t.sampleDataBanner}</span>
            <button
              type="button"
              className="icon-btn icon-btn--small"
              onClick={() => actions.setSettings({ showSampleBanner: false })}
              aria-label={t.dismiss}
            >
              <IconClose size={14} />
            </button>
          </div>
        )}
      </div>

      {(mapError || loadError) && (
        <div className="overlay" role="alert">
          <p>{mapError ? t.mapError : t.dataError}</p>
          {loadError && (
            <button type="button" className="btn btn--primary" onClick={onRetry}>
              {t.retry}
            </button>
          )}
        </div>
      )}
      {!mapError && !loadError && (!mapReady || !data) && (
        <div className="overlay" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>{!data ? t.loadingData : t.loadingMap}</p>
        </div>
      )}

      {isEmpty && mapReady && (
        <div className="empty" role="status">
          <h2>{t.emptyTitle}</h2>
          <p>{t.emptyHint}</p>
          <button type="button" className="btn btn--primary" onClick={() => actions.setPrefs({ ...prefs, date: 'all', categories: [] })}>
            {t.resetFilters}
          </button>
        </div>
      )}

      <div className="map-bottom">
        <p className="count" aria-live="polite">
          {data && !isEmpty ? t.eventsFound(filtered.length, activeVenues.length) : ''}
        </p>
        <button
          type="button"
          className="round-btn"
          onClick={locate}
          disabled={locating}
          aria-busy={locating}
          aria-label={locating ? t.locating : t.nearMe}
          title={t.nearMe}
        >
          <IconLocate />
        </button>
      </div>

      {selectedVenue && (
        <VenueSheet
          venue={selectedVenue}
          events={selectedEvents}
          onClose={closeSheet}
          onShowAllDates={() => actions.setPrefs({ ...prefs, date: 'all', categories: [] })}
        />
      )}
    </div>
  );
}
