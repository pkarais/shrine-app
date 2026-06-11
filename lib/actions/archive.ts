"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireManager } from "./auth-helpers"
import { revalidatePath } from "next/cache"
import { toEasternIso, easternToday } from "@/lib/eastern-time"

export type ArchiveScope = "messages" | "group_messages" | "incidents" | "all"

export type ArchiveResult = {
  scope: ArchiveScope
  cutoff: string
  counts: {
    messages: number
    group_messages: number
    incidents: number
  }
  total: number
}

// Default cutoff = midnight Eastern Time today (anything before is archived).
// Uses toEasternIso which is DST-aware and correct on UTC servers (Vercel).
function defaultCutoffIso(): string {
  const todayEt = easternToday() // "YYYY-MM-DD" in ET
  return new Date(toEasternIso(todayEt, "00:00")).toISOString()
}

async function archiveTable(
  admin: ReturnType<typeof createAdminClient>,
  source: string,
  archive: string,
  cutoffIso: string,
  archivedBy: string,
): Promise<number> {
  // Pull all rows with created_at < cutoff
  const { data: rows, error: selErr } = await admin
    .from(source)
    .select("*")
    .lt("created_at", cutoffIso)
  if (selErr) throw new Error(`${source} read failed: ${selErr.message}`)
  if (!rows || rows.length === 0) return 0

  const enriched = rows.map((r: any) => ({
    ...r,
    archived_at: new Date().toISOString(),
    archived_by: archivedBy,
  }))

  // Insert in chunks of 500 to stay under Postgres parameter limits.
  const chunkSize = 500
  for (let i = 0; i < enriched.length; i += chunkSize) {
    const chunk = enriched.slice(i, i + chunkSize)
    const { error: insErr } = await admin.from(archive).upsert(chunk, { onConflict: "id" })
    if (insErr) throw new Error(`${archive} insert failed: ${insErr.message}`)
  }

  // Delete from source only after successful archive insert.
  const ids = rows.map((r: any) => r.id)
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const { error: delErr } = await admin.from(source).delete().in("id", chunk)
    if (delErr) throw new Error(`${source} delete failed: ${delErr.message}`)
  }

  return rows.length
}

export async function archiveAndClear(
  scope: ArchiveScope = "all",
  cutoffIso?: string,
): Promise<ArchiveResult> {
  const user = await requireManager()
  const admin = createAdminClient()
  const cutoff = cutoffIso || defaultCutoffIso()
  const counts = { messages: 0, group_messages: 0, incidents: 0 }

  if (scope === "messages" || scope === "all") {
    counts.messages = await archiveTable(admin, "messages", "messages_archive", cutoff, user.id)
  }
  if (scope === "group_messages" || scope === "all") {
    counts.group_messages = await archiveTable(
      admin, "group_messages", "group_messages_archive", cutoff, user.id,
    )
  }
  if (scope === "incidents" || scope === "all") {
    counts.incidents = await archiveTable(admin, "incidents", "incidents_archive", cutoff, user.id)
  }

  const total = counts.messages + counts.group_messages + counts.incidents

  await admin.from("archive_runs").insert({
    scope,
    rows_archived: total,
    cutoff,
    triggered_by: user.id,
    note: `archived messages=${counts.messages}, group=${counts.group_messages}, incidents=${counts.incidents}`,
  })

  revalidatePath("/manager")
  revalidatePath("/messages")
  revalidatePath("/security")
  revalidatePath("/tickets")

  return { scope, cutoff, counts, total }
}

export async function getArchiveStats(): Promise<{
  live: { messages: number; group_messages: number; incidents: number }
  archived: { messages: number; group_messages: number; incidents: number }
  last_run: { triggered_at: string; rows_archived: number; scope: string } | null
}> {
  await requireManager()
  const admin = createAdminClient()

  const [m, g, i, ma, ga, ia, runs] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }),
    admin.from("group_messages").select("id", { count: "exact", head: true }),
    admin.from("incidents").select("id", { count: "exact", head: true }),
    admin.from("messages_archive").select("id", { count: "exact", head: true }),
    admin.from("group_messages_archive").select("id", { count: "exact", head: true }),
    admin.from("incidents_archive").select("id", { count: "exact", head: true }),
    admin.from("archive_runs").select("triggered_at, rows_archived, scope")
      .order("triggered_at", { ascending: false }).limit(1).maybeSingle(),
  ])

  return {
    live: {
      messages: m.count || 0,
      group_messages: g.count || 0,
      incidents: i.count || 0,
    },
    archived: {
      messages: ma.count || 0,
      group_messages: ga.count || 0,
      incidents: ia.count || 0,
    },
    last_run: runs.data
      ? {
          triggered_at: runs.data.triggered_at,
          rows_archived: runs.data.rows_archived || 0,
          scope: runs.data.scope || "",
        }
      : null,
  }
}
