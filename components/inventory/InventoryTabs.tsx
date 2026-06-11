"use client"

import { useState } from "react"
import { Package, Truck, Wrench, Printer, AlertTriangle } from "lucide-react"
import { SuppliesPanel } from "./SuppliesPanel"
import { VendorsPanel } from "./VendorsPanel"
import { EquipmentPanel } from "./EquipmentPanel"
import type { Supply, Vendor, Equipment } from "@/lib/actions/inventory"

const TABS = [
  { key: "supplies",  label: "Supplies",  icon: Package },
  { key: "vendors",   label: "Vendors",   icon: Truck   },
  { key: "equipment", label: "Equipment", icon: Wrench  },
] as const

type TabKey = typeof TABS[number]["key"]

interface Props {
  supplies:         Supply[]
  vendors:          Vendor[]
  equipment:        Equipment[]
  canEditSupplies:  boolean
  canEditVendors:   boolean
  canEditEquipment: boolean
}

// ─── Print helpers ────────────────────────────────────────────────────────────

function buildPrintHtml(active: TabKey, supplies: Supply[], vendors: Vendor[], equipment: Equipment[]): string {
  const now = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
  const time = new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit", minute: "2-digit",
  })

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, Arial, sans-serif; color: #111; background: #fff; padding: 32px; }
    header { border-bottom: 3px solid #002c5e; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .org { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: #735c00; margin-bottom: 4px; }
    .title { font-size: 22px; font-weight: 900; color: #002c5e; }
    .meta { font-size: 11px; color: #555; text-align: right; line-height: 1.6; }
    h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #002c5e; margin: 20px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; page-break-inside: auto; }
    thead th { background: #002c5e; color: #fff; padding: 7px 10px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
    tbody tr { border-bottom: 1px solid #e0e0e0; }
    tbody tr:nth-child(even) { background: #f7f8fa; }
    tbody td { padding: 6px 10px; vertical-align: top; }
    .low { background: #fff8e1 !important; }
    .low td { color: #7a4f00; }
    .badge-low { display: inline-block; background: #d97706; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-left: 4px; text-transform: uppercase; }
    .badge-good { color: #155724; font-weight: 700; }
    .badge-fair { color: #856404; font-weight: 700; }
    .badge-poor { color: #721c24; font-weight: 700; }
    .badge-retired { color: #555; font-weight: 700; }
    .cat-header td { background: #e8edf5; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #002c5e; padding: 5px 10px; }
    footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px; } }
  `

  let body = ""

  if (active === "supplies") {
    const grouped: Record<string, Supply[]> = {}
    for (const s of supplies) {
      if (!grouped[s.category]) grouped[s.category] = []
      grouped[s.category].push(s)
    }
    const isLow = (s: Supply) => s.reorder_threshold > 0 && s.quantity <= s.reorder_threshold
    const lowCount = supplies.filter(isLow).length

    body = `
      <h2>Supplies Inventory</h2>
      ${lowCount > 0 ? `<p style="font-size:11px;color:#d97706;margin-bottom:8px;">⚠ ${lowCount} item${lowCount !== 1 ? "s" : ""} at or below reorder threshold</p>` : ""}
      <table>
        <thead>
          <tr>
            <th style="width:30%">Item</th>
            <th style="width:15%">Category</th>
            <th style="width:12%">Qty</th>
            <th style="width:13%">Unit</th>
            <th style="width:12%">Reorder At</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(grouped).map(([cat, items]) => `
            <tr class="cat-header"><td colspan="6">${cat}</td></tr>
            ${items.map(s => `
              <tr class="${isLow(s) ? "low" : ""}">
                <td>${s.name}${isLow(s) ? '<span class="badge-low">Low</span>' : ""}</td>
                <td>${s.category}</td>
                <td style="font-weight:700">${s.quantity}</td>
                <td>${s.unit}</td>
                <td>${s.reorder_threshold > 0 ? s.reorder_threshold : "—"}</td>
                <td style="color:#555">${s.notes ?? "—"}</td>
              </tr>
            `).join("")}
          `).join("")}
        </tbody>
      </table>
      <p style="font-size:11px;color:#555;margin-top:12px;">Total items: ${supplies.length}</p>
    `
  } else if (active === "vendors") {
    const grouped: Record<string, Vendor[]> = {}
    for (const v of vendors) {
      if (!grouped[v.category]) grouped[v.category] = []
      grouped[v.category].push(v)
    }
    body = `
      <h2>Vendor Directory</h2>
      <table>
        <thead>
          <tr>
            <th style="width:22%">Vendor</th>
            <th style="width:14%">Category</th>
            <th style="width:16%">Contact</th>
            <th style="width:16%">Phone</th>
            <th style="width:18%">Email</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(grouped).map(([cat, items]) => `
            <tr class="cat-header"><td colspan="6">${cat}</td></tr>
            ${items.map(v => `
              <tr>
                <td style="font-weight:600">${v.name}</td>
                <td>${v.category}</td>
                <td>${v.contact_name ?? "—"}</td>
                <td>${v.phone ?? "—"}</td>
                <td>${v.email ?? "—"}</td>
                <td style="font-weight:700;color:${v.active ? "#155724" : "#721c24"}">${v.active ? "Active" : "Inactive"}</td>
              </tr>
            `).join("")}
          `).join("")}
        </tbody>
      </table>
      <p style="font-size:11px;color:#555;margin-top:12px;">Total vendors: ${vendors.length} &nbsp;|&nbsp; Active: ${vendors.filter(v => v.active).length}</p>
    `
  } else {
    const grouped: Record<string, Equipment[]> = {}
    for (const e of equipment) {
      if (!grouped[e.equipment_type]) grouped[e.equipment_type] = []
      grouped[e.equipment_type].push(e)
    }
    const conditionClass = (c: string) => `badge-${c}`
    const needsMaintenance = (e: Equipment) =>
      e.next_maintenance && new Date(e.next_maintenance) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    body = `
      <h2>Equipment Register</h2>
      <table>
        <thead>
          <tr>
            <th style="width:22%">Item</th>
            <th style="width:14%">Type</th>
            <th style="width:10%">Condition</th>
            <th style="width:14%">Location</th>
            <th style="width:14%">Last Service</th>
            <th style="width:14%">Next Service</th>
            <th>Serial / Model</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(grouped).map(([type, items]) => `
            <tr class="cat-header"><td colspan="7">${type}</td></tr>
            ${items.map(e => `
              <tr class="${needsMaintenance(e) ? "low" : ""}">
                <td style="font-weight:600">${e.name}${needsMaintenance(e) ? '<span class="badge-low">Due</span>' : ""}</td>
                <td>${e.equipment_type}</td>
                <td class="${conditionClass(e.condition)}">${e.condition.charAt(0).toUpperCase() + e.condition.slice(1)}</td>
                <td>${e.location ?? "—"}</td>
                <td>${e.last_maintenance ? new Date(e.last_maintenance).toLocaleDateString("en-US") : "—"}</td>
                <td>${e.next_maintenance ? new Date(e.next_maintenance).toLocaleDateString("en-US") : "—"}</td>
                <td style="color:#555;font-size:11px">${[e.serial_number, e.model_number].filter(Boolean).join(" / ") || "—"}</td>
              </tr>
            `).join("")}
          `).join("")}
        </tbody>
      </table>
      <p style="font-size:11px;color:#555;margin-top:12px;">Total equipment: ${equipment.length}</p>
    `
  }

  const tabLabel = active === "supplies" ? "Supplies" : active === "vendors" ? "Vendors" : "Equipment"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Inventory — ${tabLabel} — Saint Nicholas Shrine</title>
  <style>${css}</style>
</head>
<body>
  <header>
    <div>
      <p class="org">Saint Nicholas National Shrine — Operations</p>
      <p class="title">Inventory Report: ${tabLabel}</p>
    </div>
    <div class="meta">
      Printed: ${now}<br />${time} ET<br />Confidential — Internal Use Only
    </div>
  </header>
  ${body}
  <footer>
    <span>Saint Nicholas National Shrine &mdash; Inventory Tracker</span>
    <span>Generated ${now} at ${time} ET</span>
  </footer>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`
}

// ─── Low-stock print helper ───────────────────────────────────────────────────

function buildLowStockPrintHtml(active: TabKey, supplies: Supply[], equipment: Equipment[]): string {
  const now = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
  const time = new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit", minute: "2-digit",
  })

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, Arial, sans-serif; color: #111; background: #fff; padding: 32px; }
    header { border-bottom: 3px solid #d97706; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .org { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: #7a4f00; margin-bottom: 4px; }
    .title { font-size: 22px; font-weight: 900; color: #7a4f00; }
    .meta { font-size: 11px; color: #555; text-align: right; line-height: 1.6; }
    h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #7a4f00; margin: 20px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; page-break-inside: auto; }
    thead th { background: #d97706; color: #fff; padding: 7px 10px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
    tbody tr { border-bottom: 1px solid #e0e0e0; }
    tbody tr:nth-child(even) { background: #fff8e1; }
    tbody td { padding: 6px 10px; vertical-align: top; }
    .cat-header td { background: #e8edf5; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #002c5e; padding: 5px 10px; }
    .badge { display: inline-block; background: #d97706; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-left: 4px; text-transform: uppercase; }
    .urgent { background: #ba1a1a !important; }
    .urgent td { color: #721c24; }
    footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px; } }
  `

  let body = ""

  if (active === "supplies") {
    const isLow = (s: Supply) => s.reorder_threshold > 0 && s.quantity <= s.reorder_threshold
    const lowItems = supplies.filter(isLow)
    const grouped: Record<string, Supply[]> = {}
    for (const s of lowItems) {
      if (!grouped[s.category]) grouped[s.category] = []
      grouped[s.category].push(s)
    }

    if (lowItems.length === 0) {
      body = `<p style="font-size:13px;color:#555;">No items are currently at or below their reorder threshold. All stock levels are healthy.</p>`
    } else {
      body = `
        <h2>Supplies Reorder List — ${lowItems.length} item${lowItems.length !== 1 ? "s" : ""} need attention</h2>
        <table>
          <thead>
            <tr>
              <th style="width:32%">Item</th>
              <th style="width:16%">Category</th>
              <th style="width:12%">Qty</th>
              <th style="width:13%">Unit</th>
              <th style="width:12%">Reorder At</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(grouped).map(([cat, items]) => `
              <tr class="cat-header"><td colspan="6">${cat}</td></tr>
              ${items.map(s => `
                <tr>
                  <td style="font-weight:700">${s.name}<span class="badge">Low</span></td>
                  <td>${s.category}</td>
                  <td style="font-weight:700;color:#ba1a1a">${s.quantity}</td>
                  <td>${s.unit}</td>
                  <td style="font-weight:700">${s.reorder_threshold}</td>
                  <td style="color:#555">${s.notes ?? "—"}</td>
                </tr>
              `).join("")}
            `).join("")}
          </tbody>
        </table>
        <p style="font-size:11px;color:#555;margin-top:12px;">Total items to reorder: ${lowItems.length}</p>
      `
    }
  } else if (active === "equipment") {
    const needsMaintenance = (e: Equipment) =>
      e.next_maintenance && new Date(e.next_maintenance) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const dueItems = equipment.filter(needsMaintenance)
    const grouped: Record<string, Equipment[]> = {}
    for (const e of dueItems) {
      if (!grouped[e.equipment_type]) grouped[e.equipment_type] = []
      grouped[e.equipment_type].push(e)
    }

    if (dueItems.length === 0) {
      body = `<p style="font-size:13px;color:#555;">No equipment is due for maintenance within the next 30 days.</p>`
    } else {
      body = `
        <h2>Equipment Maintenance Due — ${dueItems.length} item${dueItems.length !== 1 ? "s" : ""} need attention</h2>
        <table>
          <thead>
            <tr>
              <th style="width:28%">Item</th>
              <th style="width:14%">Type</th>
              <th style="width:14%">Location</th>
              <th style="width:14%">Last Service</th>
              <th style="width:14%">Next Service</th>
              <th>Serial / Model</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(grouped).map(([type, items]) => `
              <tr class="cat-header"><td colspan="6">${type}</td></tr>
              ${items.map(e => `
                <tr>
                  <td style="font-weight:700">${e.name}<span class="badge">Due</span></td>
                  <td>${e.equipment_type}</td>
                  <td>${e.location ?? "—"}</td>
                  <td>${e.last_maintenance ? new Date(e.last_maintenance).toLocaleDateString("en-US") : "—"}</td>
                  <td style="font-weight:700;color:#ba1a1a">${e.next_maintenance ? new Date(e.next_maintenance).toLocaleDateString("en-US") : "—"}</td>
                  <td style="color:#555;font-size:11px">${[e.serial_number, e.model_number].filter(Boolean).join(" / ") || "—"}</td>
                </tr>
              `).join("")}
            `).join("")}
          </tbody>
        </table>
        <p style="font-size:11px;color:#555;margin-top:12px;">Total equipment due for maintenance: ${dueItems.length}</p>
      `
    }
  }

  const tabLabel = active === "supplies" ? "Supplies" : active === "equipment" ? "Equipment" : ""
  const headerTitle = active === "supplies" ? "Reorder List" : active === "equipment" ? "Maintenance Due" : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${headerTitle} — ${tabLabel} — Saint Nicholas Shrine</title>
  <style>${css}</style>
</head>
<body>
  <header>
    <div>
      <p class="org">Saint Nicholas National Shrine — Operations</p>
      <p class="title">${headerTitle}: ${tabLabel}</p>
    </div>
    <div class="meta">
      Printed: ${now}<br />${time} ET<br />Confidential — Internal Use Only
    </div>
  </header>
  ${body}
  <footer>
    <span>Saint Nicholas National Shrine &mdash; Inventory Tracker</span>
    <span>Generated ${now} at ${time} ET</span>
  </footer>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryTabs({ supplies, vendors, equipment, canEditSupplies, canEditVendors, canEditEquipment }: Props) {
  const [active, setActive] = useState<TabKey>("supplies")

  function handlePrint() {
    const html = buildPrintHtml(active, supplies, vendors, equipment)
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site and try again.")
      return
    }
    win.document.write(html)
    win.document.close()
  }

  function handlePrintLow() {
    const html = buildLowStockPrintHtml(active, supplies, equipment)
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site and try again.")
      return
    }
    win.document.write(html)
    win.document.close()
  }

  const lowSupplyCount = supplies.filter(s => s.reorder_threshold > 0 && s.quantity <= s.reorder_threshold).length
  const dueEquipmentCount = equipment.filter(
    e => e.next_maintenance && new Date(e.next_maintenance) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  ).length
  const showLowButton = active === "supplies" && lowSupplyCount > 0
  const showDueButton = active === "equipment" && dueEquipmentCount > 0

  return (
    <div>
      {/* Tab bar + Print buttons */}
      <div className="flex gap-1 rounded-2xl bg-surface-container-low p-1 mb-6 items-center">
        <div className="flex flex-1 gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active === key
                  ? "bg-surface shadow-sm text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Low-stock / maintenance-due print button */}
        {(showLowButton || showDueButton) && (
          <button
            onClick={handlePrintLow}
            title={showLowButton ? `Print ${lowSupplyCount} low-stock items` : `Print ${dueEquipmentCount} equipment due for maintenance`}
            className="flex items-center gap-1.5 px-3 py-2 ml-1 rounded-xl text-sm font-bold bg-tertiary-container text-on-tertiary-container hover:bg-tertiary/80 transition-colors shrink-0"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">{showLowButton ? "Print Low Stock" : "Print Due Soon"}</span>
          </button>
        )}

        {/* Print button — always visible, prints current tab */}
        <button
          onClick={handlePrint}
          title={`Print ${active} inventory`}
          className="flex items-center gap-1.5 px-3 py-2 ml-1 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>

      {/* Panel */}
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
        {active === "supplies"  && <SuppliesPanel  initial={supplies}  isManager={canEditSupplies}  />}
        {active === "vendors"   && <VendorsPanel   initial={vendors}   isManager={canEditVendors}   />}
        {active === "equipment" && <EquipmentPanel initial={equipment} isManager={canEditEquipment} />}
      </div>
    </div>
  )
}
