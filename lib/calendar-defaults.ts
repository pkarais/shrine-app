const CALENDAR_TZ = "America/New_York"

/**
 * Returns the Eastern Time UTC offset (hours ahead) for a given date string.
 * Uses Intl.DateTimeFormat to correctly handle DST transitions for
 * America/New_York — EST = 5 (UTC-5), EDT = 4 (UTC-4).
 */
function getEasternOffset(dateStr: string): number {
  // Probe at noon UTC on that date — safely inside the ET day and away
  // from any DST boundary edge case.
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const etHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CALENDAR_TZ,
      hour: "2-digit",
      hour12: false,
    }).format(probe)
  )
  const utcHour = probe.getUTCHours()
  // ET is always UTC-4 or UTC-5; compute the offset directly.
  const diff = utcHour - etHour
  // diff is 4 (EDT) or 5 (EST). Guard against any Intl quirks.
  return diff === 4 ? 4 : 5
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getDay()
}

export interface CalendarEvent {
  id: number
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  category: string
  dcs_link: string | null
  required_ops: number
  required_security: number
  required_greeter: number
  director_mandatory: boolean
  google_event_id: string | null
  created_at: string
  updated_at: string
}

export function injectSundayOrthros<T extends CalendarEvent>(
  dateStr: string,
  events: T[]
): T[] {
  if (getDayOfWeek(dateStr) !== 0) return events

  const offset = getEasternOffset(dateStr)
  const orthrosStart = new Date(`${dateStr}T${String(9 + offset).padStart(2, "0")}:00:00Z`)
  const orthrosEnd = new Date(`${dateStr}T${String(12 + offset).padStart(2, "0")}:00:00Z`)

  const synthetic = {
    id: -1 * Number(dateStr.replace(/-/g, "")),
    title: "Orthos & Divine Liturgy",
    description: "Default Sunday morning service",
    start_time: orthrosStart.toISOString(),
    end_time: orthrosEnd.toISOString(),
    category: "standard",
    dcs_link: null,
    required_ops: 0,
    required_security: 0,
    required_greeter: 0,
    director_mandatory: false,
    google_event_id: null,
    created_at: "",
    updated_at: "",
  } as T

  return [...events, synthetic]
}
