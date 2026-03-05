import express from "express";
console.log("Server script starting...");
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Server as SocketServer } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import http from "http";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials missing! Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

// Use Service Role Key if available to bypass RLS on server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
console.log("Supabase client initialized.");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const JWT_SECRET = process.env.JWT_SECRET || "shidduchim-secret-key-2025";
const PORT = 3000;

// Helper to download image and convert to base64
async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error('Failed to download image:', url, err);
    return null;
  }
}

// Initialize Database (Supabase)
console.log("Supabase is the source of truth. Ensure tables exist in your Supabase dashboard.");

const CATEGORIES = [
  '18-22',
  '23-27',
  '28-32',
  '33-40',
  '41-65',
  'פרויקט שח"ם 20-35',
  'פרויקט שח"ם 36-50',
  'פרויקט קומי אורי',
  'פרויקט אור'
];

const logActivity = async (userId: number, action: string, details: string, entityType?: string, entityId?: number) => {
  await supabase.from("activity_logs").insert({
    user_id: userId,
    action,
    details,
    entity_type: entityType || null,
    entity_id: entityId || null
  });
};

// Seed logic for Supabase
async function seedSupabase() {
  console.log("Checking for seed data in Supabase...");
  
  // WhatsApp Groups
  const { count: groupCount } = await supabase.from("whatsapp_groups").select("*", { count: 'exact', head: true });
  if (groupCount === 0) {
    const groupsToInsert = [];
    CATEGORIES.forEach(cat => {
      groupsToInsert.push({ category: cat, type: 'male', name: `קבוצת בנים ${cat}`, link: "" });
      groupsToInsert.push({ category: cat, type: 'female', name: `קבוצת בנות ${cat}`, link: "" });
    });
    await supabase.from("whatsapp_groups").insert(groupsToInsert);
  }

  // Super Admin
  const ADMIN_USERNAME = "admin2025";
  const ADMIN_PASSWORD = "pass2025";
  
  console.log(`Checking for super admin '${ADMIN_USERNAME}'...`);
  const { data: superAdmin, error: fetchError } = await supabase.from("admins").select("*").eq("username", ADMIN_USERNAME).maybeSingle();
  
  if (fetchError) {
    console.error("Error fetching super admin:", fetchError);
  }

  if (!superAdmin) {
    console.log(`Super admin '${ADMIN_USERNAME}' not found, creating...`);
    const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    const { error: insertError } = await supabase.from("admins").insert({
      name: "מנהל ראשי",
      username: ADMIN_USERNAME,
      email: "admin@shidduchim.com",
      password: hashedPassword,
      password_plain: ADMIN_PASSWORD,
      role: "super_admin",
      status: "active",
      is_approved: 1
    });
    
    if (insertError) {
      console.error(`Failed to create super admin '${ADMIN_USERNAME}':`, insertError);
    } else {
      console.log(`Super admin '${ADMIN_USERNAME}' created successfully.`);
    }
  } else {
    console.log(`Super admin '${ADMIN_USERNAME}' exists.`);
    if (superAdmin.role !== 'super_admin') {
      console.log(`Promoting '${ADMIN_USERNAME}' to super_admin...`);
      await supabase.from("admins").update({ role: 'super_admin' }).eq("id", superAdmin.id);
    }
  }

  // Settings
  const settingsToSeed = [
    { key: "whatsapp_template", value: "כרטיס חדש במערכת השידוכים:" },
    { key: "google_login_enabled", value: "true" },
    { key: "whatsapp_group_males", value: "" },
    { key: "whatsapp_group_females", value: "" },
    { key: "whatsapp_group_males_name", value: "קבוצת בנים" },
    { key: "whatsapp_group_females_name", value: "קבוצת בנות" },
    { key: "whatsapp_initial_message", value: "בוקר טוב לכולם! מיד נתחיל בפרסום כרטיסים חדשים..." },
    { key: "last_initial_sent_males", value: "" },
    { key: "last_initial_sent_females", value: "" }
  ];

  for (const setting of settingsToSeed) {
    const { data } = await supabase.from("settings").select("*").eq("key", setting.key).maybeSingle();
    if (!data) {
      await supabase.from("settings").insert(setting);
    }
  }

  // Ensure authorized_emails table is mentioned/handled if needed
  // In a real Supabase setup, the table would be created via SQL.
  // Here we just ensure the logic exists.
}

seedSupabase().then(() => console.log("Supabase seeding complete.")).catch(console.error);

const app = express();
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Google OAuth Routes
app.get("/api/auth/google/url", (req, res) => {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  const qs = new URLSearchParams(options);
  res.json({ url: `${rootUrl}?${qs.toString()}` });
});

