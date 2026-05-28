import { NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"

const MAJOR_FEAST_KEYWORDS = [
  'nativity', 'easter', 'pascha', 'pentecost', 'annunciation',
  'dormition', 'theotokos', 'transfiguration', 'epiphany', 'theophany',
  'palm sunday', 'holy week', 'great lent', 'clean monday',
  'independence', 'october', '25th', '25 march', '25 december',
  'feast', 'major', 'archdiocese', 'metropolis',
]

const HIGH_TRAFFIC_KEYWORDS = [
  'festival', 'gala', 'dinner', 'banquet', 'conference',
  'pilgrimage', 'procession', 'memorial', 'commemoration',
]

// Small evening events: 1 ops + 1 security, no greeter needed
const SMALL_EVENT_KEYWORDS = [
  'bible study', 'bible', 'study group', 'book study',
  'prayer group', 'prayer meeting', 'vespers', 'paraklesis',
  'akathist', 'evening prayer', 'compline',
]

function classifyEvent(summary: string) {
  const lower = summary.toLowerCase()
  if (MAJOR_FEAST_KEYWORDS.some(kw => lower.includes(kw))) return 'major_feast'
  if (HIGH_TRAFFIC_KEYWORDS.some(kw => lower.includes(kw))) return 'high_traffic'
  if (SMALL_EVENT_KEYWORDS.some(kw => lower.includes(kw))) return 'small_event'
  return 'standard'
}

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "GOOGLE_CALENDAR_API_KEY not configured" }, { status: 500 })
    }

    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&maxResults=2500`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`)
    const data = await res.json()
    const items = data.items || []

    const admin = createAdminClient()

    // Build lookup of existing events in the sync window by (title, start_time)
    // so we can tell inserts from updates without relying on a DB unique constraint.
    const { data: existingEvents } = await admin
      .from("events")
      .select("id, title, start_time")
      .gte("start_time", timeMin)
      .lte("start_time", timeMax)

    // Key: "title|||ISO-start" → existing row id
    const existingMap = new Map<string, number>(
      (existingEvents || []).map((e: any) => [`${e.title}|||${new Date(e.start_time).toISOString()}`, e.id])
    )

    let upserted = 0

    for (const evt of items) {
      if (!evt.start?.dateTime && !evt.start?.date) continue
      const summary = evt.summary || "Untitled Event"
      const start = evt.start?.dateTime || evt.start?.date
      const end = evt.end?.dateTime || evt.end?.date || start
      const category = classifyEvent(summary)

      const eventData = {
        title: summary,
        start_time: start,
        end_time: end,
        description: evt.description || "",
        category,
        required_ops: category === 'major_feast' ? 3 : category === 'high_traffic' ? 2 : 1,
        required_security: category === 'major_feast' ? 2 : 1,
        required_greeter: category === 'major_feast' ? 2 : category === 'small_event' ? 0 : 1,
        director_mandatory: category === 'major_feast',
      }

      const key = `${summary}|||${new Date(start).toISOString()}`
      const existingId = existingMap.get(key)

      if (existingId) {
        // Update the existing row — preserves staff_assignments FK links
        const { error } = await admin.from("events").update(eventData).eq("id", existingId)
        if (!error) upserted++
      } else {
        // New event instance — insert fresh row
        const { error } = await admin.from("events").insert(eventData)
        if (!error) upserted++
      }
    }

    return NextResponse.json({ success: true, synced: upserted, total: items.length })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
