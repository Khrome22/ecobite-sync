"use client"

import { useEffect, useState } from "react"
import { remaining } from "@/lib/kitchen"
import { cn } from "@/lib/utils"

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function Countdown({
  expiresAt,
  now,
  featured = false,
}: {
  expiresAt: number
  now: number
  featured?: boolean
}) {
  const left = remaining(expiresAt, now)
  return (
    <div className="text-right">
      <p
        className={cn(
          "font-mono leading-none tabular-nums",
          featured ? "text-2xl" : "text-sm",
          left.tone === "critical" || left.tone === "over" ? "text-coral" : left.tone === "soon" ? "text-amber" : "text-moss",
        )}
        aria-label={left.past ? "Past due" : `${left.short} remaining`}
      >
        {left.past ? "00:00:00" : left.clock}
      </p>
      <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">
        {left.tone === "over" ? "Past due" : left.tone === "critical" ? "Use tonight" : left.short}
      </p>
    </div>
  )
}
