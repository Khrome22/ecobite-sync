"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, useSyncExternalStore } from "react"
import { ChartColumn, Flame, Radio, Refrigerator, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { YOU } from "@/lib/kitchen"
import { spacetimeMode, subscribeSpacetimeMode, type SpacetimeMode } from "@/lib/live-path"
import { useKitchen } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Kitchen", icon: Refrigerator },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/cook", label: "Cook", icon: Flame },
  { href: "/rescue", label: "Rescue", icon: Radio },
  { href: "/impact", label: "Impact", icon: ChartColumn },
]

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-2xl bg-[#b8dce4] text-sm font-semibold text-[#29495c]">
        E
      </span>
      <span className="leading-tight">
        <span className="block font-serif text-xl tracking-tight">EcoBite</span>
        <span className="block text-[11px] text-muted-foreground">Bursley floor 3</span>
      </span>
    </Link>
  )
}

function LivePill({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
      <span className="live-dot size-1.5 rounded-full bg-lime" />
      {count === 0 ? "Floor quiet" : `${count} up for grabs`}
    </span>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { state, reset } = useKitchen()
  const [open, setOpen] = useState(false)
  const [keys, setKeys] = useState<{
    gemini: boolean
    eleven: boolean
    spacetime: boolean
    neon: boolean
    tiger: boolean
  } | null>(null)
  const roomMode = useSyncExternalStore(subscribeSpacetimeMode, spacetimeMode, () => "off" as SpacetimeMode)
  const openCount = state.rescues.filter((rescue) => !rescue.claimedBy).length

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then((data: { gemini: boolean; eleven: boolean; spacetime: boolean; neon: boolean; tiger: boolean }) => setKeys(data))
      .catch(() => setKeys({ gemini: false, eleven: false, spacetime: false, neon: false, tiger: false }))
  }, [])

  const roomLabel = !keys?.spacetime
    ? "Room: this server"
    : roomMode === "live"
      ? "Spacetime live"
      : roomMode === "booth"
        ? "Spacetime unreachable"
        : "Spacetime connecting"

  const itemClass = (href: string) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
    return cn(
      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
      active ? "bg-lime text-primary-foreground" : "text-foreground/80 hover:bg-muted",
    )
  }

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar px-4 py-5 md:flex">
        <Logo />
        <div className="mt-6">
          <LivePill count={openCount} />
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className={itemClass(item.href)}>
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
            <p>One shared kitchen</p>
            <p>
              {keys?.gemini ? "Gemini live" : "Vision: booth samples"}
              {" · "}
              {keys?.eleven ? "ElevenLabs live" : "Voice: local"}
            </p>
            <p>
              {roomLabel}
              {" · "}
              {keys?.neon ? "Neon live" : "Shelf: local"}
              {" · "}
              {keys?.tiger ? "Tiger live" : "Impact: local"}
            </p>
          </div>
          <div>
            <p className="text-sm">{YOU.name}</p>
            <p className="text-xs text-muted-foreground">
              {YOU.dorm} {YOU.room}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => setOpen(true)}>
              Reset demo kitchen
            </Button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LivePill count={openCount} />
        </div>
      </header>

      <div className="md:pl-60">
        <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 pb-32 md:px-8 md:py-8 md:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px]",
                active ? "text-lime" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the demo kitchen?</DialogTitle>
            <DialogDescription>
              Puts the shelf, the floor, and today&apos;s chart back to the opening scene. Use it between rehearsals.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep cooking
            </Button>
            <Button
              onClick={() => {
                reset()
                setOpen(false)
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
