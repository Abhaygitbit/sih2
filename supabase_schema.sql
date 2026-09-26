-- =========================================================================
-- IP-SAKTI Sahayak Enterprise AI Platform
-- Production PostgreSQL Database Schema for Supabase
-- =========================================================================

-- Enable pgvector extension for high-performance in-database similarity search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores authenticated users (MSMEs, Researchers, Government Admin)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    user_type TEXT NOT NULL DEFAULT 'MSMEs' CHECK (user_type IN ('MSMEs', 'Researchers/Searchers', 'Admin')),
    organization TEXT DEFAULT '',
    gst_number TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- -------------------------------------------------------------------------
-- 2. SESSIONS TABLE
-- Session tokens for stateless or stateful bearer token authentication
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- -------------------------------------------------------------------------
-- 3. CONVERSATIONS TABLE
-- Legal research threads per user
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- -------------------------------------------------------------------------
-- 4. MESSAGES TABLE
-- Individual user queries and AI statutory RAG responses with citations
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations TEXT DEFAULT '[]', -- JSON string or JSONB of statutory citations
    evidence_sources TEXT DEFAULT '[]', -- JSON string or JSONB of document chunk IDs
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id);

-- -------------------------------------------------------------------------
-- 5. DOCUMENTS TABLE
-- Uploaded regulatory PDFs, AYUSH Gazette notifications, TKDL patents
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'indexed', 'error')),
    error_message TEXT DEFAULT '',
    total_chunks INT DEFAULT 0,
    uploaded_by TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'ayush-documents',
    storage_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- -------------------------------------------------------------------------
-- 6. DOCUMENT CHUNKS TABLE (Hybrid RAG + pgvector)
-- Chunks for semantic vector search directly in Supabase or synced with ChromaDB
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    page_number INT,
    section_header TEXT,
    embedding vector(128), -- Matches app semantic vector dimension
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id ON document_chunks(document_id);
-- HNSW index for sub-millisecond cosine vector similarity search:
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
    ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- -------------------------------------------------------------------------
-- 7. AUDIT LOGS TABLE
-- Statutory compliance audit trail for Indian Government transparency
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    ip_address TEXT DEFAULT '',
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- -------------------------------------------------------------------------
-- 8. REPORTS TABLE
-- Downloaded compliance audit reports generated by MSMEs and Researchers
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    query TEXT NOT NULL,
    title TEXT NOT NULL,
    downloaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- -------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKET CONFIGURATION (Run in Supabase SQL Editor)
-- -------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('ayush-documents', 'ayush-documents', true)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 10. DEFAULT SEED USERS
-- Passwords:
-- Admin:      admin@ipsakti.in    / Admin@12345
-- MSME:       msme@herbals.com    / User@12345
-- Researcher: researcher@biotech.ac.in / User@12345
-- -------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, user_type, organization, status, created_at, last_login_at, last_activity_at)
VALUES 
    (
        'usr_admin_default',
        'IP-SAKTI Regulatory Administrator',
        'admin@ipsakti.in',
        '$2b$10$wT0vRz2yK2Q1h4A7p7Q7q.V9wzG7LqGvBwXk1J7A7c9a.B8cD0e1F',
        'ADMIN',
        'Admin',
        'Ministry of AYUSH / Patent Controller Office',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'usr_msme_default',
        'Rajesh Sharma (MSME Director)',
        'msme@herbals.com',
        '$2b$10$wT0vRz2yK2Q1h4A7p7Q7q.V9wzG7LqGvBwXk1J7A7c9a.B8cD0e1F',
        'USER',
        'MSMEs',
        'Arya Vaidya Herbal Formulations Pvt Ltd',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'usr_researcher_default',
        'Dr. Ananya Sen (Principal Scientist)',
        'researcher@biotech.ac.in',
        '$2b$10$wT0vRz2yK2Q1h4A7p7Q7q.V9wzG7LqGvBwXk1J7A7c9a.B8cD0e1F',
        'USER',
        'Researchers/Searchers',
        'National Botanical Research & Biotech Institute',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (email) DO NOTHING;
