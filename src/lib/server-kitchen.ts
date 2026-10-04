import {
  SCRIPT,
  SCRIPT_GAP_MS,
  YOU,
  applyScript,
  createInitial,
  isKitchenState,
  keepDemoAlive,
  loggedEvent,
  materialize,
  outcomeEvent,
  publishUrgent,
  uid,
  type Ingredient,
  type IngredientDraft,
  type KitchenState,
} from "@/lib/kitchen"
import { loadSnapshot, saveRoom } from "@/lib/db"
import { spacetimeConfig } from "@/lib/env"

type RoomSlot = {
  state: KitchenState | null
  listeners: Set<(state: KitchenState) => void>
  chain: Promise<void>
  timer: ReturnType<typeof setInterval> | null
  boot: Promise<void> | null
}

const globalRoom = globalThis as typeof globalThis & { __ecobiteRoom?: RoomSlot }

function slot(): RoomSlot {
  if (!globalRoom.__ecobiteRoom) {
    globalRoom.__ecobiteRoom = {
      state: null,
      listeners: new Set(),
      chain: Promise.resolve(),
      timer: null,
      boot: null,
    }
  }
  return globalRoom.__ecobiteRoom
}

export type KitchenAction =
  | { type: "add"; drafts: IngredientDraft[] }
  | { type: "offer"; id: string }
  | { type: "claim"; id: string }
  | { type: "mark"; id: string; kind: "cooked" | "wasted" }
  | { type: "logMeal"; ids: string[]; recipeId?: string; recipeName?: string }
  | { type: "host" }
  | { type: "reset" }
  | { type: "tick" }

const CATEGORIES = new Set(["produce", "dairy", "protein", "grain", "other"])
const SOURCES = new Set(["fridge", "receipt", "rescue", "manual"])

function toast(state: KitchenState, title: string, body?: string): KitchenState {
  return { ...state, toast: { id: uid("toast"), title, body } }
}

function cleanDrafts(value: unknown): IngredientDraft[] {
  if (!Array.isArray(value)) return []
  const drafts: IngredientDraft[] = []
  for (const row of value) {
    if (!row || typeof row !== "object") continue
    const draft = row as IngredientDraft
    if (typeof draft.name !== "string" || draft.name.trim().length < 2) continue
    const grams = Number(draft.grams)
    const hours = Number(draft.hoursToExpire)
    const price = Number(draft.priceUsd)
    drafts.push({
      name: draft.name.trim().slice(0, 80),
      quantityLabel:
        typeof draft.quantityLabel === "string" && draft.quantityLabel.trim()
          ? draft.quantityLabel.trim().slice(0, 40)
          : "1",
      grams: Number.isFinite(grams) && grams > 0 ? Math.min(grams, 20_000) : 100,
      category: CATEGORIES.has(draft.category) ? draft.category : "other",
      priceUsd: Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0,
      hoursToExpire: Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24 * 60) : 72,
      source: SOURCES.has(draft.source) ? draft.source : "manual",
      note: typeof draft.note === "string" && draft.note ? draft.note.slice(0, 200) : undefined,
      safety: typeof draft.safety === "string" && draft.safety ? draft.safety.slice(0, 200) : undefined,
    })
    if (drafts.length >= 40) break
  }
  return drafts
}

function addDrafts(current: KitchenState, drafts: IngredientDraft[]): KitchenState {
  if (drafts.length === 0) return current
  const items = drafts.map((draft) => materialize(draft))
  const logged = publishUrgent(
    {
      ...current,
      ingredients: [...items, ...current.ingredients],
      events: [...items.map(loggedEvent), ...current.events],
    },
    Date.now(),
    { silent: true },
  )
  const broadcast = items.filter((item) => logged.rescues.some((rescue) => rescue.ingredientId === item.id)).length
  return toast(
    logged,
    items.length === 1 ? `${items[0].name} is logged` : `${items.length} things logged`,
    broadcast > 0
      ? `${broadcast === 1 ? "One is" : `${broadcast} are`} under 24 hours, so the floor can claim ${broadcast === 1 ? "it" : "them"}.`
      : "Each clock is the shelf-life estimate.",
  )
}

