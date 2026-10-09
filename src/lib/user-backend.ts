/**
 * Where user data lives. The store (store.ts) keeps the UI state and updates
 * it immediately; every change is also handed to the active UserBackend.
 *
 * Today: localUserBackend, which keeps everything in localStorage on this
 * device (demo login, nothing leaves the device). To add real accounts,
 * implement this interface with Supabase Auth plus user tables (see
 * docs/backend.md) and pass it to setUserBackend() at startup.
 */
import type { AppState, Preferences, Settings, User } from './store';

export interface UserBackend {
  /** Reads the cached state at startup. Synchronous so the first render has it. */
  loadCached(): string | null;
  /** Caches the whole state on this device after every change. */
  saveCached(serialized: string): void;
  /**
   * Called after the store's own update. A remote backend syncs here and
   * rejects on failure; the store reports the error but keeps the local change.
   */
  signIn(user: User, password?: string): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(user: User): Promise<void>;
  setFavoriteEvent(eventId: string, on: boolean): Promise<void>;
  setFavoritePerformer(performerId: string, on: boolean): Promise<void>;
  setAttended(eventId: string, on: boolean): Promise<void>;
  savePreferences(prefs: Preferences, settings: Settings): Promise<void>;
  /** "Bu cihazdaki tüm verileri sil". */
  reset(state: AppState): Promise<void>;
}

const KEY = 'eventall.state.v1';
const done = () => Promise.resolve();

/** Demo backend: localStorage only. All sync methods are no-ops. */
export const localUserBackend: UserBackend = {
  loadCached() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  saveCached(serialized) {
    try {
      localStorage.setItem(KEY, serialized);
    } catch {
      /* private mode or storage full: keep in memory only */
    }
  },
  signIn: done,
  signOut: done,
  updateProfile: done,
  setFavoriteEvent: done,
  setFavoritePerformer: done,
  setAttended: done,
  savePreferences: done,
  reset: done,
};
