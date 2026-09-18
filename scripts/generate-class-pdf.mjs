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

// ── Inject TOC page numbers ──────────────────────────────────────────────────
// Switch to print media so CSS page-break rules are applied to the layout,
// then measure each section's offsetTop and convert to a page number.
await page.emulateMediaType('print');

const ANCESTRY_SLUGS = ['asari', 'batarian', 'drell', 'elcor', 'hanar', 'human', 'krogan', 'quarian', 'salarian', 'turian', 'volus', 'vorcha'];
const SECTION_IDS = ['character-options', 'ancestries', ...ANCESTRY_SLUGS.map(s => `ancestry-${s}`), 'classes', 'soldier', 'engineer', 'adept', 'vanguard', 'infiltrator', 'sentinel', 'backgrounds', 'feats', 'feats-class', 'feats-racial', 'feats-general', 'equipment', 'equip-weapons', 'equip-weapon-mods', 'equip-armor', 'equip-armor-mods', 'equip-grenades', 'bestiary', 'npcs', 'creatures', 'vehicles', 'shield-mechanics', 'damage-routing', 'kinetic-shields', 'combat-frames', 'biotic-barrier', 'ammo-vs-defences'];
// Letter at 96 dpi = 1056 px per page; 48 px bottom margin = 1008 px content height.
const PAGE_H = 1008;

const offsets = await page.evaluate((ids) => {
  const out = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) out[id] = el.getBoundingClientRect().top + window.scrollY;
  }
  return out;
}, SECTION_IDS);

await page.evaluate((offs, pageH) => {
  for (const [id, top] of Object.entries(offs)) {
    const span = document.getElementById('toc-pg-' + id);
    if (span) span.textContent = Math.floor(top / pageH) + 1;
  }
}, offsets, PAGE_H);
// ────────────────────────────────────────────────────────────────────────────

await page.pdf({
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
});

await browser.close();

const size = statSync(PDF_PATH).size;
console.log(`Wrote docs/mass-effect-starfinder-2e-conversion.pdf (${(size / 1024 / 1024).toFixed(1)} MB)`);
