"use client"

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { StoreProvider } from "@/lib/store"
import { Shell } from "@/components/shell"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ecobite-theme" disableTransitionOnChange>
      <StoreProvider>
        <Shell>{children}</Shell>
        <Toaster position="top-center" />
      </StoreProvider>
    </ThemeProvider>
  )
}
