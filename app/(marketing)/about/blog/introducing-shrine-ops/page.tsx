"use client"

import { MarketingNav, MarketingFooter } from "@/components/marketing/MarketingNav"
import { useLanguage } from "@/components/marketing/LanguageProvider"

export default function IntroducingShrineOpsPage() {
  const { t } = useLanguage()
  return (
    <>
      <MarketingNav />
      <article className="mx-auto max-w-4xl bg-surface px-6 py-16 md:py-20">
        <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d8b35a]">
          {t("articleEyebrow")}
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-on-surface md:text-6xl">
          {t("articleTitle")}
        </h1>
        <p className="mt-3 text-sm font-bold text-on-surface-variant">{t("articleMeta")}</p>

        <Body>{t("articleP1")}</Body>
        <Body>{t("articleP2")}</Body>

        <blockquote
          className="my-8 rounded-r-2xl border-l-[5px] border-[#d8b35a] bg-[#fff9e8] px-6 py-3 font-extrabold text-[#332500] dark:bg-[#3a2d05] dark:text-[#fff9e8]"
        >
          {t("articleBlockquote")}
        </blockquote>

        <H2>{t("articleH2Why")}</H2>
        <Body>{t("articleWhy")}</Body>
        <Body>{t("articleWhy2")}</Body>

        <H2>{t("articleH2One")}</H2>
        <Body>{t("articleOne")}</Body>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-on-surface-variant">
          <li>{t("articleQ1")}</li>
          <li>{t("articleQ2")}</li>
          <li>{t("articleQ3")}</li>
          <li>{t("articleQ4")}</li>
          <li>{t("articleQ5")}</li>
          <li>{t("articleQ6")}</li>
          <li>{t("articleQ7")}</li>
          <li>{t("articleQ8")}</li>
        </ul>

        <H2>{t("articleH2Payroll")}</H2>
        <Body>{t("articlePayroll")}</Body>
        <Body>{t("articlePayroll2")}</Body>

        <H2>{t("articleH2Comms")}</H2>
        <Body>{t("articleComms")}</Body>

        <H2>{t("articleH2Recog")}</H2>
        <Body>{t("articleRecog")}</Body>
        <Body>{t("articleRecog2")}</Body>

        <H2>{t("articleH2Future")}</H2>
        <Body>{t("articleFuture")}</Body>
        <Body>{t("articleFuture2")}</Body>
      </article>
      <MarketingFooter />
    </>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl font-black tracking-tight text-on-surface md:text-3xl">{children}</h2>
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">{children}</p>
}
