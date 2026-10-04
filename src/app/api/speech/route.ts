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

  const local = await localAudio(text)
  if (!local) return Response.json({ ok: false, reason: "silent" }, { status: 502 })

  return new Response(new Uint8Array(local.body), {
    headers: {
      "Content-Type": local.type,
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
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.38, similarity_boost: 0.82, style: 0.28, use_speaker_boost: true },
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

async function localAudio(text: string) {
  const dir = await mkdtemp(join(tmpdir(), "ecobite-voice-"))
  try {
    const mp3 = join(dir, "line.mp3")
    const neural = await run("python3", [
      "-m",
      "edge_tts",
      "--voice",
      "en-US-JennyNeural",
      "--rate=-6%",
      "--text",
      text,
      "--write-media",
      mp3,
    ])
    if (neural) {
      const body = await readFile(mp3)
      if (body.byteLength > 200) return { body, type: "audio/mpeg" }
    }

    const wav = join(dir, "line.wav")
    const macVoices = ["Samantha", "Ava", "Allison", "Victoria"]
    const spoken =
      process.platform === "darwin"
        ? await macSay(wav, text, macVoices)
        : (await run("espeak-ng", ["-w", wav, "-v", "en-us+f3", "-s", "138", "-p", "42", text])) ||
          (await run("espeak", ["-w", wav, "-v", "en-us+f3", "-s", "138", text]))
    if (!spoken) return null
    const body = await readFile(wav)
    return body.byteLength > 44 ? { body, type: "audio/wav" } : null
  } catch {
    return null
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function macSay(file: string, text: string, voices: string[]) {
  for (const voice of voices) {
    const ok = await run("say", ["-v", voice, "-r", "168", "-o", file, "--file-format=WAVE", "--data-format=LEI16@22050", text])
    if (ok) return true
  }
  return run("say", ["-r", "168", "-o", file, "--file-format=WAVE", "--data-format=LEI16@22050", text])
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
