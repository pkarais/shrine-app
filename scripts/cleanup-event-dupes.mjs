/**
 * Dedupe + clean event rows.
 *
 *  - Renames lingering "Daily Shift YYYY-MM-DD" rows → "Regular Shrine Open YYYY-MM-DD"
 *    and rewrites their times to 09:00-17:00 America/New_York.
 *  - Removes "Staff Operational Window" and "Open for Tourism" placeholder rows
 *    (they are filtered everywhere in the UI and are not real events).
 *  - Within each date, finds duplicate pairs where one row has google_event_id
 *    and another does not, and the non-google title is a prefix/substring of the
 *    google title (or vice versa, normalized). Migrates staff_assignments to the
 *    google row, then deletes the orphan.
 *  - Removes legacy "Opening Shift YYYY-MM-DD" / "Closing Shift YYYY-MM-DD" rows.
 *
 * USAGE:
 *   node scripts/cleanup-event-dupes.mjs            # preview only
 *   node scripts/cleanup-event-dupes.mjs --apply    # execute changes
 *   node scripts/cleanup-event-dupes.mjs --apply --from=2026-05-01 --to=2026-06-01
 */
import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
for (const l of env.split('\n')) {
  const t = l.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i < 0) continue;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) { console.error('Missing Supabase env'); process.exit(1); }

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FROM = (args.find(a => a.startsWith('--from='))?.split('=')[1]) || '2026-05-01';
const TO   = (args.find(a => a.startsWith('--to='))?.split('=')[1])   || '2026-06-01';

function req(method, path, body) {
  return new Promise((res, rej) => {
    const u = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      apikey: KEY, Authorization: 'Bearer ' + KEY,
      Prefer: 'return=representation',
    };
    if (payload) headers['Content-Type'] = 'application/json';
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers }, x => {
      let d = '';
      x.on('data', c => d += c);
      x.on('end', () => {
        try { res({ status: x.statusCode, data: d ? JSON.parse(d) : null }); }
        catch { res({ status: x.statusCode, data: d }); }
      });
    });
    r.on('error', rej);
    if (payload) r.write(payload);
    r.end();
  });
}

