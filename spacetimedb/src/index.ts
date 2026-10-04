import { SenderError, t, type InferSchema, type ReducerCtx } from "spacetimedb/server"
import spacetimedb from "./schema"
import {
  HOUR,
  OPENING_INGREDIENTS,
  OPENING_NOTES,
  OPENING_RESCUES,
  ROOM,
  SCRIPT,
  YOU,
  footprint,
  historyEvents,
  minutesAgo,
  type ScriptStep,
} from "./seed"

export default spacetimedb

const URGENT = 24n * HOUR
const SCRIPT_GAP = 14_000n
const CATEGORIES = new Set(["produce", "dairy", "protein", "grain", "other"])
const SOURCES = new Set(["fridge", "receipt", "rescue", "manual"])

type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>
type Floor = NonNullable<ReturnType<Ctx["db"]["floor"]["id"]["find"]>>

function nowMs(ctx: Ctx) {
  return ctx.timestamp.toMillis()
}

function bump(floor: Floor) {
  const id = `n-${floor.nextId}`
  return { floor: { ...floor, nextId: floor.nextId + 1 }, id }
}

function withToast(floor: Floor, title: string, body?: string): Floor {
  const next = bump(floor)
  return {
    ...next.floor,
    toastId: next.id,
    toastTitle: title,
    toastBody: body,
  }
}

function insertEvent(
  ctx: Ctx,
  row: {
    id: string
    atMs: bigint
    kind: string
    name: string
    grams: number
    category: string
    priceUsd: number
    co2eKg: number
    methaneEmittedKg: number
    embodiedCo2eKg: number
    waterL: number
  },
) {
  ctx.db.wasteEvent.insert(row)
}

function outcome(
  item: { name: string; grams: number; category: string; priceUsd: number },
  kind: "cooked" | "rescued" | "wasted",
  id: string,
  atMs: bigint,
) {
  const fp = footprint(item.name, item.grams, item.category)
  const saved = kind !== "wasted"
  return {
    id,
    atMs,
    kind,
    name: item.name,
    grams: item.grams,
    category: item.category,
    priceUsd: item.priceUsd,
    co2eKg: saved ? fp.landfillCo2eKg : 0,
    methaneEmittedKg: saved ? 0 : fp.landfillCo2eKg,
    embodiedCo2eKg: fp.embodiedCo2eKg,
    waterL: fp.waterL,
  }
}

function publishUrgent(ctx: Ctx, floor: Floor, now: bigint, silent: boolean): Floor {
  const open = new Set<string>()
  for (const rescue of ctx.db.rescuePost.iter()) {
    if (rescue.ingredientId && !rescue.claimedBy) open.add(rescue.ingredientId)
  }
  const due = [...ctx.db.ingredient.iter()].filter((item) => {
    if (item.state !== "stocked" || item.source === "rescue") return false
    if (item.expiresAtMs - now >= URGENT) return false
    return !open.has(item.id)
  })
  if (due.length === 0) return floor
  for (const item of due) {
    ctx.db.ingredient.id.update({ ...item, state: "offered" })
    ctx.db.rescuePost.insert({
      id: `post-${item.id}`,
      ingredientId: item.id,
      name: item.name,
      quantityLabel: item.quantityLabel,
      grams: item.grams,
      category: item.category,
      priceUsd: item.priceUsd,
      expiresAtMs: item.expiresAtMs,
      poster: YOU,
      postedAtMs: now,
      note: "Under 24 hours on my shelf. Take it if you'll cook it.",
      safety: item.safety,
      claimedBy: undefined,
      claimedAtMs: undefined,
    })
  }
  if (silent) return floor
  const title = due.length === 1 ? `${due[0].name} is on the floor` : `${due.length} things under 24 hours are on the floor`
  return withToast(floor, title, "Bursley 3 can claim them.")
}

