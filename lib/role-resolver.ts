// Plain (non-server) role-resolution helper used by the schedule upload pipeline.
// Kept out of any "use server" file because Next.js requires every export from a
// server-actions module to be async.

// Names that ALWAYS map to a canonical role regardless of which column they
// appear under on the PDF schedule. Demetri is sometimes printed as GREETER
// but is treated as operations per ops directive.
const NAME_OVERRIDE: Record<string, string> = {
  Paul: "director",
  Fabio: "operations",
  Josh: "operations",
  Paulin: "operations",
  Demetri: "operations",
  Marcus: "greeter",
  Teresa: "security",
  Ryan: "security",
  Ken: "security",
  Jose: "security",
}

export function resolveCanonicalRole(scheduleRoleRaw: string, staffName: string): string {
  const name = (staffName || "").trim()
  if (NAME_OVERRIDE[name]) return NAME_OVERRIDE[name]

  const r = (scheduleRoleRaw || "").toLowerCase().trim()
  if (r === "director") return "director"
  if (r === "porter") return "operations"
  if (r === "greeter") return "greeter"
  if (r === "security") return "security"
  return "operations"
}
