import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
for (const l of env.split('\n')) {
  const t = l.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i < 0) continue;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;

function q(path) {
  return new Promise((res, rej) => {
    const u = new URL(path, BASE);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { apikey: K, Authorization: 'Bearer ' + K } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch { rej(d); } });
    }).on('error', rej);
  });
}

const evs = await q('/rest/v1/events?select=id,title,start_time,end_time,google_event_id,category&start_time=gte.2026-05-01&start_time=lt.2026-06-01&order=start_time');
console.log('TOTAL MAY 2026 EVENTS:', evs.length);

const byTitle = {};
for (const e of evs) byTitle[e.title] = (byTitle[e.title] || 0) + 1;
const dups = Object.entries(byTitle).filter(([, c]) => c > 1);
console.log('\nDUPLICATE TITLES:');
for (const [t, c] of dups) console.log(' ', c, '×', t);

const groups = { 'Regular Shrine Open': 0, 'Daily Shift': 0, 'Staff Operational Window': 0, 'Open for Tourism': 0, 'OTHER': 0 };
const real = [];
const rsoByDate = {};
for (const e of evs) {
  if (e.title.startsWith('Regular Shrine Open ')) {
    groups['Regular Shrine Open']++;
    const d = e.title.replace('Regular Shrine Open ', '');
    rsoByDate[d] = (rsoByDate[d] || 0) + 1;
  }
  else if (e.title.startsWith('Daily Shift ')) groups['Daily Shift']++;
  else if (e.title === 'Staff Operational Window') groups['Staff Operational Window']++;
  else if (e.title === 'Open for Tourism') groups['Open for Tourism']++;
  else { groups['OTHER']++; real.push({ d: e.start_time.slice(0, 10), t: e.title, g: e.google_event_id ? 'G' : '-', id: e.id }); }
}
console.log('\nBREAKDOWN:', groups);

const rsoDups = Object.entries(rsoByDate).filter(([, c]) => c > 1);
if (rsoDups.length) {
  console.log('\nDUPLICATE Regular Shrine Open dates:');
  for (const [d, c] of rsoDups) console.log(' ', c, '×', d);
}

console.log('\nREAL EVENTS (' + real.length + '):');
for (const r of real) console.log(' ', r.d, r.g, '[id=' + r.id + ']', r.t);

// Also check for events with no google_event_id that look like duplicates of google events
const gWithSame = {};
for (const e of evs) {
  const k = e.title + '|' + e.start_time.slice(0, 16);
  if (!gWithSame[k]) gWithSame[k] = [];
  gWithSame[k].push({ id: e.id, g: e.google_event_id });
}
const overlaps = Object.entries(gWithSame).filter(([, arr]) => arr.length > 1);
if (overlaps.length) {
  console.log('\nSAME TITLE+TIME (possible dup pairs):');
  for (const [k, arr] of overlaps) console.log(' ', k, '→', arr);
}
