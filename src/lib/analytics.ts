/**
 * Product analytics: five actions written to public.analytics_events
 * (event_name, event_id, user_id, created_at). No IP address, device id,
 * user agent or free text is sent; the database fills user_id from the
 * session (null when signed out) and created_at itself.
 *
 * Off when the build has no Supabase project, or when it is built with
 * VITE_ANALYTICS_ENABLED=false. Sending never blocks or breaks the UI.
 */
import { getSupabase } from './supabase-client';
import { supabaseConfig } from './supabase-data';
import { onUserChange } from './store';

export const ANALYTICS_EVENTS = [
  'event_detail_opened',
  'event_saved',
  'follow_added',
  'buy_link_tapped',
  'discover_opened',
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsRow {
  event_name: AnalyticsEventName;
  event_id: string | null;
}

/** The on/off flag. "false", "0" and "off" (any case) turn analytics off. */
export function analyticsEnabled(env: Record<string, string | boolean | undefined>): boolean {
  if (!supabaseConfig(env)) return false;
  const flag = env.VITE_ANALYTICS_ENABLED;
  if (flag === false) return false;
  return !(typeof flag === 'string' && ['false', '0', 'off'].includes(flag.trim().toLowerCase()));
}

type Sender = (row: AnalyticsRow) => Promise<void>;

const supabaseSender: Sender = async (row) => {
  const client = await getSupabase();
  if (!client) return;
  const { error } = await client.from('analytics_events').insert(row);
  if (error) throw error;
};

let enabled = analyticsEnabled(import.meta.env);
let send: Sender = supabaseSender;

/** For tests: replace the sender and the flag. */
export function configureAnalytics(opts: { enabled: boolean; send?: Sender }) {
  enabled = opts.enabled;
  if (opts.send) send = opts.send;
}

/** The same action on the same event within this window is counted once (e.g. React StrictMode effects). */
export const DEDUPE_MS = 1000;
let last: { key: string; at: number } | null = null;

/** Records one action. Fire-and-forget. */
export function track(name: AnalyticsEventName, eventId: string | null = null, now = Date.now()): void {
  if (!enabled) return;
  const key = `${name}|${eventId ?? ''}`;
  if (last && last.key === key && now - last.at < DEDUPE_MS) return;
  last = { key, at: now };
  send({ event_name: name, event_id: eventId }).catch((e) => console.debug('analytics not sent', e));
}

/** Saves and follows are tracked from the store, wherever in the UI they happen. */
export function installAnalytics() {
  onUserChange((change) => {
    if (change.type === 'saved') track('event_saved', change.id);
    // event_id holds event ids only; the followed artist/venue id is not recorded.
    else track('follow_added', null);
  });
}
