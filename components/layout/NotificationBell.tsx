"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { archiveAllNotifications } from "@/lib/actions/notifications"
import { playAlertSoundForType } from "@/lib/audio/alert-sounds"
import { Bell, Check, Trash2, AlertTriangle, Info, CheckCircle, MessageSquare, ChevronRight } from "lucide-react"

interface Notification {
  id: string
  title: string
  body: string
  type: string
  reference_id: string | null
  created_at: string
  read_at: string | null
}

const TYPE_ICONS: Record<string, any> = {
  alert: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
  message: MessageSquare,
}

const TYPE_COLORS: Record<string, string> = {
  alert: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
  success: "text-emerald-500",
  message: "text-primary",
}

const ORIGINAL_TITLE = typeof document !== "undefined" ? document.title : "Shrine Ops"

export function NotificationBell() {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [pulse, setPulse] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userIdRef = useRef<string | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null)
      setUnreadCount(count || 0)

      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, type, reference_id, created_at, read_at")
        .eq("user_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20)
      setNotifications(data || [])
      // Seed seen-ids so realtime INSERTs from this initial batch don't re-fire alerts.
      if (data) {
        for (const n of data) seenIdsRef.current.add(n.id)
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // One fetch on mount to seed the list + unread count. After that, the
    // realtime subscription below pushes new rows in sub-second. We also
    // re-fetch when the dropdown is opened (see button onClick) and when the
    // tab regains focus so we never go stale after sleep/network drops.
    fetchNotifications()
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchNotifications()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [fetchNotifications])

  // Subscribe to realtime INSERTs on the notifications table for this user.
  // Replaces the old 30s polling loop — cuts bell IO by ~95%.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function subscribe() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) return
      userIdRef.current = user.id
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload: { new: Notification & { reference_id?: string | null } }) => {
            const n = payload.new as Notification
            if (!n || seenIdsRef.current.has(n.id)) return
            seenIdsRef.current.add(n.id)

            setNotifications((prev) => [n, ...prev].slice(0, 20))
            setUnreadCount((c) => c + 1)

            // Pulse the bell so it catches the eye even on mute.
            setPulse(true)
            window.setTimeout(() => setPulse(false), 2400)

            // Audio alert (type-mapped, message -> message_received).
            playAlertSoundForType(n.type).catch(() => {})

            // Native browser notification when the tab is hidden or backgrounded.
            try {
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted" &&
                document.visibilityState !== "visible"
              ) {
                const native = new Notification(n.title, {
                  body: n.body,
                  icon: "/images/logo-color.jpg",
                  badge: "/images/logo-color.jpg",
                  tag: n.type === "message" ? "shrine-message" : `shrine-${n.id}`,
                })
                native.onclick = () => {
                  window.focus()
                  if (n.type === "message") window.location.href = "/messages"
                }
              }
            } catch { /* ignore */ }
          },
        )
        .subscribe()
    }

    subscribe()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect unread count in the browser tab title so it's visible even when
  // the tab is in the background. Restore the original title at 0 / unmount.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${ORIGINAL_TITLE}`
    } else {
      document.title = ORIGINAL_TITLE
    }
    return () => {
      if (typeof document !== "undefined") document.title = ORIGINAL_TITLE
    }
  }, [unreadCount])

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
    // Clear UI immediately (optimistic) — don't leave the user staring at stale rows
    // if the server action is slow or if the archive table isn't ready yet.
    setNotifications([])
    setUnreadCount(0)
    try {
      await archiveAllNotifications()
    } catch (e) {
      console.error("Failed to archive notifications:", e)
      // Archive failed — fall back: mark all read so they at least don't reappear as unread.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .is("read_at", null)
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
        className={`p-2 rounded-full hover:bg-[var(--surface-container)] dark:hover:bg-slate-700/50 transition-colors relative ${pulse ? "animate-pulse" : ""}`}
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 transition-colors ${pulse ? "text-primary" : "text-[var(--on-surface-variant)] dark:text-white/60"}`} />
        {unreadCount > 0 && (
          <>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[var(--surface)]" />
            {pulse && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            )}
          </>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 sm:inset-x-auto sm:w-96 bg-[var(--surface-container-high)] dark:bg-slate-800/95 rounded-2xl shadow-2xl border border-[var(--outline-variant)]/30 overflow-hidden z-[60]" style={{ top: "calc(env(safe-area-inset-top, 0px) + 72px)", maxWidth: "calc(100vw - 16px)" }}>
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
                function handleNotificationClick() {
                  // Mark read immediately (fire-and-forget)
                  if (isUnread) markRead(n.id)
                  // Close the dropdown first so it doesn't linger during navigation
                  setOpen(false)
                  // Navigate to the relevant screen based on notification type
                  if (n.type === "message") {
                    // reference_id = sender's user ID — deep-link to that conversation
                    const dest = n.reference_id
                      ? `/messages?user=${n.reference_id}`
                      : "/messages"
                    window.location.href = dest
                  }
                  // Other tappable types can be extended here as needed
                }
                return (
                  <div
                    key={n.id}
                    onClick={handleNotificationClick}
                    className={`px-4 py-3 border-b border-[var(--outline-variant)]/20 transition-colors cursor-pointer active:opacity-70 ${
                      isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-[var(--surface-container)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
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
                              onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                              className="text-[10px] text-primary hover:text-primary/80 font-medium"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                      {n.type === "message" && (
                        <ChevronRight className="w-4 h-4 text-[var(--on-surface-variant)]/50 shrink-0 mt-0.5" />
                      )}
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
