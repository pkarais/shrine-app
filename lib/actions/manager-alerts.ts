"use server"

import { createAdminClient } from "@/utils/supabase/server"

interface AlertPayload {
  type: string
  message: string
  severity: "critical" | "warning" | "info"
  userId?: string
  metadata?: Record<string, any>
}

export async function logAlertToManager(payload: AlertPayload) {
  try {
    const admin = createAdminClient()

    let triggeredBy = "System"
    let triggeredByRole = "system"

    if (payload.userId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, role")
        .eq("id", payload.userId)
        .single()

      if (profile) {
        triggeredBy = profile.full_name || "Unknown"
        triggeredByRole = profile.role || "staff"
      }
    }

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
