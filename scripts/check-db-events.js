const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

async function checkEvents() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  console.log(`Found ${data.length} events:`);
  data.forEach(e => {
    console.log(`- ${e.title} (${e.start_time})`);
  });
}

checkEvents();
