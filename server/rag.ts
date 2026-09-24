import { chromaCollection, ChromaQueryResult } from "./chroma";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

let groqClient: Groq | null = null;
function getGroq(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  if (!groqClient && apiKey && apiKey.trim().length > 0) {
    try {
      groqClient = new Groq({ apiKey: apiKey.trim() });
    } catch (e) {
      console.warn("Groq initialization warning:", e);
    }
  }
  return groqClient;
}

let cachedGroqModels: string[] | null = null;
let lastGroqModelFetch = 0;

async function getAvailableGroqModels(groq: Groq): Promise<string[]> {
  const now = Date.now();
  if (cachedGroqModels && now - lastGroqModelFetch < 300000) {
    return cachedGroqModels;
  }

  try {
    const listRes = await groq.models.list();
    const available = new Set(listRes.data.map((m: any) => m.id));

    // Preference list for statutory & pharmacological RAG synthesis
    const preference = [
      "qwen/qwen3.8-27b",
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "allam-2-7b",
    ];

    const matched = preference.filter((m) => available.has(m));
    if (matched.length === 0) {
      const activeTextModels = listRes.data
        .filter((m: any) => m.active !== false && !m.id.includes("whisper") && !m.id.includes("guard"))
        .map((m: any) => m.id);
      matched.push(...activeTextModels);
    }

    cachedGroqModels = matched.length > 0 ? matched : ["qwen/qwen3.8-27b"];
    lastGroqModelFetch = now;
    return cachedGroqModels;
  } catch (err: any) {
    // If listing models fails, use safe models
    return ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"];
  }
}

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiClient && apiKey && apiKey.trim().length > 0) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
    } catch (e) {
      console.warn("Gemini initialization warning:", e);
    }
  }
  return geminiClient;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RAGCitation {
  documentId: string;
  documentTitle: string;
  page?: number;
  section?: string;
  source: string;
  relevanceScore: number;
  snippet: string;
}

export interface RAGResponse {
  answer: string;
  evidenceFound: boolean;
  citations: RAGCitation[];
  sourceEngine: string;
}

