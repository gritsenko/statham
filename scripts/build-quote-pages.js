#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { generateQuoteImage } = require('./generate-quote-image');

// Config
const ROOT = path.join(__dirname, '..'); // statham/
const DATA_PATH = path.join(ROOT, 'data.json');
const SRC_INDEX = path.join(ROOT, 'index.html');
const OUT_BASE = path.join(ROOT, 'quotes');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readData() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const json = JSON.parse(raw);
  const quotes = Array.isArray(json.quotes) ? json.quotes : [];
  const author = json.author || 'Джейсон Стэтхэм';
  // Normalize IDs if missing: assign 1-based ids in-memory only
  const normalized = quotes.map((q, i) => ({ ...q, id: q.id != null ? q.id : i + 1 }));
  return { quotes: normalized, author };
}

function loadTemplate() {
  return fs.readFileSync(SRC_INDEX, 'utf8');
}

function rewriteForQuote(html, { id, text, author, baseRel }) {
  // baseRel is relative path prefix from quote folder to statham root, e.g., '../'
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const titleRaw = text || '';
  const titleEsc = escapeHtml(titleRaw);
  const desc = `"${titleRaw}" — ${author}`;
  const descEsc = escapeHtml(desc);
  const ogImg = `og.jpg`;
  const absUrl = `https://gritsenko.biz/statham/quotes/${id}/`;
  const relCss = `${baseRel}styles/statham.css`;
  const relScript = `${baseRel}scripts/page-logic.js`;
  const relMetrika = `${baseRel}scripts/metrika.js`;
  const relData = `${baseRel}data.json`;
  const relFav = `${baseRel}favicon.svg`;
  const relAltIcon = `${baseRel}staham.jpeg`;
  const relAvatar = `${baseRel}staham.jpeg`;

  let out = html;
  // Replace document <title>
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${titleEsc}<\/title>`);
  // Replace OG/Twitter titles
  out = out.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${titleEsc}">`);
  out = out.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${titleEsc}">`);
  // Replace OG + Twitter descriptions
  out = out.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${descEsc}">`);
  out = out.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${descEsc}">`);
  // Point images to og.jpg within folder
  out = out.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${ogImg}">`);
  out = out.replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${ogImg}">`);
  // Set per-page absolute URL and canonical
  out = out.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${absUrl}">`);
  out = out.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${absUrl}">`);
  // Canonical and og:url left unchanged (could be adjusted to absolute per-page if needed)

  // Fix resource paths to be relative from quote folder
  out = out.replace(/href="\.\/styles\/statham.css"/g, `href="${relCss}"`);
  out = out.replace(/src="\.\/scripts\/page-logic.js"/g, `src="${relScript}"`);
  out = out.replace(/src="\.\/scripts\/metrika.js"/g, `src="${relMetrika}"`);
  out = out.replace(/src="data.json"/g, `src="${relData}"`); // just in case
  out = out.replace(/href="favicon.svg"/g, `href="${relFav}"`);
  out = out.replace(/href="https:\/\/gritsenko\.biz\/statham\/staham\.jpeg"/g, `href="${relAltIcon}"`);
  out = out.replace(/src="\.\/staham\.jpeg"/g, `src="${relAvatar}"`);

  // Bake quote into HTML text placeholders (escape to prevent HTML issues)
  out = out.replace(/<p id="quote-display">[\s\S]*?<\/p>/, `<p id="quote-display">&quot;${titleEsc}&quot;<\/p>`);
  out = out.replace(/<cite id="author-display"[^>]*>[\s\S]*?<\/cite>/, `<cite id="author-display" class="author-name block">— ${escapeHtml(author)}<\/cite>`);

  // Inject baseRel and init quote id; enable permalink mode (no query params)
  const inject = `\n<script>window.STATHAM_BASE_REL='${baseRel.replace(/'/g, "\\'")}';window.INIT_QUOTE_ID=${id};window.STATHAM_PERMALINK_MODE=true;</script>`;
  out = out.replace(/<\/body>/i, `${inject}\n</body>`);

  return out;
}

async function buildAll() {
  const { quotes, author } = readData();
  const tpl = loadTemplate();
  ensureDir(OUT_BASE);

  for (const q of quotes) {
    const id = q.id;
    const folder = path.join(OUT_BASE, String(id));
    ensureDir(folder);

    // Generate OG image into the folder as og.jpg
    const ogPath = path.join(folder, 'og.jpg');
    try {
      await generateQuoteImage(id, ogPath);
    } catch (e) {
      console.error(`Failed to generate OG for #${id}:`, e.message);
    }

    // Create HTML with fixed relative paths
  const html = rewriteForQuote(tpl, { id, text: q.text || '', author, baseRel: '../../' });
    fs.writeFileSync(path.join(folder, 'index.html'), html, 'utf8');

    console.log(`Built quote page: quotes/${id}/index.html`);
  }
}

if (require.main === module) {
  buildAll().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}

module.exports = { buildAll };