app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code as string;
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL } = process.env;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${APP_URL}/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const { access_token } = await tokenRes.json();

    // Get user info
    const userRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`);
    const googleUser = await userRes.json();

    // Check if user exists in DB OR is authorized
    const normalizedEmail = googleUser.email.toLowerCase();
    
    // 1. Check if user already exists
    let { data: user } = await supabase
      .from("admins")
      .select("*")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    // 2. If not, check if email is authorized
    if (!user) {
      const { data: authorized } = await supabase
        .from("authorized_emails")
        .select("*")
        .ilike("email", normalizedEmail)
        .maybeSingle();
      
      if (authorized) {
        // Create the user automatically since they are authorized
        const { data: newUser, error: createError } = await supabase.from("admins").insert({
          name: googleUser.name || "מנהל חדש",
          username: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          role: 'admin',
          status: 'active',
          is_approved: 1,
          google_login_allowed: 'true',
          avatar_url: googleUser.picture || null
        }).select().single();
        
        if (!createError) {
          user = newUser;
          await logActivity(user.id, "התחברות ראשונה", "משתמש מורשה התחבר לראשונה דרך גוגל");
        }
      }
    }

    if (!user) {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc;">
            <div style="background: white; padding: 2rem; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px;">
              <h1 style="color: #ef4444; margin-bottom: 1rem;">גישה נחסמה</h1>
              <p style="color: #64748b; line-height: 1.5;">כתובת האימייל <strong>${normalizedEmail}</strong> אינה מורשית במערכת.</p>
              <p style="color: #64748b; margin-top: 1rem;">פנה למנהל הראשי לקבלת הרשאה.</p>
              <button onclick="window.close()" style="margin-top: 2rem; padding: 0.5rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">סגור חלון</button>
            </div>
          </body>
        </html>
      `);
    }

    if (user.google_login_allowed === 'false') {
      return res.send(`
        <html>
          <body>
            <script>
              alert("התחברות באמצעות גוגל אינה מאופשרת עבורך. פנה למנהל הראשי.");
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    if (user.status === 'inactive') {
      return res.send(`
        <html>
          <body>
            <script>
              alert("המשתמש שלך אינו פעיל. פנה למנהל הראשי.");
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    const token = jwt.sign({ 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      name: user.name,
      category: user.category 
    }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify({ 
                  id: user.id, 
                  username: user.username, 
                  role: user.role, 
                  name: user.name,
                  category: user.category 
                })} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).send("Authentication failed");
  }
});

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
  next();
};

// Internal Messages
app.get("/api/internal-messages/:otherUserId", authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  const { otherUserId } = req.params;
  
  const { data: messages, error } = await supabase
    .from("internal_messages")
    .select(`
      *,
      sender:admins!internal_messages_sender_id_fkey(name),
      match:matches(name, type, age, city)
    `)
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  
  // Flatten the response to match previous format if needed
  const formattedMessages = messages.map(msg => ({
    ...msg,
    sender_name: msg.sender?.name,
    match_name: msg.match?.name,
    match_type: msg.match?.type,
    match_age: msg.match?.age,
    match_city: msg.match?.city
  }));

  res.json(formattedMessages);
});

app.delete("/api/internal-messages/:id", authenticate, async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  const { data: message } = await supabase
    .from("internal_messages")
    .select("*")
    .eq("id", id)
    .single();

  if (!message) return res.status(404).json({ error: "Message not found" });
  if (message.sender_id !== userId) return res.status(403).json({ error: "Forbidden" });

  await supabase.from("internal_messages").delete().eq("id", id);
  res.json({ success: true });
});

// Notifications
app.get("/api/notifications", authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json(notifications);
});

app.put("/api/notifications/read", authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  await supabase
    .from("notifications")
    .update({ is_read: 1 })
    .eq("user_id", userId);
  res.json({ success: true });
});

// Online Users
app.get("/api/online-users", authenticate, (req, res) => {
  res.json(Array.from(onlineUsers.keys()));
});

// Change Password
const handleSupabaseError = (res: any, error: any, table: string) => {
  console.error(`Supabase Error in ${table}:`, error);
  if (error.code === '42703' || error.message?.includes('does not exist')) { // undefined_column
    const match = error.message?.match(/column "(.+)" of relation/);
    const column = match ? match[1] : 'unknown_column';
    const sql = `ALTER TABLE ${table} ADD COLUMN ${column} text;`;
    return res.status(400).json({ 
      error: `Missing column '${column}' in table '${table}'.`,
      sql_fix: sql,
      message: `שגיאת סנכרון: העמודה '${column}' חסרה בטבלה '${table}'. אנא הרץ את הפקודה הבאה ב-Supabase SQL Editor:`,
      details: error
    });
  }
  return res.status(500).json({ error: error.message, details: error });
};

app.post("/api/users/change-password", authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  const { oldPassword, newPassword } = req.body;

  const { data: user } = await supabase
    .from("admins")
    .select("*")
    .eq("id", userId)
    .single();

  if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: "סיסמה ישנה שגויה" });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  await supabase
    .from("admins")
    .update({ password: hashedPassword, password_plain: newPassword })
    .eq("id", userId);
  
  await logActivity(userId, "שינוי סיסמה", "המשתמש שינה את סיסמתו");
  res.json({ success: true });
});

// Approve User
app.post("/api/users/approve/:id", authenticate, async (req, res) => {
  const userRole = (req as any).user.role;
  if (userRole !== 'super_admin') return res.status(403).json({ error: "Unauthorized" });

  const { id } = req.params;
  await supabase
    .from("admins")
    .update({ is_approved: 1 })
    .eq("id", id);
  res.json({ success: true });
});

