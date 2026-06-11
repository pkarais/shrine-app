"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePresence } from "@/components/presence/PresenceProvider"

interface StaffProfile {
  id: string
  full_name: string | null
  email: string
  role: string | null
}

const ROLE_STYLES: Record<string, string> = {
  manager:    "bg-secondary-container text-on-secondary-container",
  security:   "bg-tertiary-container text-on-tertiary-container",
  operations: "bg-primary-fixed text-on-primary-fixed",
  council:    "bg-secondary-fixed text-on-secondary-fixed",
}

export function StaffOnlineNowCard({ staff }: { staff: StaffProfile[] }) {
  const { onlineUserIds, onlineCount } = usePresence()

  const onlineStaff = useMemo(() => {
    return staff
      .filter((s) => onlineUserIds.has(s.id))
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
  }, [staff, onlineUserIds])

  function initials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  return (
    <div className="card-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">circle</span>
            Staff Online Now
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Live presence from connected browsers
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {onlineCount} online
        </span>
      </div>

      {onlineStaff.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">
          No staff currently signed in.
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant/15 max-h-80 overflow-y-auto">
          {onlineStaff.map((person) => (
            <li key={person.id}>
              <Link
                href={`/messages?user=${person.id}`}
                className="flex items-center gap-3 py-2.5 px-1 hover:bg-surface-container rounded-md transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full sacred-gradient flex items-center justify-center text-white font-display font-bold text-xs">
                    {initials(person.full_name, person.email)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {person.full_name || person.email}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">{person.email}</p>
                </div>
                <span
                  className={`shrink-0 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${
                    ROLE_STYLES[person.role?.toLowerCase() || ""] || "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {person.role || "staff"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
