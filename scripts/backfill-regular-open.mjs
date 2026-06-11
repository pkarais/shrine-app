/**
 * Backfill "Regular Shrine Open YYYY-MM-DD" events for every day in a date
 * range that doesn't already have one. Times: 09:00-17:00 America/New_York.
 *
 *   node scripts/backfill-regular-open.mjs --from=2026-05-01 --to=2026-06-01
 *   node scripts/backfill-regular-open.mjs --from=2026-05-01 --to=2026-06-01 --apply
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

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FROM = (args.find(a => a.startsWith('--from='))?.split('=')[1]) || '2026-05-01';
const TO   = (args.find(a => a.startsWith('--to='))?.split('=')[1])   || '2026-06-01';

function req(method, path, body) {
  return new Promise((res, rej) => {
    const u = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'return=representation' };
    if (payload) headers['Content-Type'] = 'application/json';
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers }, x => {
      let d = '';
      x.on('data', c => d += c);
      x.on('end', () => { try { res({ status: x.statusCode, data: d ? JSON.parse(d) : null }); } catch { res({ status: x.statusCode, data: d }); } });
    });
    r.on('error', rej);
    if (payload) r.write(payload);
    r.end();
  });
}

function toEasternIso(dateStr, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const probe = new Date(`${dateStr}T${hhmm}:00Z`);
  const ny = new Date(probe.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const utc = new Date(probe.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMin = Math.round((utc - ny) / 60000);
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + h * 60 + m + offsetMin);
  return d.toISOString();
}

function* eachDate(from, to) {
  const d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (d < end) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

const existing = await (await req('GET', `/rest/v1/events?select=title&title=like.Regular Shrine Open *&start_time=gte.${FROM}&start_time=lt.${TO}`)).data;
const have = new Set(existing.map(e => e.title.replace('Regular Shrine Open ', '')));
console.log(`Existing Regular Shrine Open days in range: ${have.size}`);

const toCreate = [];
for (const d of eachDate(FROM, TO)) if (!have.has(d)) toCreate.push(d);
console.log(`Days needing backfill: ${toCreate.length}`);
for (const d of toCreate) console.log('  +', d);

if (!APPLY) { console.log('\nDRY RUN. Re-run with --apply.'); process.exit(0); }

console.log('\nCreating…');
for (const d of toCreate) {
  const r = await req('POST', '/rest/v1/events', {
    title: `Regular Shrine Open ${d}`,
    start_time: toEasternIso(d, '09:00'),
    end_time:   toEasternIso(d, '17:00'),
    description: 'Regular shrine open hours — 9:00 AM – 5:00 PM ET',
    required_ops: 1,
    required_security: 1,
    required_greeter: 0,
    director_mandatory: false,
    category: 'standard',
  });
  console.log(`  ${d} → ${r.status}`);
}
console.log('Done.');