// Match Suggestions
app.get("/api/matches/suggestions", authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  
  // Get 3 random matches of the current user
  const { data: myMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("created_by", userId)
    .is("deleted_at", null)
    .limit(3); // Supabase doesn't have a built-in RANDOM() in the JS client easily, but we can just take 3
  
  if (!myMatches) return res.json([]);

  const suggestions = [];
  for (const match of myMatches) {
    const oppositeGender = match.type === 'male' ? 'female' : 'male';
    const { data: potentialMatches } = await supabase
      .from("matches")
      .select("*")
      .eq("type", oppositeGender)
      .is("deleted_at", null)
      .limit(5);
    
    suggestions.push({
      match,
      potentialMatches: potentialMatches || []
    });
  }
  
  res.json(suggestions);
});
app.post("/api/auth/temp-login", async (req, res) => {
  // Temporary passwordless login for Super Admin
  // Valid for 3 hours from creation (this endpoint is the "backdoor")
  const { data: superAdmin } = await supabase
    .from("admins")
    .select("*")
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();

  if (!superAdmin) return res.status(404).json({ error: "Super Admin not found" });

  const token = jwt.sign({ 
    id: superAdmin.id, 
    username: superAdmin.username, 
    role: superAdmin.role, 
    name: superAdmin.name,
    category: superAdmin.category,
    avatar_url: superAdmin.avatar_url
  }, JWT_SECRET, { expiresIn: "24h" });

  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ 
    id: superAdmin.id, 
    username: superAdmin.username, 
    role: superAdmin.role, 
    name: superAdmin.name,
    category: superAdmin.category,
    avatar_url: superAdmin.avatar_url
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for username: ${username}`);
  
  if (!username || !password) {
    return res.status(400).json({ error: "נא להזין שם משתמש וסיסמה" });
  }

  try {
    // Strictly query by username as requested
    const { data: user, error } = await supabase
      .from("admins")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !user) {
      console.log(`User not found or error: ${username}`, error);
      return res.status(400).json({ error: "שם משתמש או סיסמה שגויים" });
    }

    // Direct password comparison as requested
    if (user.password !== password) {
      console.log(`Invalid password for user: ${username}`);
      return res.status(400).json({ error: "שם משתמש או סיסמה שגויים" });
    }

    if (user.status === 'inactive') return res.status(403).json({ error: "משתמש זה אינו פעיל" });
    // if (user.is_approved === 0) return res.status(403).json({ error: "משתמש זה ממתין לאישור מנהל" }); // Commented out as user didn't mention this check for manual table

    const token = jwt.sign({ 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      name: user.name,
      category: user.category,
      avatar_url: user.avatar_url,
      daily_message_template: user.daily_message_template
    }, JWT_SECRET, { expiresIn: "24h" });

    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      name: user.name,
      category: user.category,
      avatar_url: user.avatar_url,
      daily_message_template: user.daily_message_template
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", authenticate, async (req: any, res) => {
  const { data: user } = await supabase
    .from("admins")
    .select("id, username, role, name, category, avatar_url, daily_message_template, daily_message_template_male, daily_message_template_female")
    .eq("id", req.user.id)
    .single();
  res.json(user);
});

app.put("/api/users/me/profile", authenticate, async (req: any, res) => {
  const { avatar_url, daily_message_template, daily_message_template_male, daily_message_template_female } = req.body;
  
  const updates: any = {};
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  if (daily_message_template !== undefined) updates.daily_message_template = daily_message_template;
  if (daily_message_template_male !== undefined) updates.daily_message_template_male = daily_message_template_male;
  if (daily_message_template_female !== undefined) updates.daily_message_template_female = daily_message_template_female;

  if (Object.keys(updates).length > 0) {
    await supabase.from("admins").update(updates).eq("id", req.user.id);
  }
  
  res.json({ message: "Profile updated" });
});

// User Management (Super Admin)
app.get("/api/users", authenticate, async (req: any, res) => {
  let query = supabase
    .from("admins")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (req.user.role === 'team_leader') {
    query = query.or(`category.eq.${req.user.category},secondary_category.eq.${req.user.category}`);
  } else if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { data: users, error } = await query;
  if (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: error.message });
  }
  
  // Flatten creator name
  const formattedUsers = users.map(u => ({
    ...u,
    creator_name: u.creator?.name
  }));

  res.json(formattedUsers);
});

app.post("/api/users", authenticate, async (req: any, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'team_leader') {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { name, username, email, password, role, status, category, secondary_category, gender, phone, google_login_allowed, avatar_url, is_from_file, assigned_group_id, is_shaham_manager } = req.body;
  const normalizedEmail = email?.toLowerCase();
  
  let finalAvatarUrl = avatar_url;
  if (is_from_file && avatar_url && avatar_url.startsWith('http')) {
    const base64 = await downloadImageAsBase64(avatar_url);
    if (base64) finalAvatarUrl = base64;
  }

  const hashedPassword = bcrypt.hashSync(password || "123456", 10);
  const isApproved = req.user.role === 'super_admin' ? 1 : 0;
  const now = new Date().toISOString();

  const { data, error } = await supabase.from("admins").insert({
    name, username, email: normalizedEmail, password: hashedPassword, password_plain: password || "12345678", 
    role: role || 'admin', status: status || 'active', category: category || null, secondary_category: secondary_category || null, 
    gender: gender || null, phone: phone || null, google_login_allowed: google_login_allowed || 'true', 
    avatar_url: finalAvatarUrl || null, is_from_file: is_from_file || 0, is_approved: isApproved, 
    is_shaham_manager: is_shaham_manager || 0, 
    password_updated_at: now, created_by: req.user.id
  }).select().single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: "שם משתמש או אימייל כבר קיימים" });
    return handleSupabaseError(res, error, "admins");
  }
  
  await logActivity(req.user.id, "יצירת מנהל", `נוצר מנהל חדש: ${name} (${username})`, "user", data.id);
  res.json({ id: data.id });
});

app.put("/api/users/:id", authenticate, async (req: any, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'team_leader' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { name, username, email, password, role, status, category, secondary_category, gender, phone, google_login_allowed, avatar_url, assigned_group_id, is_shaham_manager } = req.body;
  const normalizedEmail = email?.toLowerCase();
  
  const { data: existingUser } = await supabase.from("admins").select("avatar_url").eq("id", req.params.id).single();
  const finalAvatar = (avatar_url && avatar_url.trim() !== '') ? avatar_url : existingUser?.avatar_url;

  const updates: any = {
    name, username, email: normalizedEmail, role, status, 
    category, secondary_category, gender, phone, 
    google_login_allowed, avatar_url: finalAvatar, is_shaham_manager: is_shaham_manager || 0
  };

  if (password) {
    updates.password = bcrypt.hashSync(password, 10);
    updates.password_plain = password;
    updates.password_updated_at = new Date().toISOString();
  }

  const { error } = await supabase.from("admins").update(updates).eq("id", req.params.id);
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: "שם משתמש או אימייל כבר קיימים במערכת" });
    return res.status(500).json({ error: error.message });
  }

  await logActivity(req.user.id, "עדכון מנהל", `עודכנו פרטי מנהל: ${name}`, "user", parseInt(req.params.id));
  res.json({ message: "User updated" });
});

app.delete("/api/users/:id", authenticate, isSuperAdmin, async (req: any, res) => {
  const { data: userToDelete } = await supabase.from("admins").select("name").eq("id", req.params.id).single();
  await supabase.from("admins").update({ deleted_at: new Date().toISOString() }).eq("id", req.params.id);
  await logActivity(req.user.id, "מחיקת מנהל", `נמחק מנהל: ${userToDelete?.name}`, "user", parseInt(req.params.id));
  res.json({ message: "User soft deleted" });
});

app.post("/api/users/:id/restore", authenticate, isSuperAdmin, async (req: any, res) => {
  const { data: userToRestore } = await supabase.from("admins").select("name").eq("id", req.params.id).single();
  await supabase.from("admins").update({ deleted_at: null }).eq("id", req.params.id);
  await logActivity(req.user.id, "שחזור מנהל", `שוחזר מנהל: ${userToRestore?.name}`, "user", parseInt(req.params.id));
  res.json({ message: "User restored" });
});

// Authorized Emails
app.get("/api/authorized-emails", authenticate, async (req: any, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Unauthorized" });
  
  const { data, error } = await supabase
    .from("authorized_emails")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/authorized-emails", authenticate, async (req: any, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Unauthorized" });
  
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  
  const { data, error } = await supabase
    .from("authorized_emails")
    .insert({ email: email.toLowerCase(), name: name || null })
    .select()
    .single();
    
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: "אימייל זה כבר מורשה במערכת" });
    return res.status(500).json({ error: error.message });
  }
  
  await logActivity(req.user.id, "הוספת אימייל מורשה", `הוסף אימייל מורשה: ${email}`, "system");
  res.json(data);
});

app.delete("/api/authorized-emails/:id", authenticate, async (req: any, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Unauthorized" });
  
  const { id } = req.params;
  const { data: emailToDelete } = await supabase.from("authorized_emails").select("email").eq("id", id).single();
  
  const { error } = await supabase
    .from("authorized_emails")
    .delete()
    .eq("id", id);
    
  if (error) return res.status(500).json({ error: error.message });
  
  await logActivity(req.user.id, "מחיקת אימייל מורשה", `נמחק אימייל מורשה: ${emailToDelete?.email}`, "system");
  res.json({ success: true });
});

// Matches Routes
app.post("/api/parse-match-text", authenticate, async (req: any, res) => {
  const { text } = req.body;
  
  if (!text) return res.status(400).json({ error: "Text is required" });

  try {
    const prompt = `
      You are an expert at parsing Hebrew matchmaking profiles. 
      Parse the following text into a JSON object. 
      Crucially, determine the 'type' (male or female) based on the name or context if not explicitly stated.
      
      Fields: 
      - type: "male" or "female"
      - name: Full name
      - age: Number
      - height: Height string
      - ethnicity: Origin/Ethnicity
      - marital_status: Current status
      - city: City
      - religious_level: Religious level
      - service: Military/National service
      - occupation: Job/Studies
      - about: Short description about the person
      - looking_for: What they are looking for
      - smoking: Smoking status
      - negiah: Shomer negiah status
      - age_range: Age range looking for
      
      If a field is missing, set it to null.
      Text: ${text}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Empty response from AI");
    
    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to parse text", details: error.message });
  }
});

