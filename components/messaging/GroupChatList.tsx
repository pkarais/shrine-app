"use client"

import { useState, useEffect, useCallback } from "react"
import { getMyGroupConversations, createGroupConversation } from "@/lib/actions/messages"
import { Users, Plus, MessageCircle } from "lucide-react"

interface GroupConversation {
  id: string
  name: string
  is_manager_group: boolean
  created_at: string
  participants: any[]
  lastMessage: any
}

export function GroupChatList({
  onSelect,
  onCreate,
  refreshKey,
}: {
  onSelect: (id: string, name: string) => void
  onCreate: () => void
  refreshKey?: number
}) {
  const [conversations, setConversations] = useState<GroupConversation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyGroupConversations()
      setConversations(data)
    } catch (e) {
      console.error("Failed to load group conversations:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface-container-high rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b ghost-border flex items-center justify-between">
        <h2 className="headline-sm text-on-surface flex items-center gap-2">
          <Users className="w-5 h-5" /> Group Chats
        </h2>
        <button
          onClick={onCreate}
          className="p-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors"
          title="New group"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No group chats yet.</p>
            <button
              onClick={onCreate}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--outline-variant)]/20">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id, conv.name)}
                className="w-full text-left p-4 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold">
                    {conv.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-on-surface truncate">{conv.name}</p>
                      {conv.is_manager_group && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase">
                          Manager
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">
                      {conv.participants.length} members
                      {conv.lastMessage && ` · ${conv.lastMessage.content?.slice(0, 30)}...`}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CreateGroupModal({
  open,
  onClose,
  staffList,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  staffList: { id: string; full_name: string; email: string; role: string }[]
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  if (!open) return null

  async function handleCreate() {
    if (!name.trim() || selectedIds.length === 0) return
    setCreating(true)
    try {
      await createGroupConversation(name.trim(), selectedIds)
      setName("")
      setSelectedIds([])
      onCreated()
      onClose()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setCreating(false)
    }
  }

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[var(--outline-variant)]/30 flex items-center justify-between">
          <h3 className="font-bold text-lg text-on-surface">New Group Chat</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">
              Group Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Security Team"
              className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">
              Members ({selectedIds.length} selected)
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {staffList.map((staff) => (
                <label
                  key={staff.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(staff.id)}
                    onChange={() => toggleId(staff.id)}
                    className="w-4 h-4 rounded border-on-surface-variant"
                  />
                  <div>
                    <p className="text-sm font-medium text-on-surface">{staff.full_name || staff.email}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{staff.role}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[var(--outline-variant)]/30">
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || selectedIds.length === 0}
            className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  )
}
