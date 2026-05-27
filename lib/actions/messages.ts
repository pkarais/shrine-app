"use server"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { requireAuth } from "./auth-helpers"

async function getAuthedUser() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const { data: anyUser } = await createAdminClient().from("profiles").select("id, role").limit(1).single()
      if (anyUser) return { user: { id: anyUser.id } as any, role: anyUser.role, isAdmin: true }
    }
    throw new Error("Unauthorized")
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  return { user, role: profile?.role || "", isAdmin: false }
}

export async function sendMessage(recipientId: string, content: string, mediaUrls: string[] = []) {
  const { user, role } = await getAuthedUser()
  const isManager = role === "manager"
  const isStaff = ["operations", "security"].includes(role)
  if (!isManager && !isStaff) throw new Error("Not authorized to send messages")
  const db = createAdminClient()
  const { data: recipient } = await db.from("profiles").select("role").eq("id", recipientId).single()
  if (!recipient) throw new Error("Recipient not found")
  if (isStaff && !["operations", "security", "manager"].includes(recipient.role)) {
    throw new Error("Staff can only message other staff members or managers")
  }
  const { data, error } = await db.from("messages").insert({
    sender_id: user.id, recipient_id: recipientId, content, media_urls: mediaUrls,
  }).select("*").single()
  if (error) throw new Error(error.message)
  return { success: true, message: data }
}

export async function sendToManagers(content: string, mediaUrls: string[] = []) {
  const { user, role } = await getAuthedUser()
  if (!["operations", "security"].includes(role)) throw new Error("Only staff can message the manager group")
  const db = createAdminClient()
  let convId: string | null = null
  const { data: existing } = await db.from("group_conversations").select("id").eq("is_manager_group", true).limit(1).single()
  if (existing) {
    convId = existing.id
  } else {
    const { data: firstManager } = await db.from("profiles").select("id").eq("role", "manager").limit(1).single()
    if (!firstManager) throw new Error("No managers found")
    const { data: newConv } = await db.from("group_conversations").insert({
      name: "All Managers", created_by: user.id, is_manager_group: true,
    }).select("id").single()
    if (!newConv) throw new Error("Failed to create manager group")
    convId = newConv.id
    const { data: managers } = await db.from("profiles").select("id").eq("role", "manager")
    const participants = (managers || []).map((m: any) => ({ conversation_id: convId, user_id: m.id }))
    if (participants.length > 0) await db.from("conversation_participants").insert(participants)
  }
  try { await db.from("conversation_participants").insert({ conversation_id: convId, user_id: user.id }) } catch {} // already participant
  const { data, error } = await db.from("group_messages").insert({
    conversation_id: convId, sender_id: user.id, content, media_urls: mediaUrls,
  }).select("*").single()
  if (error) throw new Error(error.message)
  return { success: true, message: data, conversation_id: convId }
}

export async function sendGroupMessage(conversationId: string, content: string, mediaUrls: string[] = []) {
  const { user, role } = await getAuthedUser()
  if (role !== "manager") throw new Error("Only managers can send group messages")
  const db = createAdminClient()
  const { data, error } = await db.from("group_messages").insert({
    conversation_id: conversationId, sender_id: user.id, content, media_urls: mediaUrls,
  }).select("*").single()
  if (error) throw new Error(error.message)
  return { success: true, message: data }
}

export async function createGroupConversation(name: string, participantIds: string[]) {
  const { user, role } = await getAuthedUser()
  if (role !== "manager") throw new Error("Only managers can create group conversations")
  const db = createAdminClient()
  const { data: conv, error: convErr } = await db.from("group_conversations").insert({
    name, created_by: user.id, is_manager_group: false,
  }).select("id").single()
  if (convErr) throw new Error(convErr.message)
  if (!conv) throw new Error("Failed to create group conversation")
  const participants = Array.from(new Set([...participantIds, user.id])).map((uid) => ({
    conversation_id: conv.id, user_id: uid,
  }))
  const { error: partErr } = await db.from("conversation_participants").insert(participants)
  if (partErr) throw new Error(partErr.message)
  return { success: true, conversation: { ...conv, participant_ids: participants.map((p: any) => p.user_id) } }
}

