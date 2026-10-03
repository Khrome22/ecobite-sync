"use client"

import { useEffect, useState } from "react"
import { useNow } from "@/components/countdown"
import { formatCo2, formatKg, formatMoney, formatWater, formatWhen } from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"
import { cn } from "@/lib/utils"

type ImpactDay = {
  key: string
  label: string
  title: string
  isToday: boolean
  logged: number
  wasted: number
  kept: number
}

type ImpactReport = {
  engine: string
  query: string
  totals: {
    loggedGrams: number
    wastedGrams: number
    keptGrams: number
    co2eAvoided: number
    co2eEmitted: number
    usdKept: number
    usdLost: number
    waterL: number
  }
  days: ImpactDay[]
}

const KIND: Record<string, string> = {
  cooked: "Cooked",
  rescued: "Rescued",
  wasted: "Tossed",
  logged: "Logged",
}

export function ImpactBoard() {
  const { state } = useKitchen()
  const now = useNow()
  const [report, setReport] = useState<ImpactReport | null>(null)
  const [error, setError] = useState(false)
  const newest = state.events[0]?.id ?? ""
  const count = state.events.length

  useEffect(() => {
    let cancelled = false
    fetch("/api/impact")
      .then((response) => {
        if (!response.ok) throw new Error("impact")
        return response.json() as Promise<ImpactReport>
      })
      .then((data) => {
        if (!cancelled) {
          setReport(data)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [newest, count])

  const days = report?.days ?? []
  const totals = report?.totals
  const max = Math.max(1, ...days.map((day) => Math.max(day.logged, day.wasted)))
  const thisWeek = days.slice(7).reduce((sum, day) => sum + day.logged, 0)
  const lastWeek = days.slice(0, 7).reduce((sum, day) => sum + day.logged, 0)
  const delta = thisWeek - lastWeek
  const recent = [...state.events].sort((a, b) => b.at - a.at).slice(0, 8)

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.2em] text-moss uppercase">Fourteen days · {report?.engine ?? "PostgreSQL"}</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">Logged versus wasted.</h1>
        <p className="mt-3 text-muted-foreground">
          Every ingredient logged, cooked, claimed, or tossed is a row in Postgres. The chart and the three headlines are that query, updating as the floor moves.
        </p>
      </header>

      {error && !report && (
        <p className="rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          The event database didn&apos;t answer. Cook and claim still work; the chart will catch up when it does.
        </p>
      )}

      <section className="grid min-w-0 gap-3 md:grid-cols-3">
        <Stat
          label="Carbon emissions avoided"
          value={totals ? formatCo2(totals.co2eAvoided) : "—"}
          detail={totals ? `${formatCo2(totals.co2eEmitted)} still emitted from what was tossed` : "Reading the event stream…"}
        />
        <Stat
          label="Water saved"
          value={totals ? formatWater(totals.waterL) : "—"}
          detail={totals ? `In the ${formatKg(totals.keptGrams)} that was eaten instead of dumped` : "Reading the event stream…"}
        />
        <Stat
          label="Money preserved"
          value={totals ? formatMoney(totals.usdKept) : "—"}
          detail={totals ? `${formatMoney(totals.usdLost)} written off` : "Reading the event stream…"}
        />
      </section>

      <p className="text-sm text-muted-foreground">
        {totals
          ? `${formatKg(totals.loggedGrams)} logged over this stretch, ${formatKg(totals.wastedGrams)} tossed, ${formatKg(totals.keptGrams)} cooked or claimed.`
          : "Reading logged versus wasted from Postgres…"}
      </p>

      <section className="min-w-0 rounded-3xl border border-border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl">Logged versus wasted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {report
                ? delta > 0
                  ? `This week logged ${formatKg(delta)} more than last week.`
                  : delta < 0
                    ? `Last week logged ${formatKg(Math.abs(delta))} more. Today can still close it.`
                    : "This week is level with last week."
                : "Waiting on the daily rollup."}
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-sm bg-lime" /> Logged
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-sm bg-coral" /> Wasted
            </span>
          </div>
        </div>
        <div
          className="mt-6 flex h-52 min-w-0 items-end gap-1.5"
          role="img"
          aria-label="Fourteen day chart of food logged versus food wasted"
        >
          {days.map((day) => (
            <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${day.title}: logged ${formatKg(day.logged)}, wasted ${formatKg(day.wasted)}`}>
              <div className="flex h-40 w-full items-end justify-center gap-0.5">
                <Bar grams={day.logged} max={max} className="bg-lime" />
                <Bar grams={day.wasted} max={max} className="bg-coral" />
              </div>
              <span className={cn("text-[10px] uppercase", day.isToday ? "text-lime" : "text-muted-foreground")}>
                {day.isToday ? "Now" : day.label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Today&apos;s bar fills when you log, cook, claim, or toss something. The query behind the bars is the same shape Tiger Data keeps warm as a continuous aggregate.
        </p>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h2 className="mb-3 font-serif text-2xl">Latest events</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cook, claim, or toss something and it lands here.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((event) => (
                <li key={event.id} className="flex min-w-0 items-baseline justify-between gap-3 rounded-2xl border border-border px-3 py-2 text-sm">
                  <span className="min-w-0">
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
        <div className="min-w-0 rounded-3xl border border-border p-4">
          <h2 className="font-serif text-2xl">The rollup</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This is the query the chart just ran against <code className="text-foreground">waste_events</code>. On Tiger Data that bucket is a continuous aggregate. Here Postgres is in the app so the demo does not wait on a hosted database. The Timescale shape is in <code className="text-foreground">schema.sql</code>.
          </p>
          <pre className="mt-4 max-w-full overflow-x-auto rounded-xl bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-moss">{report?.query ?? "select … from waste_events group by 1;"}</pre>
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
