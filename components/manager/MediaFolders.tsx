"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import {
  FileText, Video, X, Image as ImageIcon,
  Trash2, Download, ChevronLeft, ChevronRight,
} from "lucide-react"

interface MediaFile {
  userId: string
  displayName: string
  name: string
  path: string
  mimetype: string
  size: number
  signedUrl: string
}

interface GroupedFile {
  userId: string
  displayName: string
  files: MediaFile[]
}

function getFileType(mimetype: string): "image" | "video" | "document" {
  if (mimetype.startsWith("image/")) return "image"
  if (mimetype.startsWith("video/")) return "video"
  return "document"
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ type }: { type: "image" | "video" | "document" }) {
  if (type === "image") return <ImageIcon className="w-5 h-5 text-white" />
  if (type === "video") return <Video className="w-5 h-5 text-white" />
  return <FileText className="w-5 h-5 text-white" />
}

// â”€â”€â”€ Lightbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface LightboxProps {
  file: MediaFile
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onRequestDelete: () => void
  deleting: boolean
}

function Lightbox({ file, index, total, onClose, onPrev, onNext, onRequestDelete, deleting }: LightboxProps) {
  const type = getFileType(file.mimetype)
  const hasPrev = index > 0
  const hasNext = index < total - 1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && hasPrev) onPrev()
      if (e.key === "ArrowRight" && hasNext) onNext()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", backgroundColor: "rgba(0,0,0,0.96)" }}
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", flexShrink: 0,
          backgroundColor: "rgba(0,0,0,0.7)", borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <FileTypeIcon type={type} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {file.displayName} Â· {formatBytes(file.size)} Â· {index + 1} of {total}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <a
            href={file.signedUrl}
            download={file.name}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.12)", color: "#fff",
              fontSize: 13, textDecoration: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Download style={{ width: 16, height: 16 }} />
            Download
          </a>
          <button
            onClick={onRequestDelete}
            disabled={deleting}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              backgroundColor: "rgba(220,38,38,0.5)", color: "#fca5a5",
              fontSize: 13, border: "none", cursor: "pointer",
              opacity: deleting ? 0.5 : 1,
            }}
          >
            <Trash2 style={{ width: 16, height: 16 }} />
            Delete
          </button>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.12)", color: "#fff",
              border: "none", cursor: "pointer",
            }}
            title="Close (Esc)"
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>

      {/* Media area */}
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          style={{
            position: "absolute", left: 12, zIndex: 10,
            padding: 8, borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)", color: "#fff",
            border: "none", cursor: hasPrev ? "pointer" : "not-allowed",
            opacity: hasPrev ? 1 : 0.2,
          }}
        >
          <ChevronLeft style={{ width: 24, height: 24 }} />
        </button>

        <div style={{ maxWidth: "80vw", maxHeight: "calc(100vh - 80px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.signedUrl}
              alt={file.name}
              style={{ maxWidth: "80vw", maxHeight: "calc(100vh - 80px)", objectFit: "contain", borderRadius: 8, boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
            />
          ) : type === "video" ? (
            <video
              src={file.signedUrl}
              controls
              autoPlay
              style={{ maxWidth: "80vw", maxHeight: "calc(100vh - 80px)", borderRadius: 8 }}
            />
          ) : (
            <div style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 40, textAlign: "center" }}>
              <FileText style={{ width: 64, height: 64, color: "rgba(255,255,255,0.4)", margin: "0 auto 16px" }} />
              <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600, color: "#fff" }}>{file.name}</p>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{formatBytes(file.size)}</p>
              <a
                href={file.signedUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 8,
                  backgroundColor: "#6750A4", color: "#fff",
                  textDecoration: "none", fontWeight: 500,
                }}
              >
                <Download style={{ width: 16, height: 16 }} />
                Open File
              </a>
            </div>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!hasNext}
          style={{
            position: "absolute", right: 12, zIndex: 10,
            padding: 8, borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)", color: "#fff",
            border: "none", cursor: hasNext ? "pointer" : "not-allowed",
            opacity: hasNext ? 1 : 0.2,
          }}
        >
          <ChevronRight style={{ width: 24, height: 24 }} />
        </button>
      </div>
    </div>,
    document.body
  )
}

// â”€â”€â”€ Delete Confirm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DeleteConfirmProps {
  file: MediaFile
  deleting: boolean
  deleteError: string | null
  onCancel: () => void
  onConfirm: () => void
}

function DeleteConfirm({ file, deleting, deleteError, onCancel, onConfirm }: DeleteConfirmProps) {
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ backgroundColor: "#1C1B1F", borderRadius: 20, padding: 24, maxWidth: 360, width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "#E6E1E5" }}>Delete this file?</p>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#938F99", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
        {deleteError && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#f87171" }}>{deleteError}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{ padding: "9px 18px", borderRadius: 12, fontSize: 13, backgroundColor: "#2B2930", color: "#938F99", border: "none", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{ padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, backgroundColor: "#dc2626", color: "#fff", border: "none", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? "Deletingâ€¦" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function MediaFolders() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [lightboxFile, setLightboxFile] = useState<MediaFile | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const [confirmDeleteFile, setConfirmDeleteFile] = useState<MediaFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
      acc.push({ userId: file.userId, displayName: file.displayName, files: [file] })
    }
    return acc
  }, [] as GroupedFile[])

  const flatFiles = groupedFiles.flatMap((g) => g.files)

  function openLightbox(file: MediaFile) {
    const idx = flatFiles.findIndex((f) => f.path === file.path)
    setLightboxIndex(idx >= 0 ? idx : 0)
    setLightboxFile(file)
  }

  function closeLightbox() {
    setLightboxFile(null)
  }

  function navPrev() {
    const prev = flatFiles[lightboxIndex - 1]
    if (prev) { setLightboxIndex(lightboxIndex - 1); setLightboxFile(prev) }
  }

  function navNext() {
    const next = flatFiles[lightboxIndex + 1]
    if (next) { setLightboxIndex(lightboxIndex + 1); setLightboxFile(next) }
  }

  async function deleteFile() {
    if (!confirmDeleteFile) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: confirmDeleteFile.path }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete")
      }
      const deletedPath = confirmDeleteFile.path
      setConfirmDeleteFile(null)
      closeLightbox()
      setFiles((prev) => prev.filter((f) => f.path !== deletedPath))
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete file")
    } finally {
      setDeleting(false)
    }
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
              {group.displayName}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.files.map((file) => {
                const type = getFileType(file.mimetype)
                return (
                  <button
                    key={file.path}
                    onClick={() => openLightbox(file)}
                    className="group relative aspect-square bg-surface-container-high rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    {type === "image" ? (
                      <Image
                        src={file.signedUrl}
                        alt={file.name}
                        fill
                        className="object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <FileTypeIcon type={type} />
                        <span className="text-xs text-on-surface-variant px-2 truncate max-w-full">{file.name}</span>
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

      {lightboxFile && (
        <Lightbox
          file={lightboxFile}
          index={lightboxIndex}
          total={flatFiles.length}
          onClose={closeLightbox}
          onPrev={navPrev}
          onNext={navNext}
          onRequestDelete={() => { setConfirmDeleteFile(lightboxFile); setDeleteError(null) }}
          deleting={deleting}
        />
      )}

      {confirmDeleteFile && (
        <DeleteConfirm
          file={confirmDeleteFile}
          deleting={deleting}
          deleteError={deleteError}
          onCancel={() => { setConfirmDeleteFile(null); setDeleteError(null) }}
          onConfirm={deleteFile}
        />
      )}
    </section>
  )
}
