"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"

export interface SOPDocument {
  id: string
  title: string
  category: string
  description: string | null
  source_type: string
  file_path: string | null
  external_link: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
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

export async function uploadSOPFile(
  formData: FormData
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Manager access required")

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

  if (file.size > 20 * 1024 * 1024) {
    throw new Error("File size must be under 20MB")
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const filePath = `${category.toLowerCase().replace(/\s+/g, "-")}/${Date.now()}-${sanitizedName}`

  const { error: uploadError } = await supabase.storage
    .from("operations-sops")
    .upload(filePath, file, {
      contentType: "application/pdf",
      upsert: false,
    })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: doc, error: dbError } = await supabase
    .from("sop_documents")
    .insert({
      title,
      category,
      description: description || null,
      source_type: "supabase",
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from("operations-sops").remove([filePath])
    throw new Error(`Database error: ${dbError.message}`)
  }

  return { success: true, document: doc }
}

export async function addSOPExternalLink(
  title: string,
  category: string,
  externalLink: string,
  description?: string
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Manager access required")

  if (!title || !category || !externalLink) {
    throw new Error("Title, category, and link are required")
  }

  // Validate it's a Google Drive or similar link
  const validDomains = ["drive.google.com", "docs.google.com", "dropbox.com", "onedrive.live.com"]
  const isValidLink = validDomains.some((domain) => externalLink.includes(domain))
  
  if (!isValidLink && !externalLink.startsWith("http")) {
    throw new Error("Please provide a valid URL (Google Drive, Dropbox, OneDrive, or any HTTPS link)")
  }

  const { data: doc, error: dbError } = await supabase
    .from("sop_documents")
    .insert({
      title,
      category,
      description: description || null,
      source_type: "external",
      external_link: externalLink,
      file_name: title,
      file_type: "application/pdf",
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) throw new Error(`Database error: ${dbError.message}`)

  return { success: true, document: doc }
}

export async function getSOPs(category?: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["operations", "manager", "admin"].includes(profile.role)) {
    throw new Error("Access restricted to operations staff")
  }

  const admin = createAdminClient()
  let query = admin
    .from("sop_documents")
    .select("*")
    .order("created_at", { ascending: false })

  if (category) {
    query = query.eq("category", category)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  // Batch fetch uploader names (no FK join per convention)
  const uploaderIds = Array.from(new Set((data || []).map((d: any) => d.uploaded_by).filter(Boolean)))
  const { data: uploaderProfiles } = uploaderIds.length > 0
    ? await admin.from("profiles").select("id, full_name").in("id", uploaderIds)
    : { data: [] }
  const uploaderMap = new Map((uploaderProfiles || []).map((p: any) => [p.id, p.full_name]))

  return (data || []).map((item: any) => ({
    ...item,
    uploader_name: uploaderMap.get(item.uploaded_by) || "Unknown",
  }))
}

export async function getSOPSignedUrl(filePath: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase.storage
    .from("operations-sops")
    .createSignedUrl(filePath, 60 * 60)

  if (error || !data?.signedUrl) throw new Error("Failed to generate access URL")
  return data.signedUrl
}

export async function deleteSOP(id: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Manager access required")

  const { data: doc } = await supabase.from("sop_documents").select("file_path, source_type").eq("id", id).single()
  if (!doc) throw new Error("Document not found")

  // Only delete from storage if it's a supabase file
  if (doc.source_type === "supabase" && doc.file_path) {
    await supabase.storage.from("operations-sops").remove([doc.file_path])
  }

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
    .select("title, category, file_name, source_type, external_link, created_at")
    .eq("uploaded_by", user.id)
    .gte("created_at", clockIn)

  if (clockOut) {
    query = query.lte("created_at", clockOut)
  }

  const { data } = await query
  return data || []
}
