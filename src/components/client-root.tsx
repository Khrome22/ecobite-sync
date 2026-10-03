"use client"

import { useSyncExternalStore } from "react"
import { Providers } from "@/components/providers"

function subscribe() {
  return () => {}
}

function onClient() {
  return true
}

function onServer() {
  return false
}

export function ClientRoot({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(subscribe, onClient, onServer)
  if (!ready) return null
  return <Providers>{children}</Providers>
}
