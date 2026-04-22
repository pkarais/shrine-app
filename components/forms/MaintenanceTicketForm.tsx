"use client"

import { useState, useRef } from "react"
import { Wrench, CheckCircle2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { createTicket } from "@/lib/actions/tickets"

const priorityOptions = ["low", "medium", "high", "urgent"] as const
type Priority = typeof priorityOptions[number]

export function MaintenanceTicketForm({ eventId, onClose }: { eventId?: number | null, onClose?: () => void }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selected])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadFiles(): Promise<string[]> {
    if (files.length === 0) return []
    setUploadProgress("Uploading files...")
    const formData = new FormData()
    files.forEach((file) => formData.append("files", file))
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Upload failed")
    }
    const data = await res.json()
    setUploadProgress(null)
    return data.urls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      let mediaUrls: string[] = []
      if (files.length > 0) {
        mediaUrls = await uploadFiles()
      }
      await createTicket(eventId ?? null, title, description, priority, mediaUrls)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to create ticket")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-10 h-10 mx-auto text-[var(--secondary)] mb-3" />
        <h3 className="headline-sm text-[var(--on-surface)]">Ticket Created</h3>
        <p className="body-md mt-1">Your maintenance ticket has been submitted.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="headline-sm flex items-center gap-2 text-[var(--on-surface)] mb-4">
        <Wrench className="w-5 h-5 text-[var(--tertiary)]" />
        Report Maintenance Issue
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the issue"
            className="input-surface w-full px-4 py-3 text-sm"
          />
        </div>
        <div>
          <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-2">Priority</label>
          <div className="flex gap-2">
            {priorityOptions.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setPriority(level)}
                className={`px-3 py-2 rounded-md text-xs label-text font-semibold transition-all capitalize ${
                  priority === level
                    ? level === "low"
                      ? "bg-[var(--surface-container-low)] text-[var(--primary)] ring-2 ring-[var(--primary)]"
                      : level === "medium"
                      ? "bg-[var(--secondary-container)] text-[var(--secondary)]"
                      : level === "high"
                      ? "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]"
                      : "bg-red-900/30 text-red-400 ring-2 ring-red-500"
                    : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the issue..."
            rows={3}
            className="input-surface w-full px-4 py-3 text-sm resize-none"
          />
        </div>
        <div>
          <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-2">Attachments</label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1" /> Upload
            </Button>
            {files.length > 0 && (
              <span className="text-xs text-[var(--on-surface-variant)]">{files.length} file(s) selected</span>
            )}
          </div>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-[var(--on-surface-variant)] bg-[var(--surface-container)] rounded-md px-3 py-1.5">
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => removeFile(i)} className="ml-2 text-[var(--error)] hover:opacity-70">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploadProgress && (
            <p className="text-xs text-[var(--primary)] mt-1">{uploadProgress}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={!title.trim() || !description.trim() || isSubmitting}
          variant="danger"
          size="lg"
          className="w-full"
        >
          {isSubmitting ? "Creating..." : "Create Ticket"}
        </Button>
        {error && <p className="text-sm text-[var(--error)] mt-2">{error}</p>}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-4 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors py-2"
          >
            Cancel and Return
          </button>
        )}
      </form>
    </div>
  )
}
