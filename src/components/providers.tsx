"use client"

import { Toaster } from "@/components/ui/sonner"
import { StoreProvider } from "@/lib/store"
import { Shell } from "@/components/shell"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Shell>{children}</Shell>
      <Toaster position="top-center" />
    </StoreProvider>
  )
}
