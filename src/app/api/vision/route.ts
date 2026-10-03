import { type Category, type ParseResult, type ParsedItem } from "@/lib/kitchen"

const CATEGORIES = new Set<Category>(["produce", "dairy", "protein", "grain", "other"])

const PROMPT = `You are a kitchen inventory parser for a student dorm. Look at this image. It is either a grocery receipt or a refrigerator shelf.
Return only JSON with this shape:
{
  "kind": "receipt" | "fridge" | "unknown",
  "items": [
    {
      "name": "string",
      "quantityLabel": "string",
      "grams": number,
      "category": "produce" | "dairy" | "protein" | "grain" | "other",
      "hoursToExpire": number,
      "priceUsd": number,
      "note": "string, optional",
      "safety": "string, optional"
    }
  ]
}
Estimate edible grams and a conservative home-fridge shelf life in hours from now. Leftovers, opened jars, and raw poultry get short clocks. If you cannot read the image, return kind unknown and items [].`

function asItems(value: unknown): ParsedItem[] {
  if (!value || typeof value !== "object") return []
  const items = (value as { items?: unknown }).items
  if (!Array.isArray(items)) return []
  return items.flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const item = row as Record<string, unknown>
    if (typeof item.name !== "string" || item.name.trim().length < 2) return []
    const category = CATEGORIES.has(item.category as Category) ? (item.category as Category) : "other"
    const grams = Number(item.grams)
    const hours = Number(item.hoursToExpire)
    const price = Number(item.priceUsd)
    const parsed: ParsedItem = {
      ticket: item.name.trim().toUpperCase(),
      name: item.name.trim(),
      quantityLabel: typeof item.quantityLabel === "string" && item.quantityLabel ? item.quantityLabel : "1",
      grams: Number.isFinite(grams) && grams > 0 ? Math.round(grams) : 100,
      category,
      hoursToExpire: Number.isFinite(hours) && hours > 0 ? Math.round(hours) : 72,
      priceUsd: Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0,
    }
    if (typeof item.note === "string" && item.note) parsed.note = item.note
    if (typeof item.safety === "string" && item.safety) parsed.safety = item.safety
    return [parsed]
  })
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return Response.json({ ok: false, reason: "no-key" })

  let file: File | null = null
  try {
    const form = await request.formData()
    const image = form.get("image")
    file = image instanceof File ? image : null
  } catch {
    return Response.json({ ok: false, reason: "bad-form" }, { status: 400 })
  }
  if (!file) return Response.json({ ok: false, reason: "no-image" }, { status: 400 })
  if (file.size > 4_000_000) return Response.json({ ok: false, reason: "too-large" }, { status: 400 })
  if (file.type && !file.type.startsWith("image/")) {
    return Response.json({ ok: false, reason: "not-image" }, { status: 400 })
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const bytes = Buffer.from(await file.arrayBuffer())
  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: file.type || "image/jpeg",
                  data: bytes.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    },
  )

  if (!upstream.ok) {
    const detail = (await upstream.text()).slice(0, 240)
    return Response.json({ ok: false, reason: "upstream", detail }, { status: 502 })
  }

  const payload = (await upstream.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? ""
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return Response.json({ ok: false, reason: "unreadable" }, { status: 422 })
  }
  const items = asItems(parsed)
  if (items.length === 0) return Response.json({ ok: false, reason: "empty" }, { status: 422 })
  const kind = (parsed as { kind?: string }).kind === "fridge" ? "fridge" : "receipt"
  const result: ParseResult = {
    kind,
    title: kind === "fridge" ? "Fridge photo" : "Receipt photo",
    place: "Gemini",
    model,
    items,
  }
  return Response.json({ ok: true, result })
}
