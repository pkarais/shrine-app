import { NextRequest, NextResponse } from "next/server"
import { parseSchedulePdf } from "@/lib/schedule-pdf-parser"
import {
  parseExcelBuffer,
  parseCsvText,
  parsePastedText,
} from "@/lib/schedule-spreadsheet-parser"
import { createServerClient } from "@/utils/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_PASTE_CHARS = 1_000_000

type Format = "pdf" | "xlsx" | "csv" | "paste"

function detectFormat(file: File | null, explicit: string | null): Format | null {
  if (explicit) {
    const v = explicit.toLowerCase()
    if (v === "pdf" || v === "xlsx" || v === "csv" || v === "paste") return v
  }
  if (!file) return null
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) return "xlsx"
  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) return "csv"
  const type = (file.type || "").toLowerCase()
  if (type === "application/pdf") return "pdf"
  if (type.includes("spreadsheet") || type.includes("excel")) return "xlsx"
  if (type === "text/csv" || type === "text/plain") return "csv"
  return null
}

export async function POST(req: NextRequest) {
  // Manager auth
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") {
    return NextResponse.json({ error: "Manager role required" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const fileEntry = formData.get("file")
  const file = fileEntry instanceof File ? fileEntry : null
  const pasted = String(formData.get("pasted") || "")
  const explicitFormat = String(formData.get("format") || "") || null

  // Paste branch — no file
  if (pasted) {
    if (pasted.length > MAX_PASTE_CHARS) {
      return NextResponse.json(
        { error: `Pasted text too large (${MAX_PASTE_CHARS} chars max)` },
        { status: 413 }
      )
    }
    try {
      const parsed = parsePastedText(pasted)
      return NextResponse.json(parsed)
    } catch (err: any) {
      return NextResponse.json(
        { error: "Failed to parse pasted text", detail: err?.message || String(err) },
        { status: 422 }
      )
    }
  }

  if (!file) {
    return NextResponse.json({ error: "Provide either a file or pasted text" }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (${MAX_FILE_BYTES / (1024 * 1024)} MB max)` },
      { status: 413 }
    )
  }

  const format = detectFormat(file, explicitFormat)
  if (!format) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.name}. Use PDF, XLSX, or CSV.` },
      { status: 415 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    if (format === "pdf") {
      const parsed = await parseSchedulePdf(buffer)
      return NextResponse.json(parsed)
    }

    if (format === "xlsx") {
      const parsed = await parseExcelBuffer(buffer, file.name)
      return NextResponse.json(parsed)
    }

    const text = buffer.toString("utf8")
    const parsed = parseCsvText(text, file.name)
    return NextResponse.json(parsed)
  } catch (err: any) {
    return NextResponse.json(
      {
        error: `Failed to parse ${format.toUpperCase()}`,
        detail: err?.message || String(err),
      },
      { status: 422 }
    )
  }
}
