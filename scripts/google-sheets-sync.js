// SHRINE OPS - SUPABASE CALENDAR SYNC - HANDLES DUPLICATES

const CONFIG = {
  SUPABASE_URL: 'https://eqgikumohnvgdkwlzkus.supabase.co',
  SUPABASE_KEY: 'sb_publishable_J6EGd-VCo21aHPJvnkFiHA_mGzjNLmN',
  SHEET_NAME: 'DASHBOARD'
};

function syncCalendarToSupabase() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) { Browser.msgBox('ERROR: Sheet not found'); return; }
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().trim().toLowerCase());
  const rows = data.slice(1);

  const col = { eventName: headers.indexOf('event name'), startTime: headers.indexOf('start time'), endTime: headers.indexOf('end time'), staffingReqs: headers.indexOf('staffing requirements') };

  if (col.eventName === -1 || col.startTime === -1) { Browser.msgBox('ERROR: Columns not found'); return; }

  const events = [];

  rows.forEach((row) => {
    const eventName = row[col.eventName]?.toString().trim() || '';
    if (!eventName) return;
    const startDate = parseSheetDate(row[col.startTime], currentYear);
    if (!startDate) return;
    if (startDate.getMonth() !== currentMonth || startDate.getFullYear() !== currentYear) return;
    let endDate = parseSheetDate(row[col.endTime], currentYear);
    if (!endDate) { endDate = new Date(startDate.getTime() + 60 * 60 * 1000); }
    const staffingText = col.staffingReqs !== -1 ? row[col.staffingReqs]?.toString() || '' : '';
    const staffing = parseStaffing(staffingText);
    const googleEventId = `${eventName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}-${formatDate(startDate)}`;
    events.push({ google_event_id: googleEventId, title: eventName, description: staffingText || null, start_time: startDate.toISOString(), end_time: endDate.toISOString(), category: getCategory(eventName), dcs_link: null, required_ops: staffing.ops, required_security: staffing.security, required_greeter: staffing.greeter, director_mandatory: staffing.director > 0 });
  });

  if (events.length === 0) { Browser.msgBox('No events found'); return; }

  const batchSize = 5;
  let synced = 0;
  let updated = 0;
  let skipped = 0;
  const totalBatches = Math.ceil(events.length / batchSize);

  for (let i = 0; i < events.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batchEvents = events.slice(i, i + batchSize);
    
    for (const event of batchEvents) {
      try {
        // Try PATCH first (update existing)
        const patchUrl = `${CONFIG.SUPABASE_URL}/rest/v1/events?google_event_id=eq.${encodeURIComponent(event.google_event_id)}`;
        const patchResponse = UrlFetchApp.fetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': CONFIG.SUPABASE_KEY, 'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
          payload: JSON.stringify(event),
          muteHttpExceptions: true
        });
        
        if (patchResponse.getResponseCode() === 200 || patchResponse.getResponseCode() === 204) {
          updated++;
        } else {
          // Try POST (insert new)
          const postResponse = UrlFetchApp.fetch(`${CONFIG.SUPABASE_URL}/rest/v1/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': CONFIG.SUPABASE_KEY, 'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`, 'Prefer': 'resolution=merge-duplicates' },
            payload: JSON.stringify(event),
            muteHttpExceptions: true
          });
          if (postResponse.getResponseCode() >= 200 && postResponse.getResponseCode() < 300) {
            synced++;
          } else {
            skipped++;
          }
        }
      } catch (e) { skipped++; }
    }
    
    Logger.log(`Batch ${batchNum}/${totalBatches}: ${batchEvents.length} processed`);
  }

  Browser.msgBox(`Sync Complete!\n\nNew: ${synced}\nUpdated: ${updated}\nSkipped: ${skipped}\nTotal: ${events.length}`);
}

function parseSheetDate(value, defaultYear) {
  if (!value) return null;
  if (value instanceof Date) { if (isNaN(value.getTime())) return null; if (value.getFullYear() < 2020 || value.getFullYear() > 2030) { value.setFullYear(defaultYear); } return value; }
  const str = value.toString().trim();
  if (!str) return null;
  try {
    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const match = str.match(/([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d+)\s*\|?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      const day = parseInt(match[3]);
      const month = monthNames.indexOf(match[2].toLowerCase().substring(0, 3));
      let hours = parseInt(match[4]);
      const minutes = parseInt(match[5]);
      const ampm = match[6];
      if (ampm) { if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12; if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0; }
      if (month !== -1) { const date = new Date(defaultYear, month, day, hours, minutes); if (!isNaN(date.getTime())) return date; }
    }
    return null;
  } catch (e) { return null; }
}

function parseStaffing(text) { let security = 1, ops = 1, greeter = 0, director = 0; if (!text) return { security, ops, greeter, director }; const sec = text.match(/🛡️\s*(\d+)x?\s*SECURITY/i); if (sec) security = parseInt(sec[1]); const o = text.match(/⚙️\s*(\d+)x?\s*OPS/i); if (o) ops = parseInt(o[1]); const g = text.match(/👋\s*(\d+)x?\s*GREETER/i); if (g) greeter = parseInt(g[1]); if (text.includes('DIRECTOR')) director = 1; return { security, ops, greeter, director }; }

function getCategory(name) {
  const lower = name.toLowerCase();
  const major = ['palm sunday','easter','pascha','holy','nativity','epiphany','lenten','resurrection','midnight','agape'];
  for (const m of major) if (lower.includes(m)) return 'major_feast';
  return 'standard';
}

function formatDate(date) { return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function refreshDashboard() { syncCalendarToSupabase(); }
function onOpen() { SpreadsheetApp.getUi().createMenu('🔄 Shrine Sync').addItem('Sync Current Month', 'syncCalendarToSupabase').addToUi(); }
