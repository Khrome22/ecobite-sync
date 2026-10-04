import { saveRoom } from "@/lib/db"
import { isKitchenState } from "@/lib/kitchen"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Spacetime clients post the committed room here so Neon and Tiger stay in step. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, reason: "bad-json" }, { status: 400 })
  }
  if (!isKitchenState(body)) return Response.json({ ok: false, reason: "bad-state" }, { status: 400 })
  try {
    await saveRoom({ ...body, toast: null })
    return Response.json({ ok: true })
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, reason: "persist" }, { status: 500 })
  }
}
