"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { TopAppBar } from "@/components/layout/TopAppBar"
import Image from "next/image"
import { Trophy, Medal, Sparkles, Award, TrendingUp, Gift, Users, X, CircleAlert, Plus, UserPlus, CheckCircle } from "lucide-react"
import { getRecognitionPageData, awardBadgeToEmployee, getStaffForBadgeAwarding } from "@/lib/actions/recognition"

export default function RecognitionPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [badgeAwards, setBadgeAwards] = useState<any[]>([])
  const [pointRules, setPointRules] = useState<any[]>([])
  const [pointEvents, setPointEvents] = useState<any[]>([])
  const [eomCandidates, setEomCandidates] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  const [activeSection, setActiveSection] = useState<string>("overview")
  const [selectedBadge, setSelectedBadge] = useState<any>(null)
  const [isManager, setIsManager] = useState<boolean>(false)
  const [showAwardPanel, setShowAwardPanel] = useState<boolean>(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name, email, role")
            .eq("id", user.id)
            .single()
          setProfile(profileData)
          if (profileData?.role === "manager" || profileData?.role === "admin") {
            setIsManager(true)
          }
        }

        const data = await getRecognitionPageData()
        setLeaderboard(data.leaderboard || [])
        setBadges(data.badges || [])
        setBadgeAwards(data.badgeAwards || [])
        setPointRules(data.pointRules || [])
        setPointEvents(data.pointEvents || [])
        setEomCandidates(data.eomCandidates || [])
        setSummary(data.summary)
      } catch (err) {
        setError("Failed to load recognition data.")
        console.error("Error fetching recognition data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const tabs = [
    { id: "overview", label: "Overview", icon: Sparkles },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "badges", label: "Badges", icon: Award },
    { id: "points", label: "Points", icon: TrendingUp },
    { id: "eom", label: "EOM", icon: Users },
  ]

  if (loading) return <RecognitionSkeleton />

  return (
    <>
      <TopAppBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-10 sm:pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <h1 className="headline-sm sm:display-md">Employee Recognition</h1>
        </div>

        <section className="relative rounded-[2rem] overflow-hidden border border-[var(--outline-variant)]/30 mb-8 h-40 sm:h-48">
          <Image src="/badges/recognition_page.png" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a]/90 via-[#0a0a1a]/60 to-transparent" />
          <div className="relative h-full flex flex-col justify-center p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.05em] text-[var(--secondary-container)] mb-1">Shrine Ops</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', system-ui, sans-serif", letterSpacing: "-0.02em" }}>Employee Recognition Program</h2>
            <p className="body-md text-white/70 mt-1.5 max-w-xl">Earn badges, rack up points, and compete for Employee of the Month.</p>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl bg-[var(--error-container)]/20 border border-[var(--error)]/30 p-4 mb-6 flex items-start gap-3">
            <CircleAlert className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--on-error-container)]">{error}</p>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <StatCard label="Total Points" value={String(summary.totalPoints)} accent="#0038A8" />
            <StatCard label="Badges Earned" value={String(summary.badgeCount)} accent="#d4a017" />
            <StatCard label="Leaderboard Rank" value={String(leaderboard.find((e: any) => e.employee_id === profile?.id)?.rank || "-")} accent="#10b981" />
            <StatCard label="EOM Eligible" value={eomCandidates.find((e: any) => e.employee_id === profile?.id)?.eligible_for_employee_of_month ? "Yes" : "-"} accent="#8b5cf6" />
          </div>
        )}

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeSection === tab.id
                    ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                    : "bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeSection === "overview" && <OverviewSection leaderboard={leaderboard} badgeAwards={badgeAwards} summary={summary} />}
        {activeSection === "leaderboard" && <LeaderboardSection data={leaderboard} />}
        {activeSection === "badges" && (
          <BadgesSection 
            badges={badges} 
            badgeAwards={badgeAwards} 
            onSelectBadge={setSelectedBadge}
            isManager={isManager}
            onOpenAwardPanel={() => setShowAwardPanel(true)}
          />
        )}
        {activeSection === "points" && <PointsSection pointRules={pointRules} pointEvents={pointEvents} />}
        {activeSection === "eom" && <EOMSection data={eomCandidates} />}
      </div>
      <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      <ManagerBadgeAwardPanel 
        isOpen={showAwardPanel} 
        onClose={() => setShowAwardPanel(false)} 
        badges={badges}
        onAwardSuccess={async () => {
          // Refresh badge awards after successful award
          const data = await getRecognitionPageData()
          setBadgeAwards(data.badgeAwards || [])
        }}
      />
    </>
  )
}

