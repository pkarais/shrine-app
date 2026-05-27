const CALENDAR_TZ = "America/New_York"

function getEasternOffset(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00Z")
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  if (m > 3 && m < 11) return 4
  if (m < 3 || m > 11) return 5
  if (m === 3) return day >= 8 ? 4 : 5
  if (m === 11) return day < 1 ? 4 : 5
  return 5
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
    id: -999,
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
