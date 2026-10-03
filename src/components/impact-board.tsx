"use client"

import { useNow } from "@/components/countdown"
import {
  dayBuckets,
  formatCo2,
  formatKg,
  formatMoney,
  formatWater,
  formatWhen,
  summarize,
  weekPair,
} from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"
import { cn } from "@/lib/utils"

const KIND: Record<string, string> = {
  cooked: "Cooked",
  rescued: "Rescued",
  wasted: "Tossed",
  logged: "Logged",
}

export function ImpactBoard() {
  const { state } = useKitchen()
  const now = useNow()
  const all = summarize(state.events)
  const weeks = weekPair(state.events, now)
  const days = dayBuckets(state.events, now)
  const max = Math.max(1, ...days.map((day) => Math.max(day.kept, day.wasted)))
  const delta = weeks.thisWeek.keptGrams - weeks.lastWeek.keptGrams
  const recent = [...state.events]
    .filter((event) => event.kind !== "logged")
    .sort((a, b) => b.at - a.at)
    .slice(0, 6)
  const term = weeks.thisWeek.co2eAvoided * 15

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.2em] text-moss uppercase">Fourteen days</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">What this shelf actually changed.</h1>
        <p className="mt-3 text-muted-foreground">
          Farm emissions and irrigation already happened. A kitchen can still change three things: food that gets eaten, the landfill methane it never makes, and the money already spent.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <Stat label="Food kept out of the trash" value={formatKg(all.keptGrams)} detail={`${formatKg(all.wastedGrams)} tossed in the same stretch`} />
        <Stat label="Landfill methane avoided" value={formatCo2(all.co2eAvoided)} detail={`${formatCo2(all.co2eEmitted)} still emitted from what was tossed`} />
        <Stat label="Grocery money kept" value={formatMoney(all.usdKept)} detail={`${formatMoney(all.usdLost)} written off`} />
      </section>

      <p className="text-sm text-muted-foreground">
        Embodied in what you kept, not a credit: {formatCo2(all.embodiedCo2e)} CO2e on the farm and {formatWater(all.waterL)} of water. Those are footprints you put to use.
      </p>

      <section className="rounded-3xl border border-border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl">Kept versus tossed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {delta >= 0
                ? `This week is ahead of last week by ${formatKg(delta)}.`
                : `Last week kept ${formatKg(Math.abs(delta))} more. Today can still close it.`}
              {" "}
              Today&apos;s bar starts empty on purpose.
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-sm bg-lime" /> Kept
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-sm bg-coral" /> Tossed
            </span>
          </div>
        </div>
        <div
          className="mt-6 flex h-52 items-end gap-1.5"
          role="img"
          aria-label="Fourteen day chart of food kept versus food tossed"
        >
          {days.map((day) => (
            <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${day.title}: kept ${formatKg(day.kept)}, tossed ${formatKg(day.wasted)}`}>
              <div className="flex h-40 w-full items-end justify-center gap-0.5">
                <Bar grams={day.kept} max={max} className="bg-lime" />
                <Bar grams={day.wasted} max={max} className="bg-coral" />
              </div>
              <span className={cn("text-[10px] uppercase", day.isToday ? "text-lime" : "text-muted-foreground")}>
                {day.isToday ? "Now" : day.label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Fifteen weeks at this week&apos;s pace is about {formatCo2(term)} of landfill methane avoided, from one shelf.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="mb-3 font-serif text-2xl">Latest events</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cook, claim, or toss something and it lands here.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-3 rounded-2xl border border-border px-3 py-2 text-sm">
                  <span>
                    <span className={event.kind === "wasted" ? "text-coral" : "text-lime"}>{KIND[event.kind]}</span>
                    {" "}
                    {event.name}
                    <span className="text-muted-foreground"> · {formatKg(event.grams)}</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{formatWhen(event.at, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-border p-4">
          <h2 className="font-serif text-2xl">The rollup</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each cook, rescue, and toss is an event. The chart buckets them by day — the same query a Tiger Data continuous aggregate would keep warm, computed here in the browser. The Postgres shape lives in <code className="text-foreground">schema.sql</code>.
          </p>
          <pre className="mt-4 overflow-auto rounded-xl bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-moss">{`select
  time_bucket('1 day', time) as day,
  sum(grams) filter (where kind in ('cooked','rescued')) as grams_kept,
  sum(grams) filter (where kind = 'wasted') as grams_wasted,
  sum(co2e_kg) filter (where kind in ('cooked','rescued')) as co2e_avoided
from waste_events
group by 1;`}</pre>
        </div>
      </section>

      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Estimates, not an audit. Landfill factor is 0.58 kg CO2e per kg of food, in the range of EPA WARM. Production factors follow the order of magnitude in Poore &amp; Nemecek (2018) and water footprints in Mekonnen &amp; Hoekstra (2011). Category stand-ins fill anything the table doesn&apos;t name.
      </p>
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-serif text-4xl leading-none">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </article>
  )
}

function Bar({ grams, max, className }: { grams: number; max: number; className: string }) {
  const height = grams <= 0 ? 0 : Math.max(4, Math.round((grams / max) * 152))
  return <span className={cn("w-2 rounded-sm", className)} style={{ height }} />
}
