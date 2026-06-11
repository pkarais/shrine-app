// Dump raw pdfjs items with x,y coords from the test PDF.
import { readFileSync, writeFileSync } from "node:fs"

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

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
const buf = readFileSync("test-schedule.pdf")
const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true, disableFontFace: true }).promise

const lines = []
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p)
  const content = await page.getTextContent()
  for (const it of content.items) {
    const s = it.str
    if (!s || !s.trim()) continue
    const x = it.transform[4]
    const y = it.transform[5]
    lines.push(`P${p} y=${y.toFixed(1).padStart(7)} x=${x.toFixed(1).padStart(7)}  "${s}"`)
  }
}
// Sort by page, then y desc (top first), then x
lines.sort((a, b) => {
  const pa = parseInt(a.match(/^P(\d+)/)[1])
  const pb = parseInt(b.match(/^P(\d+)/)[1])
  if (pa !== pb) return pa - pb
  const ya = parseFloat(a.match(/y=\s*(\S+)/)[1])
  const yb = parseFloat(b.match(/y=\s*(\S+)/)[1])
  if (Math.abs(ya - yb) > 2) return yb - ya
  const xa = parseFloat(a.match(/x=\s*(\S+)/)[1])
  const xb = parseFloat(b.match(/x=\s*(\S+)/)[1])
  return xa - xb
})
writeFileSync("pdf-items.txt", lines.join("\n"))
console.log(`Wrote ${lines.length} items to pdf-items.txt`)