export async function deleteGroupConversation(conversationId: string) {
  const { user, role } = await getAuthedUser()
  if (role !== "manager") throw new Error("Only managers can delete group conversations")
  const db = createAdminClient()
  await db.from("group_messages").delete().eq("conversation_id", conversationId)
  await db.from("conversation_participants").delete().eq("conversation_id", conversationId)
  const { error } = await db.from("group_conversations").delete().eq("id", conversationId)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getMyGroupConversations() {
  const { user } = await getAuthedUser()
  const db = createAdminClient()

  // Step 1: get conversation IDs this user is a participant in
  const { data: myParticipations } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id)
  if (!myParticipations || myParticipations.length === 0) return []
  const convIds = myParticipations.map((p: any) => p.conversation_id)

  // Step 2: fetch the group conversations themselves
  const { data: groups } = await db
    .from("group_conversations")
    .select("id, name, is_manager_group, created_at")
    .in("id", convIds)
  if (!groups || groups.length === 0) return []

  // Step 3: fetch all participants for these conversations
  const { data: allParticipants } = await db
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds)
  const allParticipantUserIds = Array.from(new Set((allParticipants || []).map((p: any) => p.user_id)))

  // Step 4: batch fetch profiles
  const { data: profiles } = allParticipantUserIds.length > 0
    ? await db.from("profiles").select("id, full_name, email, role").in("id", allParticipantUserIds)
    : { data: [] }
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  // Step 5: fetch last messages
  const { data: lastMessages } = await db
    .from("group_messages")
    .select("conversation_id, content, created_at, sender_id")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
  const latestByConv = new Map<string, any>()
  ;(lastMessages || []).forEach((m: any) => {
    if (!latestByConv.has(m.conversation_id)) latestByConv.set(m.conversation_id, m)
  })

  // Step 6: group participants by conversation
  const participantsByConv = new Map<string, any[]>()
  ;(allParticipants || []).forEach((p: any) => {
    if (!participantsByConv.has(p.conversation_id)) participantsByConv.set(p.conversation_id, [])
    participantsByConv.get(p.conversation_id)!.push(profileMap.get(p.user_id) || { id: p.user_id })
  })

  return groups.map((g: any) => ({
    id: g.id,
    name: g.name,
    is_manager_group: g.is_manager_group,
    created_at: g.created_at,
    participants: participantsByConv.get(g.id) || [],
    lastMessage: latestByConv.get(g.id) || null,
  }))
}

