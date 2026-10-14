import { useSyncExternalStore } from 'react';

/**
 * Tiny hash router (no dependency, works on any static host):
 *   #/                 map
 *   #/discover         Discover tab
 *   #/calendar         personal calendar
 *   #/notifications    in-app notifications (empty in Stage 1)
 *   #/event/:id        event page with price comparison
 *   #/performer/:id    performer page
 *   #/venue/:id        map with that venue's sheet open
 *   #/profile[/:tab]   profile (tab: events | people | attended)
 *   #/settings         settings
 *   #/login?next=…     sign-in / sign-up (Supabase Auth)
 */
export type Route =
  | { name: 'map'; venueId?: string }
  | { name: 'discover' }
  | { name: 'calendar' }
  | { name: 'notifications' }
  | { name: 'event'; id: string }
  | { name: 'performer'; id: string }
  | { name: 'profile'; tab?: string }
  | { name: 'settings' }
  | { name: 'login'; next?: string };

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);
  switch (parts[0]) {
    case 'event':
      return parts[1] ? { name: 'event', id: parts[1] } : { name: 'map' };
    case 'performer':
      return parts[1] ? { name: 'performer', id: parts[1] } : { name: 'map' };
    case 'venue':
      return { name: 'map', venueId: parts[1] };
    case 'profile':
      return { name: 'profile', tab: parts[1] };
    case 'settings':
      return { name: 'settings' };
    case 'discover':
      return { name: 'discover' };
    case 'calendar':
      return { name: 'calendar' };
    case 'notifications':
      return { name: 'notifications' };
    case 'login':
      return { name: 'login', next: params.get('next') ?? undefined };
    default:
      return { name: 'map' };
  }
}

export const paths = {
  map: () => '#/',
  discover: () => '#/discover',
  calendar: () => '#/calendar',
  notifications: () => '#/notifications',
  venue: (id: string) => `#/venue/${encodeURIComponent(id)}`,
  event: (id: string) => `#/event/${encodeURIComponent(id)}`,
  performer: (id: string) => `#/performer/${encodeURIComponent(id)}`,
  profile: (tab?: string) => (tab ? `#/profile/${tab}` : '#/profile'),
  settings: () => '#/settings',
  login: (next?: string) => (next ? `#/login?next=${encodeURIComponent(next)}` : '#/login'),
};

/** Number of in-app pushes this page load, so "back" never leaves the app. */
let pushes = 0;

export function navigate(hash: string, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    pushes++;
    window.location.hash = hash;
  }
}

/** Go back inside the app if we navigated here, otherwise replace with `fallback`. */
export function goBack(fallback = paths.map()) {
  if (pushes > 0) {
    pushes--;
    history.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => '');
}
