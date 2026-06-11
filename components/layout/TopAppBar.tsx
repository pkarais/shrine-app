"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { NotificationBell } from "./NotificationBell"
import Image from "next/image"

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  manager: { label: "Manager", color: "bg-amber-600" },
  operations: { label: "Staff", color: "bg-blue-600" },
  security: { label: "Security", color: "bg-slate-600" },
  council: { label: "Council", color: "bg-purple-600" },
}

type NavGroup = "all" | "manager" | "staff" | "operations" | "council" | "general"

type NavItem = { href: string; label: string; groups: NavGroup[] }

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", groups: ["all"] },
  { href: "/tickets", label: "Tickets", groups: ["staff", "operations", "manager"] },
  { href: "/sops", label: "SOPs", groups: ["staff", "operations", "manager"] },
  { href: "/recognition", label: "Recognition", groups: ["staff", "operations", "manager"] },
  { href: "/manager", label: "Command Center", groups: ["manager"] },
  { href: "/manager/payroll", label: "Payroll", groups: ["manager"] },
  { href: "/manager/my-hours", label: "My Hours", groups: ["manager"] },
  { href: "/inventory", label: "Inventory", groups: ["manager", "operations"] },
  { href: "/operations-brief", label: "Monthly Brief", groups: ["manager"] },
  { href: "/daily-brief", label: "Daily Brief", groups: ["manager"] },
  { href: "/calendar", label: "Calendar", groups: ["all", "council"] },
  { href: "/messages", label: "Chat", groups: ["all", "council"] },
  { href: "/settings", label: "Settings", groups: ["staff", "operations", "manager"] },
  { href: "/profile", label: "Account", groups: ["all", "council"] },
]

function getNavGroup(role: string): NavGroup {
  if (role === "manager") return "manager"
  if (role === "council") return "council"
  if (role === "operations") return "operations"
  if (role === "security") return "staff"
  return "general"
}

export function TopAppBar({ showProfile = true }: { showProfile?: boolean }) {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [signingOut, setSigningOut] = useState(false)
  const [currentRole, setCurrentRole] = useState<string>("")
  const [avatarInitials, setAvatarInitials] = useState("U")
  const [avatarLabel, setAvatarLabel] = useState("User")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navGroup = getNavGroup(currentRole)
  const badge = ROLE_BADGES[currentRole]

  const isManagerPage = pathname?.startsWith("/manager")
  const isCouncil = pathname?.startsWith("/council")

  const navigate = (href: string) => {
    setMobileMenuOpen(false)
    window.location.href = href
  }

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.groups.includes(navGroup) || item.groups.includes("all")
  )

  const getInitials = (nameOrEmail: string) => {
    const value = String(nameOrEmail || "").trim()
    if (!value) return "U"
    if (value.includes("@")) return value.charAt(0).toUpperCase()
    const parts = value.split(" ").filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("")
  }

  useEffect(() => {
    let active = true
    const resolve = async () => {
      const cookieRole = document.cookie.split("; ").find((row) => row.startsWith("shrine_dev_role="))?.split("=")[1]
      const cookieName = document.cookie.split("; ").find((row) => row.startsWith("shrine_dev_name="))?.split("=")[1]

      if (cookieRole) {
        if (active) {
          setCurrentRole(cookieRole)
          if (cookieName) {
            const decoded = decodeURIComponent(cookieName)
            setAvatarLabel(decoded)
            setAvatarInitials(getInitials(decoded))
          }
        }
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        if (active) { setAvatarLabel("User"); setAvatarInitials("U") }
        return
      }

      const { data: profile } = await supabase.from("profiles").select("role, full_name, email").eq("id", session.user.id).single()
      if (active) {
        setCurrentRole(profile?.role || "")
        const label = profile?.full_name || profile?.email || session.user.email || "User"
        setAvatarLabel(label)
        setAvatarInitials(getInitials(label))
      }
    }
    resolve()
    return () => { active = false }
  }, [supabase])

  const handleSignOut = async () => {
    setSigningOut(true)
    try { await supabase.auth.signOut() } catch { }
    document.cookie = "shrine_dev_session=; path=/; max-age=0"
    document.cookie = "shrine_dev_role=; path=/; max-age=0"
    document.cookie = "shrine_dev_name=; path=/; max-age=0"
    window.location.href = "/login"
  }

  return (
    <header className="fixed top-0 left-0 w-full z-[50] bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center border-b border-[var(--outline-variant)]/20 dark:border-slate-700/30">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 focus:outline-none">
          <Image
            src="/images/logo-color.jpg"
            alt="Saint Nicholas Shrine logo"
            width={120}
            height={44}
            className="h-9 w-auto dark:hidden object-contain"
            priority
          />
          <Image
            src="/images/logo-white.png"
            alt="Saint Nicholas Shrine logo"
            width={120}
            height={44}
            className="h-9 w-auto hidden dark:block object-contain"
            priority
          />
        </button>
        <div>
          {badge && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${badge.color}`} />
              <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--on-surface-variant)] dark:text-white/60">{badge.label}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <nav className="hidden md:flex gap-6 items-center px-4">
          {visibleNavItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/council" && isCouncil) ||
              (item.href === "/manager" && isManagerPage)
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`text-sm font-bold transition-colors cursor-pointer ${
                  active
                    ? "text-primary dark:text-[#d4a017]"
                    : "text-[var(--on-surface-variant)] dark:text-white/60 hover:text-primary dark:hover:text-[#d4a017]"
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <NotificationBell />

        {/* Theme Toggle */}
        <ThemeToggle />

        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-full hover:bg-[var(--surface-container)] dark:hover:bg-slate-700/50 transition-colors"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[var(--on-surface-variant)] dark:text-white/60">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-primary dark:text-[#d4a017] hover:bg-[var(--surface-container)] dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
        >
          {signingOut ? "Signing out..." : "Sign Out"}
        </button>

        {showProfile ? (
          <div
            className="h-8 w-8 rounded-full bg-primary-container dark:bg-secondary-container text-on-primary-container dark:text-on-secondary-container text-xs font-bold flex items-center justify-center"
            title={avatarLabel}
            aria-label={`Current user ${avatarLabel}`}
          >
            {avatarInitials}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full left-0 right-0 mt-2 mx-3 rounded-[2rem] bg-[var(--surface-container-high)] dark:bg-slate-800/95 shadow-2xl glass-overlay p-4 md:hidden overflow-hidden"
          >
            <nav className="flex flex-col gap-2">
              {visibleNavItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/council" && isCouncil) ||
                  (item.href === "/manager" && isManagerPage)
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left ${
                      active ? "bg-primary dark:bg-[#d4a017] text-white" : "text-[var(--on-surface-variant)] dark:text-white/60 hover:bg-[var(--surface-container)]"
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-4 w-full px-4 py-3 rounded-2xl text-sm font-bold text-primary dark:text-[#d4a017] bg-primary/10 dark:bg-[#d4a017]/10 hover:bg-primary/20 transition-all disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
