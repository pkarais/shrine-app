import { NextResponse } from "next/server"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const MAX_BYTES = 4 * 1024 * 1024 // 4 MB — Vercel serverless body limit
    const ALLOWED_TYPES = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
      "video/mp4", "video/quicktime", "video/x-msvideo",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    for (const file of files) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `"${file.name}" exceeds the 4 MB limit. Please compress or resize before uploading.` },
          { status: 413 }
        )
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `"${file.name}" is not an allowed file type.` },
          { status: 415 }
        )
      }
    }

    const uploadedUrls: { url: string; path: string; name: string; size: number; mimetype: string }[] = []

    for (const file of files) {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await admin.storage
        .from("employee-uploads")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) throw new Error(uploadError.message)

      const { data: signedUrl } = await admin.storage
        .from("employee-uploads")
        .createSignedUrl(filePath, 31536000)

      if (!signedUrl?.signedUrl) {
        throw new Error("Failed to generate signed URL")
      }

      uploadedUrls.push({ url: signedUrl.signedUrl, path: filePath, name: file.name, size: file.size, mimetype: file.type })
    }

    return NextResponse.json({ urls: uploadedUrls.map((f) => f.url), files: uploadedUrls })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
