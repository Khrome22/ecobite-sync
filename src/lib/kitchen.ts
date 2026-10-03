/**
 * EcoBite kitchen model.
 *
 * Impact factors are demo estimates, not a certified life-cycle assessment.
 * Production CO2e and water follow the order of magnitude in Poore & Nemecek
 * (Science, 2018) and Mekonnen & Hoekstra (2011). Landfill methane uses
 * 0.58 kg CO2e per kg of food, in the range of EPA WARM for landfilled food.
 * Eating food you already bought does not undo the farm. The dashboard only
 * takes credit for landfill methane avoided and money already spent.
 */

export const HOUR = 60 * 60 * 1000
export const YOU = { name: "Kavitha", dorm: "Bursley", floor: "Floor 3", room: "3B" }
export const PRESENCE = ["Kavitha", "Priya", "Sam", "Jordan", "Mina"]
export const LANDFILL_CO2E_PER_KG = 0.58
export const SCRIPT_GAP_MS = 14_000
export const STATE_VERSION = 1

export type Category = "produce" | "dairy" | "protein" | "grain" | "other"

export type Ingredient = {
  id: string
  name: string
  quantityLabel: string
  grams: number
  category: Category
  priceUsd: number
  expiresAt: number
  addedAt: number
  source: "fridge" | "receipt" | "rescue" | "manual"
  state: "stocked" | "offered" | "cooked" | "wasted"
  note?: string
  safety?: string
  from?: string
  eventId?: string
}

export type ImpactEvent = {
  id: string
  at: number
  kind: "logged" | "cooked" | "rescued" | "wasted"
  name: string
  grams: number
  category: Category
  priceUsd: number
  co2eKg: number
  methaneEmittedKg: number
  embodiedCo2eKg: number
  waterL: number
}

export type Rescue = {
  id: string
  ingredientId?: string
  name: string
  quantityLabel: string
  grams: number
  category: Category
  priceUsd: number
  expiresAt: number
  poster: string
  at: number
  note: string
  safety?: string
  claimedBy?: string
  claimedAt?: number
}

export type RoomNote = {
  id: string
  at: number
  author: string
  text: string
}

export type KitchenState = {
  version: number
  ingredients: Ingredient[]
  rescues: Rescue[]
  notes: RoomNote[]
  events: ImpactEvent[]
  hosting: boolean
  scriptIndex: number
  lastScriptAt: number
  toast: { id: string; title: string; body?: string } | null
}

export type IngredientDraft = {
  name: string
  quantityLabel: string
  grams: number
  category: Category
  priceUsd: number
  hoursToExpire: number
  source: Ingredient["source"]
  note?: string
  safety?: string
  from?: string
}

export type ParsedItem = {
  ticket: string
  name: string
  quantityLabel: string
  grams: number
  category: Category
  hoursToExpire: number
  priceUsd: number
  note?: string
  safety?: string
}

export type ParseResult = {
  kind: "receipt" | "fridge" | "paste"
  title: string
  place: string
  model: string
  items: ParsedItem[]
}

export type Step = {
  title: string
  say: string
  detail: string
  howMuch: string
  heat?: string
  why?: string
  timerSec?: number
}

export type Recipe = {
  id: string
  name: string
  minutes: number
  servings: string
  summary: string
  assumes: string
  plate: string
  needs: { match: string[]; label: string; optional?: boolean }[]
  steps: Step[]
  subs: { hear: string[]; line: string }[]
}

export type CoachAction =
  | { type: "next" | "back" | "repeat" | "pause" }
  | { type: "timer"; seconds: number }
  | { type: "say"; text: string }

const CATEGORY_FACTORS: Record<Category, { co2e: number; water: number }> = {
  produce: { co2e: 0.7, water: 320 },
  dairy: { co2e: 3.2, water: 1020 },
  protein: { co2e: 6.1, water: 4300 },
  grain: { co2e: 1.6, water: 1640 },
  other: { co2e: 1.2, water: 500 },
}

const NAMED_FACTORS: { test: string; co2e: number; water: number }[] = [
  { test: "oat milk", co2e: 0.9, water: 48 },
  { test: "coconut", co2e: 3, water: 2700 },
  { test: "cheddar", co2e: 9.8, water: 5060 },
  { test: "feta", co2e: 8.5, water: 3178 },
  { test: "yogurt", co2e: 2.2, water: 1000 },
  { test: "chicken", co2e: 6.1, water: 4325 },
  { test: "egg", co2e: 4.5, water: 3265 },
  { test: "rice", co2e: 2.7, water: 2497 },
  { test: "pasta", co2e: 1.6, water: 1849 },
  { test: "tortilla", co2e: 1.3, water: 1400 },
  { test: "sourdough", co2e: 1.4, water: 1608 },
  { test: "bread", co2e: 1.4, water: 1608 },
  { test: "avocado", co2e: 2.5, water: 1981 },
  { test: "banana", co2e: 0.9, water: 790 },
  { test: "blueberry", co2e: 0.9, water: 845 },
  { test: "tomato", co2e: 1.4, water: 214 },
  { test: "spinach", co2e: 0.4, water: 322 },
  { test: "cilantro", co2e: 0.4, water: 322 },
  { test: "pepper", co2e: 1, water: 379 },
  { test: "lime", co2e: 0.3, water: 560 },
  { test: "onion", co2e: 0.4, water: 250 },
  { test: "hummus", co2e: 1.2, water: 1200 },
  { test: "salsa", co2e: 0.8, water: 400 },
  { test: "milk", co2e: 3.2, water: 1020 },
]

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function factorsFor(name: string, category: Category) {
  const found = NAMED_FACTORS.find((factor) => name.toLowerCase().includes(factor.test))
  return found ?? CATEGORY_FACTORS[category]
}

export function footprint(item: { name: string; grams: number; category: Category }) {
  const factor = factorsFor(item.name, item.category)
  const kg = item.grams / 1000
  return {
    embodiedCo2eKg: kg * factor.co2e,
    waterL: kg * factor.water,
    landfillCo2eKg: kg * LANDFILL_CO2E_PER_KG,
  }
}

