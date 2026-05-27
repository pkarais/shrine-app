"use client"

import { useState, useEffect, useCallback } from "react"
import { getSOPs, getSOPSignedUrl, deleteSOP, getSOPCategories } from "@/lib/actions/sops"
import { FileText, Search, X, FolderOpen, Trash2, Download, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"

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
  const [sops, setSops] = useState<SOPDocument[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [viewingSop, setViewingSop] = useState<SOPDocument | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [docs, cats] = await Promise.all([
        getSOPs(selectedCategory || undefined),
        getSOPCategories(),
      ])
      setSops(docs)
      setCategories(cats)
    } catch (e) {
      console.error("Failed to load SOPs:", e)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

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
    try {
      if (sop.file_path) {
        const url = await getSOPSignedUrl(sop.file_path)
        setPdfUrl(url)
      }
    } catch (e) {
      console.error("Failed to get PDF URL:", e)
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
          <div className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--outline-variant)]/30">
              <div>
                <h3 className="font-bold text-on-surface">{viewingSop.title}</h3>
                <p className="text-xs text-on-surface-variant">{viewingSop.category}</p>
              </div>
              <div className="flex items-center gap-2">
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                )}
                <button
                  onClick={() => { setViewingSop(null); setPdfUrl(null) }}
                  className="p-2 rounded-full hover:bg-surface-container transition-colors"
                >
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-surface-container">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title={viewingSop.title}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-on-surface-variant">
                  Loading PDF...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
