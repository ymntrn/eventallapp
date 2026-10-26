/**
 * Accounts: e-mail + password through Supabase Auth.
 *
 * initAuth() runs once at startup. It restores the session (supabase-js keeps
 * it in localStorage under AUTH_STORAGE_KEY), finishes an e-mail confirmation
 * link (?code=… in the URL, PKCE), and loads the account's rows into the
 * store. Every later sign-in / sign-out goes through onAuthStateChange.
 */
import { useSyncExternalStore } from 'react';
import type { SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import { CITIES, type City } from '../types';
import { t } from '../i18n/tr';
import { actions, getState, setUserBackend, type Account } from './store';
import { LEGACY_CACHE_KEY, localUserBackend, supabaseUserBackend } from './user-backend';
import { authRedirectUrl, getSupabase } from './supabase-client';
import { showToast } from './toast';

/** unavailable: no Supabase in this build. loading: restoring the session. */
export type AuthStatus = 'unavailable' | 'loading' | 'ready';

let status: AuthStatus = 'loading';
const listeners = new Set<() => void>();
function setStatus(next: AuthStatus) {
  status = next;
  listeners.forEach((l) => l());
}
export function useAuthStatus(): AuthStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

export interface AccountRows {
  profile: { display_name: string; city: string | null; created_at: string } | null;
  savedEvents: { event_id: string }[];
  attended: { event_id: string }[];
  followedPerformers: { performer_id: string }[];
  followedVenues: { venue_id: string }[];
}

/** Builds the store's Account from the auth user and their rows. */
export function accountFromRows(authUser: Pick<AuthUser, 'id' | 'email' | 'created_at'>, rows: AccountRows): Account {
  const email = authUser.email ?? '';
  const joined = Date.parse(rows.profile?.created_at ?? authUser.created_at);
  return {
    user: {
      id: authUser.id,
      email,
      name: rows.profile?.display_name || email.split('@')[0] || t.defaultUserName,
      city: CITIES.find((c) => c === rows.profile?.city) ?? null,
      joinedAt: Number.isNaN(joined) ? Date.now() : joined,
    },
    savedEvents: rows.savedEvents.map((r) => r.event_id),
    attended: rows.attended.map((r) => r.event_id),
    followedPerformers: rows.followedPerformers.map((r) => r.performer_id),
    followedVenues: rows.followedVenues.map((r) => r.venue_id),
  };
}

async function loadAccount(client: SupabaseClient, authUser: AuthUser): Promise<Account> {
  const rows = <T>(r: { data: T[] | null; error: unknown }) => {
    if (r.error) throw r.error;
    return r.data ?? [];
  };
  const [profile, saved, attended, performers, venues] = await Promise.all([
    client.from('profiles').select('display_name, city, created_at').maybeSingle(),
    client.from('saved_events').select('event_id'),
    client.from('attended_events').select('event_id'),
    client.from('followed_performers').select('performer_id'),
    client.from('followed_venues').select('venue_id'),
  ]);
  if (profile.error) throw profile.error;
  return accountFromRows(authUser, {
    profile: profile.data,
    savedEvents: rows(saved),
    attended: rows(attended),
    followedPerformers: rows(performers),
    followedVenues: rows(venues),
  });
}

/** User id whose rows are in the store; avoids reloading on token refresh. */
let loadedFor: string | null = null;

async function applySession(client: SupabaseClient, authUser: AuthUser | null) {
  if (!authUser) {
    loadedFor = null;
    setUserBackend(localUserBackend);
    if (getState().user) actions.setAccount(null);
    return;
  }
  if (loadedFor === authUser.id) return;
  loadedFor = authUser.id;
  setUserBackend(supabaseUserBackend(client, authUser.id), { onSyncError: reportSyncError });
  try {
    actions.setAccount(await loadAccount(client, authUser));
  } catch (e) {
    loadedFor = null;
    reportSyncError(e);
  }
}

function reportSyncError(e: unknown) {
  console.error('Account sync failed', e);
  showToast(t.syncError);
}

/** Removes ?code=… (and other query params) after Supabase has read them, keeping the hash route. */
function cleanAuthParams() {
  history.replaceState(history.state, '', window.location.pathname + window.location.hash);
}

export async function initAuth() {
  try {
    localStorage.removeItem(LEGACY_CACHE_KEY);
  } catch {
    /* storage unavailable */
  }
  const client = await getSupabase().catch(() => null);
  if (!client) {
    if (getState().user) actions.setAccount(null);
    setStatus('unavailable');
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const fromEmailLink = params.has('code') || params.has('error_description');

  client.auth.onAuthStateChange((_event, session) => {
    // supabase-js advises against awaiting its own calls inside this callback.
    setTimeout(() => void applySession(client, session?.user ?? null), 0);
  });
  const { data, error } = await client.auth.getSession();
  if (fromEmailLink) {
    cleanAuthParams();
    showToast(data.session && !error ? t.emailConfirmed : t.confirmLinkFailed, 6000);
  }
  await applySession(client, data.session?.user ?? null);
  setStatus('ready');
}

/** Turkish message for a Supabase Auth error. */
export function authErrorMessage(err: { code?: string; status?: number; message?: string } | null | undefined): string {
  switch (err?.code) {
    case 'invalid_credentials':
      return t.authInvalidCredentials;
    case 'email_not_confirmed':
      return t.authEmailNotConfirmed;
    case 'user_already_exists':
    case 'email_exists':
      return t.authUserExists;
    case 'weak_password':
      return t.passwordShort;
    case 'email_address_invalid':
      return t.emailInvalid;
    case 'signup_disabled':
    case 'email_provider_disabled':
      return t.authSignupDisabled;
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return t.authRateLimited;
  }
  if (err?.status === 429) return t.authRateLimited;
  return t.authGenericError;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  city: City | null;
}

/** Result of a sign-up: signed in right away, or waiting for e-mail confirmation. */
export type SignUpResult = { ok: true; needsConfirmation: boolean } | { ok: false; message: string };

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const client = await getSupabase();
  if (!client) return { ok: false, message: t.accountsUnavailable };
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      // Read by the handle_new_user() trigger to create the profile row.
      data: { display_name: input.displayName.trim(), city: input.city },
      emailRedirectTo: authRedirectUrl(),
    },
  });
  if (error) return { ok: false, message: authErrorMessage(error) };
  return { ok: true, needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = await getSupabase();
  if (!client) return { ok: false, message: t.accountsUnavailable };
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return { ok: false, message: authErrorMessage(error) };
  await applySession(client, data.user);
  return { ok: true };
}

/** Signs out on this device. The local copy of the account data is cleared. */
export async function signOut(): Promise<void> {
  const client = await getSupabase();
  await client?.auth.signOut({ scope: 'local' });
  if (client) await applySession(client, null);
  else actions.setAccount(null);
}
