/** Opening scene for bursley-floor-3. Keep the shelf in step with src/lib/kitchen.ts. */

export const ROOM = "bursley-floor-3"
export const YOU = "Kavitha"
export const HOUR = 3_600_000n
const MINUTE = 60_000n

export type SeedIngredient = {
  id: string
  name: string
  quantityLabel: string
  grams: number
  category: string
  priceUsd: number
  hours: number
  note?: string
  safety?: string
}

export type SeedRescue = {
  id: string
  name: string
  quantityLabel: string
  grams: number
  category: string
  priceUsd: number
  hours: number
  poster: string
  minutesAgo: number
  note: string
  safety?: string
}

export type SeedNote = {
  id: string
  author: string
  text: string
  minutesAgo: number
}

export type SeedEvent = {
  id: string
  atMs: bigint
  kind: string
  name: string
  grams: number
  category: string
  priceUsd: number
  co2eKg: number
  methaneEmittedKg: number
  embodiedCo2eKg: number
  waterL: number
}

export const OPENING_INGREDIENTS: SeedIngredient[] = [
  { id: "ing-cilantro", name: "Cilantro", quantityLabel: "1 bunch", grams: 35, category: "produce", priceUsd: 0.89, hours: 5, note: "Already wilting in the door." },
  { id: "ing-tomatoes", name: "Cherry tomatoes", quantityLabel: "1 pint", grams: 340, category: "produce", priceUsd: 3.49, hours: 8, note: "A few are softening." },
  { id: "ing-rice", name: "Cooked rice", quantityLabel: "leftover bowl", grams: 400, category: "grain", priceUsd: 1.1, hours: 11, safety: "Only if it was refrigerated. Get it steaming hot all the way through.", note: "From Tuesday's pot. It's been cold." },
  { id: "ing-spinach", name: "Baby spinach", quantityLabel: "half clamshell", grams: 140, category: "produce", priceUsd: 2.49, hours: 16 },
  { id: "ing-yogurt", name: "Greek yogurt", quantityLabel: "2 cups left", grams: 300, category: "dairy", priceUsd: 1.79, hours: 20 },
  { id: "ing-bread", name: "Sourdough heel", quantityLabel: "3 slices", grams: 160, category: "grain", priceUsd: 1.5, hours: 22 },
  { id: "ing-eggs", name: "Eggs", quantityLabel: "6 eggs", grams: 300, category: "protein", priceUsd: 2.4, hours: 72 },
  { id: "ing-pepper", name: "Bell pepper", quantityLabel: "1", grams: 170, category: "produce", priceUsd: 1.29, hours: 54 },
  { id: "ing-feta", name: "Feta", quantityLabel: "half block", grams: 110, category: "dairy", priceUsd: 3.2, hours: 96 },
  { id: "ing-oat", name: "Oat milk", quantityLabel: "half carton", grams: 500, category: "other", priceUsd: 2.1, hours: 140 },
]

export const OPENING_RESCUES: SeedRescue[] = [
  {
    id: "rescue-bananas",
    name: "Bananas",
    quantityLabel: "a spotted bunch",
    grams: 420,
    category: "produce",
    priceUsd: 1.2,
    hours: 3,
    poster: "Sam",
    minutesAgo: 18,
    note: "Too sweet for one person. Take the bunch.",
  },
  {
    id: "rescue-chicken",
    name: "Rotisserie chicken",
    quantityLabel: "half a bird",
    grams: 340,
    category: "protein",
    priceUsd: 4.5,
    hours: 9,
    poster: "Priya",
    minutesAgo: 40,
    note: "Ate half last night. It's been in the fridge since.",
    safety: "Reheat until steaming. If it smells sweet or sour, don't take it.",
  },
]

export const OPENING_NOTES: SeedNote[] = [
  {
    id: "note-priya-seed",
    author: "Priya",
    text: "If someone takes the skillet, I can walk the chicken down.",
    minutesAgo: 25,
  },
]

export type ScriptStep =
  | {
      type: "item"
      poster: string
      name: string
      quantityLabel: string
      grams: number
      category: string
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
  { type: "note", author: "Mina", text: "I can bring hot sauce and a second pan if someone hosts." },
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
  { type: "note", author: "Sam", text: "Save a plate. I'm walking over from the study room." },
]

const NAMED = [
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

const CATEGORY: Record<string, { co2e: number; water: number }> = {
  produce: { co2e: 0.7, water: 320 },
  dairy: { co2e: 3.2, water: 1020 },
  protein: { co2e: 6.1, water: 4300 },
  grain: { co2e: 1.6, water: 1640 },
  other: { co2e: 1.2, water: 500 },
}

const LANDFILL = 0.58

export function footprint(name: string, grams: number, category: string) {
  const found = NAMED.find((factor) => name.toLowerCase().includes(factor.test))
  const factor = found ?? CATEGORY[category] ?? CATEGORY.other
  const kg = grams / 1000
  return {
    embodiedCo2eKg: kg * factor.co2e,
    waterL: kg * factor.water,
    landfillCo2eKg: kg * LANDFILL,
  }
}

function atHour(nowMs: bigint, daysAgo: number, hour: number) {
  const day = 86_400_000n
  const midnight = nowMs - (nowMs % day)
  return midnight - BigInt(daysAgo) * day + BigInt(hour) * HOUR + 12n * MINUTE
}

export function historyEvents(nowMs: bigint): SeedEvent[] {
  const past = [
    { name: "Bananas", category: "produce", priceUsd: 0.8 },
    { name: "Cooked rice", category: "grain", priceUsd: 0.9 },
    { name: "Greek yogurt", category: "dairy", priceUsd: 1.1 },
    { name: "Baby spinach", category: "produce", priceUsd: 1.6 },
    { name: "Sourdough", category: "grain", priceUsd: 0.7 },
    { name: "Rotisserie chicken", category: "protein", priceUsd: 2.8 },
    { name: "Eggs", category: "protein", priceUsd: 0.8 },
    { name: "Oat milk", category: "other", priceUsd: 0.9 },
  ]
  const kept = [480, 220, 610, 340, 190, 720, 260, 540, 300, 410, 180, 660, 390]
  const wasted = [0, 80, 0, 0, 120, 0, 90, 0, 0, 140, 0, 0, 70]
  const events: SeedEvent[] = []
  kept.forEach((grams, index) => {
    const ago = 13 - index
    const item = past[index % past.length]
    const keptFp = footprint(item.name, grams, item.category)
    const kind = index % 3 === 0 ? "rescued" : "cooked"
    events.push({
      id: `hist-kept-${ago}`,
      atMs: atHour(nowMs, ago, 19),
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
      atMs: atHour(nowMs, ago, 11),
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
      const lostFp = footprint(lost.name, wasted[index], lost.category)
      events.push({
        id: `hist-waste-${ago}`,
        atMs: atHour(nowMs, ago, 22),
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

export function minutesAgo(nowMs: bigint, minutes: number) {
  return nowMs - BigInt(minutes) * MINUTE
}
