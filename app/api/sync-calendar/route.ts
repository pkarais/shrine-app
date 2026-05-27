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

function classifyEvent(summary: string) {
  const lower = summary.toLowerCase()
  if (MAJOR_FEAST_KEYWORDS.some(kw => lower.includes(kw))) return 'major_feast'
  if (HIGH_TRAFFIC_KEYWORDS.some(kw => lower.includes(kw))) return 'high_traffic'
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
    let upserted = 0

    for (const evt of items) {
      if (!evt.start?.dateTime && !evt.start?.date) continue
      const summary = evt.summary || "Untitled Event"
      const start = evt.start?.dateTime || evt.start?.date
      const end = evt.end?.dateTime || evt.end?.date || start
      const category = classifyEvent(summary)

      const { error } = await admin.from("events").upsert({
        title: summary,
        start_time: start,
        end_time: end,
        description: evt.description || "",
        category,
        required_ops: category === 'major_feast' ? 3 : category === 'high_traffic' ? 2 : 1,
        required_security: category === 'major_feast' ? 2 : 1,
        required_greeter: category === 'major_feast' ? 2 : 1,
        director_mandatory: category === 'major_feast',
      }, { onConflict: 'title,start_time' })

      if (!error) upserted++
    }

    return NextResponse.json({ success: true, synced: upserted, total: items.length })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
