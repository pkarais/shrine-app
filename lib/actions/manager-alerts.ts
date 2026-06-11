"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireAuth, requireManager } from "./auth-helpers"

interface AlertPayload {
  type: string
  message: string
  severity: "critical" | "warning" | "info"
  userId?: string
  metadata?: Record<string, any>
}

export async function logAlertToManager(payload: AlertPayload) {
  try {
    // Verify caller is authenticated (staff or manager)
    const user = await requireAuth()
    const admin = createAdminClient()

    let triggeredBy = "System"
    let triggeredByRole = "system"

    // Use the authenticated user as the triggerer, or payload.userId if system event
    const effectiveUserId = payload.userId || user.id
    if (effectiveUserId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, role")
        .eq("id", effectiveUserId)
        .single()

      if (profile) {
        triggeredBy = profile.full_name || "Unknown"
        triggeredByRole = profile.role || "staff"
      }
    }

    // Deduplicate: check active table first, then archive (in case already ack'd+cleared today)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStr = todayStart.toISOString()

    // Build the dedup query — when userId is absent (system alerts) dedup
    // on alert_type + date only, without the user_id JSON path filter which
    // would produce `.eq("metadata->>user_id", "")` and match nothing.
    const buildDedupQuery = (table: string, dateField: string) => {
      let q = admin
        .from(table)
        .select("id")
        .eq("alert_type", payload.type)
        .gte(dateField, todayStr)
        .limit(1)
      if (payload.userId) {
        q = q.eq("metadata->>user_id", payload.userId)
      }
      return q.maybeSingle()
    }

    const { data: existing } = await buildDedupQuery("manager_alerts", "created_at")
    if (existing) return { success: true, alert: existing }

    const { data: archived } = await buildDedupQuery("manager_alerts_archive", "original_created_at")
    if (archived) return { success: true, alert: archived }

    const { data, error } = await admin
      .from("manager_alerts")
      .insert({
        alert_type: payload.type,
        message: payload.message,
        severity: payload.severity,
        triggered_by: triggeredBy,
        triggered_by_role: triggeredByRole,
        metadata: { ...(payload.metadata || {}), user_id: payload.userId },
        acknowledged: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to log manager alert:", error)
      return { success: false, error: error.message }
    }

    return { success: true, alert: data }
  } catch (err: any) {
    console.error("Error logging manager alert:", err)
    return { success: false, error: err.message }
  }
}

export async function getManagerAlerts(unacknowledgedOnly = true) {
  try {
    await requireManager()
    const admin = createAdminClient()

    let query = admin
      .from("manager_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (unacknowledgedOnly) {
      query = query.eq("acknowledged", false)
    }

    const { data, error } = await query

    if (error) {
      console.error("Failed to fetch manager alerts:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("Error fetching manager alerts:", err)
    return []
  }
}

export async function acknowledgeAlert(alertId: string) {
  try {
    await requireManager()
    const admin = createAdminClient()

    const { error } = await admin
      .from("manager_alerts")
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", alertId)

    if (error) {
      console.error("Failed to acknowledge alert:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error acknowledging alert:", err)
    return { success: false, error: err.message }
  }
}

export async function acknowledgeAllAlerts() {
  try {
    await requireManager()
    const admin = createAdminClient()

    const { error } = await admin
      .from("manager_alerts")
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("acknowledged", false)

    if (error) {
      console.error("Failed to acknowledge all alerts:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error acknowledging all alerts:", err)
    return { success: false, error: err.message }
  }
}

export async function deleteAcknowledgedAlerts() {
  // Moves all acknowledged alerts to manager_alerts_archive (30-day retention),
  // then deletes them from the active table. Archive rows block re-insertion (dedup).
  try {
    await requireManager()
    const admin = createAdminClient()

    const { data: acked } = await admin
      .from("manager_alerts")
      .select("id, alert_type, message, severity, triggered_by, triggered_by_role, metadata, acknowledged_at, created_at")
      .eq("acknowledged", true)

    if (!acked || acked.length === 0) return { success: true, archived: 0 }

    const now = new Date().toISOString()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const archiveRows = acked.map((a) => ({
      original_id: a.id,
      alert_type: a.alert_type,
      message: a.message,
      severity: a.severity,
      triggered_by: a.triggered_by,
      triggered_by_role: a.triggered_by_role,
      metadata: a.metadata ?? {},
      original_created_at: a.created_at,
      acknowledged_at: a.acknowledged_at ?? now,
      archived_at: now,
      expires_at: expires,
    }))

    const { error: archiveError } = await admin
      .from("manager_alerts_archive")
      .insert(archiveRows)
    if (archiveError) {
      console.error("Failed to archive alerts:", archiveError)
      return { success: false, error: archiveError.message }
    }

    const ids = acked.map((a) => a.id)
    const { error: deleteError } = await admin
      .from("manager_alerts")
      .delete()
      .in("id", ids)
    if (deleteError) {
      console.error("Failed to delete archived alerts:", deleteError)
      return { success: false, error: deleteError.message }
    }

    return { success: true, archived: archiveRows.length }
  } catch (err: any) {
    console.error("Error in deleteAcknowledgedAlerts:", err)
    return { success: false, error: err.message }
  }
}
