import { useSyncExternalStore } from 'react';
import { CATEGORIES, CITIES, type Category, type City, type DateFilter } from '../types';
import { localUserBackend, type UserBackend } from './user-backend';

/**
 * App state for the UI. Changes apply here immediately and are passed on to
 * the active UserBackend (user-backend.ts). Today that is the localStorage
 * demo: "login" just stores a display name and e-mail on this device. A
 * Supabase-auth backend can be dropped in with setUserBackend().
 */

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface User {
  name: string;
  email: string;
  /** Epoch ms of the (demo) sign-up. */
  joinedAt: number;
}

export interface Settings {
  theme: ThemeSetting;
  notifications: boolean;
  showSampleBanner: boolean;
}

export interface Preferences {
  date: DateFilter;
  /** Empty = all categories. */
  categories: Category[];
  /** Also show venues with no matching events, as small hollow dots. */
  showAllVenues: boolean;
  /** City shown on the map. */
  city: City;
}

export interface AppState {
  user: User | null;
  favoriteEvents: string[];
  favoritePerformers: string[];
  /** Event ids the user marked as attended. */
  attended: string[];
  prefs: Preferences;
  settings: Settings;
  /** The preferences pop-up has been shown once. */
  onboarded: boolean;
}

export const DEFAULT_STATE: AppState = {
  user: null,
  favoriteEvents: [],
  favoritePerformers: [],
  attended: [],
  prefs: { date: 'next7', categories: [], showAllVenues: false, city: 'Ankara' },
  settings: { theme: 'system', notifications: true, showSampleBanner: true },
  onboarded: false,
};

const DATE_FILTERS: DateFilter[] = ['tonight', 'weekend', 'next7', 'all'];
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

/** Reads persisted state, falling back to defaults for anything missing or invalid. */
export function parseState(raw: string | null): AppState {
  if (!raw) return DEFAULT_STATE;
  try {
    const p = JSON.parse(raw) as Partial<AppState>;
    const user =
      p.user && typeof p.user.name === 'string' && typeof p.user.email === 'string'
        ? { name: p.user.name, email: p.user.email, joinedAt: Number(p.user.joinedAt) || Date.now() }
        : null;
    const theme = (['system', 'light', 'dark'] as const).find((x) => x === p.settings?.theme) ?? 'system';
    return {
      user,
      favoriteEvents: strings(p.favoriteEvents),
      favoritePerformers: strings(p.favoritePerformers),
      attended: strings(p.attended),
      prefs: {
        date: DATE_FILTERS.find((d) => d === p.prefs?.date) ?? DEFAULT_STATE.prefs.date,
        categories: strings(p.prefs?.categories).filter((c): c is Category =>
          (CATEGORIES as readonly string[]).includes(c),
        ),
        showAllVenues: p.prefs?.showAllVenues === true,
        city: CITIES.find((c) => c === p.prefs?.city) ?? DEFAULT_STATE.prefs.city,
      },
      settings: {
        theme,
        notifications: p.settings?.notifications ?? DEFAULT_STATE.settings.notifications,
        showSampleBanner: p.settings?.showSampleBanner ?? DEFAULT_STATE.settings.showSampleBanner,
      },
      onboarded: p.onboarded === true,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

let backend: UserBackend = localUserBackend;
let state: AppState = typeof window === 'undefined' ? DEFAULT_STATE : parseState(backend.loadCached());
const listeners = new Set<() => void>();
let onSyncError: (e: unknown) => void = (e) => console.error('User data sync failed', e);

/** Swaps the user-data backend (e.g. Supabase auth) and reloads its cached state. */
export function setUserBackend(next: UserBackend, opts: { onSyncError?: (e: unknown) => void } = {}) {
  backend = next;
  if (opts.onSyncError) onSyncError = opts.onSyncError;
  state = parseState(backend.loadCached());
  listeners.forEach((l) => l());
}

function set(next: AppState) {
  state = next;
  backend.saveCached(JSON.stringify(state));
  listeners.forEach((l) => l());
}

/** Runs a backend call after a local change; failures are reported, not thrown. */
function sync(call: Promise<void>) {
  call.catch(onSyncError);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState(): AppState {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export const actions = {
  /** The password is passed to the backend only (the demo ignores it) and never stored. */
  signIn(name: string, email: string, password?: string) {
    const user = { name: name.trim(), email: email.trim(), joinedAt: state.user?.joinedAt ?? Date.now() };
    set({ ...state, user });
    sync(backend.signIn(user, password));
  },
  signOut() {
    set({ ...state, user: null });
    sync(backend.signOut());
  },
  updateProfile(name: string, email: string) {
    if (!state.user) return;
    const user = { ...state.user, name: name.trim(), email: email.trim() };
    set({ ...state, user });
    sync(backend.updateProfile(user));
  },
  toggleFavoriteEvent(id: string) {
    set({ ...state, favoriteEvents: toggle(state.favoriteEvents, id) });
    sync(backend.setFavoriteEvent(id, state.favoriteEvents.includes(id)));
  },
  toggleFavoritePerformer(id: string) {
    set({ ...state, favoritePerformers: toggle(state.favoritePerformers, id) });
    sync(backend.setFavoritePerformer(id, state.favoritePerformers.includes(id)));
  },
  toggleAttended(id: string) {
    set({ ...state, attended: toggle(state.attended, id) });
    sync(backend.setAttended(id, state.attended.includes(id)));
  },
  setPrefs(prefs: Preferences) {
    set({ ...state, prefs, onboarded: true });
    sync(backend.savePreferences(state.prefs, state.settings));
  },
  setDate(date: DateFilter) {
    set({ ...state, prefs: { ...state.prefs, date } });
    sync(backend.savePreferences(state.prefs, state.settings));
  },
  setCity(city: City) {
    if (state.prefs.city === city) return;
    set({ ...state, prefs: { ...state.prefs, city } });
    sync(backend.savePreferences(state.prefs, state.settings));
  },
  markOnboarded() {
    set({ ...state, onboarded: true });
  },
  setSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
    sync(backend.savePreferences(state.prefs, state.settings));
  },
  /** Removes everything this app stored on the device. */
  resetAll() {
    set(DEFAULT_STATE);
    sync(backend.reset(state));
  },
};
