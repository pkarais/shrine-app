"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import { FileText, Video, X, Image as ImageIcon } from "lucide-react"

interface StorageFile {
  name: string
  id: string
  updated_at: string
  metadata: {
    mimetype?: string
    size?: number
  }
}

interface GroupedFile {
  user: string
  files: StorageFile[]
}

export function MediaFolders() {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchFiles() {
      try {
        setError(null)
        // List recursively to get nested files
        const { data, error } = await supabase
          .storage
          .from("employee-uploads")
          .list("", {
            limit: 100,
            offset: 0,
            sortBy: { column: "updated_at", order: "desc" },
          })
        if (error) {
          // Bucket might not exist
          if (error.message?.includes("bucket") || error.message?.includes("not found")) {
            setError("Storage bucket not configured. Please create 'employee-uploads' bucket in Supabase.")
            setFiles([])
            return
          }
          throw error
        }

        // Filter out folders (they have no metadata.mimetype)
        const allItems = (data as StorageFile[]) || []
        const fileItems = allItems.filter((item) => item.metadata?.mimetype)
        setFiles(fileItems)
      } catch (err: any) {
        console.error("Failed to fetch media:", err)
        setError(err.message || "Failed to load media")
      } finally {
        setLoading(false)
      }
    }
    fetchFiles()
  }, [supabase])

  const groupedFiles: GroupedFile[] = files.reduce((acc, file) => {
    const userKey = file.name.split("/")[0] || "Unknown"
    const existing = acc.find((g) => g.user === userKey)
    if (existing) {
      existing.files.push(file)
    } else {
      acc.push({ user: userKey, files: [file] })
    }
    return acc
  }, [] as GroupedFile[])

  function getFileType(file: StorageFile): "image" | "video" | "document" {
    const mime = file.metadata?.mimetype || ""
    if (mime.startsWith("image/")) return "image"
    if (mime.startsWith("video/")) return "video"
    return "document"
  }

  async function getSignedUrl(file: StorageFile): Promise<string> {
    const { data, error } = await supabase.storage
      .from("employee-uploads")
      .createSignedUrl(file.name, 60 * 60) // 1 hour
    if (error || !data?.signedUrl) {
      // Fallback to public URL
      const { data: publicData } = supabase.storage
        .from("employee-uploads")
        .getPublicUrl(file.name)
      return publicData.publicUrl
    }
    return data.signedUrl
  }

  async function openLightbox(file: StorageFile) {
    setSelectedFile(file)
    const url = await getSignedUrl(file)
    setLightboxUrl(url)
    setLightboxOpen(true)
  }

  function closeLightbox() {
    setLightboxOpen(false)
    setSelectedFile(null)
    setLightboxUrl(null)
  }

  function FileIcon({ type }: { type: "image" | "video" | "document" }) {
    if (type === "image") return <ImageIcon className="w-5 h-5" />
    if (type === "video") return <Video className="w-5 h-5" />
    return <FileText className="w-5 h-5" />
  }

  if (loading) {
    return (
      <section className="bg-surface-container-low rounded-xl p-6">
        <h3 className="font-headline font-bold text-xl mb-4">Staff Media</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square bg-surface-container-high rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="bg-surface-container-low rounded-xl p-6">
        <h3 className="font-headline font-bold text-xl mb-4">Staff Media</h3>
        <div className="p-4 bg-red-500/10 rounded-xl text-sm text-red-400">
          <p className="font-bold">Error loading media</p>
          <p className="mt-1">{error}</p>
        </div>
      </section>
    )
  }

  if (files.length === 0) {
    return (
      <section className="bg-surface-container-low rounded-xl p-6">
        <h3 className="font-headline font-bold text-xl mb-4">Staff Media</h3>
        <p className="text-sm text-on-surface-variant">No media uploads yet.</p>
      </section>
    )
  }

  return (
    <section className="bg-surface-container-low rounded-xl p-6">
      <h3 className="font-headline font-bold text-xl mb-4">Staff Media</h3>
      <div className="space-y-6">
        {groupedFiles.map((group) => (
          <div key={group.user}>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              {group.user === "Unknown" ? "Unsorted" : group.user}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.files.map((file) => {
                const type = getFileType(file)
                return (
                  <button
                    key={file.id}
                    onClick={() => openLightbox(file)}
                    className="group relative aspect-square bg-surface-container-high rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    {type === "image" ? (
                      <Image
                        src={`/api/storage/employee-uploads/${file.name}`}
                        alt={file.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <FileIcon type={type} />
                        <span className="text-xs text-on-surface-variant px-2 truncate max-w-full">
                          {file.name.split("/").pop()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && selectedFile && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-4xl max-h-[80vh] w-full" onClick={(e) => e.stopPropagation()}>
            {getFileType(selectedFile) === "image" && lightboxUrl ? (
              <Image
                src={lightboxUrl}
                alt={selectedFile.name}
                width={1200}
                height={800}
                className="object-contain w-full h-full rounded-xl"
              />
            ) : getFileType(selectedFile) === "video" && lightboxUrl ? (
              <video src={lightboxUrl} controls className="w-full rounded-xl" />
            ) : (
              <div className="bg-surface p-8 rounded-xl text-center">
                <FileIcon type={getFileType(selectedFile)} />
                <p className="mt-4 text-lg font-bold">{selectedFile.name.split("/").pop()}</p>
                {lightboxUrl && (
                  <a
                    href={lightboxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-xl"
                  >
                    Open File
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
