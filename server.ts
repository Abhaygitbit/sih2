import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import multer from "multer";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

import { getDb, logAuditEvent } from "./server/db";
import { chromaCollection } from "./server/chroma";
import { processDocumentFile, seedDefaultKnowledgeCorpus } from "./server/documentProcessor";
import { executeRAGPipeline } from "./server/rag";
import {
  authenticateToken,
  requireAdmin,
  handleLogin,
  handleRegister,
  handleLogout,
  AuthRequest,
} from "./server/auth";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.example") });

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure directories exist
const uploadDir = path.resolve(process.cwd(), "data/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for PDF/DOCX file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const cleanBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^\w-]/g, "_");
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${cleanBase}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf" || ext === ".docx" || ext === ".txt") {
      cb(null, true);
    } else {
      cb(new Error("Unsupported format. Only PDF and DOCX files are permitted."));
    }
  },
});

// ==========================================
// 1. HEALTH CHECK
// ==========================================
app.get("/api/health", async (_req, res) => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
  const chunksCount = chromaCollection.count();

  res.json({
    status: "ok",
    service: "IP-SAKTI Sahayak Enterprise AI & RAG Platform",
    hasGroqKey: hasGroq,
    hasGeminiKey: hasGemini,
    vectorStore: {
      engine: "ChromaDB (Persistent Vector Collection)",
      indexedChunks: chunksCount,
    },
    database: {
      type: "PostgreSQL (PGlite Engine)",
      status: "connected",
    },
  });
});

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================
app.post("/api/auth/login", handleLogin);
app.post("/api/auth/register", handleRegister);
app.post("/api/auth/logout", authenticateToken, handleLogout);

