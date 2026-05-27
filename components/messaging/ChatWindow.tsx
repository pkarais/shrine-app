"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, Send } from "lucide-react"
import { getMessagesWithUser, sendMessage, markMessagesAsRead } from "@/lib/actions/messages"

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  media_urls: string[]
  read_at: string | null
  created_at: string
  profiles: { full_name: string | null; email: string } | null
}

export function ChatWindow({
  userId,
  userName,
  onBack,
}: {
  userId: string
  userName: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const data = await getMessagesWithUser(userId)
    setMessages(data as Message[])
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }, [userId])

  useEffect(() => {
    loadMessages()
    markMessagesAsRead(userId)
  }, [userId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const result = await sendMessage(userId, input.trim())
      if (result.success) {
        setMessages((prev) => [...prev, result.message as Message])
        setInput("")
        inputRef.current?.focus()
      }
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSending(false)
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-outline-variant/15">
        <button
          onClick={onBack}
          className="md:hidden p-1 rounded-lg hover:bg-surface-container transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface" />
        </button>
        <div className="w-9 h-9 rounded-full sacred-gradient flex items-center justify-center text-white font-display font-bold text-xs">
          {userName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </div>
        <p className="font-semibold text-on-surface text-sm truncate">{userName}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-center text-on-surface-variant body-md py-8">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-center text-on-surface-variant body-md py-8">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((msg) => {
            const isSent = msg.sender_id !== userId
            return (
              <div
                key={msg.id}
                className={`flex ${isSent ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isSent
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-surface-container-high text-on-surface rounded-bl-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isSent ? "text-white/60" : "text-on-surface-variant"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                    {isSent && msg.read_at && " ✓✓"}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 p-3 border-t border-outline-variant/15"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 input-surface px-4 py-2.5 text-sm"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full sacred-gradient flex items-center justify-center text-white disabled:opacity-40 transition-opacity active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
