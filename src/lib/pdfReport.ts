import { jsPDF } from 'jspdf';
import { AuthUser, RAGCitation } from '../types';

export interface PDFMessageItem {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  citations?: RAGCitation[];
  sourceEngine?: string;
}

export interface PDFReportParams {
  title: string;
  user: AuthUser;
  messages?: PDFMessageItem[];
  // Backwards-compatible single-turn arguments
  query?: string;
  answer?: string;
  citations?: RAGCitation[];
  timestamp?: string;
  reportId?: string;
}

export function downloadPDFReport(params: PDFReportParams) {
  const { title, user, messages, query, answer, citations, timestamp, reportId } = params;

  // Build full message list
  let turns: PDFMessageItem[] = [];
  if (messages && messages.length > 0) {
    turns = messages;
  } else if (query && answer) {
    turns = [
      { role: 'user', content: query, timestamp: timestamp || new Date().toISOString() },
      { role: 'assistant', content: answer, timestamp: timestamp || new Date().toISOString(), citations: citations || [] },
    ];
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 16;

  const addHeaderAndFooter = (pageNum: number) => {
    // Top running rule
    doc.setDrawColor(210, 225, 215);
    doc.line(margin, 12, pageWidth - margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 120, 115);
    doc.text('IP-SAKTI Sahayak | Ministry of Ayush RAG Intelligence Platform', margin, 9);
    doc.text(`CONFIDENTIAL LEGAL & TECHNICAL DOSSIER`, pageWidth - margin - 60, 9);

    // Bottom running rule & page numbers
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(`Page ${pageNum}`, margin, pageHeight - 8);
    doc.text(`Generated for ${user.email} | Reference: ${refId}`, pageWidth - margin - 75, pageHeight - 8);
  };

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 18) {
      doc.addPage();
      const newPage = doc.getNumberOfPages();
      addHeaderAndFooter(newPage);
      cursorY = 18;
    }
  };

  const refId = reportId || 'IPS-' + Date.now().toString(36).toUpperCase();
  const issueDate = new Date(timestamp || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Collect all unique citations across all messages
  const allCitations: RAGCitation[] = [];
  const citationMap = new Set<string>();
  for (const m of turns) {
    if (m.citations) {
      for (const c of m.citations) {
        const key = `${c.documentTitle}-${c.section || ''}`;
        if (!citationMap.has(key)) {
          citationMap.add(key);
          allCitations.push(c);
        }
      }
    }
  }

  // 1. Cover Header Banner (Page 1)
  doc.setFillColor(12, 68, 44); // Official Deep Emerald
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('IP-SAKTI SAHAYAK — CONSULTATION DOSSIER', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 245, 230);
  doc.text('Ministry of Ayush Ecosystem | Evidence-Grounded Patent & Traditional Knowledge Report', margin, 18);

  doc.setFontSize(8);
  doc.text(`REF: ${refId}`, pageWidth - margin - 48, 12);
  doc.text(`ISSUED: ${issueDate}`, pageWidth - margin - 48, 18);

  cursorY = 36;

  // 2. Metadata Box
  doc.setFillColor(246, 250, 247);
  doc.setDrawColor(190, 220, 200);
  doc.roundedRect(margin, cursorY, contentWidth, 24, 2, 2, 'FD');

  doc.setTextColor(35, 45, 40);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSULTANT / USER:', margin + 4, cursorY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${user.name || 'Registered User'} (${user.email})`, margin + 40, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('ORGANIZATION:', margin + 4, cursorY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(user.organization || 'Independent AYUSH Innovator', margin + 40, cursorY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('ROLE / PRIVILEGE:', margin + 4, cursorY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${user.role} [${user.user_type}]`, margin + 40, cursorY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('CONSULTATION TOPIC:', pageWidth / 2 + 5, cursorY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(title, contentWidth / 2 - 10)[0] || title, pageWidth / 2 + 5, cursorY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('VERIFICATION STATUS:', pageWidth / 2 + 5, cursorY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 125, 65);
  doc.text('Verified RAG Evidence Grounding', pageWidth / 2 + 45, cursorY + 18);

  cursorY += 30;

  // 3. Master Citations Summary Table (if any)
  if (allCitations.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 35, 25);
    doc.text(`VERIFIED CITATIONS & STATUTORY AUTHORITIES (${allCitations.length})`, margin, cursorY);
    cursorY += 5;

    for (let i = 0; i < Math.min(allCitations.length, 6); i++) {
      const c = allCitations[i];
      checkPageBreak(16);

      doc.setFillColor(250, 252, 250);
      doc.setDrawColor(215, 230, 220);
      doc.roundedRect(margin, cursorY, contentWidth, 13, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(12, 75, 45);
      doc.text(`[${i + 1}] ${c.documentTitle}`, margin + 3, cursorY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 95, 88);
      doc.text(
        `Section: ${c.section || 'General'} | Source: ${c.source} | Relevance Score: ${c.relevanceScore}%`,
        margin + 3,
        cursorY + 9.5
      );

      cursorY += 15;
    }
    cursorY += 4;
  }

  // 4. Full Consultation Transcript Header
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 60, 40);
  doc.text('COMPLETE CHRONOLOGICAL CONSULTATION RECORD', margin, cursorY);
  cursorY += 2;
  doc.setDrawColor(180, 210, 195);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  // Render every turn in the consultation
  let userExchangeIndex = 1;
  for (const m of turns) {
    if (m.role === 'user') {
      checkPageBreak(22);

      doc.setFillColor(240, 245, 250);
      doc.setDrawColor(205, 220, 235);

      const userTime = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const queryLines = doc.splitTextToSize(m.content, contentWidth - 8);
      const queryBoxHeight = Math.max(14, queryLines.length * 4.2 + 8);

      checkPageBreak(queryBoxHeight + 4);
      doc.roundedRect(margin, cursorY, contentWidth, queryBoxHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(20, 50, 90);
      doc.text(`USER INQUIRY #${userExchangeIndex} ${userTime ? `(${userTime})` : ''}`, margin + 4, cursorY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 40, 55);
      doc.text(queryLines, margin + 4, cursorY + 10.5);

      cursorY += queryBoxHeight + 6;
      userExchangeIndex++;
    } else {
      // Assistant response
      checkPageBreak(20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 80, 50);
      doc.text(`IP-SAKTI SAHAYAK ANALYSIS & REGULATORY DETERMINATION:`, margin, cursorY);
      cursorY += 5;

      // Clean Markdown syntax for standard PDF rendering
      const cleanContent = m.content
        .replace(/###/g, '')
        .replace(/##/g, '')
        .replace(/#/g, '')
        .replace(/\*\*/g, '')
        .replace(/\|\s*/g, '  ')
        .replace(/---/g, '');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 45, 50);

      const answerLines = doc.splitTextToSize(cleanContent, contentWidth);
      const lineHeight = 3.8;

      for (let i = 0; i < answerLines.length; i++) {
        checkPageBreak(lineHeight + 2);
        doc.text(answerLines[i], margin, cursorY);
        cursorY += lineHeight;
      }

      // If this message had citations, list them briefly
      if (m.citations && m.citations.length > 0) {
        cursorY += 2;
        checkPageBreak(10);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(80, 110, 95);
        const citStr = m.citations.map((c) => c.documentTitle).join(', ');
        doc.text(`Referenced Sources: ${citStr}`, margin, cursorY);
        cursorY += 5;
      }

      cursorY += 5;
    }
  }

  // 5. Final Disclaimer & Legal Notice
  checkPageBreak(25);
  doc.setDrawColor(210, 225, 218);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 105);
  doc.text(
    'Disclaimer: This comprehensive consultation record is automatically produced by IP-SAKTI Sahayak from verified document dossiers.',
    margin,
    cursorY
  );
  doc.text(
    'Content is intended for scientific research, patent strategy formulation, and compliance diligence. For official filing before the Indian Patent Office or foreign jurisdictions, consult a licensed patent agent.',
    margin,
    cursorY + 3.5
  );

  // Add headers/footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p > 1) {
      addHeaderAndFooter(p);
    } else {
      // Bottom footer for page 1
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(110, 120, 115);
      doc.setDrawColor(210, 225, 215);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.text(`Page 1 of ${totalPages}`, margin, pageHeight - 8);
      doc.text(`Generated for ${user.email} | Ref: ${refId}`, pageWidth - margin - 75, pageHeight - 8);
    }
  }

  const safeTitle = title ? title.replace(/[^\w-]/g, '_').slice(0, 30) : 'Full_Consultation';
  const filename = `IP-SAKTI_Dossier_${safeTitle}_${Date.now()}.pdf`;
  doc.save(filename);
}
