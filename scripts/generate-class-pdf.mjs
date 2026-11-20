// Converts docs/mass-effect-starfinder-2e-conversion.html to the matching .pdf
// Usage: node scripts/generate-class-pdf.mjs
// Requires: npm install --save-dev puppeteer-core

import puppeteer from 'puppeteer-core';
import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const HTML_PATH = resolve(ROOT, 'docs', 'mass-effect-starfinder-2e-conversion.html');
const PDF_PATH  = resolve(ROOT, 'docs', 'mass-effect-starfinder-2e-conversion.pdf');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Embed assets for use inside the footer template's isolated iframe.
// The footer iframe cannot load files from disk, so everything must be base64.
const koratakiB64 = readFileSync(resolve(ROOT, 'docs', 'fonts', 'Korataki-Regular.woff2')).toString('base64');
const renegadeB64 = readFileSync(resolve(ROOT, 'docs', 'images', 'Renegade.png')).toString('base64');

const FOOTER_TEMPLATE = `
<style>
  @font-face {
    font-family: 'Korataki';
    src: url('data:font/woff2;base64,${koratakiB64}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
</style>

<!-- N7 stripe continuation — matches the gradient in the main HTML exactly -->
<div style="
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 62px;
  background: linear-gradient(to right,
    #0d0f1a 0 11px,
    #dcdcdc 11px 13.5px,
    #b91c2a 13.5px 48.5px,
    #dcdcdc 48.5px 51px,
    #0d0f1a 51px 62px);
"></div>

<!-- Renegade badge -->
<img src="data:image/png;base64,${renegadeB64}"
  style="
    position: absolute;
    bottom: 10px; right: 12px;
    width: 38px; height: 38px;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.9)) drop-shadow(0 0 3px rgba(0,0,0,0.7));
  "
  alt="">

<!-- Page number centred inside the badge -->
<div style="
  position: absolute;
  bottom: 10px; right: 12px;
  width: 38px; height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Korataki', Arial, sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: #ffffff;
  text-shadow:
    -1.5px -1.5px 0 #000,  1.5px -1.5px 0 #000,
    -1.5px  1.5px 0 #000,  1.5px  1.5px 0 #000,
       0px -1.5px 0 #000,     0px  1.5px 0 #000,
    -1.5px     0px 0 #000,  1.5px     0px 0 #000;
  z-index: 2;
">
  <span class="pageNumber"></span>
</div>`;

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

// Match viewport to Letter paper at 96dpi so content lays out at paper width
await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });

// Load as file:// URL so relative paths (fonts, images) resolve correctly
await page.goto(`file:///${HTML_PATH.replace(/\\/g, '/')}`, {
  waitUntil: 'networkidle0',
  timeout: 60_000,
});

// Wait for fonts to finish loading
await page.evaluateHandle('document.fonts.ready');

// ── Contents page numbers ────────────────────────────────────────────────────
// The page a section lands on is only known once Chrome has paginated the document, so the
// PDF is made twice. The first pass carries an estimate; its real page numbers are read back
// from the file and written into the contents, and the second pass is the one that is kept.
await page.emulateMediaType('print');

// Letter at 96 dpi = 1056 px per page; 48 px bottom margin = 1008 px content height.
const PAGE_H = 1008;

// Every contents entry carries a <span id="toc-pg-SECTION">, so the list of sections comes
// from the page itself: a section added to the HTML generator gets its page number with
// nothing to update here.
const sectionIds = await page.evaluate((pageH) => {
  const ids = [];
  for (const span of document.querySelectorAll('[id^="toc-pg-"]')) {
    const id = span.id.slice('toc-pg-'.length);
    const el = document.getElementById(id);
    if (!el) continue;
    ids.push(id);
    // The estimate ignores forced page breaks, so it runs low. It only holds the space.
    span.textContent = Math.floor((el.getBoundingClientRect().top + window.scrollY) / pageH) + 1;
  }
  return ids;
}, PAGE_H);