function applyScript(ctx: Ctx, floor: Floor, step: ScriptStep, now: bigint): Floor {
  if (step.type === "note") {
    const next = bump(floor)
    ctx.db.roomNote.insert({ id: next.id, atMs: now, author: step.author, text: step.text })
    return {
      ...next.floor,
      lastScriptAtMs: now,
      scriptIndex: floor.scriptIndex + 1,
      toastId: next.id,
      toastTitle: `${step.author} in the Bursley room`,
      toastBody: step.text,
    }
  }
  const next = bump(floor)
  ctx.db.rescuePost.insert({
    id: next.id,
    ingredientId: undefined,
    name: step.name,
    quantityLabel: step.quantityLabel,
    grams: step.grams,
    category: step.category,
    priceUsd: step.priceUsd,
    expiresAtMs: now + BigInt(Math.round(step.hours)) * HOUR,
    poster: step.poster,
    postedAtMs: now,
    note: step.note,
    safety: step.safety,
    claimedBy: undefined,
    claimedAtMs: undefined,
  })
  return {
    ...next.floor,
    lastScriptAtMs: now,
    scriptIndex: floor.scriptIndex + 1,
    toastId: next.id,
    toastTitle: `${step.poster} put ${step.name.toLowerCase()} on the floor`,
    toastBody: step.note,
  }
}

function clearRoom(ctx: Ctx) {
  for (const row of [...ctx.db.ingredient.iter()]) ctx.db.ingredient.id.delete(row.id)
  for (const row of [...ctx.db.rescuePost.iter()]) ctx.db.rescuePost.id.delete(row.id)
  for (const row of [...ctx.db.roomNote.iter()]) ctx.db.roomNote.id.delete(row.id)
  for (const row of [...ctx.db.wasteEvent.iter()]) ctx.db.wasteEvent.id.delete(row.id)
  for (const row of [...ctx.db.recipeRun.iter()]) ctx.db.recipeRun.id.delete(row.id)
  for (const row of [...ctx.db.floor.iter()]) ctx.db.floor.id.delete(row.id)
}

function seedRoom(ctx: Ctx, announceReset: boolean) {
  const now = nowMs(ctx)
  const addedAt = now - 26n * HOUR
  for (const item of OPENING_INGREDIENTS) {
    ctx.db.ingredient.insert({
      id: item.id,
      name: item.name,
      quantityLabel: item.quantityLabel,
      grams: item.grams,
      category: item.category,
      priceUsd: item.priceUsd,
      expiresAtMs: now + BigInt(item.hours) * HOUR,
      addedAtMs: addedAt,
      source: "fridge",
      state: "stocked",
      note: item.note,
      safety: item.safety,
      fromName: undefined,
      eventId: undefined,
    })
  }
  for (const rescue of OPENING_RESCUES) {
    ctx.db.rescuePost.insert({
      id: rescue.id,
      ingredientId: undefined,
      name: rescue.name,
      quantityLabel: rescue.quantityLabel,
      grams: rescue.grams,
      category: rescue.category,
      priceUsd: rescue.priceUsd,
      expiresAtMs: now + BigInt(rescue.hours) * HOUR,
      poster: rescue.poster,
      postedAtMs: minutesAgo(now, rescue.minutesAgo),
      note: rescue.note,
      safety: rescue.safety,
      claimedBy: undefined,
      claimedAtMs: undefined,
    })
  }
  for (const note of OPENING_NOTES) {
    ctx.db.roomNote.insert({
      id: note.id,
      atMs: minutesAgo(now, note.minutesAgo),
      author: note.author,
      text: note.text,
    })
  }
  for (const event of historyEvents(now)) insertEvent(ctx, event)

  let floor: Floor = {
    id: ROOM,
    hosting: false,
    scriptIndex: 0,
    lastScriptAtMs: now - 10_000n,
    nextId: 1,
    toastId: undefined,
    toastTitle: undefined,
    toastBody: undefined,
  }
  floor = publishUrgent(ctx, floor, now, true)
  if (announceReset) {
    floor = withToast(floor, "Kitchen reset", "Shelf, floor, and the chart are back to the opening scene.")
  }
  ctx.db.floor.insert(floor)
}

function commit(ctx: Ctx, floor: Floor, next: Floor) {
  if (next !== floor) ctx.db.floor.id.update(next)
}

