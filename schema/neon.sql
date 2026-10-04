-- EcoBite app data for Neon Postgres.
-- Live rescue-board state is SpacetimeDB. These tables are the durable copy
-- a judge can open in the Neon SQL editor: who lives on the floor, what is
-- on the shelf, what was posted, and which recipes were cooked.
-- Time-series waste_events live in Tiger, not here.

create table if not exists users (
  name text primary key,
  dorm text not null,
  room text,
  created_at timestamptz not null default now()
);

create table if not exists ingredients (
  id text primary key,
  user_name text not null references users (name),
  name text not null,
  quantity_label text not null,
  grams double precision not null check (grams > 0),
  category text not null check (category in ('produce', 'dairy', 'protein', 'grain', 'other')),
  price_usd double precision not null default 0,
  logged_at timestamptz not null,
  expires_at timestamptz not null,
  source text not null check (source in ('fridge', 'receipt', 'rescue', 'manual')),
  state text not null check (state in ('stocked', 'offered', 'cooked', 'wasted')),
  note text,
  safety text,
  from_name text
);

create index if not exists ingredients_user_idx on ingredients (user_name);

create table if not exists rescue_posts (
  id text primary key,
  room text not null default 'bursley-floor-3',
  ingredient_id text,
  poster text not null,
  name text not null,
  quantity_label text not null,
  grams double precision not null,
  category text not null,
  price_usd double precision not null default 0,
  expires_at timestamptz not null,
  note text,
  safety text,
  claimed_by text,
  claimed_at timestamptz,
  posted_at timestamptz not null
);

create index if not exists rescue_posts_room_idx on rescue_posts (room, posted_at desc);

create table if not exists recipe_history (
  id text primary key,
  user_name text not null references users (name),
  recipe_id text not null,
  recipe_name text not null,
  cooked_at timestamptz not null,
  ingredient_ids text not null
);
