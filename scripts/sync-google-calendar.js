/**
 * Shrine Calendar Sync — Google Calendar → Supabase
 * 
 * Pulls ALL events from the Shrine's Google Calendar for the current month
 * and upserts them into Supabase. Major feasts/holidays auto-tagged for
 * increased staffing.
 * 
 * Usage: node scripts/sync-google-calendar.js
 * 
 * Requires: GOOGLE_CALENDAR_API_KEY and GOOGLE_CALENDAR_ID in .env.local
 */

const https = require('https');

// ── Config ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqgikumohnvgdkwlzkus.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// Major feast / holiday titles that need extra staffing
const MAJOR_FEAST_KEYWORDS = [
  'nativity', 'easter', 'pascha', 'pentecost', 'annunciation',
  'dormition', 'theotokos', 'transfiguration', 'epiphany', 'theophany',
  'palm sunday', 'holy week', 'great lent', 'clean monday',
  'independence', 'october', '25th', '25 march', '25 december',
  'feast', 'major', 'archdiocese', 'metropolis',
];

const HIGH_TRAFFIC_KEYWORDS = [
  'festival', 'gala', 'dinner', 'banquet', 'conference',
  'pilgrimage', 'procession', 'memorial', 'commemoration',
];

// ── Helpers ─────────────────────────────────────────────────────────────

function classifyEvent(summary) {
  const lower = summary.toLowerCase();
  if (MAJOR_FEAST_KEYWORDS.some(kw => lower.includes(kw))) return 'major_feast';
  if (HIGH_TRAFFIC_KEYWORDS.some(kw => lower.includes(kw))) return 'high_traffic';
  return 'standard';
}

function getStaffingForCategory(category) {
  switch (category) {
    case 'major_feast':
      return { ops: 3, security: 2, greeter: 3, director: true };
    case 'high_traffic':
      return { ops: 2, security: 2, greeter: 2, director: false };
    default:
      return { ops: 2, security: 1, greeter: 1, director: false };
  }
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Invalid JSON: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function upsertToSupabase(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function patchToSupabase(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function upsertEvent(event) {
  const { google_event_id, ...eventData } = event;
  
  if (google_event_id) {
    const patchResult = await patchToSupabase(
      `/rest/v1/events?google_event_id=eq.${encodeURIComponent(google_event_id)}`,
      eventData
    );
    
    if (patchResult.status === 200 || patchResult.status === 204) {
      return { success: true, action: 'updated', status: patchResult.status };
    }
    
    if (patchResult.status === 406) {
      const upsertResult = await upsertToSupabase('/rest/v1/events', event);
      if (upsertResult.status >= 200 && upsertResult.status < 300) {
        return { success: true, action: 'inserted', status: upsertResult.status };
      }
      return { success: false, action: 'failed', status: upsertResult.status, data: upsertResult.data };
    }
    
    return { success: false, action: 'failed', status: patchResult.status, data: patchResult.data };
  }
  
  const upsertResult = await upsertToSupabase('/rest/v1/events', event);
  if (upsertResult.status >= 200 && upsertResult.status < 300) {
    return { success: true, action: 'upserted', status: upsertResult.status };
  }
  return { success: false, action: 'failed', status: upsertResult.status, data: upsertResult.data };
}

async function deletePastMonthEvents(currentMonthIds) {
  console.log(`\nCleaning up past month events...`);
  
  const result = await new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/events?google_event_id=not.is.null&start_time=lt.${encodeURIComponent(timeMin)}`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    req.end();
  });
  
  if (result.status === 200 || result.status === 204 || result.status === 406) {
    console.log(`Past month events cleaned up`);
  } else {
    console.log(`Cleanup note: ${result.status}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────

async function syncCalendar() {
  if (!GOOGLE_CALENDAR_API_KEY) {
    console.error('ERROR: GOOGLE_CALENDAR_API_KEY is not set in environment');
    process.exit(1);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const timeMin = new Date(year, month, 1).toISOString();
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  console.log(`Syncing Google Calendar → Supabase (CURRENT MONTH ONLY)`);
  console.log(`Period: ${timeMin.split('T')[0]} → ${timeMax.split('T')[0]}`);

  const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?key=${GOOGLE_CALENDAR_API_KEY}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=500`;
  
  console.log(`Fetching from Google Calendar...`);
  const gcalData = await fetch(gcalUrl);
  const items = gcalData.items || [];
  console.log(`Found ${items.length} events in Google Calendar`);

  if (items.length === 0) {
    console.log('No events to sync');
    return;
  }

  let synced = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (const item of items) {
    const summary = item.summary || 'Untitled Event';
    const googleEventId = item.id;
    const category = classifyEvent(summary);
    const staffing = getStaffingForCategory(category);
    
    const start = item.start?.dateTime || item.start?.date;
    const end = item.end?.dateTime || item.end?.date;

    if (!start) {
      console.log(`⚠ Skipping "${summary}" — no start time`);
      skipped++;
      continue;
    }

    const event = {
      google_event_id: googleEventId,
      title: summary,
      description: item.description || null,
      start_time: new Date(start).toISOString(),
      end_time: end ? new Date(end).toISOString() : null,
      category,
      dcs_link: null,
      required_ops: staffing.ops,
      required_security: staffing.security,
      required_greeter: staffing.greeter,
      director_mandatory: staffing.director,
    };

    const result = await upsertEvent(event);
    
    if (result.success) {
      const icon = category === 'major_feast' ? '🔴' : category === 'high_traffic' ? '🟡' : '⚪';
      const action = result.action === 'updated' ? '↻' : result.action === 'inserted' ? '✚' : '⚡';
      console.log(`${icon} ${action} ${summary} (${start.split('T')[0]})`);
      
      if (result.action === 'updated') updated++;
      else synced++;
    } else {
      console.log(`✗ Error syncing "${summary}": ${JSON.stringify(result.data).slice(0, 200)}`);
      errors++;
    }
  }

  console.log(`\nDone: ${synced} new, ${updated} updated, ${errors} errors, ${skipped} skipped`);
  
  const currentMonthIds = items.map(item => item.id);
  await deletePastMonthEvents(currentMonthIds);
}

syncCalendar().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
