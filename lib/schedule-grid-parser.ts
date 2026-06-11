// Universal schedule grid parser.
//
// Takes a 2D string array (rows × cols) shaped like the weekly schedule
// (CSV, Excel, or pasted from Google Sheets) and produces the same
// canonical output as `parseSchedulePdf` so the downstream pipeline
// (preview → edit → commit) is completely format-agnostic.
//
// EXPECTED LAYOUT (mirrors the emailed two-week PDF):
//
//   Row pattern, anywhere in the sheet, scanned top→bottom:
//
//   [date-header row]  — has cells containing 7 dates (e.g. "6/1/26", or
//                        "6/1/26 MONDAY OF THE HOLY SPIRIT")
//   [staff row]        — first non-empty cell is a known/unknown staff
//                        name; second non-empty cell is a role; then
//                        time cells across the row.
//   [staff row] ...
//   [date-header row]  — week 2
//   [staff row] ...
//
// Times are matched as "9:00 AM", "5:00 PM", "09:00", "17:00", etc.
// "OFF", "---", "—" (em-dash), and empty cells are treated as OFF.
//
// Cells are mapped to the 7 day columns by *cell index position*, using
// the date-header row as the column anchor: whichever column a date
// appears in becomes that day's column for all following staff rows
// (until the next date-header row).

import type { ParsedShift, ParsedDayHeader, ParseResult } from "./schedule-pdf-parser"

export type GridParseOptions = {
  /** Pretty source label, e.g. "schedule.xlsx" — only used in warnings. */
  sourceLabel?: string
}

const DATE_RE_LOOSE = /(\d{1,2})\/(\d{1,2})\/(\d{2}(?:\d{2})?)/
const DATE_RE_STRICT = /^(\d{1,2})\/(\d{1,2})\/(\d{2}(?:\d{2})?)$/
const TIME_RE = /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\b/g
const OFF_RE = /^(off|---+|—+|–+|\u2014+|n\/a|na)$/i

const KNOWN_ROLES = ["DIRECTOR", "PORTER", "GREETER", "SECURITY"]
const ROLE_SYNONYMS: Record<string, string> = {
  director: "DIRECTOR",
  dir: "DIRECTOR",
  manager: "DIRECTOR",
  porter: "PORTER",
  operations: "PORTER",
  ops: "PORTER",
  greeter: "GREETER",
  usher: "GREETER",
  security: "SECURITY",
  sec: "SECURITY",
  guard: "SECURITY",
}

// ── helpers ────────────────────────────────────────────────────────────────

function normalizeDateMatch(m: RegExpMatchArray): string {
  const mm = parseInt(m[1], 10)
  const dd = parseInt(m[2], 10)
  let yy = parseInt(m[3], 10)
  if (yy < 100) yy += 2000
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
}

function capitalize(name: string): string {
  if (!name) return name
  // Title-case each word so multi-cell names like "Fabio smith" render as "Fabio Smith"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function normalizeRole(raw: string): string | null {
  const s = String(raw || "").trim()
  if (!s) return null
  const up = s.toUpperCase()
  if (KNOWN_ROLES.includes(up)) return up
  const key = s.toLowerCase()
  return ROLE_SYNONYMS[key] || null
}

function isOffCell(s: string): boolean {
  const v = String(s || "").trim()
  if (!v) return true
  return OFF_RE.test(v)
}

