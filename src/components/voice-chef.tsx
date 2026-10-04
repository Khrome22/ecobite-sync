"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plate } from "@/components/plate"
import { formatKg, footprint, formatMoney, interpret, recipeById } from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"
import { cn } from "@/lib/utils"

type Phase = "idle" | "speaking" | "listening"
type VoiceLine = "browser" | "local" | "eleven" | "silent" | null

type SpeechResult = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechEvent = {
  resultIndex: number
  results: { length: number; [index: number]: SpeechResult }
}

type Rec = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getRecognition() {
  if (typeof window === "undefined") return null
  const root = window as Window & {
    SpeechRecognition?: new () => Rec
    webkitSpeechRecognition?: new () => Rec
  }
  const Ctor = root.SpeechRecognition ?? root.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

const SILENT =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="

function englishVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => /^en([-_]|$)/i.test(voice.lang))
  return (
    english.find((voice) => voice.localService && /samantha|karen|moira|daniel|serena|alex/i.test(voice.name)) ??
    english.find((voice) => voice.localService) ??
    english.find((voice) => /samantha|karen|aria/i.test(voice.name)) ??
    english[0] ??
    null
  )
}

function speakWithBrowser(text: string, hold: { current: SpeechSynthesisUtterance | null }) {
  const synth = window.speechSynthesis
  return new Promise<boolean>((resolve) => {
    const start = () => {
      const utterance = new SpeechSynthesisUtterance(text)
      hold.current = utterance
      utterance.rate = 0.98
      utterance.volume = 1
      utterance.voice = englishVoice(synth.getVoices())
      let settled = false
      const finish = (ok: boolean) => {
        if (settled) return
        settled = true
        resolve(ok)
      }
      utterance.onend = () => finish(true)
      utterance.onerror = () => finish(false)
      synth.resume()
      synth.speak(utterance)
      window.setTimeout(() => {
        if (!synth.speaking && !synth.pending) finish(false)
      }, 1500)
    }
    window.setTimeout(() => {
      if (synth.getVoices().length > 0) {
        start()
        return
      }
      const onVoices = () => {
        synth.removeEventListener("voiceschanged", onVoices)
        start()
      }
      synth.addEventListener("voiceschanged", onVoices)
      window.setTimeout(() => {
        synth.removeEventListener("voiceschanged", onVoices)
        start()
      }, 400)
    }, 80)
  })
}

function endsAfter(seconds: number) {
  return Date.now() + seconds * 1000
}

