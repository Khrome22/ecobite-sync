import { currentState, readyRoom, subscribeRoom } from "@/lib/server-kitchen"
import type { KitchenState } from "@/lib/kitchen"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  await readyRoom()
  const encoder = new TextEncoder()
  let unsubscribe = () => {}
  let ping: ReturnType<typeof setInterval> | undefined
  const stream = new ReadableStream({
    start(controller) {
      const send = (state: KitchenState) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`))
      }
      send(currentState())
      unsubscribe = subscribeRoom(send)
      ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          /* closed */
        }
      }, 15000)
    },
    cancel() {
      if (ping) clearInterval(ping)
      unsubscribe()
    },
  })
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
