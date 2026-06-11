"use server"

/**
 * Schedule template snapshots — persists the most recent PDF upload as a
 * JSON "bucket dump" in Supabase Storage so the Seed Template button can
 * use it as the default weekly pattern instead of the hardcoded static
 * schedule.
 *
 * Bucket: `schedule-templates` (private). File: `latest.json`.
 *
 * NOTE: Only async functions may be exported from a "use server" module.
 * Types live in `schedule-template-types.ts` and the sync helper
 * `snapshotToWeeklyTemplate` lives in `schedule-template-helpers.ts`.
 */

import { createAdminClient } from "@/utils/supabase/server"
import type { TemplateSnapshot } from "@/lib/schedule-template-types"

const BUCKET = "schedule-templates"
const LATEST_FILE = "latest.json"

async function ensureBucket(admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  const { data: buckets } = await admin.storage.listBuckets()
  if ((buckets || []).some((b) => b.name === BUCKET)) return
  await admin.storage.createBucket(BUCKET, { public: false })
}

/**
 * Save the current upload as the latest template snapshot.
 * Returns an error string for the caller to surface as a warning, or null on success.
 */
export async function saveTemplateSnapshot(snapshot: TemplateSnapshot): Promise<string | null> {
  try {
    const admin = createAdminClient()
    if (!admin) return "Snapshot skipped: SUPABASE_SERVICE_ROLE_KEY missing"
    await ensureBucket(admin)
    const body = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" })
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(LATEST_FILE, body, { upsert: true, contentType: "application/json" })
    if (error) return `Snapshot upload failed: ${error.message}`
    return null
  } catch (err: any) {
    return `Snapshot error: ${err?.message || String(err)}`
  }
}

/**
 * Load the latest template snapshot. Returns null if the bucket or file
 * doesn't exist (first-run, never uploaded a PDF).
 */
export async function loadLatestTemplateSnapshot(): Promise<TemplateSnapshot | null> {
  try {
    const admin = createAdminClient()
    if (!admin) return null
    const { data, error } = await admin.storage.from(BUCKET).download(LATEST_FILE)
    if (error || !data) return null
    const text = await data.text()
    const parsed = JSON.parse(text) as TemplateSnapshot
    if (!parsed || !Array.isArray(parsed.shifts) || parsed.shifts.length === 0) return null
    return parsed
  } catch {
    return null
  }
}