export function VoiceChef() {
  const params = useParams<{ recipeId: string }>()
  const router = useRouter()
  const { state, logMeal } = useKitchen()
  const recipe = recipeById(params.recipeId)
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("idle")
  const [handsFree, setHandsFree] = useState(false)
  const [heard, setHeard] = useState("")
  const [reply, setReply] = useState("")
  const [voiceLine, setVoiceLine] = useState<VoiceLine>(null)
  const [micNote, setMicNote] = useState("")
  const [timerEnds, setTimerEnds] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [finished, setFinished] = useState(false)
  const [started, setStarted] = useState(false)

  const handsRef = useRef(handsFree)
  const stepRef = useRef(stepIndex)
  const finishedRef = useRef(finished)
  const recRef = useRef<Rec | null>(null)
  const playerRef = useRef<HTMLAudioElement | null>(null)
  const unlockedRef = useRef<Promise<void>>(Promise.resolve())
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const mounted = useRef(true)
  const skipEleven = useRef(false)
  const rang = useRef<number | null>(null)

  const active = state.ingredients.filter((item) => item.state === "stocked" || item.state === "offered")
  const uses =
    recipe?.needs.flatMap((need) => {
      const found = active.find(
        (item) => need.match.some((token) => item.name.toLowerCase().includes(token)),
      )
      return found ? [found] : []
    }) ?? []
  const uniqueUses = uses.filter((item, index) => uses.findIndex((other) => other.id === item.id) === index)

  function stopListen() {
    try {
      recRef.current?.stop()
    } catch {
      /* already stopped */
    }
    recRef.current = null
  }

  function stopSpeaking() {
    playerRef.current?.pause()
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
  }

  async function speak(text: string): Promise<VoiceLine> {
    stopListen()
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    setPhase("speaking")
    if (!skipEleven.current) {
      try {
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })
        const type = response.headers.get("content-type") ?? ""
        if (response.ok && type.includes("audio")) {
          const source = response.headers.get("x-ecobite-voice")
          const line: VoiceLine = source === "local" ? "local" : "eleven"
          const url = URL.createObjectURL(await response.blob())
          await unlockedRef.current
          const player = playerRef.current ?? new Audio()
          playerRef.current = player
          player.volume = 1
          player.onended = null
          player.onerror = null
          player.src = url
          await new Promise<void>((resolve, reject) => {
            let started = false
            const finish = (ok: boolean) => {
              URL.revokeObjectURL(url)
              player.onended = null
              player.onplaying = null
              player.onerror = null
              if (ok) resolve()
              else reject(new Error("audio"))
            }
            player.onplaying = () => {
              started = true
              setMicNote("")
              setVoiceLine(line)
            }
            player.onended = () => {
              if (started) finish(true)
            }
            player.onerror = () => finish(false)
            void player.play().catch(() => finish(false))
          })
          if (!mounted.current) return line
          setPhase("idle")
          return line
        }
      } catch {
        /* browser voice below */
      }
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPhase("idle")
      setMicNote("This browser has no speaking voice. Use the laptop that already talks.")
      return "silent"
    }
    const spoken = await speakWithBrowser(text, utteranceRef)
    if (!mounted.current) return spoken ? "browser" : "silent"
    setPhase("idle")
    if (!spoken) {
      setMicNote("This browser stayed silent. Open Terminal and run: say hello")
      return "silent"
    }
    return "browser"
  }

  function listen() {
    const recognition = getRecognition()
    if (!recognition) {
      setMicNote("This browser has no speech recognition. The buttons do the same job.")
      setHandsFree(false)
      return
    }
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      let finalText = ""
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += piece
        else interim += piece
      }
      if (interim) setHeard(interim)
      if (finalText.trim()) onHeard(finalText.trim())
    }
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicNote("Mic is blocked. Allow it, or use the buttons — Space is next.")
        setHandsFree(false)
      }
      setPhase("idle")
    }
    recognition.onend = () => {
      if (recRef.current === recognition) setPhase((current) => (current === "listening" ? "idle" : current))
    }
    recRef.current = recognition
    setPhase("listening")
    try {
      recognition.start()
    } catch {
      setPhase("idle")
    }
  }

  async function say(text: string) {
    const line = await speak(text)
    if (!mounted.current) return
    setVoiceLine(line)
    if (handsRef.current && !finishedRef.current) listen()
  }

  function go(nextIndex: number) {
    if (!recipe) return
    const clamped = Math.max(0, Math.min(recipe.steps.length - 1, nextIndex))
    setStepIndex(clamped)
    setReply("")
    setHeard("")
    void say(recipe.steps[clamped].say)
  }

  function onHeard(text: string) {
    if (!recipe) return
    setHeard(text)
    stopListen()
    const action = interpret(recipe, recipe.steps[stepRef.current], text)
    if (action.type === "next") {
      if (stepRef.current >= recipe.steps.length - 1) {
        setFinished(true)
        void say("That's the meal. If you actually ate it, log it so the chart moves.")
        return
      }
      go(stepRef.current + 1)
      return
    }
    if (action.type === "back") {
      go(stepRef.current - 1)
      return
    }
    if (action.type === "repeat") {
      void say(recipe.steps[stepRef.current].say)
      return
    }
    if (action.type === "pause") {
      setHandsFree(false)
      stopListen()
      stopSpeaking()
      setPhase("idle")
      setReply("Paused. Tap Talk when your hands are free again.")
      return
    }
    if (action.type === "timer") {
      setTimerEnds(endsAfter(action.seconds))
      const minutes = Math.round(action.seconds / 60)
      setReply(`${minutes} minute timer running.`)
      void say(`${minutes} minutes. I'll tell you when it's up.`)
      return
    }
    if (action.type === "say") {
      setReply(action.text)
      void say(action.text)
    }
  }

  function unlock() {
    if (!playerRef.current) playerRef.current = new Audio()
    const player = playerRef.current
    player.volume = 1
    player.src = SILENT
    unlockedRef.current = player.play().then(
      () => undefined,
      () => undefined,
    )
    if ("speechSynthesis" in window) {
      const blip = new SpeechSynthesisUtterance(" ")
      blip.volume = 0
      window.speechSynthesis.speak(blip)
    }
  }

  useEffect(() => {
    handsRef.current = handsFree
    stepRef.current = stepIndex
    finishedRef.current = finished
  }, [handsFree, stepIndex, finished])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stopListen()
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (!timerEnds) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [timerEnds])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return
      if (!recipe || finishedRef.current) return
      if (event.code === "Space") {
        event.preventDefault()
        onHeard("next")
      } else if (event.key.toLowerCase() === "r") {
        onHeard("repeat")
      } else if (event.key.toLowerCase() === "b") {
        onHeard("back")
      } else if (event.key.toLowerCase() === "m") {
        setHandsFree((value) => !value)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // onHeard closes over recipe; the listener is refreshed when the step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe, stepIndex, finished])

  useEffect(() => {
    if (!timerEnds || now < timerEnds || rang.current === timerEnds) return
    rang.current = timerEnds
    void say("Time's up.")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, timerEnds])

  if (!recipe) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-4xl">That meal isn&apos;t in the book.</h1>
        <Link href="/cook" className="text-lime underline underline-offset-4">
          Back to meals
        </Link>
      </div>
    )
  }

  const step = recipe.steps[stepIndex]
  const timerLeft = timerEnds ? Math.max(0, timerEnds - now) : 0
  const grams = uniqueUses.reduce((sum, item) => sum + item.grams, 0)
  const dollars = uniqueUses.reduce((sum, item) => sum + item.priceUsd, 0)
  const co2 = uniqueUses.reduce((sum, item) => sum + footprint(item).landfillCo2eKg, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/cook" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          All meals
        </Link>
        <p className="text-xs text-muted-foreground">
          {voiceLine === "silent"
            ? "No sound yet. Press Start again."
            : phase === "speaking"
              ? "Reading this step"
              : phase === "listening"
                ? "Listening"
                : "Space goes to the next step"}
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_16rem]">
        <div>
          <p className="text-xs tracking-[0.18em] text-moss uppercase">
            {recipe.minutes} min · {recipe.servings}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none md:text-5xl">{recipe.name}</h1>
          {finished ? (
            <div className="mt-8 space-y-4">
              <p className="font-serif text-3xl">That&apos;s the meal.</p>
              <p className="max-w-xl text-muted-foreground">
                {uniqueUses.length > 0
                  ? `Logging it keeps ${formatKg(grams)} in use — about ${formatMoney(dollars)} and ${formatKg(co2 * 1000)} of landfill CO2e.`
                  : "Those ingredients were already logged. The chart already has them."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-10 px-4"
                  disabled={uniqueUses.length === 0}
                  onClick={() => {
                    logMeal(uniqueUses.map((item) => item.id))
                    router.push("/impact")
                  }}
                >
                  We ate it
                </Button>
                <Button variant="outline" className="h-10 px-4" onClick={() => router.push("/cook")}>
                  Don&apos;t log it
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-6 font-mono text-sm text-lime tabular-nums">
                {String(stepIndex + 1).padStart(2, "0")} / {String(recipe.steps.length).padStart(2, "0")}
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-[1.05] text-balance md:text-6xl">{step.title}</h2>
              <p className="mt-4 max-w-2xl text-lg text-foreground/90" aria-live="polite">
                {step.say}
              </p>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{step.detail}</p>
              {!started && (
                <p className="mt-4 max-w-xl text-sm text-muted-foreground">
                  Press Start. It reads this step out loud. Then press Next.
                </p>
              )}

              {!started ? (
                <Button
                  className="mt-6 h-12 px-6 text-base"
                  onClick={() => {
                    unlock()
                    setStarted(true)
                    setHandsFree(true)
                    handsRef.current = true
                    void say(step.say)
                  }}
                >
                  Start cooking
                </Button>
              ) : (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <Button className="h-12 px-6 text-base" onClick={() => onHeard("next")}>
                    {stepIndex === recipe.steps.length - 1 ? "Finish" : "Next step"}
                  </Button>
                  <Button variant="outline" className="h-12" onClick={() => onHeard("repeat")}>
                    Hear it again
                  </Button>
                  <Button variant="outline" className="h-12" onClick={() => onHeard("back")} disabled={stepIndex === 0}>
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12"
                    aria-pressed={handsFree}
                    onClick={() => {
                      unlock()
                      if (handsFree) {
                        setHandsFree(false)
                        stopListen()
                        setPhase("idle")
                      } else {
                        setHandsFree(true)
                        if (phase !== "speaking") listen()
                      }
                    }}
                  >
                    {phase === "listening" ? "Listening…" : handsFree ? "Mic is on" : "Use the mic"}
                  </Button>
                  {step.timerSec && (
                    <Button variant="outline" className="h-12" onClick={() => onHeard("timer")}>
                      Start a {Math.round(step.timerSec / 60)} min timer
                    </Button>
                  )}
                </div>
              )}

              {started && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {recipe.subs.slice(0, 3).map((sub) => (
                    <Button key={sub.hear[0]} variant="ghost" className="text-muted-foreground" onClick={() => onHeard(`no ${sub.hear[0]}`)}>
                      No {sub.hear[0]}?
                    </Button>
                  ))}
                  <Button variant="ghost" className="text-muted-foreground" onClick={() => onHeard("how much")}>
                    How much?
                  </Button>
                  <Button variant="ghost" className="text-muted-foreground" onClick={() => onHeard("how hot")}>
                    How hot?
                  </Button>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3 text-sm">
                <span className="flex h-5 items-end gap-0.5" aria-hidden>
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span
                      key={bar}
                      className={cn("w-1 rounded-full bg-lime", phase === "speaking" ? "wave-bar h-4" : "h-1")}
                      style={{ animationDelay: `${bar * 0.12}s` }}
                    />
                  ))}
                </span>
                <span className="text-muted-foreground">
                  {phase === "speaking" ? "Speaking" : phase === "listening" ? "Listening" : started ? "Ready" : "Waiting for you"}
                </span>
              </div>
              {(heard || reply || micNote) && (
                <div className="mt-4 max-w-2xl space-y-1 rounded-2xl bg-muted/70 px-4 py-3 text-sm">
                  {heard && <p className="text-muted-foreground">Heard: {heard}</p>}
                  {reply && <p>{reply}</p>}
                  {micNote && <p className="text-amber">{micNote}</p>}
                </div>
              )}
              {timerEnds && timerLeft > 0 && (
                <p className="mt-4 font-mono text-3xl text-amber tabular-nums">
                  {String(Math.floor(timerLeft / 60000)).padStart(2, "0")}:
                  {String(Math.floor((timerLeft % 60000) / 1000)).padStart(2, "0")}
                </p>
              )}
            </>
          )}
        </div>
        <aside className="space-y-3">
          <Plate id={recipe.id} />
          <p className="text-center text-xs text-muted-foreground">Plating idea · {recipe.plate}</p>
          <p className="text-center text-xs text-muted-foreground">{recipe.assumes}</p>
        </aside>
      </div>
    </div>
  )
}
