import { neonUrl, spacetimeConfig, tigerUrl } from "@/lib/env"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET() {
  return Response.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    eleven: Boolean(process.env.ELEVENLABS_API_KEY),
    spacetime: Boolean(spacetimeConfig()),
    neon: Boolean(neonUrl()),
    tiger: Boolean(tigerUrl()),
  })
}
