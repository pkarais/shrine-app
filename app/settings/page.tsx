"use client"

import { useState, useEffect } from "react"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { useTheme } from "@/components/theme/ThemeProvider"
import { Bell, Volume2, VolumeX, Clock, Shield, AlertTriangle, Moon, Sun, Smartphone } from "lucide-react"
import { Switch } from "@/components/ui/Switch"
import { Button } from "@/components/ui/Button"
import { useAlertAudio } from "@/hooks/useAlertAudio"

type AlertCategory = {
  id: string
  label: string
  icon: any
  alerts: AlertSetting[]
}

type AlertSetting = {
  id: string
  label: string
  description: string
  audioKey: string
  defaultEnabled: boolean
  isPersonal?: boolean
}

const ALERT_CATEGORIES: AlertCategory[] = [
  {
    id: "staff-reminders",
    label: "Personal Reminders",
    icon: Clock,
    alerts: [
      { id: "wake_up", label: "Wake Up", description: "Morning wake up reminder", audioKey: "wake_up_reminder", defaultEnabled: true, isPersonal: true },
      { id: "shift_start", label: "Shift Start", description: "Reminder before shift starts", audioKey: "shift_start_reminder", defaultEnabled: true, isPersonal: true },
      { id: "shift_started", label: "Shift Started", description: "Confirmation when shift starts", audioKey: "shift_started", defaultEnabled: true, isPersonal: true },
      { id: "break", label: "Break Reminder", description: "Take a break reminder", audioKey: "break_reminder", defaultEnabled: true, isPersonal: true },
      { id: "break_over", label: "Break Over", description: "Break time ended", audioKey: "break_over_reminder", defaultEnabled: true, isPersonal: true },
      { id: "end_of_shift", label: "End of Shift", description: "Shift ending reminder", audioKey: "end_of_shift_reminder", defaultEnabled: true, isPersonal: true },
      { id: "missed_clock_out", label: "Missed Clock-Out", description: "Forgot to clock out", audioKey: "missed_clock_out_reminder", defaultEnabled: true, isPersonal: true },
      { id: "leave_now", label: "Leave Now", description: "Time to leave reminder", audioKey: "leave_now_reminder", defaultEnabled: true, isPersonal: true },
    ]
  },
  {
    id: "geofence",
    label: "Location Alerts",
    icon: Smartphone,
    alerts: [
      { id: "geofence_warning", label: "Geofence Warning", description: "Outside approved area", audioKey: "geofence_warning", defaultEnabled: true },
      { id: "near_geofence", label: "Near Geofence", description: "Approaching boundary", audioKey: "near_geofence_warning", defaultEnabled: true },
      { id: "suspicious_location", label: "Suspicious Location", description: "Unexpected location", audioKey: "suspicious_location_warning", defaultEnabled: true },
      { id: "late", label: "Late Warning", description: "Running late alert", audioKey: "late_warning", defaultEnabled: true },
    ]
  },
  {
    id: "safety",
    label: "Safety & Security",
    icon: Shield,
    alerts: [
      { id: "blocked_exit", label: "Blocked Exit", description: "Emergency exit blocked", audioKey: "blocked_exit_warning", defaultEnabled: true },
      { id: "hazard", label: "Hazard Reminder", description: "Safety hazard detected", audioKey: "hazard_reminder", defaultEnabled: true },
      { id: "safety_issue", label: "Safety Issue", description: "Safety incident reported", audioKey: "safety_issue_reported", defaultEnabled: true },
      { id: "security_issue", label: "Security Issue", description: "Security incident reported", audioKey: "security_issue_reported", defaultEnabled: true },
    ]
  },
  {
    id: "tasks",
    label: "Task Alerts",
    icon: AlertTriangle,
    alerts: [
      { id: "task_assigned", label: "Task Assigned", description: "New task assigned to you", audioKey: "task_assigned", defaultEnabled: true },
      { id: "task_due_soon", label: "Task Due Soon", description: "Task deadline approaching", audioKey: "task_due_soon", defaultEnabled: true },
      { id: "task_overdue", label: "Task Overdue", description: "Task past deadline", audioKey: "task_overdue", defaultEnabled: true },
      { id: "urgent_task", label: "Urgent Task", description: "High priority task", audioKey: "urgent_task", defaultEnabled: true },
      { id: "task_completed", label: "Task Completed", description: "Task done confirmation", audioKey: "task_completed", defaultEnabled: true },
    ]
  },
  {
    id: "walkthroughs",
    label: "Walkthrough Reminders",
    icon: Bell,
    alerts: [
      { id: "opening_walkthrough", label: "Opening Walkthrough", description: "Morning checklist due", audioKey: "opening_walkthrough_reminder", defaultEnabled: true },
      { id: "closing_walkthrough", label: "Closing Walkthrough", description: "Evening checklist due", audioKey: "closing_walkthrough_reminder", defaultEnabled: true },
      { id: "security_check", label: "Security Check", description: "Security walkthrough", audioKey: "security_check_reminder", defaultEnabled: true },
      { id: "checklist_incomplete", label: "Checklist Incomplete", description: "Items not completed", audioKey: "checklist_incomplete", defaultEnabled: true },
      { id: "door_check", label: "Door Check", description: "Door not verified", audioKey: "door_check_missing", defaultEnabled: true },
    ]
  },
]

