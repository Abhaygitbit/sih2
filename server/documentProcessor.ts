import fs from "fs";
import path from "path";
import { createRequire } from "module";

const getNodeRequire = () => {
  if (typeof require !== "undefined") {
    return require;
  }
  return createRequire(typeof __filename !== "undefined" ? __filename : path.join(process.cwd(), "server.js"));
};

const customRequire = getNodeRequire();
const mammoth = customRequire("mammoth");
import { getDb, logAuditEvent } from "./db";
import { chromaCollection, generateEmbedding, ChromaMetadata } from "./chroma";

async function extractPdfText(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);

  // If file doesn't have PDF magic bytes '%PDF', check if it's plain text saved with .pdf extension
  const header = dataBuffer.slice(0, 5).toString("utf8");
  if (!header.startsWith("%PDF")) {
    const asText = dataBuffer.toString("utf8");
    if (!asText.includes("\0\0\0") && asText.trim().length > 10) {
      return asText;
    }
  }

  const pModule = customRequire("pdf-parse");

  try {
    // Support pdf-parse v2 (class PDFParse)
    if (pModule && pModule.PDFParse) {
      const parser = new pModule.PDFParse({ data: dataBuffer });
      const res = await parser.getText();
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
      return res?.text || "";
    }

    // Support default export if class
    if (pModule && typeof pModule.default === "function" && pModule.default.prototype?.getText) {
      const parser = new pModule.default({ data: dataBuffer });
      const res = await parser.getText();
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
      return res?.text || "";
    }

    // Support legacy pdf-parse v1 function
    if (typeof pModule === "function") {
      const pdfData = await pModule(dataBuffer);
      return pdfData?.text || "";
    }

    if (pModule && typeof pModule.default === "function") {
      const pdfData = await pModule.default(dataBuffer);
      return pdfData?.text || "";
    }
  } catch (parseError: any) {
    // Fallback: check if the document contains readable text
    const asText = dataBuffer.toString("utf8");
    if (!asText.includes("\0\0\0") && asText.trim().length > 20) {
      return asText;
    }
    throw parseError;
  }

  throw new Error("Compatible PDF parser engine not available");
}

export interface ProcessDocumentOptions {
  documentId: string;
  filePath: string;
  fileType: "pdf" | "docx" | "txt";
  title: string;
  originalName: string;
  uploadedBy: string;
}

