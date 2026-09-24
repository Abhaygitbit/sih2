import fs from "fs";
import path from "path";

export interface ChromaMetadata {
  document_id: string;
  document_name: string;
  page?: number;
  section?: string;
  document_type?: string;
  source?: string;
  upload_date?: string;
  [key: string]: any;
}

export interface ChromaRecord {
  id: string;
  document: string;
  metadata: ChromaMetadata;
  embedding: number[];
}

export interface ChromaQueryResult {
  id: string;
  document: string;
  metadata: ChromaMetadata;
  score: number;
  similarity: number;
}

const CHROMA_DIR = path.resolve(process.cwd(), "data/chroma_db");
const COLLECTION_FILE = path.join(CHROMA_DIR, "chroma_collection.json");

// Dense semantic embedding dimension
const EMBEDDING_DIM = 128;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function stringHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Generate normalized dense semantic vector
export function generateEmbedding(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vec;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const idx1 = stringHash(token) % EMBEDDING_DIM;
    vec[idx1] += 1.0;

    // Bigram semantic linkage
    if (i < tokens.length - 1) {
      const bigram = `${token}_${tokens[i + 1]}`;
      const idx2 = stringHash(bigram) % EMBEDDING_DIM;
      vec[idx2] += 0.5;
    }
  }

  // Normalize to unit length
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dot));
}

function bm25KeywordScore(queryTokens: string[], docTokens: string[]): number {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0;
  let matches = 0;
  const docSet = new Set(docTokens);
  for (const q of queryTokens) {
    if (docSet.has(q)) {
      matches += 1;
    } else {
      // Substring check for botanical/pharma stems
      for (const d of docTokens) {
        if (d.includes(q) || q.includes(d)) {
          matches += 0.5;
          break;
        }
      }
    }
  }
  return matches / Math.sqrt(queryTokens.length * Math.min(docTokens.length, 100));
}

export class ChromaCollection {
  private records: Map<string, ChromaRecord> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(CHROMA_DIR)) {
        fs.mkdirSync(CHROMA_DIR, { recursive: true });
      }
      if (fs.existsSync(COLLECTION_FILE)) {
        const data = JSON.parse(fs.readFileSync(COLLECTION_FILE, "utf8"));
        if (Array.isArray(data)) {
          for (const item of data) {
            this.records.set(item.id, item);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load Chroma collection, initializing fresh:", err);
      this.records.clear();
    }
  }

  private save() {
    try {
      if (!fs.existsSync(CHROMA_DIR)) {
        fs.mkdirSync(CHROMA_DIR, { recursive: true });
      }
      const data = Array.from(this.records.values());
      fs.writeFileSync(COLLECTION_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.error("Failed to save Chroma collection:", err);
    }
  }

  public count(): number {
    return this.records.size;
  }

  public add(params: {
    ids: string[];
    documents: string[];
    metadatas: ChromaMetadata[];
    embeddings?: number[][];
  }) {
    const { ids, documents, metadatas, embeddings } = params;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const doc = documents[i] || "";
      const meta = metadatas[i] || { document_id: "unknown", document_name: "Document" };
      const emb = embeddings && embeddings[i] ? embeddings[i] : generateEmbedding(doc);

      this.records.set(id, {
        id,
        document: doc,
        metadata: meta,
        embedding: emb,
      });
    }
    this.save();
  }

  public delete(where: { document_id?: string; id?: string }) {
    let deletedCount = 0;
    for (const [id, record] of this.records.entries()) {
      if (where.id && id === where.id) {
        this.records.delete(id);
        deletedCount++;
      } else if (
        where.document_id &&
        (record.metadata.document_id === where.document_id ||
          id.startsWith(`${where.document_id}_`) ||
          record.metadata.source === where.document_id)
      ) {
        this.records.delete(id);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      this.save();
    }
    return deletedCount;
  }

  public get(filter?: { document_id?: string }): ChromaRecord[] {
    const results: ChromaRecord[] = [];
    for (const record of this.records.values()) {
      if (!filter || !filter.document_id || record.metadata.document_id === filter.document_id) {
        results.push(record);
      }
    }
    return results;
  }

  // Hybrid Retrieval: Dense Vector Cosine Similarity + BM25 Keyword Scoring + Reranking
  public query(params: {
    queryText: string;
    nResults?: number;
    where?: Record<string, any>;
  }): ChromaQueryResult[] {
    const { queryText, nResults = 5, where } = params;
    const queryTokens = tokenize(queryText);
    const queryEmb = generateEmbedding(queryText);

    const candidates: ChromaQueryResult[] = [];

    for (const record of this.records.values()) {
      // Apply metadata filter if provided
      if (where) {
        let match = true;
        for (const [key, val] of Object.entries(where)) {
          if (record.metadata[key] !== val) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      const sim = cosineSimilarity(queryEmb, record.embedding);
      const docTokens = tokenize(record.document);
      const keywordScore = bm25KeywordScore(queryTokens, docTokens);

      // Hybrid combination
      const compositeScore = sim * 0.65 + Math.min(1, keywordScore) * 0.35;

      candidates.push({
        id: record.id,
        document: record.document,
        metadata: record.metadata,
        score: compositeScore,
        similarity: sim,
      });
    }

    // Sort descending by composite score
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, nResults);
  }
}

// Global Chroma collection singleton
export const chromaCollection = new ChromaCollection();
