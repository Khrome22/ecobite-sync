"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  FRIDGE_SAMPLE,
  PASTE_SAMPLE,
  RECEIPT_SAMPLE,
  parseReceiptText,
  type ParseResult,
  type ParsedItem,
} from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"
import { cn } from "@/lib/utils"

type Mode = "receipt" | "fridge"

export function ScanStudio() {
  const { addDrafts } = useKitchen()
  const [mode, setMode] = useState<Mode>("receipt")
  const [phase, setPhase] = useState<"idle" | "reading" | "ready">("idle")
  const [result, setResult] = useState<ParseResult | null>(null)
  const [note, setNote] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [paste, setPaste] = useState("")
  const [added, setAdded] = useState(false)

  const sample = mode === "receipt" ? RECEIPT_SAMPLE : FRIDGE_SAMPLE
  const json = useMemo(() => (result ? JSON.stringify(result, null, 2) : ""), [result])

  function readSample() {
    setAdded(false)
    setPreview(null)
    setNote("")
    setPhase("reading")
    setResult(null)
    window.setTimeout(() => {
      setResult(sample)
      setPhase("ready")
    }, 1100)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setAdded(false)
    setNote("")
    setResult(null)
    setPreview(URL.createObjectURL(file))
    setPhase("reading")
    const body = new FormData()
    body.set("image", file)
    try {
      const response = await fetch("/api/vision", { method: "POST", body })
      const data = (await response.json()) as {
        ok?: boolean
        reason?: string
        result?: ParseResult
      }
      if (!data.ok || !data.result) {
        setPhase("idle")
        setNote(
          data.reason === "no-key"
            ? "No Gemini key in this booth. Use a sample, or paste the receipt text — that parser runs on the phone."
            : data.reason === "too-large"
              ? "That photo is over 4 MB. Try a smaller one."
              : "Couldn't read that photo. Try the sample shelf, or paste the text.",
        )
        return
      }
      setResult(data.result)
      setPhase("ready")
    } catch {
      setPhase("idle")
      setNote("The vision request didn't go through. The samples still work offline.")
    }
  }

  function runPaste() {
    const parsed = parseReceiptText(paste)
    setPreview(null)
    setAdded(false)
    if (parsed.items.length === 0) {
      setResult(null)
      setPhase("idle")
      setNote("No grocery lines in that paste. Try “blueberries 3.99” on its own line.")
      return
    }
    setNote("")
    setResult(parsed)
    setPhase("ready")
  }

  function addAll() {
    if (!result) return
    addDrafts(
      result.items.map((item) => ({
        name: item.name,
        quantityLabel: item.quantityLabel,
        grams: item.grams,
        category: item.category,
        priceUsd: item.priceUsd,
        hoursToExpire: item.hoursToExpire,
        source: result.kind === "fridge" ? "fridge" : "receipt",
        note: item.note,
        safety: item.safety,
      })),
    )
    setAdded(true)
  }

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.2em] text-moss uppercase">Receipt and fridge</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">Point it at the food. Get a clock.</h1>
        <p className="mt-3 text-muted-foreground">
          A receipt becomes a shelf with expiration estimates. A fridge photo does the same for what’s already open.
          Samples run without a network so a demo doesn’t die on booth wifi.
        </p>
      </header>

      <div className="flex gap-2">
        <Button variant={mode === "receipt" ? "default" : "outline"} onClick={() => { setMode("receipt"); setPhase("idle"); setResult(null) }}>
          Receipt
        </Button>
        <Button variant={mode === "fridge" ? "default" : "outline"} onClick={() => { setMode("fridge"); setPhase("idle"); setResult(null) }}>
          Fridge shelf
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-4">
          {phase === "reading" && (
            <span className="scanline pointer-events-none absolute right-4 left-4 z-10 h-0.5 bg-lime shadow-[0_0_16px_#dff25a]" />
          )}
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Upload preview" className="max-h-80 w-full rounded-2xl object-contain" />
          ) : mode === "receipt" ? (
            <ReceiptArt items={RECEIPT_SAMPLE.items} />
          ) : (
            <FridgeArt items={FRIDGE_SAMPLE.items} />
          )}
          <div className="sticky bottom-[4.75rem] z-20 mt-4 flex flex-wrap gap-2 bg-card/95 py-2 backdrop-blur md:static md:bg-transparent md:py-0">
            <Button onClick={readSample} disabled={phase === "reading"} className="h-10">
              {phase === "reading" ? "Reading…" : mode === "receipt" ? "Read this receipt" : "Read this shelf"}
            </Button>
            <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-border px-3 text-sm hover:bg-muted">
              Use camera or photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </label>
          </div>
          {note && <p className="mt-3 text-sm text-amber">{note}</p>}
        </div>

        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl">Structured read</h2>
            <p className="text-xs text-muted-foreground">
              {result ? (result.model === "booth-sample" || result.model === "local-receipt-parser" ? result.model : "Gemini") : "Waiting"}
            </p>
          </div>
          {phase === "reading" && <p className="mt-6 text-sm text-muted-foreground">Pulling line items and estimating shelf life…</p>}
          {phase !== "reading" && !result && (
            <p className="mt-6 text-sm text-muted-foreground">
              The JSON lands here: name, grams, category, hours left, price. That’s the inventory row.
            </p>
          )}
          {result && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.title} · {result.place}
              </p>
              <ul className="mt-4 space-y-2">
                {result.items.map((item) => (
                  <li key={item.ticket + item.name} className="flex items-start justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                    <span>
                      <span className="block">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.quantityLabel} · {item.grams} g · {item.category}
                      </span>
                    </span>
                    <span className="text-right font-mono text-xs">
                      {item.hoursToExpire}h
                      <span className="block text-muted-foreground">${item.priceUsd.toFixed(2)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button className="mt-4 h-10" onClick={addAll} disabled={added}>
                {added ? "On your shelf" : `Add ${result.items.length} to the kitchen`}
              </Button>
              <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-background/70 p-3 font-mono text-[11px] leading-relaxed text-moss">
                {json}
              </pre>
            </>
          )}
        </div>
      </div>

      <section className="rounded-3xl border border-border p-4">
        <h2 className="font-serif text-2xl">Or paste the receipt</h2>
        <p className="mt-1 text-sm text-muted-foreground">One item a line. A price at the end helps. This path never calls Gemini.</p>
        <Textarea
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          placeholder={PASTE_SAMPLE}
          className="mt-3 min-h-32 font-mono"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPaste(PASTE_SAMPLE)}>
            Fill the sample
          </Button>
          <Button onClick={runPaste} disabled={!paste.trim()}>
            Parse text
          </Button>
        </div>
      </section>
    </div>
  )
}

