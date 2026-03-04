import express from "express";
console.log("Server script starting...");
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { Server as SocketServer } from "socket.io";
import http from "http";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Checking database file...");
if (fs.existsSync("shidduchim.db")) {
  const stats = fs.statSync("shidduchim.db");
  console.log(`Database file exists. Size: ${stats.size} bytes`);
} else {
  console.log("Database file does not exist. It will be created.");
}
const db = new Database("shidduchim.db");
console.log("Database connection established.");
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

// Initialize Database
console.log("Initializing database...");
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      password_plain TEXT,
      role TEXT CHECK(role IN ('super_admin', 'admin', 'team_leader', 'viewer')) DEFAULT 'admin',
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      category TEXT,
      secondary_category TEXT,
      gender TEXT CHECK(gender IN ('male', 'female')),
      phone TEXT,
      google_login_allowed TEXT CHECK(google_login_allowed IN ('true', 'false')) DEFAULT 'true',
      avatar_url TEXT,
      deleted_at DATETIME,
      daily_message_template TEXT,
      daily_message_template_male TEXT,
      daily_message_template_female TEXT,
      assigned_group_id TEXT,
      is_from_file INTEGER DEFAULT 0,
      is_approved INTEGER DEFAULT 1,
      is_shaham_manager INTEGER DEFAULT 0,
      password_updated_at DATETIME,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS internal_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      match_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(receiver_id) REFERENCES users(id),
      FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      type TEXT CHECK(type IN ('male', 'female')) NOT NULL,
      name TEXT NOT NULL,
      link TEXT,
      whapi_id TEXT,
      last_initial_sent DATETIME,
      last_initial_sent_method TEXT
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('male', 'female')) NOT NULL,
      name TEXT NOT NULL,
      age INTEGER,
      height TEXT,
      ethnicity TEXT,
      marital_status TEXT,
      city TEXT,
      religious_level TEXT,
      service TEXT,
      occupation TEXT,
      about TEXT,
      looking_for TEXT,
      smoking TEXT,
      negiah TEXT,
      age_range TEXT,
      image_url TEXT,
      additional_images TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      last_published_at DATETIME,
      publish_count INTEGER DEFAULT 0,
      phone TEXT,
      is_published_confirmed INTEGER DEFAULT 0,
      crop_config TEXT,
      creation_source TEXT,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS publish_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER,
      user_id INTEGER,
      group_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  console.log("Database tables initialized.");
} catch (err) {
  console.error("Failed to initialize database tables:", err);
}