export function formatMoney(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

export function formatKg(grams: number) {
  if (grams < 1000) return `${Math.round(grams)} g`
  const kg = grams / 1000
  return `${kg.toFixed(kg >= 10 ? 0 : 1)} kg`
}

export function formatCo2(kg: number) {
  if (kg < 0.05) return "0 kg"
  if (kg < 1) return `${Math.round(kg * 1000)} g`
  return `${kg.toFixed(1)} kg`
}

export function formatWater(liters: number) {
  if (liters < 1000) return `${Math.round(liters)} L`
  return `${(liters / 1000).toFixed(1)}k L`
}

export function remaining(expiresAt: number, now: number) {
  const ms = expiresAt - now
  const past = ms <= 0
  const total = Math.abs(Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  const tone: "critical" | "soon" | "steady" | "over" = past
    ? "over"
    : h < 24
      ? "critical"
      : h < 48
        ? "soon"
        : "steady"
  const short = past
    ? "past due"
    : h >= 48
      ? `${Math.floor(h / 24)}d ${h % 24}h`
      : h >= 1
        ? `${h}h ${m}m`
        : `${m}m`
  return { ms, past, clock: `${pad(h)}:${pad(m)}:${pad(s)}`, short, tone }
}

const COUNT_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]

export function urgentHeadline(count: number) {
  if (count === 0) return "Nothing in here is dying tonight."
  const word = COUNT_WORDS[count] ?? String(count)
  return count === 1
    ? `${word} thing won't survive the night.`
    : `${word} things won't survive the night.`
}

export function sourceLabel(item: Ingredient) {
  if (item.from) return `From ${item.from}`
  if (item.source === "receipt") return "From a receipt"
  if (item.source === "manual") return "Logged by hand"
  if (item.source === "rescue") return "From the floor"
  return "Your shelf"
}

function dayKey(ts: number) {
  const date = new Date(ts)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function formatWhen(ts: number, now: number) {
  const date = new Date(ts)
  if (dayKey(ts) === dayKey(now)) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function outcomeEvent(item: Ingredient, kind: "cooked" | "rescued" | "wasted"): ImpactEvent {
  const fp = footprint(item)
  const saved = kind !== "wasted"
  return {
    id: uid("ev"),
    at: Date.now(),
    kind,
    name: item.name,
    grams: item.grams,
    category: item.category,
    priceUsd: item.priceUsd,
    co2eKg: saved ? fp.landfillCo2eKg : 0,
    methaneEmittedKg: saved ? 0 : fp.landfillCo2eKg,
    embodiedCo2eKg: fp.embodiedCo2eKg,
    waterL: fp.waterL,
  }
}

export function loggedEvent(item: Ingredient): ImpactEvent {
  return {
    id: uid("ev"),
    at: Date.now(),
    kind: "logged",
    name: item.name,
    grams: item.grams,
    category: item.category,
    priceUsd: item.priceUsd,
    co2eKg: 0,
    methaneEmittedKg: 0,
    embodiedCo2eKg: 0,
    waterL: 0,
  }
}

export function materialize(draft: IngredientDraft, now = Date.now()): Ingredient {
  return {
    id: uid("ing"),
    name: draft.name,
    quantityLabel: draft.quantityLabel,
    grams: draft.grams,
    category: draft.category,
    priceUsd: draft.priceUsd,
    expiresAt: now + draft.hoursToExpire * HOUR,
    addedAt: now,
    source: draft.source,
    state: "stocked",
    note: draft.note,
    safety: draft.safety,
    from: draft.from,
  }
}

export function summarize(events: ImpactEvent[]) {
  const kept = events.filter((event) => event.kind === "cooked" || event.kind === "rescued")
  const wasted = events.filter((event) => event.kind === "wasted")
  const sum = (rows: ImpactEvent[], pick: (event: ImpactEvent) => number) =>
    rows.reduce((total, event) => total + pick(event), 0)
  return {
    keptGrams: sum(kept, (event) => event.grams),
    wastedGrams: sum(wasted, (event) => event.grams),
    loggedGrams: sum(
      events.filter((event) => event.kind === "logged"),
      (event) => event.grams,
    ),
    co2eAvoided: sum(kept, (event) => event.co2eKg),
    co2eEmitted: sum(wasted, (event) => event.methaneEmittedKg),
    usdKept: sum(kept, (event) => event.priceUsd),
    usdLost: sum(wasted, (event) => event.priceUsd),
    embodiedCo2e: sum(kept, (event) => event.embodiedCo2eKg),
    waterL: sum(kept, (event) => event.waterL),
  }
}

export type DayBucket = {
  key: string
  label: string
  title: string
  isToday: boolean
  kept: number
  wasted: number
  logged: number
}

export function dayBuckets(events: ImpactEvent[], now = Date.now()): DayBucket[] {
  const days: DayBucket[] = []
  for (let ago = 13; ago >= 0; ago--) {
    const date = new Date(now)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - ago)
    const key = dayKey(date.getTime())
    const mine = events.filter((event) => dayKey(event.at) === key)
    days.push({
      key,
      label: date.toLocaleDateString("en-US", { weekday: "narrow" }),
      title: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      isToday: ago === 0,
      kept: mine
        .filter((event) => event.kind === "cooked" || event.kind === "rescued")
        .reduce((total, event) => total + event.grams, 0),
      wasted: mine
        .filter((event) => event.kind === "wasted")
        .reduce((total, event) => total + event.grams, 0),
      logged: mine
        .filter((event) => event.kind === "logged")
        .reduce((total, event) => total + event.grams, 0),
    })
  }
  return days
}

export function weekPair(events: ImpactEvent[], now = Date.now()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)
  const prev = new Date(start)
  prev.setDate(prev.getDate() - 7)
  return {
    thisWeek: summarize(events.filter((event) => event.at >= start.getTime())),
    lastWeek: summarize(events.filter((event) => event.at >= prev.getTime() && event.at < start.getTime())),
  }
}

const CATALOG: (ParsedItem & { keys: string[] })[] = [
  { keys: ["blueberry"], ticket: "BLUEBERRIES", name: "Blueberries", quantityLabel: "1 pint", grams: 170, category: "produce", hoursToExpire: 96, priceUsd: 3.99 },
  { keys: ["tortilla"], ticket: "TORTILLAS", name: "Flour tortillas", quantityLabel: "8 count", grams: 320, category: "grain", hoursToExpire: 120, priceUsd: 2.49 },
  { keys: ["lime"], ticket: "LIMES", name: "Limes", quantityLabel: "3", grams: 180, category: "produce", hoursToExpire: 168, priceUsd: 1.29 },
  { keys: ["cheddar", "cheese"], ticket: "CHEDDAR", name: "Cheddar", quantityLabel: "8 oz", grams: 227, category: "dairy", hoursToExpire: 336, priceUsd: 4.29 },
  { keys: ["chicken thigh", "chicken"], ticket: "CHKN THIGH", name: "Chicken thighs", quantityLabel: "1.2 lb", grams: 540, category: "protein", hoursToExpire: 36, priceUsd: 6.49, safety: "Raw poultry. Cook or freeze before the clock, and cook it through.", note: "Raw. Don't leave it in the door." },
  { keys: ["cherry tomato", "tomato"], ticket: "TOMATOES", name: "Cherry tomatoes", quantityLabel: "1 pint", grams: 340, category: "produce", hoursToExpire: 120, priceUsd: 3.49 },
  { keys: ["spinach"], ticket: "SPINACH", name: "Baby spinach", quantityLabel: "clamshell", grams: 140, category: "produce", hoursToExpire: 96, priceUsd: 2.49 },
  { keys: ["yogurt"], ticket: "YOGURT", name: "Greek yogurt", quantityLabel: "2 cups", grams: 300, category: "dairy", hoursToExpire: 240, priceUsd: 1.79 },
  { keys: ["cilantro"], ticket: "CILANTRO", name: "Cilantro", quantityLabel: "1 bunch", grams: 35, category: "produce", hoursToExpire: 96, priceUsd: 0.89, note: "Herbs go first. Plan a meal, don't plan a week." },
  { keys: ["sourdough", "bread"], ticket: "SOURDOUGH", name: "Sourdough", quantityLabel: "1 loaf", grams: 400, category: "grain", hoursToExpire: 72, priceUsd: 3.49 },
  { keys: ["egg"], ticket: "EGGS", name: "Eggs", quantityLabel: "12", grams: 600, category: "protein", hoursToExpire: 480, priceUsd: 3.29 },
  { keys: ["bell pepper", "pepper"], ticket: "PEPPER", name: "Bell pepper", quantityLabel: "1", grams: 170, category: "produce", hoursToExpire: 168, priceUsd: 1.29 },
  { keys: ["feta"], ticket: "FETA", name: "Feta", quantityLabel: "block", grams: 200, category: "dairy", hoursToExpire: 336, priceUsd: 3.99 },
  { keys: ["banana"], ticket: "BANANAS", name: "Bananas", quantityLabel: "a bunch", grams: 400, category: "produce", hoursToExpire: 48, priceUsd: 1.2 },
  { keys: ["avocado"], ticket: "AVOCADO", name: "Avocado", quantityLabel: "2", grams: 280, category: "produce", hoursToExpire: 48, priceUsd: 2.5 },
  { keys: ["oat milk"], ticket: "OAT MILK", name: "Oat milk", quantityLabel: "carton", grams: 1000, category: "other", hoursToExpire: 168, priceUsd: 3.99 },
  { keys: ["cooked rice", "rice"], ticket: "RICE", name: "Cooked rice", quantityLabel: "leftover bowl", grams: 400, category: "grain", hoursToExpire: 18, priceUsd: 1.1, safety: "Only if it was refrigerated. Get it steaming hot all the way through.", note: "Leftovers. Eat it today." },
  { keys: ["cucumber"], ticket: "CUCUMBER", name: "Cucumber", quantityLabel: "1", grams: 200, category: "produce", hoursToExpire: 120, priceUsd: 0.99 },
  { keys: ["hummus"], ticket: "HUMMUS", name: "Hummus", quantityLabel: "tub", grams: 280, category: "other", hoursToExpire: 120, priceUsd: 3.49 },
  { keys: ["salsa"], ticket: "SALSA", name: "Salsa", quantityLabel: "jar", grams: 400, category: "produce", hoursToExpire: 240, priceUsd: 2.99 },
]

function toTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .trim()
}

