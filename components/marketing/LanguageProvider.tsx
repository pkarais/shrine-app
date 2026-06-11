"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { marketingStrings, type Lang, type MarketingStringKey } from "@/lib/i18n/marketing-strings"

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: MarketingStringKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en")

  useEffect(() => {
    const stored = localStorage.getItem("marketingLang") as Lang | null
    if (stored === "en" || stored === "el") setLangState(stored)
  }, [])

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem("marketingLang", next)
    } catch {}
  }

  const t = (key: MarketingStringKey) => {
    const entry = marketingStrings[key]
    if (!entry) return key
    return entry[lang] ?? entry.en
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider")
  return ctx
}
