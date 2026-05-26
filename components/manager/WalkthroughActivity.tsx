"use client"

import { useState } from "react"
import { deleteWalkthrough, clearAllWalkthroughs } from "@/lib/actions/walkthroughs"
import { Trash2, AlertTriangle } from "lucide-react"

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

  if (items.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">No walkthroughs completed yet today.</p>
    )
  }

  return (
    <div>
      <div className="space-y-4">
        {items.slice(0, 10).map((wt) => (
          <div key={wt.id} className="bg-surface-container rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface capitalize">
                {wt.walkthrough_type || "Walkthrough"} — {wt.category || "facility"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {wt.completed_at ? new Date(wt.completed_at).toLocaleString() : "N/A"}
              </p>
            </div>
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
              ) : (
                <button
                  onClick={() => setConfirmDelete(wt.id)}
                  className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-red-500 transition-colors"
                  title="Delete walkthrough"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        {confirmClearAll ? (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400 font-bold">Delete all walkthroughs?</span>
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
            <Trash2 className="w-3 h-3" /> Clear all test data
          </button>
        )}
      </div>
    </div>
  )
}