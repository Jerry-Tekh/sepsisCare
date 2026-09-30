/**
 * Generates an SVG image card for a microlearning material.
 * Designed for low-literacy caregivers — large text, visual layout, printable.
 * Returns an SVG string that can be downloaded or embedded directly in the browser.
 */
function generateImageCard(material, patient) {
  const { contentData, topic } = material;

  const topSteps   = (contentData.prescriptive  || []).slice(0, 4);
  const topWarnings = (contentData.prohibitive   || []).slice(0, 3);
  const topSigns    = (contentData.keySigns      || []).slice(0, 3);

  const CARD_W = 600;
  const CARD_H = 900;

  // Escape XML special characters
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Wrap long text into multiple tspan lines
  function wrapText(text, maxChars, x, y, lineHeight, fill, fontSize) {
    const words = esc(text).split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length > maxChars) {
        lines.push(current.trim());
        current = word;
      } else {
        current = (current + " " + word).trim();
      }
    }
    if (current) lines.push(current.trim());

    return lines
      .map((line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" font-size="${fontSize}" fill="${fill}" font-family="Arial,sans-serif">${line}</text>`
      )
      .join("\n");
  }

  // Numbered step block
  function stepBlock(num, text, x, y, color) {
    const lines = [];
    const words = esc(text).split(" ");
    let cur = "";
    const wrapped = [];
    for (const w of words) {
      if ((cur + " " + w).trim().length > 34) { wrapped.push(cur.trim()); cur = w; }
      else cur = (cur + " " + w).trim();
    }
    if (cur) wrapped.push(cur.trim());

    lines.push(`<circle cx="${x + 14}" cy="${y + 14}" r="14" fill="${color}" />`);
    lines.push(`<text x="${x + 14}" y="${y + 19}" text-anchor="middle" font-size="13" font-weight="bold" fill="white" font-family="Arial,sans-serif">${num}</text>`);
    wrapped.forEach((line, i) => {
      lines.push(`<text x="${x + 36}" y="${y + 10 + i * 18}" font-size="13" fill="#1f2937" font-family="Arial,sans-serif">${line}</text>`);
    });
    return { svg: lines.join("\n"), height: Math.max(28, wrapped.length * 18 + 8) };
  }

  // Build step blocks
  let stepY = 340;
  const stepBlocks = [];
  for (let i = 0; i < topSteps.length; i++) {
    const block = stepBlock(i + 1, topSteps[i], 30, stepY, "#2563a6");
    stepBlocks.push({ svg: block.svg, y: stepY, h: block.height });
    stepY += block.height + 14;
  }

  // Warning items
  let warnY = stepY + 60;
  const warnBlocks = topWarnings.map((w) => {
    const wrapped = esc(w).length > 38 ? esc(w).slice(0, 38) + "…" : esc(w);
    const block = `<text x="50" y="${warnY}" font-size="13" fill="#c0392b" font-family="Arial,sans-serif">✗  ${wrapped}</text>`;
    warnY += 26;
    return block;
  });

  // Signs items
  let signY = warnY + 60;
  const signBlocks = topSigns.map((s) => {
    const wrapped = esc(s).length > 38 ? esc(s).slice(0, 38) + "…" : esc(s);
    const block = `<text x="50" y="${signY}" font-size="13" fill="#b7791f" font-family="Arial,sans-serif">⚠  ${wrapped}</text>`;
    signY += 26;
    return block;
  });

  const dynamicHeight = Math.max(CARD_H, signY + 120);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${dynamicHeight}" viewBox="0 0 ${CARD_W} ${dynamicHeight}">
  <!-- Background -->
  <rect width="${CARD_W}" height="${dynamicHeight}" fill="#f5f7fa" rx="12"/>

  <!-- Header -->
  <rect width="${CARD_W}" height="100" fill="#2563a6" rx="12"/>
  <rect y="88" width="${CARD_W}" height="12" fill="#2563a6"/>
  <text x="30" y="42" font-size="20" font-weight="bold" fill="white" font-family="Arial,sans-serif">SepsisGuard</text>
  <text x="30" y="68" font-size="13" fill="#bfdbfe" font-family="Arial,sans-serif">Caregiver Education Card</text>

  <!-- Patient strip -->
  <rect y="100" width="${CARD_W}" height="44" fill="#e8f0fa"/>
  <text x="30" y="127" font-size="13" fill="#2563a6" font-weight="bold" font-family="Arial,sans-serif">
    ${esc(patient.fullName)} · Age ${patient.age} · ${esc(topic.replace(/_/g, " ").toUpperCase())}
  </text>

  <!-- Material title -->
  <text x="30" y="180" font-size="18" font-weight="bold" fill="#1f2937" font-family="Arial,sans-serif">${esc((contentData.title || "").slice(0, 48))}</text>
  ${contentData.title && contentData.title.length > 48
    ? `<text x="30" y="200" font-size="18" font-weight="bold" fill="#1f2937" font-family="Arial,sans-serif">${esc(contentData.title.slice(48, 96))}</text>`
    : ""}

  <!-- Summary -->
  ${wrapText(contentData.summary || "", 70, 30, 225, 18, "#6b7280", "12")}

  <!-- Steps header -->
  <rect x="20" y="300" width="180" height="28" fill="#2563a6" rx="6"/>
  <text x="30" y="320" font-size="13" font-weight="bold" fill="white" font-family="Arial,sans-serif">✓ WHAT TO DO</text>

  <!-- Step blocks -->
  ${stepBlocks.map((b) => b.svg).join("\n")}

  <!-- Do NOT header -->
  <rect x="20" y="${stepY + 20}" width="200" height="28" fill="#c0392b" rx="6"/>
  <text x="30" y="${stepY + 40}" font-size="13" font-weight="bold" fill="white" font-family="Arial,sans-serif">✕ WHAT NOT TO DO</text>
  ${warnBlocks.join("\n")}

  <!-- Signs header -->
  <rect x="20" y="${warnY + 20}" width="220" height="28" fill="#b7791f" rx="6"/>
  <text x="30" y="${warnY + 40}" font-size="13" font-weight="bold" fill="white" font-family="Arial,sans-serif">⚠ WATCH FOR THESE SIGNS</text>
  ${signBlocks.join("\n")}

  <!-- Emergency action box -->
  <rect x="20" y="${signY + 20}" width="${CARD_W - 40}" height="70" fill="#fbe9e7" rx="8" stroke="#c0392b" stroke-width="2"/>
  <text x="34" y="${signY + 43}" font-size="12" font-weight="bold" fill="#c0392b" font-family="Arial,sans-serif">EMERGENCY ACTION</text>
  ${wrapText((contentData.emergencyAction || "").slice(0, 120), 65, 34, signY + 60, 16, "#374151", "12")}

  <!-- Footer -->
  <rect y="${dynamicHeight - 36}" width="${CARD_W}" height="36" fill="#e2e8f0"/>
  <text x="${CARD_W / 2}" y="${dynamicHeight - 14}" text-anchor="middle" font-size="10" fill="#6b7280" font-family="Arial,sans-serif">
    Educational guide only — not a clinical diagnosis · ${new Date().toLocaleDateString()}
  </text>
</svg>`;

  return svg;
}

module.exports = { generateImageCard };
