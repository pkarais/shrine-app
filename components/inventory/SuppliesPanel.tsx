"use client"

import { useState } from "react"
import { Plus, Trash2, AlertTriangle, Package, ChevronDown, ChevronUp } from "lucide-react"
import { Supply, addSupply, updateSupply, deleteSupply } from "@/lib/actions/inventory"

const SUPPLY_CATEGORIES = [
  "Cleaning",
  "Electrical",
  "Mechanical",
  "Office",
  "Safety",
  "Grounds",
  "General",
]

const UNITS = ["units", "boxes", "rolls", "gallons", "liters", "lbs", "kg", "bags", "bottles", "cases"]

interface Props {
  initial: Supply[]
  isManager: boolean
}

export function SuppliesPanel({ initial, isManager }: Props) {
  const [supplies, setSupplies] = useState<Supply[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    name: "", category: "General", quantity: "", unit: "units", reorder_threshold: "", notes: ""
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grouped = supplies.reduce<Record<string, Supply[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
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
      const created = await addSupply({
        name: form.name,
        category: form.category,
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        reorder_threshold: Number(form.reorder_threshold) || 0,
        notes: form.notes || undefined,
      })
      setSupplies(prev => [...prev, created].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
      setForm({ name: "", category: "General", quantity: "", unit: "units", reorder_threshold: "", notes: "" })
      setShowAdd(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteSupply(id)
      setSupplies(prev => prev.filter(s => s.id !== id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  async function handleQtyChange(id: string, quantity: number) {
    setSupplies(prev => prev.map(s => s.id === id ? { ...s, quantity } : s))
    try {
      await updateSupply(id, { quantity })
    } catch {}
  }

  const isLow = (s: Supply) => s.reorder_threshold > 0 && s.quantity <= s.reorder_threshold

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-headline font-bold text-xl text-on-surface">Supplies</h2>
          {supplies.some(isLow) && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {supplies.filter(isLow).length} low
            </span>
          )}
        </div>
        {isManager && (
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Supply
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
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">New Supply</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Paper Towels" required
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                {SUPPLY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Quantity</label>
              <input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Unit</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Reorder At</label>
              <input type="number" min="0" value={form.reorder_threshold} onChange={e => setForm(f => ({ ...f, reorder_threshold: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
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
              {saving ? "Saving..." : "Add Supply"}
            </button>
          </div>
        </form>
      )}

      {/* Grouped List */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-8">No supplies recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="bg-surface-container-low rounded-2xl overflow-hidden">
              <button onClick={() => toggleCat(cat)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container transition-colors">
                <span className="text-sm font-bold text-on-surface">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  {collapsedCats.has(cat) ? <ChevronDown className="w-4 h-4 text-on-surface-variant" /> : <ChevronUp className="w-4 h-4 text-on-surface-variant" />}
                </div>
              </button>
              {!collapsedCats.has(cat) && (
                <div className="divide-y divide-outline-variant/10">
                  {items.map(s => (
                    <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${isLow(s) ? "bg-amber-500/5" : ""}`}>
                      {isLow(s) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{s.name}</p>
                        {s.notes && <p className="text-xs text-on-surface-variant truncate">{s.notes}</p>}
                      </div>
                      {isManager ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleQtyChange(s.id, Math.max(0, s.quantity - 1))}
                            className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high text-sm font-bold">−</button>
                          <span className={`w-14 text-center text-sm font-bold ${isLow(s) ? "text-amber-500" : "text-on-surface"}`}>
                            {s.quantity} {s.unit}
                          </span>
                          <button onClick={() => handleQtyChange(s.id, s.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high text-sm font-bold">+</button>
                        </div>
                      ) : (
                        <span className={`text-sm font-bold ${isLow(s) ? "text-amber-500" : "text-on-surface"}`}>
                          {s.quantity} {s.unit}
                        </span>
                      )}
                      {isManager && (
                        <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-400 hover:bg-red-400/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
