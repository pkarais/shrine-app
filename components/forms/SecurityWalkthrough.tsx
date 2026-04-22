"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Shield, CheckCircle2, ChevronDown, ChevronUp, Upload, Camera, FileText, Video } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { submitWalkthrough } from "@/lib/actions/walkthroughs"

type WalkthroughType = "opening" | "closing"

interface ChecklistItem {
  id: string
  label: string
  section: string
}

interface SectionGroup {
  id: string
  title: string
  icon: string
  items: string[]
}

const openingSections: SectionGroup[] = [
  {
    id: "exterior_perimeter",
    title: "8:45 AM — Exterior Perimeter Inspection",
    icon: "🏛️",
    items: [
      "Entrance doors and frames show no signs of forced entry",
      "No suspicious packages, bags, or objects near the building",
      "No graffiti or vandalism on marble façade",
      "Glass doors and windows free of damage",
      "No individuals loitering directly at entrances",
      "Park pathway near entrance checked",
      "No unattended items left against the building",
    ],
  },
  {
    id: "unlock_entrance",
    title: "8:48 AM — Unlock Main Entrance",
    icon: "🚪",
    items: [
      "Entered building through main entrance",
      "Door temporarily locked behind entry",
      "Alarm system disarmed",
    ],
  },
  {
    id: "interior_sweep",
    title: "8:50 AM — Interior Security Sweep",
    icon: "🔍",
    items: [
      "Lobby area inspected — clear",
      "Shrine level inspected — clear",
      "Staircases inspected — clear",
      "Elevator landing inspected — clear",
      "Community areas inspected — clear",
      "No unauthorized persons inside the building",
      "No suspicious items or disturbances",
    ],
  },
  {
    id: "staircase_egress",
    title: "8:53 AM — Staircase & Egress Door Check",
    icon: "🚨",
    items: [
      "Egress doors secure and functioning",
      "Stairwells clear of objects",
      "No fire hazards identified",
    ],
  },
  {
    id: "elevator",
    title: "8:55 AM — Elevator Check",
    icon: "🛗",
    items: [
      "Doors open and close properly",
      "No mechanical issues detected",
      "Elevator functioning normally",
    ],
  },
  {
    id: "security_systems",
    title: "8:57 AM — Security Systems Check",
    icon: "📹",
    items: [
      "Security cameras operational",
      "Camera views unobstructed",
      "Alarm system functioning normally",
    ],
  },
]

const closingSections: SectionGroup[] = [
  {
    id: "interior_sweep",
    title: "4:30 PM — Begin Interior Security Sweep",
    icon: "🔍",
    items: [
      "Offices inspected",
      "Shrine level inspected",
      "Lobby inspected",
      "Community areas inspected",
      "Staircases inspected",
      "All employees preparing to leave",
      "No unauthorized persons present",
    ],
  },
  {
    id: "staircase_exit",
    title: "4:35 PM — Staircase & Exit Door Check",
    icon: "🚨",
    items: [
      "Egress doors secured",
      "Stairwells clear",
      "No obstructions found",
    ],
  },
  {
    id: "elevator",
    title: "4:40 PM — Elevator Inspection",
    icon: "🛗",
    items: [
      "Elevator functioning normally",
      "No passengers remaining",
      "Elevator returned to lobby level",
    ],
  },
  {
    id: "security_systems",
    title: "4:45 PM — Security Systems Check",
    icon: "📹",
    items: [
      "Cameras operational",
      "Recording active",
      "No camera obstructions",
    ],
  },
  {
    id: "interior_doors",
    title: "4:50 PM — Secure Interior Doors",
    icon: "🔒",
    items: [
      "Offices closed",
      "Interior doors secured",
    ],
  },
  {
    id: "exterior_check",
    title: "4:55 PM — Exterior Security Check",
    icon: "🌳",
    items: [
      "No suspicious packages near entrances",
      "No individuals lingering near doors",
      "Entrance pathway clear",
    ],
  },
  {
    id: "lock_building",
    title: "4:57 PM — Lock Building",
    icon: "🔐",
    items: [
      "Main entrance locked",
      "Secondary entrances locked",
      "All egress doors secured",
      "Alarm system armed",
    ],
  },
]