function requireFloor(ctx: Ctx) {
  const floor = ctx.db.floor.id.find(ROOM)
  if (!floor) throw new SenderError("The Bursley room is not ready yet.")
  return floor
}

export const init = spacetimedb.init((ctx) => {
  if (ctx.db.floor.id.find(ROOM)) return
  seedRoom(ctx, false)
})

export const keepAlive = spacetimedb.reducer((ctx) => {
  if (!ctx.db.floor.id.find(ROOM)) {
    seedRoom(ctx, false)
    return
  }
  const now = nowMs(ctx)
  let soonest: bigint | null = null
  for (const item of ctx.db.ingredient.iter()) {
    if (item.state !== "stocked" && item.state !== "offered") continue
    if (soonest === null || item.expiresAtMs < soonest) soonest = item.expiresAtMs
  }
  for (const rescue of ctx.db.rescuePost.iter()) {
    if (rescue.claimedBy) continue
    if (soonest === null || rescue.expiresAtMs < soonest) soonest = rescue.expiresAtMs
  }
  if (soonest === null || soonest > now + 20n * 60_000n) return
  const shift = now + 6n * HOUR - soonest
  for (const item of [...ctx.db.ingredient.iter()]) {
    if (item.state === "stocked" || item.state === "offered") {
      ctx.db.ingredient.id.update({ ...item, expiresAtMs: item.expiresAtMs + shift })
    }
  }
  for (const rescue of [...ctx.db.rescuePost.iter()]) {
    if (!rescue.claimedBy) {
      ctx.db.rescuePost.id.update({ ...rescue, expiresAtMs: rescue.expiresAtMs + shift })
    }
  }
})

export const tick = spacetimedb.reducer((ctx) => {
  const floor = ctx.db.floor.id.find(ROOM)
  if (!floor) return
  const now = nowMs(ctx)
  let next = publishUrgent(ctx, floor, now, false)
  if (next.scriptIndex < SCRIPT.length && now - next.lastScriptAtMs >= SCRIPT_GAP) {
    next = applyScript(ctx, next, SCRIPT[next.scriptIndex], now)
  }
  commit(ctx, floor, next)
})

export const offer = spacetimedb.reducer({ id: t.string() }, (ctx, { id }) => {
  const floor = requireFloor(ctx)
  const item = ctx.db.ingredient.id.find(id)
  if (!item || item.state !== "stocked") return
  for (const rescue of ctx.db.rescuePost.iter()) {
    if (rescue.ingredientId === id && !rescue.claimedBy) return
  }
  const now = nowMs(ctx)
  ctx.db.ingredient.id.update({ ...item, state: "offered" })
  ctx.db.rescuePost.insert({
    id: `post-${item.id}`,
    ingredientId: item.id,
    name: item.name,
    quantityLabel: item.quantityLabel,
    grams: item.grams,
    category: item.category,
    priceUsd: item.priceUsd,
    expiresAtMs: item.expiresAtMs,
    poster: YOU,
    postedAtMs: now,
    note: "Take it. I won't finish it.",
    safety: item.safety,
    claimedBy: undefined,
    claimedAtMs: undefined,
  })
  commit(ctx, floor, withToast(floor, `${item.name} is on the floor`, "Anyone in the Bursley room can claim it."))
})

export const claim = spacetimedb.reducer({ id: t.string(), claimer: t.string() }, (ctx, { id, claimer }) => {
  const floor = requireFloor(ctx)
  const post = ctx.db.rescuePost.id.find(id)
  const who = claimer.trim().slice(0, 40) || YOU
  if (!post || post.claimedBy || post.poster === who) return
  const now = nowMs(ctx)
  const eventId = `ev-${post.id}-rescued`
  const event = outcome(post, "rescued", eventId, now)
  insertEvent(ctx, event)
  ctx.db.ingredient.insert({
    id: `claimed-${post.id}`,
    name: post.name,
    quantityLabel: post.quantityLabel,
    grams: post.grams,
    category: post.category,
    priceUsd: post.priceUsd,
    expiresAtMs: post.expiresAtMs,
    addedAtMs: now,
    source: "rescue",
    state: "stocked",
    note: post.note,
    safety: post.safety,
    fromName: post.poster,
    eventId,
  })
  ctx.db.rescuePost.id.update({ ...post, claimedBy: who, claimedAtMs: now })
  commit(
    ctx,
    floor,
    withToast(floor, `Claimed ${post.name.toLowerCase()}`, "It's on your shelf. Cook it before the clock runs out."),
  )
})

