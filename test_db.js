import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];
async function test() {
  const res = await fetch(`${url}/rest/v1/admins?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  console.log('admins:', res.status, await res.text());
  const res2 = await fetch(`${url}/rest/v1/profiles?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  console.log('profiles:', res2.status, await res2.text());
}
test();