const allOpeningItems: ChecklistItem[] = openingSections.flatMap((section) =>
  section.items.map((item) => ({
    id: `security_opening__${section.id}__${item.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    label: item,
    section: section.id,
  }))
)

const allClosingItems: ChecklistItem[] = closingSections.flatMap((section) =>
  section.items.map((item) => ({
    id: `security_closing__${section.id}__${item.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    label: item,
    section: section.id,
  }))
)

export function SecurityWalkthrough({
  eventId,
  defaultType,
  onClose,
}: {
  eventId?: number | null
  defaultType?: WalkthroughType
  onClose?: () => void
}) {
  const [walkthroughType, setWalkthroughType] = useState<WalkthroughType>(defaultType || "opening")
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [fileNames, setFileNames] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sections = walkthroughType === "opening" ? openingSections : closingSections
  const allItems = walkthroughType === "opening" ? allOpeningItems : allClosingItems
  const draftStorageKey = useMemo(
    () => `security_walkthrough_draft:${eventId ?? "none"}:${walkthroughType}`,
    [eventId, walkthroughType],
  )

  const saveDraft = useCallback(() => {
    if (typeof window === "undefined") return
    const payload = {
      checks,
      notes,
      expandedSections,
      savedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(draftStorageKey, JSON.stringify(payload))
  }, [checks, notes, expandedSections, draftStorageKey])

  const clearDraft = () => {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(draftStorageKey)
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const existing = window.localStorage.getItem(draftStorageKey)
    if (!existing) {
      setChecks({})
      setNotes("")
      setExpandedSections({})
      return
    }

    try {
      const parsed = JSON.parse(existing)
      setChecks(parsed?.checks || {})
      setNotes(parsed?.notes || "")
      setExpandedSections(parsed?.expandedSections || {})
    } catch {
      window.localStorage.removeItem(draftStorageKey)
      setChecks({})
      setNotes("")
      setExpandedSections({})
    }
  }, [draftStorageKey])

  useEffect(() => {
    saveDraft()
  }, [saveDraft])

  useEffect(() => {
    if (!onClose) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      saveDraft()
      onClose()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, saveDraft])

  const toggle = (id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const sectionProgress = (sectionId: string) => {
    const sectionItems = allItems.filter((item) => item.section === sectionId)
    const checked = sectionItems.filter((item) => checks[item.id]).length
    return { checked, total: sectionItems.length }
  }

  const allChecked = allItems.every((item) => checks[item.id])
  const totalCompleted = allItems.filter((item) => checks[item.id]).length

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFileNames(files.map((f) => f.name))
  }

  const handleSubmit = async () => {
    if (!allChecked) return
    setIsSubmitting(true)
    setError(null)
    try {
      await submitWalkthrough(eventId ?? null, checks, walkthroughType, "security", notes)
      clearDraft()
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit security walkthrough")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-10 h-10 mx-auto text-[var(--secondary)] mb-3" />
        <h3 className="headline-sm text-[var(--on-surface)]">
          Security {walkthroughType === "opening" ? "Opening" : "Closing"} Complete
        </h3>
        <p className="body-md mt-1">
          {walkthroughType === "opening"
            ? "Building is secure and ready for employees."
            : "Building is fully secured. Alarm activated."}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="headline-sm flex items-center gap-2 text-[var(--on-surface)]">
          <Shield className="w-5 h-5 text-[var(--primary)]" />
          Security Walkthrough
        </h3>
        <span className="text-xs label-text text-[var(--on-surface-variant)]">{totalCompleted}/{allItems.length}</span>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setWalkthroughType("opening")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
            walkthroughType === "opening"
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
          }`}
        >
          Opening
        </button>
        <button
          onClick={() => setWalkthroughType("closing")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
            walkthroughType === "closing"
              ? "bg-[var(--secondary)] text-white"
              : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
          }`}
        >
          Closing
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {sections.map((section) => {
          const progress = sectionProgress(section.id)
          const isExpanded = expandedSections[section.id]
          const isComplete = progress.checked === progress.total

          return (
            <div
              key={section.id}
              className={`rounded-lg border transition-all ${
                isComplete
                  ? "border-[var(--primary)] bg-[var(--primary-container)]"
                  : "border-[var(--outline-variant)] bg-[var(--surface-container)]"
              }`}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{section.icon}</span>
                  <div>
                    <span className="body-md font-medium text-[var(--on-surface)]">{section.title}</span>
                    <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">
                      {progress.checked}/{progress.total} checks
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[var(--on-surface-variant)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--on-surface-variant)]" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-1">
                  {allItems
                    .filter((item) => item.section === section.id)
                    .map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--surface-container-high)] cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={!!checks[item.id]}
                          onChange={() => toggle(item.id)}
                          className="w-4 h-4 mt-0.5 rounded border-[var(--outline-variant)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span className="body-sm text-[var(--on-surface)]">{item.label}</span>
                      </label>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mb-4">
        <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-2">
          Security Notes / Observations
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Security concerns, suspicious activity, maintenance needs..."
          rows={3}
          className="input-surface w-full px-4 py-3 text-sm resize-none"
        />
      </div>

      <div className="mb-6">
        <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-2">
          Attachments (photos, docs, videos)
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Files
          </Button>
          {fileNames.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {fileNames.map((name, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] px-2 py-1 rounded"
                >
                  {name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx") ? (
                    <FileText className="w-3 h-3" />
                  ) : name.endsWith(".mp4") || name.endsWith(".mov") ? (
                    <Video className="w-3 h-3" />
                  ) : (
                    <Camera className="w-3 h-3" />
                  )}
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!allChecked || isSubmitting}
        variant={walkthroughType === "opening" ? "gold" : "primary"}
        size="lg"
        className="w-full"
      >
        {isSubmitting
          ? "Submitting..."
          : `Submit Security ${walkthroughType === "opening" ? "Opening" : "Closing"}`}
      </Button>

      {onClose ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              saveDraft()
              onClose()
            }}
          >
            Save & Exit
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              clearDraft()
              onClose()
            }}
          >
            Exit Without Saving
          </Button>
        </div>
      ) : null}
      {error && <p className="text-sm text-[var(--error)] mt-2">{error}</p>}
    </div>
  )
}
