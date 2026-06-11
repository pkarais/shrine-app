"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { SOPUploader } from "@/components/sops/SOPUploader"
import { SOPViewer } from "@/components/sops/SOPViewer"
import { FileText, Shield } from "lucide-react"
import { getSOPCategories } from "@/lib/actions/sops"

const SOPS_CACHE_KEY = "shrine.sops.cache.v1"

export default function SOPsPage() {
  const [isManager, setIsManager] = useState(false)
  const [activeTab, setActiveTab] = useState<"view" | "upload">("view")
  const [categories, setCategories] = useState<string[]>(() => {
    // Hydrate categories synchronously from sessionStorage so the page paints
    // instantly on repeat visits within the same session.
    if (typeof window === "undefined") return []
    try {
      const raw = window.sessionStorage.getItem(SOPS_CACHE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed?.categories) ? parsed.categories : []
    } catch {
      return []
    }
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(() => {
    // If we already have cached categories we can skip the loading skeleton.
    if (typeof window === "undefined") return true
    return !window.sessionStorage.getItem(SOPS_CACHE_KEY)
  })

  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createClient()
      // Fire role lookup and categories in parallel instead of a 3-step waterfall.
      const [{ data: { user } }, cats] = await Promise.all([
        supabase.auth.getUser(),
        getSOPCategories(),
      ])
      if (cancelled) return

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        if (!cancelled) setIsManager(profile?.role === "manager")
      }

      setCategories(cats)
      setLoading(false)

      // Cache for the rest of the session.
      try {
        window.sessionStorage.setItem(
          SOPS_CACHE_KEY,
          JSON.stringify({ categories: cats, ts: Date.now() })
        )
      } catch {
        /* ignore quota errors */
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <>
        <TopAppBar />
        <main className="max-w-6xl mx-auto px-4 pt-24 pb-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-surface-container rounded-full" />
            <div className="h-32 bg-surface-container rounded-2xl" />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <TopAppBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-10 sm:pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Standard Operating Procedures</h1>
            <p className="text-sm text-on-surface-variant">
              {isManager
                ? "Manage SOP documents for the operations team"
                : "View and access standard operating procedures"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        {isManager && (
          <div className="flex gap-1 mb-6 bg-surface-container-high rounded-xl p-1">
            <button
              onClick={() => setActiveTab("view")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                activeTab === "view"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <FileText className="w-4 h-4" /> View SOPs
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                activeTab === "upload"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Shield className="w-4 h-4" /> Upload SOP
            </button>
          </div>
        )}

        {/* Content */}
        {activeTab === "view" ? (
          <SOPViewer isManager={isManager} key={refreshKey} />
        ) : (
          <div className="space-y-6">
            <SOPUploader
              categories={categories}
              onUploaded={() => {
                setRefreshKey((k) => k + 1)
                setActiveTab("view")
              }}
            />
          </div>
        )}
      </main>
    </>
  )
}
