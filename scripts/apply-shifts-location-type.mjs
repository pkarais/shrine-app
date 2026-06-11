import ws from 'ws'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const sql = readFileSync('supabase/migrations/20260601_shifts_location_type.sql', 'utf8')
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws } })

const { data, error } = await c.rpc('exec_sql', { sql })
if (error) {
  console.error('rpc exec_sql failed:', error.message)
  console.error('You will need to run the migration in the Supabase SQL editor:')
  console.error('---')
  console.error(sql)
  console.error('---')
  process.exit(1)
}
console.log('Migration applied:', JSON.stringify(data))
