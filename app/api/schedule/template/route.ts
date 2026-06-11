import { NextResponse } from "next/server"

export const runtime = "nodejs"

// Blank schedule template — matches the layout the grid parser expects.
// Manager downloads this, fills in dates + shifts, uploads it back.
export function GET() {
  const lines: string[] = []

  // Row 1: meta header (single date-row that anchors the columns)
  // Format: first 2 columns are Staff / Role, then 7 day columns.
  lines.push(["Staff Name", "Role", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].join(","))

  // Row 2: dates header (REPLACE the M/D/YY values for your week)
  lines.push(["DATES →", "", "6/1/26", "6/2/26", "6/3/26", "6/4/26", "6/5/26", "6/6/26", "6/7/26"].join(","))

  // Sample staff rows (delete or replace)
  lines.push(["Paul", "DIRECTOR", "OFF", "OFF", "9:00 AM – 5:00 PM", "10:00 AM – 8:00 PM", "9:00 AM – 5:00 PM", "9:00 AM – 5:00 PM", "9:00 AM – 5:00 PM"].join(","))
  lines.push(["Fabio", "PORTER", "8:00 AM – 4:00 PM", "8:00 AM – 4:00 PM", "8:00 AM – 4:00 PM", "8:00 AM – 4:00 PM", "8:00 AM – 4:00 PM", "OFF", ""].join(","))
  lines.push(["Demetri", "GREETER", "9:00 AM – 5:00 PM", "9:00 AM – 5:00 PM", "12:30 PM – 8:30 PM", "12:00 PM – 8:00 PM", "OFF", "OFF", "9:00 AM – 5:00 PM"].join(","))
  lines.push(["Teresa", "SECURITY", "9:00 AM – 5:00 PM", "9:00 AM – 5:00 PM", "12:30 PM – 8:30 PM", "12:00 PM – 8:00 PM", "OFF", "10:00 AM – 5:00 PM", "9:00 AM – 5:00 PM"].join(","))

  // Blank separator + week 2 dates
  lines.push([].join(","))
  lines.push(["DATES →", "", "6/8/26", "6/9/26", "6/10/26", "6/11/26", "6/12/26", "6/13/26", "6/14/26"].join(","))
  lines.push(["Paul", "DIRECTOR", "OFF", "OFF", "8:00 AM – 4:00 PM", "8:00 AM – 4:00 PM", "8:00 AM – 4:00 PM", "9:00 AM – 5:00 PM", "9:00 AM – 8:00 PM"].join(","))

  const csv = lines.join("\n")
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="schedule-template.csv"',
      "Cache-Control": "no-store",
    },
  })
}
