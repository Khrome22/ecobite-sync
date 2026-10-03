import type { Metadata, Viewport } from "next"
import { Figtree, Geist_Mono, Instrument_Serif } from "next/font/google"
import { ClientRoot } from "@/components/client-root"
import "./globals.css"

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
})

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
})

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "EcoBite",
    template: "%s · EcoBite",
  },
  description:
    "Real-time kitchen companion for a dorm floor. Scan what's dying, cook it hands-free, and share the rest before it hits the trash.",
}

export const viewport: Viewport = {
  themeColor: "#f7f4ec",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${instrument.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
