import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let elevenDownUntil = 0

export async function POST(request: Request) {
  let text = ""
  try {
    const body = (await request.json()) as { text?: unknown }
    text = typeof body.text === "string" ? body.text.trim().slice(0, 700) : ""
  } catch {
    return Response.json({ ok: false, reason: "bad-json" }, { status: 400 })
  }
  if (!text) return Response.json({ ok: false, reason: "empty" }, { status: 400 })

  const streamed = await elevenLabs(text)
  if (streamed) return streamed

  const wav = await localWav(text)
  if (!wav) return Response.json({ ok: false, reason: "silent" }, { status: 502 })

  return new Response(new Uint8Array(wav), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
      "x-ecobite-voice": "local",
    },
  })
}

async function elevenLabs(text: string) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key || Date.now() < elevenDownUntil) return null

  const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"
  try {
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
      signal: AbortSignal.timeout(4000),
    })
    if (!upstream.ok) {
      elevenDownUntil = Date.now() + 5 * 60 * 1000
      return null
    }
    const audio = await upstream.arrayBuffer()
    if (audio.byteLength < 64) return null
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "x-ecobite-voice": "eleven",
      },
    })
  } catch {
    elevenDownUntil = Date.now() + 5 * 60 * 1000
    return null
  }
}

async function localWav(text: string) {
  const dir = await mkdtemp(join(tmpdir(), "ecobite-voice-"))
  const file = join(dir, "line.wav")
  try {
    const spoken =
      process.platform === "darwin"
        ? await run("say", ["-o", file, "--file-format=WAVE", "--data-format=LEI16@22050", text])
        : (await run("espeak-ng", ["-w", file, "-v", "en-us", "-s", "150", text])) ||
          (await run("espeak", ["-w", file, "-v", "en-us", "-s", "150", text]))
    if (!spoken) return null
    const wav = await readFile(file)
    return wav.byteLength > 44 ? wav : null
  } catch {
    return null
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}

function run(command: string, args: string[]) {
  return new Promise<boolean>((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" })
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve(false)
    }, 8000)
    child.on("error", () => {
      clearTimeout(timer)
      resolve(false)
    })
    child.on("close", (status) => {
      clearTimeout(timer)
      resolve(status === 0)
    })
  })
}
