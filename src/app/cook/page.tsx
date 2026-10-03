import type { Metadata } from "next"
import { Suspense } from "react"
import { CookList } from "@/components/cook-list"

export const metadata: Metadata = { title: "Cook" }

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Pulling meals from the shelf…</p>}>
      <CookList />
    </Suspense>
  )
}
