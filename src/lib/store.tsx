"use client"

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"
import type { IngredientDraft, KitchenState } from "@/lib/kitchen"

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
let lastToasted: string | null = null
let source: EventSource | null = null

function emit() {
  listeners.forEach((listener) => listener())
}

function apply(next: KitchenState) {
  snapshot = next
  emit()
}

function ensure() {
  if (source || typeof window === "undefined") return
  void fetch("/api/kitchen")
    .then((response) => response.json())
    .then((data: KitchenState) => apply(data))
    .catch(() => {
      /* the live stream below can still deliver the room */
    })
  source = new EventSource("/api/kitchen/stream")
  source.onmessage = (event) => {
    apply(JSON.parse(event.data) as KitchenState)
  }
}

async function send(body: unknown) {
  try {
    const response = await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      toast.error("The floor didn't take that")
      return
    }
    apply((await response.json()) as KitchenState)
  } catch {
    toast.error("The floor didn't take that")
  }
}

function addDrafts(drafts: IngredientDraft[]) {
  void send({ type: "add", drafts })
}

function offer(id: string) {
  void send({ type: "offer", id })
}

function claim(id: string) {
  void send({ type: "claim", id })
}

function mark(id: string, kind: "cooked" | "wasted") {
  void send({ type: "mark", id, kind })
}

function logMeal(ids: string[]) {
  void send({ type: "logMeal", ids })
}

function hostMeal() {
  void send({ type: "host" })
}

function reset() {
  lastToasted = null
  void send({ type: "reset" })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getClientSnapshot() {
  return snapshot
}

const KitchenContext = createContext<KitchenApi | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getClientSnapshot, () => null)

  useEffect(() => {
    ensure()
  }, [])

  useEffect(() => {
    if (!state?.toast || lastToasted === state.toast.id) return
    lastToasted = state.toast.id
    toast(state.toast.title, { description: state.toast.body })
  }, [state])

  const value = useMemo<KitchenApi | null>(() => {
    if (!state) return null
    return { state, addDrafts, offer, claim, mark, logMeal, hostMeal, reset }
  }, [state])

  if (!value) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="font-serif text-3xl">Syncing the Bursley floor…</p>
      </div>
    )
  }

  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
}

export function useKitchen() {
  const ctx = useContext(KitchenContext)
  if (!ctx) throw new Error("useKitchen must be used inside StoreProvider")
  return ctx
}
