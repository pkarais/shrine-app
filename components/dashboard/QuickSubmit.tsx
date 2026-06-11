"use client"

import { useState, useRef } from "react"

export function QuickSubmit() {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const ACCEPTED_TYPES = "image/*,video/*,.pdf,.doc,.docx"
  const MAX_FILE_MB = 4
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

  function validateAndAdd(incoming: File[]) {
    const oversized = incoming.filter((f) => f.size > MAX_FILE_BYTES)
    if (oversized.length > 0) {
      setError(`Files must be under ${MAX_FILE_MB} MB each: ${oversized.map((f) => f.name).join(", ")}`)
      return
    }
    setError(null)
    setFiles((prev) => [...prev, ...incoming])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    validateAndAdd(Array.from(e.dataTransfer.files))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAdd(Array.from(e.target.files || []))
    e.target.value = ""
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append("files", f))
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Upload failed (${res.status})`)
      }
      setUploaded(true)
      setFiles([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative rounded-[2rem] overflow-hidden bg-surface-container-low p-8 shadow-sm">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      <h3 className="font-headline text-xl font-bold text-primary mb-4">Quick Submit</h3>
      <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
        Upload daily site logs, incident reports, or media captures directly to the registry.
      </p>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`group flex flex-col items-center justify-center w-full h-32 rounded-[2rem] cursor-pointer transition-all ${
          dragActive ? "bg-primary/10 ring-2 ring-primary ring-dashed" : "bg-surface-container-high hover:bg-surface-container-highest"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <span className="material-symbols-outlined text-primary mb-2">cloud_upload</span>
          <p className="text-xs font-bold text-primary">Drop files or Browse</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {uploaded && (
        <div className="mt-4 bg-primary/10 text-primary text-xs font-bold rounded-xl px-4 py-3 text-center">
          Files uploaded successfully
        </div>
      )}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-surface-container-lowest rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-primary text-sm">
                {f.name.match(/\.(jpg|jpeg|png|gif)$/i) ? "image" : f.name.match(/\.(mp4|mov|avi)$/i) ? "videocam" : "description"}
              </span>
              <span className="text-on-surface truncate flex-1">{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="ml-auto text-on-surface-variant hover:text-error transition-colors shrink-0"
                aria-label="Remove file"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-2 py-3 rounded-xl gold-accents text-on-secondary font-bold text-sm disabled:opacity-50"
          >
            {uploading ? "Uploading..." : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-error mt-2 text-center">{error}</p>}
    </div>
  )
}
