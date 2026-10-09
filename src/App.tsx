import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Category, DateFilter } from './types';
import { t } from './i18n/tr';
import { filterEvents, groupByVenue, loadData, type AppData } from './lib/data';
import { isInAnkara } from './lib/geo';
import { MapView, type MapViewHandle } from './components/MapView';
import { FilterBar } from './components/FilterBar';
import { VenueSheet } from './components/VenueSheet';
import { SearchBox } from './components/SearchBox';
import { Legend } from './components/Legend';

const DEFAULT_DATE: DateFilter = 'next7';
const BANNER_KEY = 'eventall.sampleBannerDismissed';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [date, setDate] = useState<DateFilter>(DEFAULT_DATE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(() => readFlag(BANNER_KEY));
  const mapRef = useRef<MapViewHandle>(null);

  const load = useCallback(() => {
    setLoadError(false);
    loadData()
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  // Keep "now" fresh so time windows roll over while the app stays open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const upcoming = useMemo(
    () => (data ? filterEvents(data.events, { date: 'all', categories: [] }, now) : []),
    [data, now],
  );
  const filtered = useMemo(
    () => (data ? filterEvents(data.events, { date, categories }, now) : []),
    [data, date, categories, now],
  );
  const activeVenues = useMemo(() => groupByVenue(filtered), [filtered]);
  const inactiveVenues = useMemo(() => {
    if (!data || !showAll) return [];
    const active = new Set(activeVenues.map((v) => v.venue.id));
    return data.venues.filter((v) => !active.has(v.id));
  }, [data, showAll, activeVenues]);

  const selectedVenue = data?.venues.find((v) => v.id === selectedId) ?? null;
  const selectedEvents = useMemo(
    () => filtered.filter((e) => e.venueId === selectedId),
    [filtered, selectedId],
  );

  const selectVenue = useCallback(
    (id: string) => {
      const venue = data?.venues.find((v) => v.id === id);
      if (!venue) return;
      setSelectedId(id);
      mapRef.current?.flyTo(venue.lat, venue.lng, { forPanel: true });
    },
    [data],
  );
  const closeSheet = useCallback(() => setSelectedId(null), []);

  const resetFilters = () => {
    setDate('all');
    setCategories([]);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setToast(t.geoUnsupported);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (!isInAnkara(latitude, longitude)) {
          setToast(t.geoOutside);
          return;
        }
        mapRef.current?.setUserLocation(latitude, longitude);
        mapRef.current?.flyTo(latitude, longitude, { zoom: 14 });
      },
      (err) => {
        setLocating(false);
        setToast(err.code === err.PERMISSION_DENIED ? t.geoDenied : t.geoUnavailable);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const dismissBanner = () => {
    setBannerHidden(true);
    try {
      localStorage.setItem(BANNER_KEY, '1');
    } catch {
      /* private mode: ignore */
    }
  };

  const isEmpty = data !== null && filtered.length === 0;

  return (
    <div className={selectedVenue ? 'app has-sheet' : 'app'}>
      <header className="topbar">
        <h1 className="brand">
          {t.appName}
          <span className="brand__tagline">{t.tagline}</span>
        </h1>
        <SearchBox venues={data?.venues ?? []} events={upcoming} onPick={selectVenue} />
      </header>

      <FilterBar date={date} categories={categories} onDateChange={setDate} onCategoriesChange={setCategories} />

      <main className="map-wrap">
        {!mapError && (
          <MapView
            ref={mapRef}
            activeVenues={activeVenues}
            inactiveVenues={inactiveVenues}
            selectedVenueId={selectedId}
            onSelectVenue={selectVenue}
            onReady={() => setMapReady(true)}
            onError={() => setMapError(true)}
          />
        )}

        {(mapError || loadError) && (
          <div className="overlay" role="alert">
            <p>{mapError ? t.mapError : t.dataError}</p>
            {loadError && (
              <button type="button" className="btn" onClick={load}>
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

        {!bannerHidden && (
          <div className="banner">
            <span>{t.sampleDataBanner}</span>
            <button type="button" className="icon-btn icon-btn--small" onClick={dismissBanner} aria-label={t.dismiss}>
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        )}

        <p className="count" aria-live="polite">
          {data && !isEmpty ? t.eventsFound(filtered.length, activeVenues.length) : ''}
        </p>

        {isEmpty && mapReady && (
          <div className="empty" role="status">
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptyHint}</p>
            <button type="button" className="btn btn--primary" onClick={resetFilters}>
              {t.resetFilters}
            </button>
          </div>
        )}

        <div className="map-controls">
          <label className="switch">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            <span>{t.showAllVenues}</span>
          </label>
          <button type="button" className="btn btn--float" onClick={locate} disabled={locating} aria-busy={locating}>
            <span aria-hidden="true">◎</span> {locating ? t.locating : t.nearMe}
          </button>
        </div>

        <Legend />

        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </main>

      {selectedVenue && <VenueSheet venue={selectedVenue} events={selectedEvents} onClose={closeSheet} />}
    </div>
  );
}
