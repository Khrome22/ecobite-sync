"use client"

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"
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
  uid,
  type Ingredient,
  type IngredientDraft,
  type KitchenState,
} from "@/lib/kitchen"

const KEY = "ecobite-kitchen-v1"

type KitchenApi = {
  state: KitchenState
  addDrafts: (drafts: IngredientDraft[]) => void
  offer: (id: string) => void
  claim: (id: string) => void
  mark: (id: string, kind: "cooked" | "wasted") => void
  logMeal: (ids: string[]) => void
  hostMeal: () => void
  reset: () => void
}

const listeners = new Set<() => void>()
let snapshot: KitchenState | null = null
let snapshotRaw: string | null | undefined
let lastToasted: string | null = null

function emit() {
  listeners.forEach((listener) => listener())
}

function parseStored(raw: string | null): KitchenState {
  try {
    if (!raw) return createInitial()
    const parsed: unknown = JSON.parse(raw)
    if (!isKitchenState(parsed)) return createInitial()
    return keepDemoAlive({ ...parsed, toast: null })
  } catch {
    return createInitial()
  }
}

function readSnapshot() {
  const raw = localStorage.getItem(KEY)
  if (snapshot && snapshotRaw === raw) return snapshot
  snapshot = parseStored(raw)
  snapshotRaw = raw
  return snapshot
}

function commit(next: KitchenState) {
  const rest = { ...next, toast: null }
  const raw = JSON.stringify(rest)
  snapshot = next
  snapshotRaw = raw
  localStorage.setItem(KEY, raw)
  emit()
}

function update(change: (current: KitchenState) => KitchenState) {
  const current = snapshot ?? readSnapshot()
  const next = change(current)
  if (next === current) return false
  commit(next)
  return true
}

function tickRoom() {
  update((current) => {
    if (current.scriptIndex >= SCRIPT.length) return current
    if (Date.now() - current.lastScriptAt < SCRIPT_GAP_MS) return current
    return applyScript(current, SCRIPT[current.scriptIndex])
  })
}

function addDrafts(drafts: IngredientDraft[]) {
  const items = drafts.map((draft) => materialize(draft))
  update((current) => ({
    ...current,
    ingredients: [...items, ...current.ingredients],
    events: [...items.map(loggedEvent), ...current.events],
  }))
  toast(items.length === 1 ? `${items[0].name} is on the shelf` : `${items.length} things logged`, {
    description: "The clocks started from the shelf life on each one.",
  })
}

function offer(id: string) {
  const ok = update((current) => {
    const item = current.ingredients.find((row) => row.id === id)
    if (!item || item.state !== "stocked") return current
    return {
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
    }
  })
  if (ok) toast("It's on the floor", { description: "Anyone in the Bursley room can claim it." })
}

function claim(id: string) {
  const ok = update((current) => {
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
    return {
      ...current,
      ingredients: [item, ...current.ingredients],
      rescues: current.rescues.map((row) =>
        row.id === id ? { ...row, claimedBy: YOU.name, claimedAt: Date.now() } : row,
      ),
      events: [event, ...current.events],
    }
  })
  if (ok) toast("Claimed", { description: "It's on your shelf. Cook it before the clock runs out." })
}

function mark(id: string, kind: "cooked" | "wasted") {
  const ok = update((current) => {
    const item = current.ingredients.find((row) => row.id === id)
    if (!item || item.state === "cooked" || item.state === "wasted") return current
    let events = current.events
    if (item.source === "rescue" && item.eventId && kind === "wasted") {
      const flipped = outcomeEvent(item, "wasted")
      events = events.map((event) => (event.id === item.eventId ? { ...flipped, id: event.id } : event))
    } else if (!(item.source === "rescue" && kind === "cooked")) {
      events = [outcomeEvent(item, kind), ...events]
    }
    return {
      ...current,
      events,
      ingredients: current.ingredients.map((row) => (row.id === id ? { ...row, state: kind } : row)),
      rescues: current.rescues.map((row) =>
        row.ingredientId === id && !row.claimedBy ? { ...row, claimedBy: YOU.name, claimedAt: Date.now() } : row,
      ),
    }
  })
  if (!ok) return
  toast(kind === "cooked" ? "Logged as eaten" : "Logged as tossed", {
    description: kind === "cooked" ? "Methane avoided, money kept." : "The loss is on the chart. That's the point.",
  })
}

function logMeal(ids: string[]) {
  update((current) => {
    let events = current.events
    const ingredients = current.ingredients.map((item) => {
      if (!ids.includes(item.id) || item.state === "cooked" || item.state === "wasted") return item
      if (item.source !== "rescue") events = [outcomeEvent(item, "cooked"), ...events]
      return { ...item, state: "cooked" as const }
    })
    return {
      ...current,
      ingredients,
      events,
      rescues: current.rescues.map((row) =>
        row.ingredientId && ids.includes(row.ingredientId) && !row.claimedBy
          ? { ...row, claimedBy: YOU.name, claimedAt: Date.now() }
          : row,
      ),
    }
  })
}

function hostMeal() {
  const ok = update((current) => {
    if (current.hosting) return current
    return {
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
    }
  })
  if (ok) toast("You're hosting at 9:15", { description: "Bursley 3 kitchen. The floor can see it." })
}

function reset() {
  lastToasted = null
  commit(createInitial())
  toast("Kitchen reset", { description: "Clocks, floor, and today's bar are back to the opening scene." })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getClientSnapshot() {
  return readSnapshot()
}

const KitchenContext = createContext<KitchenApi | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getClientSnapshot)

  useEffect(() => {
    const id = window.setInterval(tickRoom, 3000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!state?.toast || lastToasted === state.toast.id) return
    lastToasted = state.toast.id
    toast(state.toast.title, { description: state.toast.body })
  }, [state])

  const value = useMemo<KitchenApi>(
    () => ({ state, addDrafts, offer, claim, mark, logMeal, hostMeal, reset }),
    [state],
  )

  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
}

export function useKitchen() {
  const ctx = useContext(KitchenContext)
  if (!ctx) throw new Error("useKitchen must be used inside StoreProvider")
  return ctx
}