export function parseReceiptText(text: string): ParseResult {
  const items: ParsedItem[] = []
  for (const raw of text.split(/\n+/)) {
    const line = raw.replace(/\s+/g, " ").trim()
    if (!line || !/[a-z]/i.test(line)) continue
    if (/^(total|subtotal|tax|change|visa|debit|mastercard|thank|cashier|store|welcome|balance|approved|item|qty|description|amount)\b/i.test(line)) {
      continue
    }
    const priceMatch = line.match(/(\d+\.\d{2})\s*$/)
    const price = priceMatch ? Number(priceMatch[1]) : null
    const namePart = (priceMatch ? line.slice(0, priceMatch.index) : line).trim()
    const lower = namePart.toLowerCase()
    const known = [...CATALOG]
      .sort((a, b) => Math.max(...b.keys.map((key) => key.length)) - Math.max(...a.keys.map((key) => key.length)))
      .find((entry) => entry.keys.some((key) => lower.includes(key)))
    if (known) {
      items.push({
        ticket: known.ticket,
        name: known.name,
        quantityLabel: known.quantityLabel,
        grams: known.grams,
        category: known.category,
        hoursToExpire: known.hoursToExpire,
        priceUsd: price ?? known.priceUsd,
        note: known.note,
        safety: known.safety,
      })
      continue
    }
    const cleaned = toTitle(namePart.replace(/[^a-z0-9 ]/gi, " "))
    if (cleaned.length < 3) continue
    items.push({
      ticket: cleaned.toUpperCase(),
      name: cleaned,
      quantityLabel: "1",
      grams: 150,
      category: "other",
      hoursToExpire: 72,
      priceUsd: price ?? 2,
    })
  }
  return {
    kind: "paste",
    title: "Pasted receipt",
    place: "On this phone",
    model: "local-receipt-parser",
    items,
  }
}

function longestKey(entry: { keys: string[] }) {
  return Math.max(...entry.keys.map((key) => key.length))
}

function guessShelf(lower: string): { category: Category; hours: number; grams: number } {
  if (/\b(chicken|beef|pork|turkey|fish|shrimp|salmon|meat|tofu)\b/.test(lower)) {
    return { category: "protein", hours: 36, grams: 300 }
  }
  if (/\b(milk|yogurt|cheese|butter|cream)\b/.test(lower)) {
    return { category: "dairy", hours: 120, grams: 250 }
  }
  if (/\b(bread|rice|pasta|noodle|tortilla|oat|quinoa)\b/.test(lower)) {
    return { category: "grain", hours: /\b(cooked|leftover)\b/.test(lower) ? 18 : 96, grams: 300 }
  }
  if (/\b(lettuce|spinach|herb|cilantro|basil|berry|banana|avocado|tomato|pepper|onion|lime|lemon)\b/.test(lower)) {
    return { category: "produce", hours: /\b(herb|cilantro|basil|spinach|lettuce)\b/.test(lower) ? 36 : 72, grams: 180 }
  }
  return { category: "other", hours: 72, grams: 150 }
}

function tightenHours(line: string, hours: number) {
  const lower = line.toLowerCase()
  if (/\b(leftover|opened|cooked|wilting)\b/.test(lower)) return Math.max(4, Math.min(hours, 18))
  if (/\bhalf\b/.test(lower)) return Math.max(4, Math.min(hours, 36))
  return hours
}

