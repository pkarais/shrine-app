"use client"

import { useState } from "react"
import { Plus, Trash2, Truck, Phone, Mail, Globe, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import { Vendor, addVendor, deleteVendor, updateVendor } from "@/lib/actions/inventory"

const VENDOR_CATEGORIES = [
  "Cleaning",
  "Electrical",
  "Mechanical",
  "Landscaping",
  "IT / AV",
  "Food & Beverage",
  "Security",
  "Office",
  "General",
]

interface Props {
  initial: Vendor[]
  isManager: boolean
}

export function VendorsPanel({ initial, isManager }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", category: "General", contact_name: "", phone: "", email: "", website: "", notes: "", active: true,
  })

  const grouped = vendors.reduce<Record<string, Vendor[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = []
    acc[v.category].push(v)
    return acc
  }, {})

  function toggleCat(cat: string) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.category) return
    setSaving(true)
    setError(null)
    try {
      const created = await addVendor({
        name: form.name,
        category: form.category,
        contact_name: form.contact_name || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        notes: form.notes || undefined,
        active: form.active,
      })
      setVendors(prev => [...prev, created].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
      setForm({ name: "", category: "General", contact_name: "", phone: "", email: "", website: "", notes: "", active: true })
      setShowAdd(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, active } : v))
    try {
      await updateVendor(id, { active })
    } catch {}
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteVendor(id)
      setVendors(prev => prev.filter(v => v.id !== id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const activeCount = vendors.filter(v => v.active).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <h2 className="font-headline font-bold text-xl text-on-surface">Vendors</h2>
          <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
            {activeCount} active
          </span>
        </div>
        {isManager && (
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Vendor
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
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">New Vendor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Vendor Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., ACME Cleaning Co." required
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                {VENDOR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Contact Name</label>
              <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                placeholder="e.g., John Smith"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="e.g., (555) 123-4567" type="tel"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="contact@vendor.com" type="email"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Website</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://vendor.com" type="url"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-on-surface-variant mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Contract details, service schedule, etc."
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vendor-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="rounded" />
              <label htmlFor="vendor-active" className="text-sm text-on-surface">Active vendor</label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Add Vendor"}
            </button>
          </div>
        </form>
      )}

      {/* Grouped List */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-8">No vendors recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="bg-surface-container-low rounded-2xl overflow-hidden">
              <button onClick={() => toggleCat(cat)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container transition-colors">
                <span className="text-sm font-bold text-on-surface">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">{items.length} vendor{items.length !== 1 ? "s" : ""}</span>
                  {collapsedCats.has(cat) ? <ChevronDown className="w-4 h-4 text-on-surface-variant" /> : <ChevronUp className="w-4 h-4 text-on-surface-variant" />}
                </div>
              </button>
              {!collapsedCats.has(cat) && (
                <div className="divide-y divide-outline-variant/10">
                  {items.map(v => (
                    <div key={v.id} className={`px-4 py-3 ${!v.active ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-on-surface truncate">{v.name}</p>
                            {!v.active && (
                              <span className="text-xs text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-full shrink-0">inactive</span>
                            )}
                          </div>
                          {v.contact_name && <p className="text-xs text-on-surface-variant mt-0.5">{v.contact_name}</p>}
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {v.phone && (
                              <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Phone className="w-3 h-3" />{v.phone}
                              </a>
                            )}
                            {v.email && (
                              <a href={`mailto:${v.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Mail className="w-3 h-3" />{v.email}
                              </a>
                            )}
                            {v.website && (
                              <a href={v.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Globe className="w-3 h-3" />Website
                              </a>
                            )}
                          </div>
                          {v.notes && <p className="text-xs text-on-surface-variant mt-1 truncate">{v.notes}</p>}
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => handleToggleActive(v.id, !v.active)}
                              className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${v.active ? "text-on-surface-variant hover:bg-surface-container" : "text-primary hover:bg-primary/10"}`}>
                              {v.active ? "Deactivate" : "Activate"}
                            </button>
                            <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-400 hover:bg-red-400/10 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
