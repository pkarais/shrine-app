"use client"

import { useState } from "react"
import { X, Printer, AlertTriangle, MapPin, Clock, User, Shield, Camera, ChevronRight, Trash2 } from "lucide-react"
import { deleteIncident } from "@/lib/actions/incidents"

interface Incident {
  id: string
  created_at: string
  incident_date?: string | null
  shift?: string | null
  location?: string | null
  incident_types?: string[] | null
  description?: string | null
  severity?: string | null
  involved_person_name?: string | null
  involved_person_description?: string | null
  involved_person_contact?: string | null
  witness_name?: string | null
  witness_contact?: string | null
  witness_statement?: string | null
  actions_taken?: string[] | null
  authorities_contacted?: boolean | null
  agency_contacted?: string[] | null
  officer_name_badge?: string | null
  case_number?: string | null
  evidence_photos?: boolean | null
  evidence_footage?: boolean | null
  evidence_statements?: boolean | null
  camera_location?: string | null
  follow_up_required?: string[] | null
  follow_up_details?: string | null
  media_urls?: string[] | null
  events?: { title: string } | null
  user_id?: string | null
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityBadge(s: string | null | undefined) {
  switch (s) {
    case "critical": return "bg-tertiary-container text-on-tertiary-container"
    case "high":     return "bg-error-container text-on-error-container"
    case "medium":   return "bg-secondary-container text-on-secondary-container"
    default:         return "bg-surface-container-high text-on-surface-variant"
  }
}

// ─── Print generator ──────────────────────────────────────────────────────────

function printIncident(incident: Incident) {
  const fmt = (v: string | null | undefined) => v || "—"
  const fmtBool = (v: boolean | null | undefined) => v ? "Yes" : "No"
  const fmtList = (v: string[] | null | undefined) => v?.length ? v.join(", ") : "—"
  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })
  }
  const printedAt = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }) + " at " + new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York", hour: "2-digit", minute: "2-digit",
  }) + " ET"

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Incident Report — ${incident.id.slice(0,8).toUpperCase()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui,-apple-system,Arial,sans-serif; color: #111; background:#fff; padding:32px; font-size:13px; }
    header { border-bottom:3px solid #8d0201; padding-bottom:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-end; }
    .org { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#735c00; margin-bottom:4px; }
    .title { font-size:20px; font-weight:900; color:#8d0201; }
    .ref { font-size:11px; color:#555; text-align:right; line-height:1.7; }
    .severity { display:inline-block; padding:2px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-left:8px; }
    .sev-critical { background:#8d0201; color:#fff; }
    .sev-high     { background:#ba1a1a; color:#fff; }
    .sev-medium   { background:#735c00; color:#fff; }
    .sev-low      { background:#444; color:#fff; }
    section { margin-bottom:20px; }
    h2 { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#002c5e; border-bottom:1px solid #c0c8d8; padding-bottom:4px; margin-bottom:10px; }
    .row { display:flex; gap:24px; margin-bottom:6px; }
    .field { flex:1; }
    .label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#555; margin-bottom:2px; }
    .value { font-size:13px; color:#111; }
    .desc { background:#f7f8fa; border-left:3px solid #002c5e; padding:10px 14px; border-radius:0 8px 8px 0; font-size:13px; line-height:1.6; white-space:pre-wrap; }
    .yes { color:#155724; font-weight:700; }
    .no  { color:#555; }
    footer { margin-top:32px; border-top:1px solid #ccc; padding-top:10px; font-size:10px; color:#888; display:flex; justify-content:space-between; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <header>
    <div>
      <p class="org">Saint Nicholas National Shrine — Security &amp; Operations</p>
      <p class="title">Incident Report
        <span class="severity sev-${incident.severity || "low"}">${(incident.severity || "low").toUpperCase()}</span>
      </p>
    </div>
    <div class="ref">
      Report ID: ${incident.id.slice(0,8).toUpperCase()}<br/>
      Submitted: ${fmtDate(incident.created_at)}<br/>
      Printed: ${printedAt}<br/>
      CONFIDENTIAL — INTERNAL USE ONLY
    </div>
  </header>

  <section>
    <h2>Basic Information</h2>
    <div class="row">
      <div class="field"><p class="label">Incident Date</p><p class="value">${fmtDate(incident.incident_date)}</p></div>
      <div class="field"><p class="label">Shift</p><p class="value">${fmt(incident.shift)}</p></div>
      <div class="field"><p class="label">Location</p><p class="value">${fmt(incident.location)}</p></div>
    </div>
    <div class="row">
      <div class="field"><p class="label">Incident Type(s)</p><p class="value">${fmtList(incident.incident_types)}</p></div>
      <div class="field"><p class="label">Related Event</p><p class="value">${incident.events?.title || "—"}</p></div>
    </div>
  </section>

  <section>
    <h2>Description</h2>
    <div class="desc">${incident.description || "No description provided."}</div>
  </section>

  ${(incident.involved_person_name || incident.involved_person_description || incident.involved_person_contact) ? `
  <section>
    <h2>Involved Person</h2>
    <div class="row">
      <div class="field"><p class="label">Name / ID</p><p class="value">${fmt(incident.involved_person_name)}</p></div>
      <div class="field"><p class="label">Contact</p><p class="value">${fmt(incident.involved_person_contact)}</p></div>
    </div>
    ${incident.involved_person_description ? `<div class="field"><p class="label">Description</p><p class="value">${incident.involved_person_description}</p></div>` : ""}
  </section>` : ""}

  ${(incident.witness_name || incident.witness_contact || incident.witness_statement) ? `
  <section>
    <h2>Witness</h2>
    <div class="row">
      <div class="field"><p class="label">Name</p><p class="value">${fmt(incident.witness_name)}</p></div>
      <div class="field"><p class="label">Contact</p><p class="value">${fmt(incident.witness_contact)}</p></div>
    </div>
    ${incident.witness_statement ? `<div class="field" style="margin-top:6px"><p class="label">Statement</p><div class="desc">${incident.witness_statement}</div></div>` : ""}
  </section>` : ""}

  <section>
    <h2>Actions Taken</h2>
    <p class="value">${fmtList(incident.actions_taken)}</p>
  </section>

  <section>
    <h2>Authorities &amp; Evidence</h2>
    <div class="row">
      <div class="field"><p class="label">Authorities Contacted</p><p class="value ${incident.authorities_contacted ? "yes" : "no"}">${fmtBool(incident.authorities_contacted)}</p></div>
      <div class="field"><p class="label">Agency</p><p class="value">${fmtList(incident.agency_contacted)}</p></div>
      <div class="field"><p class="label">Officer / Badge</p><p class="value">${fmt(incident.officer_name_badge)}</p></div>
      <div class="field"><p class="label">Case #</p><p class="value">${fmt(incident.case_number)}</p></div>
    </div>
    <div class="row" style="margin-top:8px">
      <div class="field"><p class="label">Photos</p><p class="value ${incident.evidence_photos ? "yes" : "no"}">${fmtBool(incident.evidence_photos)}</p></div>
      <div class="field"><p class="label">Footage</p><p class="value ${incident.evidence_footage ? "yes" : "no"}">${fmtBool(incident.evidence_footage)}</p></div>
      <div class="field"><p class="label">Statements</p><p class="value ${incident.evidence_statements ? "yes" : "no"}">${fmtBool(incident.evidence_statements)}</p></div>
      <div class="field"><p class="label">Camera Location</p><p class="value">${fmt(incident.camera_location)}</p></div>
    </div>
  </section>

  <section>
    <h2>Follow-Up</h2>
    <div class="row">
      <div class="field"><p class="label">Required Actions</p><p class="value">${fmtList(incident.follow_up_required)}</p></div>
    </div>
    ${incident.follow_up_details ? `<div class="field" style="margin-top:6px"><p class="label">Details</p><div class="desc">${incident.follow_up_details}</div></div>` : ""}
  </section>

  <footer>
    <span>Saint Nicholas National Shrine — Incident Report #${incident.id.slice(0,8).toUpperCase()}</span>
    <span>Printed ${printedAt}</span>
  </footer>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site and try again.")
    return
  }
  win.document.write(html)
  win.document.close()
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function IncidentModal({ incident, onClose, onDeleted }: { incident: Incident; onClose: () => void; onDeleted: () => void }) {
  const fmt  = (v: string | null | undefined) => v || "—"
  const fmtBool = (v: boolean | null | undefined) => v ? "Yes" : "No"
  const fmtList = (v: string[] | null | undefined) => v?.length ? v.join(", ") : "—"
  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    })
  }

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteIncident(incident.id)
      onDeleted()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete incident")
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl bg-surface-container-lowest dark:bg-surface-container rounded-2xl shadow-2xl my-8 relative">

        {/* Delete confirmation overlay */}
        {confirming && (
          <div className="absolute inset-0 z-10 bg-surface-container-lowest/95 dark:bg-surface-container/95 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-error mb-3" />
            <h3 className="text-lg font-bold text-on-surface mb-1">Delete this incident report?</h3>
            <p className="text-sm text-on-surface-variant mb-6 max-w-sm">
              This action is permanent and cannot be undone. The report <strong>#{incident.id.slice(0, 8).toUpperCase()}</strong> will be removed from the database.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-error text-on-error font-medium hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/20">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Incident Report #{incident.id.slice(0, 8).toUpperCase()}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-on-surface">
                {fmtList(incident.incident_types)}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${severityBadge(incident.severity)}`}>
                {incident.severity || "unknown"}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              {fmtDate(incident.incident_date || incident.created_at)}
              {incident.shift ? ` · ${incident.shift} shift` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={() => printIncident(incident)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors text-sm font-medium"
              title="Print this report"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-error hover:bg-error-container transition-colors text-sm font-medium"
              title="Delete this report"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm">

          {/* Location + Event */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Location</p>
                <p className="text-on-surface font-medium">{fmt(incident.location)}</p>
              </div>
            </div>
            {incident.events?.title && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Event</p>
                  <p className="text-on-surface font-medium">{incident.events.title}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Description</p>
            <div className="bg-surface-container rounded-xl p-4 text-on-surface leading-relaxed whitespace-pre-wrap border-l-4 border-primary">
              {incident.description || "No description provided."}
            </div>
          </div>

          {/* Involved Person */}
          {(incident.involved_person_name || incident.involved_person_description || incident.involved_person_contact) && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-on-surface-variant" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Involved Person</p>
              </div>
              <div className="bg-surface-container rounded-xl p-4 space-y-1.5">
                {incident.involved_person_name && <p><span className="font-semibold">Name:</span> {incident.involved_person_name}</p>}
                {incident.involved_person_description && <p><span className="font-semibold">Description:</span> {incident.involved_person_description}</p>}
                {incident.involved_person_contact && <p><span className="font-semibold">Contact:</span> {incident.involved_person_contact}</p>}
              </div>
            </div>
          )}

          {/* Witness */}
          {(incident.witness_name || incident.witness_contact || incident.witness_statement) && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-on-surface-variant" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Witness</p>
              </div>
              <div className="bg-surface-container rounded-xl p-4 space-y-1.5">
                {incident.witness_name && <p><span className="font-semibold">Name:</span> {incident.witness_name}</p>}
                {incident.witness_contact && <p><span className="font-semibold">Contact:</span> {incident.witness_contact}</p>}
                {incident.witness_statement && <p><span className="font-semibold">Statement:</span> {incident.witness_statement}</p>}
              </div>
            </div>
          )}

          {/* Actions + Authorities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Actions Taken</p>
              <p className="text-on-surface">{fmtList(incident.actions_taken)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-on-surface-variant" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Authorities</p>
              </div>
              {incident.authorities_contacted ? (
                <div className="space-y-0.5">
                  <p><span className="font-semibold">Agency:</span> {fmtList(incident.agency_contacted)}</p>
                  {incident.officer_name_badge && <p><span className="font-semibold">Officer:</span> {incident.officer_name_badge}</p>}
                  {incident.case_number && <p><span className="font-semibold">Case #:</span> {incident.case_number}</p>}
                </div>
              ) : (
                <p className="text-on-surface-variant">None contacted</p>
              )}
            </div>
          </div>

          {/* Evidence */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Camera className="w-3.5 h-3.5 text-on-surface-variant" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Evidence</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Photos", val: incident.evidence_photos },
                { label: "Footage", val: incident.evidence_footage },
                { label: "Statements", val: incident.evidence_statements },
              ].map(({ label, val }) => (
                <span key={label} className={`px-3 py-1 rounded-full text-xs font-medium ${val ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                  {label}: {fmtBool(val)}
                </span>
              ))}
              {incident.camera_location && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">
                  Camera: {incident.camera_location}
                </span>
              )}
            </div>
          </div>

          {/* Follow-up */}
          {(incident.follow_up_required?.length || incident.follow_up_details) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Follow-Up Required</p>
              <p className="text-on-surface mb-1">{fmtList(incident.follow_up_required)}</p>
              {incident.follow_up_details && (
                <p className="text-on-surface-variant text-xs">{incident.follow_up_details}</p>
              )}
            </div>
          )}

          {/* Media */}
          {incident.media_urls && incident.media_urls.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Attached Media</p>
              <div className="flex flex-wrap gap-2">
                {incident.media_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary underline hover:text-primary/80">
                    Attachment {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────

export function IncidentReportViewer({ incidents: initialIncidents }: { incidents: Incident[] }) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents)
  const [selected, setSelected] = useState<Incident | null>(null)

  if (incidents.length === 0) {
    return <p className="text-sm text-on-surface-variant">No incident reports on file.</p>
  }

  return (
    <>
      <div className="space-y-3">
        {incidents.map((incident) => (
          <button
            key={incident.id}
            onClick={() => setSelected(incident)}
            className="w-full text-left bg-surface-container rounded-xl p-5 space-y-2 hover:bg-surface-container-high active:opacity-80 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${severityBadge(incident.severity)}`}>
                  {incident.severity || "unknown"}
                </span>
                {incident.incident_types?.slice(0, 2).map((t) => (
                  <span key={t} className="text-[10px] text-on-surface-variant font-medium">
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-on-surface-variant">
                  {new Date(incident.incident_date || incident.created_at).toLocaleDateString("en-US", {
                    timeZone: "America/New_York", month: "short", day: "numeric",
                  })}
                </span>
                <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
            </div>

            <p className="text-sm font-semibold text-on-surface line-clamp-2">
              {incident.description || "No description."}
            </p>

            <div className="flex gap-3 text-xs text-on-surface-variant flex-wrap">
              {incident.location && <span>📍 {incident.location}</span>}
              {incident.shift && <span>🕐 {incident.shift} shift</span>}
              {incident.events?.title && <span>📅 {incident.events.title}</span>}
            </div>

            <p className="text-[11px] text-primary font-medium">Tap to view full report &amp; print →</p>
          </button>
        ))}
      </div>

      {selected && (
        <IncidentModal
          incident={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => setIncidents((prev) => prev.filter((i) => i.id !== selected.id))}
        />
      )}
    </>
  )
}
