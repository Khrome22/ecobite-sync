"use client"

import dynamic from "next/dynamic"

const ClientProviders = dynamic(() => import("@/components/providers").then((mod) => mod.Providers), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div>
        <p className="text-xs tracking-[0.22em] text-moss uppercase">EcoBite</p>
        <p className="mt-3 font-serif text-4xl">Opening the Bursley fridge…</p>
      </div>
    </div>
  ),
})

export function ClientRoot({ children }: { children: React.ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>
}
