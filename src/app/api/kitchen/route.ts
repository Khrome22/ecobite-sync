import { currentState, dispatch, parseAction, readyRoom } from "@/lib/server-kitchen"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  await readyRoom()
  return Response.json(currentState())
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, reason: "bad-json" }, { status: 400 })
  }
  const action = parseAction(body)
  if (!action) return Response.json({ ok: false, reason: "bad-action" }, { status: 400 })
  try {
    const state = await dispatch(action)
    return Response.json(state)
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, reason: "room" }, { status: 500 })
  }
}
