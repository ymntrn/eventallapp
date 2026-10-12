/**
 * Reads venues, performers and events from Supabase (schema in
 * supabase/migrations/) through its REST API (PostgREST) with the public anon
 * key. Plain fetch, no SDK: read-only public data needs nothing more, and it
 * keeps the bundle small. Returns the same file shapes as the bundled JSON.
 */
import type {
  Category,
  City,
  EventItem,
  EventsFile,
  Offer,
  Performer,
  PerformerKind,
  PerformersFile,
  TicketPlatform,
  Venue,
  VenuePrecision,
  VenueType,
  VenuesFile,
} from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/** Both env vars set → Supabase; otherwise null (bundled JSON). */
export function supabaseConfig(env: Record<string, string | boolean | undefined>): SupabaseConfig | null {
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const anonKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  return url && anonKey ? { url: url.replace(/\/+$/, ''), anonKey } : null;
}

export interface VenueRow {
  id: string;
  name: string;
  type: string;
  city: string;
  district: string | null;
  address: string | null;
  lat: number;
  lng: number;
  precision: string | null;
  osm_id: string | null;
  osm_url: string | null;
  verified: boolean;
}

export interface PerformerRow {
  id: string;
  name: string;
  kind: string;
  genre: string | null;
}

export interface EventRow {
  id: string;
  venue_id: string;
  title: string;
  category: string;
  starts_at: string;
  image_url: string | null;
  description: string | null;
  event_performers: { performer_id: string; position: number }[] | null;
  offers: { platform: string; url: string; price: number | string | null; label: string | null; available: boolean }[] | null;
}

export function rowToVenue(r: VenueRow): Venue {
  return {
    id: r.id,
    name: r.name,
    type: r.type as VenueType,
    city: r.city as City,
    ...(r.district ? { district: r.district } : {}),
    ...(r.address ? { address: r.address } : {}),
    lat: Number(r.lat),
    lng: Number(r.lng),
    ...(r.precision ? { precision: r.precision as VenuePrecision } : {}),
    ...(r.osm_id ? { osmId: r.osm_id } : {}),
    ...(r.osm_url ? { osmUrl: r.osm_url } : {}),
    verified: r.verified,
  };
}

export function rowToPerformer(r: PerformerRow): Performer {
  return { id: r.id, name: r.name, kind: r.kind as PerformerKind, ...(r.genre ? { genre: r.genre } : {}) };
}

/** Postgres timestamptz (UTC) → ISO 8601 in Turkey time, like events.json ("…T20:00:00+03:00"). */
export function toIstanbulIso(timestamp: string): string {
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) return timestamp;
  return new Date(ms + 3 * 3600_000).toISOString().slice(0, 19) + '+03:00';
}

export function rowToEvent(r: EventRow): EventItem {
  const offers: Offer[] = (r.offers ?? []).map((o) => ({
    platform: o.platform as TicketPlatform,
    url: o.url,
    ...(o.price !== null && o.price !== undefined ? { price: Number(o.price) } : {}),
    ...(o.label ? { label: o.label } : {}),
    ...(o.available === false ? { available: false } : {}),
  }));
  const performerIds = [...(r.event_performers ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((p) => p.performer_id);
  return {
    id: r.id,
    venueId: r.venue_id,
    title: r.title,
    category: r.category as Category,
    startsAt: toIstanbulIso(r.starts_at),
    offers,
    ...(performerIds.length ? { performerIds } : {}),
    ...(r.image_url ? { imageUrl: r.image_url } : {}),
    ...(r.description ? { description: r.description } : {}),
  };
}

const PAGE = 1000;

/** GETs every row of a PostgREST query, page by page (Supabase caps responses at 1000 rows). */
async function fetchAll<T>(cfg: SupabaseConfig, path: string, fetchImpl: typeof fetch): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetchImpl(`${cfg.url}/rest/v1/${path}`, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        Accept: 'application/json',
        'Range-Unit': 'items',
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase ${path.split('?')[0]}: HTTP ${res.status}`);
    const rows = (await res.json()) as T[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

/** Events that started more than this long ago are not loaded. */
const PAST_WINDOW_MS = 6 * 3600_000;

export async function loadFromSupabase(
  cfg: SupabaseConfig,
  now: number,
  fetchImpl: typeof fetch = fetch,
): Promise<{ venues: VenuesFile; events: EventsFile; performers: PerformersFile }> {
  const since = new Date(now - PAST_WINDOW_MS).toISOString();
  const [venues, performers, events] = await Promise.all([
    fetchAll<VenueRow>(
      cfg,
      'venues_with_coords?select=id,name,type,city,district,address,lat,lng,precision,osm_id,osm_url,verified&order=id',
      fetchImpl,
    ),
    fetchAll<PerformerRow>(cfg, 'performers?select=id,name,kind,genre&order=id', fetchImpl),
    fetchAll<EventRow>(
      cfg,
      'events?select=id,venue_id,title,category,starts_at,image_url,description,' +
        'event_performers(performer_id,position),offers(platform,url,price,label,available)' +
        `&starts_at=gte.${encodeURIComponent(since)}&order=starts_at,id`,
      fetchImpl,
    ),
  ]);
  return {
    venues: { venues: venues.map(rowToVenue) },
    performers: { performers: performers.map(rowToPerformer) },
    events: { events: events.map(rowToEvent) },
  };
}
