"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getConversations } from "@/lib/actions/messages"

interface Conversation {
  partnerId: string
  lastMessage: {
    content: string
    created_at: string
    sender_id: string
  }
  unreadCount: number
  profile: {
    full_name: string | null
    email: string
    role?: string | null
  } | null
}

export function MessagingPreview() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [departmentFilter, setDepartmentFilter] = useState<"all" | "operations" | "security">("all")

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const data = await getConversations()
      setConversations((data as Conversation[]) || [])
      const total = (data as Conversation[] || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0)
      setUnreadTotal(total)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const diff = Date.now() - d.getTime()
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const filteredConversations = conversations.filter((conv) => {
    if (departmentFilter === "all") return true
    return String(conv.profile?.role || "").toLowerCase() === departmentFilter
  })

  const messagesHref = departmentFilter === "all" ? "/messages" : `/messages?dept=${departmentFilter}`

  if (loading) {
    return (
      <div className="bg-surface-container-low rounded-[2rem] p-8">
        <div className="animate-pulse space-y-6">
          <div className="w-24 h-5 bg-surface-container rounded-full" />
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container" />
              <div className="flex-1 space-y-2">
                <div className="w-20 h-3 bg-surface-container rounded-full" />
                <div className="w-40 h-2 bg-surface-container rounded-full" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container" />
              <div className="flex-1 space-y-2">
                <div className="w-24 h-3 bg-surface-container rounded-full" />
                <div className="w-36 h-2 bg-surface-container rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low rounded-[2rem] p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline text-xl font-bold text-primary">Messaging</h3>
        {unreadTotal > 0 && (
          <span className="bg-tertiary-container text-on-tertiary px-2 py-0.5 rounded-full text-xs font-bold">
            {unreadTotal} New
          </span>
        )}
      </div>

      <div className="mb-5">
        <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">Department</label>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value as "all" | "operations" | "security")}
          className="w-full input-surface px-3 py-2 text-sm"
          aria-label="Filter conversations by department"
        >
          <option value="all">All Departments</option>
          <option value="operations">Operations</option>
          <option value="security">Security</option>
        </select>
      </div>

      <div className="space-y-6">
        {filteredConversations.slice(0, 3).map((conv) => {
          const displayName = conv.profile?.full_name ?? conv.profile?.email ?? "Unknown"
          const initials = getInitials(conv.profile?.full_name ?? null, conv.profile?.email ?? "")

          return (
            <div key={conv.partnerId} className="flex gap-4 group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">person</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-bold text-on-surface truncate">{displayName}</p>
                  <span className="text-[10px] text-on-surface-variant">{formatTime(conv.lastMessage.created_at)}</span>
                </div>
                <p className="text-xs text-on-surface-variant truncate">
                  {conv.lastMessage.sender_id !== conv.partnerId ? "You: " : ""}
                  {conv.lastMessage.content}
                </p>
              </div>
            </div>
          )
        })}
        {filteredConversations.length === 0 ? (
          <p className="text-xs text-on-surface-variant">No conversations in this department yet.</p>
        ) : null}
      </div>

      <Link href={messagesHref}>
        <button className="w-full mt-8 py-3 rounded-xl bg-surface-container-lowest text-primary font-bold text-xs hover:bg-surface-container-highest transition-colors">
          View All Messages
        </button>
      </Link>
    </div>
  )
}
