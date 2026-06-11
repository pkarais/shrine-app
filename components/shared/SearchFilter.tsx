"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { SearchBar } from "./SearchBar"
import { useSearch } from "@/hooks/useSearch"
import { X } from "lucide-react"

export type FilterType = "chips" | "date"

export interface FilterDef<T> {
  field: keyof T
  label: string
  type?: FilterType
  options?: string[]
}

export interface SearchFilterProps<T> {
  items: T[]
  searchFields: (keyof T)[]
  filters?: FilterDef<T>[]
  onFilterChange: (filtered: T[]) => void
  placeholder?: string
  className?: string
}

function isDateInRange(dateStr: string, range: "today" | "week" | "month"): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  if (isNaN(date.getTime())) return false
  if (range === "today") {
    return date.toDateString() === now.toDateString()
  }
  if (range === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return date >= weekAgo
  }
  if (range === "month") {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return date >= monthAgo
  }
  return true
}

export function SearchFilter<T>({
  items,
  searchFields,
  filters = [],
  onFilterChange,
  placeholder = "Search...",
  className = "",
}: SearchFilterProps<T>) {
  const { query, setQuery, results: searchResults } = useSearch(items, searchFields)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    let data = searchResults
    for (const filter of filters) {
      const key = String(filter.field)
      const activeValue = activeFilters[key]
      if (!activeValue || activeValue === "all") continue

      if (filter.type === "date") {
        data = data.filter((item) => {
          const value = item[filter.field]
          if (!value) return false
          return isDateInRange(String(value), activeValue as "today" | "week" | "month")
        })
      } else {
        data = data.filter((item) => {
          const value = item[filter.field]
          if (value == null) return false
          return String(value).toLowerCase() === activeValue.toLowerCase()
        })
      }
    }
    return data
  }, [searchResults, activeFilters, filters])

  useEffect(() => {
    onFilterChange(filtered)
  }, [filtered, onFilterChange])

  const toggleFilter = useCallback((field: keyof T, value: string) => {
    const key = String(field)
    setActiveFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? "all" : value,
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setActiveFilters({})
    setQuery("")
  }, [setQuery])

  const hasActiveFilters =
    query || Object.values(activeFilters).some((v) => v && v !== "all")

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={placeholder}
          className="flex-1"
        />
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {filters.map((filter) => (
            <div key={String(filter.field)} className="flex items-center gap-2">
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                {filter.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {filter.type === "date" ? (
                  <>
                    {[
                      { value: "today", label: "Today" },
                      { value: "week", label: "Last 7d" },
                      { value: "month", label: "Last 30d" },
                    ].map((range) => (
                      <button
                        key={range.value}
                        onClick={() => toggleFilter(filter.field, range.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          activeFilters[String(filter.field)] === range.value
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </>
                ) : (
                  filter.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => toggleFilter(filter.field, option)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        activeFilters[String(filter.field)] === option
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                      }`}
                    >
                      {option.charAt(0).toUpperCase() +
                        option.slice(1).replace(/_/g, " ")}
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