function offer(current: KitchenState, id: string): KitchenState {
  const item = current.ingredients.find((row) => row.id === id)
  if (!item || item.state !== "stocked") return current
  if (current.rescues.some((rescue) => rescue.ingredientId === id && !rescue.claimedBy)) return current
  return toast(
    {
      ...current,
      ingredients: current.ingredients.map((row) => (row.id === id ? { ...row, state: "offered" as const } : row)),
      rescues: [
        {
          id: `post-${item.id}`,
          ingredientId: item.id,
          name: item.name,
          quantityLabel: item.quantityLabel,
          grams: item.grams,
          category: item.category,
          priceUsd: item.priceUsd,
          expiresAt: item.expiresAt,
          poster: YOU.name,
          at: Date.now(),
          note: "Take it. I won't finish it.",
          safety: item.safety,
        },
        ...current.rescues,
      ],
    },
    `${item.name} is on the floor`,
    "Anyone in the Bursley room can claim it.",
  )
}

function claim(current: KitchenState, id: string): KitchenState {
  const post = current.rescues.find((row) => row.id === id)
  if (!post || post.claimedBy || post.poster === YOU.name) return current
  const event = outcomeEvent(
    {
      id: "tmp",
      name: post.name,
      quantityLabel: post.quantityLabel,
      grams: post.grams,
      category: post.category,
      priceUsd: post.priceUsd,
      expiresAt: post.expiresAt,
      addedAt: Date.now(),
      source: "rescue",
      state: "stocked",
      safety: post.safety,
      from: post.poster,
    },
    "rescued",
  )
  const item: Ingredient = {
    id: `claimed-${post.id}`,
    name: post.name,
    quantityLabel: post.quantityLabel,
    grams: post.grams,
    category: post.category,
    priceUsd: post.priceUsd,
    expiresAt: post.expiresAt,
    addedAt: Date.now(),
    source: "rescue",
    state: "stocked",
    safety: post.safety,
    from: post.poster,
    note: post.note,
    eventId: event.id,
  }
  return toast(
    {
      ...current,
      ingredients: [item, ...current.ingredients],
      rescues: current.rescues.map((row) =>
        row.id === id ? { ...row, claimedBy: YOU.name, claimedAt: Date.now() } : row,
      ),
      events: [event, ...current.events],
    },
    `Claimed ${post.name.toLowerCase()}`,
    "It's on your shelf. Cook it before the clock runs out.",
  )
}

function mark(current: KitchenState, id: string, kind: "cooked" | "wasted"): KitchenState {
  const item = current.ingredients.find((row) => row.id === id)
  if (!item || item.state === "cooked" || item.state === "wasted") return current
  let events = current.events
  if (item.source === "rescue" && item.eventId && kind === "wasted") {
    const flipped = outcomeEvent(item, "wasted")
    events = events.map((event) => (event.id === item.eventId ? { ...flipped, id: event.id } : event))
  } else if (!(item.source === "rescue" && kind === "cooked")) {
    events = [outcomeEvent(item, kind), ...events]
  }
  return toast(
    {
      ...current,
      events,
      ingredients: current.ingredients.map((row) => (row.id === id ? { ...row, state: kind } : row)),
      rescues: current.rescues.map((row) =>
        row.ingredientId === id && !row.claimedBy ? { ...row, claimedBy: YOU.name, claimedAt: Date.now() } : row,
      ),
    },
    kind === "cooked" ? `${item.name} logged as eaten` : `${item.name} logged as tossed`,
    kind === "cooked" ? "Carbon, water, and money move on the chart." : "The loss is on the chart.",
  )
}

function logMeal(current: KitchenState, ids: string[], recipeId?: string, recipeName?: string): KitchenState {
  let events = current.events
  const ingredients = current.ingredients.map((item) => {
    if (!ids.includes(item.id) || item.state === "cooked" || item.state === "wasted") return item
    if (item.source !== "rescue") events = [outcomeEvent(item, "cooked"), ...events]
    return { ...item, state: "cooked" as const }
  })
  const meals = current.meals ?? []
  const nextMeals =
    recipeId && recipeName
      ? [{ id: uid("meal"), at: Date.now(), recipeId, recipeName, ingredientIds: ids }, ...meals]
      : meals
  return {
    ...current,
    ingredients,
    events,
    meals: nextMeals,
    rescues: current.rescues.map((row) =>
      row.ingredientId && ids.includes(row.ingredientId) && !row.claimedBy
        ? { ...row, claimedBy: YOU.name, claimedAt: Date.now() }
        : row,
    ),
    toast: { id: uid("toast"), title: "Meal logged", body: "The chart picked up what you ate." },
  }
}