export function parsePantryList(text: string): ParseResult {
  const items: ParsedItem[] = []
  const ranked = [...CATALOG].sort((a, b) => longestKey(b) - longestKey(a))
  for (const raw of text.split(/\n+/)) {
    const line = raw.replace(/\s+/g, " ").replace(/^[-*•]\s*/, "").trim()
    if (!line || !/[a-z]/i.test(line)) continue
    const lower = line.toLowerCase()
    const known = ranked.find((entry) => entry.keys.some((key) => lower.includes(key)))
    if (known) {
      items.push({
        ticket: known.ticket,
        name: known.name,
        quantityLabel: /^\d/.test(line) ? line.split(/\s+/).slice(0, 2).join(" ") : known.quantityLabel,
        grams: known.grams,
        category: known.category,
        hoursToExpire: tightenHours(line, known.hoursToExpire),
        priceUsd: known.priceUsd,
        note: known.note,
        safety: known.safety,
      })
      continue
    }
    const cleaned = toTitle(line.replace(/[^a-z0-9 ]/gi, " ")).replace(/\s+/g, " ").trim()
    if (cleaned.length < 3) continue
    const guess = guessShelf(lower)
    items.push({
      ticket: cleaned.toUpperCase(),
      name: cleaned,
      quantityLabel: "1",
      grams: guess.grams,
      category: guess.category,
      hoursToExpire: tightenHours(line, guess.hours),
      priceUsd: 2,
    })
  }
  return {
    kind: "paste",
    title: "What you have left",
    place: "Typed list",
    model: "shelf-life estimate",
    items,
  }
}

export const RECEIPT_SAMPLE: ParseResult = {
  kind: "receipt",
  title: "Lucky Market",
  place: "Plymouth Rd · today, 6:14 PM",
  model: "booth-sample",
  items: [
    { ticket: "BLUEBERRIES", name: "Blueberries", quantityLabel: "1 pint", grams: 170, category: "produce", hoursToExpire: 96, priceUsd: 3.99 },
    { ticket: "TORTILLAS", name: "Flour tortillas", quantityLabel: "8 count", grams: 320, category: "grain", hoursToExpire: 120, priceUsd: 2.49 },
    { ticket: "LIMES", name: "Limes", quantityLabel: "3", grams: 180, category: "produce", hoursToExpire: 168, priceUsd: 1.29 },
    { ticket: "CHEDDAR", name: "Cheddar", quantityLabel: "8 oz", grams: 227, category: "dairy", hoursToExpire: 336, priceUsd: 4.29 },
    { ticket: "CHKN THIGH", name: "Chicken thighs", quantityLabel: "1.2 lb", grams: 540, category: "protein", hoursToExpire: 36, priceUsd: 6.49, safety: "Raw poultry. Cook or freeze before the clock, and cook it through.", note: "Raw. Don't leave it in the door." },
  ],
}

export const FRIDGE_SAMPLE: ParseResult = {
  kind: "fridge",
  title: "Door shelf",
  place: "Bursley 3B · just now",
  model: "booth-sample",
  items: [
    { ticket: "PASTA", name: "Leftover pasta", quantityLabel: "takeout box", grams: 380, category: "grain", hoursToExpire: 8, priceUsd: 2.2, safety: "Only if it stayed cold. Reheat until it's steaming all the way through.", note: "No date on the box." },
    { ticket: "HUMMUS", name: "Hummus", quantityLabel: "half tub", grams: 160, category: "other", hoursToExpire: 14, priceUsd: 1.8 },
    { ticket: "SALSA", name: "Opened salsa", quantityLabel: "jar", grams: 200, category: "produce", hoursToExpire: 20, priceUsd: 1.4 },
    { ticket: "ONION", name: "Half an onion", quantityLabel: "half", grams: 80, category: "produce", hoursToExpire: 30, priceUsd: 0.4 },
    { ticket: "LIME", name: "Lime", quantityLabel: "1", grams: 60, category: "produce", hoursToExpire: 48, priceUsd: 0.4 },
  ],
}

export const PASTE_SAMPLE = `BLUEBERRIES 3.99
TORTILLAS 2.49
LIMES 1.29
CHEDDAR 4.29
CHICKEN THIGHS 6.49`

export const LIST_SAMPLE = `half a bunch of cilantro
cherry tomatoes
cooked rice from Tuesday
2 eggs
oat milk`

export const URGENT_HOURS = 24

