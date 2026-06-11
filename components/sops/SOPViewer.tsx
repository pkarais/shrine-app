"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { getSOPs, getSOPSignedUrls, deleteSOP, getSOPCategories } from "@/lib/actions/sops"
import { FileText, Search, X, FolderOpen, Trash2, Download, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"

// Dynamic import with ssr:false prevents react-pdf/pdfjs from running during
// Next.js prerendering (where browser APIs like DOMMatrix are unavailable).
const PDFRenderer = dynamic(
  () => import("./PDFRenderer").then(m => m.PDFRenderer),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )}
)

interface SOPDocument {
  id: string
  title: string
  category: string
  description: string | null
  source_type: string
  file_path: string | null
  external_link: string | null
  file_name: string | null
  file_size: number | null
  uploader_name: string
  created_at: string
}

interface SOPViewerProps {
  isManager?: boolean
}

export function SOPViewer({ isManager = false }: SOPViewerProps) {
  const cacheKey = "shrine.sopviewer.cache.v1"
  type CacheShape = { docs: SOPDocument[]; cats: string[]; urls: Record<string, string>; category: string; ts: number }
  const initialCache: CacheShape | null = (() => {
    if (typeof window === "undefined") return null
    try {
      const raw = window.sessionStorage.getItem(cacheKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as CacheShape
      // Signed URLs are 60-min TTL; only trust cache if < 50 min old.
      if (Date.now() - (parsed.ts || 0) > 50 * 60 * 1000) return null
      return parsed
    } catch {
      return null
    }
  })()

  const [sops, setSops] = useState<SOPDocument[]>(initialCache?.docs ?? [])
  const [categories, setCategories] = useState<string[]>(initialCache?.cats ?? [])
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCache?.category ?? "")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(!initialCache)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>(initialCache?.urls ?? {})
  const [viewingSop, setViewingSop] = useState<SOPDocument | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const latestReqRef = useRef(0)

  const load = useCallback(async () => {
    // Background refresh: don't blank the UI if we already have cached data.
    if (sops.length === 0) setLoading(true)
    try {
      const [docs, cats] = await Promise.all([
        getSOPs(selectedCategory || undefined),
        getSOPCategories(),
      ])
      setSops(docs)
      setCategories(cats)

      // Pre-fetch all signed URLs in one batch so View is instant
      const filePaths = docs
        .filter(d => d.source_type !== "external" && d.file_path)
        .map(d => d.file_path as string)
      let nextUrls: Record<string, string> = {}
      if (filePaths.length > 0) {
        nextUrls = await getSOPSignedUrls(filePaths)
        setSignedUrls(nextUrls)
      } else {
        setSignedUrls({})
      }

      // Persist for instant next-visit hydration.
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              docs,
              cats,
              urls: nextUrls,
              category: selectedCategory || "",
              ts: Date.now(),
            } as CacheShape)
          )
        }
      } catch {
        /* ignore quota */
      }
    } catch (e) {
      console.error("Failed to load SOPs:", e)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, sops.length])

  useEffect(() => {
    load()
  }, [load])

  async function handleView(sop: SOPDocument) {
    // External links open directly in new tab
    if (sop.source_type === "external" && sop.external_link) {
      window.open(sop.external_link, "_blank", "noopener,noreferrer")
      return
    }

    setViewingSop(sop)
    setPdfError(null)
    setPdfUrl(null)

    const filePath = sop.file_path?.replace(/^\/+/, "")
    if (!filePath) {
      setPdfLoading(false)
      setPdfError("No file on record.")
      return
    }

    // Use pre-fetched signed URL if available — instant, no round-trip needed
    const cached = signedUrls[filePath]
    if (cached) {
      setPdfUrl(cached)
      setPdfLoading(false)
      return
    }

    const reqId = ++latestReqRef.current
    setPdfLoading(true)
    try {
      const urls = await getSOPSignedUrls([filePath])
      if (reqId !== latestReqRef.current) return // stale click guard

      const url = urls[filePath]
      if (!url) {
        setPdfError("Could not load PDF. Try downloading instead.")
        return
      }
      setPdfUrl(url)
      // Cache fetched URL locally so subsequent opens are instant
      setSignedUrls((prev) => ({ ...prev, [filePath]: url }))
    } catch (e: any) {
      if (reqId !== latestReqRef.current) return
      setPdfError(e?.message || "Failed to load PDF.")
    } finally {
      if (reqId === latestReqRef.current) setPdfLoading(false)
    }
  }

  async function handleDelete(sop: SOPDocument) {
    if (!confirm(`Delete "${sop.title}"? This cannot be undone.`)) return
    setDeleting(sop.id)
    try {
      await deleteSOP(sop.id)
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const filteredSops = sops.filter((sop) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      sop.title.toLowerCase().includes(q) ||
      sop.category.toLowerCase().includes(q) ||
      (sop.description && sop.description.toLowerCase().includes(q))
    )
  })

  // Group by category
  const grouped = filteredSops.reduce((acc, sop) => {
    if (!acc[sop.category]) acc[sop.category] = []
    acc[sop.category].push(sop)
    return acc
  }, {} as Record<string, SOPDocument[]>)

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SOPs by title, category, or description..."
            className="w-full pl-10 pr-4 py-3 bg-surface-container-high rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          )}
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 bg-surface-container-high rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* SOP List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-container-high rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSops.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 mx-auto text-on-surface-variant opacity-30 mb-3" />
          <p className="text-sm text-on-surface-variant">
            {searchQuery ? "No matching SOPs found" : "No SOPs uploaded yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, docs]) => (
            <div key={category} className="bg-surface-container-low rounded-2xl overflow-hidden">
              <button
                onClick={() => {
                  setExpandedCategories((prev) => {
                    const next = new Set(prev)
                    if (next.has(category)) next.delete(category)
                    else next.add(category)
                    return next
                  })
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <h4 className="font-bold text-on-surface">{category}</h4>
                  <span className="text-xs text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
                    {docs.length}
                  </span>
                </div>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                )}
              </button>

              {expandedCategories.has(category) && (
                <div className="divide-y divide-[var(--outline-variant)]/20">
                  {docs.map((sop) => (
                    <div
                      key={sop.id}
                      className="flex items-center justify-between p-4 hover:bg-surface-container transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => handleView(sop)}
                          className="text-left"
                        >
                          <p className="font-medium text-on-surface text-sm hover:text-primary transition-colors flex items-center gap-2">
                            {sop.title}
                            {sop.source_type === "external" && (
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                Link
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {sop.source_type === "external" ? "External link" : formatFileSize(sop.file_size)} · Uploaded {new Date(sop.created_at).toLocaleDateString()} by {sop.uploader_name}
                          </p>
                          {sop.description && (
                            <p className="text-xs text-on-surface-variant/70 mt-1 line-clamp-1">
                              {sop.description}
                            </p>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => handleView(sop)}
                          className="p-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                          title={sop.source_type === "external" ? "Open Link" : "View PDF"}
                        >
                          {sop.source_type === "external" ? <ExternalLink className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </button>
                        {isManager && (
                          <button
                            onClick={() => handleDelete(sop)}
                            disabled={deleting === sop.id}
                            className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewingSop && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col" style={{ height: "90vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--outline-variant)]/30 shrink-0">
              <div className="min-w-0 mr-4">
                <h3 className="font-bold text-on-surface truncate">{viewingSop.title}</h3>
                <p className="text-xs text-on-surface-variant">{viewingSop.category}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pdfUrl && (
                  <>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Open in tab
                    </a>
                    <a
                      href={pdfUrl}
                      download={viewingSop.file_name || viewingSop.title}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                  </>
                )}
                <button
                  onClick={() => { setViewingSop(null); setPdfUrl(null); setPdfError(null) }}
                  className="p-2 rounded-full hover:bg-surface-container transition-colors"
                >
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-surface-container-low relative">
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-on-surface-variant">Loading document…</p>
                  </div>
                </div>
              )}

              {pdfError && (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="text-center max-w-sm">
                    <FileText className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-on-surface mb-1">Could not render PDF</p>
                    <p className="text-xs text-on-surface-variant mb-4">{pdfError}</p>
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" /> Open in new tab
                      </a>
                    )}
                  </div>
                </div>
              )}

              {pdfUrl && !pdfError && (
                <PDFRenderer url={pdfUrl} onError={(msg) => setPdfError(msg)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
