import path from "node:path"
import { createWorker, type Worker } from "tesseract.js"
import { parseReceiptPhoto, type ParseResult } from "@/lib/kitchen"

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
  const parsed = parseReceiptPhoto(text)
  if (parsed.items.length === 0) return null
  const fridge = mode === "fridge"
  const result: ParseResult = {
    ...parsed,
    kind: fridge ? "fridge" : "receipt",
    title: fridge ? "Fridge photo" : "Receipt photo",
  }
  return result
}