export const RECIPES: Recipe[] = [
  {
    id: "shakshuka",
    name: "Skillet shakshuka",
    minutes: 18,
    servings: "2, eaten from the pan",
    summary: "Tomatoes, eggs, and the feta that's quietly aging. One skillet. The bread is the spoon.",
    assumes: "Oil, salt, and the Bursley skillet.",
    plate: "Overhead of a black skillet of shakshuka, two soft eggs, feta snow, cilantro, warm dorm light.",
    needs: [
      { match: ["tomato"], label: "Tomatoes" },
      { match: ["egg"], label: "Eggs" },
      { match: ["pepper"], label: "Bell pepper", optional: true },
      { match: ["feta"], label: "Feta", optional: true },
      { match: ["cilantro"], label: "Cilantro", optional: true },
      { match: ["sourdough", "bread", "tortilla"], label: "Bread", optional: true },
    ],
    subs: [
      { hear: ["feta", "cheese"], line: "Skip the feta, or crumble any salty cheese. The eggs and tomatoes are the meal." },
      { hear: ["cilantro", "herb"], line: "Parsley, the green tops of the onion, or just black pepper. Don't walk to a store for herbs." },
      { hear: ["pepper"], line: "No pepper is fine. Onion if you have it. Otherwise go straight to the tomatoes." },
      { hear: ["egg"], line: "No eggs and this isn't shakshuka. Check the floor — someone usually has a couple." },
      { hear: ["bread", "sourdough"], line: "A tortilla, or eat it with a spoon. The pan still works." },
    ],
    steps: [
      {
        title: "Heat the pan",
        say: "Put a slick of oil in the skillet and set it on medium. Slice the pepper into strips.",
        detail: "Medium is a steady sizzle, not smoke. Salt the pepper once it hits the pan.",
        howMuch: "One pepper, a teaspoon of oil, a pinch of salt.",
        heat: "Medium. If the oil smokes, pull the pan off for ten seconds.",
        why: "The pepper goes first so it can sweeten before the tomatoes water it down.",
      },
      {
        title: "Sweeten the pepper",
        say: "Soften the pepper for four minutes. Stir once. You want it sweet, not browned.",
        detail: "If you skipped the pepper, warm the oil and move on.",
        howMuch: "Four minutes, one stir.",
        heat: "Stay on medium.",
        why: "Color means the sugars are out. Brown means you left.",
        timerSec: 240,
      },
      {
        title: "Crush the tomatoes",
        say: "Add the tomatoes and crush them with a spoon. Simmer until the pan looks jammy, about six minutes.",
        detail: "Salt again. If it spatters, drop the heat a notch. The sauce should hold a spoon-track.",
        howMuch: "The whole pint.",
        heat: "Medium, then a little lower once it bubbles.",
        why: "Water has to leave or the eggs will poach in juice instead of sauce.",
        timerSec: 360,
      },
      {
        title: "Eggs in wells",
        say: "Make two wells. Crack an egg into each. Cover the pan for four minutes, until the whites set and the yolks stay soft.",
        detail: "A plate works as a lid. Don't stir after this.",
        howMuch: "Two eggs. Three if you're hungry and the pan is wide.",
        heat: "Low-medium under the lid.",
        why: "The lid traps steam so the tops cook without you flipping them.",
        timerSec: 240,
      },
      {
        title: "Finish in the pan",
        say: "Kill the heat. Crumble the feta, tear the cilantro, and drag the bread through the pan. Eat it from the skillet.",
        detail: "Don't plate it. Fewer dishes, and the sauce stays hot.",
        howMuch: "All the feta you have. A small handful of cilantro.",
        heat: "Off.",
        why: "Residual heat melts the cheese without turning the yolks chalky.",
      },
    ],
  },
  {
    id: "spinach-toast",
    name: "Spinach yogurt toast",
    minutes: 10,
    servings: "1",
    summary: "The spinach and the yogurt are both on short clocks. Wilt, salt, pile onto the heel of bread.",
    assumes: "Salt, pepper, and a pan.",
    plate: "A thick piece of toast, white yogurt, a pile of wilted spinach, pepper, on a chipped plate.",
    needs: [
      { match: ["spinach"], label: "Spinach" },
      { match: ["yogurt"], label: "Yogurt" },
      { match: ["sourdough", "bread", "tortilla"], label: "Bread" },
    ],
    subs: [
      { hear: ["yogurt"], line: "Sour cream works. In a real pinch, salt the spinach harder and skip the dairy." },
      { hear: ["spinach", "green"], line: "Any soft green. Even the sad salad mix. Hard kale needs another minute and a splash of water." },
      { hear: ["bread", "sourdough", "tortilla"], line: "Eat the spinach and yogurt from a mug. Bread is the crunch, not the point." },
    ],
    steps: [
      {
        title: "Wilt the spinach",
        say: "Put the spinach in a dry pan with a splash of water. Stir until it collapses, about two minutes.",
        detail: "Tip out the water. Wet greens make sad toast.",
        howMuch: "The rest of the clamshell. Two tablespoons of water.",
        heat: "Medium-high.",
        why: "Spinach is mostly water. You want the leaf, not the puddle.",
        timerSec: 120,
      },
      {
        title: "Salt the yogurt",
        say: "While that cools, stir a pinch of salt and some pepper into the yogurt.",
        detail: "Taste it. It should be savory, not dessert.",
        howMuch: "About half a cup of yogurt.",
        why: "Plain yogurt tastes unfinished until it has salt.",
      },
      {
        title: "Toast the heel",
        say: "Wipe the pan. Toast the bread in it until both sides have some color.",
        detail: "No oil needed if the pan is already slick from other nights.",
        howMuch: "The sourdough heel, or two slices.",
        heat: "Medium.",
        timerSec: 180,
      },
      {
        title: "Pile it",
        say: "Spread the yogurt, pile on the spinach, and eat it over the sink if you have to.",
        detail: "Pepper on top. A squeeze of lime if the floor has one.",
        howMuch: "All of the spinach you wilted.",
        why: "The yogurt cools the greens so you can eat now, not in ten minutes.",
      },
    ],
  },
  {
    id: "fried-rice",
    name: "Rescue fried rice",
    minutes: 12,
    servings: "1 generous bowl",
    summary: "Cold rice is a clock and a food-safety problem. Get every grain steaming hot.",
    assumes: "Oil, salt, and a skillet. Soy sauce if the kitchen has it.",
    plate: "A bowl of fried rice with scrambled egg, red pepper, and cilantro, steam visible.",
    needs: [
      { match: ["rice"], label: "Cooked rice" },
      { match: ["egg"], label: "Eggs" },
      { match: ["pepper"], label: "Bell pepper", optional: true },
      { match: ["cilantro"], label: "Cilantro", optional: true },
    ],
    subs: [
      { hear: ["egg"], line: "No egg and it's still fried rice. Add the pepper and salt harder." },
      { hear: ["pepper"], line: "Onion, spinach, or whatever vegetable is closest to the bin." },
      { hear: ["cilantro"], line: "Skip it. Fry the rice anyway." },
      { hear: ["soy"], line: "Salt and a few drops of vinegar. Soy is optional." },
    ],
    steps: [
      {
        title: "Check the rice",
        say: "This only works if the rice was refrigerated, not left on the counter. If it sat out for hours, bin it and log the loss.",
        detail: "Cool rice from the fridge is what you want. Warm rice that never got cold is the risk.",
        howMuch: "One bowl, about two cups.",
        why: "Reheated rice has to have been cold first. That's the whole safety check.",
      },
      {
        title: "Scramble, then remove",
        say: "Scramble an egg in a little oil. Slide it onto a plate the second it sets.",
        detail: "Don't brown it. It goes back in at the end.",
        howMuch: "One or two eggs.",
        heat: "Medium-high.",
        why: "Eggs cooked with the rice turn into rubber. They want their own minute.",
      },
      {
        title: "Sear the pepper",
        say: "Add the pepper to the same pan. Sear it until the edges blister, about two minutes.",
        detail: "Keep it moving. You want char, not stew.",
        howMuch: "Half a pepper is plenty.",
        heat: "High.",
        timerSec: 120,
      },
      {
        title: "Get the rice hot",
        say: "Add the cold rice. Press it flat, leave it ten seconds, then toss. Do that until every grain is steaming and separate.",
        detail: "If it clumps, a teaspoon of water and another press. Salt it.",
        howMuch: "The whole leftover bowl.",
        heat: "High.",
        why: "Steam is the test. Hot on the outside and cold in the middle doesn't count.",
        timerSec: 180,
      },
      {
        title: "Eggs back in",
        say: "Return the egg, kill the heat, and fold in the cilantro. Eat it from the pan if the bowl is dirty.",
        detail: "Soy at the end, not the start, so it doesn't scorch.",
        howMuch: "A small handful of cilantro.",
        heat: "Off.",
      },
    ],
  },
  {
    id: "banana-mug",
    name: "Banana yogurt mug",
    minutes: 4,
    servings: "1",
    summary: "The bananas are the emergency. Slice them into cold yogurt before they turn the corner.",
    assumes: "A mug and a spoon.",
    plate: "A chipped mug of yogurt with browned banana coins and a torn piece of bread.",
    needs: [
      { match: ["banana"], label: "Bananas" },
      { match: ["yogurt"], label: "Yogurt", optional: true },
      { match: ["sourdough", "bread", "tortilla"], label: "Bread", optional: true },
    ],
    subs: [
      { hear: ["yogurt"], line: "No yogurt: mash the banana onto toast with a pinch of salt. Still counts." },
      { hear: ["bread"], line: "Skip the bread. The mug is the meal." },
    ],
    steps: [
      {
        title: "Slice, don't mush",
        say: "Slice the bananas into coins. Brown spots are fine. Mold is not — those go in the bin.",
        detail: "If they're black and leaking, toss them and log it. Don't be a hero.",
        howMuch: "One or two bananas.",
        why: "You're checking them while you cut.",
      },
      {
        title: "Into the mug",
        say: "Spoon yogurt into a mug and fold the bananas through. Salt, not sugar, if you want it to taste like food.",
        detail: "A grind of pepper is surprisingly right.",
        howMuch: "A cup of yogurt.",
        why: "The cold stops them from going further tonight.",
      },
      {
        title: "Optional crunch",
        say: "Toast the heel of bread if you want crunch. Eat the mug while it toasts.",
        detail: "That's the whole recipe. Go log it.",
        howMuch: "Whatever bread is left.",
        heat: "Toaster, or a dry pan.",
      },
    ],
  },
  {
    id: "skillet-chicken",
    name: "Skillet chicken and salsa",
    minutes: 16,
    servings: "2",
    summary: "Someone's chicken is about to turn. Sear it, drown it in salsa, make sure it's cooked through.",
    assumes: "Oil, salt, and a lid stand-in. A plate works.",
    plate: "Sliced chicken in a red salsa pan, onion, lime, tortillas on a towel.",
    needs: [
      { match: ["chicken"], label: "Chicken" },
      { match: ["salsa"], label: "Salsa", optional: true },
      { match: ["onion"], label: "Onion", optional: true },
      { match: ["lime"], label: "Lime", optional: true },
      { match: ["tortilla", "bread", "sourdough"], label: "Tortillas or bread", optional: true },
    ],
    subs: [
      { hear: ["salsa"], line: "Crushed tomatoes, or salt and a little water and the onion. You need moisture so it doesn't dry out." },
      { hear: ["onion"], line: "Pepper, or nothing. The chicken is the point." },
      { hear: ["lime"], line: "Skip it. Salt will do." },
    ],
    steps: [
      {
        title: "Smell check",
        say: "If the chicken smells sweet, sour, or like sulfur, stop. Bin it and log the loss. Rescue doesn't mean gambling.",
        detail: "Rotisserie from last night that's been cold the whole time is the case this is built for. Raw thighs need to be cooked through, no pink at the bone.",
        howMuch: "Whatever was posted, or the pack from the receipt.",
        why: "The clock is a guess. Your nose is the real sensor.",
      },
      {
        title: "Sear",
        say: "Pat it dry, salt it, and sear it in oil until it has color. Don't move it for the first two minutes.",
        detail: "Crowding the pan steams it. Do two rounds if you have to.",
        howMuch: "A thin coat of oil.",
        heat: "Medium-high.",
        timerSec: 180,
      },
      {
        title: "Salsa and cover",
        say: "Add the onion, then the salsa. Cover and cook until the meat is steaming hot and, if it's raw, no longer pink.",
        detail: "Rotisserie just needs to be hot through. Raw thighs need about eight more minutes covered.",
        howMuch: "Half the jar of salsa is plenty.",
        heat: "Medium, covered.",
        why: "The salsa is the thermometer's friend. Steam means heat got into the middle.",
        timerSec: 480,
      },
      {
        title: "Lime, then tortillas",
        say: "Kill the heat. Lime over the top. Warm a tortilla in the empty side of the pan, or just tear bread.",
        detail: "Eat it while it's loud. Chicken this close to the edge doesn't make good leftovers twice.",
        howMuch: "Half a lime.",
        heat: "Off.",
      },
    ],
  },
  {
    id: "avocado-toast",
    name: "Half-avocado toast",
    minutes: 6,
    servings: "1",
    summary: "The avocado on the floor is browning from the cut side. Salt, lime, the heel of bread.",
    assumes: "Salt. A fork.",
    plate: "Toast with mashed avocado, lime, salt flakes, torn cilantro.",
    needs: [
      { match: ["avocado"], label: "Avocado" },
      { match: ["sourdough", "bread", "tortilla"], label: "Bread" },
      { match: ["lime"], label: "Lime", optional: true },
      { match: ["cilantro"], label: "Cilantro", optional: true },
    ],
    subs: [
      { hear: ["lime"], line: "Salt and a drop of vinegar, or just salt. Acid is nice, not required." },
      { hear: ["cilantro"], line: "Skip the herbs." },
      { hear: ["bread", "sourdough"], line: "Eat it with a spoon from the skin. Slightly feral. Still counts." },
    ],
    steps: [
      {
        title: "Check the cut face",
        say: "Brown avocado is fine. Black, fizzy, or moldy is not. If it's off, log the toss.",
        detail: "Scrape the brown. Keep the green.",
        howMuch: "Half an avocado is a meal. A whole one is two.",
      },
      {
        title: "Toast",
        say: "Toast the bread in a dry pan until it has real color. Pale toast won't hold the mash.",
        detail: "Flip once.",
        howMuch: "One thick slice, or a tortilla.",
        heat: "Medium.",
        timerSec: 150,
      },
      {
        title: "Mash and salt",
        say: "Mash the avocado on the toast with a fork. Salt it more than you think. Lime and cilantro if you have them.",
        detail: "Eat it now. Mashed avocado does not wait.",
        howMuch: "A heavy pinch of salt. A squeeze of lime.",
        why: "Salt is what makes it dinner instead of a smear.",
      },
    ],
  },
]

