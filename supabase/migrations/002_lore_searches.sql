-- Community search log (one row per non-private location search).
create table lore_searches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  latitude double precision not null,
  longitude double precision not null,
  searched_at timestamptz not null default now()
);

create index lore_searches_searched_at_idx on lore_searches (searched_at desc);

-- Backfill from existing cached cards (one row per distinct search context).
insert into lore_searches (label, latitude, longitude, searched_at)
select search_label, search_lat, search_lng, min(created_at)
from lore_cards
where search_label is not null
  and search_lat is not null
  and search_lng is not null
group by search_label, search_lat, search_lng;
