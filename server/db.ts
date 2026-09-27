import fs from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface DatabaseClient {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

const dbPath = path.resolve(process.cwd(), "data/postgres_db");
let dbInstance: DatabaseClient | null = null;

export async function getDb(): Promise<DatabaseClient> {
  if (!dbInstance) {
    let databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

    if (databaseUrl) {
      // Strip accidental wrapping quotes (common when copying from .env into Render dashboard)
      databaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '');

      // Remove Prisma-specific parameters that can confuse node-postgres
      databaseUrl = databaseUrl.replace(/[?&]uselibpqcompat=true/g, '');

      const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

      const tryConnect = async (connStr: string, label: string) => {
        const pool = new Pool({
          connectionString: connStr,
          ssl: isLocal ? false : { rejectUnauthorized: false },
          max: 4,
          connectionTimeoutMillis: 8000,
          idleTimeoutMillis: 15000,
        });
        await pool.query("SELECT 1;");
        await initSchema(pool);
        return pool;
      };

      try {
        console.log("Connecting to external Supabase / PostgreSQL database...");
        dbInstance = await tryConnect(databaseUrl, "Primary");
        console.log("Connected to Supabase PostgreSQL successfully.");
        return dbInstance;
      } catch (cloudErr: any) {
        console.warn("⚠️ Failed to connect using provided DATABASE_URL:", cloudErr?.message || cloudErr);

        // Auto-recovery for Supabase IPv4 / Pooler:
        // Render does NOT support IPv6 (causing ENETUNREACH on direct hosts like db.xxx.supabase.co:5432).
        // It requires the IPv4 Supavisor Pooler (aws-0-[region].pooler.supabase.com:6543).
        const match = databaseUrl.match(/postgres(?:\.([a-zA-Z0-9_-]+))?:([^@]+)@(?:aws-0-([a-zA-Z0-9_-]+)\.pooler\.supabase\.com|db\.([a-zA-Z0-9_-]+)\.supabase\.co)/);
        const projectRef = match ? (match[1] || match[4]) : null;
        const password = match ? match[2] : null;

        if (projectRef && password) {
          // IP 2406:da14 is AWS Singapore (ap-southeast-1), which is the most common region in Asia.
          const candidateRegions = ["ap-southeast-1", "ap-south-1", "us-east-1", "eu-central-1", "us-west-1"];
          for (const region of candidateRegions) {
            const poolerUrl = `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres?sslmode=require`;
            try {
              console.log(`Attempting IPv4 pooler connection for region '${region}'...`);
              dbInstance = await tryConnect(poolerUrl, `Pooler-${region}`);
              console.log(`✅ Connected successfully to Supabase IPv4 Pooler in '${region}'!`);
              return dbInstance;
            } catch (rErr: any) {
              // continue trying candidate regions
            }
          }
        }
      }
    }

    if (process.env.NODE_ENV === 'production' && databaseUrl) {
      console.error("❌ CRITICAL: Could not reach Supabase over IPv4. Please verify your Supabase region and password in DATABASE_URL.");
      // Do not launch PGlite WebAssembly in low-memory production container to avoid SIGTERM
      const stubDb: DatabaseClient = {
        query: async () => ({ rows: [] }),
        end: async () => {},
      };
      dbInstance = stubDb;
      return dbInstance;
    }

    try {
      fs.mkdirSync(dbPath, { recursive: true });

      // Clean up stale lock if prior container instance terminated ungracefully
      const pidFile = path.join(dbPath, "postmaster.pid");
      if (fs.existsSync(pidFile)) {
        try {
          fs.unlinkSync(pidFile);
        } catch {
          // ignore
        }
      }

      const instance = new PGlite(dbPath);
      await initSchema(instance);
      dbInstance = instance;
    } catch (err) {
      console.warn("Could not initialize disk-based PGlite, falling back to in-memory mode:", err);
      try {
        const memInstance = new PGlite();
        await initSchema(memInstance);
        dbInstance = memInstance;
      } catch (memErr) {
        console.error("Critical: Failed to initialize in-memory PGlite:", memErr);
        throw memErr;
      }
    }
  }
  return dbInstance;
}