export function recipeById(id: string) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null
}

export function rankRecipes(ingredients: Ingredient[], now: number, focus?: string | null) {
  const active = ingredients.filter((item) => item.state === "stocked" || item.state === "offered")
  const needle = focus?.trim().toLowerCase() ?? ""
  return RECIPES.map((recipe) => {
    const uses: Ingredient[] = []
    const missing: string[] = []
    let score = 0
    for (const need of recipe.needs) {
      const found = active.find(
        (item) => !uses.includes(item) && need.match.some((token) => item.name.toLowerCase().includes(token)),
      )
      if (found) {
        uses.push(found)
        const hours = Math.max(0.4, (found.expiresAt - now) / HOUR)
        const urgent = hours < 36 ? 36 / hours : 0.3
        score += urgent * (need.optional ? 0.55 : 1)
        score += footprint(found).landfillCo2eKg * 3
        if (
          needle &&
          (found.name.toLowerCase().includes(needle) || needle.includes(found.name.toLowerCase()))
        ) {
          score += 8
        }
      } else if (!need.optional) {
        missing.push(need.label)
      }
    }
    const required = recipe.needs.filter((need) => !need.optional)
    const hit = required.filter((need) =>
      uses.some((item) => need.match.some((token) => item.name.toLowerCase().includes(token))),
    ).length
    return {
      recipe,
      uses,
      missing,
      score,
      viable: hit === required.length && uses.length > 0,
    }
  })
    .filter((row) => row.viable)
    .sort((a, b) => b.score - a.score)
}

