import { redirect } from "next/navigation"
import { createServerClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/server"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { InventoryTabs } from "@/components/inventory/InventoryTabs"
import type { Supply, Vendor, Equipment } from "@/lib/actions/inventory"

export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const allowedRoles = ["manager", "operations", "security"]
  if (!profile || !allowedRoles.includes(profile.role)) redirect("/dashboard")

  const isManager = profile.role === "manager"
  const isOperations = profile.role === "operations"
  // managers: full access to all three panels
  // operations: can add/edit supplies and equipment, vendors are read-only
  const canEditSupplies = isManager || isOperations
  const canEditVendors = isManager
  const canEditEquipment = isManager || isOperations

  const [suppliesRes, vendorsRes, equipmentRes] = await Promise.all([
    admin.from("supplies").select("*").order("category").order("name"),
    admin.from("vendors").select("*").order("category").order("name"),
    admin.from("equipment").select("*").order("equipment_type").order("name"),
  ])

  const supplies = (suppliesRes.data ?? []) as Supply[]
  const vendors = (vendorsRes.data ?? []) as Vendor[]
  const equipment = (equipmentRes.data ?? []) as Equipment[]

  return (
    <>
      <TopAppBar />
      <main className="min-h-screen bg-surface pt-24 pb-16 px-4 md:px-6">
        <div className="mx-auto max-w-5xl">
          {/* Hero */}
          <div className="mb-8 rounded-3xl overflow-hidden shadow-xl relative min-h-[200px] flex items-end bg-surface-container-low">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/10" />
            <div className="relative z-10 p-6 md:p-8 w-full">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Operations</p>
              <h1 className="mt-1 text-3xl font-black md:text-4xl text-on-surface">Inventory Tracker</h1>
              <p className="mt-2 text-sm text-on-surface-variant max-w-2xl">
                Manage supplies, vendors, and equipment. Low-stock alerts and maintenance schedules flow into the monthly brief automatically.
              </p>
            </div>
          </div>

          <InventoryTabs
            supplies={supplies}
            vendors={vendors}
            equipment={equipment}
            canEditSupplies={canEditSupplies}
            canEditVendors={canEditVendors}
            canEditEquipment={canEditEquipment}
          />
        </div>
      </main>
    </>
  )
}