const PDF_OPTIONS = {
  path: PDF_PATH,
  format: 'Letter',
  printBackground: true,
  // 48 px bottom margin = footer iframe height.  The N7 stripe (position:fixed)
  // in the main content stops here; the footer template picks it up seamlessly.
  margin: { top: '0', right: '0', bottom: '48px', left: '0' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: FOOTER_TEMPLATE,
  outline: true,
  preferCSSPageSize: false,
};

/**
 * The page each named destination sits on, read from a PDF Chrome wrote. Chrome gives every
 * element a link points at (so every contents entry's section) a named destination, and writes
 * its catalog, page tree and destinations as plain objects, which is all this reads.
 * Returns null if the file is not laid out that way.
 */
function destinationPages(pdfPath) {
  const pdf = readFileSync(pdfPath).toString('latin1');
  const object = (n) => {
    const head = `\n${n} 0 obj\n`;
    const start = pdf.indexOf(head);
    return start < 0 ? null : pdf.slice(start + head.length, pdf.indexOf('\nendobj', start));
  };
  const catalogAt = pdf.indexOf('/Type /Catalog');
  if (catalogAt < 0) return null;
  const catalog = pdf.slice(catalogAt, pdf.indexOf('endobj', catalogAt));
  const pagesRoot = /\/Pages (\d+) 0 R/.exec(catalog)?.[1];
  const dests = object(/\/Dests (\d+) 0 R/.exec(catalog)?.[1]);
  if (!pagesRoot || !dests) return null;

  const pageOf = new Map();   // page object number -> page number
  const walk = (n) => {
    const node = object(n);
    if (!node) return;
    if (!/\/Type \/Pages\b/.test(node)) { pageOf.set(n, pageOf.size + 1); return; }
    for (const kid of (/\/Kids \[([^\]]*)\]/.exec(node)?.[1] ?? '').matchAll(/(\d+) 0 R/g)) walk(kid[1]);
  };
  walk(pagesRoot);

  const out = {};
  for (const [, name, ref] of dests.matchAll(/\/([^\s/[\]<>]+) \[(\d+) 0 R/g)) {
    if (pageOf.has(ref)) out[name] = pageOf.get(ref);
  }
  return { pages: out, count: pageOf.size };
}

const setPageNumbers = (numbers) => page.evaluate((nums) => {
  for (const [id, n] of Object.entries(nums)) {
    const span = document.getElementById('toc-pg-' + id);
    if (span) span.textContent = n;
  }
}, numbers);

await page.pdf(PDF_OPTIONS);
let read = destinationPages(PDF_PATH);
const missing = read ? sectionIds.filter((id) => !(id in read.pages)) : sectionIds;
if (!read || missing.length) {
  console.warn(`  WARNING: could not read page numbers back from the PDF${missing.length && read ? ` for: ${missing.join(', ')}` : ''}. The contents page carries estimates.`);
} else {
  // Filling in the numbers must not move anything; if it does, go round again (twice at most).
  for (let pass = 0; pass < 3; pass++) {
    const numbers = Object.fromEntries(sectionIds.map((id) => [id, read.pages[id]]));
    await setPageNumbers(numbers);
    await page.pdf(PDF_OPTIONS);
    const check = destinationPages(PDF_PATH);
    const settled = check && sectionIds.every((id) => check.pages[id] === numbers[id]);
    read = check ?? read;
    if (settled) break;
    if (pass === 2) console.warn('  WARNING: contents page numbers did not settle; check them against the PDF.');
  }
  console.log(`Contents: ${sectionIds.length} entries numbered from the PDF's own page tree (${read.count} pages)`);
}

await browser.close();

const size = statSync(PDF_PATH).size;
console.log(`Wrote docs/mass-effect-starfinder-2e-conversion.pdf (${(size / 1024 / 1024).toFixed(1)} MB)`);