export function interpret(recipe: Recipe, step: Step, heard: string): CoachAction {
  const q = heard
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!q) {
    return { type: "say", text: "I didn't catch that. Say next, or name an ingredient you don't have." }
  }
  if (/\b(next|continue|forward|done|got it|go on)\b/.test(q)) return { type: "next" }
  if (/\b(back|previous)\b/.test(q)) return { type: "back" }
  if (/\b(repeat|again|pardon|huh)\b/.test(q) || q === "what") return { type: "repeat" }
  if (/\b(stop talking|be quiet|pause|mute|never mind|nevermind)\b/.test(q)) return { type: "pause" }
  if (/\b(how much|how many|amount|quantity)\b/.test(q)) return { type: "say", text: step.howMuch }
  if (/\b(how hot|heat|temperature|burner|flame)\b/.test(q)) {
    return { type: "say", text: step.heat ?? "Keep it at medium unless this step says otherwise." }
  }
  if (/\b(why|what for|the point)\b/.test(q)) {
    return { type: "say", text: step.why ?? "So the next step has something worth eating." }
  }
  for (const sub of recipe.subs) {
    if (sub.hear.some((token) => q.includes(token))) return { type: "say", text: sub.line }
  }
  if (/\b(timer|set a timer|start timer)\b/.test(q) || /\d+\s*min/.test(q)) {
    const match = q.match(/(\d+)\s*min/)
    const seconds = match ? Math.min(90, Number(match[1])) * 60 : (step.timerSec ?? 120)
    return { type: "timer", seconds }
  }
  if (/\b(instead|substitute|without|don't have|dont have|do not have)\b/.test(q)) {
    const names = recipe.subs.map((sub) => sub.hear[0]).join(", ")
    return { type: "say", text: `Name the ingredient. For this meal you can ask about ${names}.` }
  }
  return {
    type: "say",
    text: "Say next, back, or repeat. You can also ask how much, how hot, or why.",
  }
}

function shelf(partial: Omit<Ingredient, "state" | "source" | "addedAt"> & { source?: Ingredient["source"] }): Ingredient {
  return {
    ...partial,
    state: "stocked",
    source: partial.source ?? "fridge",
    addedAt: Date.now() - 26 * HOUR,
  }
}

function atHour(daysAgo: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 12, 0, 0)
  return date.getTime()
}

function seedHistory(): ImpactEvent[] {
  const past = [
    { name: "Bananas", category: "produce" as const, priceUsd: 0.8 },
    { name: "Cooked rice", category: "grain" as const, priceUsd: 0.9 },
    { name: "Greek yogurt", category: "dairy" as const, priceUsd: 1.1 },
    { name: "Baby spinach", category: "produce" as const, priceUsd: 1.6 },
    { name: "Sourdough", category: "grain" as const, priceUsd: 0.7 },
    { name: "Rotisserie chicken", category: "protein" as const, priceUsd: 2.8 },
    { name: "Eggs", category: "protein" as const, priceUsd: 0.8 },
    { name: "Oat milk", category: "other" as const, priceUsd: 0.9 },
  ]
  const kept = [480, 220, 610, 340, 190, 720, 260, 540, 300, 410, 180, 660, 390]
  const wasted = [0, 80, 0, 0, 120, 0, 90, 0, 0, 140, 0, 0, 70]
  const events: ImpactEvent[] = []
  kept.forEach((grams, index) => {
    const ago = 13 - index
    const item = past[index % past.length]
    const keptFp = footprint({ name: item.name, grams, category: item.category })
    const kind = index % 3 === 0 ? "rescued" : "cooked"
    events.push({
      id: `hist-kept-${ago}`,
      at: atHour(ago, 19),
      kind,
      name: item.name,
      grams,
      category: item.category,
      priceUsd: Number(((item.priceUsd * grams) / 180).toFixed(2)),
      co2eKg: keptFp.landfillCo2eKg,
      methaneEmittedKg: 0,
      embodiedCo2eKg: keptFp.embodiedCo2eKg,
      waterL: keptFp.waterL,
    })
    events.push({
      id: `hist-log-${ago}`,
      at: atHour(ago, 11),
      kind: "logged",
      name: item.name,
      grams: grams + wasted[index],
      category: item.category,
      priceUsd: 0,
      co2eKg: 0,
      methaneEmittedKg: 0,
      embodiedCo2eKg: 0,
      waterL: 0,
    })
    if (wasted[index] > 0) {
      const lost = past[(index + 3) % past.length]
      const lostFp = footprint({ name: lost.name, grams: wasted[index], category: lost.category })
      events.push({
        id: `hist-waste-${ago}`,
        at: atHour(ago, 22),
        kind: "wasted",
        name: lost.name,
        grams: wasted[index],
        category: lost.category,
        priceUsd: Number(((lost.priceUsd * wasted[index]) / 180).toFixed(2)),
        co2eKg: 0,
        methaneEmittedKg: lostFp.landfillCo2eKg,
        embodiedCo2eKg: lostFp.embodiedCo2eKg,
        waterL: lostFp.waterL,
      })
    }
  })
  return events
}

export type ScriptStep =
  | {
      type: "item"
      poster: string
      name: string
      quantityLabel: string
      grams: number
      category: Category
      priceUsd: number
      hours: number
      note: string
      safety?: string
    }
  | { type: "note"; author: string; text: string }

export const SCRIPT: ScriptStep[] = [
  {
    type: "item",
    poster: "Jordan",
    name: "Avocado",
    quantityLabel: "half, cut side browning",
    grams: 140,
    category: "produce",
    priceUsd: 1.5,
    hours: 5,
    note: "Half is plenty. The cut face is already going.",
  },
  {
    type: "note",
    author: "Mina",
    text: "I can bring hot sauce and a second pan if someone hosts.",
  },
  {
    type: "item",
    poster: "Alex",
    name: "Coconut milk",
    quantityLabel: "opened can",
    grams: 200,
    category: "other",
    priceUsd: 1.1,
    hours: 16,
    note: "Opened it for a curry I didn't cook.",
  },
  {
    type: "note",
    author: "Sam",
    text: "Save a plate. I'm walking over from the study room.",
  },
]

export function applyScript(state: KitchenState, step: ScriptStep, now = Date.now()): KitchenState {
  if (step.type === "note") {
    const note: RoomNote = { id: uid("note"), at: now, author: step.author, text: step.text }
    return {
      ...state,
      notes: [note, ...state.notes],
      lastScriptAt: now,
      scriptIndex: state.scriptIndex + 1,
      toast: { id: note.id, title: `${step.author} in the Bursley room`, body: step.text },
    }
  }
  const rescue: Rescue = {
    id: uid("rescue"),
    name: step.name,
    quantityLabel: step.quantityLabel,
    grams: step.grams,
    category: step.category,
    priceUsd: step.priceUsd,
    expiresAt: now + step.hours * HOUR,
    poster: step.poster,
    at: now,
    note: step.note,
    safety: step.safety,
  }
  return {
    ...state,
    rescues: [rescue, ...state.rescues],
    lastScriptAt: now,
    scriptIndex: state.scriptIndex + 1,
    toast: {
      id: rescue.id,
      title: `${rescue.poster} put ${rescue.name.toLowerCase()} on the floor`,
      body: rescue.note,
    },
  }
}

