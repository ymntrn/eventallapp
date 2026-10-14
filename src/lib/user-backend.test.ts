import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { actions, getState, setUserBackend, type Account } from './store';
import { supabaseUserBackend, type UserBackend } from './user-backend';

function fakeBackend(cached: string | null = null) {
  const saved: string[] = [];
  const b = {
    loadCached: () => cached,
    saveCached: (s: string) => void saved.push(s),
    updateProfile: vi.fn(() => Promise.resolve()),
    setSavedEvent: vi.fn(() => Promise.resolve()),
    setFollow: vi.fn(() => Promise.resolve()),
    setAttended: vi.fn(() => Promise.resolve()),
  } satisfies UserBackend;
  return { b, saved };
}

const ACCOUNT: Account = {
  user: { id: '6f1c2a3b-0000-4000-8000-000000000001', email: 'ada@example.com', name: 'Ada', city: null, joinedAt: 1 },
  savedEvents: ['e1'],
  followedPerformers: [],
  followedVenues: [],
  attended: [],
};

describe('store → UserBackend', () => {
  it('passes every account change to the backend', () => {
    const { b, saved } = fakeBackend();
    setUserBackend(b, { reload: true });
    actions.setAccount(ACCOUNT);
    expect(getState().savedEvents).toEqual(['e1']);

    actions.toggleSavedEvent('e1');
    expect(b.setSavedEvent).toHaveBeenLastCalledWith('e1', false);
    actions.toggleFollow('performer', 'p1');
    expect(b.setFollow).toHaveBeenLastCalledWith('performer', 'p1', true);
    actions.toggleFollow('venue', 'ank-x');
    expect(b.setFollow).toHaveBeenLastCalledWith('venue', 'ank-x', true);
    expect(getState().followedVenues).toEqual(['ank-x']);
    actions.toggleAttended('e2');
    expect(b.setAttended).toHaveBeenLastCalledWith('e2', true);
    actions.updateProfile(' Ada L. ', 'İstanbul');
    expect(b.updateProfile).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Ada L.', city: 'İstanbul' }));
    expect(saved.at(-1)).toContain('Ada L.');

    actions.setCity('İstanbul');
    actions.resetDevice();
    expect(getState().prefs.city).toBe('Ankara');
    expect(getState().followedVenues).toEqual(['ank-x']);

    actions.setAccount(null);
    expect(getState().user).toBeNull();
    expect(getState().followedVenues).toEqual([]);
  });

  it('keeps the local change and reports when the backend fails', async () => {
    const { b } = fakeBackend();
    b.setSavedEvent.mockImplementation(() => Promise.reject(new Error('offline')));
    const onSyncError = vi.fn();
    setUserBackend(b, { onSyncError, reload: true });
    actions.setAccount({ ...ACCOUNT, savedEvents: [] });
    actions.toggleSavedEvent('e9');
    expect(getState().savedEvents).toEqual(['e9']);
    await Promise.resolve();
    await Promise.resolve();
    expect(onSyncError).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' }));
  });
});

describe('supabaseUserBackend', () => {
  function fakeClient() {
    const calls: unknown[][] = [];
    const chain = (table: string) => {
      const q = {
        insert: (row: unknown) => (calls.push(['insert', table, row]), Promise.resolve({ error: null })),
        update: (row: unknown) => (calls.push(['update', table, row]), q),
        delete: () => (calls.push(['delete', table]), q),
        eq: (col: string, v: string) => (calls.push(['eq', col, v]), q),
        then: (res: (v: { error: null }) => void) => res({ error: null }),
      };
      return q;
    };
    return { client: { from: chain } as unknown as SupabaseClient, calls };
  }
  const uid = '6f1c2a3b-0000-4000-8000-000000000001';

  it('inserts without user_id (database default) and deletes only own rows', async () => {
    const { client, calls } = fakeClient();
    const b = supabaseUserBackend(client, uid);
    await b.setFollow('venue', 'ank-x', true);
    expect(calls).toContainEqual(['insert', 'followed_venues', { venue_id: 'ank-x' }]);
    await b.setSavedEvent('e1', false);
    expect(calls).toContainEqual(['delete', 'saved_events']);
    expect(calls).toContainEqual(['eq', 'user_id', uid]);
    expect(calls).toContainEqual(['eq', 'event_id', 'e1']);
  });

  it('throws the Supabase error so the store can report it, but not for a duplicate', async () => {
    const failing = (error: object) =>
      ({ from: () => ({ insert: () => Promise.resolve({ error }) }) }) as unknown as SupabaseClient;
    await expect(supabaseUserBackend(failing({ code: '42501' }), uid).setAttended('e1', true)).rejects.toEqual({
      code: '42501',
    });
    await expect(supabaseUserBackend(failing({ code: '23505' }), uid).setAttended('e1', true)).resolves.toBeUndefined();
  });
});
