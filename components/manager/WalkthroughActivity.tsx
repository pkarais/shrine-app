"use client"

import { useState } from "react"
import { deleteWalkthrough, clearAllWalkthroughs, getWalkthroughDetail, markWalkthroughAsTest } from "@/lib/actions/walkthroughs"
import { WalkthroughArchiveViewer } from "./WalkthroughArchiveViewer"
import { Trash2, AlertTriangle, X, CheckCircle2, XCircle, Archive, Calendar, FlaskConical } from "lucide-react"

interface WalkthroughItem {
  id: string
  user_id: string | null
  walkthrough_type: string | null
  category: string | null
  completed_at: string | null
  user_name: string | null
}

export function WalkthroughActivity({ initial }: { initial: WalkthroughItem[] }) {
  const [items, setItems] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [viewDetail, setViewDetail] = useState<any | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [markingTestId, setMarkingTestId] = useState<string | null>(null)

  async function handleViewDetail(id: string) {
    setLoadingId(id)
    try {
      const detail = await getWalkthroughDetail(id)
      setViewDetail(detail)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWalkthrough(id)
      setItems((prev) => prev.filter((w) => w.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
    setConfirmDelete(null)
  }

  async function handleClearAll() {
    try {
      await clearAllWalkthroughs()
      setItems([])
    } catch (e: any) {
      alert(e.message)
    }
    setConfirmClearAll(false)
  }

  async function handleMarkAsTest(id: string) {
    try {
      await markWalkthroughAsTest(id)
      setItems((prev) => prev.filter((w) => w.id !== id))
      setMarkingTestId(null)
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-on-surface-variant">No walkthroughs completed yet today.</p>
        <button
          onClick={() => setShowArchive(true)}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 font-medium"
        >
          <Archive className="w-3.5 h-3.5" /> View Archive History
        </button>
        {showArchive && (
          <WalkthroughArchiveViewer onClose={() => setShowArchive(false)} />
        )}
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="space-y-4">
          {items.slice(0, 10).map((wt) => (
            <div key={wt.id} className="bg-surface-container rounded-xl p-4 flex items-center justify-between gap-4">
            <button
              className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
              onClick={() => handleViewDetail(wt.id)}
              disabled={loadingId === wt.id}
            >
              <p className="text-sm font-bold text-on-surface capitalize">
                {wt.walkthrough_type || "Walkthrough"} — {wt.category || "facility"}
                {loadingId === wt.id && <span className="ml-2 text-xs font-normal text-on-surface-variant">Loading…</span>}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {wt.completed_at ? new Date(wt.completed_at).toLocaleString() : "N/A"}
              </p>
            </button>
            <div className="flex items-center gap-3 shrink-0">
              {wt.user_name && (
                <p className="text-xs font-semibold text-on-surface">{wt.user_name}</p>
              )}
              {confirmDelete === wt.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(wt.id)}
                    className="text-[10px] px-2 py-1 rounded bg-red-600 text-white font-bold"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-[10px] px-2 py-1 rounded bg-surface-container-high text-on-surface-variant"
                  >
                    Cancel
                  </button>
                </div>
              ) : markingTestId === wt.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMarkAsTest(wt.id)}
                    className="text-[10px] px-2 py-1 rounded bg-tertiary text-white font-bold"
                  >
                    Mark test
                  </button>
                  <button
                    onClick={() => setMarkingTestId(null)}
                    className="text-[10px] px-2 py-1 rounded bg-surface-container-high text-on-surface-variant"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMarkingTestId(wt.id)}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-tertiary transition-colors"
                    title="Mark as test data"
                  >
                    <FlaskConical className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(wt.id)}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-red-500 transition-colors"
                    title="Delete walkthrough"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => setShowArchive(true)}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 font-medium"
        >
          <Archive className="w-3.5 h-3.5" /> Archive History
        </button>

        {confirmClearAll ? (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400 font-bold">Archive today, then clear?</span>
            <button
              onClick={handleClearAll}
              className="text-xs px-3 py-1.5 rounded bg-red-600 text-white font-bold"
            >
              Yes, clear all
            </button>
            <button
              onClick={() => setConfirmClearAll(false)}
              className="text-xs px-3 py-1.5 rounded bg-surface-container-high text-on-surface-variant"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClearAll(true)}
            className="text-xs text-on-surface-variant hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Archive viewer modal */}
      {showArchive && (
        <WalkthroughArchiveViewer onClose={() => setShowArchive(false)} />
      )}
    </div>

    {/* Detail modal */}
    {viewDetail && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 pt-16"
        onClick={() => setViewDetail(null)}
      >
        <div
          className="bg-surface-container rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-on-surface capitalize">
                {viewDetail.walkthrough_type || "Walkthrough"} — {viewDetail.category || "facility"}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {viewDetail.completed_at ? new Date(viewDetail.completed_at).toLocaleString() : "N/A"}
              </p>
            </div>
            <button
              onClick={() => setViewDetail(null)}
              className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Checklist items */}
          {viewDetail.checks && Object.keys(viewDetail.checks).length > 0 && (
            <div className="space-y-1.5 mb-4">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Checklist</p>
              {Object.entries(viewDetail.checks as Record<string, boolean>).map(([key, passed]) => (
                <div key={key} className="flex items-center gap-2">
                  {passed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="text-sm text-on-surface capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {viewDetail.notes && (
            <div className="mt-3 p-3 bg-surface-container-high rounded-xl">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-on-surface whitespace-pre-wrap">{viewDetail.notes}</p>
            </div>
          )}

          {/* Media */}
          {viewDetail.media_urls && viewDetail.media_urls.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {viewDetail.media_urls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Attachment {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}