// Migrations for existing tables
const migrate = () => {
  console.log("Running migrations...");
  const tables = {
    users: ['gender', 'phone', 'category', 'secondary_category', 'google_login_allowed', 'avatar_url', 'deleted_at', 'daily_message_template', 'daily_message_template_male', 'daily_message_template_female', 'assigned_group_id', 'is_from_file', 'is_approved', 'created_by', 'password_plain', 'is_shaham_manager', 'password_updated_at'],
    whatsapp_groups: ['whapi_id', 'last_initial_sent', 'last_initial_sent_method'],
    matches: ['deleted_at', 'last_published_at', 'publish_count', 'phone', 'is_published_confirmed', 'crop_config', 'creation_source']
  };

  for (const [table, columns] of Object.entries(tables)) {
    try {
      const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
      const existingColumns = info.map(c => c.name);
      
      for (const column of columns) {
        if (!existingColumns.includes(column)) {
          try {
            let type = 'TEXT';
            if (column === 'publish_count' || column === 'created_by' || column === 'is_from_file' || column === 'is_approved' || column === 'is_shaham_manager') type = 'INTEGER';
            if (column.includes('at')) type = 'DATETIME';
            
            db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
            console.log(`Added column ${column} to table ${table}`);
          } catch (err) {
            console.error(`Error adding column ${column} to ${table}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`Error checking table info for ${table}:`, err);
    }
  }
  console.log("Migrations complete.");
};

migrate();

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

const logActivity = (userId: number, action: string, details: string, entityType?: string, entityId?: number) => {
  db.prepare("INSERT INTO activity_logs (user_id, action, details, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)")
    .run(userId, action, details, entityType || null, entityId || null);
};

// Seed WhatsApp Groups if empty
const groupCount = db.prepare("SELECT COUNT(*) as count FROM whatsapp_groups").get() as any;
if (groupCount.count === 0) {
  const insertGroup = db.prepare("INSERT INTO whatsapp_groups (category, type, name, link) VALUES (?, ?, ?, ?)");
  CATEGORIES.forEach(cat => {
    insertGroup.run(cat, 'male', `קבוצת בנים ${cat}`, "");
    insertGroup.run(cat, 'female', `קבוצת בנות ${cat}`, "");
  });
} else {
  // Add missing groups for new categories
  const existingGroups = db.prepare("SELECT category FROM whatsapp_groups GROUP BY category").all() as any[];
  const existingCategories = existingGroups.map(g => g.category);
  const insertGroup = db.prepare("INSERT INTO whatsapp_groups (category, type, name, link) VALUES (?, ?, ?, ?)");
  
  CATEGORIES.forEach(cat => {
    if (!existingCategories.includes(cat)) {
      insertGroup.run(cat, 'male', `קבוצת בנים ${cat}`, "");
      insertGroup.run(cat, 'female', `קבוצת בנות ${cat}`, "");
    }
  });
}

// Seed Super Admin if not exists
const superAdmin = db.prepare("SELECT * FROM users WHERE role = 'super_admin'").get();
if (!superAdmin) {
  const hashedPassword = bcrypt.hashSync("good", 10);
  db.prepare("INSERT INTO users (name, username, email, password, password_plain, role, status, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run("מנהל ראשי", "good", "admin@shidduchim.com", hashedPassword, "good", "super_admin", "active", 1);
} else {
  // Ensure existing super admin is approved
  db.prepare("UPDATE users SET is_approved = 1 WHERE role = 'super_admin'").run();
}
// Removed the automatic update that was resetting credentials on every boot

// Seed default settings
console.log("Initializing settings...");
try {
  const defaultTemplate = db.prepare("SELECT * FROM settings WHERE key = 'whatsapp_template'").get();
  if (!defaultTemplate) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("whatsapp_template", "כרטיס חדש במערכת השידוכים:");
  }

  const googleLoginSetting = db.prepare("SELECT * FROM settings WHERE key = 'google_login_enabled'").get();
  if (!googleLoginSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("google_login_enabled", "true");
  }

  const maleGroupSetting = db.prepare("SELECT * FROM settings WHERE key = 'whatsapp_group_males'").get();
  if (!maleGroupSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("whatsapp_group_males", "");
  }

  const femaleGroupSetting = db.prepare("SELECT * FROM settings WHERE key = 'whatsapp_group_females'").get();
  if (!femaleGroupSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("whatsapp_group_females", "");
  }

  const maleGroupNameSetting = db.prepare("SELECT * FROM settings WHERE key = 'whatsapp_group_males_name'").get();
  if (!maleGroupNameSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("whatsapp_group_males_name", "קבוצת בנים");
  }

  const femaleGroupNameSetting = db.prepare("SELECT * FROM settings WHERE key = 'whatsapp_group_females_name'").get();
  if (!femaleGroupNameSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("whatsapp_group_females_name", "קבוצת בנות");
  }

  const initialMessageSetting = db.prepare("SELECT * FROM settings WHERE key = 'whatsapp_initial_message'").get();
  if (!initialMessageSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("whatsapp_initial_message", "בוקר טוב לכולם! מיד נתחיל בפרסום כרטיסים חדשים...");
  }

  const lastInitialMaleSetting = db.prepare("SELECT * FROM settings WHERE key = 'last_initial_sent_males'").get();
  if (!lastInitialMaleSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("last_initial_sent_males", "");
  }

  const lastInitialFemaleSetting = db.prepare("SELECT * FROM settings WHERE key = 'last_initial_sent_females'").get();
  if (!lastInitialFemaleSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("last_initial_sent_females", "");
  }
  console.log("Settings initialized.");
} catch (err) {
  console.error("Error initializing settings:", err);
}

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

    // Check if user exists in DB
    const normalizedEmail = googleUser.email.toLowerCase();
    let user: any = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(normalizedEmail);

    if (!user) {
      return res.send(`
        <html>
          <body>
            <script>
              alert("משתמש זה אינו רשום במערכת. פנה למנהל הראשי.");
              window.close();
            </script>
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
app.get("/api/internal-messages/:otherUserId", authenticate, (req, res) => {
  const userId = (req as any).user.id;
  const { otherUserId } = req.params;
  const messages = db.prepare(`
    SELECT im.*, u.name as sender_name,
           m.name as match_name, m.type as match_type, m.age as match_age, m.city as match_city
    FROM internal_messages im
    JOIN users u ON im.sender_id = u.id 
    LEFT JOIN matches m ON im.match_id = m.id
    WHERE (im.sender_id = ? AND im.receiver_id = ?) OR (im.sender_id = ? AND im.receiver_id = ?)
    ORDER BY im.created_at ASC
  `).all(userId, otherUserId, otherUserId, userId);
  res.json(messages);
});

app.delete("/api/internal-messages/:id", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  // Only allow deleting own messages
  const message: any = db.prepare("SELECT * FROM internal_messages WHERE id = ?").get(id);
  if (!message) return res.status(404).json({ error: "Message not found" });
  if (message.sender_id !== userId) return res.status(403).json({ error: "Forbidden" });

  db.prepare("DELETE FROM internal_messages WHERE id = ?").run(id);
  res.json({ success: true });
});

// Notifications
app.get("/api/notifications", authenticate, (req, res) => {
  const userId = (req as any).user.id;
  const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(userId);
  res.json(notifications);
});

app.put("/api/notifications/read", authenticate, (req, res) => {
  const userId = (req as any).user.id;
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
  res.json({ success: true });
});

// Online Users
app.get("/api/online-users", authenticate, (req, res) => {
  res.json(Array.from(onlineUsers.keys()));
});

// Change Password
app.post("/api/users/change-password", authenticate, (req, res) => {
  const userId = (req as any).user.id;
  const { oldPassword, newPassword } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: "סיסמה ישנה שגויה" });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password = ?, password_plain = ? WHERE id = ?").run(hashedPassword, newPassword, userId);
  
  logActivity(userId, "שינוי סיסמה", "המשתמש שינה את סיסמתו");
  res.json({ success: true });
});

// Approve User
app.post("/api/users/approve/:id", authenticate, (req, res) => {
  const userRole = (req as any).user.role;
  if (userRole !== 'super_admin') return res.status(403).json({ error: "Unauthorized" });

  const { id } = req.params;
  db.prepare("UPDATE users SET is_approved = 1 WHERE id = ?").run(id);
  res.json({ success: true });
});

// Match Suggestions
app.get("/api/matches/suggestions", authenticate, (req, res) => {
  const userId = (req as any).user.id;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  
  // Get 3 random matches of the current user
  const myMatches = db.prepare("SELECT * FROM matches WHERE created_by = ? AND deleted_at IS NULL ORDER BY RANDOM() LIMIT 3").all(userId) as any[];
  
  const suggestions = myMatches.map(match => {
    // Find opposite gender matches from others (or same user)
    const oppositeGender = match.type === 'male' ? 'female' : 'male';
    const potentialMatches = db.prepare(`
      SELECT * FROM matches 
      WHERE type = ? AND deleted_at IS NULL 
      ORDER BY RANDOM() LIMIT 5
    `).all(oppositeGender) as any[];
    
    return {
      match,
      potentialMatches
    };
  });
  
  res.json(suggestions);
});
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  
  // Normalize input for phone search (remove non-digits)
  const normalizedInput = username.replace(/\D/g, '');
  
  // Try finding by username OR phone (exact or normalized) OR name OR email
  const user: any = db.prepare(`
    SELECT * FROM users 
    WHERE username = ? 
    OR name = ?
    OR email = ?
    OR phone = ? 
    OR REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '+', '') = ?
  `).get(username, username, username, username, normalizedInput);

  if (!user) return res.status(400).json({ error: "משתמש לא קיים" });
  if (user.status === 'inactive') return res.status(403).json({ error: "משתמש זה אינו פעיל" });
  if (user.is_approved === 0) return res.status(403).json({ error: "משתמש זה ממתין לאישור מנהל" });
  
  if (!user.password) {
    return res.status(400).json({ error: "למשתמש זה אין סיסמה מוגדרת. נסה להתחבר עם גוגל." });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) return res.status(400).json({ error: "סיסמה שגויה" });

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
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", authenticate, (req: any, res) => {
  const user = db.prepare("SELECT id, username, role, name, category, avatar_url, daily_message_template, daily_message_template_male, daily_message_template_female FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

app.put("/api/users/me/profile", authenticate, (req: any, res) => {
  const { avatar_url, daily_message_template, daily_message_template_male, daily_message_template_female } = req.body;
  
  const updates: string[] = [];
  const params: any[] = [];

  if (avatar_url !== undefined) {
    updates.push("avatar_url = ?");
    params.push(avatar_url);
  }
  if (daily_message_template !== undefined) {
    updates.push("daily_message_template = ?");
    params.push(daily_message_template);
  }
  if (daily_message_template_male !== undefined) {
    updates.push("daily_message_template_male = ?");
    params.push(daily_message_template_male);
  }
  if (daily_message_template_female !== undefined) {
    updates.push("daily_message_template_female = ?");
    params.push(daily_message_template_female);
  }

  if (updates.length > 0) {
    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }
  
  res.json({ message: "Profile updated" });
});

// User Management (Super Admin)
app.get("/api/users", authenticate, (req: any, res) => {
  if (req.user.role === 'super_admin') {
    const users = db.prepare(`
      SELECT u.*, creator.name as creator_name 
      FROM users u 
      LEFT JOIN users creator ON u.created_by = creator.id 
      WHERE u.deleted_at IS NULL 
      ORDER BY u.created_at DESC
    `).all();
    res.json(users);
  } else if (req.user.role === 'team_leader') {
    const users = db.prepare(`
      SELECT u.*, creator.name as creator_name 
      FROM users u 
      LEFT JOIN users creator ON u.created_by = creator.id 
      WHERE u.deleted_at IS NULL AND (u.category = ? OR u.secondary_category = ?)
      ORDER BY u.created_at DESC
    `).all(req.user.category, req.user.category);
    res.json(users);
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
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

  try {
    const result = db.prepare(`
      INSERT INTO users (
        name, username, email, password, password_plain, role, status, 
        category, secondary_category, gender, phone, google_login_allowed, 
        avatar_url, is_from_file, is_approved, assigned_group_id, is_shaham_manager, password_updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, username, normalizedEmail, hashedPassword, password || "12345678", 
      role || 'admin', status || 'active', category || null, secondary_category || null, 
      gender || null, phone || null, google_login_allowed || 'true', 
      finalAvatarUrl || null, is_from_file || 0, isApproved, assigned_group_id || null, is_shaham_manager || 0, now, req.user.id
    );
    
    logActivity(req.user.id, "יצירת מנהל", `נוצר מנהל חדש: ${name} (${username})`, "user", result.lastInsertRowid as number);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    console.error("Error creating user:", err);
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: "שם משתמש או אימייל כבר קיימים" });
    } else {
      res.status(500).json({ error: "שגיאה ביצירת המשתמש: " + err.message });
    }
  }
});

app.put("/api/users/:id", authenticate, (req: any, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'team_leader' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { name, username, email, password, role, status, category, secondary_category, gender, phone, google_login_allowed, avatar_url, assigned_group_id, is_shaham_manager } = req.body;
  const normalizedEmail = email?.toLowerCase();
  
  // Get existing user to preserve avatar if not provided
  const existingUser: any = db.prepare("SELECT avatar_url FROM users WHERE id = ?").get(req.params.id);
  const finalAvatar = (avatar_url && avatar_url.trim() !== '') ? avatar_url : existingUser?.avatar_url;

  const updateFields = [
    "name = ?", "username = ?", "email = ?", "role = ?", "status = ?", 
    "category = ?", "secondary_category = ?", "gender = ?", "phone = ?", 
    "google_login_allowed = ?", "avatar_url = ?", "assigned_group_id = ?", "is_shaham_manager = ?"
  ];
  const params = [
    name, username, normalizedEmail, role, status, 
    category, secondary_category, gender, phone, 
    google_login_allowed, finalAvatar, assigned_group_id || null, is_shaham_manager || 0
  ];

  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    updateFields.push("password = ?", "password_plain = ?", "password_updated_at = ?");
    params.push(hashedPassword, password, now);
  }

  params.push(req.params.id);

  try {
    db.prepare(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`)
      .run(...params);

    logActivity(req.user.id, "עדכון מנהל", `עודכנו פרטי מנהל: ${name}`, "user", parseInt(req.params.id));
    res.json({ message: "User updated" });
  } catch (err: any) {
    console.error("Error updating user:", err);
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: "שם משתמש או אימייל כבר קיימים במערכת" });
    } else {
      res.status(500).json({ error: "שגיאה בעדכון המשתמש: " + err.message });
    }
  }
});

app.delete("/api/users/:id", authenticate, isSuperAdmin, (req: any, res) => {
  const userToDelete: any = db.prepare("SELECT name FROM users WHERE id = ?").get(req.params.id);
  db.prepare("UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  logActivity(req.user.id, "מחיקת מנהל", `נמחק מנהל: ${userToDelete?.name}`, "user", parseInt(req.params.id));
  res.json({ message: "User soft deleted" });
});

app.post("/api/users/:id/restore", authenticate, isSuperAdmin, (req: any, res) => {
  const userToRestore: any = db.prepare("SELECT name FROM users WHERE id = ?").get(req.params.id);
  db.prepare("UPDATE users SET deleted_at = NULL WHERE id = ?").run(req.params.id);
  logActivity(req.user.id, "שחזור מנהל", `שוחזר מנהל: ${userToRestore?.name}`, "user", parseInt(req.params.id));
  res.json({ message: "User restored" });
});

// Matches Routes
app.post("/api/matches/demo", authenticate, isSuperAdmin, (req: any, res) => {
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

  try {
    const result = db.prepare(`
      INSERT INTO matches (type, name, age, city, religious_level, occupation, about, looking_for, phone, creation_source, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      demoMatch.type,
      demoMatch.name,
      demoMatch.age,
      demoMatch.city,
      demoMatch.religious_level,
      demoMatch.occupation,
      demoMatch.about,
      demoMatch.looking_for,
      demoMatch.phone,
      demoMatch.creation_source,
      req.user.id
    );
    
    logActivity(req.user.id, "יצירת דמו", "נוצר כרטיס משודך דמו", "match", result.lastInsertRowid as number);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: "שגיאה ביצירת דמו" });
  }
});

app.get("/api/matches/confirmed", authenticate, (req, res) => {
  const matches = db.prepare("SELECT * FROM matches WHERE is_published_confirmed = 1 AND deleted_at IS NULL").all();
  res.json(matches);
});

app.get("/api/matches/:id/publications", authenticate, (req, res) => {
  const logs = db.prepare(`
    SELECT pl.*, u.name as user_name 
    FROM publish_logs pl
    JOIN users u ON pl.user_id = u.id
    WHERE pl.match_id = ?
    ORDER BY pl.created_at DESC
  `).all(req.params.id);
  res.json(logs);
});

app.get("/api/matches/:id/publish-logs", authenticate, (req: any, res) => {
  const logs = db.prepare(`
    SELECT pl.*, u.name as user_name 
    FROM publish_logs pl
    LEFT JOIN users u ON pl.user_id = u.id
    WHERE pl.match_id = ?
    ORDER BY pl.created_at DESC
  `).all(req.params.id);
  res.json(logs);
});

app.get("/api/matches", authenticate, (req: any, res) => {
  let matches;
  const baseQuery = `
    SELECT m.*, u.name as creator_name, u.category as creator_category, u.gender as creator_gender, u.phone as creator_phone
    FROM matches m 
    LEFT JOIN users u ON m.created_by = u.id 
    WHERE m.deleted_at IS NULL
  `;
  
  if (req.user.role === 'super_admin') {
    matches = db.prepare(`${baseQuery} ORDER BY m.created_at DESC`).all();
  } else {
    matches = db.prepare(`${baseQuery} AND m.created_by = ? ORDER BY m.created_at DESC`).all(req.user.id);
  }
  res.json(matches);
});

app.post("/api/matches", authenticate, async (req: any, res) => {
  const m = req.body;
  const force = req.query.force === 'true';

  // Duplicate check
  if (!force && m.phone) {
    const existing = db.prepare("SELECT * FROM matches WHERE phone = ? AND name = ? AND city = ? AND deleted_at IS NULL").get(m.phone, m.name, m.city);
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

  const result = db.prepare(`
    INSERT INTO matches (
      type, name, age, height, ethnicity, marital_status, city, 
      religious_level, service, occupation, about, looking_for, 
      smoking, negiah, age_range, image_url, additional_images, phone, crop_config, creation_source, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    m.type, m.name, m.age ?? null, m.height ?? null, m.ethnicity ?? null, m.marital_status ?? null, m.city ?? null,
    m.religious_level ?? null, m.service ?? null, m.occupation ?? null, m.about ?? null, m.looking_for ?? null,
    m.smoking ?? null, m.negiah ?? null, m.age_range ?? null, finalImageUrl ?? null, m.additional_images ?? null, m.phone ?? null, m.crop_config ?? null, m.creation_source || 'manual', req.user.id
  );
  
  logActivity(req.user.id, "יצירת משודך", `נוצר כרטיס חדש: ${m.name} (${m.type === 'male' ? 'בן' : 'בת'})`, "match", result.lastInsertRowid as number);
  res.json({ id: result.lastInsertRowid });
});

app.put("/api/matches/:id", authenticate, (req: any, res) => {
  const m = req.body;
  const match: any = db.prepare("SELECT * FROM matches WHERE id = ?").get(req.params.id);
  if (!match) return res.status(404).json({ error: "Match not found" });
  if (req.user.role !== 'super_admin' && match.created_by !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.prepare(`
    UPDATE matches SET 
      type = ?, name = ?, age = ?, height = ?, ethnicity = ?, marital_status = ?, city = ?, 
      religious_level = ?, service = ?, occupation = ?, about = ?, looking_for = ?, 
      smoking = ?, negiah = ?, age_range = ?, image_url = ?, additional_images = ?, phone = ?, crop_config = ?
    WHERE id = ?
  `).run(
    m.type, m.name, m.age ?? null, m.height ?? null, m.ethnicity ?? null, m.marital_status ?? null, m.city ?? null,
    m.religious_level ?? null, m.service ?? null, m.occupation ?? null, m.about ?? null, m.looking_for ?? null,
    m.smoking ?? null, m.negiah ?? null, m.age_range ?? null, m.image_url ?? null, m.additional_images ?? null, m.phone ?? null, m.crop_config ?? null, req.params.id
  );
  
  logActivity(req.user.id, "עדכון משודך", `עודכן כרטיס: ${m.name}`, "match", parseInt(req.params.id));
  res.json({ message: "Match updated" });
});

app.delete("/api/matches/:id", authenticate, (req: any, res) => {
  const match: any = db.prepare("SELECT * FROM matches WHERE id = ?").get(req.params.id);
  if (!match) return res.status(404).json({ error: "Match not found" });
  if (req.user.role !== 'super_admin' && match.created_by !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const today = new Date().toISOString();
  db.prepare("UPDATE matches SET deleted_at = ? WHERE id = ?").run(today, req.params.id);
  
  logActivity(req.user.id, "מחיקת משודך", `נמחק כרטיס: ${match.name}`, "match", parseInt(req.params.id));
  res.json({ message: "Match soft deleted" });
});

app.post("/api/matches/:id/restore", authenticate, (req: any, res) => {
  const match: any = db.prepare("SELECT * FROM matches WHERE id = ?").get(req.params.id);
  if (!match) return res.status(404).json({ error: "Match not found" });
  if (req.user.role !== 'super_admin' && match.created_by !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  db.prepare("UPDATE matches SET deleted_at = NULL WHERE id = ?").run(req.params.id);
  
  logActivity(req.user.id, "שחזור משודך", `שוחזר כרטיס: ${match.name}`, "match", parseInt(req.params.id));
  res.json({ message: "Match restored" });
});

app.post("/api/matches/:id/publish", authenticate, (req: any, res) => {
  const { groupName } = req.body;
  const match: any = db.prepare("SELECT name FROM matches WHERE id = ?").get(req.params.id);
  db.prepare("UPDATE matches SET last_published_at = CURRENT_TIMESTAMP, publish_count = publish_count + 1, is_published_confirmed = 0 WHERE id = ?")
    .run(req.params.id);
  
  if (groupName) {
    db.prepare("INSERT INTO publish_logs (match_id, user_id, group_name) VALUES (?, ?, ?)")
      .run(req.params.id, req.user.id, groupName);
  }

  logActivity(req.user.id, "פרסום משודך", `פורסם כרטיס: ${match?.name} ${groupName ? `בקבוצה: ${groupName}` : ''}`, "match", parseInt(req.params.id));
  res.json({ message: "Published status updated" });
});

app.get("/api/publish-logs", authenticate, (req: any, res) => {
  const logs = db.prepare(`
    SELECT pl.*, m.name as match_name, u.name as user_name 
    FROM publish_logs pl
    JOIN matches m ON pl.match_id = m.id
    JOIN users u ON pl.user_id = u.id
    ORDER BY pl.created_at DESC
    LIMIT 500
  `).all();
  res.json(logs);
});

app.put("/api/matches/:id/confirm-publish", authenticate, (req: any, res) => {
  const { confirmed } = req.body;
  db.prepare("UPDATE matches SET is_published_confirmed = ? WHERE id = ?").run(confirmed ? 1 : 0, req.params.id);
  res.json({ message: "Publication status confirmed" });
});

// Settings
app.get("/api/settings", authenticate, (req, res) => {
  const settings = db.prepare("SELECT * FROM settings").all();
  const obj = settings.reduce((acc: any, s: any) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
  res.json(obj);
});

app.post("/api/settings", authenticate, isSuperAdmin, (req, res) => {
  const { key, value } = req.body;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  res.json({ message: "Setting updated" });
});

// WhatsApp Groups Management
app.get("/api/whatsapp/groups", authenticate, (req: any, res) => {
  const groups = db.prepare("SELECT * FROM whatsapp_groups").all();
  res.json(groups);
});

app.put("/api/whatsapp/groups/:id", authenticate, isSuperAdmin, (req, res) => {
  const { name, link, whapi_id, category, type } = req.body;
  db.prepare("UPDATE whatsapp_groups SET name = ?, link = ?, whapi_id = ?, category = ?, type = ? WHERE id = ?").run(name, link, whapi_id, category, type, req.params.id);
  res.json({ message: "Group updated" });
});

app.post("/api/whatsapp/groups", authenticate, isSuperAdmin, (req, res) => {
  const { name, link, whapi_id, category, type } = req.body;
  const result = db.prepare("INSERT INTO whatsapp_groups (name, link, whapi_id, category, type) VALUES (?, ?, ?, ?, ?)").run(name, link, whapi_id, category, type);
  res.json({ id: result.lastInsertRowid });
});

app.delete("/api/whatsapp/groups/:id", authenticate, isSuperAdmin, (req, res) => {
  db.prepare("DELETE FROM whatsapp_groups WHERE id = ?").run(req.params.id);
  res.json({ message: "Group deleted" });
});

app.post("/api/whatsapp/initial-sent", authenticate, (req: any, res) => {
  const { groupId, method = 'manual' } = req.body;
  const now = new Date().toISOString();
  db.prepare("UPDATE whatsapp_groups SET last_initial_sent = ?, last_initial_sent_method = ? WHERE id = ?").run(now, method, groupId);
  res.json({ message: "Initial message status updated" });
});

// Stats
app.get("/api/daily-suggestions", authenticate, (req: any, res) => {
  try {
    // Get 3 random matches of the current user
    const myMatches = db.prepare(`
      SELECT * FROM matches 
      WHERE created_by = ? AND deleted_at IS NULL 
      ORDER BY RANDOM() LIMIT 3
    `).all(req.user.id) as any[];

    const suggestions = myMatches.map(match => {
      // Find potential matches of opposite gender from other managers
      const oppositeGender = match.type === 'male' ? 'female' : 'male';
      const potentialMatches = db.prepare(`
        SELECT m.*, u.name as creator_name 
        FROM matches m
        JOIN users u ON m.created_by = u.id
        WHERE m.type = ? AND m.deleted_at IS NULL AND m.created_by != ?
        ORDER BY RANDOM() LIMIT 2
      `).all(oppositeGender, req.user.id);
      
      return {
        match,
        potentialMatches
      };
    });

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch daily suggestions" });
  }
});

app.get("/api/stats", authenticate, (req: any, res) => {
  const userId = req.user.role === 'super_admin' ? null : req.user.id;
  
  const query = (q: string, params: any[] = []) => {
    if (userId) {
      q = q.includes('WHERE') ? q + ' AND created_by = ?' : q + ' WHERE created_by = ?';
      params.push(userId);
    }
    return db.prepare(q).get(...params);
  };

  const males: any = query("SELECT COUNT(*) as count FROM matches WHERE type = 'male' AND deleted_at IS NULL");
  const females: any = query("SELECT COUNT(*) as count FROM matches WHERE type = 'female' AND deleted_at IS NULL");
  const publishedToday: any = query("SELECT COUNT(*) as count FROM matches WHERE date(last_published_at) = date('now') AND deleted_at IS NULL");
  const neverPublished: any = query("SELECT COUNT(*) as count FROM matches WHERE last_published_at IS NULL AND deleted_at IS NULL");
  
  const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  const adminMales = db.prepare("SELECT COUNT(*) as count FROM users WHERE gender = 'male'").get() as any;
  const adminFemales = db.prepare("SELECT COUNT(*) as count FROM users WHERE gender = 'female'").get() as any;

  res.json({
    males: males.count,
    females: females.count,
    publishedToday: publishedToday.count,
    neverPublished: neverPublished.count,
    totalAdmins: totalAdmins.count,
    adminMales: adminMales.count,
    adminFemales: adminFemales.count
  });
});

// Activity Logs
app.get("/api/activity-logs", authenticate, (req: any, res) => {
  const { userId, dateFrom, dateTo } = req.query;
  let query = `
    SELECT al.*, u.name as user_name 
    FROM activity_logs al 
    JOIN users u ON al.user_id = u.id 
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user.role !== 'super_admin') {
    query += " AND al.user_id = ?";
    params.push(req.user.id);
  } else if (userId) {
    query += " AND al.user_id = ?";
    params.push(userId);
  }

  if (dateFrom) {
    query += " AND date(al.created_at) >= date(?)";
    params.push(dateFrom);
  }
  if (dateTo) {
    query += " AND date(al.created_at) <= date(?)";
    params.push(dateTo);
  }

  query += " ORDER BY al.created_at DESC LIMIT 500";
  
  const logs = db.prepare(query).all(...params);
  res.json(logs);
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
  const group = db.prepare("SELECT name FROM whatsapp_groups WHERE whapi_id = ? OR name = ?").get(groupId, groupId) as any;
  if (group) {
    groupNameFilter = group.name;
  }

  const logs = db.prepare(`
    SELECT pl.*, m.name as match_name, u.name as user_name 
    FROM publish_logs pl
    JOIN matches m ON pl.match_id = m.id
    JOIN users u ON pl.user_id = u.id
    WHERE pl.group_name = ?
    ORDER BY pl.created_at DESC LIMIT 20
  `).all(groupNameFilter);
  
  res.json(logs.map((l: any) => ({
    id: l.id,
    text: l.match_name ? `פורסם כרטיס: ${l.match_name}` : 'הודעה נשלחה',
    sender: l.user_name,
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
    db.prepare("UPDATE whatsapp_groups SET last_initial_sent = ?, last_initial_sent_method = ? WHERE whapi_id = ? OR name = ?")
      .run(today, 'auto', groupId, groupId);
  }

  if (matchId && success) {
    // Try to get real group name for logging
    const group = db.prepare("SELECT name FROM whatsapp_groups WHERE whapi_id = ? OR name = ?").get(groupId, groupId) as any;
    const finalGroupName = group?.name || groupId;

    db.prepare("INSERT INTO publish_logs (match_id, user_id, group_name) VALUES (?, ?, ?)")
      .run(matchId, req.user.id, finalGroupName);
    
    db.prepare("UPDATE matches SET last_published_at = CURRENT_TIMESTAMP, publish_count = publish_count + 1 WHERE id = ?")
      .run(matchId);
      
    logActivity(req.user.id, "פרסום בוואטסאפ", `פורסם כרטיס מזהה ${matchId} בקבוצה ${finalGroupName}`, "match", matchId);
  } else if (success) {
    logActivity(req.user.id, "שליחת הודעה", `נשלחה הודעה חופשית: ${text.substring(0, 30)}...`, "system");
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

app.post("/api/whatsapp/webhook", (req, res) => {
  const { messages } = req.body;
  
  if (messages && Array.isArray(messages)) {
    // Get all assigned group IDs from active managers
    const activeManagers = db.prepare("SELECT assigned_group_id FROM users WHERE status = 'active' AND assigned_group_id IS NOT NULL").all() as any[];
    const allowedGroupIds = new Set(activeManagers.map(m => m.assigned_group_id));
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
      const result = db.prepare("INSERT INTO internal_messages (sender_id, receiver_id, text, match_id) VALUES (?, ?, ?, ?)")
        .run(senderId, receiverId, text, matchId || null);
      
      const messageId = result.lastInsertRowid;
      const message = db.prepare(`
        SELECT im.*, u.name as sender_name,
               m.name as match_name, m.type as match_type, m.age as match_age, m.city as match_city
        FROM internal_messages im 
        JOIN users u ON im.sender_id = u.id 
        LEFT JOIN matches m ON im.match_id = m.id
        WHERE im.id = ?
      `).get(messageId) as any;

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new_internal_message", message);
      }

      // Send confirmation to sender
      socket.emit("internal_message_sent", message);

      // Create notification for receiver
      const sender = db.prepare("SELECT name FROM users WHERE id = ?").get(senderId) as any;
      const notificationText = `הודעה חדשה מ${sender.name}`;
      db.prepare("INSERT INTO notifications (user_id, text, type) VALUES (?, ?, ?)")
        .run(receiverId, notificationText, 'chat');
      
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
