"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { playAlertSound, type AlertSoundKey } from "@/lib/audio/alert-sounds"

interface LeaderboardEntry {
  rank: number
  employee_id: string
  total_points: number
}

function getDateKey(): string {
  // Use Eastern Time so the dedup key doesn't roll over at 8 PM ET
  // (midnight UTC) — which would cause alerts to re-fire in the evening.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function getStorageKey(userId: string): string {
  return `recognition_alerts_fired:${userId}:${getDateKey()}`
}

function loadFiredSet(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

function saveFiredSet(userId: string, set: Set<string>): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(set)))
  } catch {}
}

export function RecognitionMonitor() {
  const firedRef = useRef<Set<string> | null>(null)
  const userIdRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPollRef = useRef<string>(new Date().toISOString())
  const previousRankRef = useRef<{ rank: number; dateKey: string } | null>(null)

  function getFiredSet(): Set<string> {
    if (!firedRef.current) {
      firedRef.current = userIdRef.current ? loadFiredSet(userIdRef.current) : new Set<string>()
    }
    return firedRef.current
  }

  function markFired(id: string) {
    const key = `${id}:${getDateKey()}`
    const set = getFiredSet()
    set.add(key)
    if (userIdRef.current) saveFiredSet(userIdRef.current, set)
  }

  function hasFired(id: string): boolean {
    return getFiredSet().has(`${id}:${getDateKey()}`)
  }

  function playSound(key: AlertSoundKey) {
    try {
      playAlertSound(key)
    } catch {}
  }

  async function insertNotification(userId: string, title: string, body: string, type: string, referenceId?: string) {
    try {
      const { createNotification } = await import("@/lib/actions/notifications")
      await createNotification(userId, title, body, type, referenceId)
    } catch {}
  }

  async function check() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Seed userId so localStorage key is user-scoped (prevents cross-user duplicates)
      if (!userIdRef.current) {
        userIdRef.current = user.id
        firedRef.current = loadFiredSet(user.id)
      }

      const now = new Date().toISOString()
      const todayKey = getDateKey()

      // 1. New badge awards since last poll
      const { data: newBadges } = await supabase
        .from("employee_badge_awards")
        .select("id, badge_id, awarded_at")
        .eq("employee_id", user.id)
        .gte("awarded_at", lastPollRef.current)
        .order("awarded_at", { ascending: false })

      if (newBadges && newBadges.length > 0) {
        const badgeIds = Array.from(new Set(newBadges.map((b: any) => b.badge_id)))
        const { data: badges } = await supabase.from("recognition_badges").select("id, name").in("id", badgeIds)
        const badgeMap = new Map((badges || []).map((b: any) => [b.id, b.name]))

        for (const award of newBadges) {
          const alertId = `badge_${award.id}`
          if (hasFired(alertId)) continue
          markFired(alertId)
          playSound("badge_earned")
          const badgeName = badgeMap.get(award.badge_id) || "a badge"
          await insertNotification(user.id, "Badge Earned!", `You earned "${badgeName}"!`, "badge_awarded", award.id)
        }
      }

      // 2. New point deductions since last poll
      const { data: newDeductions } = await supabase
        .from("point_deductions")
        .select("id, points, reason, created_at")
        .eq("employee_id", user.id)
        .gte("created_at", lastPollRef.current)
        .order("created_at", { ascending: false })

      if (newDeductions && newDeductions.length > 0) {
        for (const d of newDeductions) {
          const alertId = `deduction_${d.id}`
          if (hasFired(alertId)) continue
          markFired(alertId)
          playSound("points_deducted")
          await insertNotification(user.id, "Points Deducted", d.reason || `-${d.points} points`, "points_deducted", d.id)
        }
      }

      // 3. New nominations since last poll
      const { data: newNominations } = await supabase
        .from("badge_nominations")
        .select("id, badge_id, status, created_at")
        .eq("employee_id", user.id)
        .gte("created_at", lastPollRef.current)
        .order("created_at", { ascending: false })

      if (newNominations && newNominations.length > 0) {
        const nomBadgeIds = Array.from(new Set(newNominations.map((n: any) => n.badge_id)))
        const { data: nomBadges } = await supabase.from("recognition_badges").select("id, name").in("id", nomBadgeIds)
        const nomBadgeMap = new Map((nomBadges || []).map((b: any) => [b.id, b.name]))

        for (const n of newNominations) {
          const alertId = `nomination_${n.id}`
          if (hasFired(alertId)) continue
          markFired(alertId)
          playSound("eom_nomination")
          const badgeName = nomBadgeMap.get(n.badge_id) || "a badge"
          await insertNotification(user.id, "You've Been Nominated!", `You were nominated for "${badgeName}".`, "eom_nomination", n.id)
        }
      }

      // 4. Leaderboard rank tracking for leaderboard_jump and top_five
      const { data: leaderboard } = await supabase
        .from("v_current_month_leaderboard")
        .select("rank, employee_id, total_points")
        .order("rank", { ascending: true })

      if (leaderboard && leaderboard.length > 0) {
        const myEntry = leaderboard.find((e: LeaderboardEntry) => e.employee_id === user.id)
        const myRank = myEntry?.rank ?? null
        const isTopFive = myRank !== null && myRank <= 5

        // Detect top five entry
        if (isTopFive) {
          const alertId = `top_five_${todayKey}`
          if (!hasFired(alertId)) {
            markFired(alertId)
            playSound("top_five_alert")
            await insertNotification(user.id, "Top Five Leaderboard", `You're ranked #${myRank} on the leaderboard!`, "top_five", todayKey)
          }
        }

        // Detect leaderboard jump (rank improved)
        if (myRank !== null && previousRankRef.current && previousRankRef.current.dateKey === todayKey) {
          const prevRank = previousRankRef.current.rank
          if (myRank < prevRank) {
            const alertId = `jump_${todayKey}`
            if (!hasFired(alertId)) {
              markFired(alertId)
              playSound("leaderboard_jump")
              await insertNotification(user.id, "Leaderboard Jump!", `You moved up from #${prevRank} to #${myRank}!`, "leaderboard_jump", todayKey)
            }
          }
        }

        previousRankRef.current = { rank: myRank ?? previousRankRef.current?.rank ?? 999, dateKey: todayKey }
      }

      lastPollRef.current = now
    } catch {}
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const setup = setTimeout(() => {
      check()
      intervalRef.current = setInterval(check, 30000)
    }, 5000)

    return () => {
      clearTimeout(setup)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return null
}
