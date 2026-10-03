import { readImpact } from "@/lib/db"
import { readyRoom } from "@/lib/server-kitchen"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  await readyRoom()
  const report = await readImpact()
  return Response.json(report)
}
