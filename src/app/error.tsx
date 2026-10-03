"use client"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="font-serif text-4xl">The kitchen hit a snag.</h1>
      <p className="text-muted-foreground">The shelf data didn’t load cleanly. Try again, or reset the demo from the sidebar.</p>
      <button type="button" onClick={reset} className="rounded-lg bg-lime px-4 py-2 text-sm text-primary-foreground">
        Try again
      </button>
    </div>
  )
}
