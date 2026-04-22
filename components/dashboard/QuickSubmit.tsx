"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/Button"

export function QuickSubmit() {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<string[]>([])
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFiles = Array.from(e.dataTransfer.files).map((f) => f.name)
    setFiles((prev) => [...prev, ...droppedFiles])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).map((f) => f.name)
    setFiles((prev) => [...prev, ...selected])
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
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((name, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-surface-container-lowest rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-primary text-sm">
                {name.match(/\.(jpg|jpeg|png|gif)$/i) ? "image" : name.match(/\.(mp4|mov|avi)$/i) ? "videocam" : "description"}
              </span>
              <span className="text-on-surface truncate">{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
