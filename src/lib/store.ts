import { useSyncExternalStore } from 'react';
import { CATEGORIES, CITIES, type Category, type City, type DateFilter } from '../types';

/**
 * Client-only app state, persisted to localStorage. There is NO backend yet:
 * "login" just stores a display name and e-mail on this device. Swap these
 * actions for API calls when real accounts exist.
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

const KEY = 'eventall.state.v1';

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

function load(): AppState {
  try {
    return parseState(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_STATE;
  }
}

let state: AppState = typeof window === 'undefined' ? DEFAULT_STATE : load();
const listeners = new Set<() => void>();

function set(next: AppState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode or storage full: keep in memory only */
  }
  listeners.forEach((l) => l());
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
  signIn(name: string, email: string) {
    set({ ...state, user: { name: name.trim(), email: email.trim(), joinedAt: state.user?.joinedAt ?? Date.now() } });
  },
  signOut() {
    set({ ...state, user: null });
  },
  updateProfile(name: string, email: string) {
    if (!state.user) return;
    set({ ...state, user: { ...state.user, name: name.trim(), email: email.trim() } });
  },
  toggleFavoriteEvent(id: string) {
    set({ ...state, favoriteEvents: toggle(state.favoriteEvents, id) });
  },
  toggleFavoritePerformer(id: string) {
    set({ ...state, favoritePerformers: toggle(state.favoritePerformers, id) });
  },
  toggleAttended(id: string) {
    set({ ...state, attended: toggle(state.attended, id) });
  },
  setPrefs(prefs: Preferences) {
    set({ ...state, prefs, onboarded: true });
  },
  setDate(date: DateFilter) {
    set({ ...state, prefs: { ...state.prefs, date } });
  },
  setCity(city: City) {
    if (state.prefs.city === city) return;
    set({ ...state, prefs: { ...state.prefs, city } });
  },
  markOnboarded() {
    set({ ...state, onboarded: true });
  },
  setSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
  },
  /** Removes everything this app stored on the device. */
  resetAll() {
    set(DEFAULT_STATE);
  },
};
