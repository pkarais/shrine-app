// Parses the two-week staff-schedule PDF emailed weekly into structured shifts.
//
// Strategy: use pdfjs-dist to pull every text run with its (x,y) coordinate.
// Group runs into rows by y, sort by x, then:
//   1. Find each date-header row (contains 7 dates like 6/1/26 or 6/1/2026)
//      → captures x-position of each day column + the title text for that day.
//   2. For each staff row (starts with a KNOWN_NAME + KNOWN_ROLE),
//      bucket every time-like token into one of the 7 day columns by x.
//   3. Per day: "OFF" → off; otherwise earliest time = start, latest = end.

const KNOWN_NAMES = ["PAUL", "FABIO", "JOSH", "PAULIN", "DEMETRI", "MARCUS", "TERESA", "RYAN", "KEN", "JOSE"] as const
const KNOWN_ROLES = ["DIRECTOR", "PORTER", "GREETER", "SECURITY"] as const

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2}(?:\d{2})?)$/
// Loose match — accepts text that CONTAINS a date, possibly prefixed by
// weekday letters (MON/M/etc) or surrounded by punctuation. Used as a
// fallback when the strict regex misses fragmented tokens.
const DATE_RE_LOOSE = /(\d{1,2})\/(\d{1,2})\/(\d{2}(?:\d{2})?)/

export type ParsedShift = {
  date: string
  staffName: string
  scheduleRole: string
  shiftStart: string | null
  shiftEnd: string | null
  isLate: boolean
}

export type ParsedDayHeader = {
  date: string
  dayTitle: string
}

export type ParseResult = {
  shifts: ParsedShift[]
  dayHeaders: ParsedDayHeader[]
  warnings: string[]
  rawText: string
}

type Item = { str: string; x: number; y: number; page: number }
type Row = { y: number; page: number; items: Item[] }
type Token = { text: string; x: number }

function capitalize(name: string): string {
  if (!name) return name
  return name[0].toUpperCase() + name.slice(1).toLowerCase()
}

function normalizeDateMatch(m: RegExpMatchArray): string {
  const mm = parseInt(m[1], 10)
  const dd = parseInt(m[2], 10)
  let yy = parseInt(m[3], 10)
  if (yy < 100) yy += 2000
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
}

