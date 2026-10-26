/**
 * In-app notifications (Stage 1: nothing creates them, the list stays empty).
 * Rows come from public.notifications; RLS returns only the caller's.
 */
import { getSupabase } from './supabase-client';

export interface AppNotification {
  id: number;
  kind: string;
  eventId: string | null;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
}

interface Row {
  id: number;
  kind: string;
  event_id: string | null;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  const client = await getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('notifications')
    .select('id, kind, event_id, title, body, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    eventId: r.event_id,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));
}
