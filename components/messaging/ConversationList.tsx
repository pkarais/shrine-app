"use client"

import { useState, useEffect, useMemo } from "react"
import { getConversations, markMessagesAsRead, getContactsForUser, getMyUserId } from "@/lib/actions/messages"
import { Search } from "lucide-react"

interface StaffProfile {
  id: string
  full_name: string | null
  email: string
  role: string | null
}

interface Conversation {
  partnerId: string
  lastMessage: {
    content: string
    created_at: string
    sender_id: string
  }
  unreadCount: number
  profile: StaffProfile | null
}

export function ConversationList({
  onSelect,
  filterRole,
}: {
  onSelect: (userId: string, userName: string) => void
  filterRole?: string | null
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [convData, staffData, myId] = await Promise.all([
      getConversations(),
      getContactsForUser(),
      getMyUserId(),
    ])
    setConversations(convData as Conversation[])
    setStaff(staffData as StaffProfile[])
    setCurrentUserId(myId)
    setLoading(false)
  }

  const convByPartner = useMemo(() => {
    const map = new Map<string, Conversation>()
    conversations.forEach((c) => map.set(c.partnerId, c))
    return map
  }, [conversations])

  const contacts = useMemo(() => {
    let list = staff
      .filter((s) => s.id !== currentUserId)
      .map((s) => ({
        ...s,
        conversation: convByPartner.get(s.id) || null,
      }))
    if (filterRole) {
      list = list.filter((l) => l.role?.toLowerCase() === filterRole)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (l) =>
          l.full_name?.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const aUnread = a.conversation?.unreadCount || 0
      const bUnread = b.conversation?.unreadCount || 0
      if (aUnread !== bUnread) return bUnread - aUnread
      const aHas = a.conversation ? 1 : 0
      const bHas = b.conversation ? 1 : 0
      if (aHas !== bHas) return bHas - aHas
      return (a.full_name || a.email).localeCompare(b.full_name || b.email)
    })
    return list
  }, [staff, convByPartner, filterRole, search, currentUserId])

  async function handleSelect(userId: string) {
    const contact = contacts.find((c) => c.id === userId)
    const displayName = contact?.full_name ?? contact?.email ?? "Unknown"
    setSelectedId(userId)
    await markMessagesAsRead(userId)
    onSelect(userId, displayName)
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

  function roleBadge(role: string | null) {
    switch (role?.toLowerCase()) {
      case "manager": return "bg-amber-100 text-amber-800"
      case "security": return "bg-blue-100 text-blue-800"
      case "operations": return "bg-emerald-100 text-emerald-800"
      default: return "bg-gray-100 text-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-on-surface-variant body-md">
        Loading contacts...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-outline-variant/15">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name..."
            className="w-full input-surface pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/15">
        {contacts.length === 0 ? (
          <div className="p-6 text-center text-on-surface-variant body-md">
            {search ? "No staff match your search" : "No staff contacts available"}
          </div>
        ) : (
          contacts.map((contact) => {
            const initials = getInitials(contact.full_name, contact.email)
            const conv = contact.conversation
            const hasUnread = (conv?.unreadCount ?? 0) > 0
            const isSelected = selectedId === contact.id

            return (
              <button
                key={contact.id}
                onClick={() => handleSelect(contact.id)}
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
                      {contact.full_name || contact.email}
                    </p>
                    {conv && (
                      <span className="text-xs text-on-surface-variant flex-shrink-0 ml-2">
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-on-surface-variant truncate">
                      {conv
                        ? (conv.lastMessage.sender_id === contact.id
                            ? conv.lastMessage.content
                            : `You: ${conv.lastMessage.content}`)
                        : "No messages yet"}
                    </p>
                    {hasUnread && (
                      <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-tertiary text-white text-[10px] font-bold">
                        {conv!.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${roleBadge(contact.role)}`}>
                  {contact.role || "staff"}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}