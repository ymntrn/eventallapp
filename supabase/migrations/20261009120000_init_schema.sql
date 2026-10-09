-- Eventall schema: venues, performers, events, offers.
-- Public (anon) read access through row-level security; writes only with the
-- service role (seed script, importers), which bypasses RLS.
-- Enum-like columns use CHECK constraints that mirror src/types.ts.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------- venues
create table public.venues (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(trim(name)) > 0),
  type        text not null check (type in (
                'concert_hall', 'live_music', 'electronic', 'open_air', 'festival_ground', 'theater',
                'opera', 'classical', 'arena', 'performance_space', 'stadium', 'congress_center',
                'cultural_center')),
  city        text not null check (city in ('Ankara', 'İstanbul')),
  district    text,
  address     text,
  location    extensions.geography(Point, 4326) not null,
  precision   text check (precision in ('point', 'building_centroid', 'complex_centroid')),
  osm_id      text unique check (osm_id ~ '^(node|way|relation)/[0-9]+$'),
  osm_url     text check (osm_url like 'https://www.openstreetmap.org/%'),
  verified    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (city, name)
);
create index venues_location_idx on public.venues using gist (location);
create index venues_city_idx on public.venues (city);

-- Same per-city boxes as src/lib/geo.ts (CITY_BOUNDS).
alter table public.venues add constraint venues_in_city_box check (
  case city
    when 'Ankara'   then extensions.st_y(location::extensions.geometry) between 39.3 and 40.5
                     and extensions.st_x(location::extensions.geometry) between 31.8 and 33.6
    when 'İstanbul' then extensions.st_y(location::extensions.geometry) between 40.8 and 41.6
                     and extensions.st_x(location::extensions.geometry) between 28.0 and 29.9
  end
);

-- lat/lng as plain numbers for the app (src/lib/supabase-data.ts reads this view).
create view public.venues_with_coords with (security_invoker = true) as
select
  id, name, type, city, district, address,
  extensions.st_y(location::extensions.geometry) as lat,
  extensions.st_x(location::extensions.geometry) as lng,
  precision, osm_id, osm_url, verified
from public.venues;

-- ---------------------------------------------------------------- performers
create table public.performers (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(trim(name)) > 0),
  kind        text not null check (kind in ('band', 'musician', 'dj', 'comedian', 'company', 'ensemble')),
  genre       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- events
create table public.events (
  id           text primary key,
  venue_id     text not null references public.venues (id) on update cascade,
  title        text not null check (length(trim(title)) > 0),
  category     text not null check (category in ('rock', 'pop', 'electronic', 'jazz_classical', 'theater', 'comedy', 'other')),
  starts_at    timestamptz not null,
  image_url    text check (image_url like 'https://%'),
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index events_starts_at_idx on public.events (starts_at);
create index events_venue_idx on public.events (venue_id);

create table public.event_performers (
  event_id      text not null references public.events (id) on delete cascade,
  performer_id  text not null references public.performers (id) on delete cascade,
  position      smallint not null default 0,
  primary key (event_id, performer_id)
);
create index event_performers_performer_idx on public.event_performers (performer_id);

-- ---------------------------------------------------------------- offers
-- One seller's listing for an event (src/types.ts Offer).
create table public.offers (
  id          bigint generated always as identity primary key,
  event_id    text not null references public.events (id) on delete cascade,
  platform    text not null check (platform in ('Biletix', 'Passo', 'Biletinial', 'Bubilet', 'Mobilet', 'Other')),
  url         text not null check (url like 'https://%'),
  price       numeric(10, 2) check (price >= 0),
  label       text,
  available   boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index offers_event_idx on public.offers (event_id);

-- ---------------------------------------------------------------- updated_at
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger venues_touch before update on public.venues for each row execute function public.touch_updated_at();
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger offers_touch before update on public.offers for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS: public read
alter table public.venues           enable row level security;
alter table public.performers       enable row level security;
alter table public.events           enable row level security;
alter table public.event_performers enable row level security;
alter table public.offers           enable row level security;

create policy "Public read" on public.venues           for select to anon, authenticated using (true);
create policy "Public read" on public.performers       for select to anon, authenticated using (true);
create policy "Public read" on public.events           for select to anon, authenticated using (true);
create policy "Public read" on public.event_performers for select to anon, authenticated using (true);
create policy "Public read" on public.offers           for select to anon, authenticated using (true);
-- No insert/update/delete policies: only the service role writes.

-- Supabase grants these by default; explicit so the migration also works on plain Postgres.
grant select on public.venues, public.venues_with_coords, public.performers, public.events,
  public.event_performers, public.offers to anon, authenticated;
