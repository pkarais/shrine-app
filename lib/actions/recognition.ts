"use server"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { createNotification } from "./notifications"

const getClient = () => createAdminClient()

const getUserId = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

async function getActiveUserIds(supabase: any) {
  // First try the Admin Auth API (requires service role key).
  // If it fails (e.g. key not configured, anon key used instead),
  // fall back to profiles table so the leaderboard is never blank.
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    if (!error && users && users.length > 0) {
      return new Set((users as any[]).filter((u) => u.last_sign_in_at).map((u) => u.id as string))
    }
  } catch {
    // listUsers not available — fall through to profile fallback
  }

  // Fallback: return ALL profile IDs so no one is filtered out.
  // This is safe — the leaderboard view already filters to staff who
  // have earned points, so inactive users simply won't appear.
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["operations", "security", "manager", "council"])
    return new Set((profiles || []).map((p: any) => p.id as string))
  } catch {
    return new Set<string>()
  }
}

export async function getRecognitionPageData() {
  const supabase = getClient()
  const userId = await getUserId()

  const [
    leaderboardData,
    badgesData,
    badgeAwardsData,
    pointRulesData,
    periodsData,
    eomData,
  ] = await Promise.all([
    supabase.from("v_current_month_leaderboard").select("*").order("rank", { ascending: true }),
    supabase.from("recognition_badges").select("*").eq("active", true).order("name", { ascending: true }),
    supabase.from("employee_badge_awards").select("*").order("awarded_at", { ascending: false }).limit(50),
    supabase.from("gamification_point_rules").select("*").eq("active", true).order("points", { ascending: false }),
    supabase.from("leaderboard_periods").select("*").order("start_date", { ascending: false }),
    supabase.from("v_employee_of_month_candidates").select("*").order("total_points", { ascending: false }),
  ])

  const activeUserIds = await getActiveUserIds(supabase)

  const leaderboard = (leaderboardData.data || []).filter((e: any) => activeUserIds.has(e.employee_id))
  const badges = badgesData.data || []
  const badgeAwards = (badgeAwardsData.data || []).filter((a: any) => activeUserIds.has(a.employee_id))
  const pointRules = pointRulesData.data || []
  const periods = periodsData.data || []
  const eomCandidates = (eomData.data || []).filter((e: any) => activeUserIds.has(e.employee_id))

  let enrichedBadgeAwards: any[] = []
  if (badgeAwards.length > 0) {
    const badgeIds = Array.from(new Set(badgeAwards.map(a => a.badge_id).filter(Boolean)))
    const employeeIds = Array.from(new Set(badgeAwards.map(a => a.employee_id).filter(Boolean)))
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from("recognition_badges").select("*").in("id", badgeIds),
      supabase.from("profiles").select("id, full_name, email").in("id", employeeIds),
    ])
    const bm = new Map((b || []).map((x: any) => [x.id, x]))
    const pm = new Map((p || []).map((x: any) => [x.id, x]))
    enrichedBadgeAwards = badgeAwards.map(a => ({ ...a, recognition_badges: bm.get(a.badge_id) || null, profiles: pm.get(a.employee_id) || null }))
  }

  let pointEvents: any[] = []
  let summary = { totalPoints: 0, badgeCount: 0, recentPoints: [] as any[], recentBadges: [] as any[] }
  if (userId) {
    const { data: pe } = await supabase
      .from("gamification_point_events")
      .select("*")
      .eq("employee_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)
    pointEvents = pe || []
    const userBadges = enrichedBadgeAwards.filter(a => a.employee_id === userId)
    const totalPoints = pointEvents.reduce((sum: number, e: any) => sum + (e.points || 0), 0)
    summary = {
      totalPoints,
      badgeCount: userBadges.length,
      recentPoints: pointEvents.slice(0, 5),
      recentBadges: userBadges.slice(0, 5),
    }
  }

  return {
    leaderboard,
    badges,
    badgeAwards: enrichedBadgeAwards,
    pointRules,
    pointEvents,
    periods,
    eomCandidates,
    summary,
    userId,
  }
}

