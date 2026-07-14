import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uojgqshqlprucjvprvpv.supabase.co';
const supabaseKey = 'sb_publishable_HFIpQCqgqG-p8IaQuB8AoA_t7EXL4j1';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('view_person_balances_detailed').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

main();