app.get("/api/auth/me", authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// ==========================================
// 3. USER PROFILE ROUTES
// ==========================================
app.put("/api/user/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, organization, gst_number } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const cleanGst = gst_number !== undefined ? (gst_number || "").trim().toUpperCase() : (req.user!.gst_number || "");
    const db = await getDb();
    await db.query(
      `
      UPDATE users 
      SET name = $1, organization = $2, gst_number = $3, last_activity_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `,
      [name.trim(), (organization || "").trim(), cleanGst, req.user!.id]
    );

    await logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: "profile_updated",
      resource: `user:${req.user!.id}`,
      metadata: { name, organization, gst_number: cleanGst },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        ...req.user,
        name: name.trim(),
        organization: (organization || "").trim(),
        gst_number: cleanGst,
      },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ==========================================
// 4. USER RAG CHATBOT & CONVERSATION ROUTES
// ==========================================
app.post("/api/chat/rag", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message, conversationId, jurisdiction = "india", language = "en" } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const db = await getDb();
    const userId = req.user!.id;
    let activeConvId = conversationId;

    // Create conversation if none provided
    if (!activeConvId) {
      activeConvId = "conv_" + crypto.randomBytes(8).toString("hex");
      const title = message.trim().slice(0, 48) + (message.length > 48 ? "..." : "");
      await db.query(
        `
        INSERT INTO conversations (id, user_id, title, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `,
        [activeConvId, userId, title]
      );

      await logAuditEvent({
        userId,
        userEmail: req.user!.email,
        action: "chat_started",
        resource: `conversation:${activeConvId}`,
        metadata: { title },
      });
    } else {
      // Verify ownership of conversation
      const check = await db.query(`SELECT id FROM conversations WHERE id = $1 AND user_id = $2;`, [
        activeConvId,
        userId,
      ]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: "Conversation not found or access denied" });
      }
    }

    // Check previous message count & history for this conversation
    const prevHistoryRes = await db.query(
      `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC;`,
      [activeConvId]
    );
    const isFirstTurn = prevHistoryRes.rows.length === 0;
    const history = prevHistoryRes.rows.map((r: any) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));

    // Save user message to database
    const userMsgId = "msg_" + crypto.randomBytes(8).toString("hex");
    await db.query(
      `
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES ($1, $2, 'user', $3, CURRENT_TIMESTAMP);
    `,
      [userMsgId, activeConvId, message.trim()]
    );

    // Run Advanced RAG Pipeline
    const ragResult = await executeRAGPipeline({
      query: message.trim(),
      jurisdiction,
      language,
      userRole: req.user!.role,
      isFirstTurn,
      history,
    });

    // Save assistant message to database
    const assistantMsgId = "msg_" + crypto.randomBytes(8).toString("hex");
    await db.query(
      `
      INSERT INTO messages (id, conversation_id, role, content, citations, evidence_sources, created_at)
      VALUES ($1, $2, 'assistant', $3, $4, $5, CURRENT_TIMESTAMP);
    `,
      [
        assistantMsgId,
        activeConvId,
        ragResult.answer,
        JSON.stringify(ragResult.citations),
        JSON.stringify(ragResult.citations.map((c) => c.documentTitle)),
      ]
    );

    // Update conversation timestamp
    await db.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;`, [activeConvId]);

    await logAuditEvent({
      userId,
      userEmail: req.user!.email,
      action: "message_sent",
      resource: `conversation:${activeConvId}`,
      metadata: {
        evidenceFound: ragResult.evidenceFound,
        citationsCount: ragResult.citations.length,
        sourceEngine: ragResult.sourceEngine,
      },
    });

    res.json({
      conversationId: activeConvId,
      messageId: assistantMsgId,
      answer: ragResult.answer,
      evidenceFound: ragResult.evidenceFound,
      citations: ragResult.citations,
      sourceEngine: ragResult.sourceEngine,
    });
  } catch (error: any) {
    console.error("RAG chat error:", error);
    res.status(500).json({ error: "Failed to process question via RAG pipeline" });
  }
});

// Get user's conversation list
app.get("/api/conversations", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.query(
      `
      SELECT c.id, c.title, c.created_at, c.updated_at,
             COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.updated_at DESC;
    `,
      [req.user!.id]
    );

    res.json({ conversations: result.rows });
  } catch (error: any) {
    console.error("Fetch conversations error:", error);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

// Get single conversation with full message history
app.get("/api/conversations/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const convCheck = await db.query(`SELECT id, title, created_at, updated_at FROM conversations WHERE id = $1 AND user_id = $2;`, [
      req.params.id,
      req.user!.id,
    ]);
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messagesRes = await db.query(
      `
      SELECT id, role, content, citations, evidence_sources, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC;
    `,
      [req.params.id]
    );

    const parsedMessages = messagesRes.rows.map((m: any) => ({
      ...m,
      citations: typeof m.citations === "string" ? JSON.parse(m.citations) : m.citations,
      evidence_sources: typeof m.evidence_sources === "string" ? JSON.parse(m.evidence_sources) : m.evidence_sources,
    }));

    res.json({
      conversation: convCheck.rows[0],
      messages: parsedMessages,
    });
  } catch (error: any) {
    console.error("Fetch conversation details error:", error);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// Delete user conversation
app.delete("/api/conversations/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.query(`DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id;`, [
      req.params.id,
      req.user!.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    res.json({ success: true, message: "Conversation deleted" });
  } catch (error: any) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// ==========================================
// 5. CHAT REPORTS / PDF DOSSIER DOWNLOAD
// ==========================================
app.post("/api/reports/generate", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, messageId } = req.body;
    const db = await getDb();

    // Verify conversation
    const convRes = await db.query(`SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2;`, [
      conversationId,
      req.user!.id,
    ]);
    if (convRes.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Fetch message
    const msgRes = await db.query(
      `
      SELECT m.id, m.content, m.citations, m.created_at,
             (SELECT content FROM messages WHERE conversation_id = $1 AND role = 'user' AND created_at <= m.created_at ORDER BY created_at DESC LIMIT 1) as query_text
      FROM messages m
      WHERE m.id = $2 AND m.role = 'assistant';
    `,
      [conversationId, messageId]
    );

    if (msgRes.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    const row: any = msgRes.rows[0];
    const convRow: any = convRes.rows[0];
    const reportTitle = convRow?.title || "IP Assessment Report";
    const reportId = "rep_" + crypto.randomBytes(8).toString("hex");

    await db.query(
      `
      INSERT INTO reports (id, user_id, conversation_id, query, title, downloaded_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
    `,
      [reportId, req.user!.id, conversationId, row.query_text || reportTitle, reportTitle]
    );

    await logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: "report_downloaded",
      resource: `report:${reportId}`,
      metadata: { conversationId, messageId },
    });

    res.json({
      reportId,
      title: reportTitle,
      query: row.query_text || reportTitle,
      answer: row.content,
      citations: typeof row.citations === "string" ? JSON.parse(row.citations) : row.citations,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        name: req.user!.name,
        organization: req.user!.organization,
        userType: req.user!.user_type,
      },
    });
  } catch (error: any) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ==========================================
// 6. ADMIN USER MANAGEMENT ROUTES
// ==========================================
app.get("/api/admin/users", authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const usersRes = await db.query(`
      SELECT id, name, email, role, user_type, organization, gst_number, status, created_at, last_login_at, last_activity_at
      FROM users
      ORDER BY created_at DESC;
    `);
    res.json({ users: usersRes.rows });
  } catch (error: any) {
    console.error("Admin fetch users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Admin Create User
app.post("/api/admin/users", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role = "USER", user_type = "MSMEs", organization, gst_number, status = "active" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanGst = (gst_number || "").trim().toUpperCase();
    const db = await getDb();

    // Check duplicate
    const check = await db.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1);`, [cleanEmail]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUserId = "usr_" + crypto.randomBytes(8).toString("hex");

    await db.query(
      `
      INSERT INTO users (id, name, email, password_hash, role, user_type, organization, gst_number, status, created_at, last_login_at, last_activity_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, NULL, NULL);
    `,
      [newUserId, name.trim(), cleanEmail, passwordHash, role, user_type, (organization || "").trim(), cleanGst, status]
    );

    await logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: "user_created",
      resource: `user:${newUserId}`,
      metadata: { email: cleanEmail, role, user_type, gst_number: cleanGst },
    });

    res.json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUserId,
        name: name.trim(),
        email: cleanEmail,
        role,
        user_type,
        organization: (organization || "").trim(),
        gst_number: cleanGst,
        status,
      },
    });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Admin Update User
