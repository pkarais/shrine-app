"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Bell, Check, Trash2, AlertTriangle, Info, CheckCircle } from "lucide-react"

interface Notification {
  id: string
  title: string
  body: string
  type: string
  created_at: string
  read_at: string | null
}

const TYPE_ICONS: Record<string, any> = {
  alert: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
}

const TYPE_COLORS: Record<string, string> = {
  alert: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
  success: "text-emerald-500",
}

export function NotificationBell() {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null)
      setUnreadCount(count || 0)

      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, type, created_at, read_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
      setNotifications(data || [])
    } catch (e) {
      console.error("Failed to fetch notifications:", e)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function markRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null)
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    }
  }

  async function clearAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id)
    if (!error) {
      setNotifications([])
      setUnreadCount(0)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
        className="p-2 rounded-full hover:bg-[var(--surface-container)] dark:hover:bg-slate-700/50 transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-[var(--on-surface-variant)] dark:text-white/60" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[var(--surface)]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[var(--surface-container-high)] dark:bg-slate-800/95 rounded-2xl shadow-2xl border border-[var(--outline-variant)]/30 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)]/30">
            <h3 className="font-bold text-sm text-[var(--on-surface)]">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-400 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--on-surface-variant)]">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--on-surface-variant)]">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Info
                const color = TYPE_COLORS[n.type] || "text-blue-500"
                const isUnread = !n.read_at
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-[var(--outline-variant)]/20 hover:bg-[var(--surface-container)] transition-colors ${
                      isUnread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? "font-bold" : "font-medium"} text-[var(--on-surface)]`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-[var(--on-surface-variant)] mt-0.5 line-clamp-2">{n.body}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-[var(--on-surface-variant)]/60">
                            {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isUnread && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="text-[10px] text-primary hover:text-primary/80 font-medium"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
