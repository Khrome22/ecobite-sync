"use client"

import { toast } from "sonner"
import { STATE_VERSION, YOU, type Category, type Ingredient, type KitchenState, type MealLog, type Rescue } from "@/lib/kitchen"
import { DbConnection } from "@/module_bindings"
import type { Floor, Ingredient as IngredientRow, RecipeRun, RescuePost, RoomNote, WasteEvent } from "@/module_bindings/types"

const TOKEN_KEY = "ecobite-spacetime-token"

type RoomHandlers = {
  uri: string
  database: string
  onState: (state: KitchenState) => void
  onPersisted: () => void
  onLive: () => void
  onFallback: () => void
  onSend: (send: (body: unknown) => void) => void
}

function ms(value: bigint) {
  return Number(value)
}

function text(value: string | undefined) {
  return value || undefined
}

function category(value: string): Category {
  if (value === "produce" || value === "dairy" || value === "protein" || value === "grain" || value === "other") return value
  return "other"
}

function source(value: string): Ingredient["source"] {
  if (value === "fridge" || value === "receipt" || value === "rescue" || value === "manual") return value
  return "manual"
}

function itemState(value: string): Ingredient["state"] {
  if (value === "stocked" || value === "offered" || value === "cooked" || value === "wasted") return value
  return "stocked"
}

function eventKind(value: string): "logged" | "cooked" | "rescued" | "wasted" {
  if (value === "logged" || value === "cooked" || value === "rescued" || value === "wasted") return value
  return "logged"
}

function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    quantityLabel: row.quantityLabel,
    grams: row.grams,
    category: category(row.category),
    priceUsd: row.priceUsd,
    expiresAt: ms(row.expiresAtMs),
    addedAt: ms(row.addedAtMs),
    source: source(row.source),
    state: itemState(row.state),
    note: text(row.note),
    safety: text(row.safety),
    from: text(row.fromName),
    eventId: text(row.eventId),
  }
}

function toRescue(row: RescuePost): Rescue {
  return {
    id: row.id,
    ingredientId: text(row.ingredientId),
    name: row.name,
    quantityLabel: row.quantityLabel,
    grams: row.grams,
    category: category(row.category),
    priceUsd: row.priceUsd,
    expiresAt: ms(row.expiresAtMs),
    poster: row.poster,
    at: ms(row.postedAtMs),
    note: row.note,
    safety: text(row.safety),
    claimedBy: text(row.claimedBy),
    claimedAt: row.claimedAtMs === undefined ? undefined : ms(row.claimedAtMs),
  }
}

function toMeal(row: RecipeRun): MealLog {
  return {
    id: row.id,
    at: ms(row.atMs),
    recipeId: row.recipeId,
    recipeName: row.recipeName,
    ingredientIds: row.ingredientIds.split(",").filter(Boolean),
  }
}

function assemble(conn: DbConnection): KitchenState | null {
  const floor = [...conn.db.floor.iter()][0] as Floor | undefined
  if (!floor) return null
  const events = [...conn.db.wasteEvent.iter()].map((row: WasteEvent) => ({
    id: row.id,
    at: ms(row.atMs),
    kind: eventKind(row.kind),
    name: row.name,
    grams: row.grams,
    category: category(row.category),
    priceUsd: row.priceUsd,
    co2eKg: row.co2EKg,
    methaneEmittedKg: row.methaneEmittedKg,
    embodiedCo2eKg: row.embodiedCo2EKg,
    waterL: row.waterL,
  }))
  events.sort((a, b) => b.at - a.at)
  const notes = [...conn.db.roomNote.iter()].map((row: RoomNote) => ({
    id: row.id,
    at: ms(row.atMs),
    author: row.author,
    text: row.text,
  }))
  return {
    version: STATE_VERSION,
    ingredients: [...conn.db.ingredient.iter()].map(toIngredient),
    rescues: [...conn.db.rescuePost.iter()].map(toRescue),
    notes,
    events,
    hosting: floor.hosting,
    scriptIndex: floor.scriptIndex,
    lastScriptAt: ms(floor.lastScriptAtMs),
    toast: floor.toastId
      ? { id: floor.toastId, title: floor.toastTitle ?? "Bursley", body: text(floor.toastBody) }
      : null,
    meals: [...conn.db.recipeRun.iter()].map(toMeal).sort((a, b) => b.at - a.at),
  }
}