const MANAGER_ALERTS: AlertCategory[] = [
  {
    id: "manager-critical",
    label: "Manager Alerts (Critical)",
    icon: AlertTriangle,
    alerts: [
      { id: "manager_geofence", label: "Geofence Violation", description: "Staff outside approved area", audioKey: "manager_geofence_alert", defaultEnabled: true },
      { id: "manager_late", label: "Late Clock-In", description: "Staff member is late", audioKey: "manager_late_alert", defaultEnabled: true },
      { id: "manager_safety", label: "Safety Incident", description: "Safety issue reported", audioKey: "manager_safety_alert", defaultEnabled: true },
      { id: "manager_missed_walkthrough", label: "Missed Walkthrough", description: "Required walkthrough not done", audioKey: "manager_missed_walkthrough", defaultEnabled: true },
      { id: "manager_task_overdue", label: "Task Overdue", description: "Task past deadline", audioKey: "manager_task_overdue", defaultEnabled: true },
    ]
  },
]

export default function SettingsPage() {
  const { isDarkMode } = useTheme()
  const { play, preloadAll } = useAlertAudio()
  const [isManager, setIsManager] = useState(false)
  const [globalAudioEnabled, setGlobalAudioEnabled] = useState(true)
  const [globalTextEnabled, setGlobalTextEnabled] = useState(true)
  const [alertSettings, setAlertSettings] = useState<Record<string, { audio: boolean; text: boolean }>>({})
  const [activeCategory, setActiveCategory] = useState("staff-reminders")
  const [testPlaying, setTestPlaying] = useState<string | null>(null)

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shrine-alert-settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setAlertSettings(parsed.alerts || {})
        setGlobalAudioEnabled(parsed.globalAudio !== false)
        setGlobalTextEnabled(parsed.globalText !== false)
      } catch {}
    } else {
      // Initialize defaults
      const defaults: Record<string, { audio: boolean; text: boolean }> = {}
      ;[...ALERT_CATEGORIES, ...MANAGER_ALERTS].forEach(cat => {
        cat.alerts.forEach(alert => {
          defaults[alert.id] = { audio: alert.defaultEnabled, text: true }
        })
      })
      setAlertSettings(defaults)
    }

    // Check if manager
    const checkManager = async () => {
      const supabase = (await import("@/utils/supabase/client")).createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        setIsManager(profile?.role === "manager")
      }
    }
    checkManager()

    // Preload audio
    preloadAll()
  }, [preloadAll])

  // Save settings
  const saveSettings = () => {
    localStorage.setItem("shrine-alert-settings", JSON.stringify({
      alerts: alertSettings,
      globalAudio: globalAudioEnabled,
      globalText: globalTextEnabled,
      lastUpdated: new Date().toISOString()
    }))
  }

  const toggleAlert = (alertId: string, type: "audio" | "text") => {
    setAlertSettings(prev => {
      const updated = {
        ...prev,
        [alertId]: {
          ...prev[alertId],
          [type]: !prev[alertId]?.[type]
        }
      }
      return updated
    })
    setTimeout(saveSettings, 100)
  }

  const testAlert = async (alert: AlertSetting) => {
    if (testPlaying === alert.id) return
    setTestPlaying(alert.id)
    
    if (globalAudioEnabled && alertSettings[alert.id]?.audio) {
      play(alert.audioKey as any)
    }
    
    setTimeout(() => setTestPlaying(null), 3000)
  }

  const getCategoryAlerts = () => {
    const cat = [...ALERT_CATEGORIES, ...(isManager ? MANAGER_ALERTS : [])].find(c => c.id === activeCategory)
    return cat?.alerts || []
  }

  const categories = [...ALERT_CATEGORIES, ...(isManager ? MANAGER_ALERTS : [])]

  return (
    <>
      <TopAppBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-10 sm:pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-bold text-on-surface">Alert Settings</h1>
              <p className="text-sm text-on-surface-variant">Configure your notifications and reminders</p>
            </div>
          </div>
          <Button onClick={saveSettings} variant="primary" size="sm">
            Save Changes
          </Button>
        </div>

        {/* Global Settings */}
        <div className="card-surface rounded-2xl p-6 mb-6 border border-outline-variant/30">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            Global Alert Preferences
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-secondary" />
                <div>
                  <p className="font-medium text-on-surface">Audio Alerts</p>
                  <p className="text-xs text-on-surface-variant">Play sound for notifications</p>
                </div>
              </div>
              <Switch 
                checked={globalAudioEnabled} 
                onCheckedChange={setGlobalAudioEnabled}
                onChange={saveSettings}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-secondary" />
                <div>
                  <p className="font-medium text-on-surface">Text Alerts</p>
                  <p className="text-xs text-on-surface-variant">Show visual notifications</p>
                </div>
              </div>
              <Switch 
                checked={globalTextEnabled} 
                onCheckedChange={setGlobalTextEnabled}
                onChange={saveSettings}
              />
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Alert List */}
        <div className="card-surface rounded-2xl p-6 border border-outline-variant/30">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-4">
            {categories.find(c => c.id === activeCategory)?.label}
          </h2>
          <div className="space-y-3">
            {getCategoryAlerts().map(alert => (
              <div 
                key={alert.id} 
                className="flex items-center justify-between p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-on-surface">{alert.label}</p>
                    {alert.isPersonal && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Personal</span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant">{alert.description}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Test Button */}
                  <button
                    onClick={() => testAlert(alert)}
                    disabled={testPlaying === alert.id || !globalAudioEnabled}
                    className="p-2 rounded-lg bg-surface-container-low hover:bg-primary/10 transition-colors disabled:opacity-50"
                    title="Test alert"
                  >
                    <Volume2 className={`w-4 h-4 ${testPlaying === alert.id ? 'text-primary animate-pulse' : 'text-on-surface-variant'}`} />
                  </button>

                  {/* Text Toggle */}
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-on-surface-variant" />
                    <Switch 
                      checked={alertSettings[alert.id]?.text ?? true}
                      onCheckedChange={() => toggleAlert(alert.id, "text")}
                      size="sm"
                    />
                  </div>

                  {/* Audio Toggle */}
                  <div className="flex items-center gap-2">
                    {alertSettings[alert.id]?.audio && globalAudioEnabled ? (
                      <Volume2 className="w-4 h-4 text-secondary" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-on-surface-variant" />
                    )}
                    <Switch 
                      checked={alertSettings[alert.id]?.audio ?? alert.defaultEnabled}
                      onCheckedChange={() => toggleAlert(alert.id, "audio")}
                      disabled={!globalAudioEnabled}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 p-4 rounded-xl bg-surface-container border border-outline-variant/30">
          <p className="text-sm text-on-surface-variant">
            <strong>Note:</strong> Alert preferences are saved to your browser. Text alerts will always show on screen. 
            Audio alerts require sound to be enabled. Personal reminders are configurable per-user.
          </p>
        </div>
      </main>
    </>
  )
}