function isLikelyNameCell(s: string): boolean {
  const v = String(s || "").trim()
  if (!v) return false
  // Reject if it's a date, time, role, or pure-numeric/punctuation
  if (DATE_RE_LOOSE.test(v)) return false
  if (/^\d+(:\d+)?\s*(AM|PM)?$/i.test(v)) return false
  if (normalizeRole(v)) return false
  if (OFF_RE.test(v)) return false
  // Should contain at least one letter and be reasonably short
  if (!/[A-Za-z]/.test(v)) return false
  if (v.length > 40) return false
  // Allow uppercase or mixed case single/multi-word names
  return /^[A-Za-z][A-Za-z .'\-]{0,40}$/.test(v)
}

function to24h(h: number, m: number, ampm: string | null): string {
  let hr = h
  if (ampm) {
    hr = h % 12
    if (ampm.toUpperCase() === "PM") hr += 12
  } else if (h <= 7) {
    // Bare "5:00" with no AM/PM in a shift context — assume PM (5pm shifts)
    hr = h + 12
  } else if (h >= 24) {
    hr = h % 24
  }
  return `${String(hr).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function extractTimes(cell: string): string[] {
  const out: string[] = []
  const text = String(cell || "")
  let m: RegExpExecArray | null
  TIME_RE.lastIndex = 0
  while ((m = TIME_RE.exec(text)) !== null) {
    const h = parseInt(m[1], 10)
    const mm = parseInt(m[2], 10)
    if (h > 23 || mm > 59) continue
    out.push(to24h(h, mm, m[3] || null))
  }
  return out
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

// ── parser ─────────────────────────────────────────────────────────────────

type DayColumn = {
  date: string
  dayTitle: string
  /** Column index in the grid where this day starts. */
  startCol: number
  /** Column index where the NEXT day starts (exclusive). */
  endCol: number
}

type DateHeaderRow = {
  rowIdx: number
  columns: DayColumn[]
}

function findDateHeaderRows(grid: string[][]): DateHeaderRow[] {
  const headers: DateHeaderRow[] = []
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || []
    // Find every cell that contains a date
    const hits: Array<{ col: number; date: string; title: string }> = []
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || "")
      const m = cell.match(DATE_RE_LOOSE)
      if (m) {
        const date = normalizeDateMatch(m)
        // Day title is the cell content with the date stripped
        const title = cell.replace(m[0], "").trim().replace(/^[-–—:]\s*/, "")
        hits.push({ col: c, date, title })
      }
    }
    // A real header row should have at least 3 date cells (handles partial
    // rows where one week's row only shows a few). Be lenient.
    if (hits.length >= 3) {
      const columns: DayColumn[] = hits.map((h, i) => ({
        date: h.date,
        dayTitle: h.title,
        startCol: h.col,
        endCol: i + 1 < hits.length ? hits[i + 1].col : row.length + 100,
      }))
      headers.push({ rowIdx: r, columns })
    }
  }
  return headers
}

function timesToShift(times: string[]): { start: string | null; end: string | null; isLate: boolean } {
  if (times.length === 0) return { start: null, end: null, isLate: false }
  const sorted = times.slice().sort((a, b) => minutesOf(a) - minutesOf(b))
  const start = sorted[0]
  const end = sorted[sorted.length - 1]
  // Same time twice → treat as off/unknown
  if (start === end) return { start: null, end: null, isLate: false }
  const isLate = minutesOf(end) >= 20 * 60 // 8 PM or later
  return { start, end, isLate }
}

function parseStaffRow(
  row: string[],
  rowIdx: number,
  dayColumns: DayColumn[],
  warnings: string[],
  sourceLabel: string
): ParsedShift[] {
  // Find name + role: scan from the left.
  //   1. Collect 1+ consecutive name-like cells (handles "Fabio | Smith" split names).
  //   2. Then scan forward, skipping any non-role/non-time/non-OFF junk cells,
  //      until we hit a role token. (Tolerates an extra ID column or notes column.)
  let nameCol = -1
  const nameParts: string[] = []
  let c = 0
  for (; c < row.length; c++) {
    const v = String(row[c] || "").trim()
    if (!v) {
      if (nameParts.length > 0) {
        // Empty cell ends a multi-cell name run.
        break
      }
      continue
    }
    if (isLikelyNameCell(v)) {
      if (nameParts.length === 0) nameCol = c
      nameParts.push(v)
      continue
    }
    // First non-empty cell wasn't a name → bail (this row isn't a staff row).
    if (nameParts.length === 0) return []
    // Otherwise the run of name cells is over.
    break
  }
  if (nameCol < 0 || nameParts.length === 0) return []
  const staffName = capitalize(nameParts.join(" "))

  let role: string | null = null
  // Continue from where the name run ended; never search beyond the first day column.
  const roleSearchEnd = dayColumns.length > 0 ? dayColumns[0].startCol : row.length
  for (; c < roleSearchEnd && c < row.length; c++) {
    const v = String(row[c] || "").trim()
    if (!v) continue
    const r = normalizeRole(v)
    if (r) {
      role = r
      break
    }
    // Skip junk (e.g. employee ID, lastname-only continuation, notes) instead of bailing.
  }
  if (!role) {
    warnings.push(
      `${sourceLabel}row ${rowIdx + 1}: staff "${staffName}" has no recognised role token before the first day column`
    )
    return []
  }

  const shifts: ParsedShift[] = []
  for (const day of dayColumns) {
    // Collect all time tokens from cells in this day's column range
    const cells: string[] = []
    let allOff = true
    let anyContent = false
    for (let c = day.startCol; c < Math.min(day.endCol, row.length); c++) {
      const cellRaw = String(row[c] || "")
      const cell = cellRaw.trim()
      if (!cell) continue
      anyContent = true
      cells.push(cell)
      if (!isOffCell(cell)) allOff = false
    }

    const allTimes: string[] = []
    for (const cell of cells) {
      if (isOffCell(cell)) continue
      allTimes.push(...extractTimes(cell))
    }

    let shift: { start: string | null; end: string | null; isLate: boolean }
    if (!anyContent || (allOff && allTimes.length === 0)) {
      shift = { start: null, end: null, isLate: false }
    } else {
      shift = timesToShift(allTimes)
    }

    shifts.push({
      date: day.date,
      staffName,
      scheduleRole: role,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      isLate: shift.isLate,
    })
  }
  return shifts
}

export function parseScheduleGrid(grid: string[][], opts: GridParseOptions = {}): ParseResult {
  const warnings: string[] = []
  const sourceLabel = opts.sourceLabel ? `[${opts.sourceLabel}] ` : ""

  // Drop fully-empty trailing rows
  while (grid.length > 0 && (grid[grid.length - 1] || []).every((c) => !String(c || "").trim())) {
    grid.pop()
  }

  if (grid.length === 0) {
    return {
      shifts: [],
      dayHeaders: [],
      warnings: [`${sourceLabel}grid is empty`],
      rawText: "",
    }
  }

  const headerRows = findDateHeaderRows(grid)
  if (headerRows.length === 0) {
    return {
      shifts: [],
      dayHeaders: [],
      warnings: [
        `${sourceLabel}no date header row found. Expected at least one row containing dates like "6/1/26" or "6/1/2026" across the columns.`,
      ],
      rawText: serializeGrid(grid),
    }
  }

  const allShifts: ParsedShift[] = []
  const allHeaders: ParsedDayHeader[] = []

  for (let h = 0; h < headerRows.length; h++) {
    const header = headerRows[h]
    const nextHeaderRow = h + 1 < headerRows.length ? headerRows[h + 1].rowIdx : grid.length

    for (const col of header.columns) {
      allHeaders.push({ date: col.date, dayTitle: col.dayTitle })
    }

    for (let r = header.rowIdx + 1; r < nextHeaderRow; r++) {
      const row = grid[r]
      if (!row) continue
      const shifts = parseStaffRow(row, r, header.columns, warnings, sourceLabel)
      allShifts.push(...shifts)
    }
  }

  // Dedupe day headers (same date may appear once per week)
  const seenHeader = new Set<string>()
  const dedupedHeaders = allHeaders.filter((h) => {
    if (seenHeader.has(h.date)) return false
    seenHeader.add(h.date)
    return true
  })

  // Dedupe shifts on (date, staffName) — last write wins
  const shiftMap = new Map<string, ParsedShift>()
  for (const s of allShifts) {
    shiftMap.set(`${s.date}|${s.staffName}`, s)
  }
  const dedupedShifts = Array.from(shiftMap.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.staffName.localeCompare(b.staffName)
  })

  if (dedupedShifts.length === 0) {
    warnings.push(
      `${sourceLabel}parsed ${headerRows.length} header row(s) but found 0 staff rows. ` +
        `Check that staff names appear in the first non-empty column of each row.`
    )
  }

  return {
    shifts: dedupedShifts,
    dayHeaders: dedupedHeaders,
    warnings,
    rawText: serializeGrid(grid),
  }
}

function serializeGrid(grid: string[][]): string {
  return grid
    .map((row) => (row || []).map((c) => String(c || "").trim()).join("\t"))
    .join("\n")
}
