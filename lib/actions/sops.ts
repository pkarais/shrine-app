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

// Step 1: Generate a signed upload URL so the browser uploads directly to Supabase
// (bypasses Vercel function body-size and timeout limits entirely)
export async function getSOPSignedUploadUrl(
  fileName: string,
  category: string,
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Manager access required")

  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
  const filePath = `${category.toLowerCase().replace(/\s+/g, "-")}/${Date.now()}-${sanitizedName}`

  const { data, error } = await admin.storage
    .from("operations-sops")
    .createSignedUploadUrl(filePath)

  if (error || !data?.signedUrl) throw new Error(`Failed to create upload URL: ${error?.message}`)

  return { signedUrl: data.signedUrl, filePath, token: data.token }
}

// Step 2: After the browser has uploaded the file directly, register it in the DB
export async function registerSOPUpload(params: {
  filePath: string
  fileName: string
  fileSize: number
  title: string
  category: string
  description?: string
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Manager access required")

  const { data: doc, error: dbError } = await admin
    .from("sop_documents")
    .insert({
      title: params.title,
      category: params.category,
      description: params.description || null,
      source_type: "supabase",
      file_path: params.filePath,
      file_name: params.fileName,
      file_size: params.fileSize,
      file_type: "application/pdf",
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) {
    // Clean up orphaned storage file
    await admin.storage.from("operations-sops").remove([params.filePath])
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

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
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

  const { data: doc, error: dbError } = await admin
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

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["operations", "manager", "admin", "security", "greeter"].includes(profile.role)) {
    throw new Error("Access restricted to operations staff")
  }

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

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from("operations-sops")
    .createSignedUrl(filePath, 60 * 60)

  if (error || !data?.signedUrl) throw new Error("Failed to generate access URL")
  return data.signedUrl
}

// Batch-generate signed URLs for multiple file paths in a single server round-trip.
// Returns a map of filePath → signedUrl. Missing/errored paths are omitted.
export async function getSOPSignedUrls(
  filePaths: string[]
): Promise<Record<string, string>> {
  if (!filePaths?.length) return {};

  // Normalize once (no leading slash, remove empties, dedupe)
  const normalized = Array.from(new Set(
    filePaths
      .filter(Boolean)
      .map((p) => p.trim().replace(/^\/+/, ""))
      .filter(Boolean)
  ));

  if (!normalized.length) return {};

  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from("operations-sops")
    .createSignedUrls(normalized, 60 * 60);

  if (error) {
    throw new Error(`Failed to generate access URLs: ${error.message}`);
  }

  const result: Record<string, string> = {};

  for (const item of data ?? []) {
    // item.error exists per-path; skip broken ones
    if (item?.error) continue;
    if (item?.path && item?.signedUrl) {
      result[item.path] = item.signedUrl;
    }
  }

  return result;
}

export async function deleteSOP(id: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Manager access required")

  const { data: doc } = await admin.from("sop_documents").select("file_path, source_type").eq("id", id).single()
  if (!doc) throw new Error("Document not found")

  // Only delete from storage if it's a supabase file
  if (doc.source_type === "supabase" && doc.file_path) {
    await admin.storage.from("operations-sops").remove([doc.file_path])
  }

  const { error } = await admin.from("sop_documents").delete().eq("id", id)
  if (error) throw new Error(error.message)

  return { success: true }
}

export async function getSOPUploadsForShift(clockIn: string, clockOut?: string | null) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  let query = admin
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
