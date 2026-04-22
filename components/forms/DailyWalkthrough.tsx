"use client"

import { useState, useRef } from "react"
import { ClipboardCheck, CheckCircle2, ChevronDown, ChevronUp, Upload, X, Camera, FileText, Video } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { submitWalkthrough } from "@/lib/actions/walkthroughs"

type WalkthroughType = "opening" | "closing"

interface ChecklistItem {
  id: string
  label: string
  section: string
  warning?: boolean
}

interface SectionGroup {
  id: string
  title: string
  icon: string
  items: string[]
}

const openingSections: SectionGroup[] = [
  {
    id: "exterior_approach",
    title: "Exterior Approach Inspection (Liberty Park Side)",
    icon: "🏛️",
    items: [
      "No suspicious packages or unattended bags near entrances or façade",
      "No graffiti, vandalism, or damage to marble façade or doors",
      "All exterior lighting fixtures intact",
      "Door handles, locks, and hinges show no signs of forced entry",
      "Park area observed — no sleepers, loitering, or safety concerns",
    ],
  },
  {
    id: "entry_door",
    title: "Entry Door Opening",
    icon: "🚪",
    items: [
      "Main entrance door unlocked",
      "Door relocked behind entry temporarily",
      "Security alarm system disarmed",
      "Lobby lighting activated",
    ],
  },
  {
    id: "interior_security",
    title: "Immediate Interior Security Check",
    icon: "🔍",
    items: [
      "Lobby area clear",
      "Staircase landings clear",
      "Elevator vestibule clear",
      "Public seating areas clear",
      "No unusual objects found",
      "No signs of overnight entry",
      "No water leaks detected",
      "No electrical hazards",
    ],
  },
  {
    id: "building_systems",
    title: "Building Systems Check",
    icon: "⚙️",
    items: [
      "HVAC temperature within normal range",
      "HVAC operational — no BMS alarms",
      "Lobby lighting operational",
      "Inner shrine lighting functioning",
      "DMX lighting controllers responding properly",
      "Elevator runs smoothly — no abnormal sounds",
      "Elevator doors open/close smoothly",
    ],
  },
  {
    id: "inner_shrine",
    title: "Inner Shrine Inspection",
    icon: "⛪",
    items: [
      "Floor clean",
      "Seating properly aligned",
      "Candles and devotional stands safe and organized",
      "Lighting appropriate for opening hours",
      "No damage to marble or iconography",
    ],
  },
  {
    id: "bathrooms",
    title: "Bathrooms & Facilities",
    icon: "🚿",
    items: [
      "Toilets flushing properly",
      "Sinks working",
      "Soap and paper stocked",
      "Floors clean and dry",
      "No leaks detected",
    ],
  },
  {
    id: "kitchen",
    title: "Kitchen & Staff Areas",
    icon: "🍳",
    items: [
      "Appliances off or safe",
      "No food left out overnight",
      "Trash removed",
      "Coffee station ready",
    ],
  },
  {
    id: "offices",
    title: "Offices & Community Rooms",
    icon: "🏢",
    items: [
      "Doors secure",
      "No windows left open",
      "Equipment powered down safely",
    ],
  },
  {
    id: "final_prep",
    title: "Final Opening Preparation",
    icon: "✅",
    items: [
      "Secondary entrance unlocked (if applicable)",
      "Public lighting program activated",
      "Livestream/AV equipment powered (if service day)",
      "Welcome signage or information boards placed",
    ],
  },
  {
    id: "exterior_final",
    title: "Exterior Final Check",
    icon: "🌳",
    items: [
      "Park entrance pathway clear",
      "Stairs and entry landing free of debris",
      "Exterior cameras active",
    ],
  },
]

