"use client"

import { TopAppBar } from "@/components/layout/TopAppBar"
import { ALERT_SOUND_LIST, type AlertSoundKey, playAlertSound } from "@/lib/audio/alert-sounds"

const CATEGORY_LABELS: Record<string, string> = {
  "app-alerts": "App Alerts",
  "manager-alerts": "Manager Alerts",
  "leaderboard-alerts": "Leaderboard & EOTM",
  "badge-alerts": "Badge & Recognition",
  "safety-alerts": "Safety & Security",
  "task-alerts": "Task Alerts",
  "walkthrough-alerts": "Walkthrough & Checklist",
  "staff-reminders": "Staff Reminders",
}

export default function AudioTestPage() {
  const categories = Array.from(new Set(ALERT_SOUND_LIST.map(s => s.category)))

  const handlePlay = (key: AlertSoundKey) => {
    playAlertSound(key)
  }

  return (
    <>
      <TopAppBar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-10 sm:pb-16">
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-[var(--primary)] text-3xl">volume_up</span>
          <h1 className="headline-sm sm:display-md">Audio Alert Tester</h1>
        </div>

        {categories.map(cat => (
          <section key={cat} className="mb-10">
            <h2 className="text-lg font-bold mb-3 text-[var(--primary)]">{CATEGORY_LABELS[cat] || cat}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {ALERT_SOUND_LIST.filter(s => s.category === cat).map(sound => (
                <button
                  key={sound.key}
                  onClick={() => handlePlay(sound.key)}
                  className="card-surface p-4 rounded-2xl border border-[var(--outline-variant)]/30 hover:border-[var(--primary)]/40 hover:shadow-md transition-all text-left cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[var(--primary)] text-xl">music_note</span>
                  </div>
                  <p className="text-sm font-bold leading-tight">{sound.label}</p>
                  <p className="text-[10px] text-[var(--on-surface-variant)] mt-1 line-clamp-2 leading-relaxed">{sound.description}</p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  )
}
