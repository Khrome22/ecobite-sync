export async function POST(request: Request) {
  const key = process.env.ELEVENLABS_API_KEY
  let text = ""
  try {
    const body = (await request.json()) as { text?: unknown }
    text = typeof body.text === "string" ? body.text.trim().slice(0, 700) : ""
  } catch {
    return Response.json({ ok: false, reason: "bad-json" }, { status: 400 })
  }
  if (!text) return Response.json({ ok: false, reason: "empty" }, { status: 400 })
  if (!key) return Response.json({ ok: false, reason: "no-key" })

  const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"
  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  })

  if (!upstream.ok) {
    const detail = (await upstream.text()).slice(0, 240)
    return Response.json({ ok: false, reason: "upstream", detail }, { status: 502 })
  }

  const audio = await upstream.arrayBuffer()
  return new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  })
}
