"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getGroupMessages, sendGroupMessage } from "@/lib/actions/messages"
import { ArrowLeft, Send, Users } from "lucide-react"

interface GroupMessage {
  id: string
  sender_id: string
  content: string
  media_urls: string[]
  created_at: string
  profiles?: { full_name: string; email: string } | null
}

export function GroupChatWindow({
  conversationId,
  conversationName,
  onBack,
}: {
  conversationId: string
  conversationName: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getGroupMessages(conversationId)
      setMessages(data)
    } catch (e) {
      console.error("Failed to load group messages:", e)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await sendGroupMessage(conversationId, input.trim())
      setInput("")
      await load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b ghost-border">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-2 rounded-full hover:bg-surface-container transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold">
          {conversationName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm text-on-surface truncate">{conversationName}</h2>
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <Users className="w-3 h-3" /> Group Chat
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-on-surface-variant py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-on-surface-variant py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.profiles === null // If profiles is null, we can check against current user
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  isMe
                    ? "bg-primary text-on-primary rounded-br-md"
                    : "bg-surface-container-high text-on-surface rounded-bl-md"
                }`}>
                  {msg.profiles && (
                    <p className="text-[10px] font-bold opacity-70 mb-0.5">
                      {msg.profiles.full_name || msg.profiles.email}
                    </p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                </div>
                <span className="text-[10px] text-on-surface-variant mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t ghost-border flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 bg-surface-container-high rounded-xl text-on-surface outline-none focus:ring-2 focus:ring-primary/20 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-3 bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
