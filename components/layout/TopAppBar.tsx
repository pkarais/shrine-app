"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence } from "framer-motion"

export function TopAppBar({ showProfile = true }: { showProfile?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [signingOut, setSigningOut] = useState(false)
  const [canAccessManager, setCanAccessManager] = useState(false)
  const [avatarInitials, setAvatarInitials] = useState("U")
  const [avatarLabel, setAvatarLabel] = useState("User")
  const [currentRole, setCurrentRole] = useState<string>("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isManagerPage = pathname?.startsWith("/manager")
  const isCouncil = pathname?.startsWith("/council")

  const navItems = [
    { href: currentRole === "council" ? "/council" : "/dashboard", label: "Dashboard" },
    { href: "/tickets", label: "Tickets" },
    ...(canAccessManager && !isManagerPage ? [{ href: "/manager", label: "Command Center" }] : []),
    { href: "/calendar", label: "Calendar" },
    { href: "/messages", label: "Chat" },
    { href: "/profile", label: "Profile" },
  ]

  const getInitials = (nameOrEmail: string) => {
    const value = String(nameOrEmail || "").trim()
    if (!value) return "U"

    if (value.includes("@")) {
      return value.charAt(0).toUpperCase()
    }

    const parts = value.split(" ").filter(Boolean)
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase()
    }
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
  }

  useEffect(() => {
    let active = true

    const resolveRole = async () => {
      const cookieRole = document.cookie
        .split("; ")
        .find((row) => row.startsWith("shrine_dev_role="))
        ?.split("=")[1]

      if (cookieRole === "manager") {
        if (active) {
          setCanAccessManager(true)
          setCurrentRole("manager")
        }
        return
      }

      if (cookieRole) {
        if (active) {
          setCanAccessManager(false)
          setCurrentRole(cookieRole)
        }
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (active) setCanAccessManager(false)
          return
        }

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (active) {
          setCanAccessManager(profile?.role === "manager")
          setCurrentRole(String(profile?.role || ""))
        }
      } catch {
        if (active) {
          setCanAccessManager(false)
          setCurrentRole("")
        }
      }
    }

    resolveRole()
    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    let active = true

    const resolveIdentity = async () => {
      const cookieRole = document.cookie
        .split("; ")
        .find((row) => row.startsWith("shrine_dev_role="))
        ?.split("=")[1]
      const cookieName = document.cookie
        .split("; ")
        .find((row) => row.startsWith("shrine_dev_name="))
        ?.split("=")[1]

      if (cookieRole && cookieName) {
        const decodedName = decodeURIComponent(cookieName)
        if (active) {
          setAvatarLabel(decodedName)
          setAvatarInitials(getInitials(decodedName))
        }
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (active) {
            setAvatarLabel("User")
            setAvatarInitials("U")
          }
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single()

        const label = profile?.full_name || profile?.email || user.email || "User"
        if (active) {
          setAvatarLabel(label)
          setAvatarInitials(getInitials(label))
        }
      } catch {
        if (active) {
          setAvatarLabel("User")
          setAvatarInitials("U")
        }
      }
    }

    resolveIdentity()
    return () => {
      active = false
    }
  }, [supabase, pathname])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } catch {
      // Continue with local cleanup even if remote sign-out fails.
    }

    document.cookie = "shrine_dev_session=; path=/; max-age=0"
    document.cookie = "shrine_dev_role=; path=/; max-age=0"
    document.cookie = "shrine_dev_name=; path=/; max-age=0"

    router.push("/login")
    router.refresh()
  }

  return (
    <header className="fixed top-1 left-0 w-full z-50 bg-surface/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">account_balance</span>
        <h1 className="font-headline text-base sm:text-lg font-bold text-primary tracking-tight">Site Management</h1>
      </div>

      <div className="flex items-center gap-4">
        <nav className="hidden md:flex gap-6 items-center px-4">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/dashboard" && isManagerPage) ||
              (item.href === "/council" && isCouncil)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary transition-colors"}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {canAccessManager || isManagerPage ? (
          <button
            onClick={() => {
              router.push("/manager")
              router.refresh()
            }}
            className="p-2 rounded-full hover:bg-surface-container transition-colors relative"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-on-surface-variant">notifications_active</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-tertiary-container" />
          </button>
        ) : null}

        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-full hover:bg-surface-container transition-colors"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-on-surface-variant">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
        >
          {signingOut ? "Signing out..." : "Sign Out"}
        </button>

        {showProfile ? (
          <div
            className="h-8 w-8 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center"
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
            className="absolute top-full left-0 right-0 mt-2 mx-3 rounded-[2rem] bg-surface-container-high shadow-2xl glass-overlay p-4 md:hidden overflow-hidden"
          >
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/dashboard" && isManagerPage) ||
                  (item.href === "/council" && isCouncil)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all ${active ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"}`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-4 w-full px-4 py-3 rounded-2xl text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}