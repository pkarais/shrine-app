"use client"

import { useState } from "react"
import { Plus, Trash2, Wrench, AlertTriangle, ChevronDown, ChevronUp, CalendarClock } from "lucide-react"
import { Equipment, addEquipment, deleteEquipment, updateEquipment } from "@/lib/actions/inventory"

const EQUIPMENT_TYPES = [
  "HVAC",
  "Electrical",
  "Plumbing",
  "AV / Technology",
  "Cleaning",
  "Safety",
  "Grounds",
  "Furniture",
  "Vehicle",
  "General",
]

const CONDITIONS = ["good", "fair", "poor", "retired"] as const

const CONDITION_COLORS: Record<string, string> = {
  good: "bg-green-500/10 text-green-500",
  fair: "bg-amber-500/10 text-amber-500",
  poor: "bg-red-500/10 text-red-400",
  retired: "bg-surface-container text-on-surface-variant",
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function isMaintenanceSoon(d: string | null) {
  if (!d) return false
  const diff = new Date(d).getTime() - Date.now()
  return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000
}

function isWarrantyExpiringSoon(d: string | null) {
  if (!d) return false
  const diff = new Date(d).getTime() - Date.now()
  return diff >= 0 && diff <= 60 * 24 * 60 * 60 * 1000
}

interface Props {
  initial: Equipment[]
  isManager: boolean
}

export function EquipmentPanel({ initial, isManager }: Props) {
  const [equipment, setEquipment] = useState<Equipment[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", equipment_type: "General", model_number: "", serial_number: "",
    manufacturer: "", purchase_date: "", warranty_expiry: "",
    last_maintenance: "", next_maintenance: "", condition: "good" as Equipment["condition"],
    location: "", notes: "",
  })

  const grouped = equipment.reduce<Record<string, Equipment[]>>((acc, e) => {
    if (!acc[e.equipment_type]) acc[e.equipment_type] = []
    acc[e.equipment_type].push(e)
    return acc
  }, {})

  function toggleType(type: string) {
    setCollapsedTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.equipment_type) return
    setSaving(true)
    setError(null)
    try {
      const created = await addEquipment({
        name: form.name,
        equipment_type: form.equipment_type,
        model_number: form.model_number || undefined,
        serial_number: form.serial_number || undefined,
        manufacturer: form.manufacturer || undefined,
        purchase_date: form.purchase_date || undefined,
        warranty_expiry: form.warranty_expiry || undefined,
        last_maintenance: form.last_maintenance || undefined,
        next_maintenance: form.next_maintenance || undefined,
        condition: form.condition,
        location: form.location || undefined,
        notes: form.notes || undefined,
      })
      setEquipment(prev => [...prev, created].sort((a, b) => a.equipment_type.localeCompare(b.equipment_type) || a.name.localeCompare(b.name)))
      setForm({
        name: "", equipment_type: "General", model_number: "", serial_number: "",
        manufacturer: "", purchase_date: "", warranty_expiry: "",
        last_maintenance: "", next_maintenance: "", condition: "good",
        location: "", notes: "",
      })
      setShowAdd(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleConditionChange(id: string, condition: Equipment["condition"]) {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, condition } : e))
    try {
      await updateEquipment(id, { condition })
    } catch {}
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteEquipment(id)
      setEquipment(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const needsAttention = equipment.filter(e => e.condition === "poor" || isMaintenanceSoon(e.next_maintenance)).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          <h2 className="font-headline font-bold text-xl text-on-surface">Equipment</h2>
          {needsAttention > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {needsAttention} need{needsAttention === 1 ? "s" : ""} attention
            </span>
          )}
        </div>
        {isManager && (
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Equipment
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Add Form */}
      {showAdd && isManager && (
        <form onSubmit={handleAdd} className="bg-surface-container-high rounded-2xl p-4 space-y-3 border border-outline-variant/20">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">New Equipment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., HVAC Unit A" required
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Type *</label>
              <select value={form.equipment_type} onChange={e => setForm(f => ({ ...f, equipment_type: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Manufacturer</label>
              <input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                placeholder="e.g., Carrier"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Model Number</label>
              <input value={form.model_number} onChange={e => setForm(f => ({ ...f, model_number: e.target.value }))}
                placeholder="e.g., 24ACC636A003"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Serial Number</label>
              <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                placeholder="e.g., SN-12345678"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g., Rooftop / Room 102"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Condition *</label>
              <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value as Equipment["condition"] }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Warranty Expiry</label>
              <input type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Last Maintenance</label>
              <input type="date" value={form.last_maintenance} onChange={e => setForm(f => ({ ...f, last_maintenance: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Next Maintenance Due</label>
              <input type="date" value={form.next_maintenance} onChange={e => setForm(f => ({ ...f, next_maintenance: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-on-surface-variant mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Service history, known issues, vendor contact, etc."
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Add Equipment"}
            </button>
          </div>
        </form>
      )}

      {/* Grouped List */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-8">No equipment recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="bg-surface-container-low rounded-2xl overflow-hidden">
              <button onClick={() => toggleType(type)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container transition-colors">
                <span className="text-sm font-bold text-on-surface">{type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  {collapsedTypes.has(type) ? <ChevronDown className="w-4 h-4 text-on-surface-variant" /> : <ChevronUp className="w-4 h-4 text-on-surface-variant" />}
                </div>
              </button>
              {!collapsedTypes.has(type) && (
                <div className="divide-y divide-outline-variant/10">
                  {items.map(eq => {
                    const maintSoon = isMaintenanceSoon(eq.next_maintenance)
                    const warrantySoon = isWarrantyExpiringSoon(eq.warranty_expiry)
                    return (
                      <div key={eq.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-on-surface">{eq.name}</p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${CONDITION_COLORS[eq.condition]}`}>
                                {eq.condition}
                              </span>
                              {maintSoon && (
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                  <CalendarClock className="w-3 h-3" /> Maintenance due
                                </span>
                              )}
                              {warrantySoon && (
                                <span className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3" /> Warranty expiring
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                              {eq.manufacturer && <p className="text-xs text-on-surface-variant">{eq.manufacturer}{eq.model_number ? ` · ${eq.model_number}` : ""}</p>}
                              {eq.location && <p className="text-xs text-on-surface-variant">📍 {eq.location}</p>}
                              {eq.next_maintenance && (
                                <p className={`text-xs ${maintSoon ? "text-amber-500 font-semibold" : "text-on-surface-variant"}`}>
                                  Next maintenance: {formatDate(eq.next_maintenance)}
                                </p>
                              )}
                              {eq.warranty_expiry && (
                                <p className={`text-xs ${warrantySoon ? "text-orange-400 font-semibold" : "text-on-surface-variant"}`}>
                                  Warranty: {formatDate(eq.warranty_expiry)}
                                </p>
                              )}
                            </div>
                            {eq.notes && <p className="text-xs text-on-surface-variant mt-1 truncate">{eq.notes}</p>}
                          </div>
                          {isManager && (
                            <div className="flex items-center gap-1 shrink-0">
                              <select
                                value={eq.condition}
                                onChange={e => handleConditionChange(eq.id, e.target.value as Equipment["condition"])}
                                className="text-xs px-2 py-1 rounded-lg bg-surface-container text-on-surface outline-none"
                              >
                                {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                              </select>
                              <button onClick={() => handleDelete(eq.id)} disabled={deleting === eq.id}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-400 hover:bg-red-400/10 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
