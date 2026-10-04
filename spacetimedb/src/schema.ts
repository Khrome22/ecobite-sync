import { CaseConversionPolicy, schema, table, t } from "spacetimedb/server"

/**
 * Live Bursley floor 3 room.
 * Names stay as written (no snake_case rewrite) so the Next client
 * can map rows onto the kitchen model without a second naming scheme.
 */
const floor = table(
  { name: "floor", public: true },
  {
    id: t.string().primaryKey(),
    hosting: t.bool(),
    scriptIndex: t.u32(),
    lastScriptAtMs: t.i64(),
    nextId: t.u32(),
    toastId: t.string().optional(),
    toastTitle: t.string().optional(),
    toastBody: t.string().optional(),
  },
)

const ingredient = table(
  { name: "ingredient", public: true },
  {
    id: t.string().primaryKey(),
    name: t.string(),
    quantityLabel: t.string(),
    grams: t.f64(),
    category: t.string(),
    priceUsd: t.f64(),
    expiresAtMs: t.i64(),
    addedAtMs: t.i64(),
    source: t.string(),
    state: t.string(),
    note: t.string().optional(),
    safety: t.string().optional(),
    fromName: t.string().optional(),
    eventId: t.string().optional(),
  },
)

const rescuePost = table(
  { name: "rescue_post", public: true },
  {
    id: t.string().primaryKey(),
    ingredientId: t.string().optional(),
    name: t.string(),
    quantityLabel: t.string(),
    grams: t.f64(),
    category: t.string(),
    priceUsd: t.f64(),
    expiresAtMs: t.i64(),
    poster: t.string(),
    postedAtMs: t.i64(),
    note: t.string(),
    safety: t.string().optional(),
    claimedBy: t.string().optional(),
    claimedAtMs: t.i64().optional(),
  },
)

const roomNote = table(
  { name: "room_note", public: true },
  {
    id: t.string().primaryKey(),
    atMs: t.i64(),
    author: t.string(),
    text: t.string(),
  },
)

const wasteEvent = table(
  { name: "waste_event", public: true },
  {
    id: t.string().primaryKey(),
    atMs: t.i64(),
    kind: t.string(),
    name: t.string(),
    grams: t.f64(),
    category: t.string(),
    priceUsd: t.f64(),
    co2eKg: t.f64(),
    methaneEmittedKg: t.f64(),
    embodiedCo2eKg: t.f64(),
    waterL: t.f64(),
  },
)

const recipeRun = table(
  { name: "recipe_run", public: true },
  {
    id: t.string().primaryKey(),
    atMs: t.i64(),
    recipeId: t.string(),
    recipeName: t.string(),
    ingredientIds: t.string(),
  },
)

const spacetimedb = schema(
  { floor, ingredient, rescuePost, roomNote, wasteEvent, recipeRun },
  { CASE_CONVERSION_POLICY: CaseConversionPolicy.None },
)

export default spacetimedb