app.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, user_type, organization, gst_number, status, password } = req.body;
    const targetUserId = req.params.id;
    const cleanGst = (gst_number || "").trim().toUpperCase();
    const db = await getDb();

    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await db.query(
        `
        UPDATE users 
        SET name = $1, email = $2, role = $3, user_type = $4, organization = $5, gst_number = $6, status = $7, password_hash = $8
        WHERE id = $9;
      `,
        [name, email.toLowerCase(), role, user_type, organization || "", cleanGst, status, passwordHash, targetUserId]
      );
    } else {
      await db.query(
        `
        UPDATE users 
        SET name = $1, email = $2, role = $3, user_type = $4, organization = $5, gst_number = $6, status = $7
        WHERE id = $8;
      `,
        [name, email.toLowerCase(), role, user_type, organization || "", cleanGst, status, targetUserId]
      );
    }

    await logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: "user_edited",
      resource: `user:${targetUserId}`,
      metadata: { targetUser: email, role, status, gst_number: cleanGst },
    });

    res.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    console.error("Admin update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Admin Toggle User Status (Activate / Disable)
app.put("/api/admin/users/:id/status", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (status !== "active" && status !== "disabled") {
      return res.status(400).json({ error: "Status must be 'active' or 'disabled'" });
    }

    const targetUserId = req.params.id;
    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: "You cannot disable your own administrator account" });
    }

    const db = await getDb();
    await db.query(`UPDATE users SET status = $1 WHERE id = $2;`, [status, targetUserId]);

    // If disabled, invalidate active sessions
    if (status === "disabled") {
      await db.query(`DELETE FROM sessions WHERE user_id = $1;`, [targetUserId]);
    }

    await logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: status === "disabled" ? "user_disabled" : "user_activated",
      resource: `user:${targetUserId}`,
      metadata: { newStatus: status },
    });

    res.json({ success: true, status });
  } catch (error: any) {
    console.error("Admin toggle status error:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// Admin Delete User
app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const db = await getDb();
    await db.query(`DELETE FROM users WHERE id = $1;`, [targetUserId]);

    await logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: "user_deleted",
      resource: `user:${targetUserId}`,
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Admin delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ==========================================
// 7. ADMIN DATA MANAGEMENT (DOCUMENT PIPELINE)
// ==========================================
app.get("/api/admin/documents", authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT d.id, d.title, d.original_name, d.file_type, d.file_size, d.status, d.total_chunks, d.error_message, d.created_at, d.updated_at,
             u.name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      ORDER BY d.created_at DESC;
    `);

    res.json({ documents: result.rows, totalChromaChunks: chromaCollection.count() });
  } catch (error: any) {
    console.error("Admin fetch documents error:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Admin Upload & Process Document
app.post(
  "/api/admin/documents/upload",
  authenticateToken,
  requireAdmin,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No document file uploaded" });
      }

      const { title } = req.body;
      const file = req.file;
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      const fileType: "pdf" | "docx" | "txt" = ext === "docx" ? "docx" : ext === "txt" ? "txt" : "pdf";
      const docTitle = title && title.trim().length > 0 ? title.trim() : file.originalname;
      const docId = "doc_" + crypto.randomBytes(8).toString("hex");

      const db = await getDb();
      await db.query(
        `
        INSERT INTO documents (id, title, original_name, file_path, file_type, file_size, status, total_chunks, uploaded_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'uploading', 0, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `,
        [docId, docTitle, file.originalname, file.path, fileType, file.size, req.user!.id]
      );

      await logAuditEvent({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "document_uploaded",
        resource: `document:${docId}`,
        metadata: { title: docTitle, originalName: file.originalname, size: file.size, fileType },
      });

      // Run Processing Pipeline asynchronously in background so response returns promptly
      processDocumentFile({
        documentId: docId,
        filePath: file.path,
        fileType,
        title: docTitle,
        originalName: file.originalname,
        uploadedBy: req.user!.id,
      }).catch((err) => console.error("Async document processing error:", err));

      res.json({
        success: true,
        message: "Document uploaded and processing pipeline initiated",
        document: {
          id: docId,
          title: docTitle,
          original_name: file.originalname,
          file_type: fileType,
          file_size: file.size,
          status: "extracting",
        },
      });
    } catch (error: any) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: error?.message || "Document upload failed" });
    }
  }
);

// Admin Reprocess Document
app.post("/api/admin/documents/:id/reprocess", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const docId = req.params.id;
    const db = await getDb();
    const docRes = await db.query(`SELECT id, title, original_name, file_path, file_type, uploaded_by FROM documents WHERE id = $1;`, [
      docId,
    ]);

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc: any = docRes.rows[0];
    if (!fs.existsSync(doc.file_path as string)) {
      return res.status(400).json({ error: "Original document file missing from disk storage" });
    }

    await logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: "document_reprocessed",
      resource: `document:${docId}`,
      metadata: { title: doc.title },
    });

    // Run processing
    processDocumentFile({
      documentId: doc.id as string,
      filePath: doc.file_path as string,
      fileType: (doc.file_type || "pdf") as "pdf" | "docx" | "txt",
      title: doc.title as string,
      originalName: doc.original_name as string,
      uploadedBy: req.user!.id,
    });

    res.json({ success: true, message: "Document reprocessing scheduled" });
  } catch (error: any) {
    console.error("Reprocess document error:", error);
    res.status(500).json({ error: "Failed to reprocess document" });
  }
});

// Admin Delete Document
app.delete("/api/admin/documents/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const docId = req.params.id;
    const db = await getDb();
    const docRes = await db.query(`SELECT id, file_path, title, original_name FROM documents WHERE id = $1;`, [docId]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc: any = docRes.rows[0];

    // Delete all associated embeddings from ChromaDB
    const deletedChunks = chromaCollection.delete({ document_id: docId });

    // Delete record from PostgreSQL database
    await db.query(`DELETE FROM documents WHERE id = $1;`, [docId]);

    // Delete physical file from disk storage if exists
    try {
      if (doc.file_path && fs.existsSync(doc.file_path as string)) {
        fs.unlinkSync(doc.file_path as string);
      }
    } catch (e) {
      console.warn("Could not delete physical file:", e);
    }

    await logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: "document_deleted",
      resource: `document:${docId}`,
      metadata: { title: doc.title, originalName: doc.original_name, deletedChunks },
    });

    res.json({
      success: true,
      message: `Document "${doc.title}" deleted successfully (${deletedChunks} vector chunks purged).`,
      deletedChunks,
      totalChromaChunks: chromaCollection.count(),
    });
  } catch (error: any) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ==========================================
// 8. ADMIN AUDIT LOGS
// ==========================================
app.get("/api/admin/audit-logs", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { action, search, limit = 50, offset = 0 } = req.query;
    const db = await getDb();

    let queryStr = `SELECT id, user_id, user_email, action, resource, metadata, ip_address, timestamp FROM audit_logs`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (action && typeof action === "string" && action !== "all") {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }

    if (search && typeof search === "string") {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(user_email) LIKE $${params.length} OR LOWER(resource) LIKE $${params.length} OR LOWER(action) LIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      queryStr += " WHERE " + conditions.join(" AND ");
    }

    queryStr += " ORDER BY timestamp DESC LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
    params.push(Number(limit), Number(offset));

    const result = await db.query(queryStr, params);
    const totalCountRes = await db.query(`SELECT COUNT(*) as count FROM audit_logs;`);

    res.json({
      logs: result.rows.map((row: any) => ({
        ...row,
        metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
      })),
      totalCount: parseInt(String((totalCountRes.rows[0] as any)?.count || "0"), 10),
    });
  } catch (error: any) {
    console.error("Admin fetch audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// ==========================================
// 9. ADMIN CHATBOT (RAG + ADMINISTRATIVE INTELLIGENCE)
// ==========================================
app.post("/api/admin/chat", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const q = message.toLowerCase().trim();
    const db = await getDb();

    // Check if query is about administrative/database metrics
    const isUserQuery = /how many users|user count|registered users|active users|list users/i.test(q);
    const isDocQuery = /how many documents|document count|uploaded documents|index status|chunks/i.test(q);
    const isActivityQuery = /recent activity|audit log|recent actions|who logged in/i.test(q);

    if (isUserQuery || isDocQuery || isActivityQuery) {
      const userStats = await db.query(`
        SELECT COUNT(*) as total_users,
               COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
               COUNT(CASE WHEN user_type = 'MSMEs' THEN 1 END) as msme_count,
               COUNT(CASE WHEN user_type = 'Researchers/Searchers' THEN 1 END) as researcher_count
        FROM users;
      `);
      const docStats = await db.query(`
        SELECT COUNT(*) as total_docs,
               COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_docs,
               COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_docs,
               COALESCE(SUM(total_chunks), 0) as total_chunks
        FROM documents;
      `);
      const recentLogs = await db.query(`
        SELECT action, user_email, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 5;
      `);

      const u: any = userStats.rows[0];
      const d: any = docStats.rows[0];
      const chromaCount = chromaCollection.count();

      let adminReply = `### 📊 Real-Time Administrative System Diagnostics\n\n`;
      adminReply += `* **User Base**: **${u.total_users}** total users registered (${u.active_users} active, ${u.msme_count} MSMEs, ${u.researcher_count} Researchers).\n`;
      adminReply += `* **Knowledge Corpus**: **${d.total_docs}** documents registered (${d.processed_docs} processed, ${d.failed_docs} failed).\n`;
      adminReply += `* **Vector Database (ChromaDB)**: **${chromaCount}** active semantic chunks indexed and searchable.\n`;
      adminReply += `* **Recent System Events**:\n`;
      for (const log of recentLogs.rows as any[]) {
        adminReply += `  - \`${log.action}\` by **${log.user_email || "system"}** (${new Date(log.timestamp as string).toLocaleTimeString()})\n`;
      }

      return res.json({
        answer: adminReply,
        evidenceFound: true,
        citations: [],
        sourceEngine: "admin_telemetry_engine",
      });
    }

    // Otherwise, execute RAG pipeline on knowledge corpus
    const ragResult = await executeRAGPipeline({
      query: message,
      userRole: "ADMIN",
      isFirstTurn: false,
    });

    res.json(ragResult);
  } catch (error: any) {
    console.error("Admin chat error:", error);
    res.status(500).json({ error: "Failed to generate admin chat response" });
  }
});

// ==========================================
// 10. SERVER STARTUP & VITE INTEGRATION
// ==========================================
async function startServer() {
  // Initialize Database and Seed Default Knowledge Corpus
  try {
    await getDb();
    await seedDefaultKnowledgeCorpus();
    console.log("PostgreSQL and ChromaDB vector store ready.");
  } catch (err) {
    console.error("Database/ChromaDB initialization error:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IP-SAKTI Sahayak Server running on http://localhost:${PORT}`);
  });
}

startServer();
