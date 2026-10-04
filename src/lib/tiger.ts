import { Pool } from "pg"
import type { ImpactEvent } from "@/lib/kitchen"
import { tigerUrl } from "@/lib/env"

export const TIGER_IMPACT_SQL = `select
  to_char(day at time zone 'UTC', 'YYYY-MM-DD') as day,
  coalesce(grams_logged, 0) as grams_logged,
  coalesce(grams_wasted, 0) as grams_wasted,
  coalesce(grams_kept, 0) as grams_kept
from impact_daily
order by 1`

const TOTALS_SQL = `select
  coalesce(sum(grams_logged), 0) as logged,
  coalesce(sum(grams_wasted), 0) as wasted,
  coalesce(sum(grams_kept), 0) as kept,
  coalesce(sum(co2e_avoided), 0) as co2e_avoided,
  coalesce(sum(co2e_emitted), 0) as co2e_emitted,
  coalesce(sum(usd_kept), 0) as usd_kept,
  coalesce(sum(usd_lost), 0) as usd_lost,
  coalesce(sum(water_l), 0) as water_l
from impact_daily`

type TigerGlobal = typeof globalThis & { __ecobiteTiger?: Pool }

function pool() {
  const url = tigerUrl()
  if (!url) return null
  const slot = globalThis as TigerGlobal
  if (!slot.__ecobiteTiger) {
    const local = /localhost|127\.0\.0\.1/.test(url)
    slot.__ecobiteTiger = new Pool({
      connectionString: url,
      max: 3,
      ssl: local ? undefined : { rejectUnauthorized: false },
    })
  }
  return slot.__ecobiteTiger
}

function eventRow(event: ImpactEvent) {
  return {
    time: new Date(event.at).toISOString(),
    event_id: event.id,
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

async function refreshAggregate(db: Pool) {
  try {
    await db.query("call refresh_continuous_aggregate('impact_daily', null, null)")
    return
  } catch (error) {
    console.error("call refresh_continuous_aggregate failed", error)
  }
  try {
    await db.query("select refresh_continuous_aggregate('impact_daily', null, null)")
  } catch (error) {
    console.error("select refresh_continuous_aggregate failed", error)
  }
}

/** Replace the hypertable contents, then refresh impact_daily so the chart matches the room. */
export async function writeTigerEvents(events: ImpactEvent[]) {
  const db = pool()
  if (!db) return
  const rows = events.map(eventRow)
  const client = await db.connect()
  try {
    await client.query("begin")
    await client.query("delete from waste_events")
    if (rows.length > 0) {
      await client.query(
        `insert into waste_events (
           time, event_id, ingredient_id, kind, name, grams, category, price_usd,
           co2e_kg, methane_emitted_kg, embodied_co2e_kg, water_l
         )
         select
           time, event_id, ingredient_id, kind, name, grams, category, price_usd,
           co2e_kg, methane_emitted_kg, embodied_co2e_kg, water_l
         from json_to_recordset($1::json) as x(
           time timestamptz,
           event_id text,
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
        [JSON.stringify(rows)],
      )
    }
    await client.query("commit")
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    client.release()
  }
  await refreshAggregate(db)
}

export type TigerNumbers = {
  logged: number
  wasted: number
  kept: number
  co2e_avoided: number
  co2e_emitted: number
  usd_kept: number
  usd_lost: number
  water_l: number
}

export type TigerDay = {
  day: string
  grams_logged: number
  grams_wasted: number
  grams_kept: number
}

export async function queryTigerImpact() {
  const db = pool()
  if (!db) throw new Error("Tiger Data is not configured")
  const totals = await db.query<TigerNumbers>(TOTALS_SQL)
  const daily = await db.query<TigerDay>(TIGER_IMPACT_SQL)
  return { totals: totals.rows[0], days: daily.rows }
}