function normalizeTitle(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Eastern HH:mm → ISO string in UTC. May 2026 = EDT (-04). June starts in EDT too.
// For correctness across the year, compute the actual offset.
function toEasternIso(dateStr, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  // Determine offset using JS Intl
  const probe = new Date(`${dateStr}T${hhmm}:00Z`);
  const ny = new Date(probe.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const utc = new Date(probe.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMin = Math.round((utc - ny) / 60000); // positive = behind UTC
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + h * 60 + m + offsetMin);
  return d.toISOString();
}

// ── Fetch ──────────────────────────────────────────────────────────────
const evs = await (await req('GET', `/rest/v1/events?select=id,title,start_time,end_time,google_event_id,category&start_time=gte.${FROM}&start_time=lt.${TO}&order=start_time`)).data;
console.log(`Loaded ${evs.length} events in [${FROM} .. ${TO})`);

const actions = []; // {kind, eventId, ...}

// ── 1. Rename leftover Daily Shift rows ────────────────────────────────
for (const e of evs) {
  const m = e.title?.match(/^Daily Shift (\d{4}-\d{2}-\d{2})$/);
  if (!m) continue;
  const d = m[1];
  actions.push({
    kind: 'rename',
    eventId: e.id,
    oldTitle: e.title,
    newTitle: `Regular Shrine Open ${d}`,
    newStart: toEasternIso(d, '09:00'),
    newEnd: toEasternIso(d, '17:00'),
  });
}

// ── 2. Remove placeholder noise ────────────────────────────────────────
for (const e of evs) {
  if (e.title === 'Staff Operational Window' || e.title === 'Open for Tourism') {
    actions.push({ kind: 'delete-placeholder', eventId: e.id, title: e.title, start: e.start_time });
  }
  if (/^Opening Shift \d{4}-\d{2}-\d{2}$/.test(e.title) || /^Closing Shift \d{4}-\d{2}-\d{2}$/.test(e.title)) {
    actions.push({ kind: 'delete-legacy-shift', eventId: e.id, title: e.title });
  }
}

// ── 3. Dedup pairs where one has google_event_id, the other does not ───
const byDate = new Map();
for (const e of evs) {
  const d = String(e.start_time).slice(0, 10);
  if (!byDate.has(d)) byDate.set(d, []);
  byDate.get(d).push(e);
}

for (const [, rows] of byDate) {
  const googles = rows.filter(r => r.google_event_id);
  const orphans = rows.filter(r => !r.google_event_id);
  for (const orph of orphans) {
    if (orph.title === 'Staff Operational Window' || orph.title === 'Open for Tourism') continue;
    if (/^Daily Shift /.test(orph.title) || /^Regular Shrine Open /.test(orph.title)) continue;
    if (/^Opening Shift /.test(orph.title) || /^Closing Shift /.test(orph.title)) continue;
    const oNorm = normalizeTitle(orph.title);
    if (oNorm.length < 6) continue;
    const oPrefix = oNorm.slice(0, 20);
    // find a google row whose normalized title contains the orphan's prefix
    // OR whose own normalized prefix the orphan contains
    const match = googles.find(g => {
      const gNorm = normalizeTitle(g.title);
      const gPrefix = gNorm.slice(0, 20);
      return gNorm.includes(oPrefix) || oNorm.includes(gPrefix);
    });
    if (match) {
      actions.push({
        kind: 'dedupe',
        keepId: match.id, keepTitle: match.title,
        dropId: orph.id, dropTitle: orph.title,
      });
    }
  }
}

// ── Preview ────────────────────────────────────────────────────────────
console.log(`\n${actions.length} actions queued:\n`);
const counts = {};
for (const a of actions) counts[a.kind] = (counts[a.kind] || 0) + 1;
console.log('Summary by kind:', counts, '\n');
for (const a of actions) {
  if (a.kind === 'rename') console.log(`  RENAME    id=${a.eventId}: "${a.oldTitle}" → "${a.newTitle}" (start=${a.newStart.slice(0, 16)})`);
  else if (a.kind === 'dedupe') console.log(`  DEDUPE    drop id=${a.dropId} "${a.dropTitle}" → keep id=${a.keepId} "${a.keepTitle}"`);
  else if (a.kind === 'delete-placeholder') console.log(`  DELETE-PH id=${a.eventId} "${a.title}" (${a.start.slice(0, 10)})`);
  else if (a.kind === 'delete-legacy-shift') console.log(`  DELETE-LS id=${a.eventId} "${a.title}"`);
}

if (!APPLY) {
  console.log('\nDRY RUN. Re-run with --apply to execute.');
  process.exit(0);
}

console.log('\nAPPLYING…\n');

for (const a of actions) {
  if (a.kind === 'rename') {
    const r = await req('PATCH', `/rest/v1/events?id=eq.${a.eventId}`, {
      title: a.newTitle, start_time: a.newStart, end_time: a.newEnd,
      description: 'Regular shrine open hours — 9:00 AM – 5:00 PM ET',
    });
    console.log(`  rename ${a.eventId} → ${r.status}`);
  } else if (a.kind === 'dedupe') {
    // Move staff_assignments from drop → keep, then delete drop
    const move = await req('PATCH', `/rest/v1/staff_assignments?event_id=eq.${a.dropId}`, { event_id: a.keepId });
    const del = await req('DELETE', `/rest/v1/events?id=eq.${a.dropId}`, null);
    console.log(`  dedupe drop ${a.dropId} → keep ${a.keepId} (move=${move.status} del=${del.status})`);
  } else if (a.kind === 'delete-placeholder' || a.kind === 'delete-legacy-shift') {
    // Clear assignments first to avoid FK
    await req('DELETE', `/rest/v1/staff_assignments?event_id=eq.${a.eventId}`, null);
    const del = await req('DELETE', `/rest/v1/events?id=eq.${a.eventId}`, null);
    console.log(`  ${a.kind} ${a.eventId} → ${del.status}`);
  }
}

console.log('\nDone.');
