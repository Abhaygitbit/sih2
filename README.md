# IP-SAKTI Sahayak Enterprise AI & RAG Platform

> **Full-Stack Ayurvedic & Pharma IPR Regulatory Intelligence Platform**  
> Built with Node.js, Express, React, Vite, Tailwind CSS, Supabase PostgreSQL, ChromaDB, and Groq LLM Statutory Synthesis. **100% Free of Firebase and Vercel constraints.**

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Vite React Frontend (Client UI)     │
                      │  (Ayush Portal, MSME/Admin Dashboards) │
                      └──────────────────┬─────────────────────┘
                                         │ /api/* (JSON REST)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │        Express Full-Stack Server       │
                      │     (server.ts / dist/server.cjs)      │
                      └──┬──────────────────┬────────────────┬─┘
                         │                  │                │
                         ▼                  ▼                ▼
     ┌───────────────────────┐  ┌─────────────────┐  ┌────────────────┐
     │  Supabase PostgreSQL  │  │    ChromaDB     │  │  Groq LLM API  │
     │  - Users & Sessions   │  │  Vector Store   │  │  (Llama-3.3-   │
     │  - Uploaded Documents │  │  (Docker/Local  │  │   70b-versatile│
     │  - Audit Logs/Reports │  │   or Embedded)  │  │   Synthesis)   │
     └───────────────────────┘  └─────────────────┘  └────────────────┘
```

---

## 1. Exact Tools Needed

### For Local Development:
| Tool | Minimum Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` LTS | Runs Express backend and Vite frontend build |
| **npm** or **bun** | `v10.x`+ | Dependency package manager |
| **Docker & Docker Compose** | Latest Desktop / Engine | Runs ChromaDB and full-stack app in containers |
| **Python** *(optional)* | `3.10+` | Only needed if you want to run ChromaDB natively via pip instead of Docker |
| **Supabase Account** | Free Cloud Tier | Cloud PostgreSQL database for users, documents, and logs |
| **Groq Cloud API Key** | Free Tier (`gsk_...`) | Statutory legal synthesis and reasoning |

---

## 2. Running ChromaDB

You have two convenient options for ChromaDB:

### Option A: Using Docker (Recommended)
Run ChromaDB as a background persistent container:
```bash
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v $(pwd)/chroma_data:/chroma/chroma \
  -e IS_PERSISTENT=TRUE \
  -e ANONYMIZED_TELEMETRY=FALSE \
  chromadb/chroma:latest
```
Test that ChromaDB is active:
```bash
curl http://localhost:8000/api/v1/heartbeat
# Output: {"nanosecond heartbeat": ...}
```

### Option B: Local Device via Python (pip)
If you prefer running Chroma directly on your device without Docker:
```bash
# 1. Install ChromaDB
pip install chromadb

# 2. Start Chroma server with a persistent storage directory
chromadb run --path ./chroma_data --port 8000
```

### Option C: Built-in Zero-Config Fallback
If `CHROMA_URL` is omitted, the app automatically runs an **embedded high-speed vector collection** inside Node.js (`server/chroma.ts`). It indexes statutory knowledge and user uploads into `data/chroma_db/chroma_collection.json`.

---

## 3. Supabase Setup & Perfect PostgreSQL Schema

This app does **NOT** use Firebase. All authentication, sessions, documents, and audit logs run on PostgreSQL (Supabase).

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project (e.g. region: `ap-south-1` Mumbai or closest to your users).
2. Note your project database password.

### Step 2: Apply the Database Schema
1. Open the **SQL Editor** tab in your Supabase Dashboard.
2. Open the file [`supabase_schema.sql`](./supabase_schema.sql) in this repository.
3. Paste the contents into the Supabase SQL Editor and click **Run**.

This provisions:
- **`users`**: Secure user accounts with bcrypt hashes, user types (`MSMEs`, `Researchers/Searchers`, `Admin`), organization name, and Indian 15-character GSTIN.
- **`sessions`**: Bearer token session storage with automatic expiry.
- **`documents`**: Document metadata, file sizes, upload timestamps, chunk counts, and processing statuses.
- **`document_chunks`**: Document text chunks paired with `pgvector(128)` embeddings and HNSW similarity index.
- **`conversations` & `messages`**: Dialogue history, RAG legal citations, and chunk evidence sources.
- **`audit_logs`**: Tamper-evident regulatory audit trail.
- **`reports`**: Generated PDF/compliance reports.
- **`storage.buckets`**: Sets up `ayush-documents` storage bucket.
- **Seed Users**: Default test accounts ready for sign-in.

### Step 3: Get your Connection String
In Supabase:
1. Go to **Project Settings > Database > Connection String**.
2. Select **URI** and choose **Transaction Pooler** (Port `6543`) or Direct (Port `5432`):
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
3. Set this as `DATABASE_URL` in your `.env` file.

---

## 4. Running the Full App Locally

### Quick Start (3 Steps)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
GROQ_API_KEY="gsk_your_groq_api_key_here"
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
CHROMA_URL="http://localhost:8000"
```

```bash
# 3. Start development server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Running with Docker Compose (Everything in 1 Command)
```bash
# Start both ChromaDB and the full-stack App:
docker compose up --build
```
Access the application at `http://localhost:3000` and ChromaDB at `http://localhost:8000`.

---

## 5. Deploying to Render (Without Vercel)

Render runs full-stack Node.js environments with background processes, long-running websockets/streams, disk storage, and environment variables.

### Option 1: 1-Click Blueprint Deploy (`render.yaml`)
1. Push your repository to GitHub.
2. Log in to [render.com](https://render.com).
3. Click **New + > Blueprint**.
4. Connect your repository. Render automatically reads `render.yaml`.
5. Under environment variables, enter:
   - `GROQ_API_KEY`: Your Groq API key
   - `DATABASE_URL`: Your Supabase connection string
6. Click **Apply**.

### Option 2: Manual Web Service Setup on Render
1. In the Render Dashboard, click **New + > Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `ipsakti-sahayak`
   - **Environment**: `Node`
   - **Region**: `Singapore` (or Frankfurt / Oregon)
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run start
     ```
   - **Health Check Path**: `/api/health`
4. In the **Environment Variables** section, add:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `GROQ_API_KEY` | `gsk_...` |
   | `DATABASE_URL` | `postgresql://postgres...supabase.com:6543/postgres?sslmode=require` |
   | `CHROMA_URL` | *(Optional, if using hosted Chroma; otherwise leave blank to use the built-in persistent collection)* |
5. Click **Create Web Service**.

Render will build both the React frontend (`dist/`) and Node server bundle (`dist/server.cjs`), provision a TLS certificate (`https://your-app.onrender.com`), and start serving your application!

---

## 6. Pre-seeded Sign-In Accounts

When using the provided schema, the following default accounts are available:

| Account | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Ayush Admin** | `admin@ipsakti.in` | `Admin@12345` | `ADMIN` (Full Regulatory Control) |
| **MSME Director** | `msme@herbals.com` | `User@12345` | `USER` (`MSMEs`) |
| **Lead Scientist** | `researcher@biotech.ac.in` | `User@12345` | `USER` (`Researchers/Searchers`) |

You can also create new accounts instantly from the **Create Account** tab on the homepage.
