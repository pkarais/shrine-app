"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { submitIncident } from "@/lib/actions/incidents"

const locations = [
  "Main Entrance", "Secondary Entrance", "Shrine Area", "Lobby",
  "Staircase", "Elevator", "Bathroom", "Community Room",
  "Kitchen Area", "Office Area", "Exterior / Liberty Park Entrance", "Other",
]

const incidentTypes = [
  "Suspicious Person", "Suspicious Package", "Theft", "Vandalism / Graffiti",
  "Disturbance / Disorderly Conduct", "Trespassing", "Medical Emergency",
  "Fire / Alarm Activation", "Equipment Damage", "Building Maintenance Issue",
  "Safety Hazard", "Other",
]

const actionsTaken = [
  "Verbal warning issued", "Individual escorted from property", "Area secured",
  "Suspicious item reported", "NYPD contacted", "EMS contacted",
  "Supervisor notified", "Maintenance notified", "Other",
]

const agencies = ["NYPD", "EMS", "Fire Department"]

const followUpOptions = [
  "Maintenance repair required", "Security review required",
  "Incident escalation required", "No further action required",
]

export function IncidentReport({ eventId, onClose }: { eventId?: number | null, onClose?: () => void }) {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    location: false,
    description: false,
    involved: false,
    witness: false,
    actions: false,
    authorities: false,
    evidence: false,
    followup: false,
  })
  const [fileNames, setFileNames] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; type: "image" | "video" | "document" }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [incidentDate, setIncidentDate] = useState("")
  const [incidentTime, setIncidentTime] = useState("")
  const [shift, setShift] = useState<"opening" | "midday" | "closing">("opening")
  const [location, setLocation] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [otherType, setOtherType] = useState("")
  const [description, setDescription] = useState("")
  const [involvedName, setInvolvedName] = useState("")
  const [involvedHeight, setInvolvedHeight] = useState("")
  const [involvedGender, setInvolvedGender] = useState("")
  const [involvedClothing, setInvolvedClothing] = useState("")
  const [involvedContact, setInvolvedContact] = useState("")
  const [witnessName, setWitnessName] = useState("")
  const [witnessContact, setWitnessContact] = useState("")
  const [witnessStatement, setWitnessStatement] = useState("")
  const [selectedActions, setSelectedActions] = useState<string[]>([])
  const [otherAction, setOtherAction] = useState("")
  const [authoritiesContacted, setAuthoritiesContacted] = useState(false)
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([])
  const [officerBadge, setOfficerBadge] = useState("")
  const [caseNumber, setCaseNumber] = useState("")
  const [evidencePhotos, setEvidencePhotos] = useState(false)
  const [evidenceFootage, setEvidenceFootage] = useState(false)
  const [evidenceStatements, setEvidenceStatements] = useState(false)
  const [cameraLocation, setCameraLocation] = useState("")
  const [selectedFollowUp, setSelectedFollowUp] = useState<string[]>([])
  const [followUpDetails, setFollowUpDetails] = useState("")
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("low")

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    )
  }

  const toggleAgency = (agency: string) => {
    setSelectedAgencies((prev) =>
      prev.includes(agency) ? prev.filter((a) => a !== agency) : [...prev, agency]
    )
  }

  const toggleFollowUp = (option: string) => {
    setSelectedFollowUp((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload failed")
      }

      const data = await res.json()
      const newFiles = files.map((file, i): { name: string; url: string; type: "image" | "video" | "document" } => ({
        name: file.name,
        url: data.urls[i],
        type: file.type.startsWith("image")
          ? "image"
          : file.type.startsWith("video")
          ? "video"
          : "document",
      }))
      setUploadedFiles((prev) => [...prev, ...newFiles])
    } catch (err: any) {
      setError(err.message || "Failed to upload files")
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location || !description || selectedTypes.length === 0) {
      setError("Location, incident types, and description are required.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const allTypes = otherType ? [...selectedTypes, otherType] : selectedTypes
    const allActions = otherAction ? [...selectedActions, otherAction] : selectedActions

    const incidentDateTime = incidentDate && incidentTime
      ? `${incidentDate}T${incidentTime}:00`
      : new Date().toISOString()

    const involvedDescription = [
      involvedHeight && `Height: ${involvedHeight}`,
      involvedGender && `Gender: ${involvedGender}`,
      involvedClothing && `Clothing: ${involvedClothing}`,
    ].filter(Boolean).join(", ")

    try {
      await submitIncident({
        eventId: eventId ?? null,
        incidentDate: incidentDateTime,
        shift,
        location,
        incidentTypes: allTypes,
        description,
        severity,
        involvedPersonName: involvedName || undefined,
        involvedPersonDescription: involvedDescription || undefined,
        involvedPersonContact: involvedContact || undefined,
        witnessName: witnessName || undefined,
        witnessContact: witnessContact || undefined,
        witnessStatement: witnessStatement || undefined,
        actionsTaken: allActions,
        authoritiesContacted,
        agencyContacted: selectedAgencies.length > 0 ? selectedAgencies : undefined,
        officerNameBadge: officerBadge || undefined,
        caseNumber: caseNumber || undefined,
        evidencePhotos: uploadedFiles.some((f) => f.type === "image"),
        evidenceFootage: uploadedFiles.some((f) => f.type === "video"),
        evidenceStatements: evidenceStatements,
        cameraLocation: cameraLocation || undefined,
        followUpRequired: selectedFollowUp,
        followUpDetails: followUpDetails || undefined,
        mediaUrls: uploadedFiles.map((f) => f.url),
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit incident report")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-10 h-10 mx-auto text-[var(--secondary)] mb-3" />
        <h3 className="headline-sm text-[var(--on-surface)]">Incident Reported</h3>
        <p className="body-md mt-1">Your security incident report has been submitted successfully.</p>
      </div>
    )
  }

  const SectionHeader = ({ id, title, required }: { id: string; title: string; required?: boolean }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-[var(--surface-container)] rounded-lg mb-2"
    >
      <span className="body-md font-semibold text-[var(--on-surface)]">
        {title}{required && <span className="text-[var(--error)] ml-1">*</span>}
      </span>
      {expandedSections[id] ? (
        <ChevronUp className="w-4 h-4 text-[var(--on-surface-variant)]" />
      ) : (
        <ChevronDown className="w-4 h-4 text-[var(--on-surface-variant)]" />
      )}
    </button>
  )

  return (
    <div>
      <h3 className="headline-sm flex items-center gap-2 text-[var(--on-surface)] mb-4">
        <AlertTriangle className="w-5 h-5 text-[var(--tertiary)]" />
        Security Incident Report
      </h3>

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* 1. Basic Information */}
        <SectionHeader id="basic" title="1. Basic Incident Information" required />
        {expandedSections.basic && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-1">Report Date</label>
                <input
                  type="date"
                  value={new Date().toISOString().split("T")[0]}
                  readOnly
                  className="input-surface w-full px-3 py-2 text-sm opacity-60"
                />
              </div>
              <div>
                <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-1">Incident Date</label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="input-surface w-full px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-1">Incident Time</label>
                <input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  className="input-surface w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-1">Shift</label>
                <div className="flex gap-2 mt-1">
                  {(["opening", "midday", "closing"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold capitalize transition-all ${
                        shift === s
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Location */}
        <SectionHeader id="location" title="2. Incident Location" required />
        {expandedSections.location && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3">
            <div className="grid grid-cols-2 gap-2">
              {locations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`py-2 px-3 rounded text-xs font-medium transition-all text-left ${
                    location === loc
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            {location === "Other" && (
              <input
                type="text"
                placeholder="Specify location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm mt-2"
              />
            )}
          </div>
        )}

        {/* 3. Incident Type */}
        <SectionHeader id="types" title="3. Type of Incident" required />
        {expandedSections.types && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3">
            <div className="grid grid-cols-2 gap-2">
              {incidentTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`py-2 px-3 rounded text-xs font-medium transition-all text-left ${
                    selectedTypes.includes(type)
                      ? "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)] ring-1 ring-[var(--tertiary)]"
                      : "bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {selectedTypes.includes("Other") && (
              <input
                type="text"
                placeholder="Specify incident type..."
                value={otherType}
                onChange={(e) => setOtherType(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm mt-2"
              />
            )}
          </div>
        )}

        {/* 4. Description */}
        <SectionHeader id="description" title="4. Incident Description" required />
        {expandedSections.description && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3 space-y-3">
            <div>
              <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-1">
                Severity
              </label>
              <div className="flex gap-2">
                {(["low", "medium", "high", "critical"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`flex-1 py-2 px-2 rounded text-xs font-semibold capitalize transition-all ${
                      severity === level
                        ? level === "low"
                          ? "bg-[var(--surface-container-low)] text-[var(--primary)] ring-2 ring-[var(--primary)]"
                          : level === "medium"
                          ? "bg-[var(--secondary-container)] text-[var(--secondary)]"
                          : level === "high"
                          ? "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]"
                          : "bg-red-900/40 text-red-300 ring-2 ring-red-500"
                        : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-1">
                Detailed Description
              </label>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2">
                Include: what happened, where, who was involved, how it began, actions taken
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed factual description of the incident..."
                rows={5}
                className="input-surface w-full px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
        )}

        {/* 5. Individuals Involved */}
        <SectionHeader id="involved" title="5. Individuals Involved" />
        {expandedSections.involved && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3 space-y-3">
            <input
              type="text"
              placeholder="Name (if known)"
              value={involvedName}
              onChange={(e) => setInvolvedName(e.target.value)}
              className="input-surface w-full px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Height"
                value={involvedHeight}
                onChange={(e) => setInvolvedHeight(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Gender"
                value={involvedGender}
                onChange={(e) => setInvolvedGender(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Clothing"
                value={involvedClothing}
                onChange={(e) => setInvolvedClothing(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Contact information (if provided)"
              value={involvedContact}
              onChange={(e) => setInvolvedContact(e.target.value)}
              className="input-surface w-full px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* 6. Witness Information */}
        <SectionHeader id="witness" title="6. Witness Information" />
        {expandedSections.witness && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3 space-y-3">
            <input
              type="text"
              placeholder="Witness Name"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              className="input-surface w-full px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Phone / Contact"
              value={witnessContact}
              onChange={(e) => setWitnessContact(e.target.value)}
              className="input-surface w-full px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Witness statement (if provided)"
              value={witnessStatement}
              onChange={(e) => setWitnessStatement(e.target.value)}
              rows={3}
              className="input-surface w-full px-3 py-2 text-sm resize-none"
            />
          </div>
        )}

        {/* 7. Security Actions Taken */}
        <SectionHeader id="actions" title="7. Security Actions Taken" />
        {expandedSections.actions && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3">
            <div className="grid grid-cols-2 gap-2">
              {actionsTaken.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => toggleAction(action)}
                  className={`py-2 px-3 rounded text-xs font-medium transition-all text-left ${
                    selectedActions.includes(action)
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
            {selectedActions.includes("Other") && (
              <input
                type="text"
                placeholder="Specify action..."
                value={otherAction}
                onChange={(e) => setOtherAction(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm mt-2"
              />
            )}
          </div>
        )}

        {/* 8. Law Enforcement */}
        <SectionHeader id="authorities" title="8. Law Enforcement / Emergency Services" />
        {expandedSections.authorities && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--on-surface)]">Were authorities contacted?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthoritiesContacted(true)}
                  className={`px-4 py-1.5 rounded text-xs font-semibold ${
                    authoritiesContacted ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setAuthoritiesContacted(false)}
                  className={`px-4 py-1.5 rounded text-xs font-semibold ${
                    !authoritiesContacted ? "bg-[var(--surface-container)] text-[var(--on-surface-variant)]" : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
            {authoritiesContacted && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {agencies.map((agency) => (
                    <button
                      key={agency}
                      type="button"
                      onClick={() => toggleAgency(agency)}
                      className={`py-2 px-3 rounded text-xs font-medium transition-all ${
                        selectedAgencies.includes(agency)
                          ? "bg-[var(--tertiary)] text-white"
                          : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
                      }`}
                    >
                      {agency}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Officer Name / Badge #"
                  value={officerBadge}
                  onChange={(e) => setOfficerBadge(e.target.value)}
                  className="input-surface w-full px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Case Number"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="input-surface w-full px-3 py-2 text-sm"
                />
              </>
            )}
          </div>
        )}

        {/* 9. Evidence */}
        <SectionHeader id="evidence" title="9. Evidence Collected" />
        {expandedSections.evidence && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3 space-y-3">
            <div className="space-y-2">
              {[
                { label: "Photos taken", state: evidencePhotos, setter: setEvidencePhotos },
                { label: "Security camera footage flagged", state: evidenceFootage, setter: setEvidenceFootage },
                { label: "Witness statements collected", state: evidenceStatements, setter: setEvidenceStatements },
              ].map((item) => (
                <label key={item.label} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.state}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--outline-variant)] text-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--on-surface)]">{item.label}</span>
                </label>
              ))}
            </div>
            {evidenceFootage && (
              <input
                type="text"
                placeholder="Camera location (if applicable)"
                value={cameraLocation}
                onChange={(e) => setCameraLocation(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm mt-2"
              />
            )}
            <div className="pt-2 border-t border-[var(--outline-variant)]">
              <label className="text-xs label-text text-[var(--on-surface-variant)] block mb-2">
                Attach Evidence (photos, videos, docs)
              </label>
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
                variant="gold"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full mb-3"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Evidence Files"}
              </Button>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-container)] border border-[var(--outline-variant)]"
                    >
                      {file.type === "image" && (
                        <Image
                          src={file.url}
                          alt={file.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded object-cover shrink-0"
                        />
                      )}
                      {file.type === "video" && (
                        <video
                          src={file.url}
                          className="w-12 h-12 rounded object-cover shrink-0"
                        />
                      )}
                      {file.type === "document" && (
                        <div className="w-12 h-12 rounded bg-[var(--surface-container-high)] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-[var(--on-surface-variant)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--on-surface)] truncate">{file.name}</p>
                        <p className="text-xs text-[var(--on-surface-variant)] capitalize">{file.type} uploaded</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-1 rounded hover:bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 10. Follow-Up */}
        <SectionHeader id="followup" title="10. Follow-Up Required" />
        {expandedSections.followup && (
          <div className="p-4 bg-[var(--surface-container-low)] rounded-lg mb-3 space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {followUpOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleFollowUp(option)}
                  className={`py-2 px-3 rounded text-xs font-medium transition-all text-left ${
                    selectedFollowUp.includes(option)
                      ? "bg-[var(--secondary-container)] text-[var(--secondary)] ring-1 ring-[var(--secondary)]"
                      : "bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Follow-up details..."
              value={followUpDetails}
              onChange={(e) => setFollowUpDetails(e.target.value)}
              rows={2}
              className="input-surface w-full px-3 py-2 text-sm resize-none"
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !location || !description || selectedTypes.length === 0}
          variant="danger"
          size="lg"
          className="w-full mt-4"
        >
          {isSubmitting ? "Submitting Report..." : "Submit Incident Report"}
        </Button>
        {error && <p className="text-sm text-[var(--error)] mt-2">{error}</p>}
        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full mt-4"
          >
            Cancel & Exit
          </Button>
        )}
      </form>
    </div>
  )
}
