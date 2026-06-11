"use client"

import { useTheme } from "./ThemeProvider"
import { Sun, Moon, Monitor } from "lucide-react"

interface ThemeToggleProps {
  variant?: "icon" | "dropdown" | "segmented"
  className?: string
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, setTheme, isDarkMode } = useTheme()

  if (variant === "segmented") {
    return (
      <div className={`flex items-center gap-1 p-1 rounded-xl bg-surface-container border border-outline-variant/30 ${className}`}>
        <button
          onClick={() => setTheme("light")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            theme === "light"
              ? "bg-primary text-white shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <Sun className="w-4 h-4" />
          <span className="hidden sm:inline">Light</span>
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            theme === "system"
              ? "bg-primary text-white shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span className="hidden sm:inline">Auto</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            theme === "dark"
              ? "bg-primary text-white shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <Moon className="w-4 h-4" />
          <span className="hidden sm:inline">Dark</span>
        </button>
      </div>
    )
  }

  if (variant === "dropdown") {
    return (
      <div className={`relative group ${className}`}>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high transition-colors"
        >
          {isDarkMode ? (
            <Moon className="w-5 h-5 text-primary" />
          ) : (
            <Sun className="w-5 h-5 text-primary" />
          )}
          <span className="text-sm font-medium capitalize">{theme}</span>
        </button>
        <div className="absolute top-full right-0 mt-2 w-48 py-2 bg-surface-container rounded-xl shadow-xl border border-outline-variant/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
          <button
            onClick={() => setTheme("light")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface-container-high transition-colors ${
              theme === "light" ? "text-primary font-medium" : "text-on-surface-variant"
            }`}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            onClick={() => setTheme("system")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface-container-high transition-colors ${
              theme === "system" ? "text-primary font-medium" : "text-on-surface-variant"
            }`}
          >
            <Monitor className="w-4 h-4" />
            System
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface-container-high transition-colors ${
              theme === "dark" ? "text-primary font-medium" : "text-on-surface-variant"
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </div>
      </div>
    )
  }

  // Default icon variant
  return (
    <button
      onClick={() => setTheme(isDarkMode ? "light" : "dark")}
      className={`p-3 rounded-xl bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high transition-all ${className}`}
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 text-[#d4a017]" />
      ) : (
        <Moon className="w-5 h-5 text-[#1a3a5c]" />
      )}
    </button>
  )
}
