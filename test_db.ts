import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
async function test() {
  const { data, error } = await supabase.from('admins').select('*').limit(1);
  console.log('admins:', data, error);
}
test();
