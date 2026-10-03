"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useNow } from "@/components/countdown"
import { Plate } from "@/components/plate"
import { buttonVariants } from "@/components/ui/button"
import { formatCo2, formatKg, footprint, rankRecipes, remaining } from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"

export function CookList() {
  const params = useSearchParams()
  const focus = params.get("focus")
  const { state } = useKitchen()
  const now = useNow()
  const active = state.ingredients.filter((item) => item.state === "stocked" || item.state === "offered")
  const ranked = rankRecipes(active, now, focus)

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.2em] text-moss uppercase">Hands-free coach</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">
          {focus ? `Meals that use the ${focus.toLowerCase()}.` : "Cook the thing that's closest to the bin."}
        </h1>
        <p className="mt-3 text-muted-foreground">
          The list re-ranks as clocks run down and as you claim from the floor. Say next, or ask what you can skip.
        </p>
      </header>

      {ranked.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-muted-foreground">
          Nothing on the shelf matches a meal yet. Scan groceries or claim from the floor.
        </p>
      ) : (
        <ol className="space-y-3">
          {ranked.map((row, index) => {
            const grams = row.uses.reduce((sum, item) => sum + item.grams, 0)
            const co2 = row.uses.reduce((sum, item) => sum + footprint(item).landfillCo2eKg, 0)
            return (
              <li key={row.recipe.id} className="grid gap-4 rounded-3xl border border-border bg-card p-4 md:grid-cols-[auto_1fr_auto] md:items-center md:p-5">
                <Plate id={row.recipe.id} />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {index === 0 ? "Best use of the clock" : `Option ${index + 1}`} · {row.recipe.minutes} min
                  </p>
                  <h2 className="mt-1 font-serif text-3xl leading-none">{row.recipe.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{row.recipe.summary}</p>
                  <p className="mt-3 text-sm">
                    {row.uses.map((item) => `${item.name} (${remaining(item.expiresAt, now).short})`).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatKg(grams)} kept in use · {formatCo2(co2)} landfill CO2e avoided if you finish it
                  </p>
                </div>
                <Link href={`/cook/${row.recipe.id}`} className={buttonVariants({ className: "h-10 px-4 md:self-end" })}>
                  Start
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
