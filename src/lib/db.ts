import { mkdir } from "node:fs/promises"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import type { ImpactEvent, KitchenState } from "@/lib/kitchen"

const SCHEMA = `
create table if not exists waste_events (
  time timestamptz not null,
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
create index if not exists waste_events_time_idx on waste_events (time desc);
create table if not exists room_snapshot (
  id text primary key,
  doc text not null
);
create or replace view impact_daily as
select
  date_trunc('day', time) as day,
  sum(grams) filter (where kind in ('cooked', 'rescued')) as grams_kept,
  sum(grams) filter (where kind = 'wasted') as grams_wasted,
  sum(grams) filter (where kind = 'logged') as grams_logged,
  sum(co2e_kg) filter (where kind in ('cooked', 'rescued')) as co2e_avoided,
  sum(methane_emitted_kg) filter (where kind = 'wasted') as co2e_emitted,
  sum(price_usd) filter (where kind in ('cooked', 'rescued')) as usd_kept,
  sum(water_l) filter (where kind in ('cooked', 'rescued')) as water_l
from waste_events
group by 1;
`

export const IMPACT_SQL = `select
  to_char(time at time zone 'UTC', 'YYYY-MM-DD') as day,
  coalesce(sum(grams) filter (where kind = 'logged'), 0) as grams_logged,
  coalesce(sum(grams) filter (where kind = 'wasted'), 0) as grams_wasted,
  coalesce(sum(grams) filter (where kind in ('cooked', 'rescued')), 0) as grams_kept,
  coalesce(sum(co2e_kg) filter (where kind in ('cooked', 'rescued')), 0) as co2e_avoided,
  coalesce(sum(water_l) filter (where kind in ('cooked', 'rescued')), 0) as water_saved,
  coalesce(sum(price_usd) filter (where kind in ('cooked', 'rescued')), 0) as usd_kept
from waste_events
group by 1
order by 1;`

const ROOM_ID = "bursley-floor-3"

let dbPromise: Promise<PGlite> | null = null

function database() {
  if (!dbPromise) {
    const dir = path.join(process.cwd(), "data", "pglite")
    dbPromise = (async () => {
      try {
        await mkdir(dir, { recursive: true })
        const db = new PGlite(dir)
        await db.exec(SCHEMA)
        return db
      } catch (error) {
        dbPromise = null
        throw error
      }
    })()
  }
  return dbPromise
}

export async function loadSnapshot(): Promise<KitchenState | null> {
  const db = await database()
  const result = await db.query<{ doc: string }>("select doc from room_snapshot where id = $1", [ROOM_ID])
  const doc = result.rows[0]?.doc
  if (!doc) return null
  try {
    return JSON.parse(doc) as KitchenState
  } catch {
    return null
  }
}

export async function saveRoom(state: KitchenState) {
  const db = await database()
  const events = state.events.map((event) => toRow(event))
  await db.query(
    `insert into room_snapshot (id, doc) values ($1, $2)
     on conflict (id) do update set doc = excluded.doc`,
    [ROOM_ID, JSON.stringify({ ...state, toast: null })],
  )
  await db.exec("delete from waste_events")
  if (events.length === 0) return
  await db.query(
    `insert into waste_events (
       time, ingredient_id, kind, name, grams, category, price_usd,
       co2e_kg, methane_emitted_kg, embodied_co2e_kg, water_l
     )
     select
       time, ingredient_id, kind, name, grams, category, price_usd,
       co2e_kg, methane_emitted_kg, embodied_co2e_kg, water_l
     from json_to_recordset($1::json) as x(
       time timestamptz,
       ingredient_id text,
       kind text,
       name text,
       grams float8,
       category text,
       price_usd float8,
       co2e_kg float8,
       methane_emitted_kg float8,
       embodied_co2e_kg float8,
       water_l float8
     )`,
    [JSON.stringify(events)],
  )
}

function toRow(event: ImpactEvent) {
  return {
    time: new Date(event.at).toISOString(),
    ingredient_id: event.id,
    kind: event.kind,
    name: event.name,
    grams: event.grams,
    category: event.category,
    price_usd: event.priceUsd,
    co2e_kg: event.co2eKg,
    methane_emitted_kg: event.methaneEmittedKg,
    embodied_co2e_kg: event.embodiedCo2eKg,
    water_l: event.waterL,
  }
}

type TotalRow = {
  logged: number
  wasted: number
  kept: number
  co2e_avoided: number
  co2e_emitted: number
  usd_kept: number
  usd_lost: number
  water_l: number
}

type DayRow = {
  day: string
  grams_logged: number
  grams_wasted: number
  grams_kept: number
}

export type ImpactDay = {
  key: string
  label: string
  title: string
  isToday: boolean
  logged: number
  wasted: number
  kept: number
}

export type ImpactReport = {
  engine: "PostgreSQL"
  query: string
  totals: {
    loggedGrams: number
    wastedGrams: number
    keptGrams: number
    co2eAvoided: number
    co2eEmitted: number
    usdKept: number
    usdLost: number
    waterL: number
  }
  days: ImpactDay[]
}

function num(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function readImpact(now = Date.now()): Promise<ImpactReport> {
  const db = await database()
  const totals = await db.query<TotalRow>(`select
      coalesce(sum(grams) filter (where kind = 'logged'), 0) as logged,
      coalesce(sum(grams) filter (where kind = 'wasted'), 0) as wasted,
      coalesce(sum(grams) filter (where kind in ('cooked', 'rescued')), 0) as kept,
      coalesce(sum(co2e_kg) filter (where kind in ('cooked', 'rescued')), 0) as co2e_avoided,
      coalesce(sum(methane_emitted_kg) filter (where kind = 'wasted'), 0) as co2e_emitted,
      coalesce(sum(price_usd) filter (where kind in ('cooked', 'rescued')), 0) as usd_kept,
      coalesce(sum(price_usd) filter (where kind = 'wasted'), 0) as usd_lost,
      coalesce(sum(water_l) filter (where kind in ('cooked', 'rescued')), 0) as water_l
    from waste_events`)
  const daily = await db.query<DayRow>(IMPACT_SQL)
  const byDay = new Map(daily.rows.map((row) => [row.day, row]))
  const days: ImpactDay[] = []
  for (let ago = 13; ago >= 0; ago--) {
    const date = new Date(now)
    date.setUTCHours(12, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - ago)
    const key = date.toISOString().slice(0, 10)
    const row = byDay.get(key)
    days.push({
      key,
      label: date.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" }),
      title: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
      isToday: ago === 0,
      logged: num(row?.grams_logged),
      wasted: num(row?.grams_wasted),
      kept: num(row?.grams_kept),
    })
  }
  const total = totals.rows[0]
  return {
    engine: "PostgreSQL",
    query: IMPACT_SQL.trim(),
    totals: {
      loggedGrams: num(total?.logged),
      wastedGrams: num(total?.wasted),
      keptGrams: num(total?.kept),
      co2eAvoided: num(total?.co2e_avoided),
      co2eEmitted: num(total?.co2e_emitted),
      usdKept: num(total?.usd_kept),
      usdLost: num(total?.usd_lost),
      waterL: num(total?.water_l),
    },
    days,
  }
}
