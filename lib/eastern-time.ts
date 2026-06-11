/**
 * Eastern Time helpers — the shrine operates in America/New_York.
 *
 * Schedule times in the PDF / UI ("9:00 AM") always mean Eastern Time.
 * The database stores `timestamptz`, so we need to convert HH:mm pairs
 * into proper ISO timestamps that include the correct offset for that
 * specific date (-05:00 in winter, -04:00 in EDT). And when reading
 * back, we need to extract the HH:mm as observed in Eastern time, not
 * UTC.
 */

const ET = "America/New_York"

/**
 * Returns the Eastern Time UTC offset (in minutes) for a given UTC date.
 * Positive numbers mean Eastern is BEHIND UTC by that many minutes.
 * EST = 300 (UTC-5), EDT = 240 (UTC-4).
 */
function easternOffsetMinutes(date: Date): number {
  // Format the same instant in ET and in UTC; the difference is the offset.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  // Intl emits hour "24" for midnight; normalize to 0.
  let hour = get("hour")
  if (hour === 24) hour = 0
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  )
  return Math.round((date.getTime() - asUtc) / 60000)
}

function offsetString(minutes: number): string {
  const sign = minutes <= 0 ? "+" : "-"
  const abs = Math.abs(minutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, "0")
  const mm = String(abs % 60).padStart(2, "0")
  return `${sign}${hh}:${mm}`
}

/**
 * Convert a (YYYY-MM-DD, HH:mm) Eastern Time pair into an ISO timestamp
 * with the correct offset for that date. DST-aware.
 *
 *   toEasternIso("2026-06-01", "09:00")  // → "2026-06-01T09:00:00-04:00" (EDT)
 *   toEasternIso("2026-01-15", "09:00")  // → "2026-01-15T09:00:00-05:00" (EST)
 */
export function toEasternIso(date: string, hhmm: string): string {
  // First-guess offset based on noon UTC of that date (avoids DST-boundary
  // edge cases — noon UTC is always firmly inside the same ET day).
  const probe = new Date(`${date}T12:00:00Z`)
  const offMin = easternOffsetMinutes(probe)
  return `${date}T${hhmm}:00${offsetString(offMin)}`
}

/**
 * Extract HH:mm as observed in Eastern Time from any ISO timestamp.
 *
 *   easternHHMM("2026-06-01T13:00:00Z")          // → "09:00" (UTC→EDT)
 *   easternHHMM("2026-06-01T09:00:00-04:00")     // → "09:00"
 *   easternHHMM("2026-06-01T09:00:00.000Z")      // → "09:00" (legacy: Z used as ET literal)
 */
export function easternHHMM(iso: string): string {
  // Legacy rows written before TZ awareness used `${date}T${hhmm}:00.000Z`
  // (the literal Z meant "ET, ignore conversion"). Detect that shape and
  // return the HH:mm verbatim so we don't shift them by 4–5h.
  const legacy = /T(\d{2}:\d{2}):00\.000Z$/.exec(iso)
  if (legacy) return legacy[1]

  const d = new Date(iso)
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = dtf.formatToParts(d)
  let hh = parts.find((p) => p.type === "hour")?.value || "00"
  const mm = parts.find((p) => p.type === "minute")?.value || "00"
  if (hh === "24") hh = "00"
  return `${hh}:${mm}`
}

/**
 * Extract YYYY-MM-DD as observed in Eastern Time.
 */
export function easternDate(iso: string): string {
  // Legacy literal-Z rows: take the date portion as-is.
  const legacy = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:00\.000Z$/.exec(iso)
  if (legacy) return legacy[1]

  const d = new Date(iso)
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  // en-CA produces YYYY-MM-DD natively.
  return dtf.format(d)
}

/**
 * Today's date in Eastern Time as "YYYY-MM-DD".
 * Use this instead of `new Date().toISOString().slice(0,10)` which rolls
 * forward into tomorrow after 8pm Eastern.
 */
export function easternToday(): string {
  return easternDate(new Date().toISOString())
}

/**
 * Current year+month in Eastern Time as "YYYY-MM".
 * Use this anywhere a <input type="month"> default is needed.
 */
export function easternYearMonth(): string {
  return easternToday().slice(0, 7)
}

/**
 * Parse a "YYYY-MM" or "YYYY-MM-DD" string and return a Date pinned to
 * the FIRST OF THE MONTH at noon Eastern Time. Use this for month-label
 * rendering — never `new Date("2026-05-01")` which parses as UTC and
 * regresses to April 30 8pm Eastern.
 */
export function parseEasternMonth(input: string): Date {
  const m = /^(\d{4})-(\d{2})/.exec(String(input || ""))
  if (!m) return new Date(NaN)
  const iso = toEasternIso(`${m[1]}-${m[2]}-01`, "12:00")
  return new Date(iso)
}

/**
 * Format a "YYYY-MM" (or full date string) as "Month YYYY" using ET.
 *   easternMonthLabel("2026-05-01")  → "May 2026"
 */
export function easternMonthLabel(input: string): string {
  const d = parseEasternMonth(input)
  if (isNaN(d.getTime())) return String(input || "")
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    month: "long",
    year: "numeric",
  }).format(d)
}

/**
 * Return the calendar day-of-week (0=Sun..6=Sat) for a YYYY-MM-DD in ET.
 */
export function easternDayOfWeek(date: string): number {
  const d = parseEasternMonth(date.slice(0, 7))
  // parseEasternMonth gives first-of-month; we need the actual day.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return new Date(date).getDay()
  // Build a noon-ET Date for the exact day.
  const iso = toEasternIso(date, "12:00")
  const dt = new Date(iso)
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
  })
  const wk = dtf.format(dt)
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wk)
}

/**
 * Inclusive list of YYYY-MM-DD dates between start and end, evaluated
 * in Eastern Time so month boundaries align with the calendar a user
 * sees on the wall.
 */
export function easternDateRange(startDate: string, endDate: string): string[] {
  const out: string[] = []
  const startM = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate)
  const endM = /^(\d{4})-(\d{2})-(\d{2})/.exec(endDate)
  if (!startM || !endM) return out
  // Walk by UTC days, but pin each step to noon ET via Intl.
  let cur = new Date(toEasternIso(startDate.slice(0, 10), "12:00"))
  const stop = new Date(toEasternIso(endDate.slice(0, 10), "12:00"))
  while (cur.getTime() <= stop.getTime()) {
    out.push(easternDate(cur.toISOString()))
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000)
  }
  return out
}

/**
 * First and last day (YYYY-MM-DD, ET-aware) of a given "YYYY-MM".
 */
export function easternMonthBounds(yearMonth: string): { start: string; end: string } {
  const m = /^(\d{4})-(\d{2})/.exec(yearMonth)
  if (!m) return { start: yearMonth, end: yearMonth }
  const year = Number(m[1])
  const month = Number(m[2]) // 1-12
  const start = `${m[1]}-${m[2]}-01`
  // Last day = day 0 of next month in local arithmetic, but we compute
  // the day count without timezone risk.
  const lastDay = new Date(year, month, 0).getDate() // safe: pure calendar math
  const end = `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`
  return { start, end }
}
