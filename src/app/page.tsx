import type { Metadata } from "next"
import { Kitchen } from "@/components/kitchen"

export const metadata: Metadata = { title: "Kitchen" }

export default function Page() {
  return <Kitchen />
}
