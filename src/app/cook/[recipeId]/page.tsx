import type { Metadata } from "next"
import { VoiceChef } from "@/components/voice-chef"

export const metadata: Metadata = { title: "Voice chef" }

export default function Page() {
  return <VoiceChef />
}
