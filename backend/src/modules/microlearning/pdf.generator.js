const PDFDocument = require("pdfkit");

const BRAND_COLOR   = "#2563a6";
const DANGER_COLOR  = "#c0392b";
const SUCCESS_COLOR = "#2f855a";
const WARNING_COLOR = "#b7791f";
const MUTED_COLOR   = "#6b7280";
const PAGE_WIDTH    = 595.28; // A4 points
const MARGIN        = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Generates a full PDF for a microlearning material.
 * Returns a Buffer containing the PDF bytes.
 */
function generateMaterialPDF(material, patient) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { contentData, topic, preventionTrack } = material;

    // ── Header band ────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_WIDTH, 100).fill(BRAND_COLOR);
    doc.fillColor("#ffffff")
       .fontSize(20)
       .font("Helvetica-Bold")
       .text("SepsisGuard", MARGIN, 22, { width: CONTENT_WIDTH });
    doc.fontSize(11)
       .font("Helvetica")
       .text("Caregiver Education Material", MARGIN, 48, { width: CONTENT_WIDTH });

    // Prevention track badge
    const trackColors = { PRIMARY: "#e3edf7", SECONDARY: "#fdf3dc", COMBINED: "#fbe9e7", GENERAL: "#e6f4ea" };
    const trackLabel  = { PRIMARY: "Primary Prevention", SECONDARY: "Secondary Prevention", COMBINED: "Combined Prevention", GENERAL: "General Care" };
    doc.rect(PAGE_WIDTH - 180, 16, 130, 22).fill("#ffffff33");
    doc.fillColor("#ffffff")
       .fontSize(9)
       .font("Helvetica-Bold")
       .text(trackLabel[preventionTrack] || "General", PAGE_WIDTH - 178, 22, { width: 126, align: "center" });

    // ── Patient info bar ────────────────────────────────────────────
    doc.rect(0, 100, PAGE_WIDTH, 36).fill("#f0f4f8");
    doc.fillColor(MUTED_COLOR)
       .fontSize(10)
       .font("Helvetica")
       .text(
         `Patient: ${patient.fullName}  |  Age: ${patient.age}  |  Gender: ${patient.gender}  |  Topic: ${topic.replace(/_/g, " ").toUpperCase()}`,
         MARGIN, 112, { width: CONTENT_WIDTH }
       );

    // ── Title ────────────────────────────────────────────────────────
    doc.moveDown(3.5);
    doc.fillColor(BRAND_COLOR)
       .fontSize(17)
       .font("Helvetica-Bold")
       .text(contentData.title, { width: CONTENT_WIDTH });

    // ── Summary ──────────────────────────────────────────────────────
    doc.moveDown(0.4);
    doc.fillColor("#374151")
       .fontSize(11)
       .font("Helvetica-Oblique")
       .text(contentData.summary, { width: CONTENT_WIDTH });

    doc.moveDown(0.8);
    drawDivider(doc);

    // ── What TO Do ───────────────────────────────────────────────────
    sectionHeader(doc, "✓  What To Do", SUCCESS_COLOR);
    if (Array.isArray(contentData.prescriptive)) {
      contentData.prescriptive.forEach((step, i) => {
        numberedItem(doc, i + 1, step, SUCCESS_COLOR);
      });
    }

    doc.moveDown(0.5);
    drawDivider(doc);

    // ── What NOT To Do ───────────────────────────────────────────────
    sectionHeader(doc, "✕  What NOT To Do", DANGER_COLOR);
    if (Array.isArray(contentData.prohibitive)) {
      contentData.prohibitive.forEach((item) => {
        bulletItem(doc, item, DANGER_COLOR);
      });
    }

    doc.moveDown(0.5);
    drawDivider(doc);

    // ── Low-Cost Workarounds ─────────────────────────────────────────
    sectionHeader(doc, "★  Low-Cost Workarounds", WARNING_COLOR);
    if (Array.isArray(contentData.lowCostWorkarounds)) {
      contentData.lowCostWorkarounds.forEach((item) => {
        bulletItem(doc, item, WARNING_COLOR);
      });
    }

    doc.moveDown(0.5);
    drawDivider(doc);

    // ── Warning Signs ────────────────────────────────────────────────
    sectionHeader(doc, "⚠  Warning Signs to Watch For", DANGER_COLOR);
    if (Array.isArray(contentData.keySigns)) {
      contentData.keySigns.forEach((sign) => {
        bulletItem(doc, sign, DANGER_COLOR);
      });
    }

    doc.moveDown(0.5);

    // ── Emergency Action box ─────────────────────────────────────────
    const boxY = doc.y;
    const boxHeight = 60 + (Math.ceil(contentData.emergencyAction.length / 70) * 14);
    doc.rect(MARGIN, boxY, CONTENT_WIDTH, boxHeight).fill("#fbe9e7").stroke(DANGER_COLOR);
    doc.fillColor(DANGER_COLOR)
       .fontSize(11)
       .font("Helvetica-Bold")
       .text("EMERGENCY ACTION", MARGIN + 12, boxY + 12, { width: CONTENT_WIDTH - 24 });
    doc.fillColor("#374151")
       .fontSize(10)
       .font("Helvetica")
       .text(contentData.emergencyAction, MARGIN + 12, boxY + 30, { width: CONTENT_WIDTH - 24 });

    doc.moveDown(1.5);

    // ── Review Note ──────────────────────────────────────────────────
    if (contentData.reviewNote) {
      doc.fillColor(MUTED_COLOR)
         .fontSize(9)
         .font("Helvetica-Oblique")
         .text(`Review: ${contentData.reviewNote}`, { width: CONTENT_WIDTH });
    }

    if (Array.isArray(contentData.sourcesUsed) && contentData.sourcesUsed.length > 0) {
      doc.moveDown(0.8);
      sectionHeader(doc, "Organization-Approved Sources Used", BRAND_COLOR);
      contentData.sourcesUsed.forEach((source) => {
        doc.fillColor(BRAND_COLOR)
           .fontSize(9)
           .font("Helvetica")
           .text(`${source.name}: ${source.url}`, { width: CONTENT_WIDTH, link: source.url, underline: true });
        doc.moveDown(0.2);
      });
      doc.fillColor(MUTED_COLOR).fontSize(8).font("Helvetica-Oblique")
         .text("Review source material with a clinician when making care decisions.", { width: CONTENT_WIDTH });
    }

    if (Array.isArray(contentData.learningMaterialsUsed) && contentData.learningMaterialsUsed.length > 0) {
      doc.moveDown(0.8);
      sectionHeader(doc, "Published Learning Guides Used", BRAND_COLOR);
      contentData.learningMaterialsUsed.forEach((guide) => {
        doc.fillColor(BRAND_COLOR)
           .fontSize(9)
           .font("Helvetica")
           .text(`${guide.title}${guide.organization ? ` — ${guide.organization}` : ""}`, { width: CONTENT_WIDTH });
        doc.moveDown(0.2);
      });
    }

    // ── Footer on all pages ──────────────────────────────────────────
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 36, PAGE_WIDTH, 36).fill("#f0f4f8");
      doc.fillColor(MUTED_COLOR)
         .fontSize(8)
         .font("Helvetica")
         .text(
           `SepsisGuard Caregiver Platform  |  Generated ${new Date().toLocaleDateString()}  |  This is an educational guide, not a clinical diagnosis.`,
           MARGIN, doc.page.height - 24, { width: CONTENT_WIDTH, align: "center" }
         );
    }

    doc.end();
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function drawDivider(doc) {
  doc.moveTo(MARGIN, doc.y)
     .lineTo(PAGE_WIDTH - MARGIN, doc.y)
     .strokeColor("#e2e8f0")
     .lineWidth(1)
     .stroke();
  doc.moveDown(0.5);
}

function sectionHeader(doc, text, color) {
  doc.fillColor(color)
     .fontSize(12)
     .font("Helvetica-Bold")
     .text(text, { width: CONTENT_WIDTH });
  doc.moveDown(0.35);
}

function numberedItem(doc, number, text, color) {
  const startX = MARGIN;
  const textX  = MARGIN + 24;
  const y      = doc.y;

  doc.fillColor(color)
     .fontSize(10)
     .font("Helvetica-Bold")
     .text(`${number}.`, startX, y, { width: 20 });

  doc.fillColor("#374151")
     .fontSize(10)
     .font("Helvetica")
     .text(text, textX, y, { width: CONTENT_WIDTH - 24 });

  doc.moveDown(0.2);
}

function bulletItem(doc, text, color) {
  const startX = MARGIN;
  const textX  = MARGIN + 16;
  const y      = doc.y;

  doc.fillColor(color)
     .fontSize(12)
     .text("•", startX, y - 2, { width: 14 });

  doc.fillColor("#374151")
     .fontSize(10)
     .font("Helvetica")
     .text(text, textX, y, { width: CONTENT_WIDTH - 16 });

  doc.moveDown(0.2);
}

module.exports = { generateMaterialPDF };
