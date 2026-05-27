import { createClient } from '@supabase/supabase-js'

const url = 'https://eqgikumohnvgdkwlzkus.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZ2lrdW1vaG52Z2Rrd2x6a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2OTM3MCwiZXhwIjoyMDkwNjQ1MzcwfQ.3AqxcWNrCmQtTsnp_p3DGE0WfiiGSMIWTdc5LT05wAk'

const supabase = createClient(url, key)

// Test the fixed query
const { data, error } = await supabase
  .from('maintenance_tickets')
  .select('*, events(title)')
  .order('created_at', { ascending: false })
  .limit(20)

console.log('=== FIXED QUERY ===')
if (error) {
  console.log(`Error: ${error.message}`)
} else {
  console.log(JSON.stringify(data, null, 2))
  console.log(`Total: ${data?.length || 0}`)
}
