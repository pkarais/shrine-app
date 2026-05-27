"use client"

import { useState, useEffect, useCallback } from "react"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { Bell, Volume2, VolumeX, Clock, Shield, AlertTriangle, Moon, Sun, Smartphone, AlarmClock, Check, User } from "lucide-react"
import { Switch } from "@/components/ui/Switch"
import { Button } from "@/components/ui/Button"
import { useAlertAudio } from "@/hooks/useAlertAudio"
import { getWakeUpAlarm, setWakeUpAlarm, deleteWakeUpAlarm } from "@/lib/actions/wake-up-alarm"
import { createClient } from "@/utils/supabase/client"

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
}

const ALERT_CATEGORIES: AlertCategory[] = [
  {
    id: "staff-reminders",
    label: "Personal Reminders",
    icon: Clock,
    alerts: [
      { id: "shift_start", label: "Shift Start", description: "Reminder before shift starts", audioKey: "shift_start_reminder", defaultEnabled: true },
      { id: "break", label: "Break Reminder", description: "Take a break reminder", audioKey: "break_reminder", defaultEnabled: true },
      { id: "break_over", label: "Break Over", description: "Break time ended", audioKey: "break_over_reminder", defaultEnabled: true },
      { id: "end_of_shift", label: "End of Shift", description: "Shift ending reminder", audioKey: "end_of_shift_reminder", defaultEnabled: true },
      { id: "missed_clock_out", label: "Missed Clock-Out", description: "Forgot to clock out", audioKey: "missed_clock_out_reminder", defaultEnabled: true },
      { id: "leave_now", label: "Leave Now", description: "Time to leave reminder", audioKey: "leave_now_reminder", defaultEnabled: true },
      { id: "idle", label: "Idle Reminder", description: "No activity detected", audioKey: "idle_reminder", defaultEnabled: true },
      { id: "low_battery", label: "Low Battery", description: "Device battery low", audioKey: "low_battery_reminder", defaultEnabled: true },
    ]
  },
  {
    id: "location",
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
      { id: "task_note", label: "Note Required", description: "Note required on task", audioKey: "task_note_required", defaultEnabled: true },
      { id: "task_photo", label: "Photo Required", description: "Photo required on task", audioKey: "task_photo_required", defaultEnabled: true },
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
  {
    id: "leaderboard",
    label: "Recognition",
    icon: Bell,
    alerts: [
      { id: "badge_earned", label: "Badge Earned", description: "Recognition badge awarded", audioKey: "badge_earned", defaultEnabled: true },
      { id: "eom_nomination", label: "EOM Nomination", description: "Employee of Month nomination", audioKey: "eom_nomination", defaultEnabled: true },
      { id: "eom_winner", label: "EOM Winner", description: "Employee of Month awarded", audioKey: "eom_winner", defaultEnabled: true },
      { id: "leaderboard_jump", label: "Leaderboard Jump", description: "Moved up rankings", audioKey: "leaderboard_jump", defaultEnabled: true },
      { id: "points_deducted", label: "Points Deducted", description: "Points deducted", audioKey: "points_deducted", defaultEnabled: true },
      { id: "top_five", label: "Top Five", description: "In top five leaderboard", audioKey: "top_five_alert", defaultEnabled: true },
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

function ManagerAlertControls() {
  const { play, preloadAll } = useAlertAudio()
  const [globalAudioEnabled, setGlobalAudioEnabled] = useState(true)
  const [globalTextEnabled, setGlobalTextEnabled] = useState(true)
  const [alertSettings, setAlertSettings] = useState<Record<string, { audio: boolean; text: boolean }>>({})
  const [activeCategory, setActiveCategory] = useState("staff-reminders")
  const [testPlaying, setTestPlaying] = useState<string | null>(null)

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
      const defaults: Record<string, { audio: boolean; text: boolean }> = {}
      ;[...ALERT_CATEGORIES, ...MANAGER_ALERTS].forEach(cat => {
        cat.alerts.forEach(alert => {
          defaults[alert.id] = { audio: alert.defaultEnabled, text: true }
        })
      })
      setAlertSettings(defaults)
    }
    preloadAll()
  }, [preloadAll])

  const saveSettings = () => {
    localStorage.setItem("shrine-alert-settings", JSON.stringify({
      alerts: alertSettings,
      globalAudio: globalAudioEnabled,
      globalText: globalTextEnabled,
      lastUpdated: new Date().toISOString()
    }))
  }

  const toggleAlert = (alertId: string, type: "audio" | "text") => {
    setAlertSettings(prev => ({
      ...prev,
      [alertId]: { ...prev[alertId], [type]: !prev[alertId]?.[type] }
    }))
    setTimeout(saveSettings, 100)
  }

  const testAlert = (alert: AlertSetting) => {
    if (testPlaying === alert.id) return
    setTestPlaying(alert.id)
    if (globalAudioEnabled && alertSettings[alert.id]?.audio) {
      play(alert.audioKey as any)
    }
    setTimeout(() => setTestPlaying(null), 3000)
  }

  const categories = [...ALERT_CATEGORIES, ...MANAGER_ALERTS]
  const categoryAlerts = categories.find(c => c.id === activeCategory)?.alerts || []

  return (
    <>
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
            <Switch checked={globalAudioEnabled} onCheckedChange={setGlobalAudioEnabled} onChange={saveSettings} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-secondary" />
              <div>
                <p className="font-medium text-on-surface">Text Alerts</p>
                <p className="text-xs text-on-surface-variant">Show visual notifications</p>
              </div>
            </div>
            <Switch checked={globalTextEnabled} onCheckedChange={setGlobalTextEnabled} onChange={saveSettings} />
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
          {categoryAlerts.map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-on-surface">{alert.label}</p>
                <p className="text-sm text-on-surface-variant">{alert.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => testAlert(alert)}
                  disabled={testPlaying === alert.id || !globalAudioEnabled}
                  className="p-2 rounded-lg bg-surface-container-low hover:bg-primary/10 transition-colors disabled:opacity-50"
                  title="Test alert"
                >
                  <Volume2 className={`w-4 h-4 ${testPlaying === alert.id ? 'text-primary animate-pulse' : 'text-on-surface-variant'}`} />
                </button>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-on-surface-variant" />
                  <Switch checked={alertSettings[alert.id]?.text ?? true} onCheckedChange={() => toggleAlert(alert.id, "text")} size="sm" />
                </div>
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

      <div className="mt-6 flex justify-end">
        <Button onClick={saveSettings} variant="primary">
          Save Changes
        </Button>
      </div>
    </>
  )
}

function StaffWakeUpAlarm() {
  const [wakeUpTime, setWakeUpTime] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadAlarm()
  }, [])

  async function loadAlarm() {
    try {
      const alarm = await getWakeUpAlarm()
      if (alarm) {
        setWakeUpTime(alarm.wake_up_time.slice(0, 5))
        setEnabled(alarm.enabled)
      }
    } catch (err) {
      console.error("Failed to load wake-up alarm:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!wakeUpTime) return
    setSaving(true)
    setSaved(false)
    try {
      await setWakeUpAlarm(wakeUpTime + ":00", enabled)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error("Failed to save wake-up alarm:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteWakeUpAlarm()
      setWakeUpTime("")
      setEnabled(false)
    } catch (err) {
      console.error("Failed to delete wake-up alarm:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-surface-container rounded-full" />
        <div className="h-32 bg-surface-container rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="card-surface rounded-2xl p-8 border border-outline-variant/30 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <AlarmClock className="w-8 h-8 text-primary" />
        </div>

        <h2 className="font-headline text-xl font-bold text-on-surface mb-2">
          Wake-Up Alarm
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Set a wake-up time. When the time arrives, you will hear an audio alert and see a text notification while signed in.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="relative">
              <input
                type="time"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                className="text-4xl font-headline font-bold text-primary bg-surface-container rounded-xl px-6 py-4 border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30 w-48 text-center [color-scheme:var(--color-scheme)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-on-surface-variant">Enable alarm</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              variant="primary"
              disabled={saving || !wakeUpTime}
            >
              {saving ? "Saving..." : saved ? (
                <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>
              ) : "Save Alarm"}
            </Button>
            {wakeUpTime && (
              <Button onClick={handleDelete} variant="outline" disabled={saving}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-surface-container border border-outline-variant/30">
        <p className="text-xs text-on-surface-variant text-center">
          The wake-up alarm will trigger once per day at your set time. 
          All other shift alerts (breaks, tasks, walkthroughs, safety) 
          are managed by the system to support you during your shift.
        </p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
function ManagerAppSettings() {
  const [aiProvider, setAiProvider] = useState("none")
  const [aiKey, setAiKey] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("shrine_ai_provider") || "none"
    const storedKey = localStorage.getItem("shrine_ai_key") || ""
    setAiProvider(stored)
    setAiKey(storedKey)
  }, [])

  const handleSaveAI = () => {
    localStorage.setItem("shrine_ai_provider", aiProvider)
    if (aiKey) localStorage.setItem("shrine_ai_key", aiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearAI = () => {
    localStorage.removeItem("shrine_ai_provider")
    localStorage.removeItem("shrine_ai_key")
    setAiProvider("none")
    setAiKey("")
  }

  return (
    <div className="space-y-6">
      {/* AI Provider */}
      <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">automation</span>
          <h3 className="font-headline font-bold text-lg text-on-surface">AI Provider</h3>
        </div>
        <p className="text-sm text-on-surface-variant">
          Connect an AI service to enhance shift optimization and scheduling recommendations.
        </p>
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider block">Provider</label>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="none">None (Built-in Optimizer)</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>
        {aiProvider !== "none" && (
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider block">API Key</label>
            <input
              type="password"
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleSaveAI} className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
            {saved ? "Saved!" : "Save"}
          </button>
          <button onClick={handleClearAI} className="px-4 py-2 bg-surface-container-highest text-on-surface rounded-xl font-bold text-sm hover:bg-surface-dim transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
        <h3 className="font-headline font-bold text-lg text-on-surface">Manager Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/manager" className="flex items-center gap-3 p-4 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary">dashboard</span>
            <div>
              <p className="font-bold text-sm text-on-surface">Command Center</p>
              <p className="text-xs text-on-surface-variant">Manager dashboard</p>
            </div>
          </a>
          <a href="/manager/reports" className="flex items-center gap-3 p-4 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary">analytics</span>
            <div>
              <p className="font-bold text-sm text-on-surface">Reports</p>
              <p className="text-xs text-on-surface-variant">Analytics and exports</p>
            </div>
          </a>
          <a href="/calendar" className="flex items-center gap-3 p-4 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            <div>
              <p className="font-bold text-sm text-on-surface">Calendar</p>
              <p className="text-xs text-on-surface-variant">Schedule shifts</p>
            </div>
          </a>
          <a href="/operations-brief" className="flex items-center gap-3 p-4 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary">article</span>
            <div>
              <p className="font-bold text-sm text-on-surface">Operations Brief</p>
              <p className="text-xs text-on-surface-variant">Monthly briefings</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

  const [role, setRole] = useState<string | null>(null)
  const [checkingRole, setCheckingRole] = useState(true)

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        setRole(profile?.role || null)
      }
      setCheckingRole(false)
    }
    checkRole()
  }, [])

  const isManager = role === "manager"

  return (
    <>
      <TopAppBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-10 sm:pb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Settings</h1>
            <p className="text-sm text-on-surface-variant">
              {isManager ? "Configure app and team preferences" : "Set your personal preferences"}
            </p>
          </div>
        </div>

        {checkingRole ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-surface-container rounded-full" />
            <div className="h-32 bg-surface-container rounded-2xl" />
          </div>
        ) : isManager ? (
          <div className="space-y-8">
            <ManagerAlertControls />
            <ManagerAppSettings />
          </div>
        ) : (
          <StaffWakeUpAlarm />
        )}
      </main>
    </>
  )
}
