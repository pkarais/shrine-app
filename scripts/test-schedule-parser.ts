// Quick local sanity test for the schedule PDF parser.
// Usage:
//   1. Save your schedule PDF as test-schedule.pdf at the repo root
//   2. Run: npx tsx scripts/test-schedule-parser.ts
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseSchedulePdf } from "../lib/schedule-pdf-parser"

async function main() {
  const path = resolve(process.cwd(), "test-schedule.pdf")
  const buf = readFileSync(path)
  const result = await parseSchedulePdf(buf)

  console.log("\n=== DAY HEADERS ===")
  for (const h of result.dayHeaders) {
    console.log(`  ${h.date}  ${h.dayTitle || "(no title)"}`)
  }

  console.log("\n=== SHIFTS (" + result.shifts.length + ") ===")
  const byDate = new Map<string, typeof result.shifts>()
  for (const s of result.shifts) {
    if (!byDate.has(s.date)) byDate.set(s.date, [])
    byDate.get(s.date)!.push(s)
  }
  for (const date of Array.from(byDate.keys()).sort()) {
    console.log(`\n  ${date}:`)
    for (const s of byDate.get(date)!) {
      const time = s.shiftStart ? `${s.shiftStart}–${s.shiftEnd}` : "OFF"
      console.log(`    ${s.staffName.padEnd(10)} ${s.scheduleRole.padEnd(10)} ${time}`)
    }
  }

  if (result.warnings.length) {
    console.log("\n=== WARNINGS ===")
    for (const w of result.warnings) console.log("  " + w)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
