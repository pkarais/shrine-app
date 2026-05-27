"use server"

import { createServerClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/server"

export interface SOPDocument {
  id: string
  title: string
  category: string
  description: string | null
  file_path: string
  file_name: string
  file_size: number | null
  file_type: string
  uploaded_by: string
  created_at: string
  uploader_name?: string
}

const SOP_CATEGORIES = [
  "General Operations",
  "Security Procedures",
  "Maintenance Protocols",
  "Emergency Response",
  "Visitor Services",
  "Cleaning & Sanitation",
  "Equipment Operation",
  "Safety Guidelines",
  "Ticket Resolution",
  "Walkthrough Standards",
]

export async function getSOPCategories() {
  return SOP_CATEGORIES
}

export async function uploadSOP(
  formData: FormData
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") throw new Error("Manager access required")

  const file = formData.get("file") as File
  const title = formData.get("title") as string
  const category = formData.get("category") as string
  const description = formData.get("description") as string

  if (!file || !title || !category) {
    throw new Error("File, title, and category are required")
  }

  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed")
  }

  // Sanitize filename
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const filePath = `${category.toLowerCase().replace(/\s+/g, "-")}/${Date.now()}-${sanitizedName}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("operations-sops")
    .upload(filePath, file, {
      contentType: "application/pdf",
      upsert: false,
    })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  // Record in database
  const { data: doc, error: dbError } = await supabase
    .from("sop_documents")
    .insert({
      title,
      category,
      description: description || null,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) {
    // Rollback storage upload
    await supabase.storage.from("operations-sops").remove([filePath])
    throw new Error(`Database error: ${dbError.message}`)
  }

  return { success: true, document: doc }
}

export async function getSOPs(category?: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["operations", "manager"].includes(profile.role)) {
    throw new Error("Access restricted to operations staff")
  }

  let query = supabase
    .from("sop_documents")
    .select("*, profiles!sop_documents_uploaded_by_fkey(full_name)")
    .order("created_at", { ascending: false })

  if (category) {
    query = query.eq("category", category)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return (data || []).map((item: any) => ({
    ...item,
    uploader_name: item.profiles?.full_name || "Unknown",
  }))
}

export async function getSOPSignedUrl(filePath: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase.storage
    .from("operations-sops")
    .createSignedUrl(filePath, 60 * 60) // 1 hour

  if (error || !data?.signedUrl) throw new Error("Failed to generate access URL")
  return data.signedUrl
}

export async function deleteSOP(id: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") throw new Error("Manager access required")

  // Get the document first
  const { data: doc } = await supabase.from("sop_documents").select("file_path").eq("id", id).single()
  if (!doc) throw new Error("Document not found")

  // Delete from storage
  await supabase.storage.from("operations-sops").remove([doc.file_path])

  // Delete from database
  const { error } = await supabase.from("sop_documents").delete().eq("id", id)
  if (error) throw new Error(error.message)

  return { success: true }
}

export async function getSOPUploadsForShift(clockIn: string, clockOut?: string | null) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from("sop_documents")
    .select("title, category, file_name, created_at")
    .eq("uploaded_by", user.id)
    .gte("created_at", clockIn)

  if (clockOut) {
    query = query.lte("created_at", clockOut)
  }

  const { data } = await query
  return data || []
}
