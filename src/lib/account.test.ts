import { describe, expect, it, vi } from 'vitest';
import { DELETE_CONFIRM_WORD, deleteAccount, exportFileName, fetchExport, isDeleteConfirmation } from './account';
import { actions, getState } from './store';

const USER = { id: '6f1c2a3b-0000-4000-8000-000000000001', email: 'ada@example.com', name: 'Ada', city: null, joinedAt: 1 };

function fakeClient(rpcResult: { data?: unknown; error: unknown }) {
  return {
    rpc: vi.fn(() => Promise.resolve(rpcResult)),
    auth: { signOut: vi.fn(() => Promise.resolve({ error: null })) },
  };
}
type Client = Parameters<typeof deleteAccount>[1];

describe('isDeleteConfirmation', () => {
  it('accepts the word in any case, with spaces, and without the Turkish dotted İ', () => {
    for (const ok of ['SİL', 'sil', ' Sil ', 'SIL']) expect(isDeleteConfirmation(ok)).toBe(true);
    for (const bad of ['', 'si', 'SİLME', 'evet', 'delete']) expect(isDeleteConfirmation(bad)).toBe(false);
  });
});

describe('deleteAccount', () => {
  it('does nothing without the confirmation word', async () => {
    const c = fakeClient({ error: null });
    expect(await deleteAccount('evet', c as unknown as Client)).toEqual({ ok: false, reason: 'confirmation' });
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it('calls delete_my_account with the canonical word, signs out locally and clears the account', async () => {
    actions.setAccount({ user: USER, savedEvents: ['e1'], followedPerformers: ['p1'], followedVenues: ['v1'], attended: [] });
    const c = fakeClient({ error: null });
    expect(await deleteAccount('sil', c as unknown as Client)).toEqual({ ok: true });
    expect(c.rpc).toHaveBeenCalledWith('delete_my_account', { confirmation: DELETE_CONFIRM_WORD });
    expect(c.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    const s = getState();
    expect(s.user).toBeNull();
    expect([s.savedEvents, s.followedPerformers, s.followedVenues]).toEqual([[], [], []]);
  });

  it('keeps everything when the server refuses', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    actions.setAccount({ user: USER, savedEvents: ['e1'], followedPerformers: [], followedVenues: [], attended: [] });
    const c = fakeClient({ error: { code: '28000' } });
    expect(await deleteAccount('SİL', c as unknown as Client)).toEqual({ ok: false, reason: 'failed' });
    expect(c.auth.signOut).not.toHaveBeenCalled();
    expect(getState().user?.id).toBe(USER.id);
  });

  it('reports unavailable without a Supabase client', async () => {
    expect(await deleteAccount('SİL', null)).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('data export', () => {
  it('returns export_my_data() as JSON text', async () => {
    const c = fakeClient({ data: { format: 'eventall-export-v1', saved_events: [] }, error: null });
    const json = await fetchExport(c as unknown as Client);
    expect(c.rpc).toHaveBeenCalledWith('export_my_data');
    expect(JSON.parse(json!)).toEqual({ format: 'eventall-export-v1', saved_events: [] });
  });

  it('returns null on error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await fetchExport(fakeClient({ data: null, error: { message: 'x' } }) as unknown as Client)).toBeNull();
  });

  it('names the file with the Istanbul date', () => {
    // 22:30 UTC on the 14th is 01:30 on the 15th in Istanbul.
    expect(exportFileName(Date.parse('2026-10-14T22:30:00Z'))).toBe('eventall-verilerim-2026-10-15.json');
  });
});
