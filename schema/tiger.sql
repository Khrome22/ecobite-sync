-- EcoBite impact rollup for Tiger Cloud (TimescaleDB).
-- waste_events is the hypertable. impact_daily is the continuous aggregate
-- the Impact page queries. materialized_only = false keeps the latest rows
-- visible before the refresh policy catches up.

create extension if not exists timescaledb;

create table if not exists waste_events (
  time timestamptz not null,
  event_id text,
  ingredient_id text,
  kind text not null check (kind in ('logged', 'cooked', 'rescued', 'wasted')),
  name text not null,
  grams double precision not null,
  category text not null,
  price_usd double precision not null default 0,
  co2e_kg double precision not null default 0,
  methane_emitted_kg double precision not null default 0,
  embodied_co2e_kg double precision not null default 0,
  water_l double precision not null default 0
);

select create_hypertable('waste_events', 'time', if_not_exists => true);

create index if not exists waste_events_kind_time_idx on waste_events (kind, time desc);
create index if not exists waste_events_event_id_idx on waste_events (event_id);

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
  sum(price_usd) filter (where kind = 'wasted') as usd_lost,
  sum(embodied_co2e_kg) filter (where kind in ('cooked', 'rescued')) as embodied_co2e,
  sum(water_l) filter (where kind in ('cooked', 'rescued')) as water_l
from waste_events
group by 1
with no data;

alter materialized view impact_daily set (timescaledb.materialized_only = false);

select add_continuous_aggregate_policy(
  'impact_daily',
  start_offset => interval '30 days',
  end_offset => interval '1 minute',
  schedule_interval => interval '1 minute',
  if_not_exists => true
);
