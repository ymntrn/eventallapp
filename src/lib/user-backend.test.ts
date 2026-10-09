import { describe, expect, it, vi } from 'vitest';
import { actions, getState, setUserBackend } from './store';
import type { UserBackend } from './user-backend';

function fakeBackend(cached: string | null = null) {
  const saved: string[] = [];
  const b = {
    loadCached: () => cached,
    saveCached: (s: string) => void saved.push(s),
    signIn: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
    updateProfile: vi.fn(() => Promise.resolve()),
    setFavoriteEvent: vi.fn(() => Promise.resolve()),
    setFavoritePerformer: vi.fn(() => Promise.resolve()),
    setAttended: vi.fn(() => Promise.resolve()),
    savePreferences: vi.fn(() => Promise.resolve()),
    reset: vi.fn(() => Promise.resolve()),
  } satisfies UserBackend;
  return { b, saved };
}

describe('store → UserBackend', () => {
  it('loads the cached state and passes every change to the backend', () => {
    const { b, saved } = fakeBackend(JSON.stringify({ favoriteEvents: ['e1'] }));
    setUserBackend(b);
    expect(getState().favoriteEvents).toEqual(['e1']);

    actions.signIn(' Ada ', 'ada@example.com', 'secret1');
    expect(b.signIn).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ada', email: 'ada@example.com' }), 'secret1');
    expect(saved.at(-1)).not.toContain('secret1');

    actions.toggleFavoriteEvent('e1');
    expect(b.setFavoriteEvent).toHaveBeenLastCalledWith('e1', false);
    actions.toggleFavoritePerformer('p1');
    expect(b.setFavoritePerformer).toHaveBeenLastCalledWith('p1', true);
    actions.toggleAttended('e2');
    expect(b.setAttended).toHaveBeenLastCalledWith('e2', true);

    actions.setCity('İstanbul');
    expect(b.savePreferences).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'İstanbul' }), expect.anything());

    actions.resetAll();
    expect(b.reset).toHaveBeenCalled();
    expect(getState().favoriteEvents).toEqual([]);
  });

  it('keeps the local change and reports when the backend fails', async () => {
    const { b } = fakeBackend();
    b.setFavoriteEvent.mockImplementation(() => Promise.reject(new Error('offline')));
    const onSyncError = vi.fn();
    setUserBackend(b, { onSyncError });
    actions.toggleFavoriteEvent('e9');
    expect(getState().favoriteEvents).toEqual(['e9']);
    await Promise.resolve();
    await Promise.resolve();
    expect(onSyncError).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' }));
  });
});
