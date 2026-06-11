// Local test: run the parser against the actual PDF and dump structured output.
// Run with: ./node_modules/.bin/tsx.cmd scripts/test-parse.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"

// Polyfills the parser expects.
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function () {
    let resolve, reject
    const promise = new Promise((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }
}
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class {}
}
// Make `require` available so the parser's `require.resolve("pdfjs-dist/package.json")` works under ESM.
globalThis.require = createRequire(import.meta.url)

const { parseSchedulePdf } = await import("../lib/schedule-pdf-parser.ts")

const buf = readFileSync("test-schedule.pdf")
const result = await parseSchedulePdf(buf)

console.log("=== WARNINGS ===")
result.warnings.forEach((w) => console.log(w))
console.log("\n=== DAY HEADERS ===")
result.dayHeaders.forEach((h) => console.log(`  ${h.date}: ${h.dayTitle}`))
console.log(`\n=== SHIFTS (${result.shifts.length}) ===`)
const byDate = new Map()
for (const s of result.shifts) {
  if (!byDate.has(s.date)) byDate.set(s.date, [])
  byDate.get(s.date).push(s)
}
const dates = Array.from(byDate.keys()).sort()
for (const d of dates) {
  console.log(`\n${d}:`)
  for (const s of byDate.get(d)) {
    const t = s.shiftStart === null ? "OFF" : `${s.shiftStart}-${s.shiftEnd}${s.isLate ? " LATE" : ""}`
    console.log(`  ${s.staffName.padEnd(10)} ${s.scheduleRole.padEnd(10)} ${t}`)
  }
}
writeFileSync("parse-result.json", JSON.stringify(result, null, 2))
console.log("\nFull result -> parse-result.json")
