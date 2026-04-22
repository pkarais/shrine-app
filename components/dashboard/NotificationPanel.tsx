"use client"

import { useState, useEffect, useRef } from "react"
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from "@/lib/actions/notifications"
import { motion, AnimatePresence } from "framer-motion"

const typeIcons: Record<string, string> = {
  alert: "⚠",
  info: "ℹ",
  success: "✓",
  warning: "!",
  staffing: "👤",
  maintenance: "🔧",
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadCount()
  }, [])

  useEffect(() => {
    if (open) loadNotifications()
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function loadCount() {
    const count = await getUnreadCount()
    setUnreadCount(count)
  }

  async function loadNotifications() {
    setLoading(true)
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    setUnreadCount(0)
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-[var(--surface-container)] transition-colors"
      >
        <svg className="w-6 h-6 text-[var(--on-surface-variant)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--tertiary)] rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-surface-container-highest backdrop-blur-xl rounded-[2rem] shadow-2xl z-50 max-h-80 overflow-hidden ring-1 ring-white/10"
          >
            <div className="p-5 bg-surface-container-high/50 flex items-center justify-between">
              <h3 className="font-headline font-bold text-on-surface">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold text-primary hover:text-primary-container"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="p-3 overflow-y-auto max-h-[calc(80vh-4rem)]">
              {loading ? (
                <p className="text-sm text-on-surface-variant p-4 text-center">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-on-surface-variant p-4 text-center py-8 font-medium">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.read_at && handleMarkRead(n.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all mb-1 ${
                      n.read_at
                        ? "hover:bg-surface-container-low"
                        : "bg-primary/10 hover:bg-primary/20"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {typeIcons[n.type] || typeIcons.info}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">{n.body}</p>
                        )}
                        <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/70 mt-2">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
