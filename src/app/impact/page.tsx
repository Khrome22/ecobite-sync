import type { Metadata } from "next"
import { ImpactBoard } from "@/components/impact-board"

export const metadata: Metadata = { title: "Impact" }

export default function Page() {
  return <ImpactBoard />
}
