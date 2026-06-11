"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react"
import { createClient } from "@/utils/supabase/client"

interface PresenceContextValue {
  onlineUserIds: Set<string>
  isOnline: (userId: string | null | undefined) => boolean
  onlineCount: number
}

const EMPTY_SET: Set<string> = new Set()

const PresenceContext = createContext<PresenceContextValue>({
  onlineUserIds: EMPTY_SET,
  isOnline: () => false,
  onlineCount: 0,
})

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(EMPTY_SET)
  const onlineRef = useRef<Set<string>>(EMPTY_SET)
  // Hold a ref to the active channel so wake-up handlers can re-track
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const lastTrackRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function setup() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const channel = supabase.channel("app:online", {
        config: { presence: { key: user.id } },
      })
      channelRef.current = channel

      channel
        .on("presence", { event: "sync" }, () => {
          if (!channel) return
          const state = channel.presenceState() as Record<string, unknown[]>
          const nextIds = Object.keys(state)
          const prev = onlineRef.current
          // Skip re-render when membership hasn't actually changed
          if (prev.size === nextIds.length && nextIds.every((id) => prev.has(id))) return
          const next = new Set(nextIds)
          onlineRef.current = next
          setOnlineUserIds(next)
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED" && channel) {
            lastTrackRef.current = Date.now()
            await channel.track({ online_at: new Date().toISOString() })
          }
        })
    }

    setup()

    // ── Mobile wake-up fix ──────────────────────────────────────────────
    // When the phone wakes, the WebSocket may have timed out server-side
    // even though the client object still exists. Supabase Realtime will
    // reconnect the socket automatically, but we need to re-call track()
    // so the server registers this user as present again.
    const retrack = async () => {
      const ch = channelRef.current
      if (!ch) return
      // Debounce: don't re-track if we already did within the last 10 s
      if (Date.now() - lastTrackRef.current < 10_000) return
      try {
        lastTrackRef.current = Date.now()
        await ch.track({ online_at: new Date().toISOString() })
      } catch {
        // Silently ignore — the next sync event will correct state
      }
    }

    const onVisible = () => { if (document.visibilityState === "visible") retrack() }
    const onOnline = () => retrack()

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
      const ch = channelRef.current
      if (ch) {
        ch.untrack().catch(() => {})
        supabase.removeChannel(ch)
        channelRef.current = null
      }
    }
  }, [])

  const isOnline = useCallback(
    (userId: string | null | undefined) => (userId ? onlineUserIds.has(userId) : false),
    [onlineUserIds]
  )

  const value = useMemo<PresenceContextValue>(
    () => ({ onlineUserIds, isOnline, onlineCount: onlineUserIds.size }),
    [onlineUserIds, isOnline]
  )

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}

export function usePresence() {
  return useContext(PresenceContext)
}
