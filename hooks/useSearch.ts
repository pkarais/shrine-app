"use client"

import { useState, useMemo, useEffect, useRef } from "react"

export interface UseSearchOptions {
  debounceMs?: number
}

export interface UseSearchResult<T> {
  query: string
  setQuery: (query: string) => void
  results: T[]
}

export function useSearch<T>(
  items: T[],
  fields: (keyof T)[],
  options: UseSearchOptions = {}
): UseSearchResult<T> {
  const { debounceMs = 150 } = options
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setDebouncedQuery(query), debounceMs)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [query, debounceMs])

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return items
    const lower = debouncedQuery.toLowerCase()
    return items.filter((item) =>
      fields.some((field) => {
        const value = item[field]
        if (value == null) return false
        return String(value).toLowerCase().includes(lower)
      })
    )
  }, [items, fields, debouncedQuery])

  return { query, setQuery, results }
}
