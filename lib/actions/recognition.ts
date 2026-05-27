"use server"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { createNotification } from "./notifications"

const getClient = () => createAdminClient()

const getUserId = async () => {
  const supabase = createServerClient()
  const hasDevBypass = cookies().get("shrine_dev_session")?.value === "true"
  if (hasDevBypass && process.env.NODE_ENV === "development") return null
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

async function getActiveUserIds(supabase: any) {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    if (error) {
      console.error("Error listing auth users:", error)
      return new Set<string>()
    }
    return new Set((users || []).filter((u: any) => u.last_sign_in_at).map((u: any) => u.id))
  } catch (e) {
    console.error("Failed to list auth users:", e)
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

  // Verify badge exists and is active
  const { data: badge } = await supabase
    .from("recognition_badges")
    .select("id, name, active")
    .eq("id", badgeId)
    .eq("active", true)
    .single()

  if (!badge) {
    throw new Error("Badge not found or inactive")
  }

  // Check if employee already has this badge (prevent duplicates in same month)
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const { data: existingAward } = await supabase
    .from("employee_badge_awards")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("badge_id", badgeId)
    .gte("awarded_at", `${currentMonth}-01`)
    .single()

  if (existingAward) {
    throw new Error(`${employeeProfile.full_name} already has the "${badge.name}" badge for this month`)
  }

  // Create the badge award
  const { data: award, error: awardError } = await supabase
    .from("employee_badge_awards")
    .insert({
      employee_id: employeeId,
      badge_id: badgeId,
      awarded_by: managerId,
      reason: reason || null,
      awarded_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (awardError) {
    throw new Error(`Failed to award badge: ${awardError.message}`)
  }

  // Trigger point event for badge earned (if point rule exists)
  const { data: pointRule } = await supabase
    .from("gamification_point_rules")
    .select("points")
    .eq("event_type", "badge_earned")
    .eq("active", true)
    .single()

  if (pointRule) {
    await supabase.from("gamification_point_events").insert({
      employee_id: employeeId,
      event_type: "badge_earned",
      points: pointRule.points,
      description: `Earned badge: ${badge.name}${reason ? ` - ${reason}` : ""}`,
      reference_type: "badge_award",
      reference_id: award.id,
    })
  }

  await createNotification(employeeId, "Badge Earned!", `You earned the "${badge.name}" badge.`, "badge_awarded")

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

  await createNotification(employeeId, "You've Been Nominated!", `You were nominated for the "${badge.name}" badge.`, "eom_nomination")

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

  await createNotification(employeeId, "Points Deducted", `${reason} (-${Math.abs(points)} points)`, "points_deducted")

  return { success: true, deduction }
}
