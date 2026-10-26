/**
 * KVKK self-service in Settings: delete the account, download my data.
 * Both run as database functions (supabase/migrations/…_stage1_account_functions.sql)
 * that act only on the signed-in user.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase-client';
import { actions } from './store';

/** The word the user types to confirm deletion. delete_my_account() checks the same word. */
export const DELETE_CONFIRM_WORD = 'SİL';

/**
 * True if the typed text is the confirmation word. Case and surrounding
 * spaces do not matter, and a dotless "SIL" (non-Turkish keyboard) counts.
 */
export function isDeleteConfirmation(typed: string): boolean {
  const upper = typed.trim().toLocaleUpperCase('tr-TR');
  return upper === DELETE_CONFIRM_WORD || upper === 'SIL';
}

type Rpc = Pick<SupabaseClient, 'rpc' | 'auth'>;

export type DeleteResult = { ok: true } | { ok: false; reason: 'confirmation' | 'unavailable' | 'failed' };

/**
 * Deletes the auth user and every personal row on the server, then signs out
 * locally and clears the account data in the store. Nothing changes locally
 * unless the server call succeeded.
 */
export async function deleteAccount(typed: string, client?: Rpc | null): Promise<DeleteResult> {
  if (!isDeleteConfirmation(typed)) return { ok: false, reason: 'confirmation' };
  const c = client === undefined ? await getSupabase() : client;
  if (!c) return { ok: false, reason: 'unavailable' };
  const { error } = await c.rpc('delete_my_account', { confirmation: DELETE_CONFIRM_WORD });
  if (error) {
    console.error('delete_my_account failed', error);
    return { ok: false, reason: 'failed' };
  }
  // The server session is gone with the user; drop the local one without calling the API.
  await c.auth.signOut({ scope: 'local' }).catch(() => undefined);
  actions.setAccount(null);
  return { ok: true };
}

/** "eventall-verilerim-2026-10-14.json" (date in Istanbul). */
export function exportFileName(now: number): string {
  const day = new Date(now + 3 * 3600_000).toISOString().slice(0, 10);
  return `eventall-verilerim-${day}.json`;
}

/** Fetches export_my_data() and returns it as pretty-printed JSON text. */
export async function fetchExport(client?: Rpc | null): Promise<string | null> {
  const c = client === undefined ? await getSupabase() : client;
  if (!c) return null;
  const { data, error } = await c.rpc('export_my_data');
  if (error) {
    console.error('export_my_data failed', error);
    return null;
  }
  return JSON.stringify(data, null, 2);
}

/** Downloads the export as a .json file. Returns false on failure. */
export async function downloadMyData(): Promise<boolean> {
  const json = await fetchExport();
  if (json === null) return false;
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(Date.now());
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
