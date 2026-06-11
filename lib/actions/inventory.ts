"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface Supply {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  reorder_threshold: number
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  name: string
  category: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  notes: string | null
  active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  name: string
  equipment_type: string
  model_number: string | null
  serial_number: string | null
  manufacturer: string | null
  purchase_date: string | null
  warranty_expiry: string | null
  last_maintenance: string | null
  next_maintenance: string | null
  condition: "good" | "fair" | "poor" | "retired"
  location: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// ─── AUTH HELPER ─────────────────────────────────────────────────────────────

async function requireRole(roles: string[]) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !roles.includes(profile.role)) throw new Error("Access denied")

  return { user, admin }
}

// ─── SUPPLY ACTIONS ───────────────────────────────────────────────────────────

export async function getSupplies() {
  const { admin } = await requireRole(["manager", "operations", "security"])
  const { data, error } = await admin.from("supplies").select("*").order("category").order("name")
  if (error) throw new Error(error.message)
  return (data || []) as Supply[]
}

export async function addSupply(supply: {
  name: string
  category: string
  quantity: number
  unit: string
  reorder_threshold: number
  notes?: string
}) {
  const { user, admin } = await requireRole(["manager", "operations", "security"])
  const { data, error } = await admin.from("supplies").insert({ ...supply, created_by: user.id }).select().single()
  if (error) throw new Error(error.message)
  return data as Supply
}

export async function updateSupply(id: string, updates: Partial<Omit<Supply, "id" | "created_by" | "created_at">>) {
  const { admin } = await requireRole(["manager", "operations", "security"])
  const { error } = await admin.from("supplies").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteSupply(id: string) {
  const { admin } = await requireRole(["manager", "operations", "security"])
  const { error } = await admin.from("supplies").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

// ─── VENDOR ACTIONS ───────────────────────────────────────────────────────────

export async function getVendors() {
  const { admin } = await requireRole(["manager", "operations", "security"])
  const { data, error } = await admin.from("vendors").select("*").order("category").order("name")
  if (error) throw new Error(error.message)
  return (data || []) as Vendor[]
}

export async function addVendor(vendor: {
  name: string
  category: string
  contact_name?: string
  phone?: string
  email?: string
  website?: string
  notes?: string
  active?: boolean
}) {
  const { user, admin } = await requireRole(["manager"])
  const { data, error } = await admin.from("vendors").insert({ ...vendor, created_by: user.id }).select().single()
  if (error) throw new Error(error.message)
  return data as Vendor
}

export async function updateVendor(id: string, updates: Partial<Omit<Vendor, "id" | "created_by" | "created_at">>) {
  const { admin } = await requireRole(["manager"])
  const { error } = await admin.from("vendors").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteVendor(id: string) {
  const { admin } = await requireRole(["manager"])
  const { error } = await admin.from("vendors").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

// ─── EQUIPMENT ACTIONS ────────────────────────────────────────────────────────

export async function getEquipment() {
  const { admin } = await requireRole(["manager", "operations", "security"])
  const { data, error } = await admin.from("equipment").select("*").order("equipment_type").order("name")
  if (error) throw new Error(error.message)
  return (data || []) as Equipment[]
}

export async function addEquipment(eq: {
  name: string
  equipment_type: string
  model_number?: string
  serial_number?: string
  manufacturer?: string
  purchase_date?: string
  warranty_expiry?: string
  last_maintenance?: string
  next_maintenance?: string
  condition: "good" | "fair" | "poor" | "retired"
  location?: string
  notes?: string
}) {
  const { user, admin } = await requireRole(["manager", "operations"])
  const { data, error } = await admin.from("equipment").insert({ ...eq, created_by: user.id }).select().single()
  if (error) throw new Error(error.message)
  return data as Equipment
}

export async function updateEquipment(id: string, updates: Partial<Omit<Equipment, "id" | "created_by" | "created_at">>) {
  const { admin } = await requireRole(["manager", "operations"])
  const { error } = await admin.from("equipment").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteEquipment(id: string) {
  const { admin } = await requireRole(["manager", "operations"])
  const { error } = await admin.from("equipment").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
