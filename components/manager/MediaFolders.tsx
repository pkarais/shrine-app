"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import { FileText, Video, Play, X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react"

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
  const supabase = createClient()

  useEffect(() => {
    async function fetchFiles() {
      try {
        const { data, error } = await supabase
          .storage
          .from("employee-uploads")
          .list("", {
            limit: 100,
            offset: 0,
            sortBy: { column: "updated_at", order: "desc" },
          })
        if (error) throw error
        setFiles((data as StorageFile[]) || [])
      } catch (err) {
        console.error("Failed to fetch media:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchFiles()
  }, [supabase.storage])

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

  function getPublicUrl(file: StorageFile): string {
    const { data } = supabase.storage
      .from("employee-uploads")
      .getPublicUrl(file.name)
    return data.publicUrl
  }

  function openLightbox(file: StorageFile) {
    setSelectedFile(file)
    setLightboxUrl(getPublicUrl(file))
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
      <section className="section-wrapper p-8">
        <p className="text-xs label-text text-[var(--on-surface-variant)] mb-6">Staff Media</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface-container-low)] rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="section-wrapper p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs label-text text-[var(--on-surface-variant)] mb-1">Staff Media</p>
            <p className="body-md">{files.length} files from {groupedFiles.length} staff members</p>
          </div>
        </div>

        {groupedFiles.length === 0 ? (
          <div className="text-center py-12 text-[var(--on-surface-variant)] body-md">
            No media uploads yet
          </div>
        ) : (
          <div className="space-y-8">
            {groupedFiles.map((group) => (
              <div key={group.user}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full sacred-gradient flex items-center justify-center text-white font-bold text-sm">
                    {group.user[0]?.toUpperCase() ?? "S"}
                  </div>
                  <h4 className="font-semibold text-[var(--on-surface)]">{group.user}</h4>
                  <span className="badge-task">{group.files.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.files.map((file) => {
                    const type = getFileType(file)
                    const url = getPublicUrl(file)
                    return (
                      <button
                        key={file.id || file.name}
                        onClick={() => openLightbox(file)}
                        className="group relative bg-[var(--surface-container-lowest)] rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 text-left"
                      >
                        {type === "image" ? (
                          <div className="relative aspect-square">
                            <Image
                              src={url}
                              alt={file.name}
                              fill
                              className="object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                            />
                            <div className="absolute top-2 right-2">
                              <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                {type}
                              </span>
                            </div>
                          </div>
                        ) : type === "video" ? (
                          <div className="relative aspect-square bg-[var(--surface-container)] flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/80 flex items-center justify-center group-hover:bg-[var(--primary)] transition-colors">
                              <Play className="w-5 h-5 text-white ml-0.5" />
                            </div>
                            <span className="text-xs text-[var(--on-surface-variant)] mt-2">Video</span>
                          </div>
                        ) : (
                          <div className="relative aspect-square bg-[var(--surface-container)] flex flex-col items-center justify-center">
                            <FileIcon type={type} />
                            <span className="text-xs text-[var(--on-surface-variant)] mt-2">Document</span>
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-xs font-medium text-[var(--on-surface)] truncate">
                            {file.name.split("/").pop()}
                          </p>
                          <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">
                            {new Date(file.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {lightboxOpen && selectedFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLightbox}
              className="absolute -top-12 right-0 text-white hover:text-[var(--secondary)] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {lightboxUrl && getFileType(selectedFile) === "image" && (
              <Image
                src={lightboxUrl}
                alt={selectedFile.name}
                width={800}
                height={600}
                className="w-full h-auto rounded-xl"
              />
            )}

            {lightboxUrl && getFileType(selectedFile) === "video" && (
              <video
                src={lightboxUrl}
                controls
                className="w-full h-auto rounded-xl"
                autoPlay
              />
            )}

            {getFileType(selectedFile) === "document" && (
              <div className="bg-[var(--surface-container-lowest)] rounded-xl p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-[var(--on-surface-variant)] mb-4" />
                <p className="font-semibold text-[var(--on-surface)] mb-2">
                  {selectedFile.name.split("/").pop()}
                </p>
                <a
                  href={lightboxUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--primary-container)] transition-colors"
                >
                  Open Document
                </a>
              </div>
            )}

            <div className="mt-4 text-center">
              <p className="text-sm text-white/80">
                {selectedFile.name.split("/").pop()}
              </p>
              <p className="text-xs text-white/50 mt-1">
                Uploaded {new Date(selectedFile.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
