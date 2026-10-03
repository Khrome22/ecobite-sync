"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Countdown } from "@/components/countdown"
import { remaining, sourceLabel, type Ingredient } from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"
import { cn } from "@/lib/utils"

export function IngredientCard({
  item,
  now,
  featured = false,
}: {
  item: Ingredient
  now: number
  featured?: boolean
}) {
  const { offer, mark } = useKitchen()
  const left = remaining(item.expiresAt, now)
  const offered = item.state === "offered"

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-4",
        featured && "min-w-[16.5rem] snap-start",
        left.tone === "critical" && "border-coral/45",
        left.tone === "over" && "border-coral",
        left.tone === "soon" && "border-amber/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{item.category}</p>
          <h3 className="mt-1 font-serif text-2xl leading-none">{item.name}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {item.quantityLabel}
            <span className="text-foreground/30"> · </span>
            {sourceLabel(item)}
          </p>
        </div>
        <Countdown expiresAt={item.expiresAt} now={now} featured={featured} />
      </div>
      {(item.note || item.safety) && (
        <p className={cn("mt-3 text-sm", item.safety ? "text-amber" : "text-muted-foreground")}>
          {item.safety ?? item.note}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/cook?focus=${encodeURIComponent(item.name)}`}
          className={buttonVariants({ className: "h-8 px-3" })}
        >
          Cook this
        </Link>
        <Button
          variant="outline"
          className="h-8"
          disabled={offered}
          onClick={() => offer(item.id)}
        >
          {offered ? "On the board" : "Offer"}
        </Button>
        <Button variant="ghost" className="h-8 px-2 text-muted-foreground" onClick={() => mark(item.id, "cooked")}>
          Ate it
        </Button>
        <Button variant="ghost" className="h-8 px-2 text-muted-foreground" onClick={() => mark(item.id, "wasted")}>
          Tossed it
        </Button>
      </div>
    </article>
  )
}