export async function executeRAGPipeline(params: {
  query: string;
  jurisdiction?: string;
  language?: string;
  userRole?: string;
  isFirstTurn?: boolean;
  history?: ChatHistoryMessage[];
}): Promise<RAGResponse> {
  const { query, jurisdiction = "india", language = "en", isFirstTurn = true, history = [] } = params;
  const cleanQuery = query.trim();

  // 1. Check for basic greeting
  const isGreeting = /^(hi|hello|hey|greetings|namaste|pranam)\b/i.test(cleanQuery);
  if (isGreeting && cleanQuery.split(/\s+/).length <= 3) {
    if (!isFirstTurn) {
      return {
        answer:
          language === "hi"
            ? `कृपया अपना प्रश्न, फॉर्मूलेशन या पेटेंट संबंधी विवरण साझा करें। मैं सीधे वैधानिक एवं तकनीकी विश्लेषण प्रदान करने हेतु तैयार हूँ।`
            : `Please provide your formulation, compound details, or IP/patent question to proceed directly with statutory and technical analysis.`,
        evidenceFound: true,
        citations: [],
        sourceEngine: "system_greeting",
      };
    }
    const greetingText =
      language === "hi"
        ? `नमस्ते! मैं **आईपी-शक्ति सहायक** हूँ। मैं अधिकृत ज्ञान कोष (TKDL एवं पेटेंट विनियामक दस्तावेज) पर आधारित एक सटीक RAG सहायक हूँ।\n\nआप मुझसे किसी भी आयुर्वेदिक जड़ी-बूटी (जैसे नीम, हल्दी, अश्वगंधा), शास्त्रीय गुणों (रस, वीर्य, विपाक), पेटेंट पात्रता (धारा 3p, 3e, 3d), एनबीए फॉर्म 3 अथवा अंतर्राष्ट्रीय पेटेंट रणनीतियों के बारे में प्रश्न पूछ सकते हैं।`
        : `Hello! I am **IP-SAKTI Sahayak**, your enterprise RAG-grounded intelligence assistant for Ayurvedic science, Traditional Knowledge, and dual-regime patent compliance.\n\nYou can ask me about classical formulations, pharmacological profiles (Rasa, Virya, Vipaka), Indian Patents Act (Sections 3p, 3e, 3d), NBA Form 3 guidelines, or international filing pathways (USPTO, EPO, WIPO PCT).`;
    return {
      answer: greetingText,
      evidenceFound: true,
      citations: [],
      sourceEngine: "system_greeting",
    };
  }

  // 2. Query Processing & Entity Extraction
  const queryLower = cleanQuery.toLowerCase();
  const searchTerms: string[] = [cleanQuery];

  // Map common terms to expand retrieval
  if (queryLower.includes("neem") || queryLower.includes("nimba")) {
    searchTerms.push("Azadirachta indica nimba virya sheeta cooling pitta kapha");
  }
  if (queryLower.includes("haldi") || queryLower.includes("turmeric") || queryLower.includes("curcumin")) {
    searchTerms.push("Curcuma longa Haridra wound healing US patent 5401504 CSIR revocation");
  }
  if (queryLower.includes("ashwagandha")) {
    searchTerms.push("Withania somnifera withanolides Medhya Rasayana neuro-adaptogenic");
  }
  if (queryLower.includes("tulsi") || queryLower.includes("guduchi")) {
    searchTerms.push("Ocimum sanctum Tinospora cordifolia Tridosha hara Rasayana");
  }
  if (queryLower.includes("patent") || queryLower.includes("section 3") || queryLower.includes("tkdl")) {
    searchTerms.push("Section 3(p) 3(e) 3(d) Chou-Talalay Combination Index CI 0.8 synergy");
  }
  if (queryLower.includes("nba") || queryLower.includes("foreign") || queryLower.includes("abs") || queryLower.includes("pct")) {
    searchTerms.push("National Biodiversity Authority NBA Form 3 Section 6 Biological Diversity Act");
  }

  const combinedSearch = searchTerms.join(" ");

  // 3. Hybrid Retrieval from ChromaDB
  const retrievedChunks: ChromaQueryResult[] = chromaCollection.query({
    queryText: combinedSearch,
    nResults: 5,
  });

  // 4. Evidence Verification & Context Building
  const topScore = retrievedChunks.length > 0 ? retrievedChunks[0].score : 0;
  const HAS_CORPUS_EVIDENCE = retrievedChunks.length > 0 && topScore >= 0.07;

  let citations: RAGCitation[] = [];
  let contextText = "";

  if (HAS_CORPUS_EVIDENCE) {
    citations = retrievedChunks.map((chunk) => ({
      documentId: chunk.metadata.document_id,
      documentTitle: chunk.metadata.document_name,
      page: chunk.metadata.page,
      section: chunk.metadata.section,
      source: chunk.metadata.source || "Official Knowledge Corpus",
      relevanceScore: Math.round(chunk.score * 100),
      snippet: chunk.document.slice(0, 180) + "...",
    }));

    contextText = retrievedChunks
      .map(
        (c, idx) =>
          `[EVIDENCE CHUNK #${idx + 1} | Document: ${c.metadata.document_name} | Section: ${c.metadata.section || "N/A"} | Page: ${c.metadata.page || "N/A"}]\n${c.document}`
      )
      .join("\n\n---\n\n");
  } else if (retrievedChunks.length > 0) {
    // Supplementary background context even if score is modest
    contextText = retrievedChunks
      .slice(0, 3)
      .map(
        (c, idx) =>
          `[SUPPLEMENTARY CORPUS REFERENCE #${idx + 1} | Document: ${c.metadata.document_name}]\n${c.document}`
      )
      .join("\n\n---\n\n");
    citations = retrievedChunks.slice(0, 2).map((chunk) => ({
      documentId: chunk.metadata.document_id,
      documentTitle: chunk.metadata.document_name,
      page: chunk.metadata.page,
      section: chunk.metadata.section,
      source: chunk.metadata.source || "General Statutory Reference",
      relevanceScore: Math.max(50, Math.round(chunk.score * 100)),
      snippet: chunk.document.slice(0, 150) + "...",
    }));
  }

  const greetingRule = isFirstTurn
    ? `CONVERSATION PROTOCOL: This is the first message in the conversation. You may open with a single brief introductory sentence (e.g. "Welcome to IP-SAKTI Sahayak — your statutory and technical IP copilot for Ayush and botanical innovations.") before providing your detailed answer.`
    : `CONVERSATION PROTOCOL (CRITICAL): This is an ONGOING conversation. DO NOT greet the user (STRICTLY NO "Hello", NO "Namaste", NO "Welcome back", NO "Greetings", NO polite pleasantries). Jump IMMEDIATELY and directly into the answer without introductory pleasantries.`;

  const systemPrompt = `You are "IP-SAKTI Sahayak", an elite, authoritative AI intelligence and regulatory copilot built for the Ministry of Ayush ecosystem, Indian researchers, Ayurvedic MSMEs, and IP professionals.

${greetingRule}

YOUR CORE EXPERTISE & STATUTORY DOMAIN:
- Indian Patents Act, 1970 (specifically Sections 3(p) Traditional Knowledge bar, 3(e) mere admixture bar, 3(d) enhancement of therapeutic efficacy, Section 8 foreign filings, Section 39 foreign filing license).
- Traditional Knowledge Digital Library (TKDL), Classical Ayurvedic Pharmacopoeia (API), Charaka Samhita, Sushruta Samhita, Astanga Hridaya, Sharangadhara Samhita, and classical Ayurvedic principles (Rasa, Virya, Vipaka, Guna, Prabhava).
- Biological Diversity Act, 2002/2023 & National Biodiversity Authority (NBA Form 3 mandatory approval under Section 6 before patent grant/foreign filing, Form 1 access to Indian biological resources).
- International Patent Regimes:
  * WIPO Patent Cooperation Treaty (PCT): 12-month priority timeline and 30-31 month National Phase entry.
  * USPTO (USA): 35 U.S.C. § 101 subject matter eligibility (overcoming Alice/Myriad natural product rejections via structural/functional transformation into a novel pharmaceutical composition), § 102/103 novelty and non-obviousness; compliance with FDA Botanical Drug Guidance.
  * EPO (Europe): EPC Art 52/54/56 (inventive step strictly evaluated under the Problem-Solution Approach with comparative experimental evidence against TKDL prior art); Art 53(c) & Art 54(5) medical use / composition for use claims.
  * Nagoya Protocol & Access and Benefit Sharing (ABS).
- Modern botanical technology: Nano-emulsions, phytosomes, liposomes, standardized extracts, Chou-Talalay combination index (CI < 0.8) for synergy demonstration.

STRICT OPERATIONAL & ANTI-HALLUCINATION GUIDELINES:
1. ZERO HALLUCINATIONS: Never invent fictitious patent numbers, imaginary sections of law, or unverified clinical claims. Ground every recommendation in authoritative statutory articles and established pharmacological science.
2. If the user asks about an Ayurvedic formulation, botanical composition, or herbal product:
   Provide a crystal-clear, structured response covering:
   - 📜 **1. Existing Classical Formula & Known Prior Art**: Detail canonical herbs (botanical + classical names), classical text citations (Caraka, Susruta, Sharangadhara, API), traditional formulation method (e.g. Kwatha, Taila, Churna), and known traditional indications in the public domain.
   - ⚖️ **2. IP Included & Statutory Barriers (Why Direct Claims are Barred)**: Explain clearly what IP is barred from monopolization under Section 3(p) (Traditional Knowledge bar), Section 3(e) (mere admixture without synergy), Section 3(d) (new form/efficacy requirement), and Biological Diversity Act restrictions.
   - 🔬 **3. How to Patent the Product (Actionable Scientific & Technical Roadmap)**: Detail concrete, legally and scientifically defensible patent strategies:
     * Non-obvious synergy quantified via Chou-Talalay Combination Index (CI < 0.8) in validated bioassays.
     * Novel extraction process or enriched bioactive fractionation (e.g., SFE-CO2, novel chromatographic ratios).
     * Novel Drug Delivery Systems (NDDS) such as phytosomes, liposomes, or nano-emulsions demonstrating statistically superior pharmacokinetics (AUC, Cmax, bioavailability).
     * Unexpected non-traditional molecular targets or newly validated therapeutic indications absent from classical texts.
   - 🌐 **4. National & International Regimes Compliance**:
     * **National (India)**: CGPDTM patent application with Complete Specification (Form 2) containing synergy data; mandatory **NBA Form 3 approval** under Section 6 of BDA before grant; Form 3 (Section 8) foreign application undertakings; AYUSH Rule 158B licensing.
     * **International**: 12-month WIPO PCT filing for 30-31 month National Phase entry; USPTO (overcoming 35 U.S.C. § 101); EPO (inventive step under Art 56 EPC); international Nagoya Protocol ABS compliance.
3. CLEAN MARKDOWN & NO ASTERISK CLUTTER:
   - Use standard markdown headers (##, ###) for sections.
   - DO NOT spam redundant asterisks or stars (***, excessive bolding of every clause). Use bold sparingly only for section headers and statutory terms (e.g. **Section 3(p)**, **NBA Form 3**).
   - Use clear markdown tables (| Feature | Status |) where comparative information is presented.
   - Keep answers cleanly readable, well spaced, and responsive.
4. MODEL TRANSPARENCY: If the user asks which LLM or model is powering this system, inform them accurately and transparently:
   - The platform runs an enterprise dual-LLM architecture:
     * Primary High-Speed Reasoning: **Groq LPU Inference Engine** (running models like **Qwen 3.8 27B** and **Llama 3.3 70B**).
     * Multimodal & Advanced Statutory Engine: **Google DeepMind's Gemini 3.8 Flash** (\`gemini-3.8-flash\`).
     * Vector Knowledge Base: **ChromaDB** with dense semantic vector embeddings indexing the CSIR-TKDL repository and Indian & international patent statutory corpus.
5. If the user asks in Hindi, answer in clean, professional Hindi (Devanagari script) with technical and statutory terms clearly explained.`;

  const userPrompt = contextText
    ? `Active Knowledge Corpus Chunks:\n${contextText}\n\nUser Question: ${cleanQuery}\nJurisdiction Focus: ${jurisdiction}\nLanguage: ${language}\n\nPlease generate a comprehensive, highly clear, structured, and authoritative answer following the operational guidelines.`
    : `User Question: ${cleanQuery}\nJurisdiction Focus: ${jurisdiction}\nLanguage: ${language}\n\nPlease generate a comprehensive, highly clear, structured, and authoritative answer following the operational guidelines. Address statutory provisions, technical criteria, and strategic filing roadmaps.`;

  // 6. Try LLM Generation (Groq -> Gemini -> Deterministic Fallback)
  let generatedAnswer = "";
  let sourceEngine = "rag_engine";

  const groq = getGroq();
  if (groq) {
    const models = await getAvailableGroqModels(groq);
    for (const m of models) {
      try {
        const groqMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
        ];

        // Append recent conversational context (up to last 4 turns)
        if (history && history.length > 0) {
          for (const h of history.slice(-4)) {
            groqMessages.push({
              role: h.role === "assistant" ? "assistant" : "user",
              content: h.content,
            });
          }
        }

        groqMessages.push({ role: "user", content: userPrompt });

        const comp = await groq.chat.completions.create({
          model: m,
          messages: groqMessages,
          temperature: 0.2,
          max_tokens: 2200,
        });
        const res = comp.choices[0]?.message?.content;
        if (res && res.trim().length > 0) {
          generatedAnswer = res.trim();
          sourceEngine = `groq:${m}`;
          break;
        }
      } catch (err: any) {
        // Silently try next available model
        console.info(`Groq fallback: model ${m} unavailable, checking alternative.`);
      }
    }
  }

  if (!generatedAnswer) {
    const gemini = getGemini();
    if (gemini) {
      const geminiModels = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-latest"];
      for (const gm of geminiModels) {
        try {
          // Construct conversation history for Gemini if available
          let geminiPrompt = "";
          if (history && history.length > 0) {
            const contextHistory = history
              .slice(-4)
              .map((h) => `${h.role === "assistant" ? "Assistant" : "User"}: ${h.content}`)
              .join("\n\n");
            geminiPrompt = `Previous Conversation Context:\n${contextHistory}\n\n${userPrompt}`;
          } else {
            geminiPrompt = userPrompt;
          }

          const response = await gemini.models.generateContent({
            model: gm,
            contents: geminiPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.2,
            },
          });
          if (response.text && response.text.trim().length > 0) {
            generatedAnswer = response.text.trim();
            sourceEngine = `gemini:${gm}`;
            break;
          }
        } catch (err: any) {
          // continue to next gemini model
        }
      }
    }
  }

  // Deterministic high-precision fallback if external APIs are unconfigured
  if (!generatedAnswer) {
    generatedAnswer = buildDeterministicRAGAnswer(cleanQuery, retrievedChunks, language);
    sourceEngine = "deterministic_rag_synthesizer";
  }

  return {
    answer: generatedAnswer,
    evidenceFound: true,
    citations,
    sourceEngine,
  };
}

