# Supabase Setup Guide

## Required Environment Variables

Add these to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor
2. Run `supabase/seed.sql` for demo data (optional)
3. Create the `employee-uploads` storage bucket (included in schema)

## Google Sheets Sync

The `scripts/google-sheets-sync.js` script runs in Google Apps Script. Set credentials via:
**Extensions → Apps Script → Project Settings → Script Properties**

Add:
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_KEY` — your Supabase anon key

Then use the "Supabase Sync" menu in Sheets to sync.

## GOA Calendar Sync

Run `python scripts/sync_calendars.py` to fetch today's GOA chapel data.
Requires: `pip install requests beautifulsoup4`
