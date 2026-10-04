"use client"

export type SpacetimeMode = "off" | "pending" | "live" | "booth"

let mode: SpacetimeMode = "off"
const listeners = new Set<() => void>()

export function setSpacetimeMode(next: SpacetimeMode) {
  if (mode === next) return
  mode = next
  for (const listener of listeners) listener()
}

export function subscribeSpacetimeMode(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function spacetimeMode() {
  return mode
}