function to24h(h: number, m: number, ampm: string): string {
  let hr = h % 12
  if (ampm.toUpperCase() === "PM") hr += 12
  return `${String(hr).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function mergeRowTokens(items: Item[]): Token[] {
  const sorted = items.slice().sort((a, b) => a.x - b.x)
  const tokens: Token[] = []
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i].str.trim()
    if (!s) continue
    if (/^\d{1,2}:\d{2}$/.test(s) && i + 1 < sorted.length) {
      const next = sorted[i + 1].str.trim()
      if (/^(AM|PM)$/i.test(next) && sorted[i + 1].x - sorted[i].x < 50) {
        tokens.push({ text: `${s} ${next.toUpperCase()}`, x: sorted[i].x })
        i++
        continue
      }
    }
    tokens.push({ text: s, x: sorted[i].x })
  }
  return tokens
}

function groupRows(items: Item[]): Row[] {
  const rows: Row[] = []
  for (const it of items) {
    const r = rows.find((r) => r.page === it.page && Math.abs(r.y - it.y) < 3)
    if (r) r.items.push(it)
    else rows.push({ y: it.y, page: it.page, items: [it] })
  }
  rows.sort((a, b) => (a.page - b.page) || (b.y - a.y))
  return rows
}

function isDateHeaderRow(row: Row): boolean {
  // After per-page consolidation, a header row should hold ≥2 strict date
  // tokens. (Threshold lowered from 3 so partially-extracted pages still
  // produce a header.)
  const strict = row.items.filter((it) => DATE_RE.test(it.str.trim()))
  return strict.length >= 2
}

type DayHeader = { date: string; dayTitle: string; x: number }
function parseDateHeaderRow(row: Row): DayHeader[] {
  // Pre-glue adjacent items whose concatenation forms a date (handles PDFs
  // where pdfjs splits "6/1/26" into "6/1" + "/26"). Only glue when cur is
  // NOT already a complete date on its own — otherwise we'd eat the title
  // text that follows (e.g. "6/1/26" + "MONDAY" → "6/1/26MONDAY").
  const raw = row.items.slice().sort((a, b) => a.x - b.x)
  const glued: Item[] = []
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i]
    const nxt = raw[i + 1]
    const curTrim = cur.str.trim()
    if (
      nxt &&
      Math.abs(nxt.x - cur.x) < 30 &&
      !DATE_RE.test(curTrim) &&
      DATE_RE.test(curTrim + nxt.str.trim())
    ) {
      glued.push({ ...cur, str: curTrim + nxt.str.trim() })
      i++
      continue
    }
    glued.push(cur)
  }

  const headers: DayHeader[] = []
  for (let i = 0; i < glued.length; i++) {
    const trimmed = glued[i].str.trim()
    // Strip weekday letters prefix like "MON6/1/26" -> "6/1/26".
    const cleaned = trimmed.replace(/^[A-Z]+(?=\d)/i, "")
    // Use strict regex here so title words like "MONDAY" never get treated
    // as a date.
    const m = cleaned.match(DATE_RE)
    if (!m) continue
    const date = normalizeDateMatch(m)
    const startX = glued[i].x
    const parts: string[] = []
    for (let j = i + 1; j < glued.length; j++) {
      const t = glued[j].str.trim()
      const c = t.replace(/^[A-Z]+(?=\d)/i, "")
      if (DATE_RE.test(c)) break
      parts.push(t)
    }
    const dayTitle = parts.join(" ").replace(/^[-\s]+/, "").trim()
    headers.push({ date, dayTitle, x: startX })
  }
  headers.sort((a, b) => a.x - b.x)
  // Dedupe by date — keep the entry whose title is non-empty when possible.
  const byDate = new Map<string, DayHeader>()
  for (const h of headers) {
    const existing = byDate.get(h.date)
    if (!existing || (!existing.dayTitle && h.dayTitle)) byDate.set(h.date, h)
  }
  return Array.from(byDate.values()).sort((a, b) => a.x - b.x)
}

function dayIndexForX(x: number, dayXs: number[], rightBoundary: number): number {
  for (let i = 0; i < dayXs.length; i++) {
    const left = dayXs[i]
    const right = i + 1 < dayXs.length ? dayXs[i + 1] : rightBoundary
    if (x >= left - 15 && x < right - 0.5) return i
  }
  return -1
}

function isStaffRow(row: Row): { name: string; role: string } | null {
  const sorted = row.items
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((it) => it.str.trim())
    .filter(Boolean)
  if (sorted.length < 2) return null
  const head = sorted[0]
  const head2 = sorted[1]
  const tryPair = (a: string, b: string) => {
    const A = a.toUpperCase()
    const B = b.toUpperCase()
    if ((KNOWN_NAMES as readonly string[]).includes(A) && (KNOWN_ROLES as readonly string[]).includes(B)) {
      return { name: A, role: B }
    }
    return null
  }
  const p1 = tryPair(head, head2)
  if (p1) return p1
  const parts = head.split(/\s+/)
  if (parts.length >= 2) {
    const p2 = tryPair(parts[0], parts[1])
    if (p2) return p2
  }
  return null
}

function deriveDayXs(headers: DayHeader[]): { dates: string[]; xs: number[]; titles: string[] } {
  const dates = headers.map((h) => h.date)
  const xs = headers.map((h) => h.x)
  const titles = headers.map((h) => h.dayTitle)
  if (headers.length < 7 && headers.length >= 2) {
    const avgGap = (xs[xs.length - 1] - xs[0]) / (xs.length - 1)

    // 1) Fill INTERNAL gaps first — where two consecutive parsed dates differ
    //    by more than one calendar day, insert the missing day(s) with their
    //    proportional x positions.
    for (let i = 0; i < dates.length - 1; i++) {
      const a = new Date(dates[i] + "T12:00:00Z")
      const b = new Date(dates[i + 1] + "T12:00:00Z")
      const diffDays = Math.round((b.getTime() - a.getTime()) / 86400000)
      if (diffDays > 1) {
        const xStep = (xs[i + 1] - xs[i]) / diffDays
        for (let k = 1; k < diffDays && xs.length < 7; k++) {
          const fill = new Date(a)
          fill.setUTCDate(a.getUTCDate() + k)
          dates.splice(i + k, 0, fill.toISOString().slice(0, 10))
          xs.splice(i + k, 0, xs[i] + xStep * k)
          titles.splice(i + k, 0, "")
        }
        i += diffDays - 1
      }
    }

    // 2) Extend FORWARD until we have a full 7-day week. The PDF defines its
    //    own week start (Mon-Sun in this case) so we do NOT pad to Sunday —
    //    that would consume the budget needed to reach the trailing Sunday.
    while (xs.length < 7) {
      xs.push(xs[xs.length - 1] + avgGap)
      const prev = dates[dates.length - 1]
      const d = new Date(prev + "T12:00:00Z")
      d.setUTCDate(d.getUTCDate() + 1)
      dates.push(d.toISOString().slice(0, 10))
      titles.push("")
    }
  }
  return { dates, xs, titles }
}

// Polyfill Promise.withResolvers — required by pdfjs-dist 5.x but only
// available in Node 22+. Vercel runs Node 20 by default.
if (typeof (Promise as any).withResolvers !== "function") {
  ;(Promise as any).withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: any) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

// Polyfill DOMMatrix if pdfjs needs it under Node (it usually only does for
// canvas rendering, not text extraction, but guard anyway).
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  ;(globalThis as any).DOMMatrix = class DOMMatrix {
    constructor() { /* no-op stub */ }
  }
}

export async function parseSchedulePdf(buffer: Buffer): Promise<ParseResult> {
  const warnings: string[] = []

  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs")

  // Resolve the worker file path so pdfjs can find it inside the serverless
  // bundle (Vercel /var/task). Next bundles the file via
  // experimental.outputFileTracingIncludes in next.config.js; we just need
  // to tell pdfjs where it lives at runtime.
  try {
    const path = await import("node:path")
    // pdfjs-dist is marked external, so its files live in node_modules at
    // runtime under the same layout.
    // require.resolve isn't available with module=esnext, so resolve by
    // navigating from the parent module file:
    const url = await import("node:url")
    const pkgPath = require.resolve("pdfjs-dist/package.json")
    const workerPath = path.join(path.dirname(pkgPath), "legacy", "build", "pdf.worker.mjs")
    if (pdfjsLib?.GlobalWorkerOptions) {
      // pdfjs's ESM loader expects a file:// URL on Windows.
      pdfjsLib.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href
    }
  } catch {
    // Fall through; getDocument will try its own discovery (likely fails on
    // Vercel, but local Node usually works).
  }

  const uint8 = new Uint8Array(buffer)
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  })
  const pdf = await loadingTask.promise

  const items: Item[] = []
  let rawText = ""
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    for (const it of content.items as any[]) {
      const str: string = it.str || ""
      const tr = it.transform || [1, 0, 0, 1, 0, 0]
      const x = tr[4]
      const y = tr[5]
      if (!str.trim()) continue
      items.push({ str, x, y, page: p })
      rawText += str + " "
    }
    rawText += "\n"
  }

  if (items.length === 0) {
    return { shifts: [], dayHeaders: [], warnings: ["No text extracted from PDF."], rawText }
  }

  const rows = groupRows(items)

  // ── STRATEGY ─────────────────────────────────────────────────────────
  // The schedule PDF has a single row of weekday names (Monday..Sunday)
  // that serves as the most reliable column anchor — its x positions are
  // exact, while date rows can drift when long titles wrap into the date
  // cell (e.g. "6/1/26 MONDAY OF THE HOLY SPIRIT").
  //
  // We:
  //   1. Find the day-name row → 7 day-x anchors.
  //   2. For each date row (anywhere on the page), assign each date to its
  //      closest day-x by text x-position.
  //   3. For each staff row between date rows, bucket time tokens into the
  //      7 day columns the same way.
  // ─────────────────────────────────────────────────────────────────────

  const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]

  // Locate the day-name row (the row containing Monday + Tuesday + ...).
  let dayNameRow: Row | undefined
  for (const r of rows) {
    const upper = r.items.map((it) => it.str.trim().toUpperCase())
    const matches = WEEKDAYS.filter((w) => upper.includes(w)).length
    if (matches >= 5) {
      dayNameRow = r
      break
    }
  }

  if (!dayNameRow) {
    return {
      shifts: [],
      dayHeaders: [],
      warnings: ["No day-name header row (Monday..Sunday) found in PDF."],
      rawText,
    }
  }

  // Extract day-x anchors in Mon..Sun order.
  const dayXs: number[] = []
  for (const w of WEEKDAYS) {
    const it = dayNameRow.items.find((i) => i.str.trim().toUpperCase() === w)
    if (!it) {
      return {
        shifts: [],
        dayHeaders: [],
        warnings: [`Day-name row missing ${w}.`],
        rawText,
      }
    }
    dayXs.push(it.x)
  }
  warnings.push(`[debug] day anchors: ${WEEKDAYS.map((w, i) => `${w.slice(0, 3)}@${dayXs[i].toFixed(0)}`).join(", ")}`)

  // Compute column boundaries (midpoint between consecutive day anchors).
  const colLeft: number[] = []
  const colRight: number[] = []
  for (let i = 0; i < 7; i++) {
    colLeft.push(i === 0 ? dayXs[0] - 35 : (dayXs[i - 1] + dayXs[i]) / 2)
    colRight.push(i === 6 ? dayXs[6] + 60 : (dayXs[i] + dayXs[i + 1]) / 2)
  }

  const colIndexForX = (x: number): number => {
    for (let i = 0; i < 7; i++) {
      if (x >= colLeft[i] && x < colRight[i]) return i
    }
    return -1
  }

  // Scan EVERY item for date matches (loose regex). For each match assign
  // it to a column via x position. Group dates by (page, y) → that becomes
  // a "date band". Each band yields a Mon..Sun array of date strings.
  type DateHit = { date: string; x: number; y: number; page: number; titleTail: string }
  const allDateHits: DateHit[] = []
  for (const r of rows) {
    for (const it of r.items) {
      const s = it.str
      if (!s) continue
      const re = new RegExp(DATE_RE_LOOSE.source, "g")
      let m: RegExpExecArray | null
      while ((m = re.exec(s)) !== null) {
        const dateStr = normalizeDateMatch(m as unknown as RegExpMatchArray)
        // Approximate x at match position: PDF chars ~5 units wide.
        const matchX = it.x + m.index * 5
        // Capture trailing text after the date as a potential title.
        const tail = s.slice(m.index + m[0].length).trim()
        allDateHits.push({ date: dateStr, x: matchX, y: it.y, page: it.page, titleTail: tail })
      }
    }
  }

  if (allDateHits.length === 0) {
    return {
      shifts: [],
      dayHeaders: [],
      warnings: ["No dates found in PDF."],
      rawText,
    }
  }

  // Group date hits by (page, y) within 3 units.
  type Band = { y: number; page: number; hits: DateHit[] }
  const bands: Band[] = []
  for (const h of allDateHits) {
    const b = bands.find((x) => x.page === h.page && Math.abs(x.y - h.y) < 3)
    if (b) b.hits.push(h)
    else bands.push({ y: h.y, page: h.page, hits: [h] })
  }
  // Dedupe by date within a band, prefer leftmost x.
  for (const b of bands) {
    const byDate = new Map<string, DateHit>()
    for (const h of b.hits) {
      const ex = byDate.get(h.date)
      if (!ex || h.x < ex.x) byDate.set(h.date, h)
    }
    b.hits = []
    byDate.forEach((v) => b.hits.push(v))
    b.hits.sort((a, b2) => a.x - b2.x)
  }
  // Keep only bands with at least 5 dates (a real week header).
  const weekBands = bands.filter((b) => b.hits.length >= 5)
  // Sort by page then y desc (top → bottom).
  weekBands.sort((a, b) => a.page - b.page || b.y - a.y)

  if (weekBands.length === 0) {
    return {
      shifts: [],
      dayHeaders: [],
      warnings: [`Found ${allDateHits.length} date hits but no band has ≥5 dates.`],
      rawText,
    }
  }

  const allShifts: ParsedShift[] = []
  const allDayHeaders: ParsedDayHeader[] = []

  // For each week band, build Mon..Sun date array, then parse staff rows
  // until the next band (or end of page).
  for (let bi = 0; bi < weekBands.length; bi++) {
    const band = weekBands[bi]
    const dates: (string | null)[] = new Array(7).fill(null)
    const titles: string[] = new Array(7).fill("")
    for (const h of band.hits) {
      const col = colIndexForX(h.x)
      if (col >= 0 && !dates[col]) {
        dates[col] = h.date
        titles[col] = h.titleTail
      }
    }
    // Infer any missing dates by chronological continuity.
    // Find the first known date, then fill backward/forward by ±1 day.
    let anchor = -1
    for (let i = 0; i < 7; i++) {
      if (dates[i]) { anchor = i; break }
    }
    if (anchor === -1) continue
    const anchorDate = new Date(dates[anchor]! + "T12:00:00Z")
    for (let i = 0; i < 7; i++) {
      if (!dates[i]) {
        const d = new Date(anchorDate)
        d.setUTCDate(d.getUTCDate() + (i - anchor))
        dates[i] = d.toISOString().slice(0, 10)
      }
    }
    const finalDates = dates as string[]
    warnings.push(`[debug] week band y=${band.y.toFixed(0)} dates: ${finalDates.map((d, i) => `${WEEKDAYS[i].slice(0, 3)}=${d.slice(5)}`).join(" ")}`)

    for (let i = 0; i < 7; i++) {
      allDayHeaders.push({ date: finalDates[i], dayTitle: titles[i] })
    }

    // Determine y range for this band's staff rows: from just below the
    // band's y down to the next band's y (or end of page).
    const yTop = band.y - 0.5
    let yBottom = -Infinity
    if (bi + 1 < weekBands.length && weekBands[bi + 1].page === band.page) {
      yBottom = weekBands[bi + 1].y + 0.5
    }

    for (const row of rows) {
      if (row.page !== band.page) continue
      if (row.y >= yTop || row.y <= yBottom) continue
      const sig = isStaffRow(row)
      if (!sig) continue

      const stripped: Item[] = []
      for (const it of row.items.slice().sort((a, b) => a.x - b.x)) {
        const t = it.str.trim().toUpperCase()
        if (t === sig.name || t === sig.role) continue
        // Also skip embedded "NAME ROLE" combined items.
        if (t === `${sig.name} ${sig.role}`) continue
        stripped.push(it)
      }

      const tokens = mergeRowTokens(stripped)
      const buckets: Token[][] = Array.from({ length: 7 }, () => [])
      for (const t of tokens) {
        const idx = colIndexForX(t.x)
        if (idx >= 0) buckets[idx].push(t)
      }

      for (let d = 0; d < 7; d++) {
        const bucket = buckets[d]
        if (bucket.length === 0) continue
        const isOff = bucket.some((b) => /\bOFF\b/i.test(b.text))
        if (isOff) {
          allShifts.push({
            date: finalDates[d],
            staffName: capitalize(sig.name),
            scheduleRole: sig.role,
            shiftStart: null,
            shiftEnd: null,
            isLate: false,
          })
          continue
        }
        const times: string[] = []
        for (const b of bucket) {
          const m = b.text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
          if (m) times.push(to24h(parseInt(m[1], 10), parseInt(m[2], 10), m[3]))
        }
        if (times.length === 0) continue
        const mins = times.map(minutesOf)
        const shiftStart = times[mins.indexOf(Math.min(...mins))]
        const shiftEnd = times[mins.indexOf(Math.max(...mins))]
        // LATE = working past the closer's normal time (8:00 PM = 20:00).
        const isLate = minutesOf(shiftEnd) >= 20 * 60
        allShifts.push({
          date: finalDates[d],
          staffName: capitalize(sig.name),
          scheduleRole: sig.role,
          shiftStart,
          shiftEnd,
          isLate,
        })
      }
    }
  }

  if (allShifts.length === 0) {
    warnings.push("No staff shifts extracted.")
  }

  return { shifts: allShifts, dayHeaders: allDayHeaders, warnings, rawText }
}
