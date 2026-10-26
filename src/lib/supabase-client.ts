/**
 * The Supabase JS client, used for accounts (Auth), the user's own rows,
 * the account functions and analytics. Public event data is still read with
 * plain fetch (supabase-data.ts).
 *
 * Loaded lazily so the map does not wait for it. null when the
 * VITE_SUPABASE_* variables are not set: accounts are then unavailable and the
 * app works read-only on the bundled JSON.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase-data';

export const AUTH_STORAGE_KEY = 'eventall.auth';

/** True when this build has a Supabase project (accounts can be used). */
export function accountsAvailable(): boolean {
  return supabaseConfig(import.meta.env) !== null;
}

let client: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!client) {
    const cfg = supabaseConfig(import.meta.env);
    client = cfg
      ? import('@supabase/supabase-js').then(({ createClient }) =>
          createClient(cfg.url, cfg.anonKey, {
            auth: {
              // PKCE puts ?code=… in the query string, which survives our hash router.
              // The implicit flow would put tokens in #…, where routes live.
              flowType: 'pkce',
              detectSessionInUrl: true,
              persistSession: true,
              autoRefreshToken: true,
              storageKey: AUTH_STORAGE_KEY,
            },
          }),
        )
      : Promise.resolve(null);
  }
  return client;
}

/**
 * Where Supabase sends the user back after e-mail confirmation: the app's
 * own URL without hash or query, e.g. https://ymntrn.github.io/eventallapp/.
 * Must be listed under Auth → URL Configuration → Redirect URLs (docs/stage1.md).
 */
export function authRedirectUrl(loc: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  return loc.origin + loc.pathname;
}
