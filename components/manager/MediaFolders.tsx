"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { FileText, Video, X, Image as ImageIcon } from "lucide-react"

interface MediaFile {
  userId: string
  name: string
  path: string
  mimetype: string
  size: number
  signedUrl: string
}

interface GroupedFile {
  userId: string
  files: MediaFile[]
}

export function MediaFolders() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxFile, setLightboxFile] = useState<MediaFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFiles() {
      try {
        setError(null)
        const res = await fetch("/api/media")
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to load media (${res.status})`)
        }
        const { files: data } = await res.json()
        setFiles(data ?? [])
      } catch (err: any) {
        console.error("Failed to fetch media:", err)
        setError(err.message || "Failed to load media")
      } finally {
        setLoading(false)
      }
    }
    fetchFiles()
  }, [])

  const groupedFiles: GroupedFile[] = files.reduce((acc, file) => {
    const existing = acc.find((g) => g.userId === file.userId)
    if (existing) {
      existing.files.push(file)
    } else {
      acc.push({ userId: file.userId, files: [file] })
    }
    return acc
  }, [] as GroupedFile[])

  function getFileType(mimetype: string): "image" | "video" | "document" {
    if (mimetype.startsWith("image/")) return "image"
    if (mimetype.startsWith("video/")) return "video"
    return "document"
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
          <div key={group.userId}>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              {group.userId === "unknown" ? "Unsorted" : group.userId}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.files.map((file) => {
                const type = getFileType(file.mimetype)
                return (
                  <button
                    key={file.path}
                    onClick={() => setLightboxFile(file)}
                    className="group relative aspect-square bg-surface-container-high rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    {type === "image" ? (
                      <Image
                        src={file.signedUrl}
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
                          {file.name}
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
      {lightboxFile && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxFile(null)}
        >
          <button
            onClick={() => setLightboxFile(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-4xl max-h-[80vh] w-full" onClick={(e) => e.stopPropagation()}>
            {getFileType(lightboxFile.mimetype) === "image" ? (
              <Image
                src={lightboxFile.signedUrl}
                alt={lightboxFile.name}
                width={1200}
                height={800}
                className="object-contain w-full h-full rounded-xl"
              />
            ) : getFileType(lightboxFile.mimetype) === "video" ? (
              <video src={lightboxFile.signedUrl} controls className="w-full rounded-xl" />
            ) : (
              <div className="bg-surface p-8 rounded-xl text-center">
                <FileIcon type={getFileType(lightboxFile.mimetype)} />
                <p className="mt-4 text-lg font-bold">{lightboxFile.name}</p>
                <a
                  href={lightboxFile.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-xl"
                >
                  Open File
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
