import type { Metadata } from "next"
import { ScanStudio } from "@/components/scan-studio"

export const metadata: Metadata = { title: "Scan" }

export default function Page() {
  return <ScanStudio />
}