app.post("/api/matches/demo", authenticate, isSuperAdmin, async (req: any, res) => {
  const demoMatch = {
    type: 'male',
    name: 'משודך דמו',
    age: 25,
    city: 'ירושלים',
    religious_level: 'חרדי',
    occupation: 'סטודנט',
    about: 'זהו כרטיס דמו למטרות בדיקה.',
    looking_for: 'מישהי מתאימה.',
    phone: '0500000000',
    creation_source: 'manual'
  };

  const { data, error } = await supabase.from("matches").insert({
    ...demoMatch,
    created_by: req.user.id
  }).select().single();

  if (error) return handleSupabaseError(res, error, "matches");
  
  await logActivity(req.user.id, "יצירת דמו", "נוצר כרטיס משודך דמו", "match", data.id);
  res.json({ id: data.id });
});

app.get("/api/matches/confirmed", authenticate, async (req, res) => {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("is_published_confirmed", 1)
    .is("deleted_at", null);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(matches);
});

app.get("/api/matches/:id/publications", authenticate, async (req, res) => {
  const { data: logs, error } = await supabase
    .from("publish_logs")
    .select(`
      *,
      user:users(name)
    `)
    .eq("match_id", req.params.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  
  const formattedLogs = logs.map(log => ({
    ...log,
    user_name: log.user?.name
  }));

  res.json(formattedLogs);
});

app.get("/api/matches/:id/publish-logs", authenticate, async (req: any, res) => {
  const { data: logs, error } = await supabase
    .from("publish_logs")
    .select(`
      *,
      user:users(name)
    `)
    .eq("match_id", req.params.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  
  const formattedLogs = logs.map(log => ({
    ...log,
    user_name: log.user?.name
  }));

  res.json(formattedLogs);
});

app.get("/api/matches", authenticate, async (req: any, res) => {
  let query = supabase
    .from("matches")
    .select(`
      *,
      creator:users!matches_created_by_fkey(name, category, gender, phone)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (req.user.role !== 'super_admin') {
    query = query.eq("created_by", req.user.id);
  }

  const { data: matches, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const formattedMatches = matches.map(m => ({
    ...m,
    creator_name: m.creator?.name,
    creator_category: m.creator?.category,
    creator_gender: m.creator?.gender,
    creator_phone: m.creator?.phone
  }));

  res.json(formattedMatches);
});

app.post("/api/matches", authenticate, async (req: any, res) => {
  const m = req.body;
  const force = req.query.force === 'true';

  // Duplicate check
  if (!force && m.phone) {
    const { data: existing } = await supabase
      .from("matches")
      .select("*")
      .eq("phone", m.phone)
      .eq("name", m.name)
      .eq("city", m.city)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ 
        error: "משודך זה כבר קיים במערכת", 
        existingMatch: existing,
        message: "נמצא משודך עם פרטים זהים (שם, עיר ומספר טלפון). האם ברצונך להוסיף אותו שוב?"
      });
    }
  }
  
  // If image_url is a remote URL and creation_source is csv, try to download it
  let finalImageUrl = m.image_url;
  if (m.creation_source === 'csv' && m.image_url && m.image_url.startsWith('http')) {
    const base64 = await downloadImageAsBase64(m.image_url);
    if (base64) finalImageUrl = base64;
  }

  const { data, error } = await supabase.from("matches").insert({
    type: m.type, name: m.name, age: m.age ?? null, height: m.height ?? null, ethnicity: m.ethnicity ?? null, marital_status: m.marital_status ?? null, city: m.city ?? null,
    religious_level: m.religious_level ?? null, service: m.service ?? null, occupation: m.occupation ?? null, about: m.about ?? null, looking_for: m.looking_for ?? null,
    smoking: m.smoking ?? null, negiah: m.negiah ?? null, age_range: m.age_range ?? null, image_url: finalImageUrl ?? null, additional_images: m.additional_images ?? null, 
    phone: m.phone ?? null, crop_config: m.crop_config ?? null, creation_source: m.creation_source || 'manual', created_by: req.user.id
  }).select().single();

  if (error) return handleSupabaseError(res, error, "matches");
  
  await logActivity(req.user.id, "יצירת משודך", `נוצר כרטיס חדש: ${m.name} (${m.type === 'male' ? 'בן' : 'בת'})`, "match", data.id);
  res.json({ id: data.id });
});

app.put("/api/matches/:id", authenticate, async (req: any, res) => {
  const m = req.body;
  const { data: match } = await supabase.from("matches").select("*").eq("id", req.params.id).single();
  
  if (!match) return res.status(404).json({ error: "Match not found" });
  if (req.user.role !== 'super_admin' && match.created_by !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { error } = await supabase.from("matches").update({
    type: m.type, name: m.name, age: m.age ?? null, height: m.height ?? null, ethnicity: m.ethnicity ?? null, marital_status: m.marital_status ?? null, city: m.city ?? null,
    religious_level: m.religious_level ?? null, service: m.service ?? null, occupation: m.occupation ?? null, about: m.about ?? null, looking_for: m.looking_for ?? null,
    smoking: m.smoking ?? null, negiah: m.negiah ?? null, age_range: m.age_range ?? null, image_url: m.image_url ?? null, additional_images: m.additional_images ?? null, 
    phone: m.phone ?? null, crop_config: m.crop_config ?? null
  }).eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  
  await logActivity(req.user.id, "עדכון משודך", `עודכן כרטיס: ${m.name}`, "match", parseInt(req.params.id));
  res.json({ message: "Match updated" });
});

app.delete("/api/matches/:id", authenticate, async (req: any, res) => {
  const { data: match } = await supabase.from("matches").select("*").eq("id", req.params.id).single();
  if (!match) return res.status(404).json({ error: "Match not found" });
  if (req.user.role !== 'super_admin' && match.created_by !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  
  await supabase.from("matches").update({ deleted_at: new Date().toISOString() }).eq("id", req.params.id);
  await logActivity(req.user.id, "מחיקת משודך", `נמחק כרטיס: ${match.name}`, "match", parseInt(req.params.id));
  res.json({ message: "Match soft deleted" });
});

app.post("/api/matches/:id/restore", authenticate, async (req: any, res) => {
  const { data: match } = await supabase.from("matches").select("*").eq("id", req.params.id).single();
  if (!match) return res.status(404).json({ error: "Match not found" });
  if (req.user.role !== 'super_admin' && match.created_by !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  
  await supabase.from("matches").update({ deleted_at: null }).eq("id", req.params.id);
  await logActivity(req.user.id, "שחזור משודך", `שוחזר כרטיס: ${match.name}`, "match", parseInt(req.params.id));
  res.json({ message: "Match restored" });
});

app.post("/api/matches/:id/publish", authenticate, async (req: any, res) => {
  const { groupName } = req.body;
  const { data: match } = await supabase.from("matches").select("name").eq("id", req.params.id).single();
  
  await supabase.rpc('increment_publish_count', { match_id: req.params.id });
  await supabase.from("matches").update({ 
    last_published_at: new Date().toISOString(),
    is_published_confirmed: 0 
  }).eq("id", req.params.id);
  
  if (groupName) {
    await supabase.from("publish_logs").insert({
      match_id: req.params.id,
      user_id: req.user.id,
      group_name: groupName
    });
  }

  await logActivity(req.user.id, "פרסום משודך", `פורסם כרטיס: ${match?.name} ${groupName ? `בקבוצה: ${groupName}` : ''}`, "match", parseInt(req.params.id));
  res.json({ message: "Published status updated" });
});

app.get("/api/publish-logs", authenticate, async (req: any, res) => {
  const { data: logs, error } = await supabase
    .from("publish_logs")
    .select(`
      *,
      match:matches(name),
      user:users(name)
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });
  
  const formattedLogs = logs.map(log => ({
    ...log,
    match_name: log.match?.name,
    user_name: log.user?.name
  }));

  res.json(formattedLogs);
});

app.put("/api/matches/:id/confirm-publish", authenticate, async (req: any, res) => {
  const { confirmed } = req.body;
  await supabase.from("matches").update({ is_published_confirmed: confirmed ? 1 : 0 }).eq("id", req.params.id);
  res.json({ message: "Publication status confirmed" });
});

// Settings
app.get("/api/settings", authenticate, async (req, res) => {
  const { data: settings, error } = await supabase.from("settings").select("*");
  if (error) return res.status(500).json({ error: error.message });
  
  const obj = settings.reduce((acc: any, s: any) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
  res.json(obj);
});

app.post("/api/settings", authenticate, isSuperAdmin, async (req, res) => {
  const { key, value } = req.body;
  await supabase.from("settings").upsert({ key, value });
  res.json({ message: "Setting updated" });
});

// WhatsApp Groups Management
app.get("/api/whatsapp/groups", authenticate, async (req: any, res) => {
  const { data: groups, error } = await supabase.from("whatsapp_groups").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(groups);
});

app.put("/api/whatsapp/groups/:id", authenticate, isSuperAdmin, async (req, res) => {
  const { name, link, whapi_id, category, type } = req.body;
  await supabase.from("whatsapp_groups").update({ name, link, whapi_id, category, type }).eq("id", req.params.id);
  res.json({ message: "Group updated" });
});

app.post("/api/whatsapp/groups", authenticate, isSuperAdmin, async (req, res) => {
  const { name, link, whapi_id, category, type } = req.body;
  const { data, error } = await supabase.from("whatsapp_groups").insert({ name, link, whapi_id, category, type }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

app.delete("/api/whatsapp/groups/:id", authenticate, isSuperAdmin, async (req, res) => {
  await supabase.from("whatsapp_groups").delete().eq("id", req.params.id);
  res.json({ message: "Group deleted" });
});

app.post("/api/whatsapp/initial-sent", authenticate, async (req: any, res) => {
  const { groupId, method = 'manual' } = req.body;
  const now = new Date().toISOString();
  await supabase.from("whatsapp_groups").update({ last_initial_sent: now, last_initial_sent_method: method }).eq("id", groupId);
  res.json({ message: "Initial message status updated" });
});

// Stats
app.get("/api/daily-suggestions", authenticate, async (req: any, res) => {
  try {
    // Get 3 random matches of the current user
    const { data: myMatches } = await supabase
      .from("matches")
      .select("*")
      .eq("created_by", req.user.id)
      .is("deleted_at", null)
      .limit(3);

    if (!myMatches) return res.json([]);

    const suggestions = [];
    for (const match of myMatches) {
      const oppositeGender = match.type === 'male' ? 'female' : 'male';
      const { data: potentialMatches } = await supabase
        .from("matches")
        .select(`
          *,
          creator:users(name)
        `)
        .eq("type", oppositeGender)
        .is("deleted_at", null)
        .neq("created_by", req.user.id)
        .limit(2);
      
      suggestions.push({
        match,
        potentialMatches: (potentialMatches || []).map(pm => ({
          ...pm,
          creator_name: pm.creator?.name
        }))
      });
    }

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch daily suggestions" });
  }
});

app.get("/api/stats", authenticate, async (req: any, res) => {
  const userId = req.user.role === 'super_admin' ? null : req.user.id;
  
  const getCount = async (table: string, filters: any = {}) => {
    let query = supabase.from(table).select("*", { count: 'exact', head: true });
    if (userId && table === 'matches') query = query.eq("created_by", userId);
    for (const [key, val] of Object.entries(filters)) {
      if (val === null) query = query.is(key, null);
      else query = query.eq(key, val);
    }
    const { count } = await query;
    return count || 0;
  };

  const males = await getCount("matches", { type: 'male', deleted_at: null });
  const females = await getCount("matches", { type: 'female', deleted_at: null });
  const neverPublished = await getCount("matches", { last_published_at: null, deleted_at: null });
  
  // Published today is a bit harder with Supabase head query, but we can use gte
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: publishedToday } = await supabase
    .from("matches")
    .select("*", { count: 'exact', head: true })
    .gte("last_published_at", today.toISOString())
    .is("deleted_at", null);

  const totalAdmins = await getCount("users");
  const adminMales = await getCount("users", { gender: 'male' });
  const adminFemales = await getCount("users", { gender: 'female' });

  res.json({
    males,
    females,
    publishedToday: publishedToday || 0,
    neverPublished,
    totalAdmins,
    adminMales,
    adminFemales
  });
});

// Activity Logs
app.get("/api/activity-logs", authenticate, async (req: any, res) => {
  const { userId, dateFrom, dateTo } = req.query;
  let query = supabase
    .from("activity_logs")
    .select(`
      *,
      user:users(name)
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (req.user.role !== 'super_admin') {
    query = query.eq("user_id", req.user.id);
  } else if (userId) {
    query = query.eq("user_id", userId);
  }

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: logs, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  
  const formattedLogs = logs.map(log => ({
    ...log,
    user_name: log.user?.name
  }));

  res.json(formattedLogs);
});

// Whapi API Simulation/Integration
const WHAPI_TOKEN = "CsgREhpSx2u7dPFF40pvR49erXRj9kH7";
const WHAPI_BASE_URL = "https://gate.whapi.cloud";

const whapiFetch = async (endpoint: string, options: any = {}) => {
  if (!WHAPI_TOKEN) return null;
  
  const res = await fetch(`${WHAPI_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${WHAPI_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error(`Whapi error (${endpoint}):`, error);
    return null;
  }
  
  return res.json();
};

app.get("/api/whatsapp/messages/:groupId", authenticate, async (req, res) => {
  let { groupId } = req.params;
  
  // Try real Whapi first if token exists
  // Be lenient: if it's a long number without @, try appending @g.us
  let whapiGroupId = groupId;
  if (whapiGroupId && !whapiGroupId.includes('@') && /^\d+$/.test(whapiGroupId)) {
    whapiGroupId = `${whapiGroupId}@g.us`;
  }

  if (WHAPI_TOKEN && whapiGroupId && whapiGroupId.includes('@')) {
    const data = await whapiFetch(`/messages/list/${whapiGroupId}?count=20`);
    if (data && data.messages) {
      return res.json(data.messages.map((m: any) => {
        let text = m.text?.body || m.caption || (m.type === 'image' ? '[תמונה]' : '[הודעה]');
        let sender = m.from_name || (m.from_me ? 'אני' : 'משתמש');
        
        // Try to extract sender from signature if it's from me
        if (m.from_me && text.includes('*מאת המנהל')) {
          const match = text.match(/\*מאת המנהל ([^*]+):\*\n\n?/);
          if (match) {
            sender = match[1];
            text = text.replace(/\*מאת המנהל ([^*]+):\*\n\n?/, '');
          }
        } else if (m.from_me && text.startsWith('*') && text.includes(':*\n')) {
          // Fallback for old format
          const match = text.match(/^\*([^*]+):\*\n/);
          if (match) {
            sender = match[1];
            text = text.replace(/^\*([^*]+):\*\n/, '');
          }
        }
        
        return {
          id: m.id,
          text,
          image: m.image?.link || m.image?.url || null,
          sender,
          timestamp: new Date(m.timestamp * 1000).toISOString(),
          type: m.from_me ? 'me' : 'other'
        };
      }));
    }
  }

  // Fallback to simulation (local logs)
  // First, try to find the group name if groupId is a whapi_id
  let groupNameFilter = groupId;
  const { data: group } = await supabase
    .from("whatsapp_groups")
    .select("name")
    .or(`whapi_id.eq.${groupId},name.eq.${groupId}`)
    .maybeSingle();
    
  if (group) {
    groupNameFilter = group.name;
  }

  const { data: logs, error: logsError } = await supabase
    .from("publish_logs")
    .select(`
      *,
      match:matches(name),
      user:users(name)
    `)
    .eq("group_name", groupNameFilter)
    .order("created_at", { ascending: false })
    .limit(20);
  
  if (logsError) return res.status(500).json({ error: logsError.message });

  res.json(logs.map((l: any) => ({
    id: l.id,
    text: l.match?.name ? `פורסם כרטיס: ${l.match.name}` : 'הודעה נשלחה',
    sender: l.user?.name,
    timestamp: l.created_at,
    type: 'system'
  })));
});

app.post("/api/whatsapp/send", authenticate, async (req: any, res) => {
  const { groupId, text, matchId, includeImage, matchImage, includeOpening, senderName: overrideSenderName } = req.body;
  
  const senderName = overrideSenderName || req.user.name;
  const signature = `*מאת המנהל ${senderName}:*\n\n`;
  const fullText = text ? `${signature}${text}` : "";
  
  console.log(`Sending to WhatsApp Group ${groupId}: ${fullText}`);

  let success = true;

  // Real Whapi Integration
  if (WHAPI_TOKEN && groupId && groupId.includes('@')) {
    if (includeImage && matchImage) {
      const imageRes = await whapiFetch('/messages/image', {
        method: 'POST',
        body: JSON.stringify({
          to: groupId,
          media: matchImage,
          caption: fullText
        })
      });
      if (!imageRes) success = false;
    } else {
      const textRes = await whapiFetch('/messages/text', {
        method: 'POST',
        body: JSON.stringify({
          to: groupId,
          body: fullText
        })
      });
      if (!textRes) success = false;
    }
  }
  
  if (success && includeOpening) {
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from("whatsapp_groups")
      .update({ last_initial_sent: today, last_initial_sent_method: 'auto' })
      .or(`whapi_id.eq.${groupId},name.eq.${groupId}`);
  }

  if (matchId && success) {
    // Try to get real group name for logging
    const { data: group } = await supabase
      .from("whatsapp_groups")
      .select("name")
      .or(`whapi_id.eq.${groupId},name.eq.${groupId}`)
      .maybeSingle();
      
    const finalGroupName = group?.name || groupId;

    await supabase.from("publish_logs").insert({
      match_id: matchId,
      user_id: req.user.id,
      group_name: finalGroupName
    });
    
    // Increment publish count manually if RPC is not available
    const { data: match } = await supabase.from("matches").select("publish_count").eq("id", matchId).single();
    const newCount = (match?.publish_count || 0) + 1;
    
    await supabase.from("matches").update({ 
      last_published_at: new Date().toISOString(), 
      publish_count: newCount 
    }).eq("id", matchId);
      
    await logActivity(req.user.id, "פרסום בוואטסאפ", `פורסם כרטיס מזהה ${matchId} בקבוצה ${finalGroupName}`, "match", matchId);
  } else if (success) {
    await logActivity(req.user.id, "שליחת הודעה", `נשלחה הודעה חופשית: ${text.substring(0, 30)}...`, "system");
  }

  if (!success) {
    return res.status(500).json({ success: false, error: "שגיאה בשליחה דרך Whapi" });
  }

  // Update UI live
  const messageData = {
    id: Date.now().toString(),
    text: text,
    image: includeImage ? matchImage : null,
    sender: senderName,
    timestamp: new Date().toISOString(),
    type: 'me',
    chatId: groupId
  };
  io.to(groupId).emit("new_message", messageData);

  res.json({ success: true, message: "ההודעה נשלחה בהצלחה" });
});

app.delete("/api/whatsapp/messages/:messageId", authenticate, async (req: any, res) => {
  const { messageId } = req.params;
  const { groupId } = req.query;

  console.log(`Deleting message ${messageId} from group ${groupId}`);

  let success = true;

  // Real Whapi Integration
  if (WHAPI_TOKEN && messageId && !messageId.startsWith('local_')) {
    const deleteRes = await whapiFetch(`/messages/${messageId}`, {
      method: 'DELETE'
    });
    if (!deleteRes) success = false;
  }

  if (success) {
    io.to(groupId as string).emit("message_deleted", { messageId, groupId });
    res.json({ success: true });
  } else {
    res.status(500).json({ error: "שגיאה במחיקת ההודעה" });
  }
});

// Whapi Webhook
const TARGET_ID = '120363210658789236@g.us';

app.post("/api/whatsapp/webhook", async (req, res) => {
  const { messages } = req.body;
  
  if (messages && Array.isArray(messages)) {
    // Get all assigned group IDs from active managers
    const { data: activeManagers } = await supabase
      .from("users")
      .select("assigned_group_id")
      .eq("status", "active")
      .not("assigned_group_id", "is", null);
      
    const allowedGroupIds = new Set((activeManagers || []).map(m => m.assigned_group_id));
    allowedGroupIds.add(TARGET_ID);

    messages.forEach(m => {
      const chatId = m.chat_id;
      if (!chatId) return;

      // השורה הזו היא ה"מנעול" - היא חייבת להיות ראשונה!
      if (!allowedGroupIds.has(chatId) && !allowedGroupIds.has(chatId.split('@')[0])) {
        return; // כאן המערכת עוצרת ולא מציגה כלום משאר הקבוצות
      }

      let text = m.text?.body || m.caption || (m.type === 'image' ? '[תמונה]' : '[הודעה]');
      let sender = m.from_name || (m.from_me ? 'אני' : 'משתמש');
      
      // Try to extract sender from signature if it's from me
      if (m.from_me && text.includes('*מאת המנהל')) {
        const match = text.match(/\*מאת המנהל ([^*]+):\*\n\n/);
        if (match) {
          sender = match[1];
          text = text.replace(/\*מאת המנהל ([^*]+):\*\n\n/, '');
        } else {
          const match2 = text.match(/\*מאת המנהל ([^*]+):\*\n/);
          if (match2) {
            sender = match2[1];
            text = text.replace(/\*מאת המנהל ([^*]+):\*\n/, '');
          }
        }
      }

      const messageData = {
        id: m.id,
        text,
        image: m.image?.link || m.image?.url || null,
        sender,
        timestamp: new Date((m.timestamp || Date.now() / 1000) * 1000).toISOString(),
        type: m.from_me ? 'me' : 'other',
        chatId
      };

      // Broadcast to the specific group room
      io.to(chatId).emit("new_message", messageData);
      
      // Also broadcast to the "clean" ID if it's a group
      if (chatId.includes('@')) {
        const cleanId = chatId.split('@')[0];
        io.to(cleanId).emit("new_message", messageData);
      }
    });
  }
  
  res.sendStatus(200);
});

const onlineUsers = new Map<number, string>(); // userId -> socketId

// Socket.io Connection
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  
  socket.on("user_login", (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is online with socket ${socket.id}`);
      io.emit("online_users", Array.from(onlineUsers.keys()));
    }
  });

  socket.on("join_group", (groupId) => {
    if (groupId) {
      socket.join(groupId);
      // Also join the clean version
      if (groupId.includes('@')) {
        socket.join(groupId.split('@')[0]);
      }
      console.log(`Socket ${socket.id} joined group: ${groupId}`);
    }
  });

  socket.on("send_internal_message", async (data: { senderId: number, receiverId: number, text: string, matchId?: number }) => {
    try {
      const { senderId, receiverId, text, matchId } = data;
      
      const { data: insertedMsg, error: insertError } = await supabase
        .from("internal_messages")
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          text,
          match_id: matchId || null
        })
        .select().single();
      
      if (insertError) throw insertError;

      const { data: message, error: fetchError } = await supabase
        .from("internal_messages")
        .select(`
          *,
          sender:users!internal_messages_sender_id_fkey(name),
          match:matches(name, type, age, city)
        `)
        .eq("id", insertedMsg.id)
        .single();
      
      if (fetchError) throw fetchError;

      // Flatten for client
      const formattedMsg = {
        ...message,
        sender_name: message.sender?.name,
        match_name: message.match?.name,
        match_type: message.match?.type,
        match_age: message.match?.age,
        match_city: message.match?.city
      };

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new_internal_message", formattedMsg);
      }

      // Send confirmation to sender
      socket.emit("internal_message_sent", formattedMsg);

      // Create notification for receiver
      const { data: sender } = await supabase.from("users").select("name").eq("id", senderId).single();
      const notificationText = `הודעה חדשה מ${sender?.name || 'מנהל'}`;
      
      await supabase.from("notifications").insert({
        user_id: receiverId,
        text: notificationText,
        type: 'chat'
      });
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new_notification", { text: notificationText, type: 'chat' });
      }
    } catch (err) {
      console.error("Failed to send internal message:", err);
    }
  });

  socket.on("disconnect", () => {
    let disconnectedUserId: number | null = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      console.log(`User ${disconnectedUserId} disconnected`);
      io.emit("online_users", Array.from(onlineUsers.keys()));
    }
    console.log("Client disconnected:", socket.id);
  });
});

async function startServer() {
  console.log("Starting server in", process.env.NODE_ENV || "development", "mode...");
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
