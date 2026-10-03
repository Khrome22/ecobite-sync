"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { useNow } from "@/components/countdown"
import { Plate } from "@/components/plate"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCo2, formatKg, footprint, scoreRecipes, remaining } from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"
import { cn } from "@/lib/utils"

export function CookList() {
  const params = useSearchParams()
  const focus = params.get("focus")
  const { state } = useKitchen()
  const now = useNow()
  const [book, setBook] = useState<"ready" | "all">("ready")
  const [query, setQuery] = useState("")
  const active = state.ingredients.filter((item) => item.state === "stocked" || item.state === "offered")
  const scored = scoreRecipes(active, now, focus)
  const needle = query.trim().toLowerCase()
  const readyCount = scored.filter((row) => row.viable).length
  const rows = scored.filter((row) => {
    if (book === "ready" && !row.viable) return false
    if (!needle) return true
    const hay = [row.recipe.name, row.recipe.summary, ...row.recipe.needs.map((need) => need.label)]
      .join(" ")
      .toLowerCase()
    return hay.includes(needle)
  })

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.2em] text-moss uppercase">Hands-free coach</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">
          {focus ? `Meals that use the ${focus.toLowerCase()}.` : "Pick what to cook."}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Ready now is what you can finish from the shelf. The whole book is every meal, including ones you&apos;re still missing a piece for.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Which recipes to show">
          <button
            type="button"
            onClick={() => setBook("ready")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              book === "ready" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
            )}
            aria-pressed={book === "ready"}
          >
            Ready now · {readyCount}
          </button>
          <button
            type="button"
            onClick={() => setBook("all")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              book === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
            )}
            aria-pressed={book === "all"}
          >
            Whole book · {scored.length}
          </button>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search meals or ingredients"
          aria-label="Search recipes"
          className="h-10 w-full rounded-full bg-card px-4 sm:max-w-xs"
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-card px-4 py-10 text-muted-foreground">
          {needle
            ? "No meal matches that search."
            : "Nothing on the shelf matches a full meal yet. Open the whole book, or scan groceries."}
        </p>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, index) => {
            const grams = row.uses.reduce((sum, item) => sum + item.grams, 0)
            const co2 = row.uses.reduce((sum, item) => sum + footprint(item).landfillCo2eKg, 0)
            return (
              <li key={row.recipe.id} className="grid gap-4 rounded-3xl border border-border bg-card p-4 shadow-[0_8px_25px_rgba(54,76,86,0.06)] md:grid-cols-[auto_1fr_auto] md:items-center md:p-5">
                <Plate id={row.recipe.id} />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {row.viable
                      ? index === 0 && !needle
                        ? "Best use of the clock"
                        : `Ready · option ${index + 1}`
                      : "Missing a piece"}
                    {" · "}
                    {row.recipe.minutes} min
                  </p>
                  <h2 className="mt-1 font-serif text-3xl leading-none">{row.recipe.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{row.recipe.summary}</p>
                  {row.uses.length > 0 && (
                    <p className="mt-3 text-sm">
                      {row.uses.map((item) => `${item.name} (${remaining(item.expiresAt, now).short})`).join(" · ")}
                    </p>
                  )}
                  {row.missing.length > 0 && (
                    <p className="mt-2 text-sm text-amber">Still need {row.missing.join(", ")}</p>
                  )}
                  {row.viable && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatKg(grams)} kept in use · {formatCo2(co2)} landfill CO2e avoided if you finish it
                    </p>
                  )}
                </div>
                <Link href={`/cook/${row.recipe.id}`} className={buttonVariants({ className: "h-10 rounded-2xl px-4 md:self-end" })}>
                  {row.viable ? "Start" : "Cook anyway"}
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
