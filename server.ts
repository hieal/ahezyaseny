import { createClient } from '@supabase/supabase-js';

// חיבור מאובטח לסופאבייס - משתמש במשתני הסביבה שהגדרת בוורסל
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req, res) {
  // הגדרת כותרות כדי למנוע שגיאות CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method, url } = req;

  // --- לוגיקה של התחברות (Login) ---
  if (url.includes('/api/auth/login') && method === 'POST') {
    const { username, password } = req.body;
    
    // בדיקה מול הסיסמה שהגדרת בוורסל
    if (password === process.env.ADMIN_PASSWORD) {
       return res.status(200).json({ token: 'admin-token', user: { role: 'admin', username } });
    }
    
    // בדיקה בטבלת מנהלים בסופאבייס
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (admin) {
      return res.status(200).json({ token: 'valid-token', user: admin });
    }
    return res.status(401).json({ error: 'פרטים שגויים' });
  }

  // --- ניהול מנהלים (Get/Add Admins) ---
  if (url.includes('/api/admins')) {
    if (method === 'GET') {
      const { data } = await supabase.from('admins').select('*');
      return res.status(200).json(data || []);
    }
    if (method === 'POST') {
      const { username, password, role } = req.body;
      const { data, error } = await supabase.from('admins').insert([{ username, password, role }]);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(data);
    }
  }

  return res.status(404).json({ message: 'הנתיב לא נמצא' });
}
