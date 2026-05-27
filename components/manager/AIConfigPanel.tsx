"use client"

import { useState, useEffect } from "react"

type AIProvider = "none" | "openai" | "gemini" | "openrouter"

export function AIConfigPanel() {
  const [provider, setProvider] = useState<AIProvider>("none")
  const [apiKey, setApiKey] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("shrine_ai_provider") as AIProvider | null
    const storedKey = localStorage.getItem("shrine_ai_key") || ""
    if (stored) setProvider(stored)
    if (storedKey) setApiKey(storedKey)
  }, [])

  const handleSave = () => {
    localStorage.setItem("shrine_ai_provider", provider)
    if (apiKey) localStorage.setItem("shrine_ai_key", apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    localStorage.removeItem("shrine_ai_provider")
    localStorage.removeItem("shrine_ai_key")
    setProvider("none")
    setApiKey("")
  }

  return (
    <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">automation</span>
        <h3 className="font-headline font-bold text-lg text-on-surface">AI Provider</h3>
      </div>
      <p className="text-sm text-on-surface-variant">
        Connect an AI service to enhance shift optimization and scheduling recommendations.
      </p>
      <div className="space-y-3">
        <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
          Provider
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as AIProvider)}
          className="w-full px-4 py-3 bg-surface-container-high border-none rounded-xl text-on-surface font-body text-sm focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="none">None (Built-in Optimizer)</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Google Gemini</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </div>
      {provider !== "none" && (
        <div className="space-y-3">
          <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-4 py-3 bg-surface-container-high border-none rounded-xl text-on-surface font-body text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          {saved ? "Saved" : "Save Configuration"}
        </button>
        <button
          onClick={handleClear}
          className="py-3 px-4 bg-surface-container-high text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-colors"
        >
          Clear
        </button>
      </div>
      {saved && (
        <p className="text-xs text-secondary font-bold text-center">Configuration saved locally.</p>
      )}
    </div>
  )
}
