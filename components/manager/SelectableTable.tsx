"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"

export interface SelectableTableColumn {
  key: string
  header: React.ReactNode
  className?: string
}

interface SelectableTableProps<T extends { id: string }> {
  data: T[]
  columns: SelectableTableColumn[]
  onSelectionChange?: (selectedIds: string[]) => void
  /** Return <td> elements (or a Fragment containing <td>s) for the given item. */
  renderRow: (item: T, isSelected: boolean) => React.ReactNode
}

export function SelectableTable<T extends { id: string }>({
  data,
  columns,
  onSelectionChange,
  renderRow,
}: SelectableTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const masterRef = useRef<HTMLInputElement>(null)

  const selectedArray = useMemo(() => Array.from(selectedIds).sort(), [selectedIds])
  const prevRef = useRef<string[]>([])

  const allSelected = data.length > 0 && selectedIds.size === data.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length

  // Update master checkbox indeterminate state
  useEffect(() => {
    if (masterRef.current) {
      masterRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  // Notify parent when selection changes
  useEffect(() => {
    const prev = prevRef.current
    if (
      selectedArray.length !== prev.length ||
      selectedArray.some((id, i) => id !== prev[i])
    ) {
      prevRef.current = selectedArray
      onSelectionChange?.(selectedArray)
    }
  }, [selectedArray, onSelectionChange])

  // Clear selections for items that no longer exist in data
  useEffect(() => {
    const validIds = new Set(data.map((d) => d.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      let changed = false
      Array.from(next).forEach((id) => {
        if (!validIds.has(id)) {
          next.delete(id)
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [data])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map((d) => d.id)))
    }
  }, [allSelected, data])

  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant/30">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-wider">
            <th className="p-3 sm:p-4 w-12">
              <input
                ref={masterRef}
                type="checkbox"
                className="w-4 h-4 rounded border-outline-variant accent-[var(--primary)] cursor-pointer"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all rows"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`p-3 sm:p-4 font-medium ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const isSelected = selectedIds.has(item.id)
            return (
              <tr
                key={item.id}
                className={`border-t border-outline-variant/20 transition-colors ${
                  isSelected
                    ? "bg-primary-fixed/20"
                    : "hover:bg-surface-container/50"
                }`}
              >
                <td className="p-3 sm:p-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-outline-variant accent-[var(--primary)] cursor-pointer"
                    checked={isSelected}
                    onChange={() => toggleSelection(item.id)}
                    aria-label={`Select row ${item.id}`}
                  />
                </td>
                {renderRow(item, isSelected)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
