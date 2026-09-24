import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb, logAuditEvent, updateUserActivity } from "./db";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  user_type: "MSMEs" | "Researchers/Searchers" | "Admin";
  organization: string;
  gst_number?: string;
  status: "active" | "disabled";
  created_at: string;
  last_login_at: string;
  last_activity_at: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Generate secure session token
export function generateSessionToken(): string {
  return "saktisess_" + crypto.randomBytes(32).toString("hex");
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Access token required. Please sign in." });
  }

  try {
    const db = await getDb();
    const sessionRes = await db.query(
      `
      SELECT s.token, s.expires_at, u.id, u.name, u.email, u.role, u.user_type, u.organization, u.gst_number, u.status, u.created_at, u.last_login_at, u.last_activity_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1;
    `,
      [token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
    }

    const row: any = sessionRes.rows[0];
    const expiresAt = new Date(row.expires_at as string);
    if (expiresAt < new Date()) {
      await db.query(`DELETE FROM sessions WHERE token = $1;`, [token]);
      return res.status(401).json({ error: "Session has expired. Please sign in again." });
    }

    if (row.status === "disabled") {
      return res.status(403).json({ error: "Your account has been disabled by an administrator." });
    }

    // Attach user to request
    req.user = {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      role: row.role as "USER" | "ADMIN",
      user_type: row.user_type as "MSMEs" | "Researchers/Searchers" | "Admin",
      organization: (row.organization as string) || "",
      gst_number: (row.gst_number as string) || "",
      status: row.status as "active" | "disabled",
      created_at: row.created_at as string,
      last_login_at: row.last_login_at as string,
      last_activity_at: row.last_activity_at as string,
    };

    // Keep user activity timestamp updated
    updateUserActivity(req.user.id);

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ error: "Authentication check failed" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }
  next();
}

export async function handleLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = await getDb();
    const userRes = await db.query(
      `
      SELECT id, name, email, password_hash, role, user_type, organization, gst_number, status, created_at, last_login_at, last_activity_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `,
      [email.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user: any = userRes.rows[0];
    if (user.status === "disabled") {
      return res.status(403).json({ error: "Account is disabled. Contact system administrator." });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash as string);
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create session (valid for 7 days)
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      `
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES ($1, $2, $3);
    `,
      [token, user.id, expiresAt.toISOString()]
    );

    await db.query(
      `
      UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP WHERE id = $1;
    `,
      [user.id]
    );

    await logAuditEvent({
      userId: user.id as string,
      userEmail: user.email as string,
      action: "login",
      resource: "auth:session",
      metadata: { role: user.role, user_type: user.user_type },
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "",
    });

    const userProfile: AuthenticatedUser = {
      id: user.id as string,
      name: user.name as string,
      email: user.email as string,
      role: user.role as "USER" | "ADMIN",
      user_type: user.user_type as "MSMEs" | "Researchers/Searchers" | "Admin",
      organization: (user.organization as string) || "",
      gst_number: (user.gst_number as string) || "",
      status: user.status as "active" | "disabled",
      created_at: user.created_at as string,
      last_login_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };

    res.json({
      token,
      user: userProfile,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: error?.message || "Login failed" });
  }
}

export async function handleRegister(req: Request, res: Response) {
  try {
    const { name, email, password, organization, gst_number, user_type } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanGst = (gst_number || "").trim().toUpperCase();
    const db = await getDb();

    // Check if user exists
    const check = await db.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1);`, [cleanEmail]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = "usr_" + crypto.randomBytes(8).toString("hex");
    const allowedUserType = user_type === "Researchers/Searchers" ? "Researchers/Searchers" : "MSMEs";

    await db.query(
      `
      INSERT INTO users (id, name, email, password_hash, role, user_type, organization, gst_number, status, created_at, last_login_at, last_activity_at)
      VALUES ($1, $2, $3, $4, 'USER', $5, $6, $7, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `,
      [userId, name.trim(), cleanEmail, passwordHash, allowedUserType, (organization || "").trim(), cleanGst]
    );

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      `
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES ($1, $2, $3);
    `,
      [token, userId, expiresAt.toISOString()]
    );

    await logAuditEvent({
      userId,
      userEmail: cleanEmail,
      action: "user_registered",
      resource: `user:${userId}`,
      metadata: { role: "USER", user_type: allowedUserType, gst_number: cleanGst },
    });

    const userProfile: AuthenticatedUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      role: "USER",
      user_type: allowedUserType,
      organization: (organization || "").trim(),
      gst_number: cleanGst,
      status: "active",
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };

    res.json({
      token,
      user: userProfile,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
}

export async function handleLogout(req: AuthRequest, res: Response) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    if (token) {
      const db = await getDb();
      await db.query(`DELETE FROM sessions WHERE token = $1;`, [token]);
    }

    if (req.user) {
      await logAuditEvent({
        userId: req.user.id,
        userEmail: req.user.email,
        action: "logout",
        resource: "auth:session",
      });
    }

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: "Logout failed" });
  }
}
