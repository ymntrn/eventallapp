import { useCallback, useEffect, useState } from 'react';
import { filterEvents, loadData, type AppData } from './lib/data';
import { actions, useAppState, type Preferences } from './lib/store';
import { parseRoute, useHash } from './lib/router';
import { useTheme } from './lib/theme';
import { useToast } from './lib/toast';
import { t } from './i18n/tr';
import { MapPage } from './pages/MapPage';
import { EventPage } from './pages/EventPage';
import { PerformerPage } from './pages/PerformerPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { BottomNav, type Tab } from './components/BottomNav';
import { FilterSheet } from './components/FilterSheet';

export default function App() {
  const state = useAppState();
  const theme = useTheme(state.settings.theme);
  const route = parseRoute(useHash());
  const toast = useToast();
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  // Scroll sub-pages to the top on navigation.
  useEffect(() => {
    document.querySelector('.page')?.scrollTo(0, 0);
  }, [route.name, 'id' in route ? route.id : null]);

  // First visit: ask what the user wants to see.
  const onboarding = !state.onboarded && route.name === 'map' && data !== null;
  const showFilters = filtersOpen || onboarding;

  const countFor = useCallback(
    (p: Preferences) =>
      data ? filterEvents(data.events, { date: p.date, categories: p.categories, city: p.city }, now).length : 0,
    [data, now],
  );

  const onMap = route.name === 'map';
  const tab: Tab = onMap ? 'map' : route.name === 'profile' ? 'profile' : route.name === 'settings' ? 'settings' : null;

  return (
    <div className={`app${onMap ? ' app--map' : ''}`}>
      <BottomNav current={tab} />
      <main className="app__main">
        {/* The map stays mounted underneath other pages so it keeps its position. */}
        <MapPage
          data={data}
          loadError={loadError}
          onRetry={load}
          now={now}
          theme={theme}
          venueId={route.name === 'map' ? route.venueId : undefined}
          active={onMap && !showFilters}
          onOpenFilters={() => setFiltersOpen(true)}
        />
        {!onMap && (
          <div className="page-layer">
            {data === null ? (
              <div className="overlay" role="status">
                <span className="spinner" aria-hidden="true" />
                <p>{loadError ? t.dataError : t.loadingData}</p>
              </div>
            ) : route.name === 'event' ? (
              <EventPage data={data} id={route.id} />
            ) : route.name === 'performer' ? (
              <PerformerPage data={data} id={route.id} now={now} />
            ) : route.name === 'profile' ? (
              <ProfilePage data={data} tab={route.tab} />
            ) : route.name === 'settings' ? (
              <SettingsPage onEditPrefs={() => setFiltersOpen(true)} />
            ) : route.name === 'login' ? (
              <LoginPage next={route.next} />
            ) : null}
          </div>
        )}
      </main>

      {showFilters && (
        <FilterSheet
          initial={state.prefs}
          countFor={countFor}
          onboarding={onboarding}
          onApply={(p) => {
            actions.setPrefs(p);
            setFiltersOpen(false);
          }}
          onClose={() => {
            actions.markOnboarded();
            setFiltersOpen(false);
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
