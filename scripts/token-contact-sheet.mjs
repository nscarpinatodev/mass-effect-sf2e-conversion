/**
 * Contact sheet of every baked token, for judging the crops by eye.
 *
 * Head placement is a heuristic, and the only way to know which ones it reads
 * wrong is to look at all of them side by side. Names are burned in so a bad
 * crop can be traced straight back to a file to correct in
 * assets/img/token-focus.json.
 *
 * Usage:
 *   node scripts/token-contact-sheet.mjs                all tokens
 *   node scripts/token-contact-sheet.mjs mech loki       only names matching
 */

import { readdir, writeFile } from 'fs/promises';
import sharp from 'sharp';

const DIR = 'assets/img/tokens';
const OUT = 'assets/img/_token-contact-sheet.png';
const CELL = 150;
const LABEL = 18;
const COLUMNS = 10;

const filters = process.argv.slice(2).map((s) => s.toLowerCase());
const files = (await readdir(DIR))
  .filter((f) => f.endsWith('.webp'))
  .filter((f) => !filters.length || filters.some((needle) => f.toLowerCase().includes(needle)))
  .sort();

if (!files.length) {
  console.log('no tokens matched');
  process.exit(0);
}

const rows = Math.ceil(files.length / COLUMNS);
const width = COLUMNS * CELL;
const height = rows * (CELL + LABEL);

const cells = await Promise.all(files.map(async (file, i) => {
  const col = i % COLUMNS;
  const row = Math.floor(i / COLUMNS);
  const art = await sharp(`${DIR}/${file}`).resize(CELL, CELL, { fit: 'inside' }).toBuffer();
  const name = file.replace(/\.webp$/, '').slice(0, 26);
  const label = Buffer.from(
    `<svg width="${CELL}" height="${LABEL}">
       <text x="${CELL / 2}" y="13" font-family="monospace" font-size="10"
             fill="#cfd6e0" text-anchor="middle">${name.replace(/[<&]/g, '')}</text>
     </svg>`,
  );
  return [
    { input: art, left: col * CELL, top: row * (CELL + LABEL) },
    { input: label, left: col * CELL, top: row * (CELL + LABEL) + CELL },
  ];
}));

await sharp({ create: { width, height, channels: 3, background: '#12151b' } })
  .composite(cells.flat())
  .png()
  .toFile(OUT);

console.log(`${files.length} tokens → ${OUT}`);