export const host = spacetimedb.reducer({ author: t.string() }, (ctx, { author }) => {
  const floor = requireFloor(ctx)
  if (floor.hosting) return
  const now = nowMs(ctx)
  const who = author.trim().slice(0, 40) || YOU
  const next = bump(floor)
  const text = "I'm on the skillet at 9:15. Bring anything that won't last, and a plate."
  ctx.db.roomNote.insert({ id: next.id, atMs: now, author: who, text })
  commit(ctx, floor, {
    ...next.floor,
    hosting: true,
    toastId: next.id,
    toastTitle: "You're hosting at 9:15",
    toastBody: "Bursley 3 kitchen. The floor can see it.",
  })
})

export const mark = spacetimedb.reducer({ id: t.string(), kind: t.string() }, (ctx, { id, kind }) => {
  const floor = requireFloor(ctx)
  if (kind !== "cooked" && kind !== "wasted") throw new SenderError("Mark it cooked or wasted.")
  const item = ctx.db.ingredient.id.find(id)
  if (!item || item.state === "cooked" || item.state === "wasted") return
  const now = nowMs(ctx)
  if (item.source === "rescue" && item.eventId && kind === "wasted") {
    const flipped = outcome(item, "wasted", item.eventId, now)
    const existing = ctx.db.wasteEvent.id.find(item.eventId)
    if (existing) ctx.db.wasteEvent.id.update({ ...flipped, id: existing.id })
    else insertEvent(ctx, flipped)
  } else if (!(item.source === "rescue" && kind === "cooked")) {
    insertEvent(ctx, outcome(item, kind, `ev-${item.id}-${kind}`, now))
  }
  ctx.db.ingredient.id.update({ ...item, state: kind })
  for (const rescue of [...ctx.db.rescuePost.iter()]) {
    if (rescue.ingredientId === id && !rescue.claimedBy) {
      ctx.db.rescuePost.id.update({ ...rescue, claimedBy: YOU, claimedAtMs: now })
    }
  }
  commit(
    ctx,
    floor,
    withToast(
      floor,
      kind === "cooked" ? `${item.name} logged as eaten` : `${item.name} logged as tossed`,
      kind === "cooked" ? "Carbon, water, and money move on the chart." : "The loss is on the chart.",
    ),
  )
})

export const logMeal = spacetimedb.reducer(
  { ids: t.string(), recipeId: t.string(), recipeName: t.string() },
  (ctx, { ids, recipeId, recipeName }) => {
    const floor = requireFloor(ctx)
    const wanted = new Set(ids.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 20))
    if (wanted.size === 0) return
    const now = nowMs(ctx)
    for (const item of [...ctx.db.ingredient.iter()]) {
      if (!wanted.has(item.id) || item.state === "cooked" || item.state === "wasted") continue
      if (item.source !== "rescue") insertEvent(ctx, outcome(item, "cooked", `ev-${item.id}-cooked`, now))
      ctx.db.ingredient.id.update({ ...item, state: "cooked" })
    }
    for (const rescue of [...ctx.db.rescuePost.iter()]) {
      if (rescue.ingredientId && wanted.has(rescue.ingredientId) && !rescue.claimedBy) {
        ctx.db.rescuePost.id.update({ ...rescue, claimedBy: YOU, claimedAtMs: now })
      }
    }
    const recipe = recipeId.trim().slice(0, 80)
    const name = recipeName.trim().slice(0, 120)
    let next = floor
    if (recipe && name) {
      const bumped = bump(floor)
      next = bumped.floor
      ctx.db.recipeRun.insert({
        id: bumped.id,
        atMs: now,
        recipeId: recipe,
        recipeName: name,
        ingredientIds: [...wanted].join(","),
      })
    }
    commit(ctx, floor, withToast(next, "Meal logged", "The chart picked up what you ate."))
  },
)