function hostMeal(current: KitchenState): KitchenState {
  if (current.hosting) return current
  return toast(
    {
      ...current,
      hosting: true,
      notes: [
        {
          id: uid("host"),
          at: Date.now(),
          author: YOU.name,
          text: "I'm on the skillet at 9:15. Bring anything that won't last, and a plate.",
        },
        ...current.notes,
      ],
    },
    "You're hosting at 9:15",
    "Bursley 3 kitchen. The floor can see it.",
  )
}

function tick(current: KitchenState): KitchenState {
  const now = Date.now()
  const next = publishUrgent(current, now)
  if (next.scriptIndex >= SCRIPT.length) return next
  if (now - next.lastScriptAt < SCRIPT_GAP_MS) return next
  return applyScript(next, SCRIPT[next.scriptIndex], now)
}

function reduce(current: KitchenState, action: KitchenAction): KitchenState {
  switch (action.type) {
    case "add":
      return addDrafts(current, action.drafts)
    case "offer":
      return offer(current, action.id)
    case "claim":
      return claim(current, action.id)
    case "mark":
      return mark(current, action.id, action.kind)
    case "logMeal":
      return logMeal(current, action.ids, action.recipeId, action.recipeName)
    case "host":
      return hostMeal(current)
    case "reset":
      return toast(createInitial(), "Kitchen reset", "Shelf, floor, and the chart are back to the opening scene.")
    case "tick":
      return tick(current)
    default:
      return current
  }
}

function broadcast(state: KitchenState) {
  for (const listener of slot().listeners) listener(state)
}

async function persist(state: KitchenState) {
  const quiet = { ...state, toast: null }
  await saveRoom(quiet)
  slot().state = quiet
}

export function currentState() {
  const state = slot().state
  if (!state) throw new Error("Room is not ready")
  return state
}

export function subscribeRoom(listener: (state: KitchenState) => void) {
  slot().listeners.add(listener)
  return () => slot().listeners.delete(listener)
}

export function readyRoom() {
  const room = slot()
  if (!room.boot) {
    room.boot = boot().catch((error) => {
      room.boot = null
      throw error
    })
  }
  return room.boot
}

async function boot() {
  const saved = await loadSnapshot()
  let state = saved && isKitchenState(saved) ? keepDemoAlive({ ...saved, toast: null }) : createInitial()
  state = publishUrgent(state, Date.now(), { silent: true })
  const quiet = { ...state, toast: null }
  slot().state = quiet
  if (spacetimeConfig()) return
  await saveRoom(quiet)
  if (!slot().timer) {
    slot().timer = setInterval(() => {
      void dispatch({ type: "tick" })
    }, 3000)
  }
}

export function dispatch(action: KitchenAction) {
  const room = slot()
  const run = room.chain.then(async () => {
    await readyRoom()
    const current = currentState()
    const next = reduce(current, action)
    if (next === current) return current
    const shown = next
    await persist(shown)
    broadcast(shown)
    return shown
  })
  room.chain = run.then(
    () => undefined,
    (error) => {
      console.error("kitchen dispatch failed", error)
    },
  )
  return run
}

export function parseAction(value: unknown): KitchenAction | null {
  if (!value || typeof value !== "object") return null
  const action = value as KitchenAction
  if (action.type === "add") return { type: "add", drafts: cleanDrafts(action.drafts) }
  if (action.type === "offer" && typeof action.id === "string") return { type: "offer", id: action.id }
  if (action.type === "claim" && typeof action.id === "string") return { type: "claim", id: action.id }
  if (action.type === "mark" && typeof action.id === "string" && (action.kind === "cooked" || action.kind === "wasted")) {
    return { type: "mark", id: action.id, kind: action.kind }
  }
  if (action.type === "logMeal" && Array.isArray(action.ids)) {
    const recipeId = typeof action.recipeId === "string" ? action.recipeId.slice(0, 80) : undefined
    const recipeName = typeof action.recipeName === "string" ? action.recipeName.slice(0, 120) : undefined
    return {
      type: "logMeal",
      ids: action.ids.filter((id) => typeof id === "string").slice(0, 20),
      recipeId,
      recipeName,
    }
  }
  if (action.type === "host" || action.type === "reset") return { type: action.type }
  return null
}