const closingSections: SectionGroup[] = [
  {
    id: "initial_walk",
    title: "4:30 PM — Begin Closing Walk-Through",
    icon: "🔍",
    items: [
      "Offices and workspaces preparing to close",
      "Upper floors and offices walked",
      "No visitors or unauthorized persons in building",
      "Shrine floor clear of visitors",
      "Staircases clear",
      "Elevator landing areas clear",
    ],
  },
  {
    id: "shrine_area",
    title: "4:35 PM — Shrine Area Inspection",
    icon: "⛪",
    items: [
      "Seating properly arranged",
      "Candle stands safe and orderly",
      "Shrine floors clear of debris or wax hazards",
      "Lighting set to evening/security mode",
    ],
  },
  {
    id: "bathrooms",
    title: "4:40 PM — Bathrooms Inspection",
    icon: "🚿",
    items: [
      "Toilets flushed",
      "Water turned off",
      "Floors dry",
      "Trash removed if necessary",
      "Lights turned off",
    ],
  },
  {
    id: "kitchen",
    title: "4:43 PM — Kitchen & Break Area",
    icon: "🍳",
    items: [
      "Coffee machines turned off",
      "Appliances off",
      "Counters clean",
      "Refrigerator doors closed",
      "Trash secured",
    ],
  },
  {
    id: "offices",
    title: "4:45 PM — Offices & Administrative Areas",
    icon: "🏢",
    items: [
      "Computers shut down",
      "Office lights turned off",
      "Windows closed",
      "Office doors closed",
    ],
  },
  {
    id: "building_systems",
    title: "4:48 PM — Building Systems Check",
    icon: "⚙️",
    items: [
      "BMS — no alerts or alarms present",
      "HVAC operating in evening schedule",
      "Shrine lighting reduced",
      "Lobby lighting set to security level",
      "Decorative lighting programs adjusted",
    ],
  },
  {
    id: "elevator",
    title: "4:50 PM — Elevator Check",
    icon: "🛗",
    items: [
      "Elevator runs — doors opening and closing normally",
      "Elevator returned to lobby level",
    ],
  },
  {
    id: "interior_tidy",
    title: "4:52 PM — Interior Tidying",
    icon: "✨",
    items: [
      "Visible trash removed from public areas",
      "Chairs and seating straightened",
      "Marble floors inspected for spills or debris",
      "Entrance mats properly aligned",
    ],
  },
  {
    id: "secure_doors",
    title: "4:55 PM — Secure Doors & Exterior Check",
    icon: "🔒",
    items: [
      "Main entrance locked",
      "Secondary entrance locked",
      "All egress doors secured",
      "No suspicious packages near entrances",
      "No objects left against the building",
      "Entrance pathway clear",
    ],
  },
  {
    id: "security_system",
    title: "4:57 PM — Security System",
    icon: "🛡️",
    items: [
      "Cameras confirmed operational",
      "Alarm system armed",
      "Security system fully activated",
    ],
  },
]

const allOpeningItems: ChecklistItem[] = openingSections.flatMap((section) =>
  section.items.map((item) => ({
    id: `opening__${section.id}__${item.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    label: item,
    section: section.id,
  }))
)

const allClosingItems: ChecklistItem[] = closingSections.flatMap((section) =>
  section.items.map((item) => ({
    id: `closing__${section.id}__${item.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    label: item,
    section: section.id,
  }))
)

export function DailyWalkthrough({
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
      await submitWalkthrough(eventId ?? null, checks, walkthroughType, "facility", notes)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit walkthrough")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-10 h-10 mx-auto text-[var(--secondary)] mb-3" />
        <h3 className="headline-sm text-[var(--on-surface)]">
          {walkthroughType === "opening" ? "Opening" : "Closing"} Walkthrough Complete
        </h3>
        <p className="body-md mt-1">All checks passed. Building is {walkthroughType === "opening" ? "ready for visitors" : "secured for the night"}.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="headline-sm flex items-center gap-2 text-[var(--on-surface)]">
          <ClipboardCheck className="w-5 h-5 text-[var(--primary)]" />
          Facility Walkthrough
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
          Notes / Observations
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any issues, maintenance needs, or observations..."
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
          : `Submit ${walkthroughType === "opening" ? "Opening" : "Closing"} Walkthrough`}
      </Button>

      {onClose && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Cancel & Exit
          </Button>
          <div className="text-[10px] text-[var(--on-surface-variant)] leading-tight flex items-center bg-[var(--surface-container)] rounded-lg px-3">
            <p>Note: Progress is not saved unless submitted.</p>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-[var(--error)] mt-2">{error}</p>}
    </div>
  )
}
