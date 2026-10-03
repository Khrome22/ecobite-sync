"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

function subscribe() {
  return () => {}
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const ready = useSyncExternalStore(subscribe, () => true, () => false)
  const dark = ready && resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  )
}
