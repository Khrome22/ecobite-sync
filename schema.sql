-- EcoBite storage shape.
-- Neon holds the relational kitchen. Tiger Data (Timescale) holds the event stream.
-- The demo computes the same daily rollup in the browser so judges can use it
-- with no database credentials. Point DATABASE_URL at Neon and run this there
-- when you want the cloud copy.

create extension if not exists timescaledb;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dorm text not null,
  room text,
  created_at timestamptz not null default now()
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id),
  name text not null,
  quantity_label text not null,
  grams numeric not null check (grams > 0),
  category text not null check (category in ('produce', 'dairy', 'protein', 'grain', 'other')),
  price_usd numeric not null default 0,
  logged_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null check (source in ('fridge', 'receipt', 'rescue', 'manual')),
  state text not null check (state in ('stocked', 'offered', 'cooked', 'wasted')),
  safety text
);

-- One row per thing that happened to food. This is the hypertable.
create table if not exists waste_events (
  time timestamptz not null,
  user_id uuid,
  ingredient_id uuid,
  kind text not null check (kind in ('logged', 'cooked', 'rescued', 'wasted')),
  name text not null,
  grams numeric not null,
  category text not null,
  price_usd numeric not null default 0,
  co2e_kg numeric not null default 0,
  methane_emitted_kg numeric not null default 0,
  embodied_co2e_kg numeric not null default 0,
  water_l numeric not null default 0
);

select create_hypertable('waste_events', 'time', if_not_exists => true);

create index if not exists waste_events_kind_time_idx on waste_events (kind, time desc);

-- Same numbers the Impact page draws.
create materialized view if not exists impact_daily
with (timescaledb.continuous) as
select
  time_bucket('1 day', time) as day,
  sum(grams) filter (where kind in ('cooked', 'rescued')) as grams_kept,
  sum(grams) filter (where kind = 'wasted') as grams_wasted,
  sum(grams) filter (where kind = 'logged') as grams_logged,
  sum(co2e_kg) filter (where kind in ('cooked', 'rescued')) as co2e_avoided,
  sum(methane_emitted_kg) filter (where kind = 'wasted') as co2e_emitted,
  sum(price_usd) filter (where kind in ('cooked', 'rescued')) as usd_kept,
  sum(embodied_co2e_kg) filter (where kind in ('cooked', 'rescued')) as embodied_co2e,
  sum(water_l) filter (where kind in ('cooked', 'rescued')) as water_l
from waste_events
group by 1
with no data;

-- Neighborhood room, if you are not on Spacetime yet.
-- Spacetime reducers: offer, claim, host. This table is the fallback log.
create table if not exists rescue_posts (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'bursley-floor-3',
  poster text not null,
  name text not null,
  quantity_label text not null,
  grams numeric not null,
  expires_at timestamptz not null,
  note text,
  claimed_by text,
  claimed_at timestamptz,
  posted_at timestamptz not null default now()
);
