"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"

interface Message {
  id: string
  name: string
  initials: string
  lastMessage: string
  time: string
  isActive?: boolean
  hasImage?: boolean
  imageUrl?: string
  isHighlighted?: boolean
}

export function DirectComms({ messages }: { messages: Message[] }) {
  const router = useRouter()

  return (
    <div className="bg-surface-container-low rounded-xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-headline font-bold text-xl">Direct Comms</h3>
        <button
          onClick={() => router.push("/messages")}
          className="text-primary hover:bg-primary-fixed p-2 rounded-full transition-colors"
          title="New message"
        >
          <span className="material-symbols-outlined">edit_square</span>
        </button>
      </div>
      <div className="space-y-4 overflow-y-auto max-h-[400px] no-scrollbar">
        {messages.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No recent direct messages.</p>
        ) : messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 p-3 rounded-lg transition-colors cursor-pointer group ${
              msg.isHighlighted
                ? "bg-primary-fixed/20 border-l-4 border-primary"
                : "hover:bg-surface-container-highest"
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold overflow-hidden ${
              msg.isActive ? "bg-primary-fixed text-primary" : msg.isHighlighted ? "bg-surface-dim" : "bg-secondary-container text-on-secondary-container"
            }`}>
              {msg.imageUrl ? (
                <Image src={msg.imageUrl} alt={msg.name} fill className="object-cover" />
              ) : (
                msg.initials
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold">{msg.name}</h4>
                <span className={`text-[10px] ${msg.isActive ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                  {msg.time}
                </span>
              </div>
              <p className={`text-xs line-clamp-1 group-hover:text-on-surface transition-colors ${
                msg.isHighlighted ? "text-on-surface font-medium" : "text-on-surface-variant"
              }`}>
                {msg.lastMessage}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
