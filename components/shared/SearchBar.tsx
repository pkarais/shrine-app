"use client"

import { Search, X } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: SearchBarProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-on-surface-variant pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2.5 bg-surface-container-high rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 border border-outline-variant/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 p-1 rounded-full hover:bg-surface-container-highest text-on-surface-variant transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
