import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueMonth, preparedBy } = body

    if (!issueMonth) {
      return NextResponse.json({ error: "issueMonth is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: issueId, error: rpcError } = await admin.rpc("generate_operations_brief_draft", {
      p_issue_month: issueMonth,
      p_prepared_by: preparedBy || null,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    const { data: issue, error: issueError } = await admin
      .from("operations_brief_issues")
      .select("*")
      .eq("id", issueId)
      .single()

    if (issueError) {
      return NextResponse.json({ error: issueError.message }, { status: 500 })
    }

    const { data: sections, error: sectionError } = await admin
      .from("operations_brief_sections")
      .select("*")
      .eq("issue_id", issueId)
      .order("section_order", { ascending: true })

    if (sectionError) {
      return NextResponse.json({ error: sectionError.message }, { status: 500 })
    }

    return NextResponse.json({ issue, sections: sections ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
