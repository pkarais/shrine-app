// File / paste adapters → string[][] grid → parseScheduleGrid()
//
// All three formats (xlsx, csv, pasted text) get normalized to a
// rectangular 2D string array, then handed to the shared grid parser.

import ExcelJS from "exceljs"
import { parseScheduleGrid } from "./schedule-grid-parser"
import type { ParseResult } from "./schedule-pdf-parser"

// ── XLSX / XLS ─────────────────────────────────────────────────────────────

export async function parseExcelBuffer(buffer: Buffer, sourceLabel = "excel"): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook()
  // exceljs accepts an ArrayBuffer or Buffer-like; cast to any for the typing
  await wb.xlsx.load(buffer as any)
  const ws = wb.worksheets[0]
  if (!ws) {
    return {
      shifts: [],
      dayHeaders: [],
      warnings: [`[${sourceLabel}] workbook has no sheets`],
      rawText: "",
    }
  }

  const grid: string[][] = []
  // exceljs is 1-indexed for both rows and columns
  const maxRow = ws.actualRowCount || ws.rowCount
  const maxCol = ws.actualColumnCount || ws.columnCount
  for (let r = 1; r <= maxRow; r++) {
    const row = ws.getRow(r)
    const out: string[] = []
    for (let c = 1; c <= maxCol; c++) {
      const cell = row.getCell(c)
      out.push(cellToString(cell))
    }
    grid.push(out)
  }
  return parseScheduleGrid(grid, { sourceLabel })
}

function cellToString(cell: ExcelJS.Cell): string {
  const v = cell.value
  if (v == null) return ""
  if (typeof v === "string") return v
  if (typeof v === "number") return String(v)
  if (typeof v === "boolean") return v ? "true" : "false"
  if (v instanceof Date) {
    // Excel time cells round-trip as Date. Render times as "h:mm AM/PM"
    // so the grid parser's TIME_RE picks them up consistently.
    const h = v.getUTCHours()
    const m = v.getUTCMinutes()
    if (h > 0 || m > 0) {
      const ampm = h >= 12 ? "PM" : "AM"
      const hh = h % 12 === 0 ? 12 : h % 12
      return `${hh}:${String(m).padStart(2, "0")} ${ampm}`
    }
    // It's a real date — render as M/D/YY
    return `${v.getUTCMonth() + 1}/${v.getUTCDate()}/${String(v.getUTCFullYear()).slice(-2)}`
  }
  // Rich text / formulas / hyperlinks
  if (typeof v === "object") {
    const anyV = v as any
    if (typeof anyV.text === "string") return anyV.text
    if (typeof anyV.result === "string" || typeof anyV.result === "number") return String(anyV.result)
    if (Array.isArray(anyV.richText)) return anyV.richText.map((r: any) => r.text).join("")
    if (anyV.formula) return ""
  }
  return String(v)
}

// ── CSV ────────────────────────────────────────────────────────────────────

/**
 * RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes ("") and
 * commas/newlines inside quotes. Returns a rectangular string[][] (rows
 * padded to the widest row).
 */
export function parseCsv(text: string): string[][] {
  const grid: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let maxCols = 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ",") {
      row.push(field)
      field = ""
      continue
    }
    if (ch === "\r") continue
    if (ch === "\n") {
      row.push(field)
      field = ""
      if (row.length > maxCols) maxCols = row.length
      grid.push(row)
      row = []
      continue
    }
    field += ch
  }
  // Last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.length > maxCols) maxCols = row.length
    grid.push(row)
  }
  // Pad to rectangular
  for (const r of grid) {
    while (r.length < maxCols) r.push("")
  }
  return grid
}

export function parseCsvText(text: string, sourceLabel = "csv"): ParseResult {
  const grid = parseCsv(text)
  return parseScheduleGrid(grid, { sourceLabel })
}

// ── Pasted text (Google Sheets / Excel clipboard) ──────────────────────────

/**
 * When you select cells in Google Sheets or Excel and copy, the clipboard
 * holds TAB-separated values with newline-separated rows. This adapter
 * accepts that natively, and falls back to CSV parsing if no tabs are
 * detected.
 */
export function parsePastedText(text: string, sourceLabel = "paste"): ParseResult {
  const hasTabs = text.includes("\t")
  if (!hasTabs) return parseCsvText(text, sourceLabel)
  const rows = text.replace(/\r/g, "").split("\n")
  let maxCols = 0
  const grid = rows.map((line) => {
    const cells = line.split("\t")
    if (cells.length > maxCols) maxCols = cells.length
    return cells
  })
  for (const r of grid) {
    while (r.length < maxCols) r.push("")
  }
  return parseScheduleGrid(grid, { sourceLabel })
}
