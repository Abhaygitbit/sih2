import bcrypt from "bcryptjs";
import { DatabaseClient } from "./db";

export class InMemoryDatabase implements DatabaseClient {
  private users: any[] = [];
  private sessions: Map<string, any> = new Map();
  private conversations: any[] = [];
  private messages: any[] = [];
  private documents: any[] = [];
  private auditLogs: any[] = [];
  private reports: any[] = [];

  constructor() {
    this.initDefaultUsers();
  }

  private async initDefaultUsers() {
    const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);
    const userPasswordHash = await bcrypt.hash("User@12345", 10);

    this.users = [
      {
        id: "usr_admin_default",
        name: "IP-SAKTI Regulatory Administrator",
        email: "admin@ipsakti.in",
        password_hash: adminPasswordHash,
        role: "ADMIN",
        user_type: "Admin",
        organization: "Ministry of AYUSH / Patent Controller",
        gst_number: "07AAACG0521D1Z8",
        status: "active",
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      },
      {
        id: "usr_msme_default",
        name: "Rajesh Sharma (MSME Director)",
        email: "msme@herbals.com",
        password_hash: userPasswordHash,
        role: "USER",
        user_type: "MSMEs",
        organization: "Arya Vaidya Herbal Formulations Pvt Ltd",
        gst_number: "27AABCA1234F1Z5",
        status: "active",
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      },
      {
        id: "usr_researcher_default",
        name: "Dr. Ananya Sen (Principal Scientist)",
        email: "researcher@biotech.ac.in",
        password_hash: userPasswordHash,
        role: "USER",
        user_type: "Researchers/Searchers",
        organization: "National Botanical Research & Biotech Institute",
        gst_number: "09AAATN9876C1Z3",
        status: "active",
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      },
    ];
  }

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    const s = sql.trim().toLowerCase();

    // 1. SELECT COUNT FROM users
    if (s.includes("select count(*)") && s.includes("from users")) {
      return { rows: [{ count: this.users.length }] };
    }

    // 2. SELECT FROM users WHERE email
    if (s.includes("from users") && s.includes("lower(email) = lower($1)")) {
      const email = String(params[0] || "").toLowerCase().trim();
      const user = this.users.find((u) => u.email.toLowerCase() === email);
      return { rows: user ? [user] : [] };
    }

    // 3. SELECT FROM users WHERE id
    if (s.includes("from users") && s.includes("id = $1")) {
      const id = String(params[0]);
      const user = this.users.find((u) => u.id === id);
      return { rows: user ? [user] : [] };
    }

    // 4. SELECT ALL users
    if (s.includes("from users") && s.includes("order by created_at")) {
      return { rows: [...this.users] };
    }

    // 5. UPDATE users (last_login, profile)
    if (s.startsWith("update users")) {
      if (s.includes("set last_login_at = current_timestamp") && s.includes("where id = $1")) {
        const id = String(params[0]);
        const user = this.users.find((u) => u.id === id);
        if (user) {
          user.last_login_at = new Date().toISOString();
          user.last_activity_at = new Date().toISOString();
        }
      } else if (s.includes("set name = $1") && s.includes("where id = $4")) {
        const [name, org, gst, id] = params;
        const user = this.users.find((u) => u.id === id);
        if (user) {
          user.name = name;
          user.organization = org;
          user.gst_number = gst;
        }
      }
      return { rows: [] };
    }

    // 6. INSERT INTO users
    if (s.startsWith("insert into users")) {
      const [id, name, email, password_hash, role, user_type, organization, gst_number] = params;
      const newUser = {
        id,
        name,
        email,
        password_hash,
        role: role || "USER",
        user_type: user_type || "MSMEs",
        organization: organization || "",
        gst_number: gst_number || "",
        status: "active",
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      };
      this.users.push(newUser);
      return { rows: [newUser] };
    }

    // 7. SESSIONS
    if (s.startsWith("insert into sessions")) {
      const [token, user_id, expires_at] = params;
      this.sessions.set(token, {
        token,
        user_id,
        created_at: new Date().toISOString(),
        expires_at: expires_at || new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      return { rows: [] };
    }

    if (s.includes("from sessions s") && s.includes("join users u")) {
      const token = String(params[0]);
      const session = this.sessions.get(token);
      if (!session) return { rows: [] };
      const user = this.users.find((u) => u.id === session.user_id);
      if (!user) return { rows: [] };
      return {
        rows: [
          {
            token: session.token,
            expires_at: session.expires_at,
            ...user,
          },
        ],
      };
    }

    if (s.startsWith("delete from sessions")) {
      const token = String(params[0]);
      this.sessions.delete(token);
      return { rows: [] };
    }

    // 8. CONVERSATIONS
    if (s.startsWith("insert into conversations")) {
      const [id, user_id, title] = params;
      const conv = {
        id,
        user_id,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.conversations.push(conv);
      return { rows: [conv] };
    }

    if (s.includes("from conversations") && s.includes("where user_id = $1")) {
      const userId = String(params[0]);
      const list = this.conversations
        .filter((c) => c.user_id === userId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return { rows: list };
    }

    if (s.includes("from conversations") && s.includes("where id = $1")) {
      const id = String(params[0]);
      const conv = this.conversations.find((c) => c.id === id);
      return { rows: conv ? [conv] : [] };
    }

    // 9. MESSAGES
    if (s.startsWith("insert into messages")) {
      const [id, conversation_id, role, content, citations] = params;
      const msg = {
        id,
        conversation_id,
        role,
        content,
        citations: typeof citations === "string" ? citations : JSON.stringify(citations || []),
        created_at: new Date().toISOString(),
      };
      this.messages.push(msg);
      return { rows: [msg] };
    }

    if (s.includes("from messages") && s.includes("conversation_id = $1")) {
      const convId = String(params[0]);
      const list = this.messages
        .filter((m) => m.conversation_id === convId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return { rows: list };
    }

    // 10. AUDIT LOGS
    if (s.startsWith("insert into audit_logs")) {
      const [id, user_id, user_email, action, resource, metadata, ip_address] = params;
      const log = {
        id,
        user_id,
        user_email,
        action,
        resource,
        metadata,
        ip_address,
        timestamp: new Date().toISOString(),
      };
      this.auditLogs.unshift(log);
      return { rows: [log] };
    }

    if (s.includes("from audit_logs")) {
      return { rows: this.auditLogs.slice(0, 50) };
    }

    // 11. DOCUMENTS
    if (s.startsWith("insert into documents")) {
      const [id, title, original_name, file_path, file_type, file_size, uploaded_by, status] = params;
      const doc = {
        id,
        title,
        original_name,
        file_path,
        file_type,
        file_size,
        uploaded_by,
        status: status || "processed",
        total_chunks: 1,
        created_at: new Date().toISOString(),
      };
      this.documents.unshift(doc);
      return { rows: [doc] };
    }

    if (s.includes("from documents")) {
      return { rows: [...this.documents] };
    }

    // 12. REPORTS
    if (s.startsWith("insert into reports")) {
      const [id, user_id, conversation_id, query, title] = params;
      const rep = { id, user_id, conversation_id, query, title, downloaded_at: new Date().toISOString() };
      this.reports.push(rep);
      return { rows: [rep] };
    }

    // Default catch-all
    return { rows: [] };
  }

  async end(): Promise<void> {}
}
