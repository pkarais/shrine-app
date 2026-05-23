"use server"
import { createServerClient } from "@/utils/supabase/server"

export async function sendMessage(recipientId: string, content: string, mediaUrls: string[] = []) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("messages").insert({
    sender_id: user.id, recipient_id: recipientId, content, media_urls: mediaUrls,
  }).select("*").single()
  if (error) throw new Error(error.message)
  return { success: true, message: data }
}

export async function getConversations() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const restrictedInboxRoles = new Set(["security", "operations"])
  const hasRestrictedInbox = restrictedInboxRoles.has(String(profile?.role || "").toLowerCase())

  if (hasRestrictedInbox) {
    const { data: inboundMessages, error: inboundError } = await supabase
      .from("messages")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })

    if (inboundError) throw new Error(inboundError.message)

    const senderIds = Array.from(new Set((inboundMessages || []).map(m => m.sender_id).filter(Boolean)))
    const { data: senderProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", senderIds)

    const profileMap = new Map((senderProfiles || []).map(p => [p.id, p]))

    const securityConversations = new Map<string, any>()
    inboundMessages?.forEach((message: any) => {
      const partnerId = message.sender_id
      if (!securityConversations.has(partnerId)) {
        securityConversations.set(partnerId, {
          partnerId,
          lastMessage: message,
          unreadCount: 0,
          profile: profileMap.get(partnerId) || null,
        })
      }
      if (!message.read_at) {
        securityConversations.get(partnerId).unreadCount++
      }
    })

    return Array.from(securityConversations.values())
  }

  const { data, error } = await supabase.rpc("get_conversations", { current_user_id: user.id })
  if (error) {
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
    const allIds = (messages || []).reduce((acc, m) => { if (m.sender_id) acc.push(m.sender_id); if (m.recipient_id) acc.push(m.recipient_id); return acc; }, [] as string[])
    const userIds = Array.from(new Set(allIds))
    const { data: msgProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", userIds)
    const profileMap = new Map((msgProfiles || []).map(p => [p.id, p]))
    const conversations = new Map()
    messages?.forEach((m: any) => {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id
      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, { partnerId, lastMessage: m, unreadCount: 0, profile: profileMap.get(partnerId) || null })
      }
      if (m.recipient_id === user.id && !m.read_at) {
        conversations.get(partnerId).unreadCount++
      }
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

  const profilesToFetch = Array.from(new Set(data.map(m => m.sender_id).filter(Boolean)))
  const { data: msgProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", profilesToFetch)
  const profileMap = new Map((msgProfiles || []).map(p => [p.id, p]))
  return data.map(m => ({ ...m, profiles: profileMap.get(m.sender_id) || null }))
}

export async function markMessagesAsRead(partnerId: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", partnerId)
    .eq("recipient_id", user.id)
    .is("read_at", null)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getOperationsStaff() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["operations", "security"])
    .order("full_name", { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function broadcastMessage(userIds: string[], title: string, content: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") throw new Error("Only managers can broadcast messages")
  
  const notifications = userIds.map((recipientId) => ({
    user_id: recipientId,
    title,
    body: content,
    type: "info",
    reference_id: user.id,
  }))
  
  const { data, error } = await supabase.from("notifications").insert(notifications).select()
  if (error) throw new Error(error.message)
  return { success: true, count: data?.length || 0 }
}
