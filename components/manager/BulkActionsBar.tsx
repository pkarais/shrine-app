"use client"

import { Trash2, UserPlus, Download, CheckCircle } from "lucide-react"

interface BulkActionsBarProps {
  selectedIds: string[]
  onDelete?: (ids: string[]) => void
  onAssign?: (ids: string[]) => void
  onExport?: (ids: string[]) => void
  onAcknowledge?: (ids: string[]) => void
}

export function BulkActionsBar({
  selectedIds,
  onDelete,
  onAssign,
  onExport,
  onAcknowledge,
}: BulkActionsBarProps) {
  if (selectedIds.length === 0) return null

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-on-surface">
          {selectedIds.length} selected
        </span>
        <div className="flex items-center gap-2">
          {onAcknowledge && (
            <button
              onClick={() => onAcknowledge(selectedIds)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Acknowledge
            </button>
          )}
          {onAssign && (
            <button
              onClick={() => onAssign(selectedIds)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary-container text-on-secondary-container text-sm font-medium hover:bg-secondary-container/80 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Assign
            </button>
          )}
          {onExport && (
            <button
              onClick={() => onExport(selectedIds)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-highest text-on-surface text-sm font-medium hover:bg-surface-dim transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(selectedIds)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error-container text-on-error-container text-sm font-medium hover:bg-error-container/80 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