export async function processDocumentFile(options: ProcessDocumentOptions) {
  const { documentId, filePath, fileType, title, originalName, uploadedBy } = options;
  const db = await getDb();

  try {
    // 1. State: Extracting
    await updateDocumentStatus(documentId, "extracting", "");

    let rawText = "";
    if (fileType === "pdf") {
      rawText = await extractPdfText(filePath);
    } else if (fileType === "docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      rawText = result.value || "";
    } else {
      // Plain text or fallback
      rawText = fs.readFileSync(filePath, "utf8");
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("No readable text could be extracted from document. If this is a scanned PDF, please upload a text-searchable version.");
    }

    // 2. Clean Text
    const cleanedText = cleanExtractedText(rawText);

    // 3. State: Chunking
    await updateDocumentStatus(documentId, "chunking", "");
    const chunks = chunkText(cleanedText, title, documentId);

    if (chunks.length === 0) {
      throw new Error("Document produced zero valid text chunks.");
    }

    // 4. State: Embedding & Indexing
    await updateDocumentStatus(documentId, "embedding", "");

    const ids: string[] = [];
    const documents: string[] = [];
    const metadatas: ChromaMetadata[] = [];
    const embeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${documentId}_chunk_${i + 1}`;
      ids.push(chunkId);
      documents.push(chunk.text);
      metadatas.push({
        document_id: documentId,
        document_name: title,
        page: chunk.page,
        section: chunk.section,
        document_type: fileType.toUpperCase(),
        source: originalName,
        upload_date: new Date().toISOString(),
      });
      embeddings.push(generateEmbedding(chunk.text));
    }

    await updateDocumentStatus(documentId, "indexing", "");
    // Remove any previous chunks for this document
    chromaCollection.delete({ document_id: documentId });
    chromaCollection.add({
      ids,
      documents,
      metadatas,
      embeddings,
    });

    // 5. State: Processed
    await db.query(
      `
      UPDATE documents 
      SET status = 'processed', total_chunks = $1, error_message = '', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `,
      [chunks.length, documentId]
    );

    await logAuditEvent({
      userId: uploadedBy,
      action: "document_indexed",
      resource: `document:${documentId}`,
      metadata: {
        title,
        total_chunks: chunks.length,
        fileType,
      },
    });

    return { success: true, chunksCount: chunks.length };
  } catch (error: any) {
    console.error(`Document processing failed for ${documentId}:`, error);
    await updateDocumentStatus(documentId, "failed", error?.message || "Processing failed");
    return { success: false, error: error?.message };
  }
}

async function updateDocumentStatus(id: string, status: string, errorMessage = "") {
  const db = await getDb();
  await db.query(
    `
    UPDATE documents 
    SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3;
  `,
    [status, errorMessage, id]
  );
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ") // Only strip non-printable ASCII control codes, preserve Unicode
    .trim();
}

interface TextChunk {
  text: string;
  page: number;
  section: string;
}

function chunkText(text: string, docTitle: string, _docId: string): TextChunk[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let currentSection = docTitle;
  let estimatedPage = 1;
  let wordCountOnPage = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect section headers
    if (
      trimmed.length < 80 &&
      (trimmed.endsWith(":") ||
        /^[0-9]+(\.[0-9]+)*\s+/.test(trimmed) ||
        /^(chapter|section|part|article|schedule|act)\b/i.test(trimmed))
    ) {
      currentSection = trimmed;
    }

    const paraWords = trimmed.split(/\s+/).length;
    wordCountOnPage += paraWords;
    if (wordCountOnPage > 450) {
      estimatedPage += 1;
      wordCountOnPage = 0;
    }

    if ((currentChunk + " " + trimmed).split(/\s+/).length > 280) {
      if (currentChunk.trim().length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          page: estimatedPage,
          section: currentSection,
        });
      }
      currentChunk = trimmed;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmed}` : trimmed;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      page: estimatedPage,
      section: currentSection,
    });
  }

  return chunks;
}