export const addIngredients = spacetimedb.reducer({ payload: t.string() }, (ctx, { payload }) => {
  const floor = requireFloor(ctx)
  const drafts = cleanDrafts(payload)
  if (drafts.length === 0) return
  const now = nowMs(ctx)
  let next = floor
  const posted: string[] = []
  for (const draft of drafts) {
    const allocated = bump(next)
    next = allocated.floor
    const id = `ing-${allocated.id}`
    const eventId = `ev-${allocated.id}-logged`
    ctx.db.ingredient.insert({
      id,
      name: draft.name,
      quantityLabel: draft.quantityLabel,
      grams: draft.grams,
      category: draft.category,
      priceUsd: draft.priceUsd,
      expiresAtMs: now + BigInt(Math.round(draft.hoursToExpire)) * HOUR,
      addedAtMs: now,
      source: draft.source,
      state: "stocked",
      note: draft.note,
      safety: draft.safety,
      fromName: undefined,
      eventId: undefined,
    })
    insertEvent(ctx, {
      id: eventId,
      atMs: now,
      kind: "logged",
      name: draft.name,
      grams: draft.grams,
      category: draft.category,
      priceUsd: draft.priceUsd,
      co2eKg: 0,
      methaneEmittedKg: 0,
      embodiedCo2eKg: 0,
      waterL: 0,
    })
    posted.push(draft.name)
  }
  next = publishUrgent(ctx, next, now, true)
  const broadcast = [...ctx.db.rescuePost.iter()].filter((rescue) => rescue.postedAtMs === now && rescue.poster === YOU).length
  const title = posted.length === 1 ? `${posted[0]} is logged` : `${posted.length} things logged`
  const body =
    broadcast > 0
      ? `${broadcast === 1 ? "One is" : `${broadcast} are`} under 24 hours, so the floor can claim ${broadcast === 1 ? "it" : "them"}.`
      : "Each clock is the shelf-life estimate."
  commit(ctx, floor, withToast(next, title, body))
})

export const reset = spacetimedb.reducer((ctx) => {
  clearRoom(ctx)
  seedRoom(ctx, true)
})

type Draft = {
  name: string
  quantityLabel: string
  grams: number
  category: string
  priceUsd: number
  hoursToExpire: number
  source: string
  note?: string
  safety?: string
}

function cleanDrafts(payload: string): Draft[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new SenderError("That ingredient list could not be read.")
  }
  if (!Array.isArray(parsed)) throw new SenderError("That ingredient list could not be read.")
  const drafts: Draft[] = []
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue
    const draft = row as Record<string, unknown>
    if (typeof draft.name !== "string" || draft.name.trim().length < 2) continue
    const grams = Number(draft.grams)
    const hours = Number(draft.hoursToExpire)
    const price = Number(draft.priceUsd)
    const category = typeof draft.category === "string" && CATEGORIES.has(draft.category) ? draft.category : "other"
    const source = typeof draft.source === "string" && SOURCES.has(draft.source) ? draft.source : "manual"
    drafts.push({
      name: draft.name.trim().slice(0, 80),
      quantityLabel: typeof draft.quantityLabel === "string" && draft.quantityLabel.trim() ? draft.quantityLabel.trim().slice(0, 40) : "1",
      grams: Number.isFinite(grams) && grams > 0 ? Math.min(grams, 20_000) : 100,
      category,
      priceUsd: Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0,
      hoursToExpire: Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24 * 60) : 72,
      source,
      note: typeof draft.note === "string" && draft.note ? draft.note.slice(0, 200) : undefined,
      safety: typeof draft.safety === "string" && draft.safety ? draft.safety.slice(0, 200) : undefined,
    })
    if (drafts.length >= 40) break
  }
  return drafts
}
