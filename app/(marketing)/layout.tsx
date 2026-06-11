import type { ReactNode } from "react"
import { LanguageProvider } from "@/components/marketing/LanguageProvider"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-surface text-on-surface" style={{ scrollBehavior: "smooth" }}>
        {children}
      </div>
    </LanguageProvider>
  )
}
