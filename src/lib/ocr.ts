import path from "node:path"
import { createWorker, type Worker } from "tesseract.js"
import { parsePantryList, parseReceiptText, type ParseResult } from "@/lib/kitchen"

const globalOcr = globalThis as typeof globalThis & { __ecobiteOcr?: Promise<Worker> }

function worker() {
  if (!globalOcr.__ecobiteOcr) {
    globalOcr.__ecobiteOcr = createWorker("eng", 1, {
      cachePath: path.join(process.cwd(), "data", "ocr"),
    }).catch((error) => {
      globalOcr.__ecobiteOcr = undefined
      throw error
    })
  }
  return globalOcr.__ecobiteOcr
}

export async function readPrintedText(bytes: Buffer) {
  const engine = await worker()
  const { data } = await engine.recognize(bytes)
  return data.text ?? ""
}

export function itemsFromPrintedText(text: string, mode: "receipt" | "fridge"): ParseResult | null {
  const receipt = parseReceiptText(text)
  const list = parsePantryList(text)
  const best = receipt.items.length >= list.items.length ? receipt : list
  const noise = /\b(market|grocery|receipt|thank|customer|visa|debit|approved|cashier|total|subtotal)\b/i
  const items = best.items.filter((item) => !noise.test(item.name))
  if (items.length === 0) return null
  const fridge = mode === "fridge"
  return {
    kind: fridge ? "fridge" : best.kind === "paste" ? "receipt" : best.kind,
    title: fridge ? "Fridge photo" : "Receipt photo",
    place: "Printed words on your photo",
    model: "on-device text",
    items,
  }
}
