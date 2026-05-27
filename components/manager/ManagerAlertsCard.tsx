"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, CheckCircle, AlertTriangle, AlertOctagon, Clock, User, MapPin, Volume2, Play } from "lucide-react"
import { getManagerAlerts, acknowledgeAlert } from "@/lib/actions/manager-alerts"
import { useAlertAudio } from "@/hooks/useAlertAudio"
import { Button } from "@/components/ui/Button"

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500", icon: AlertOctagon, bgColor: "bg-red-50", borderColor: "border-red-200" },
  warning: { color: "bg-amber-500", icon: AlertTriangle, bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  info: { color: "bg-blue-500", icon: Bell, bgColor: "bg-blue-50", borderColor: "border-blue-200" }
}

const ALERT_AUDIO_MAP: Record<string, string> = {
  geofence_violation: "manager_geofence_alert",
  late_clock_in: "manager_late_alert",
  missed_walkthrough: "manager_missed_walkthrough",
  safety_incident: "manager_safety_alert",
  task_overdue: "manager_task_overdue"
}

export default function ManagerAlertsCard() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [lastAlertCount, setLastAlertCount] = useState(0)
  const { play } = useAlertAudio()

  const loadAlerts = useCallback(async () => {
    try {
      const data = await getManagerAlerts(!showAcknowledged)
      setAlerts(data)
    } catch (err) {
      console.error("Failed to load alerts:", err)
    } finally {
      setLoading(false)
    }
  }, [showAcknowledged])

  useEffect(() => {
    loadAlerts()
    // Poll for new alerts every 10 seconds
    const interval = setInterval(loadAlerts, 10000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  useEffect(() => {
    // Play alert sound if new unacknowledged alerts arrive
    const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length
    if (unacknowledgedCount > lastAlertCount && lastAlertCount > 0) {
      // New alert arrived - play sound
      const newestAlert = alerts.find(a => !a.acknowledged)
      if (newestAlert) {
        const audioKey = ALERT_AUDIO_MAP[newestAlert.alert_type]
        if (audioKey) {
          play(audioKey as any)
        }
      }
    }
    setLastAlertCount(unacknowledgedCount)
  }, [alerts, lastAlertCount, play])

  async function handleAcknowledge(alertId: string) {
    setAcknowledging(alertId)
    try {
      await acknowledgeAlert(alertId)
      await loadAlerts()
    } catch (err) {
      console.error("Failed to acknowledge alert:", err)
    } finally {
      setAcknowledging(null)
    }
  }

  function playAlertSound(alertType: string) {
    const audioKey = ALERT_AUDIO_MAP[alertType]
    if (audioKey) {
      play(audioKey as any)
    }
  }

  if (loading) {
    return (
      <div className="bg-surface-container-low rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-headline font-bold text-lg text-on-surface">Manager Alerts</h3>
        </div>
        <p className="text-sm text-on-surface-variant">Loading alerts...</p>
      </div>
    )
  }

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length

  return (
    <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-headline font-bold text-lg text-on-surface">
            Manager Alerts
            {unacknowledgedCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unacknowledgedCount}
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            className="text-xs text-on-surface-variant hover:text-primary transition-colors"
          >
            {showAcknowledged ? "Hide Acknowledged" : "Show All"}
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <p className="text-on-surface-variant">
            {showAcknowledged ? "No alerts in system" : "No active alerts"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {alerts.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info
            const Icon = config.icon
            const audioKey = ALERT_AUDIO_MAP[alert.alert_type]
            
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${config.borderColor} ${config.bgColor} ${
                  alert.acknowledged ? "opacity-50" : ""
                }`}
              >
                {/* Alert Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-on-surface capitalize">
                          {alert.alert_type.replace(/_/g, " ")}
                        </p>
                        {alert.acknowledged && (
                          <span className="text-[10px] px-2 py-0.5 bg-surface-container rounded-full text-on-surface-variant">
                            Acknowledged
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant mt-1">{alert.message}</p>
                      
                      {/* Staff Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {alert.triggered_by || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.created_at).toLocaleTimeString([], { 
                            hour: "2-digit", 
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </span>
                        {alert.metadata?.distance && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {alert.metadata.distance}m outside
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Play Audio Button */}
                    {audioKey && (
                      <button
                        onClick={() => playAlertSound(alert.alert_type)}
                        className="p-2 rounded-lg bg-surface-container hover:bg-primary/10 transition-colors"
                        title="Play alert sound"
                      >
                        <Volume2 className="w-4 h-4 text-primary" />
                      </button>
                    )}
                    
                    {/* Acknowledge Button */}
                    {!alert.acknowledged && (
                      <Button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={acknowledging === alert.id}
                        variant="outline"
                        size="sm"
                      >
                        {acknowledging === alert.id ? "..." : "Ack"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