function RecognitionSkeleton() {
  return (
    <>
      <TopAppBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-10 sm:pb-16 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--surface-container)]" />
          <div className="h-8 w-64 rounded-lg bg-[var(--surface-container)]" />
        </div>
        <div className="rounded-[2rem] h-40 sm:h-48 mb-8 bg-[var(--surface-container)]" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--surface-container)]" />)}
        </div>
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 w-24 rounded-full bg-[var(--surface-container)]" />)}
        </div>
        <div className="rounded-2xl h-64 bg-[var(--surface-container)]" />
      </div>
    </>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card-surface p-4 border border-[var(--outline-variant)]/30">
      <p className="text-xs font-bold uppercase tracking-[0.05em] text-[var(--on-surface-variant)] mb-1.5">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold" style={{ color: accent, fontFamily: "'Manrope', system-ui, sans-serif" }}>{value}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--surface-container)] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[var(--on-surface-variant)]" />
      </div>
      <p className="body-md">{message}</p>
    </div>
  )
}

function OverviewSection({ leaderboard, badgeAwards, summary }: { leaderboard: any[]; badgeAwards: any[]; summary: any }) {
  return (
    <div className="space-y-10">
      <section className="card-surface p-5 sm:p-6 border border-[var(--outline-variant)]/30">
        <h2 className="headline-sm mb-3">About the Program</h2>
        <div className="space-y-2 body-md leading-relaxed">
          <p>
            The Employee Recognition Program rewards staff for reliability, teamwork, safety, and going above and beyond in their duties. Earn badges and points for on-time attendance, completed walkthroughs, resolved tickets, and manager recognition.
          </p>
          <p>
            <strong>Badges</strong> are awarded by managers when you meet specific criteria — check each badge for details. Each badge contributes points toward your monthly score.
          </p>
          <p>
            At the end of each month, the employee with the highest score is awarded <strong>Employee of the Month</strong>. All scores then reset, giving everyone a fair start for the next month.
          </p>
        </div>
      </section>

      <section>
        <h2 className="headline-sm mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Current Leaderboard
        </h2>
        <LeaderboardTable data={leaderboard.slice(0, 5)} />
      </section>

      <section>
        <h2 className="headline-sm mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-[var(--primary)]" /> Recent Badge Awards
        </h2>
        <BadgeAwardsGrid data={badgeAwards.slice(0, 8)} />
      </section>

      {summary?.recentPoints?.length > 0 && (
        <section>
          <h2 className="headline-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Recent Points
          </h2>
          <RecentPointsList data={summary.recentPoints} />
        </section>
      )}
    </div>
  )
}

function LeaderboardSection({ data }: { data: any[] }) {
  return (
    <section>
      <h2 className="headline-sm mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" /> Full Leaderboard
      </h2>
      <LeaderboardTable data={data} />
    </section>
  )
}

function BadgesSection({ badges, badgeAwards, onSelectBadge, isManager, onOpenAwardPanel }: { badges: any[]; badgeAwards: any[]; onSelectBadge: (b: any) => void; isManager?: boolean; onOpenAwardPanel?: () => void }) {
  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="headline-sm flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--primary)]" /> Available Badges
          </h2>
          {isManager && onOpenAwardPanel && (
            <button
              onClick={onOpenAwardPanel}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 transition-colors shadow-lg shadow-[var(--primary)]/20"
            >
              <Plus className="w-4 h-4" />
              Award Badge
            </button>
          )}
        </div>
        <BadgesGrid data={badges} onSelect={onSelectBadge} />
      </section>
      <section>
        <h2 className="headline-sm mb-4 flex items-center gap-2">
          <Medal className="w-5 h-5 text-amber-500" /> Badge Awards
        </h2>
        <BadgeAwardsGrid data={badgeAwards} />
      </section>
    </div>
  )
}