export function publishUrgent(state: KitchenState, now = Date.now(), options?: { silent?: boolean }): KitchenState {
  const due = state.ingredients.filter((item) => {
    if (item.state !== "stocked" || item.source === "rescue") return false
    if (item.expiresAt - now >= URGENT_HOURS * HOUR) return false
    return !state.rescues.some((rescue) => rescue.ingredientId === item.id && !rescue.claimedBy)
  })
  if (due.length === 0) return state
  const posts: Rescue[] = due.map((item) => ({
    id: `post-${item.id}`,
    ingredientId: item.id,
    name: item.name,
    quantityLabel: item.quantityLabel,
    grams: item.grams,
    category: item.category,
    priceUsd: item.priceUsd,
    expiresAt: item.expiresAt,
    poster: YOU.name,
    at: now,
    note: "Under 24 hours on my shelf. Take it if you'll cook it.",
    safety: item.safety,
  }))
  const ids = new Set(due.map((item) => item.id))
  return {
    ...state,
    ingredients: state.ingredients.map((item) => (ids.has(item.id) ? { ...item, state: "offered" as const } : item)),
    rescues: [...posts, ...state.rescues],
    toast: options?.silent
      ? state.toast
      : {
          id: uid("broadcast"),
          title: due.length === 1 ? `${due[0].name} is on the floor` : `${due.length} things under 24 hours are on the floor`,
          body: "Bursley 3 can claim them.",
        },
  }
}

export function createInitial(): KitchenState {
  const now = Date.now()
  const opening: KitchenState = {
    version: STATE_VERSION,
    hosting: false,
    scriptIndex: 0,
    lastScriptAt: now - 10_000,
    toast: null,
    events: seedHistory(),
    notes: [
      {
        id: "note-priya-seed",
        at: now - 25 * 60 * 1000,
        author: "Priya",
        text: "If someone takes the skillet, I can walk the chicken down.",
      },
    ],
    rescues: [
      {
        id: "rescue-bananas",
        name: "Bananas",
        quantityLabel: "a spotted bunch",
        grams: 420,
        category: "produce",
        priceUsd: 1.2,
        expiresAt: now + 3 * HOUR,
        poster: "Sam",
        at: now - 18 * 60 * 1000,
        note: "Too sweet for one person. Take the bunch.",
      },
      {
        id: "rescue-chicken",
        name: "Rotisserie chicken",
        quantityLabel: "half a bird",
        grams: 340,
        category: "protein",
        priceUsd: 4.5,
        expiresAt: now + 9 * HOUR,
        poster: "Priya",
        at: now - 40 * 60 * 1000,
        note: "Ate half last night. It's been in the fridge since.",
        safety: "Reheat until steaming. If it smells sweet or sour, don't take it.",
      },
    ],
    ingredients: [
      shelf({
        id: "ing-cilantro",
        name: "Cilantro",
        quantityLabel: "1 bunch",
        grams: 35,
        category: "produce",
        priceUsd: 0.89,
        expiresAt: now + 5 * HOUR,
        note: "Already wilting in the door.",
      }),
      shelf({
        id: "ing-tomatoes",
        name: "Cherry tomatoes",
        quantityLabel: "1 pint",
        grams: 340,
        category: "produce",
        priceUsd: 3.49,
        expiresAt: now + 8 * HOUR,
        note: "A few are softening.",
      }),
      shelf({
        id: "ing-rice",
        name: "Cooked rice",
        quantityLabel: "leftover bowl",
        grams: 400,
        category: "grain",
        priceUsd: 1.1,
        expiresAt: now + 11 * HOUR,
        safety: "Only if it was refrigerated. Get it steaming hot all the way through.",
        note: "From Tuesday's pot. It's been cold.",
      }),
      shelf({
        id: "ing-spinach",
        name: "Baby spinach",
        quantityLabel: "half clamshell",
        grams: 140,
        category: "produce",
        priceUsd: 2.49,
        expiresAt: now + 16 * HOUR,
      }),
      shelf({
        id: "ing-yogurt",
        name: "Greek yogurt",
        quantityLabel: "2 cups left",
        grams: 300,
        category: "dairy",
        priceUsd: 1.79,
        expiresAt: now + 20 * HOUR,
      }),
      shelf({
        id: "ing-bread",
        name: "Sourdough heel",
        quantityLabel: "3 slices",
        grams: 160,
        category: "grain",
        priceUsd: 1.5,
        expiresAt: now + 22 * HOUR,
      }),
      shelf({
        id: "ing-eggs",
        name: "Eggs",
        quantityLabel: "6 eggs",
        grams: 300,
        category: "protein",
        priceUsd: 2.4,
        expiresAt: now + 72 * HOUR,
      }),
      shelf({
        id: "ing-pepper",
        name: "Bell pepper",
        quantityLabel: "1",
        grams: 170,
        category: "produce",
        priceUsd: 1.29,
        expiresAt: now + 54 * HOUR,
      }),
      shelf({
        id: "ing-feta",
        name: "Feta",
        quantityLabel: "half block",
        grams: 110,
        category: "dairy",
        priceUsd: 3.2,
        expiresAt: now + 96 * HOUR,
      }),
      shelf({
        id: "ing-oat",
        name: "Oat milk",
        quantityLabel: "half carton",
        grams: 500,
        category: "other",
        priceUsd: 2.1,
        expiresAt: now + 140 * HOUR,
      }),
    ],
  }
  return publishUrgent(opening, now, { silent: true })
}

export function keepDemoAlive(state: KitchenState, now = Date.now()): KitchenState {
  const times: number[] = []
  for (const item of state.ingredients) {
    if (item.state === "stocked" || item.state === "offered") times.push(item.expiresAt)
  }
  for (const rescue of state.rescues) {
    if (!rescue.claimedBy) times.push(rescue.expiresAt)
  }
  const base = { ...state, toast: null }
  if (times.length === 0) return base
  const soonest = Math.min(...times)
  if (soonest > now + 20 * 60 * 1000) return base
  const shift = now + 6 * HOUR - soonest
  return {
    ...base,
    ingredients: state.ingredients.map((item) =>
      item.state === "stocked" || item.state === "offered"
        ? { ...item, expiresAt: item.expiresAt + shift }
        : item,
    ),
    rescues: state.rescues.map((rescue) =>
      rescue.claimedBy ? rescue : { ...rescue, expiresAt: rescue.expiresAt + shift },
    ),
  }
}

export function isKitchenState(value: unknown): value is KitchenState {
  if (!value || typeof value !== "object") return false
  const state = value as KitchenState
  return state.version === STATE_VERSION && Array.isArray(state.ingredients) && Array.isArray(state.events)
}