async function initSchema(db: DatabaseClient) {
  // 1. Users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      user_type TEXT NOT NULL DEFAULT 'MSMEs',
      organization TEXT DEFAULT '',
      gst_number TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP,
      last_activity_at TIMESTAMP
    );
  `);

  // Ensure column exists for any pre-created database
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gst_number TEXT DEFAULT '';`);
  } catch (_e) {
    // column may already exist
  }

  // 2. Sessions table
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    );
  `);

  // 3. Conversations table
  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Messages table
  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT DEFAULT '[]',
      evidence_sources TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Documents table
  await db.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'uploaded',
      error_message TEXT DEFAULT '',
      total_chunks INT DEFAULT 0,
      uploaded_by TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Audit logs table
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      ip_address TEXT DEFAULT '',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. Reports table
  await db.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      query TEXT NOT NULL,
      title TEXT NOT NULL,
      downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default users if table is empty
  const userCheck = await db.query(`SELECT COUNT(*) as count FROM users;`);
  const count = parseInt(String((userCheck.rows[0] as any)?.count || '0'), 10);
  if (count === 0) {
    const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);
    const userPasswordHash = await bcrypt.hash("User@12345", 10);

    const defaultUsers = [
      {
        id: "usr_admin_default",
        name: "IP-SAKTI Regulatory Administrator",
        email: "admin@ipsakti.in",
        password_hash: adminPasswordHash,
        role: "ADMIN",
        user_type: "Admin",
        organization: "Ministry of AYUSH / Patent Controller",
        status: "active",
      },
      {
        id: "usr_msme_default",
        name: "Rajesh Sharma (MSME Director)",
        email: "msme@herbals.com",
        password_hash: userPasswordHash,
        role: "USER",
        user_type: "MSMEs",
        organization: "Arya Vaidya Herbal Formulations Pvt Ltd",
        status: "active",
      },
      {
        id: "usr_researcher_default",
        name: "Dr. Ananya Sen (Principal Scientist)",
        email: "researcher@biotech.ac.in",
        password_hash: userPasswordHash,
        role: "USER",
        user_type: "Researchers/Searchers",
        organization: "National Botanical Research & Biotech Institute",
        status: "active",
      }
    ];

    for (const u of defaultUsers) {
      await db.query(`
        INSERT INTO users (id, name, email, password_hash, role, user_type, organization, status, created_at, last_login_at, last_activity_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `, [u.id, u.name, u.email, u.password_hash, u.role, u.user_type, u.organization, u.status]);
    }

    // Insert initial audit log for seeding
    await db.query(`
      INSERT INTO audit_logs (id, user_id, user_email, action, resource, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP);
    `, [
      `log_${Date.now()}`,
      "usr_admin_default",
      "admin@ipsakti.in",
      "system_initialized",
      "database",
      JSON.stringify({ note: "Default database schema initialized with Admin, MSME, and Researcher accounts" })
    ]);
  }
}

// Helper functions
export async function logAuditEvent(params: {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resource: string;
  metadata?: any;
  ipAddress?: string;
}) {
  try {
    const db = await getDb();
    const id = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await db.query(`
      INSERT INTO audit_logs (id, user_id, user_email, action, resource, metadata, ip_address, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP);
    `, [
      id,
      params.userId || null,
      params.userEmail || null,
      params.action,
      params.resource,
      JSON.stringify(params.metadata || {}),
      params.ipAddress || ""
    ]);
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function updateUserActivity(userId: string) {
  try {
    const db = await getDb();
    await db.query(`
      UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1;
    `, [userId]);
  } catch (err) {
    console.warn("Failed to update user activity:", err);
  }
}
