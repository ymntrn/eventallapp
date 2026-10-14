/**
 * Where user data lives. The store (store.ts) keeps the UI state and updates
 * it immediately; every change is also handed to the active UserBackend.
 *
 * - localUserBackend: signed out, or accounts not configured. Caches the
 *   state (preferences, settings) in localStorage; nothing is synced.
 * - supabaseUserBackend: signed in. Writes the account's rows (RLS limits
 *   every query to the caller's own rows, see supabase/migrations/).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FollowKind, User } from './store';

export interface UserBackend {
  /** Reads the cached state at startup. Synchronous so the first render has it. */
  loadCached(): string | null;
  /** Caches the whole state on this device after every change. */
  saveCached(serialized: string): void;
  /**
   * Called after the store's own update. A remote backend syncs here and
   * rejects on failure; the store reports the error but keeps the local change.
   */
  updateProfile(user: User): Promise<void>;
  setSavedEvent(eventId: string, on: boolean): Promise<void>;
  setFollow(kind: FollowKind, id: string, on: boolean): Promise<void>;
  setAttended(eventId: string, on: boolean): Promise<void>;
}

export const CACHE_KEY = 'eventall.state.v2';
/** Stage 0 demo login cache; removed on startup. */
export const LEGACY_CACHE_KEY = 'eventall.state.v1';
const done = () => Promise.resolve();

function loadCached() {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

function saveCached(serialized: string) {
  try {
    localStorage.setItem(CACHE_KEY, serialized);
  } catch {
    /* private mode or storage full: keep in memory only */
  }
}

/** Signed out: local cache only, all sync methods are no-ops. */
export const localUserBackend: UserBackend = {
  loadCached,
  saveCached,
  updateProfile: done,
  setSavedEvent: done,
  setFollow: done,
  setAttended: done,
};

/** Table and id column for each kind of user row. */
export const USER_TABLES = {
  saved: { table: 'saved_events', column: 'event_id' },
  attended: { table: 'attended_events', column: 'event_id' },
  performer: { table: 'followed_performers', column: 'performer_id' },
  venue: { table: 'followed_venues', column: 'venue_id' },
} as const;

/** Signed in: writes to Supabase. user_id is filled in by the database (default auth.uid()). */
export function supabaseUserBackend(client: SupabaseClient, userId: string): UserBackend {
  const setRow = async (key: keyof typeof USER_TABLES, id: string, on: boolean) => {
    const { table, column } = USER_TABLES[key];
    const row: Record<string, string> = { [column]: id };
    const { error } = on
      ? await client.from(table).insert(row as never)
      : await client.from(table).delete().eq('user_id', userId).eq(column, id);
    // 23505 = already there (e.g. saved on another device): nothing to do.
    if (error && error.code !== '23505') throw error;
  };
  return {
    loadCached,
    saveCached,
    async updateProfile(user) {
      const { error } = await client
        .from('profiles')
        .update({ display_name: user.name, city: user.city })
        .eq('user_id', userId);
      if (error) throw error;
    },
    setSavedEvent: (id, on) => setRow('saved', id, on),
    setFollow: (kind, id, on) => setRow(kind, id, on),
    setAttended: (id, on) => setRow('attended', id, on),
  };
}