export async function getCurrentLeaderboard() {
  const supabase = getClient()
  const { data, error } = await supabase.from("v_current_month_leaderboard").select("*").order("rank", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getEmployeeOfMonthCandidates() {
  const supabase = getClient()
  const { data, error } = await supabase.from("v_employee_of_month_candidates").select("*").order("total_points", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getBadges() {
  const supabase = getClient()
  const { data, error } = await supabase.from("recognition_badges").select("*").eq("active", true).order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getAllBadgeAwards() {
  const supabase = getClient()
  const { data, error } = await supabase.from("employee_badge_awards").select("*").order("awarded_at", { ascending: false }).limit(50)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []
  const badgeIds = Array.from(new Set(data.map(a => a.badge_id).filter(Boolean)))
  const employeeIds = Array.from(new Set(data.map(a => a.employee_id).filter(Boolean)))
  const [{ data: badges }, { data: profiles }] = await Promise.all([
    supabase.from("recognition_badges").select("*").in("id", badgeIds),
    supabase.from("profiles").select("id, full_name, email").in("id", employeeIds),
  ])
  const badgeMap = new Map((badges || []).map(b => [b.id, b]))
  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return data.map(a => ({ ...a, recognition_badges: badgeMap.get(a.badge_id) || null, profiles: profileMap.get(a.employee_id) || null }))
}

export async function getPointRules() {
  const supabase = getClient()
  const { data, error } = await supabase.from("gamification_point_rules").select("*").eq("active", true).order("points", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getLeaderboardPeriods() {
  const supabase = getClient()
  const { data, error } = await supabase.from("leaderboard_periods").select("*").order("start_date", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getLeaderboardSnapshots(periodId?: string) {
  const supabase = getClient()
  let query = supabase.from("leaderboard_snapshots").select("*").order("rank", { ascending: true })
  if (periodId) query = query.eq("period_id", periodId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []
  const employeeIds = Array.from(new Set(data.map(s => s.employee_id).filter(Boolean)))
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", employeeIds)
  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return data.map(s => ({ ...s, profiles: profileMap.get(s.employee_id) || null }))
}

export async function getRecognitionSummary() {
  const supabase = getClient()
  const userId = await getUserId()
  if (!userId) return null
  const { data: pointEvents } = await supabase.from("gamification_point_events").select("points, event_type, created_at").eq("employee_id", userId).order("created_at", { ascending: false }).limit(5)
  const { data: badgeAwards } = await supabase.from("employee_badge_awards").select("*").eq("employee_id", userId).order("awarded_at", { ascending: false }).limit(5)
  if (badgeAwards && badgeAwards.length > 0) {
    const badgeIds = Array.from(new Set(badgeAwards.map(a => a.badge_id).filter(Boolean)))
    const { data: badges } = await supabase.from("recognition_badges").select("name, icon_url").in("id", badgeIds)
    const bm = new Map((badges || []).map((b: any) => [b.id, b]))
    badgeAwards.forEach((a: any) => a.recognition_badges = bm.get(a.badge_id) || null)
  }
  const totalPoints = (pointEvents || []).reduce((sum: number, e: any) => sum + (e.points || 0), 0)
  return { totalPoints, badgeCount: badgeAwards?.length || 0, recentPoints: pointEvents || [], recentBadges: badgeAwards || [] }
}

// Manager function: Award a badge to an employee
export async function awardBadgeToEmployee(
  employeeId: string,
  badgeId: string,
  reason?: string
) {
  const supabase = getClient()
  const managerId = await getUserId()

  if (!managerId) {
    throw new Error("Not authenticated")
  }

  // Verify manager role
  const { data: managerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", managerId)
    .single()

  if (!managerProfile || !["manager", "admin"].includes(managerProfile.role)) {
    throw new Error("Insufficient permissions. Only managers can award badges.")
  }

  // Verify employee exists and is staff
  const { data: employeeProfile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", employeeId)
    .single()

  if (!employeeProfile) {
    throw new Error("Employee not found")
  }

  if (!["operations", "security"].includes(employeeProfile.role)) {
    throw new Error("Can only award badges to operations or security staff")
  }

  // Verify badge exists (look up by ID — manager already selected it from the active list)
  const { data: badge, error: badgeError } = await supabase
    .from("recognition_badges")
    .select("*")
    .eq("id", badgeId)
    .single()

  if (badgeError || !badge) {
    throw new Error(badgeError ? `Badge lookup failed: ${badgeError.message}` : "Badge not found")
  }

  // Find the next available badge_level for this employee+badge
  // (DB has UNIQUE(employee_id, badge_id, badge_level) so we must increment)
  const { data: existingAwards } = await supabase
    .from("employee_badge_awards")
    .select("badge_level, awarded_at")
    .eq("employee_id", employeeId)
    .eq("badge_id", badgeId)
    .order("badge_level", { ascending: false })

  const currentMaxLevel = existingAwards?.[0]?.badge_level ?? 0
  const maxAllowed = badge.max_level ?? 1

  // Prevent awarding the same badge in the same calendar month at the same level
  if (existingAwards && existingAwards.length > 0) {
    const lastAward = existingAwards[0]
    const lastMonth = new Date(lastAward.awarded_at).toISOString().slice(0, 7)
    const thisMonth = new Date().toISOString().slice(0, 7)
    if (lastMonth === thisMonth) {
      throw new Error(`${employeeProfile.full_name} already received the "${badge.name}" badge this month`)
    }
  }

  if (currentMaxLevel >= maxAllowed) {
    throw new Error(`${employeeProfile.full_name} has already reached the maximum level for the "${badge.name}" badge`)
  }

  const nextLevel = currentMaxLevel + 1

  // Create the badge award at the next level
  const { data: award, error: awardError } = await supabase
    .from("employee_badge_awards")
    .insert({
      employee_id: employeeId,
      badge_id: badgeId,
      badge_level: nextLevel,
      awarded_by: managerId,
      reason: reason || null,
      awarded_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (awardError) {
    throw new Error(`Failed to award badge: ${awardError.message}`)
  }

  // Derive badge-specific event_type that matches gamification_point_rules entries
  // e.g. "Always On Time" → "badge_always_on_time"
  const badgeEventType = `badge_${badge.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`
  const pointsToAward = badge.point_value || 5

  if (pointsToAward > 0) {
    const { error: pointError } = await supabase.from("gamification_point_events").insert({
      employee_id: employeeId,
      event_type: badgeEventType,
      points: pointsToAward,
      note: `Earned badge: ${badge.name}${reason ? ` - ${reason}` : ""}`,
      source_id: award.id,
      source_table: "employee_badge_awards",
    })
    if (pointError) {
      console.error("Failed to record point event:", pointError)
      // Non-critical — badge award already succeeded
    }
  }

  // Notify the employee via createNotification so dedup (type+referenceId) works.
  // award.id is the referenceId — prevents duplicate if RecognitionMonitor also fires.
  try {
    await createNotification(
      employeeId,
      "Badge Earned!",
      `You earned the "${badge.name}" badge.`,
      "badge_awarded",
      award.id
    )
  } catch (notifErr) {
    // Notification failure is non-critical — badge award already succeeded.
    console.error("Failed to send badge notification:", notifErr)
  }

  return { success: true, award, badgeName: badge.name, employeeName: employeeProfile.full_name }
}

// Get staff members for manager badge awarding
export async function getStaffForBadgeAwarding() {
  const supabase = getClient()
  
  // Get staff_directory with profile_id - this is the SOURCE OF TRUTH for names
  const { data: staffDir, error: staffError } = await supabase
    .from("staff_directory")
    .select("name, role, status, profile_id")
    .order("name", { ascending: true })
  
  if (staffError) {
    console.error("Error fetching staff_directory:", staffError)
    return []
  }

  // Filter to active operations/security staff and deduplicate by profile_id
  const seenProfileIds = new Set<string>()
  const eligibleStaff = (staffDir || [])
    .filter((row: any) => {
      if (!row.profile_id || !row.name) return false
      if (row.status !== "active" && row.status) return false
      
      const role = (row.role || "").toLowerCase()
      if (!["operations", "security"].includes(role)) return false

      if (seenProfileIds.has(row.profile_id)) return false
      seenProfileIds.add(row.profile_id)
      return true
    })
    .map((row: any) => ({
      id: row.profile_id,        // User ID (for badge award)
      full_name: row.name,       // Name from staff_directory
      role: row.role,
    }))
    
  return eligibleStaff
}

export async function nominateEmployee(
  employeeId: string,
  badgeId: string,
  reason: string,
  nominatedBy?: string
) {
  const supabase = getClient()
  const nominatorId = nominatedBy || await getUserId()
  if (!nominatorId) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", nominatorId).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Only managers can nominate")

  const { data: badge } = await supabase.from("recognition_badges").select("name").eq("id", badgeId).single()
  if (!badge) throw new Error("Badge not found")

  const { data: nomination, error } = await supabase.from("badge_nominations").insert({
    employee_id: employeeId,
    badge_id: badgeId,
    nominated_by: nominatorId,
    reason,
    status: "pending",
  }).select().single()

  if (error) throw new Error(`Failed to create nomination: ${error.message}`)

  await createNotification(employeeId, "You've Been Nominated!", `You were nominated for the "${badge.name}" badge.`, "eom_nomination", nomination.id)

  return { success: true, nomination }
}

export async function awardEmployeeOfMonth(employeeId: string, awardedBy?: string) {
  const supabase = getClient()
  const managerId = awardedBy || await getUserId()
  if (!managerId) throw new Error("Not authenticated")

  const { data: badge } = await supabase.from("recognition_badges").select("id").eq("name", "Employee of the Month").eq("active", true).single()
  if (!badge) throw new Error("Employee of the Month badge not found. Run seed data first.")

  return await awardBadgeToEmployee(employeeId, badge.id, "Selected as Employee of the Month")
}

export async function deductEmployeePoints(
  employeeId: string,
  eventType: string,
  points: number,
  reason: string,
  notedBy?: string
) {
  const supabase = getClient()
  const managerId = notedBy || await getUserId()
  if (!managerId) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", managerId).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Only managers can deduct points")

  const { data: rule } = await supabase.from("gamification_point_rules").select("event_type, points").eq("event_type", eventType).eq("active", true).single()
  if (!rule) throw new Error(`Point rule not found for event type: ${eventType}`)
  if (rule.points >= 0) throw new Error("Use deductEmployeePoints only for deduction-type rules")

  const { data: deduction, error } = await supabase.from("point_deductions").insert({
    employee_id: employeeId,
    points: Math.abs(points),
    reason,
    event_type: eventType,
    noted_by: managerId,
    deduction_date: new Date().toISOString().split("T")[0],
  }).select().single()

  if (error) throw new Error(`Failed to deduct points: ${error.message}`)

  await createNotification(employeeId, "Points Deducted", `${reason} (-${Math.abs(points)} points)`, "points_deducted", deduction.id)

  return { success: true, deduction }
}

export async function deleteBadgeAward(awardId: string) {
  const supabase = getClient()
  const managerId = await getUserId()
  if (!managerId) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", managerId).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Only managers can delete badges")

  // Delete point events tied to this award — matches the columns used in awardBadgeToEmployee
  await supabase
    .from("gamification_point_events")
    .delete()
    .eq("source_table", "employee_badge_awards")
    .eq("source_id", awardId)

  // Then delete the award itself
  const { error } = await supabase.from("employee_badge_awards").delete().eq("id", awardId)
  if (error) throw new Error(`Failed to delete badge award: ${error.message}`)

  return { success: true }
}

export async function resetGamificationData() {
  const supabase = getClient()
  const managerId = await getUserId()
  if (!managerId) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", managerId).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Only managers can reset gamification data")

  // Delete all gamification records to wipe the canvas
  await Promise.all([
    supabase.from("employee_badge_awards").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    supabase.from("gamification_point_events").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    supabase.from("badge_nominations").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    supabase.from("point_deductions").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    supabase.from("point_redemptions").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
  ])

  return { success: true }
}
