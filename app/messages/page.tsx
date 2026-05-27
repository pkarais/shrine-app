"use client"

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { ConversationList } from "@/components/messaging/ConversationList"
import { ChatWindow } from "@/components/messaging/ChatWindow"
import { GroupChatList, CreateGroupModal } from "@/components/messaging/GroupChatList"
import { GroupChatWindow } from "@/components/messaging/GroupChatWindow"
import { TopAppBar } from "@/components/layout/TopAppBar"

function MessagesContent() {
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null)
  const [activeTab, setActiveTab] = useState<"direct" | "groups">("direct")
  const [isManager, setIsManager] = useState(false)
  const [isCouncil, setIsCouncil] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])
  const searchParams = useSearchParams()
  const deptParam = (searchParams.get("dept") || "").toLowerCase()
  const departmentFilter = deptParam === "operations" || deptParam === "security" ? deptParam : null

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        const role = profile?.role || ""
        setIsManager(role === "manager")
        setIsCouncil(role === "council")
        if (role === "manager") {
          const { data: staff } = await supabase.from("profiles").select("id, full_name, email, role").in("role", ["operations", "security"])
          setStaffList(staff || [])
        }
      }
    }
    checkRole()
  }, [])

  return (
    <>
      <TopAppBar />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-6 sm:pb-10 h-[calc(100svh-5rem)] sm:h-[calc(100vh-6rem)]">
        <div className="card-surface h-full overflow-hidden flex">
          {/* Sidebar */}
          <div className={`flex flex-col ${(selectedUser || selectedGroup) ? "hidden md:flex" : "w-full md:w-80 lg:w-96"} border-r ghost-border`}>
            <div className="p-4 border-b ghost-border">
              <h1 className="headline-sm text-on-surface">Messages</h1>
              {departmentFilter ? (
                <p className="text-xs text-on-surface-variant mt-1">
                  Department filter: {departmentFilter}
                </p>
              ) : null}
              {isCouncil && (
                <p className="text-xs text-on-surface-variant mt-1">
                  Message any staff member or council member
                </p>
              )}
              {isManager && (
                <div className="flex gap-1 mt-3 bg-surface-container-high rounded-lg p-1">
                  <button
                    onClick={() => { setActiveTab("direct"); setSelectedGroup(null) }}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-colors ${
                      activeTab === "direct" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Direct
                  </button>
                  <button
                    onClick={() => { setActiveTab("groups"); setSelectedUser(null) }}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-colors ${
                      activeTab === "groups" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Groups
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTab === "direct" ? (
                <ConversationList
                  filterRole={departmentFilter}
                  onSelect={(id, name) => { setSelectedUser({ id, name }); setSelectedGroup(null) }}
                />
              ) : (
                <GroupChatList
                  onSelect={(id, name) => { setSelectedGroup({ id, name }); setSelectedUser(null) }}
                  onCreate={() => setShowCreateGroup(true)}
                />
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${(selectedUser || selectedGroup) ? "flex" : "hidden md:flex"}`}>
            {selectedUser ? (
              <ChatWindow
                userId={selectedUser.id}
                userName={selectedUser.name}
                onBack={() => setSelectedUser(null)}
              />
            ) : selectedGroup ? (
              <GroupChatWindow
                conversationId={selectedGroup.id}
                conversationName={selectedGroup.name}
                onBack={() => setSelectedGroup(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant body-md">
                {isCouncil ? "Select Manager to send a message" : "Select a conversation to start messaging"}
              </div>
            )}
          </div>
        </div>
      </div>

      {isManager && (
        <CreateGroupModal
          open={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          staffList={staffList}
          onCreated={() => {}}
        />
      )}
    </>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  )
}