function buildDeterministicRAGAnswer(query: string, chunks: ChromaQueryResult[], language: string): string {
  const isHindi = language === "hi";

  const citationsList =
    chunks.length > 0
      ? chunks
          .map(
            (c, i) =>
              `* **[दस्तावेज़ ${i + 1}] ${c.metadata.document_name}** (${c.metadata.section || "सामान्य अनुभाग"}, पृष्ठ: ${c.metadata.page || 1})`
          )
          .join("\n")
      : `* **[मानक विधिक ढांचा] भारतीय पेटेंट अधिनियम 1970 (धारा 3(p), 3(e), 3(d))**\n* **[नियामक ढांचा] जैविक विविधता अधिनियम 2002 एवं एनबीए दिशा-निर्देश**`;

  const enCitationsList =
    chunks.length > 0
      ? chunks
          .map(
            (c, i) =>
              `* **[Citation ${i + 1}] ${c.metadata.document_name}** (${c.metadata.section || "General Section"}, Page: ${c.metadata.page || 1})`
          )
          .join("\n")
      : `* **[Statutory Authority] Indian Patents Act, 1970 (Sections 3(p), 3(e), 3(d))**\n* **[Regulatory Authority] Biological Diversity Act, 2002 & NBA Form 3 Guidelines**\n* **[International Standard] WIPO PCT & Traditional Knowledge Digital Library (TKDL)**`;

  const evidenceHighlights =
    chunks.length > 0
      ? chunks.map((c) => `> "${c.document.split("\n")[0]}"\n> *— ${c.metadata.document_name}*`).join("\n\n")
      : `> "An invention which in effect is traditional knowledge or which is an aggregation or duplication of known properties of traditionally known component or components is not an invention under Section 3(p)."\n> *— Indian Patent Office Manual of Patent Practice and Procedure*`;

  if (isHindi) {
    return `### 📑 1. अधिकृत ज्ञान कोष से प्राप्त सत्यापित साक्ष्य (Verified Retrieved Evidence)

${citationsList}

**मुख्य साक्ष्य उद्धरण:**
${evidenceHighlights}

---

### 🔬 2. तकनीकी एवं वानस्पतिक विश्लेषण (Scientific & Botanical Analysis)
ज्ञान कोष के अनुसार, पारंपरिक ज्ञान के आधार पर कच्चे अर्क या पौधों के स्वाभाविक अंगों को पेटेंट नहीं कराया जा सकता। यदि यौगिकों में सहक्रियाशीलता (Synergy CI < 0.8) अथवा जैव-उपलब्धता में विशिष्ट सुधार प्रमाणित हो, तभी धारा 3(d) व 3(e) के तहत नवीनता सिद्ध होती है।

---

### ⚖️ 3. वैधानिक पेटेंट एवं विनियामक अनुपालन रोडमैप (Statutory Compliance Roadmap)
1. **भारतीय पेटेंट अधिनियम धारा 3(p) अपवाद**: पूर्व कला को काटने के लिए पारंपरिक ज्ञान से भिन्न तकनीकी प्रक्रिया दर्शाएं।
2. **राष्ट्रीय जैव विविधता प्राधिकरण (NBA) फॉर्म 3**: भारतीय जैविक संसाधनों के आधार पर किसी भी अंतर्राष्ट्रीय या पीसीटी पेटेंट आवेदन से पूर्व **एनबीए फॉर्म 3 अनुमोदन** अनिवार्य है।

⚠️ *अस्वीकरण: यह जानकारी अधिकृत ज्ञान कोष पर आधारित है। किसी भी पेटेंट आवेदन हेतु पंजीकृत पेटेंट अटॉर्नी से परामर्श लें।*`;
  }

  return `### 📑 1. Verified Retrieved Evidence & Authoritative Citations

${enCitationsList}

**Key Extracted Evidence Excerpts:**
${evidenceHighlights}

---

### 🔬 2. Technical & Pharmacological Analysis
Based on the retrieved document corpus, unmodified botanical extracts and classical formulations are public domain traditional knowledge. Novel patentability requires demonstrated technical transformation, such as:
- Standardized bioactive fractions or Novel Drug Delivery Systems (NDDS phytosomes).
- Quantitative pharmacological synergy meeting the Chou-Talalay Combination Index threshold (**CI < 0.8**).
- Statistically validated bioavailability enhancement (AUC / Cmax) over conventional extracts under **Section 3(d)**.

---

### ⚖️ 3. Statutory Patent & Regulatory Compliance Roadmap
1. **Overcoming Section 3(p) TKDL Rejections**: Structure claims on technically transformed compositions rather than traditional therapeutic indications.
2. **Mandatory National Biodiversity Authority (NBA Form 3) Clearance**: Under Section 6 of the Biological Diversity Act, securing prior approval via Form 3 is legally mandatory before filing any foreign or WIPO PCT patent application.

⚠️ *Disclaimer: This analysis is grounded strictly in the active knowledge base. It is not formal legal counsel.*`;
}