// Default Seed Knowledge Corpus
export async function seedDefaultKnowledgeCorpus() {
  const db = await getDb();
  const existingDocs = await db.query(`SELECT COUNT(*) as count FROM documents;`);
  const count = parseInt(String((existingDocs.rows[0] as any)?.count || "0"), 10);

  if (count > 0 && chromaCollection.count() > 0) {
    return; // Already initialized
  }

  const seedDocuments = [
    {
      id: "doc_tkdl_botanical_compendium",
      title: "TKDL Reference Dossier: Classical Botanical Formulations & Bioactive Profiles",
      originalName: "TKDL_Ayurveda_Materia_Medica_CSIR.pdf",
      fileType: "pdf",
      fileSize: 1845000,
      uploadedBy: "usr_admin_default",
      chunks: [
        {
          section: "1. Neem (Azadirachta indica / Nimba) - Classical Formulation & Pharmacology",
          page: 14,
          text: `Azadirachta indica (A. Juss), known classically as Nimba, Arishta, and Pichumarda in Charaka Samhita and Sushruta Samhita.
Pharmacological profile: Rasa is Tikta (bitter) and Kashaya (astringent). Guna is Laghu (light) and Ruksha (dry). Virya is SHEETA (COOLING potency) - it has a strictly cooling thermodynamic action, NOT heating! Vipaka is Katu (pungent post-digestive).
Dosha Karma: Pacifies Pitta and Kapha dosha. Excessive unguided use may aggravate Vata.
Therapeutic Actions: Raktashodhaka (potent blood purifier), Krimighna (antimicrobial, deworming, antiprotozoal), Pramehaghna (anti-diabetic, improves insulin sensitivity), Kushthaghna (efficacious in dermatological lesions, psoriasis, acne).
Traditional Safe Usage: 2-4 fresh tender leaves chewed in morning, or 5-10 ml fresh expressed swarasa with warm water for 15-21 days during Ritu Sandhi (spring transition).
Contraindications: Strictly contraindicated in pregnancy, active conception attempts, and individuals with severe Vata emaciation.`
        },
        {
          section: "2. Curcumin / Haridra (Curcuma longa) - Classical Uses and Landmark IP Defence",
          page: 32,
          text: `Curcuma longa (Haridra / Haldi), Rhizoma Curcumae Longae. Classical references: Charaka Samhita Sutrasthana 4/16 (Lekhaniya and Kusthaghna Mahakashaya), Ashtanga Hridaya.
Pharmacological profile: Rasa is Tikta and Katu. Virya is Ushna (heating potency). Vipaka is Katu. Dosha karma: Balances Kapha and Vata; detoxifies Rakta and Pitta without vitiating agni.
Key Bioactives: Curcuminoids (diferuloylmethane), volatile oils (turmerone, zingiberene).
Landmark IP Precedent: US Patent 5,401,504 granted to University of Mississippi Medical Center in 1995 claiming turmeric for wound healing. CSIR India successfully challenged and revoked this patent in 1997 at the USPTO by submitting 32 classical Sanskrit and Urdu textual references proving prior public knowledge.
Patentability Standard: Raw curcumin or standard turmeric powder is strictly non-patentable public domain traditional knowledge under Indian Patents Act Section 3(p). Synergistic phytosomal lipid nanoparticles exhibiting >300% bioavailability improvement may qualify under Section 3(d) and 3(e).`
        },
        {
          section: "3. Ashwagandha (Withania somnifera) - Neuro-Adaptogenic Pharmacology",
          page: 58,
          text: `Withania somnifera (Dunal), known as Ashwagandha, Asgandh, Winter Cherry. Authoritative texts: Bhavaprakasha Nighantu (Guduchyadi Varga), Caraka Cikitsa 1/1 (Rasayana Adhyaya).
Pharmacological profile: Rasa is Tikta, Kashaya, Madhura. Virya is Ushna (warming potency). Vipaka is Madhura. Guna is Guru (heavy) and Snigdha (unctuous).
Dosha karma: Potent Vata-Kapha shamaka; excessive dosage may slightly elevate Pitta.
Therapeutic Actions: Medhya Rasayana (neuro-regenerative, adaptogenic, nootropic), Balya and Brimhana (tissue nourishing, strength promoting), Shukrala (spermatogenic), Shothahara (anti-inflammatory).
Phytochemistry: Withanolides (withaferin A, withanolide D), withanosides, and somniferine.
Standardization & Regulatory: Commercial phytopharmaceuticals require standardized withanolide content of not less than 2.5% w/w by HPLC under Ayurvedic Pharmacopoeia of India (API) standards.`
        },
        {
          section: "4. Tulsi (Ocimum sanctum) & Guduchi (Tinospora cordifolia) - Immuno-respiratory Actions",
          page: 81,
          text: `Ocimum sanctum (Tulsi / Holy Basil): Virya is Ushna (warming). Rasa is Katu and Tikta. Highly efficacious for Kasa (cough), Shwasa (bronchial asthma), and Vishama Jwara (intermittent viral fevers). Contains eugenol, ursolic acid, and rosmarinic acid.
Tinospora cordifolia (Guduchi / Giloy / Amrita): Classical Tridosha-hara (balances all three doshas Vata, Pitta, Kapha). Virya is Ushna. Rasa is Tikta and Kashaya.
Special Action: Rasayana (immunomodulatory, stimulates macrophage phagocytosis), Jwaraghna (antipyretic), Yakrit-plihodara hara (hepatoprotective).
Prior Art Defense: Classical preparations like Guduchi Kwatha, Samsamani Vati, and Sanjeevani Vati are documented in the Ayurvedic Formulary of India (AFI Part 1) and are protected from wrongful domestic and international patents under Section 3(p).`
        }
      ]
    },
    {
      id: "doc_patents_act_guidelines",
      title: "Indian Patents Act 1970 - Sections 3(p), 3(e), 3(d) Examination Guidelines",
      originalName: "CGPDTM_Ayurveda_Patent_Guidelines_2023.pdf",
      fileType: "pdf",
      fileSize: 1240000,
      uploadedBy: "usr_admin_default",
      chunks: [
        {
          section: "Section 3(p) - Traditional Knowledge Exclusion Bar",
          page: 5,
          text: `Section 3(p) of the Indian Patents Act 1970 mandates that 'an invention which in effect is traditional knowledge or which is an aggregation or duplication of known properties of traditionally known component or components' is NOT an invention within the meaning of this Act.
Examination Standard: Examiners cite CSIR's Traditional Knowledge Digital Library (TKDL) containing over 450,000 formulations from classical texts (Caraka Samhita, Susruta Samhita, Astanga Hrdaya, Siddha Vaidya Thirattu, Unani Qarabadeen).
Any attempt to claim a plant extract, raw herbal powder, or traditional concoction for its documented traditional indication is automatically rejected under Section 3(p).`
        },
        {
          section: "Section 3(e) - Synergistic Formulations & Non-Obviousness Threshold",
          page: 18,
          text: `Section 3(e) bars 'a substance obtained by a mere admixture resulting only in the aggregation of the properties of the components thereof or a process for producing such substance'.
To overcome Section 3(e):
1. The applicant must submit quantitative experimental evidence showing non-obvious synergistic interaction between the components.
2. Synergy must be scientifically quantified using the Chou-Talalay Combination Index (CI). A CI value < 0.8 must be established in validated in vitro or in vivo pharmacology assays.
3. The therapeutic outcome of the formulation (C) must be statistically and significantly greater than the additive sum of individual components (A + B). Mere additive or complementary effects will be rejected under Section 3(e).`
        },
        {
          section: "Section 3(d) - Therapeutic Bioavailability & New Forms Requirement",
          page: 29,
          text: `Section 3(d) mandates that the mere discovery of a new form of a known substance which does not result in the enhancement of the known efficacy of that substance is not patentable.
Application to Herbal Pharmaceuticals:
Novel Drug Delivery Systems (NDDS) such as phytosomes, self-nanoemulsifying drug delivery systems (SNEDDS), and lipid nanoparticles containing Ayurvedic bioactives must establish enhanced biological efficacy (e.g., statistically significant increase in plasma AUC and Cmax exceeding 200-300% over conventional extracts).
Improved physicochemical stability alone is insufficient; demonstrated enhancement of biological/therapeutic efficacy is statutory.`
        }
      ]
    },
    {
      id: "doc_nba_abs_protocol",
      title: "Biological Diversity Act 2002/2023 & NBA Form 3 Statutory Compliance Manual",
      originalName: "NBA_ABS_Rule6_Form3_Compliance.pdf",
      fileType: "pdf",
      fileSize: 980000,
      uploadedBy: "usr_admin_default",
      chunks: [
        {
          section: "Section 6 - Mandatory NBA Form 3 Prior Approval for Patent Applications",
          page: 4,
          text: `Under Section 6 of the Biological Diversity Act 2002 (as amended in 2023):
No person shall apply for any intellectual property right, by whatever name called, in or outside India for any invention based on any research or information on a biological resource obtained from India without prior approval of the National Biodiversity Authority (NBA).
Statutory Form: Form 3 (Application for seeking prior approval of NBA for applying for Intellectual Property Right).
Criminal Liability: Filing an international patent application (e.g., via WIPO PCT, USPTO, EPO, or national phase) based on Indian bio-resources without obtaining NBA Form 3 approval is a non-bailable, cognizable offense under the Biological Diversity Act.
Domestic vs. Foreign Timing: For Indian patent applications, Form 3 approval must be secured before the grant of the patent. For foreign patent applications, Form 3 approval must be obtained prior to filing the application abroad.`
        },
        {
          section: "Access and Benefit Sharing (ABS) & Nagoya Protocol Harmonization",
          page: 15,
          text: `Commercialization of biological resources requires execution of an Access and Benefit Sharing (ABS) agreement with the National Biodiversity Authority or relevant State Biodiversity Boards (SBB).
Exemptions: Classical codified formulations utilized by registered ASU (Ayurveda, Siddha, Unani) vaidyas and local practitioners are exempted from domestic access fees; however, commercial industrial exploitation, biotechnology modifications, and export patenting attract mandatory benefit-sharing levies (typically 0.1% to 0.5% of ex-factory sale price).
Nagoya Protocol: Internationally Recognized Certificate of Compliance (IRCC) must be cited in global patent disclosures to establish legal bioprospecting origins.`
        }
      ]
    },
    {
      id: "doc_international_patent_manual",
      title: "International Comparative Patent Manual (USPTO vs. EPO vs. JPO vs. PCT)",
      originalName: "Global_Ayurveda_Patent_Drafting_Manual.pdf",
      fileType: "pdf",
      fileSize: 1450000,
      uploadedBy: "usr_admin_default",
      chunks: [
        {
          section: "United States (USPTO) - 35 U.S.C. §§ 101, 102, 103 and Method of Treatment",
          page: 7,
          text: `United States Patent and Trademark Office (USPTO) Examination of Herbal Inventions:
1. 35 U.S.C. § 101 Natural Products Doctrine: Following landmark Supreme Court rulings in AMP v. Myriad Genetics (2013) and Mayo Collaborative v. Prometheus (2012), naturally occurring plants, unpurified extracts, and correlation laws are ineligible subject matter. To qualify, applicant must establish 'markedly different characteristics' (e.g., specific chemical enrichment, engineered nanoparticles, or synthetic structural derivatives).
2. Method of Treatment Claims: Unlike India and Europe, the USPTO explicitly PERMITS method of treatment claims. Permissible Claim Template: 'A method of treating inflammatory osteoarthritis in a subject in need thereof, comprising administering an effective oral dosage of composition X...'
3. Commercial Regulatory Pipeline: Products can enter the US market either through the FDA CDER Botanical Drug Development Guidance (21 CFR 312 IND/NDA pathway) or as dietary supplements under DSHEA 1994.`
        },
        {
          section: "Europe (EPO) - EPC Articles 52, 54, 56 & EPC Art 53(c) Treatment Prohibition",
          page: 22,
          text: `European Patent Office (EPO - 39 EPC Contracting States):
1. Prohibition on Medical Treatment: EPC Article 53(c) strictly PROHIBITS claims directed to methods for treatment of the human or animal body by surgery or therapy, and diagnostic methods. Any US-style 'method of treating' claim is immediately rejected.
2. EPC 2000 Purpose-Limited Product Claims: Innovators must draft claims as EPC 2000 purpose-limited product claims: 'Composition Y comprising standardized Withania somnifera fraction and piperine in a ratio of 10:1 for use in the treatment of neurodegenerative dementia.'
3. Inventive Step (EPC Art 56): EPO strictly applies the problem-solution approach. The invention must solve an objective technical problem in a non-obvious manner compared to closest TKDL prior art citations, backed by verifiable comparative synergy data.`
        }
      ]
    }
  ];

  for (const doc of seedDocuments) {
    const docPath = path.join(process.cwd(), "data/uploads", doc.originalName);
    if (!fs.existsSync(path.dirname(docPath))) {
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
    }
    // Write placeholder document file
    fs.writeFileSync(docPath, doc.chunks.map((c) => `${c.section}\n\n${c.text}`).join("\n\n---\n\n"), "utf8");

    try {
      await db.query(
        `
        INSERT INTO documents (id, title, original_name, file_path, file_type, file_size, status, total_chunks, uploaded_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'processed', $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET status = 'processed', total_chunks = $7;
      `,
        [doc.id, doc.title, doc.originalName, docPath, doc.fileType, doc.fileSize, doc.chunks.length, doc.uploadedBy]
      );
    } catch (insertErr) {
      try {
        // Fallback for custom Supabase constraints that expect 'uploaded' or 'completed'
        await db.query(
          `
          INSERT INTO documents (id, title, original_name, file_path, file_type, file_size, status, total_chunks, uploaded_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'uploaded', $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO NOTHING;
        `,
          [doc.id, doc.title, doc.originalName, docPath, doc.fileType, doc.fileSize, doc.chunks.length, doc.uploadedBy]
        );
      } catch (_e2) {
        // Continue to indexing in ChromaDB
      }
    }

    const ids: string[] = [];
    const documents: string[] = [];
    const metadatas: ChromaMetadata[] = [];
    const embeddings: number[][] = [];

    for (let i = 0; i < doc.chunks.length; i++) {
      const c = doc.chunks[i];
      const chunkId = `${doc.id}_chunk_${i + 1}`;
      ids.push(chunkId);
      documents.push(c.text);
      metadatas.push({
        document_id: doc.id,
        document_name: doc.title,
        page: c.page,
        section: c.section,
        document_type: doc.fileType.toUpperCase(),
        source: doc.originalName,
        upload_date: new Date().toISOString(),
      });
      embeddings.push(generateEmbedding(c.text));
    }

    chromaCollection.add({
      ids,
      documents,
      metadatas,
      embeddings,
    });
  }

  console.log(`Successfully seeded ${seedDocuments.length} authorized knowledge documents into PostgreSQL and ChromaDB!`);
}
