"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ConversationList } from "@/components/messaging/ConversationList"
import { ChatWindow } from "@/components/messaging/ChatWindow"
import { TopAppBar } from "@/components/layout/TopAppBar"

export default function MessagesPage() {
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null)
  const searchParams = useSearchParams()
  const deptParam = (searchParams.get("dept") || "").toLowerCase()
  const departmentFilter = deptParam === "operations" || deptParam === "security" ? deptParam : null

  return (
    <>
      <TopAppBar />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-6 sm:pb-10 h-[calc(100svh-5rem)] sm:h-[calc(100vh-6rem)]">
      <div className="card-surface h-full overflow-hidden flex">
        <div className={`flex flex-col ${selectedUser ? "hidden md:flex" : "w-full md:w-80 lg:w-96"} border-r border-[color-mix(in_srgb,var(--outline-variant)_15%,transparent)]`}>
          <div className="p-4 border-b border-[color-mix(in_srgb,var(--outline-variant)_15%,transparent)]">
            <h1 className="headline-sm text-[var(--on-surface)]">Messages</h1>
            {departmentFilter ? (
              <p className="text-xs text-on-surface-variant mt-1">
                Department filter: {departmentFilter}
              </p>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              filterRole={departmentFilter}
              onSelect={(id, name) => setSelectedUser({ id, name })}
            />
          </div>
        </div>
        <div className={`flex-1 flex flex-col ${selectedUser ? "flex" : "hidden md:flex"}`}>
          {selectedUser ? (
            <ChatWindow
              userId={selectedUser.id}
              userName={selectedUser.name}
              onBack={() => setSelectedUser(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--on-surface-variant)] body-md">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
