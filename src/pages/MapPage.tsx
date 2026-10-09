import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../lib/data';
import { filterEvents, groupByVenue } from '../lib/data';
import type { Theme } from '../lib/theme';
import { actions, useAppState } from '../lib/store';
import { navigate, paths } from '../lib/router';
import { isInAnkara } from '../lib/geo';
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
    () => (data ? filterEvents(data.events, { date: prefs.date, categories: prefs.categories }, now) : []),
    [data, prefs.date, prefs.categories, now],
  );
  const activeVenues = useMemo(() => groupByVenue(filtered), [filtered]);
  const inactiveVenues = useMemo(() => {
    if (!data) return [];
    const active = new Set(activeVenues.map((v) => v.venue.id));
    // The open venue always keeps a marker, even if the filters hide its events.
    return data.venues.filter((v) => !active.has(v.id) && (prefs.showAllVenues || v.id === venueId));
  }, [data, prefs.showAllVenues, activeVenues, venueId]);

  const selectedVenue = (venueId && data?.venues.find((v) => v.id === venueId)) || null;
  const selectedEvents = useMemo(() => filtered.filter((e) => e.venueId === venueId), [filtered, venueId]);

  // Fly to a venue opened by URL (e.g. "Haritada göster" on an event page).
  useEffect(() => {
    if (!mapReady || !selectedVenue) return;
    mapRef.current?.flyTo(selectedVenue.lat, selectedVenue.lng, { forPanel: true });
  }, [mapReady, selectedVenue]);

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
        if (!isInAnkara(latitude, longitude)) return showToast(t.geoOutside);
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

  return (
    <div ref={rootRef} className={`map-page${selectedVenue ? ' has-sheet' : ''}`}>
      {!mapError && (
        <MapView
          ref={mapRef}
          theme={theme}
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
        <button type="button" className="summary-chip" onClick={onOpenFilters}>
          {summary}
        </button>
        {state.settings.showSampleBanner && (
          <div className="banner">
            <span>{t.sampleDataBanner}</span>
            <button
              type="button"
              className="icon-btn icon-btn--small"
              onClick={() => actions.setSettings({ showSampleBanner: false })}
              aria-label={t.dismiss}
            >
              <IconClose size={16} />
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
