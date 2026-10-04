"use client"

import Link from "next/link"
import { AddIngredientDialog } from "@/components/add-ingredient-dialog"
import { useNow } from "@/components/countdown"
import { IngredientCard } from "@/components/ingredient-card"
import { buttonVariants } from "@/components/ui/button"
import {
  formatKg,
  formatMoney,
  rankRecipes,
  remaining,
  urgentHeadline,
  YOU,
} from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"

export function Kitchen() {
  const { state } = useKitchen()
  const now = useNow()
  const active = state.ingredients.filter((item) => item.state === "stocked" || item.state === "offered")
  const critical = active
    .filter((item) => item.expiresAt - now < 24 * 60 * 60 * 1000)
    .sort((a, b) => a.expiresAt - b.expiresAt)
  const steady = active
    .filter((item) => item.expiresAt - now >= 24 * 60 * 60 * 1000)
    .sort((a, b) => a.expiresAt - b.expiresAt)
  const ranked = rankRecipes(active, now)
  const tonight = ranked[0]
  const openRescues = state.rescues
    .filter((rescue) => !rescue.claimedBy)
    .sort((a, b) => a.expiresAt - b.expiresAt)
  const atRisk = critical.reduce((sum, item) => sum + item.priceUsd, 0)
  const todayKept = state.events
    .filter((event) => (event.kind === "cooked" || event.kind === "rescued") && event.at > now - 18 * 60 * 60 * 1000)
    .reduce((sum, event) => sum + event.grams, 0)

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.2em] text-moss uppercase">
            {YOU.dorm} · {YOU.floor}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-[1.05] text-balance md:text-6xl">
            {urgentHeadline(critical.length)}
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            {critical.length > 0
              ? `${formatMoney(atRisk)} of food should be eaten soon. Cook it, or give it to someone on your floor.`
              : "Nothing is about to go bad. Add food when you shop."}
          </p>
        </div>
        <AddIngredientDialog />
      </header>

      {todayKept > 0 && (
        <p className="rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm">
          You already kept {formatKg(todayKept)} out of the trash today.{" "}
          <Link href="/impact" className="underline underline-offset-4">
            See the chart
          </Link>
          .
        </p>
      )}

      {critical.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium">Under 24 hours</h2>
            <span className="text-xs text-muted-foreground">Clocks run in real time</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
            {critical.map((item) => (
              <IngredientCard key={item.id} item={item} now={now} featured />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.8fr]">
        {tonight ? (
          <article className="rounded-3xl border border-border bg-card p-5 md:p-6">
            <p className="text-xs tracking-[0.18em] text-lime uppercase">Tonight&apos;s cook</p>
            <h2 className="mt-2 font-serif text-4xl leading-none">{tonight.recipe.name}</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">{tonight.recipe.summary}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {tonight.uses.map((item) => {
                const left = remaining(item.expiresAt, now)
                return (
                  <li key={item.id} className="rounded-full border border-border px-3 py-1 text-xs">
                    {item.name}
                    <span className={left.tone === "critical" ? "text-coral" : "text-muted-foreground"}>
                      {" "}
                      · {left.short}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              {tonight.recipe.minutes} minutes · uses{" "}
              {tonight.uses.map((item) => item.name.toLowerCase()).join(", ")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/cook/${tonight.recipe.id}`} className={buttonVariants({ className: "h-11 px-5 text-base" })}>
                Cook this
              </Link>
              <Link href="/cook" className={buttonVariants({ variant: "outline", className: "h-11 px-5" })}>
                See other meals
              </Link>
            </div>
          </article>
        ) : (
          <article className="rounded-3xl border border-dashed border-border p-6">
            <h2 className="font-serif text-3xl">Nothing to cook yet.</h2>
            <p className="mt-2 text-muted-foreground">Scan a receipt or claim something from the floor.</p>
          </article>
        )}

        <article className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs tracking-[0.18em] text-moss uppercase">Free food</p>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="live-dot size-1.5 rounded-full bg-lime" />
              Live
            </span>
          </div>
          {openRescues[0] ? (
            <>
              <h2 className="mt-3 font-serif text-3xl leading-none">{openRescues[0].name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {openRescues[0].poster} · {openRescues[0].quantityLabel} ·{" "}
                {remaining(openRescues[0].expiresAt, now).short}
              </p>
              <p className="mt-3 text-sm">{openRescues[0].note}</p>
            </>
          ) : (
            <>
              <h2 className="mt-3 font-serif text-3xl leading-none">The floor is quiet.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Offer something before it turns, or wait. Neighbors post on their own.</p>
            </>
          )}
          <Link href="/rescue" className={buttonVariants({ variant: "outline", className: "mt-5 h-11 px-4" })}>
            {openRescues.length > 0 ? `See ${openRescues.length} free items` : "See the floor"}
          </Link>
        </article>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">{steady.length > 0 ? "Still fine" : "That's the whole shelf"}</h2>
        {steady.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {steady.map((item) => (
              <IngredientCard key={item.id} item={item} now={now} />
            ))}
          </div>
        ) : (
          critical.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-muted-foreground">
              The fridge is a blank shelf. Scan a receipt or log something by hand.
            </p>
          )
        )}
      </section>
    </div>
  )
}
