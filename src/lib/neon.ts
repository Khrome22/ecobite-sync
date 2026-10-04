import { neon } from "@neondatabase/serverless"
import type { KitchenState } from "@/lib/kitchen"
import { YOU } from "@/lib/kitchen"
import { neonUrl } from "@/lib/env"

const FLOOR = [
  { name: "Kavitha", dorm: "Bursley", room: "3B" },
  { name: "Priya", dorm: "Bursley", room: null },
  { name: "Sam", dorm: "Bursley", room: null },
  { name: "Jordan", dorm: "Bursley", room: null },
  { name: "Mina", dorm: "Bursley", room: null },
  { name: "Alex", dorm: "Bursley", room: null },
]

function sqlClient() {
  const url = neonUrl()
  if (!url) return null
  return neon(url)
}

function iso(ms: number) {
  return new Date(ms).toISOString()
}

/** Replace the durable shelf, rescue history, and recipe log so the Neon SQL editor matches the room. */
export async function writeNeon(state: KitchenState) {
  const sql = sqlClient()
  if (!sql) return
  const ingredients = state.ingredients.map((item) => ({
    id: item.id,
    user_name: YOU.name,
    name: item.name,
    quantity_label: item.quantityLabel,
    grams: item.grams,
    category: item.category,
    price_usd: item.priceUsd,
    logged_at: iso(item.addedAt),
    expires_at: iso(item.expiresAt),
    source: item.source,
    state: item.state,
    note: item.note ?? null,
    safety: item.safety ?? null,
    from_name: item.from ?? null,
  }))
  const rescues = state.rescues.map((rescue) => ({
    id: rescue.id,
    room: "bursley-floor-3",
    ingredient_id: rescue.ingredientId ?? null,
    poster: rescue.poster,
    name: rescue.name,
    quantity_label: rescue.quantityLabel,
    grams: rescue.grams,
    category: rescue.category,
    price_usd: rescue.priceUsd,
    expires_at: iso(rescue.expiresAt),
    note: rescue.note ?? null,
    safety: rescue.safety ?? null,
    claimed_by: rescue.claimedBy ?? null,
    claimed_at: rescue.claimedAt ? iso(rescue.claimedAt) : null,
    posted_at: iso(rescue.at),
  }))
  const meals = (state.meals ?? []).map((meal) => ({
    id: meal.id,
    user_name: YOU.name,
    recipe_id: meal.recipeId,
    recipe_name: meal.recipeName,
    cooked_at: iso(meal.at),
    ingredient_ids: meal.ingredientIds.join(","),
  }))

  const queries = [
    ...FLOOR.map(
      (person) =>
        sql`insert into users (name, dorm, room)
            values (${person.name}, ${person.dorm}, ${person.room})
            on conflict (name) do update set dorm = excluded.dorm, room = excluded.room`,
    ),
    sql`delete from ingredients`,
    sql`delete from rescue_posts`,
    sql`delete from recipe_history`,
  ]
  if (ingredients.length > 0) {
    queries.push(sql`insert into ingredients (
        id, user_name, name, quantity_label, grams, category, price_usd,
        logged_at, expires_at, source, state, note, safety, from_name
      )
      select
        id, user_name, name, quantity_label, grams, category, price_usd,
        logged_at, expires_at, source, state, note, safety, from_name
      from json_to_recordset(${JSON.stringify(ingredients)}::json) as x(
        id text,
        user_name text,
        name text,
        quantity_label text,
        grams float8,
        category text,
        price_usd float8,
        logged_at timestamptz,
        expires_at timestamptz,
        source text,
        state text,
        note text,
        safety text,
        from_name text
      )`)
  }
  if (rescues.length > 0) {
    queries.push(sql`insert into rescue_posts (
        id, room, ingredient_id, poster, name, quantity_label, grams, category,
        price_usd, expires_at, note, safety, claimed_by, claimed_at, posted_at
      )
      select
        id, room, ingredient_id, poster, name, quantity_label, grams, category,
        price_usd, expires_at, note, safety, claimed_by, claimed_at, posted_at
      from json_to_recordset(${JSON.stringify(rescues)}::json) as x(
        id text,
        room text,
        ingredient_id text,
        poster text,
        name text,
        quantity_label text,
        grams float8,
        category text,
        price_usd float8,
        expires_at timestamptz,
        note text,
        safety text,
        claimed_by text,
        claimed_at timestamptz,
        posted_at timestamptz
      )`)
  }
  if (meals.length > 0) {
    queries.push(sql`insert into recipe_history (
        id, user_name, recipe_id, recipe_name, cooked_at, ingredient_ids
      )
      select id, user_name, recipe_id, recipe_name, cooked_at, ingredient_ids
      from json_to_recordset(${JSON.stringify(meals)}::json) as x(
        id text,
        user_name text,
        recipe_id text,
        recipe_name text,
        cooked_at timestamptz,
        ingredient_ids text
      )`)
  }
  await sql.transaction(queries)
}
