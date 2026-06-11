"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDarkMode: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Read localStorage after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored && stored !== "system") {
      setThemeState(stored)
    }
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    
    const updateTheme = () => {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const isDark = theme === "dark" || (theme === "system" && systemDark)
      
      setIsDarkMode(isDark)
      
      if (isDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }

    updateTheme()
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      if (theme === "system") {
        updateTheme()
      }
    }
    
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
