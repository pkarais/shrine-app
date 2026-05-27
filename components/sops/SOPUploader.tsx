"use client"

import { useState, useRef } from "react"
import { Upload, FileText, X, Check, AlertTriangle } from "lucide-react"
import { uploadSOP } from "@/lib/actions/sops"

interface SOPUploaderProps {
  categories: string[]
  onUploaded: () => void
}

export function SOPUploader({ categories, onUploaded }: SOPUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.type !== "application/pdf") {
      setError("Only PDF files are allowed")
      setFile(null)
      return
    }

    if (selected.size > 20 * 1024 * 1024) {
      setError("File size must be under 20MB")
      setFile(null)
      return
    }

    setFile(selected)
    if (!title) setTitle(selected.name.replace(/\.pdf$/i, ""))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title || !category) {
      setError("Please fill in all required fields")
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title)
      formData.append("category", category)
      formData.append("description", description)

      await uploadSOP(formData)
      setSuccess(true)
      setFile(null)
      setTitle("")
      setCategory("")
      setDescription("")
      if (fileInputRef.current) fileInputRef.current.value = ""
      onUploaded()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="font-headline font-bold text-lg text-on-surface">Upload SOP Document</h3>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl text-emerald-500 text-sm">
          <Check className="w-4 h-4" /> SOP uploaded successfully
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            file
              ? "border-primary bg-primary/5"
              : "border-outline-variant hover:border-primary hover:bg-surface-container"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm text-on-surface font-medium">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="p-1 hover:bg-surface-container rounded-full"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-2 text-on-surface-variant" />
              <p className="text-sm text-on-surface-variant">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-on-surface-variant/60 mt-1">
                PDF files only, max 20MB
              </p>
            </>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider block mb-1">
            Title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Emergency Evacuation Procedure"
            className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider block mb-1">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this SOP..."
            rows={3}
            className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={uploading || !file || !title || !category}
          className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading..." : "Upload SOP"}
        </button>
      </form>
    </div>
  )
}
