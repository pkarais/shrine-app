"use client"

import Image from "next/image"
import Link from "next/link"
import { useTheme } from "@/components/theme/ThemeProvider"
import { useLanguage } from "./LanguageProvider"
import { Sun, Moon, Languages, ArrowLeft } from "lucide-react"

export function MarketingNav() {
  const { isDarkMode, setTheme } = useTheme()
  const { lang, setLang, t } = useLanguage()

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-[#071426]/90 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-4 md:flex-row">
        <Link href="/about" className="flex items-center gap-3 font-extrabold tracking-wide">
          <Image src="/images/logo-white.png" alt="Shrine Ops" width={40} height={40} priority />
          <span>Shrine Ops</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#43d7ff]/60 bg-[#43d7ff]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#43d7ff] hover:bg-[#43d7ff]/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("navBackToDashboard")}
          </Link>
          <Link href="/about" className="opacity-90 hover:text-[#43d7ff]">{t("navOverview")}</Link>
          <Link href="/about/blog/introducing-shrine-ops" className="opacity-90 hover:text-[#43d7ff]">{t("navBlog")}</Link>
          <Link href="/about/archive" className="opacity-90 hover:text-[#43d7ff]">{t("navArchive")}</Link>
          <Link href="/login" className="opacity-90 hover:text-[#43d7ff]">{t("navStaffSignIn")}</Link>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "el" : "en")}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-white/20"
            aria-label="Toggle language"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "en" ? "Ελληνικά" : "English"}
          </button>
          <button
            type="button"
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 p-2 hover:bg-white/20"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  )
}

export function MarketingFooter() {
  const { t } = useLanguage()
  return (
    <footer className="bg-[#030a14] px-6 py-9 text-white/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/images/logo-white.png" alt="Shrine Ops" width={28} height={28} />
          <strong className="text-white">Shrine Ops</strong>
        </div>
        <span className="max-w-xl text-sm">{t("footerNote")}</span>
      </div>
    </footer>
  )
}
