import type { Metadata, Viewport } from "next"
import { Manrope, Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { WakeUpAlarmMonitor } from "@/components/WakeUpAlarmMonitor"
import { ShiftLifecycleMonitor } from "@/components/ShiftLifecycleMonitor"
import { RecognitionMonitor } from "@/components/RecognitionMonitor"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Shrine Ops - Landmark Management",
  description: "Operational management system for the National Shrine",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface font-body min-h-screen selection:bg-secondary-container selection:text-on-secondary-container">
        <div className="fixed top-0 left-0 w-full h-1 gold-accents z-[100]" />
        <ThemeProvider>
          {children}
          <WakeUpAlarmMonitor />
          <ShiftLifecycleMonitor />
          <RecognitionMonitor />
        </ThemeProvider>
      </body>
    </html>
  )
}