function ReceiptArt({ items }: { items: ParsedItem[] }) {
  const total = items.reduce((sum, item) => sum + item.priceUsd, 0)
  return (
    <div className="mx-auto max-w-sm rounded-sm bg-[#f4efe4] px-5 py-6 text-[#1c1a16] shadow-lg">
      <p className="text-center font-mono text-xs tracking-[0.3em]">LUCKY MARKET</p>
      <p className="text-center font-mono text-[10px]">PLYMOUTH RD · ANN ARBOR</p>
      <p className="mt-2 text-center font-mono text-[10px]">10/03/26 18:14 &nbsp; REG 2</p>
      <div className="my-3 border-t border-dashed border-[#1c1a16]/40" />
      <ul className="space-y-1 font-mono text-xs">
        {items.map((item) => (
          <li key={item.ticket} className="flex justify-between gap-3">
            <span>{item.ticket}</span>
            <span>{item.priceUsd.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-dashed border-[#1c1a16]/40" />
      <p className="flex justify-between font-mono text-xs font-semibold">
        <span>TOTAL</span>
        <span>{total.toFixed(2)}</span>
      </p>
      <div className="mx-auto mt-4 h-10 w-40 bg-[repeating-linear-gradient(90deg,#1c1a16_0_1px,transparent_1px_3px)]" />
      <p className="mt-3 text-center font-mono text-[10px]">THANK YOU</p>
    </div>
  )
}

function FridgeArt({ items }: { items: ParsedItem[] }) {
  return (
    <div className="rounded-2xl bg-[#0e1412] p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Door shelf</span>
        <span>3B</span>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.name}
            className={cn(
              "flex items-center justify-between rounded-xl px-3 py-3",
              index % 2 === 0 ? "bg-[#243028]" : "bg-[#2a241c]",
            )}
          >
            <span className="font-serif text-xl">{item.name}</span>
            <span className="font-mono text-xs text-amber">{item.hoursToExpire}h</span>
          </div>
        ))}
      </div>
    </div>
  )
}
