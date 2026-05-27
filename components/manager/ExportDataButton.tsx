"use client"

import { useState } from "react"

interface ExportDataButtonProps {
  data: any[]
  filename: string
  label?: string
}

function objectToCsv(rows: any[]) {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h]
          if (val === null || val === undefined) return ""
          const str = String(val).replace(/"/g, '""')
          return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str
        })
        .join(",")
    ),
  ]
  return csvRows.join("\n")
}

export function ExportDataButton({ data, filename, label = "Export Data" }: ExportDataButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)
    try {
      const csv = objectToCsv(data)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting || data.length === 0}
      className="bg-surface-container-highest px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-surface-dim transition-colors text-on-surface disabled:opacity-50"
    >
      <span className="material-symbols-outlined">ios_share</span>
      {exporting ? "Exporting..." : label}
    </button>
  )
}
