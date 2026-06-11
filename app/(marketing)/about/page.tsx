"use client"

import Link from "next/link"
import { MarketingNav, MarketingFooter } from "@/components/marketing/MarketingNav"
import { useLanguage } from "@/components/marketing/LanguageProvider"

export default function AboutPage() {
  const { t } = useLanguage()

  return (
    <>
      <MarketingNav />
      <main>
        {/* Hero */}
        <section
          className="relative overflow-hidden px-6 py-24 text-white md:px-[6vw] md:py-32"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(67,215,255,.35), transparent 28%), radial-gradient(circle at 80% 10%, rgba(216,179,90,.32), transparent 24%), linear-gradient(135deg, #03101f 0%, #071426 55%, #0b2450 100%)",
          }}
        >
          <div className="relative mx-auto max-w-5xl">
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d8b35a]">
              {t("heroEyebrow")}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-tight md:text-7xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-white/80 md:text-xl">{t("heroBody")}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/about/blog/introducing-shrine-ops"
                className="rounded-full px-6 py-3 font-extrabold text-white shadow-[0_0_28px_rgba(67,215,255,.38)]"
                style={{ background: "linear-gradient(135deg, #43d7ff, #0b5fff)" }}
              >
                {t("ctaReadLaunch")}
              </Link>
              <a
                href="#breakdown"
                className="rounded-full border border-white/20 bg-white/10 px-6 py-3 font-extrabold text-white hover:bg-white/15"
              >
                {t("ctaExplore")}
              </a>
            </div>
          </div>
        </section>

        {/* Breakdown */}
        <section id="breakdown" className="bg-surface px-6 py-20 md:px-[6vw]">
          <div className="mx-auto max-w-7xl">
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              {t("breakdownKicker")}
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-on-surface md:text-5xl">
              {t("breakdownTitle")}
            </h2>
            <p className="mt-5 max-w-4xl text-lg text-on-surface-variant">{t("breakdownLead")}</p>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              <Card badge={t("cardDailyCommand")} title={t("cardStaffDashboard")} body={t("cardStaffDashboardBody")} />
              <Card badge={t("cardLeadership")} title={t("cardManagerCenter")} body={t("cardManagerCenterBody")} />
              <Card badge={t("cardBuildingCare")} title={t("cardTickets")} body={t("cardTicketsBody")} />
            </div>
          </div>
        </section>

        {/* Ties */}
        <section className="px-6 py-20 text-white md:px-[6vw]" style={{ background: "#071426" }}>
          <div className="mx-auto max-w-7xl">
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#43d7ff]">
              {t("tiesKicker")}
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{t("tiesTitle")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {["feat1", "feat2", "feat3", "feat4", "feat5", "feat6", "feat7", "feat8"].map((k) => (
                <div key={k} className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 font-bold">
                  {t(k as any)}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payroll */}
        <section className="bg-surface px-6 py-20 md:px-[6vw]">
          <div className="mx-auto max-w-7xl">
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              {t("payrollKicker")}
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-on-surface md:text-5xl">
              {t("payrollTitle")}
            </h2>
            <p className="mt-5 max-w-4xl text-lg text-on-surface-variant">{t("payrollLead")}</p>
            <div className="mt-8 grid max-w-3xl gap-5">
              <Step n={1} title={t("step1Title")} body={t("step1Body")} />
              <Step n={2} title={t("step2Title")} body={t("step2Body")} />
              <Step n={3} title={t("step3Title")} body={t("step3Body")} />
            </div>
          </div>
        </section>

        {/* Recognition */}
        <section id="recognition" className="px-6 py-20 text-white md:px-[6vw]" style={{ background: "#071426" }}>
          <div className="mx-auto max-w-7xl">
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#43d7ff]">
              {t("recogKicker")}
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{t("recogTitle")}</h2>
            <p className="mt-5 max-w-4xl text-lg text-white/75">{t("recogLead")}</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <CardDark badge={t("badgeBadges")} title={t("badgeAchievements")} body={t("badgeAchievementsBody")} />
              <CardDark badge={t("badgeLeaderboard")} title={t("badgeHealthy")} body={t("badgeHealthyBody")} />
              <CardDark badge={t("badgeEOTM")} title={t("badgeEOTMTitle")} body={t("badgeEOTMBody")} />
            </div>
          </div>
        </section>

        {/* Latest */}
        <section className="bg-surface px-6 py-20 md:px-[6vw]">
          <div className="mx-auto max-w-5xl">
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              {t("latestKicker")}
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-on-surface md:text-5xl">
              {t("latestTitle")}
            </h2>
            <Link
              href="/about/blog/introducing-shrine-ops"
              className="mt-6 block rounded-3xl border border-outline-variant/40 bg-surface-container p-8 shadow-lg transition hover:shadow-xl"
            >
              <div className="text-sm font-bold text-on-surface-variant">{t("launchMeta")}</div>
              <h3 className="mt-2 text-2xl font-black text-on-surface">{t("launchCardTitle")}</h3>
              <p className="mt-2 text-on-surface-variant">{t("launchCardBody")}</p>
            </Link>
            <Link
              href="/about/archive"
              className="mt-5 block rounded-3xl border border-outline-variant/40 bg-surface-container p-8 shadow-lg transition hover:shadow-xl"
            >
              <div className="text-sm font-bold text-on-surface-variant">{t("archiveCardMeta")}</div>
              <h3 className="mt-2 text-2xl font-black text-on-surface">{t("archiveCardTitle")}</h3>
              <p className="mt-2 text-on-surface-variant">{t("archiveCardBody")}</p>
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}

function Card({ badge, title, body }: { badge: string; title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-outline-variant/40 bg-surface-container p-7 shadow-lg">
      <span className="inline-block rounded-full bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary">
        {badge}
      </span>
      <h3 className="mt-3 text-xl font-black text-on-surface">{title}</h3>
      <p className="mt-2 text-on-surface-variant">{body}</p>
    </article>
  )
}

function CardDark({ badge, title, body }: { badge: string; title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-white/15 bg-white/[0.07] p-7 text-white">
      <span className="inline-block rounded-full bg-[#43d7ff]/15 px-3 py-1.5 text-xs font-extrabold text-[#43d7ff]">
        {badge}
      </span>
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-2 text-white/75">{body}</p>
    </article>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-start gap-4">
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl text-lg font-black text-[#3b2a00]"
        style={{ background: "linear-gradient(135deg, #d8b35a, #fff2b3)" }}
      >
        {n}
      </div>
      <div>
        <h3 className="text-xl font-black text-on-surface">{title}</h3>
        <p className="mt-1 text-on-surface-variant">{body}</p>
      </div>
    </div>
  )
}
