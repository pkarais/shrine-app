import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { execSync } = await import("child_process")
    const result = execSync(
      `node scripts/sync-google-calendar.js`,
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          GOOGLE_CALENDAR_API_KEY: process.env.GOOGLE_CALENDAR_API_KEY!,
          GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID!,
        },
        timeout: 60000,
      }
    )
    return NextResponse.json({ success: true, output: result.toString() })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stderr: err.stderr?.toString() }, { status: 500 })
  }
}
