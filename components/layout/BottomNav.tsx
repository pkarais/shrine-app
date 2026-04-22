"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { href: "/calendar", icon: "calendar_today", label: "Calendar" },
    { href: "/messages", icon: "chat_bubble", label: "Chat" },
    { href: "/profile", icon: "person", label: "Profile" },
  ]

  return (
    <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-[0px_0px_24px_rgba(25,28,29,0.06)] border-t border-slate-200/15 dark:border-slate-700/15">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center rounded-xl p-2 transition-all duration-200 active:scale-95 ${
              isActive
                ? "bg-[#0038A8] text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-[#0038A8] dark:hover:text-blue-300"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
