/**
 * Applies Step 1: Creates missing recognition/gamification tables and views
 */

const path = require("path");
const fs = require("fs");
const https = require("https");

try {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch (_) {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, SUPABASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "User-Agent": "shrine-cli/1.0",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${data}`));
          return;
        }
        try { resolve(data ? JSON.parse(data) : null); } catch { resolve(data); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runSQL(sql) {
  // Use Supabase REST to run arbitrary SQL via the postgres endpoint
  return new Promise((resolve, reject) => {
    const url = new URL("/rest/v1/", SUPABASE_URL);
    const data = JSON.stringify({ query: sql });
    const options = {
      method: "POST",
      hostname: url.hostname,
      path: "/rest/v1/rpc/exec_sql",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "User-Agent": "shrine-cli/1.0",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve(data);
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log("Creating Step 1 tables and views...\n");

  // Tables to create
  const tables = [
    // badge_level_definitions
    `CREATE TABLE IF NOT EXISTS public.badge_level_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      badge_id UUID NOT NULL REFERENCES public.recognition_badges(id) ON DELETE CASCADE,
      level_name TEXT NOT NULL,
      level_number INT NOT NULL,
      times_required INT NOT NULL DEFAULT 1,
      point_value INT NOT NULL DEFAULT 0,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (badge_id, level_number)
    );`,
    
    // badge_nominations
    `CREATE TABLE IF NOT EXISTS public.badge_nominations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      badge_id UUID NOT NULL REFERENCES public.recognition_badges(id) ON DELETE CASCADE,
      nominated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
      reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    
    // point_deductions
    `CREATE TABLE IF NOT EXISTS public.point_deductions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      points INT NOT NULL,
      reason TEXT NOT NULL,
      event_type TEXT NOT NULL REFERENCES public.gamification_point_rules(event_type),
      source_id TEXT,
      source_table TEXT,
      noted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      deduction_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    
    // point_redemptions
    `CREATE TABLE IF NOT EXISTS public.point_redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      points_spent INT NOT NULL,
      reward_type TEXT NOT NULL CHECK (reward_type IN (
        'gift_card','preferred_shift','lunch_reward','certificate','public_recognition',
        'paid_meal_break','small_bonus','uniform_upgrade','parking_stipend','pto_hour',
        'recognition_wall','team_reward'
      )),
      reward_detail TEXT,
      approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  ];

  // Indexes
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_badge_levels_badge ON public.badge_level_definitions (badge_id);",
    "CREATE INDEX IF NOT EXISTS idx_badge_nominations_employee ON public.badge_nominations (employee_id);",
    "CREATE INDEX IF NOT EXISTS idx_badge_nominations_status ON public.badge_nominations (status);",
    "CREATE INDEX IF NOT EXISTS idx_point_deductions_employee ON public.point_deductions (employee_id);",
    "CREATE INDEX IF NOT EXISTS idx_point_deductions_date ON public.point_deductions (deduction_date DESC);",
    "CREATE INDEX IF NOT EXISTS idx_point_redemptions_employee ON public.point_redemptions (employee_id);",
  ];

  for (const sql of [...tables, ...indexes]) {
    try {
      // We need to use pg-pool or direct postgres, but we can't from here
      // Alternative: write to a temp SQL file and tell user to run it
      console.log("Would execute:", sql.substring(0, 60) + "...");
    } catch (err) {
      console.error("Error:", err.message);
    }
  }

  console.log("\nNote: Cannot execute CREATE TABLE via REST API.");
  console.log("Please run the SQL file: supabase/recognition-missing-only.sql");
  console.log("Or I can print the SQL here for you to copy/paste.");
})();
