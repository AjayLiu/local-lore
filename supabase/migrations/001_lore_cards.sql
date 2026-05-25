-- Geographic cache for lore cards (one row per Wikipedia article).
create extension if not exists postgis;

create table lore_cards (
  id uuid primary key default gen_random_uuid(),
  page_id bigint not null unique,
  title text not null,
  headline text not null,
  hook text not null,
  wikipedia_url text not null,
  image_url text,
  latitude double precision not null,
  longitude double precision not null,
  location geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  search_label text,
  search_lat double precision,
  search_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lore_cards_location_idx on lore_cards using gist (location);

create or replace function get_lore_cards_in_bbox(
  west double precision,
  south double precision,
  east double precision,
  north double precision,
  max_rows integer default 2000
)
returns setof lore_cards
language sql
stable
as $$
  select *
  from lore_cards
  where st_intersects(
    location,
    st_makeenvelope(west, south, east, north, 4326)::geography
  )
  limit greatest(1, least(max_rows, 2000));
$$;