function PointsSection({ pointRules, pointEvents }: { pointRules: any[]; pointEvents: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section>
        <h2 className="headline-sm mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-[var(--primary)]" /> Point Rules
        </h2>
        <PointRulesTable data={pointRules} />
      </section>
      <section>
        <h2 className="headline-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" /> My Point Events
        </h2>
        <PointEventsTable data={pointEvents} />
      </section>
    </div>
  )
}

function EOMSection({ data }: { data: any[] }) {
  return (
    <section>
      <h2 className="headline-sm mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-amber-500" /> Employee of the Month Candidates
      </h2>
      <EOMTable data={data} />
    </section>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-amber-400 text-lg">🥇</span>
  if (rank === 2) return <span className="text-slate-400 text-lg">🥈</span>
  if (rank === 3) return <span className="text-amber-700 text-lg">🥉</span>
  return <span className="text-sm font-bold text-[var(--on-surface-variant)] w-6 text-center">{rank}</span>
}

function LeaderboardTable({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState icon={Trophy} message="No leaderboard data yet. Start earning points!" />
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--outline-variant)]/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-container)] text-[var(--on-surface-variant)] text-xs uppercase tracking-[0.05em]">
            <th className="p-3 sm:p-4 text-left">Rank</th>
            <th className="p-3 sm:p-4 text-left">Name</th>
            <th className="p-3 sm:p-4 text-right">Net Points</th>
            <th className="p-3 sm:p-4 text-right hidden sm:table-cell">Badges</th>
            <th className="p-3 sm:p-4 text-right hidden sm:table-cell">Tasks</th>
            <th className="p-3 sm:p-4 text-right hidden md:table-cell">Walkthroughs</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry: any) => (
            <tr key={entry.employee_id || entry.rank} className="border-t border-[var(--outline-variant)]/20 hover:bg-[var(--surface-container)]/50 transition-colors">
              <td className="p-3 sm:p-4"><RankBadge rank={entry.rank} /></td>
              <td className="p-3 sm:p-4 font-medium">{entry.display_name}</td>
              <td className="p-3 sm:p-4 text-right font-bold" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
                {entry.total_points}
              </td>
              <td className="p-3 sm:p-4 text-right hidden sm:table-cell">{entry.badges_earned}</td>
              <td className="p-3 sm:p-4 text-right hidden sm:table-cell">{entry.tasks_completed}</td>
              <td className="p-3 sm:p-4 text-right hidden md:table-cell">{entry.walkthroughs_completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const badgePalette = [
  "bg-blue-500/10 border-blue-500/30 text-blue-600",
  "bg-red-500/10 border-red-500/30 text-red-600",
  "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
  "bg-purple-500/10 border-purple-500/30 text-purple-600",
  "bg-amber-500/10 border-amber-500/30 text-amber-600",
  "bg-rose-500/10 border-rose-500/30 text-rose-600",
  "bg-cyan-500/10 border-cyan-500/30 text-cyan-600",
  "bg-orange-500/10 border-orange-500/30 text-orange-600",
]

function BadgesGrid({ data, onSelect }: { data: any[]; onSelect: (badge: any) => void }) {
  if (!data?.length) return <EmptyState icon={Award} message="No badges configured yet." />
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {data.map((badge: any, i: number) => (
        <button
          key={badge.id}
          onClick={() => onSelect(badge)}
          className="card-surface p-4 border border-[var(--outline-variant)]/30 hover:shadow-lg hover:border-[var(--outline-variant)]/50 transition-all text-left w-full cursor-pointer group"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg mb-3 ${badgePalette[i % badgePalette.length]} group-hover:scale-110 transition-transform`}>
            {badge.icon_url ? <Image src={badge.icon_url} alt={badge.name} width={32} height={32} className="w-8 h-8" /> : <Award className="w-6 h-6" />}
          </div>
          <p className="font-bold text-sm">{badge.name}</p>
          <p className="text-xs text-[var(--on-surface-variant)] mt-1 line-clamp-2 leading-relaxed">{badge.description}</p>
        </button>
      ))}
    </div>
  )
}

function BadgeDetailModal({ badge, onClose }: { badge: any; onClose: () => void }) {
  if (!badge) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card-surface max-w-md w-full p-6 sm:p-8 relative shadow-2xl border border-[var(--outline-variant)]/30" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--surface-container)] transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[var(--primary)]/5 flex items-center justify-center mb-4">
            {badge.icon_url ? <Image src={badge.icon_url} alt={badge.name} width={64} height={64} className="w-16 h-16" /> : <Award className="w-10 h-10 text-[var(--primary)]" />}
          </div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>{badge.name}</h3>
          <p className="body-md mt-1.5">{badge.description}</p>
            <span className="inline-block mt-3 text-xs font-bold uppercase tracking-[0.05em] px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">{badge.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
        </div>
        <div className="rounded-2xl bg-[var(--surface-container)] p-4 sm:p-5 mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.05em] text-[var(--on-surface-variant)] mb-2">How to Earn</p>
          <p className="text-sm leading-relaxed">{badge.earning_criteria || badge.description || "Awarded by manager recognition."}</p>
        </div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.05em] text-amber-600 mb-2">Monthly Reset</p>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
            Points and badges accumulate throughout the month. At month-end, the top performer is awarded <strong>Employee of the Month</strong> and all scores reset for a fresh start.
          </p>
        </div>
      </div>
    </div>
  )
}

function BadgeAwardsGrid({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState icon={Medal} message="No badge awards yet. Managers can award badges from this page." />
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {data.map((award: any) => (
        <div key={award.id} className="card-surface p-4 border border-[var(--outline-variant)]/30 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            {award.recognition_badges?.icon_url ? (
              <Image src={award.recognition_badges.icon_url} alt="" width={24} height={24} className="w-6 h-6" />
            ) : (
              <Medal className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{award.recognition_badges?.name || "Badge"}</p>
            <p className="text-xs text-[var(--on-surface-variant)] truncate">
              {award.profiles?.full_name || award.employee_id?.slice(0, 8)}
            </p>
            {award.reason && <p className="text-xs text-[var(--on-surface-variant)] mt-1 line-clamp-2 leading-relaxed">{award.reason}</p>}
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-1.5">
              {new Date(award.awarded_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PointRulesTable({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState icon={Gift} message="No point rules configured." />
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--outline-variant)]/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-container)] text-[var(--on-surface-variant)] text-xs uppercase tracking-[0.05em]">
            <th className="p-3 sm:p-4 text-left">Action</th>
            <th className="p-3 sm:p-4 text-left hidden sm:table-cell">Description</th>
            <th className="p-3 sm:p-4 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rule: any) => (
            <tr key={rule.id} className="border-t border-[var(--outline-variant)]/20">
              <td className="p-3 sm:p-4 font-mono text-xs">{rule.event_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</td>
              <td className="p-3 sm:p-4 text-xs text-[var(--on-surface-variant)] hidden sm:table-cell">{rule.description}</td>
              <td className={`p-3 sm:p-4 text-right font-bold ${rule.points < 0 ? 'text-red-600' : 'text-emerald-600'}`} style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>{rule.points < 0 ? '' : '+'}{rule.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PointEventsTable({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState icon={TrendingUp} message="No point events yet. Complete tasks and shifts to earn points!" />
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--outline-variant)]/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-container)] text-[var(--on-surface-variant)] text-xs uppercase tracking-[0.05em]">
            <th className="p-3 sm:p-4 text-left">Action</th>
            <th className="p-3 sm:p-4 text-right">Points</th>
            <th className="p-3 sm:p-4 text-right hidden sm:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map((event: any) => (
            <tr key={event.id} className="border-t border-[var(--outline-variant)]/20">
              <td className="p-3 sm:p-4 font-mono text-xs">{event.event_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</td>
              <td className={`p-3 sm:p-4 text-right font-bold ${event.points < 0 ? 'text-red-600' : 'text-emerald-600'}`} style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>{event.points < 0 ? '' : '+'}{event.points}</td>
              <td className="p-3 sm:p-4 text-right text-xs text-[var(--on-surface-variant)] hidden sm:table-cell">
                {new Date(event.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecentPointsList({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="rounded-2xl border border-[var(--outline-variant)]/30 divide-y divide-[var(--outline-variant)]/20">
      {data.map((event: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between p-3 sm:p-4">
          <span className="text-sm font-mono text-xs">{event.event_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
          <span className={`text-sm font-bold ${event.points < 0 ? 'text-red-600' : 'text-emerald-600'}`} style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>{event.points < 0 ? '' : '+'}{event.points}</span>
        </div>
      ))}
    </div>
  )
}

function EOMTable({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState icon={Users} message="No candidates yet. Points are needed to qualify." />
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--outline-variant)]/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-container)] text-[var(--on-surface-variant)] text-xs uppercase tracking-[0.05em]">
            <th className="p-3 sm:p-4 text-left">Name</th>
            <th className="p-3 sm:p-4 text-right">Points</th>
            <th className="p-3 sm:p-4 text-right">Badges</th>
            <th className="p-3 sm:p-4 text-right">Shifts</th>
            <th className="p-3 sm:p-4 text-center">Eligible</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c: any) => (
            <tr key={c.employee_id} className="border-t border-[var(--outline-variant)]/20">
              <td className="p-3 sm:p-4 font-medium">{c.display_name}</td>
              <td className="p-3 sm:p-4 text-right">{c.total_points}</td>
              <td className="p-3 sm:p-4 text-right">{c.badges_earned}</td>
              <td className="p-3 sm:p-4 text-right">{c.shifts_completed}</td>
              <td className="p-3 sm:p-4 text-center">{c.eligible_for_employee_of_month ? "✓" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Manager Badge Award Panel Component
function ManagerBadgeAwardPanel({ 
  isOpen, 
  onClose, 
  badges, 
  onAwardSuccess 
}: { 
  isOpen: boolean
  onClose: () => void
  badges: any[]
  onAwardSuccess: () => void
}) {
  const [staff, setStaff] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [selectedBadge, setSelectedBadge] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadStaff()
    }
  }, [isOpen])

  const loadStaff = async () => {
    try {
      const staffData = await getStaffForBadgeAwarding()
      setStaff(staffData)
    } catch (err) {
      setError("Failed to load staff list")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee || !selectedBadge) {
      setError("Please select both an employee and a badge")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await awardBadgeToEmployee(selectedEmployee, selectedBadge, reason || undefined)
      setSuccess(`Successfully awarded "${result.badgeName}" to ${result.employeeName}!`)
      setSelectedEmployee("")
      setSelectedBadge("")
      setReason("")
      onAwardSuccess()
      setTimeout(() => {
        setSuccess(null)
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to award badge")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card-surface max-w-md w-full p-6 sm:p-8 relative shadow-2xl border border-[var(--outline-variant)]/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--surface-container)] transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>Award Badge</h3>
            <p className="text-sm text-[var(--on-surface-variant)]">Manually award a badge to a staff member</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[var(--error-container)]/20 border border-[var(--error)]/30 p-3 mb-4 flex items-start gap-2">
            <CircleAlert className="w-4 h-4 text-[var(--error)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--on-error-container)]">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 mb-4 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Staff Member</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--outline-variant)]/50 bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              required
            >
              <option value="">Choose an employee...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Select Badge</label>
            <select
              value={selectedBadge}
              onChange={(e) => setSelectedBadge(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--outline-variant)]/50 bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              required
            >
              <option value="">Choose a badge...</option>
              {badges.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Reason (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Exceptional customer service during busy shift"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--outline-variant)]/50 bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--outline-variant)]/50 text-sm font-medium hover:bg-[var(--surface-container)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedEmployee || !selectedBadge}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Awarding...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  Award Badge
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
