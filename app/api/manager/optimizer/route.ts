import { NextResponse } from "next/server"
import { createServerClient } from "@/utils/supabase/server"
import { analyzeOvertime } from "@/lib/overtime-analysis"

export async function POST(req: Request) {
  try {
    const supabase = createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "manager") {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { provider, apiKey } = body

    const { data: shifts } = await supabase
      .from("shifts")
      .select("id, clock_in, clock_out, events(title)")
      .not("clock_out", "is", null)
      .order("clock_in", { ascending: false })
      .limit(100)

    const overtimeShifts = analyzeOvertime(shifts || []).filter((shift: any) => shift.isOvertime)

    const totalExcessHours = overtimeShifts.reduce(
      (sum: number, shift: any) => sum + Math.max(0, shift.paidHours - 8),
      0,
    )

    const estimatedSavings = Math.round(totalExcessHours * 28 * 100) / 100

    let suggestions = overtimeShifts.slice(0, 8).map((shift: any) => ({
      id: shift.id,
      eventTitle: shift.events?.title || "Unknown Event",
      excessHours: Math.max(0, shift.paidHours - 8),
    }))

    // If AI provider is configured, enhance suggestions
    if (provider && provider !== "none" && apiKey) {
      try {
        const aiSuggestions = await getAIRecommendations(provider, apiKey, overtimeShifts)
        if (aiSuggestions && aiSuggestions.length > 0) {
          suggestions = aiSuggestions
        }
      } catch (aiErr: any) {
        console.error("AI optimization failed, falling back to basic math:", aiErr.message)
      }
    }

    return NextResponse.json({
      estimatedSavings,
      suggestions,
      generatedAt: new Date().toISOString(),
      aiEnhanced: !!(provider && provider !== "none" && apiKey),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to run optimizer", details: String(error?.message || error) },
      { status: 500 },
    )
  }
}

async function getAIRecommendations(provider: string, apiKey: string, shifts: any[]) {
  const prompt = `You are a shift scheduling optimizer for a shrine operations team. Analyze the following overtime shifts and provide specific, actionable recommendations to reduce overtime costs. Each shift shows paid hours worked. Respond with a JSON array of suggestions, each with: eventTitle (string), excessHours (number), and reason (string). Keep it concise and practical.

Shifts data:
${JSON.stringify(shifts.map((s: any) => ({ event: s.events?.title || "Unknown", paidHours: s.paidHours, date: s.clock_in })), null, 2)}

Respond ONLY with valid JSON array.`

  let responseText = ""

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    })
    const data = await res.json()
    responseText = data.choices?.[0]?.message?.content || ""
  } else if (provider === "gemini") {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    const data = await res.json()
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  } else if (provider === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    })
    const data = await res.json()
    responseText = data.choices?.[0]?.message?.content || ""
  }

  if (!responseText) return null

  // Extract JSON from markdown code blocks if present
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || responseText.match(/(\[[\s\S]*\])/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim()

  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx: number) => ({
        id: `ai-${idx}`,
        eventTitle: item.eventTitle || item.event || "Unknown Event",
        excessHours: Number(item.excessHours) || 0,
        reason: item.reason || "",
      }))
    }
  } catch {
    // If JSON parsing fails, return null to fall back
  }

  return null
}
