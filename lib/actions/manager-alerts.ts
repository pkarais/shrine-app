"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

interface AlertPayload {
  type: string
  message: string
  severity: "critical" | "warning" | "info"
  metadata?: Record<string, any>
}

export async function logAlertToManager(payload: AlertPayload) {
  const admin = createAdminClient()
  
  // Get current user info
  const cookieStore = cookies()
  const devName = cookieStore.get("shrine_dev_name")?.value || "Unknown Staff"
  const devRole = cookieStore.get("shrine_dev_role")?.value || "staff"
  
  try {
    // Insert alert into database for managers to see
    const { data, error } = await admin
      .from("manager_alerts")
      .insert({
        alert_type: payload.type,
        message: payload.message,
        severity: payload.severity,
        triggered_by: devName,
        triggered_by_role: devRole,
        metadata: payload.metadata || {},
        acknowledged: false,
        created_at: new Date().toISOString()
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
  const admin = createAdminClient()
  
  try {
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
  const admin = createAdminClient()
  
  try {
    const { error } = await admin
      .from("manager_alerts")
      .update({ 
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
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