function call(promise: Promise<void>) {
  void promise.catch((error: unknown) => {
    console.error(error)
    toast.error("The floor didn't take that")
  })
}

function sendAction(conn: DbConnection, body: unknown) {
  if (!body || typeof body !== "object") return
  const action = body as {
    type?: string
    id?: string
    kind?: string
    drafts?: unknown
    ids?: unknown
    recipeId?: string
    recipeName?: string
  }
  if (action.type === "add") {
    call(conn.reducers.addIngredients({ payload: JSON.stringify(action.drafts ?? []) }))
    return
  }
  if (action.type === "offer" && action.id) {
    call(conn.reducers.offer({ id: action.id }))
    return
  }
  if (action.type === "claim" && action.id) {
    call(conn.reducers.claim({ id: action.id, claimer: YOU.name }))
    return
  }
  if (action.type === "mark" && action.id && (action.kind === "cooked" || action.kind === "wasted")) {
    call(conn.reducers.mark({ id: action.id, kind: action.kind }))
    return
  }
  if (action.type === "logMeal" && Array.isArray(action.ids)) {
    const ids = action.ids.filter((id): id is string => typeof id === "string")
    call(
      conn.reducers.logMeal({
        ids: ids.join(","),
        recipeId: action.recipeId ?? "",
        recipeName: action.recipeName ?? "",
      }),
    )
    return
  }
  if (action.type === "host") {
    call(conn.reducers.host({ author: YOU.name }))
    return
  }
  if (action.type === "reset") call(conn.reducers.reset({}))
}

export function startSpacetimeRoom(handlers: RoomHandlers) {
  let settled = false
  let timer: ReturnType<typeof setInterval> | undefined
  let syncTimer: ReturnType<typeof setTimeout> | undefined
  const giveUp = window.setTimeout(() => {
    if (settled) return
    settled = true
    handlers.onFallback()
  }, 8000)

  const stored = window.localStorage.getItem(TOKEN_KEY) ?? undefined
  const conn = DbConnection.builder()
    .withUri(handlers.uri)
    .withDatabaseName(handlers.database)
    .withToken(stored)
    .onConnect((connection, _identity, token) => {
      if (token) window.localStorage.setItem(TOKEN_KEY, token)
      settled = true
      window.clearTimeout(giveUp)
      handlers.onLive()
      handlers.onSend((body) => sendAction(connection, body))
      const push = () => {
        const next = assemble(connection)
        if (!next) return
        handlers.onState(next)
        if (syncTimer) clearTimeout(syncTimer)
        syncTimer = setTimeout(() => {
          void fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...next, toast: null }),
          })
            .then((response) => {
              if (response.ok) handlers.onPersisted()
            })
            .catch(() => {
              /* the room is still live; Neon and Tiger catch up on the next change */
            })
        }, 400)
      }
      for (const table of [
        connection.db.floor,
        connection.db.ingredient,
        connection.db.rescuePost,
        connection.db.roomNote,
        connection.db.wasteEvent,
        connection.db.recipeRun,
      ]) {
        table.onInsert(push)
        table.onUpdate(push)
        table.onDelete(push)
      }
      connection.subscriptionBuilder().onApplied(() => {
        push()
        call(connection.reducers.keepAlive({}))
      }).subscribeToAllTables()
      timer = setInterval(() => {
        call(connection.reducers.tick({}))
      }, 3000)
    })
    .onConnectError(() => {
      if (settled) return
      settled = true
      window.clearTimeout(giveUp)
      handlers.onFallback()
    })
    .build()

  return () => {
    if (timer) clearInterval(timer)
    if (syncTimer) clearTimeout(syncTimer)
    window.clearTimeout(giveUp)
    conn.disconnect()
  }
}
