"use client"

import { useState } from "react"

interface ExportDataButtonProps {
  data: any[]
  filename: string
  label?: string
}

function flattenRow(row: any): Record<string, any> {
  const flat: Record<string, any> = {}
  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) {
      flat[key] = ""
    } else if (typeof val === "object") {
      if (Array.isArray(val)) {
        flat[key] = JSON.stringify(val)
      } else {
        // Flatten nested objects with dot notation (e.g., profiles.full_name)
        for (const [nestedKey, nestedVal] of Object.entries(val)) {
          flat[`${key}.${nestedKey}`] = nestedVal ?? ""
        }
      }
    } else {
      flat[key] = val
    }
  }
  return flat
}

function objectToCsv(rows: any[]) {
  if (!rows.length) return ""
  const flatRows = rows.map(flattenRow)
  const headers = Array.from(new Set(flatRows.flatMap((r) => Object.keys(r))))
  const csvRows = [
    headers.join(","),
    ...flatRows.map((row) =>
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
    if (!data.length) {
      alert("No data to export")
      return
    }
    setExporting(true)
    try {
      const csv = objectToCsv(data)
      if (!csv) {
        alert("Could not generate CSV")
        return
      }
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
      alert("Export failed. See console for details.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="bg-surface-container-highest px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-surface-dim transition-colors text-on-surface disabled:opacity-50"
    >
      <span className="material-symbols-outlined">ios_share</span>
      {exporting ? "Exporting..." : label}
    </button>
  )
}