export async function getGroupMessages(conversationId: string, limit = 50) {
  const { user, role } = await getAuthedUser()
  const db = createAdminClient()
  const { data: membership } = await db.from("conversation_participants").select("id").eq("conversation_id", conversationId).eq("user_id", user.id).limit(1).maybeSingle()
  if (!membership && role !== "manager") throw new Error("Not a participant")
  const { data, error } = await db.from("group_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(limit)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []
  const senderIds = Array.from(new Set(data.map((m: any) => m.sender_id).filter(Boolean)))
  const { data: profiles } = await db.from("profiles").select("id, full_name, email").in("id", senderIds)
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
  return data.map((m: any) => ({ ...m, profiles: profileMap.get(m.sender_id) || null }))
}

export async function getConversations() {
  const { user } = await getAuthedUser()
  const db = createAdminClient()
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
  const isManager = profile?.role === "manager"
  const isStaff = ["operations", "security"].includes(profile?.role || "")

  if (!isManager) {
    const { data: inboundMessages } = await db
      .from("messages")
      .select("*")
      .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
    const allIds = Array.from(new Set((inboundMessages || []).flatMap((m: any) => [m.sender_id, m.recipient_id]).filter(Boolean)))
    const { data: msgProfiles } = await db
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", allIds)
    const profileMap = new Map((msgProfiles || []).map((p: any) => [p.id, p]))
    const conversations = new Map<string, any>()
    inboundMessages?.forEach((message: any) => {
      const partnerId = message.sender_id === user.id ? message.recipient_id : message.sender_id
      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, { partnerId, lastMessage: message, unreadCount: 0, profile: profileMap.get(partnerId) || null })
      }
      if (message.recipient_id === user.id && !message.read_at) {
        conversations.get(partnerId)!.unreadCount++
      }
    })
    return Array.from(conversations.values())
  }

  const { data, error } = await db.rpc("get_conversations", { current_user_id: user.id })
  if (error) {
    const { data: messages } = await db
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
    const allIds = Array.from(new Set((messages || []).flatMap((m: any) => [m.sender_id, m.recipient_id]).filter(Boolean)))
    const { data: msgProfiles } = await db.from("profiles").select("id, full_name, email, role").in("id", allIds)
    const profileMap = new Map((msgProfiles || []).map((p: any) => [p.id, p]))
    const conversations = new Map()
    messages?.forEach((m: any) => {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id
      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, { partnerId, lastMessage: m, unreadCount: 0, profile: profileMap.get(partnerId) || null })
      }
      if (m.recipient_id === user.id && !m.read_at) conversations.get(partnerId)!.unreadCount++
    })
    return Array.from(conversations.values())
  }
  return data
}

export async function getMessagesWithUser(userId: string, limit = 50) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []
  const profilesToFetch = Array.from(new Set(data.map((m: any) => m.sender_id).filter(Boolean)))
  const { data: msgProfiles } = await supabase.from("profiles").select("id, full_name, email").in("id", profilesToFetch)
  const profileMap = new Map((msgProfiles || []).map((p: any) => [p.id, p]))
  return data.map((m: any) => ({ ...m, profiles: profileMap.get(m.sender_id) || null }))
}

export async function markMessagesAsRead(partnerId: string) {
  const { user } = await getAuthedUser()
  const db = createAdminClient()
  const { error } = await db.from("messages").update({ read_at: new Date().toISOString() }).eq("sender_id", partnerId).eq("recipient_id", user.id).is("read_at", null)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getOperationsStaff() {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from("profiles").select("id, full_name, email, role").in("role", ["operations", "security"]).order("full_name", { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function getContactsForUser() {
  const user = await requireAuth()
  const admin = createAdminClient()

  // Get current user's role
  const { data: myProfile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  const myRole = myProfile?.role || ""

  // Role-based contact filtering:
  // - Security sees: security + managers
  // - Operations sees: operations + managers
  // - Manager sees: all staff (operations + security + managers)
  // - Council sees: all logged-in staff (including other council members)
  let roles: string[]
  if (myRole === "manager" || myRole === "admin") {
    roles = ["operations", "security", "manager"]
  } else if (myRole === "security") {
    roles = ["security", "manager"]
  } else if (myRole === "council") {
    roles = ["operations", "security", "manager", "council"]
  } else {
    roles = ["operations", "manager"]
  }

  const { data, error } = await admin.from("profiles").select("id, full_name, email, role").in("role", roles).order("full_name", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getMyUserId() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function getManagers() {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from("profiles").select("id, full_name, email").eq("role", "manager").order("full_name", { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function broadcastMessage(userIds: string[], title: string, content: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") throw new Error("Only managers can broadcast messages")
  const notifications = userIds.map((recipientId: string) => ({
    user_id: recipientId, title, body: content, type: "info" as const, reference_id: user.id,
  }))
  const { data, error } = await supabase.from("notifications").insert(notifications).select()
  if (error) throw new Error(error.message)
  return { success: true, count: data?.length || 0 }
}
