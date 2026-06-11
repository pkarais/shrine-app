import { NextResponse } from "next/server"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Step 1: list root to get per-user folders
    const { data: folders, error: foldersError } = await admin.storage
      .from("employee-uploads")
      .list("", { limit: 200 })

    if (foldersError) throw new Error(foldersError.message)

    // Batch-resolve user IDs to display names
    const folderNames = (folders ?? []).filter((f: any) => !f.metadata?.mimetype).map((f: any) => f.name)
    const profileMap = new Map<string, string>()
    if (folderNames.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", folderNames)
      for (const p of (profiles ?? [])) {
        profileMap.set(p.id, p.full_name || p.email || p.id)
      }
    }

    const results: {
      userId: string
      displayName: string
      name: string
      path: string
      mimetype: string
      size: number
      signedUrl: string
    }[] = []

    // Step 2: for each folder (userId), list its files
    for (const folder of (folders ?? [])) {
      // Root-level file (has mimetype, not a folder)
      if (folder.metadata?.mimetype) {
        const { data: urlData } = await admin.storage
          .from("employee-uploads")
          .createSignedUrl(folder.name, 3600)
        if (urlData?.signedUrl) {
          results.push({
            userId: "unknown",
            displayName: "Unknown",
            name: folder.name,
            path: folder.name,
            mimetype: folder.metadata.mimetype ?? "",
            size: folder.metadata.size ?? 0,
            signedUrl: urlData.signedUrl,
          })
        }
        continue
      }

      // It is a folder — list its contents
      const { data: files, error: filesError } = await admin.storage
        .from("employee-uploads")
        .list(folder.name, { limit: 200 })

      if (filesError || !files) continue

      const actualFiles = files.filter((f: any) => f.metadata?.mimetype)
      if (actualFiles.length === 0) continue

      // Batch generate signed URLs
      const { data: signedUrls, error: signedError } = await admin.storage
        .from("employee-uploads")
        .createSignedUrls(
          actualFiles.map((f: any) => `${folder.name}/${f.name}`),
          3600
        )

      if (signedError || !signedUrls) continue

      const displayName = profileMap.get(folder.name) || folder.name

      for (let i = 0; i < actualFiles.length; i++) {
        const file = actualFiles[i]
        const signed = signedUrls[i]
        if (!signed?.signedUrl) continue
        results.push({
          userId: folder.name,
          displayName,
          name: file.name,
          path: `${folder.name}/${file.name}`,
          mimetype: file.metadata?.mimetype ?? "",
          size: file.metadata?.size ?? 0,
          signedUrl: signed.signedUrl,
        })
      }
    }

    return NextResponse.json({ files: results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "manager") return NextResponse.json({ error: "Manager access required" }, { status: 403 })

    const { path } = await request.json() as { path: string }
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 })

    const { error } = await admin.storage.from("employee-uploads").remove([path])
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
