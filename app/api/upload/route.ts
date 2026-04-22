import { NextResponse } from "next/server"
import { createServerClient } from "@/utils/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const uploadedUrls: string[] = []

    for (const file of files) {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("employee-uploads")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) throw new Error(uploadError.message)

      const { data: signedUrl } = await supabase.storage
        .from("employee-uploads")
        .createSignedUrl(filePath, 31536000)

      if (!signedUrl?.signedUrl) {
        throw new Error("Failed to generate signed URL")
      }

      uploadedUrls.push(signedUrl.signedUrl)
    }

    return NextResponse.json({ urls: uploadedUrls })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
