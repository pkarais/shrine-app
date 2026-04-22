"use client"

import { useState, useEffect } from "react"
import { getConversations, markMessagesAsRead } from "@/lib/actions/messages"
import { getUnreadCount } from "@/lib/actions/messages-unread"

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

export function ConversationList({
  onSelect,
  filterRole,
}: {
  onSelect: (userId: string, userName: string) => void
  filterRole?: string | null
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    setLoading(true)
    const data = await getConversations()
    setConversations(data as Conversation[])
    setLoading(false)
  }

  async function handleSelect(userId: string) {
    const conv = conversations.find((c) => c.partnerId === userId)
    const displayName = conv?.profile?.full_name ?? conv?.profile?.email ?? "Unknown"
    setSelectedId(userId)
    await markMessagesAsRead(userId)
    onSelect(userId, displayName)
    setConversations((prev) =>
      prev.map((c) => (c.partnerId === userId ? { ...c, unreadCount: 0 } : c))
    )
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-on-surface-variant body-md">
        Loading conversations...
      </div>
    )
  }

  const visibleConversations = filterRole
    ? conversations.filter((conv) => String(conv.profile?.role || "").toLowerCase() === String(filterRole).toLowerCase())
    : conversations

  if (visibleConversations.length === 0) {
    return (
      <div className="p-6 text-center text-on-surface-variant body-md">
        {filterRole ? `No ${filterRole} conversations yet` : "No conversations yet"}
      </div>
    )
  }

  return (
    <div className="divide-y divide-outline-variant/15">
      {visibleConversations.map((conv) => {
        const displayName = conv.profile?.full_name ?? conv.profile?.email ?? "Unknown"
        const initials = getInitials(conv.profile?.full_name ?? null, conv.profile?.email ?? "")
        const isSelected = selectedId === conv.partnerId

        return (
          <button
            key={conv.partnerId}
            onClick={() => handleSelect(conv.partnerId)}
            className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-surface-container ${
              isSelected ? "bg-surface-container" : ""
            }`}
          >
            <div className="w-12 h-12 rounded-full sacred-gradient flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-on-surface text-sm truncate">
                  {displayName}
                </p>
                <span className="text-xs text-on-surface-variant flex-shrink-0 ml-2">
                  {formatTime(conv.lastMessage.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-on-surface-variant truncate">
                  {conv.lastMessage.sender_id === conv.partnerId ? "" : "You: "}
                  {conv.lastMessage.content}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-tertiary text-white text-[10px] font-bold">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
