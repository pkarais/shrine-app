"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, ExternalLink, Download, Newspaper } from "lucide-react"
import { MarketingNav, MarketingFooter } from "@/components/marketing/MarketingNav"
import { useLanguage } from "@/components/marketing/LanguageProvider"
import { fetchOperationsBriefArchive } from "@/lib/operations-brief-api"

export default function MarketingArchivePage() {
  const { t, lang } = useLanguage()
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const data = await fetchOperationsBriefArchive()
        if (mounted) setIssues((data ?? []).filter((i: any) => i.status === "published"))
      } catch (err: any) {
        if (mounted) setError(err?.message ?? "Unable to load archive.")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const locale = lang === "el" ? "el-GR" : "en-US"

  return (
    <>
      <MarketingNav />
      <main className="bg-surface px-6 py-20 md:px-[6vw]">
        <div className="mx-auto max-w-4xl">
          <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
            {t("archivePageKicker")}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-on-surface md:text-5xl">
            {t("archivePageTitle")}
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-on-surface-variant">{t("archivePageLead")}</p>

          {loading && (
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container p-5 text-on-surface-variant">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("archiveLoading")}
            </div>
          )}

          {error && (
            <div className="mt-8 rounded-2xl border border-error-container bg-error-container p-5 text-on-error-container">
              {error}
            </div>
          )}

          {!loading && !error && issues.length === 0 && (
            <div className="mt-8 rounded-2xl border border-outline-variant/40 bg-surface-container p-6 text-on-surface-variant">
              {t("archiveEmpty")}
            </div>
          )}

          <div className="mt-8 space-y-5">
            {issues.map((issue) => {
              const internalHref =
                issue.website_url && issue.website_url.startsWith("/")
                  ? issue.website_url
                  : `/brief/${issue.slug}`
              return (
                <article
                  key={issue.id}
                  className="rounded-3xl border border-outline-variant/40 bg-surface-container p-7 shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-primary p-3 text-on-primary">
                      <Newspaper className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                        {new Date(issue.issue_month).toLocaleDateString(locale, {
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <h2 className="mt-1 text-xl font-black text-on-surface md:text-2xl">{issue.title}</h2>
                      {issue.opening_message && (
                        <p className="mt-2 line-clamp-3 text-on-surface-variant">{issue.opening_message}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={internalHref}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-on-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t("archiveOpenPost")}
                        </Link>
                        {issue.pdf_url && (
                          <a
                            href={issue.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-on-secondary"
                          >
                            <Download className="h-4 w-4" />
                            {t("archiveDownloadPdf")}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  )
}
