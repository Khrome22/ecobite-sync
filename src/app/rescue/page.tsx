import type { Metadata } from "next"
import { RescueBoard } from "@/components/rescue-board"

export const metadata: Metadata = { title: "Rescue" }

export default function Page() {
  return <RescueBoard />
}
