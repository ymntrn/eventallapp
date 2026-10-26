import { useSyncExternalStore } from 'react';
import { CATEGORIES, CITIES, type Category, type City, type DateFilter } from '../types';
import { localUserBackend, type UserBackend } from './user-backend';

/**
 * App state for the UI. Changes apply here immediately and are passed on to
 * the active UserBackend (user-backend.ts). Signed out, that is the local
 * no-op backend; signed in with Supabase Auth (auth.ts), it writes the
 * account's rows. Preferences and settings stay on this device.
 */

export type ThemeSetting = 'system' | 'light' | 'dark';
export type FollowKind = 'performer' | 'venue';

/** The signed-in Supabase Auth user and their (private) profile. */
export interface User {
  /** auth.users id */
  id: string;
  email: string;
  /** profiles.display_name */
  name: string;
  /** profiles.city */
  city: City | null;
  /** Epoch ms of the sign-up. */
  joinedAt: number;
}

/** Everything that belongs to the account; loaded from Supabase on sign-in. */
export interface Account {
  user: User;
  savedEvents: string[];
  followedPerformers: string[];
  followedVenues: string[];
  attended: string[];
}

export interface Settings {
  theme: ThemeSetting;
  showSampleBanner: boolean;
}

export interface Preferences {
  date: DateFilter;
  /** Empty = all categories. */
  categories: Category[];
  /** Also show venues with no matching events, as small hollow dots. */
  showAllVenues: boolean;
  /** City shown on the map and in Discover. */
  city: City;
  /** "Bu akşam" start time, "HH:MM" (Istanbul). null = from now. */
  tonightFrom: string | null;
}

export interface AppState extends Omit<Account, 'user'> {
  user: User | null;
  prefs: Preferences;
  settings: Settings;
  /** The preferences pop-up has been shown once. */
  onboarded: boolean;
}

const EMPTY_ACCOUNT_DATA = { savedEvents: [], followedPerformers: [], followedVenues: [], attended: [] };

export const DEFAULT_STATE: AppState = {
  user: null,
  ...EMPTY_ACCOUNT_DATA,
  prefs: { date: 'next7', categories: [], showAllVenues: false, city: 'Ankara', tonightFrom: null },
  settings: { theme: 'system', showSampleBanner: true },
  onboarded: false,
};

const DATE_FILTERS: DateFilter[] = ['tonight', 'weekend', 'next7', 'all'];
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A cached Supabase user. Demo users from the old localStorage login (no id) are dropped. */
function parseUser(u: unknown): User | null {
  if (!u || typeof u !== 'object') return null;
  const p = u as Partial<User>;
  if (typeof p.id !== 'string' || !UUID.test(p.id) || typeof p.email !== 'string' || typeof p.name !== 'string') return null;
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    city: CITIES.find((c) => c === p.city) ?? null,
    joinedAt: Number(p.joinedAt) || Date.now(),
  };
}

/** Reads persisted state, falling back to defaults for anything missing or invalid. */
export function parseState(raw: string | null): AppState {
  if (!raw) return DEFAULT_STATE;
  try {
    const p = JSON.parse(raw) as Partial<AppState>;
    const user = parseUser(p.user);
    const theme = (['system', 'light', 'dark'] as const).find((x) => x === p.settings?.theme) ?? 'system';
    return {
      user,
      // Account data is only kept alongside its user.
      savedEvents: user ? strings(p.savedEvents) : [],
      followedPerformers: user ? strings(p.followedPerformers) : [],
      followedVenues: user ? strings(p.followedVenues) : [],
      attended: user ? strings(p.attended) : [],
      prefs: {
        date: DATE_FILTERS.find((d) => d === p.prefs?.date) ?? DEFAULT_STATE.prefs.date,
        categories: strings(p.prefs?.categories).filter((c): c is Category =>
          (CATEGORIES as readonly string[]).includes(c),
        ),
        showAllVenues: p.prefs?.showAllVenues === true,
        city: CITIES.find((c) => c === p.prefs?.city) ?? DEFAULT_STATE.prefs.city,
        tonightFrom:
          typeof p.prefs?.tonightFrom === 'string' && TIME_HHMM.test(p.prefs.tonightFrom) ? p.prefs.tonightFrom : null,
      },
      settings: {
        theme,
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

/** Swaps the user-data backend (Supabase when signed in) without touching the current state. */
export function setUserBackend(next: UserBackend, opts: { onSyncError?: (e: unknown) => void; reload?: boolean } = {}) {
  backend = next;
  if (opts.onSyncError) onSyncError = opts.onSyncError;
  if (opts.reload) {
    state = parseState(backend.loadCached());
    listeners.forEach((l) => l());
  }
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

/** Called after a change was made; analytics.ts subscribes (kept out of the store to avoid a cycle). */
type ChangeHook = (change: { type: 'saved' | 'followed'; id: string; kind?: FollowKind }) => void;
let changeHook: ChangeHook = () => {};
export function onUserChange(hook: ChangeHook) {
  changeHook = hook;
}

export const actions = {
  /** Signed in (auth.ts loaded the account) or signed out (null): replaces all account data. */
  setAccount(account: Account | null) {
    set({ ...state, ...(account ?? { user: null, ...EMPTY_ACCOUNT_DATA }) });
  },
  updateProfile(name: string, city: City | null) {
    if (!state.user) return;
    const user = { ...state.user, name: name.trim(), city };
    set({ ...state, user });
    sync(backend.updateProfile(user));
  },
  toggleSavedEvent(id: string) {
    set({ ...state, savedEvents: toggle(state.savedEvents, id) });
    const on = state.savedEvents.includes(id);
    sync(backend.setSavedEvent(id, on));
    if (on) changeHook({ type: 'saved', id });
  },
  toggleFollow(kind: FollowKind, id: string) {
    const key = kind === 'performer' ? 'followedPerformers' : 'followedVenues';
    set({ ...state, [key]: toggle(state[key], id) });
    const on = state[key].includes(id);
    sync(backend.setFollow(kind, id, on));
    if (on) changeHook({ type: 'followed', id, kind });
  },
  toggleAttended(id: string) {
    set({ ...state, attended: toggle(state.attended, id) });
    sync(backend.setAttended(id, state.attended.includes(id)));
  },
  setPrefs(prefs: Preferences) {
    set({ ...state, prefs, onboarded: true });
  },
  setDate(date: DateFilter) {
    set({ ...state, prefs: { ...state.prefs, date } });
  },
  setTonightFrom(tonightFrom: string | null) {
    set({ ...state, prefs: { ...state.prefs, tonightFrom } });
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
  /** Resets preferences and settings on this device. Account data is not touched. */
  resetDevice() {
    const { user, savedEvents, followedPerformers, followedVenues, attended } = state;
    set({ ...DEFAULT_STATE, user, savedEvents, followedPerformers, followedVenues, attended });
  },
};
