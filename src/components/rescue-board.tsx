"use client"

import { useSyncExternalStore } from "react"
import { useNow } from "@/components/countdown"
import { Button } from "@/components/ui/button"
import { PRESENCE, YOU, formatWhen, remaining } from "@/lib/kitchen"
import { spacetimeMode, subscribeSpacetimeMode } from "@/lib/live-path"
import { useKitchen } from "@/lib/store"
import { cn } from "@/lib/utils"

export function RescueBoard() {
  const { state, claim, hostMeal } = useKitchen()
  const now = useNow()
  const spacetime = useSyncExternalStore(subscribeSpacetimeMode, spacetimeMode, () => "off") === "live"
  const open = state.rescues
    .filter((rescue) => !rescue.claimedBy)
    .sort((a, b) => a.expiresAt - b.expiresAt)
  const closed = state.rescues
    .filter((rescue) => rescue.claimedBy)
    .sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0))
  const chatter = [...state.notes].sort((a, b) => b.at - a.at)
  const yours = state.ingredients.filter(
    (item) =>
      (item.state === "stocked" || item.state === "offered") &&
      ["tomato", "egg", "feta", "cilantro", "pepper"].some((token) => item.name.toLowerCase().includes(token)),
  )

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.2em] text-moss uppercase">Neighborhood rescue</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">If it dies in your fridge, it can live in someone else&apos;s pan.</h1>
        <p className="mt-3 text-muted-foreground">
          Anything with less than 24 hours left is broadcast into the Bursley floor 3 room. Claim it, or host a skillet, and every open screen updates at the same time. Neighbors post on their own — stay here for a minute.
        </p>
      </header>

      <div className="flex items-center gap-2">
        {PRESENCE.map((name) => (
          <span
            key={name}
            title={name}
            className={cn(
              "grid size-9 place-items-center rounded-full border text-xs",
              name === YOU.name ? "border-lime bg-lime text-primary-foreground" : "border-border bg-card",
            )}
          >
            {name.slice(0, 1)}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="live-dot size-1.5 rounded-full bg-lime" />
          {spacetime ? "Spacetime subscribed" : "Room live"}
        </span>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-lime/25 bg-card p-5">
          <p className="text-xs tracking-[0.18em] text-lime uppercase">Tonight on the floor</p>
          <h2 className="mt-2 font-serif text-3xl">Skillet, 9:15 PM</h2>
          <p className="mt-2 text-sm text-muted-foreground">Bursley 3 kitchen. Plates from the cupboard. Bring whatever won&apos;t last.</p>
          {yours.length > 0 && (
            <p className="mt-3 text-sm">
              You can bring {yours.map((item) => item.name.toLowerCase()).join(", ")}.
            </p>
          )}
          <Button className="mt-4 h-10" disabled={state.hosting} onClick={hostMeal}>
            {state.hosting ? "You're hosting" : "Host it at 9:15"}
          </Button>
        </article>
        <article className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-serif text-2xl">How the room works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {spacetime
              ? "Offer, claim, and host are SpacetimeDB reducers for bursley-floor-3. This screen is subscribed, so a claim on another phone shows up here when the reducer commits."
              : "Offer, claim, and host are the room reducers for bursley-floor-3. This booth hosts that room in the server and pushes it over a live stream, so a claim updates every open screen at once."}
          </p>
        </article>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Grab these</h2>
        {open.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-muted-foreground">
            Nothing is up for grabs. Offer a shelf item, or wait for the next post.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {open.map((rescue) => {
              const left = remaining(rescue.expiresAt, now)
              const mine = rescue.poster === YOU.name
              return (
                <li key={rescue.id} className={cn("rounded-2xl border bg-card p-4", left.tone === "critical" && "border-coral/40")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {rescue.poster} · {formatWhen(rescue.at, now)}
                      </p>
                      <h3 className="mt-1 font-serif text-2xl leading-none">{rescue.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{rescue.quantityLabel}</p>
                    </div>
                    <p className={cn("font-mono text-sm tabular-nums", left.tone === "critical" ? "text-coral" : "text-amber")}>
                      {left.short}
                    </p>
                  </div>
                  <p className="mt-3 text-sm">{rescue.note}</p>
                  {rescue.safety && <p className="mt-2 text-sm text-amber">{rescue.safety}</p>}
                  <div className="mt-4">
                    {mine ? (
                      <p className="text-xs text-muted-foreground">You posted this. It stays on your shelf until you cook it.</p>
                    ) : (
                      <Button className="h-9" onClick={() => claim(rescue.id)}>
                        Claim
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium">Room</h2>
          <ul className="space-y-2">
            {chatter.map((note) => (
              <li key={note.id} className="rounded-2xl border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {note.author} · {formatWhen(note.at, now)}
                </p>
                <p className="mt-1 text-sm">{note.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium">Already claimed</h2>
          {closed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Claims land here so the room has a memory.</p>
          ) : (
            <ul className="space-y-2">
              {closed.map((rescue) => (
                <li key={rescue.id} className="rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground">
                  {rescue.claimedBy} took {rescue.name.toLowerCase()} from {rescue.poster}
                  {rescue.claimedAt ? ` · ${formatWhen(rescue.claimedAt, now)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
