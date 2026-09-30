# IP-SAKTI Sahayak (आईपी-शक्ति सहायक)
### Enterprise Intellectual Property & Traditional Knowledge AI Regulatory Platform

> **Official Problem Statement Solved**: Facilitating patent clearance, Traditional Knowledge Digital Library (TKDL) prior-art searches, Section 3(p) / 3(e) statutory compliance, and multi-jurisdictional IP strategies for Indian MSMEs, Ayurvedic drug manufacturers, and biotech researchers.

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Key Capabilities & Innovations](#2-key-capabilities--innovations)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Technology Stack Breakdown](#4-technology-stack-breakdown)
5. [End-to-End Hybrid RAG Architecture](#5-end-to-end-hybrid-rag-architecture)
6. [Statutory & Legal Guardrails](#6-statutory--legal-guardrails)
7. [User Roles & Access Control (RBAC)](#7-user-roles--access-control-rbac)
8. [Database Schema & Persistence Layer](#8-database-schema--persistence-layer)
9. [Installation & Local Setup](#9-installation--local-setup)
10. [Cloud Deployment Guide (Render + Supabase + Docker)](#10-cloud-deployment-guide-render--supabase--docker)
11. [Pre-Seeded Demo Credentials](#11-pre-seeded-demo-credentials)
12. [Security & Compliance Highlights](#12-security--compliance-highlights)

---

## 1. Executive Summary & Problem Statement

India possesses one of the world's richest traditional medicine repositories (Ayurveda, Siddha, Unani, and Sowa-Rigpa). However, Indian innovators, startups, and MSMEs face significant legal barriers when protecting botanical formulations:

1. **Section 3(p) of the Indian Patents Act, 1970**: Bars inventions that are essentially traditional knowledge or an aggregation/duplication of known traditional medicinal properties.
2. **Section 3(e) Admixture Challenge**: Requires conclusive, reproducible experimental data demonstrating **synergistic therapeutic efficacy** beyond the sum of individual plant constituents.
3. **Biological Diversity Act, 2002 (NBA Section 6)**: Mandates prior approval from the National Biodiversity Authority before filing patent applications outside India for biological resources obtained from India.
4. **International Claim Rejection**: US (USPTO) allows method-of-treatment claims under 35 U.S.C. § 101/102/103, while Europe (EPO) strictly prohibits them under EPC Article 53(c), requiring EPC 2000 purpose-limited product claims instead.

**IP-SAKTI Sahayak** bridges this gap using a **Hybrid Retrieval-Augmented Generation (RAG)** pipeline grounded in authentic TKDL compendia, Indian Patent Office guidelines, and international patent statutes.

---

## 2. Key Capabilities & Innovations

- 🌿 **Intelligent Prior-Art Clearance**: Evaluates botanical compositions against 4.5+ lakh classical formulations documented in the Traditional Knowledge Digital Library (TKDL).
- ⚖️ **Section 3(p) & 3(e) Compliance Engine**: Detects whether an applicant's claim is an obvious aggregation or a legally patentable synergistic combination with quantifiable efficacy ratios.
- 🌐 **Multi-Jurisdictional Patent Strategy**: Compares patentability routes across the **Indian Patent Office (IPO)**, **United States (USPTO)**, **European Patent Office (EPO)**, and **WIPO/PCT**.
- 📑 **1-Click Audit & PDF Dossier Generation**: Exports timestamped, verifiable patent clearance reports formatted for legal examination and internal compliance.
- 🛡️ **Administrative Regulatory Command Center**: Enables AYUSH and Patent Office administrators to upload gazettes, reprocess vector embeddings, inspect audit logs, and query real-time diagnostics.
- 🇮🇳 **Government Accessibility (GIGW Compliant)**: Full bilingual English/Hindi interface, dynamic font scaling offset, high-contrast dark/light modes, and official Ministry of AYUSH design styling.

---

## 3. System Architecture Diagram

```
                              ┌───────────────────────────────────────────────┐
                              │            CLIENT PRESENTATION LAYER          │
                              │  React 18 + TypeScript + Vite + Tailwind CSS  │
                              │  (Bilingual Accessibility • Dark/Light Modes) │
                              └───────────────────────┬───────────────────────┘
                                                      │ HTTPS / REST API
                                                      ▼
                              ┌───────────────────────────────────────────────┐
                              │      APPLICATION BACKEND (Render Service)     │
                              │             Node.js 20 LTS + Express          │
                              │                                               │
                              │  ┌──────────────────────┐  ┌────────────────┐ │
                              │  │  Auth & RBAC Service │  │ Audit & Logging│ │
                              │  │ (Bcrypt + Sessions)  │  │  (Tamper-Proof)│ │
                              │  └──────────────────────┘  └────────────────┘ │
                              │  ┌──────────────────────┐  ┌────────────────┐ │
                              │  │ Document Parser & ETL│  │  Hybrid RAG    │ │
                              │  │ (pdf-parse / mammoth)│  │ Orchestrator   │ │
                              │  └──────────────────────┘  └────────────────┘ │
                              └───────────┬───────────────────────┬───────────┘
                                          │                       │
                            TCP / Pooler  │         HTTP/REST     │
                         (Port 6543, SSL) │                       │
                                          ▼                       ▼
       ┌──────────────────────────────────┐ ┌─────────────────────────────────┐
       │     SUPABASE CLOUD DATABASE      │ │      CHROMADB VECTOR STORE      │
       │         (PostgreSQL 16)          │ │    (Render Docker Container)    │
       │                                  │ │                                 │
       │  • users & sessions              │ │  • High-Dimensional Embeddings │
       │  • conversations & messages      │ │  • Cosine Similarity Index     │
       │  • documents catalog             │ │  • Legal Metadata Filtering     │
       │  • audit_logs & reports          │ │  • Built-in Fallback Cache      │
       └──────────────────────────────────┘ └─────────────────────────────────┘
                                          ▲
                                          │ AI Reasoning
       ┌──────────────────────────────────┴───────────────────────────────────┐
       │                 GOOGLE GEMINI 2.5 FLASH / GROQ LLM                   │
       │     (Statutory Synthesis, Multi-Jurisdiction Reasoning, Grounding)   │
       └──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack Breakdown

| Layer | Technologies Used | Exact Purpose in IP-SAKTI |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, TypeScript | Interactive Single-Page Application (SPA) with reactive state management and streaming chat interfaces. |
| **Styling & Icons** | Tailwind CSS, Lucide React | Official Government of India design language, responsive grids, and SVG legal badges. |
| **Client-Side Export** | `jspdf`, `html2canvas` | Generates official PDF Patent Clearance and Prior-Art Dossier reports directly in the user's browser. |
| **Backend Runtime** | Node.js 20 LTS, Express | High-throughput asynchronous server coordinating REST APIs, auth middleware, and RAG execution. |
| **Document ETL** | `pdf-parse`, `mammoth`, `multer` | Extracts unstructured text from uploaded Indian Patent Office guidelines, scientific papers, and dossiers. |
| **Relational DB** | Supabase (PostgreSQL 16) | Stores user profiles, hashed credentials, 7-day session tokens, chat history, and audit trails. |
| **Connection Bridge** | Supavisor Pooler (Port 6543) | Enables robust IPv4 communication from Render to Supabase without requiring expensive IPv6 network add-ons. |
| **Vector Database** | ChromaDB (in Docker) | Indexes semantic embeddings of Ayurvedic and patent documents for sub-10ms nearest-neighbor searches. |
| **Fail-Safe Cache** | In-Memory Database Engine | Zero-dependency memory engine that ensures 100% login and search uptime even if external networks sleep. |
| **LLM Reasoning** | Google Gemini 2.5 Flash / Groq | Synthesizes grounded legal findings, cites specific clauses, and warns against biopiracy risks. |
| **Cloud Hosting** | Render Cloud | Hosts both the full-stack web application service and the isolated ChromaDB Docker container. |

---

## 5. End-to-End Hybrid RAG Architecture

```
   User Query: "Can I patent a formulation of Curcuma longa and Piperine for arthritis?"
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ 1. INGESTION & INTENT     │
                        │ • Sanitize input          │
                        │ • Extract jurisdiction    │
                        │ • Extract user language   │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
         ┌────────────────────────────────────────────────────────┐
         │ 2. HYBRID RETRIEVAL MECHANISM (Parallel Dual Search)    │
         ├────────────────────────────┬───────────────────────────┤
         │ Dense Semantic Vector      │ Sparse Lexical Retrieval  │
         │ Search (ChromaDB)          │ (BM25 / Keyword Tokenizer)│
         │ • Generates 128-dim embed  │ • Ayurvedic botanical     │
         │ • Cosine similarity score  │   compounds & Latin names │
         │ • Finds contextual chunks  │ • Exact Section 3(p) refs │
         └─────────────┬──────────────┴─────────────┬─────────────┘
                       │                            │
                       └──────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ 3. RECIPROCAL RANK FUSION │
                        │ Composite Score:          │
                        │ Score = 0.65*(Vector Sim) │
                        │       + 0.35*(BM25 Score) │
                        │ Filters top 5-8 citations │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ 4. STATUTORY VERIFICATION │
                        │ Queries PostgreSQL for:   │
                        │ • Active TKDL exemptions  │
                        │ • Section 3(p) / 3(e) rule│
                        │ • NBA clearance criteria  │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ 5. PROMPT AUGMENTATION    │
                        │ Combines:                 │
                        │ • Grounded Chunks         │
                        │ • Statutory Rules         │
                        │ • Role Context            │
                        │ • User Query              │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ 6. GEMINI 2.5 FLASH LLM   │
                        │ Generates structured,     │
                        │ evidence-backed output    │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ 7. CITATION INJECTION     │
                        │ • Pinpoints source file   │
                        │ • Section & page numbers  │
                        │ • Verifiable legal proof  │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                 Final Response Displayed in User Dashboard
```

---

## 6. Statutory & Legal Guardrails

Every analysis is cross-examined against four specific regulatory pillars:

| Statute | Enforcement Logic in IP-SAKTI |
| :--- | :--- |
| **Section 3(p)** | Cross-checks ingredients against TKDL classical references (*Charaka Samhita*, *Sushruta Samhita*, *Ashtanga Hridaya*). Flags traditional uses and requires proof of non-obvious modification. |
| **Section 3(e)** | Rejects mere combinations of known herbal extracts unless applicant demonstrates **isobologram analysis, Combination Index (CI < 1)**, or synergistic bio-enhancement. |
| **NBA Section 6** | Warns Indian researchers accessing biological resources that **Form III approval** from the National Biodiversity Authority is a mandatory prerequisite prior to foreign grant. |
| **EPC Art 53(c) & 35 USC § 101** | Transforms invalid therapeutic method claims ("*A method of treating arthritis...*") into European purpose-limited product claims ("*Composition X for use in treating...*"). |

---

## 7. User Roles & Access Control (RBAC)

The system enforces strict Role-Based Access Control:

| Capability | Public / Guest | MSMEs (Startups) | Researchers / Scientists | Regulatory Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Interactive AYUSH Hero Slider** | ✅ | ✅ | ✅ | ✅ |
| **Statutory Prior-Art Chatbot** | Basic Preview | ✅ (Full) | ✅ (Full) | ✅ (Full) |
| **International Patent Guidance** | Read-Only | ✅ (Full) | ✅ (Full) | ✅ (Full) |
| **Export Dossier PDF Reports** | ❌ | ✅ | ✅ | ✅ |
| **Ingest New Knowledge Documents** | ❌ | ❌ | ❌ | ✅ |
| **ChromaDB Chunk Reprocessing** | ❌ | ❌ | ❌ | ✅ |
| **System Security Audit Trail** | ❌ | ❌ | ❌ | ✅ |
| **Admin Telemetry AI Diagnostics** | ❌ | ❌ | ❌ | ✅ |

---

## 8. Database Schema & Persistence Layer

The PostgreSQL schema contains 7 tables designed for production data integrity:

```sql
-- 1. User Profiles & Authentication
users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',       -- 'USER' or 'ADMIN'
  user_type TEXT NOT NULL DEFAULT 'MSMEs', -- 'MSMEs', 'Researchers/Searchers', 'Admin'
  organization TEXT DEFAULT '',
  gst_number TEXT DEFAULT '',              -- 15-character Indian GSTIN
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP,
  last_login_at TIMESTAMP,
  last_activity_at TIMESTAMP
);

-- 2. Stateful Sessions (7-day duration)
sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- 3. Document Repository & Vector Ingestion Catalog
documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,                -- 'pdf', 'docx', 'txt'
  file_size BIGINT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded',
  total_chunks INT DEFAULT 0,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 4. Conversations & Message History
conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                      -- 'user' or 'assistant'
  content TEXT NOT NULL,
  citations TEXT DEFAULT '[]',             -- JSON array with document title, section, page
  evidence_sources TEXT DEFAULT '[]',
  created_at TIMESTAMP
);

-- 5. Audit Trail & Generated Reports
audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  ip_address TEXT DEFAULT '',
  timestamp TIMESTAMP
);

reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  query TEXT NOT NULL,
  title TEXT NOT NULL,
  downloaded_at TIMESTAMP
);
```

---

## 9. Installation & Local Setup

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x+
- **Docker** *(Optional)*: If running local ChromaDB

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/Abhaygitbit/sih2.git
cd sih2
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=3000
NODE_ENV=development

# Gemini API Key for Statutory Legal Synthesis
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase PostgreSQL Connection String (Transaction Pooler Port 6543)
DATABASE_URL=postgresql://postgres.yourproject:yourpassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require

# ChromaDB Vector Store URL (Optional: falls back to in-memory if omitted)
CHROMA_URL=http://localhost:8000
```

### Step 3: Run the Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 10. Cloud Deployment Guide (Render + Supabase + Docker)

### Service 1: ChromaDB Vector Store (Docker Web Service)
1. In Render, select **New + > Web Service**.
2. Deploy the official Chroma image:
   - **Environment**: Docker
   - **Image**: `chromadb/chroma:latest`
   - **Port**: `8000`
3. Set environment variable: `IS_PERSISTENT=TRUE`.
4. Copy the service URL (e.g., `https://ipsakti-chroma.onrender.com`).

### Service 2: IP-SAKTI Full-Stack Web App (Node Web Service)
1. In Render, select **New + > Web Service** and connect your GitHub repository.
2. Build & Runtime Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start` (executes `node dist/server.cjs`)
3. Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `postgresql://postgres.xxx:xxx@aws-0-region.pooler.supabase.com:6543/postgres`
   - `CHROMA_URL`: `https://ipsakti-chroma.onrender.com`
   - `GEMINI_API_KEY`: *(Your Google AI Studio API key)*

---

## 11. Pre-Seeded Demo Credentials

The platform includes pre-seeded demo accounts for instant evaluation:

| Profile | Email Address | Password | Role & Purpose |
| :--- | :--- | :--- | :--- |
| **🌿 MSME Director** | `msme@herbals.com` | `User@12345` | Startup prior-art search, Section 3(e) synergy checks & report downloads. |
| **🔬 Lead Scientist** | `researcher@biotech.ac.in` | `User@12345` | Extraction methodology, phytosome formulations & dual USPTO/EPO strategy. |
| **👑 AYUSH Administrator** | `admin@ipsakti.in` | `Admin@12345` | Regulatory command center, document catalog, audit logs & vector health. |

*(Note: The platform also features instant 1-Click login buttons on the homepage for immediate access without manual typing.)*

---

## 12. Security & Compliance Highlights

- **Bcrypt Password Encryption**: Salt rounds = 10, preventing credential leakage.
- **Fail-Safe In-Memory Redundancy**: If external databases experience cold starts or network hiccups, the in-process fallback engine ensures continuous access.
- **Immutable Regulatory Audit Trails**: Every user login, document upload, search prompt, and report download is cryptographically recorded with timestamps and IP addresses.
- **Client Zero-Data Leaks**: All Gemini AI prompts run strictly server-side; API keys are never exposed to client-side bundles.

---

<p align="center">
  <b>Developed for Smart India Hackathon & National AYUSH IPR Innovation</b><br/>
  <i>Empowering Traditional Knowledge with Modern Intellectual Property Intelligence.</i>
</p>
