/**
 * Bakes ring-ready token art for every actor in the bestiary packs.
 *
 * This is a build-time port of the compositing maths in Scorpious187's Token
 * Library (scripts/ring/compositor.js + scripts/constants.js). That module does
 * the same job at runtime on a browser canvas; doing it here instead means the
 * finished tokens ship inside this module and need no dependency at the table,
 * while still matching what the Library's "dynamic" ring mode would produce if
 * the GM later managed this art through it.
 *
 * Ported behaviour, verified against Token Library v0.1.0:
 *
 *   SUBJECT_THICKNESS 0.6666666  Foundry's own TokenRing.#defaultSubjectThickness.
 *                                A subject drawn larger reaches the token edge and
 *                                paints over the ring band instead of sitting in it.
 *   cover-top fit                Fill the square, keep the top edge — that is where
 *                                a portrait's face is.
 *   circle mask                  Clip the art to a circle of SUBJECT_THICKNESS
 *                                diameter, transparent outside.
 *
 * One deliberate deviation. The Library draws art at the FULL token size and
 * then clips, because a curated library holds art already framed as a token
 * subject — the circle is a porthole onto the middle of it. This module's art is
 * game stills and portraits at every aspect from 0.42 to 2.27, so that porthole
 * ate the top of most heads. Here the square crop is scaled to the subject
 * circle and centred instead, so the whole crop survives inside the ring.
 *
 * The actor is then written the way ring/apply.js writes it in dynamic mode:
 * an EXPLICIT ring.subject.texture with subject.scale 1. Leaving that field
 * blank lands in Foundry's auto-fit branch (client/canvas/placeables/tokens/
 * ring.mjs) which is written for full-token images and paints the subject over
 * the ring.
 *
 * Usage:
 *   node scripts/generate-tokens.mjs            bake art and rewrite the actors
 *   node scripts/generate-tokens.mjs --dry-run  report only, touch nothing
 *   node scripts/generate-tokens.mjs --art-only bake art, leave the actors alone
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';
import sharp from 'sharp';

const MODULE_PREFIX = 'modules/mass-effect-sf2e-conversion/';
const PACKS = ['me-npcs', 'me-creatures'];
const OUT_DIR = 'assets/img/tokens';
const SIZE = 512;

/** Token Library / Foundry ring geometry — see the module comment. */
const SUBJECT_THICKNESS = 0.6666666;

/** Alpha at or below this counts as transparent when finding the subject box. */
const ALPHA_FLOOR = 8;

/** Foundry's TokenRing.effects.ENABLED (client/canvas/placeables/tokens/ring.mjs). */
const RING_EFFECTS_ENABLED = 1;

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const ART_ONLY = args.has('--art-only');

/** A circular alpha mask filling a square of the given edge length. */
function circleMask(edge) {
  return Buffer.from(
    `<svg width="${edge}" height="${edge}"><circle cx="${edge / 2}" cy="${edge / 2}" r="${edge / 2}" fill="#fff"/></svg>`,
  );
}

/**
 * The bounding box of everything that is not fully transparent.
 *
 * Many of the cutout portraits sit on a much larger transparent canvas —
 * asari-justicar.png is a 300x885 figure on 512x1024 — and cropping the raw
 * canvas leaves the subject a speck inside the ring. sharp's own .trim() keys
 * off the corner pixel and misses this, so scan the alpha channel directly.
 *
 * @returns {Promise<{left:number,top:number,width:number,height:number}|null>}
 */
async function opaqueBox(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] <= ALPHA_FLOOR) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Square-crop the art, following the Library's drawFitted() rule.
 *
 * Tall art keeps its top edge; art that is square or wider is centred, since
 * "the face is at the top" is only true of a standing portrait.
 */
async function toSquare(src, size) {
  let pipeline = sharp(src);
  const meta = await pipeline.metadata();
  let { width, height } = meta;

  if (meta.hasAlpha) {
    const box = await opaqueBox(src);
    // Ignore a box that is essentially the whole canvas — nothing to gain, and
    // re-cropping costs a resample.
    if (box && box.width * box.height < width * height * 0.92) {
      pipeline = sharp(src).extract(box);
      ({ width, height } = box);
    }
  }

  const position = height > width ? 'top' : 'centre';
  return pipeline
    .resize(size, size, { fit: 'cover', position, kernel: 'lanczos3' })
    .ensureAlpha()
    .toBuffer();
}

async function bake(src, dest, size = SIZE) {
  const subject = Math.round(size * SUBJECT_THICKNESS);
  const pad = Math.round((size - subject) / 2);

  const disc = await sharp(await toSquare(src, subject))
    .composite([{ input: circleMask(subject), blend: 'dest-in' }])
    .png()
    .toBuffer();

  const buf = await sharp(disc)
    .extend({ top: pad, bottom: size - subject - pad, left: pad, right: size - subject - pad,
              background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92, alphaQuality: 100 })
    .toBuffer();

  if (!DRY) await writeFileRetrying(dest, buf);
  return buf.length;
}

/**
 * Write, retrying a few times on a transient failure.
 *
 * This repository lives inside a OneDrive folder, and a run rewrites well over a hundred
 * files in a few seconds. Often enough, the sync client has one of them open when we get
 * to it and the write comes back UNKNOWN (libuv -4094) even though the file is perfectly
 * writable a moment later. Losing the whole bake to that is not worth it.
 */
async function writeFileRetrying(dest, buf, attempts = 5) {
  for (let i = 1; ; i++) {
    try {
      return await writeFile(dest, buf);
    } catch (err) {
      const transient = ['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(err.code);
      if (!transient || i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 120 * i));
    }
  }
}

/** Every actor json under a pack, folders included. */
async function actorFiles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await actorFiles(path, out);
    else if (entry.name.endsWith('.json') && entry.name !== '_folder.json') out.push(path);
  }
  return out;
}

/** Source art for a token: whatever the prototype token already points at. */
function artFor(actor) {
  const src = actor.prototypeToken?.texture?.src ?? actor.img ?? '';
  if (!src.startsWith(MODULE_PREFIX)) return null;   // system default icons etc.
  const rel = src.slice(MODULE_PREFIX.length);
  return existsSync(rel) ? rel : null;
}

/** Stable output name: the art's basename, minus any -token suffix. */
function tokenName(artPath) {
  return basename(artPath, extname(artPath)).replace(/-token$/, '') + '.webp';
}

await mkdir(OUT_DIR, { recursive: true });

let baked = 0, wrote = 0, skipped = [], failed = [];
const seen = new Map();

for (const pack of PACKS) {
  for (const file of await actorFiles(join('src/packs', pack))) {
    const actor = JSON.parse(await readFile(file, 'utf8'));
    const art = artFor(actor);
    if (!art) { skipped.push(`${actor.name} — no module art (${actor.prototypeToken?.texture?.src ?? 'none'})`); continue; }

    const name = tokenName(art);
    const dest = join(OUT_DIR, name);
    // Several actors legitimately share one piece of art; bake it once.
    if (!seen.has(name)) {
      try {
        seen.set(name, await bake(art, dest));
        baked += 1;
      } catch (err) {
        // One unbakeable piece of art should not cost the other hundred and twenty.
        failed.push(`${name} — ${err.code ?? err.message}`);
        continue;
      }
    }

    if (ART_ONLY) continue;

    const src = `${MODULE_PREFIX}${OUT_DIR}/${name}`;
    const pt = actor.prototypeToken ??= {};
    pt.texture = { ...(pt.texture ?? {}), src };
    pt.ring = {
      enabled: true,
      colors: { ring: null, background: null },
      effects: RING_EFFECTS_ENABLED,
      subject: { scale: 1, texture: src },
    };
    if (!DRY) await writeFile(file, JSON.stringify(actor, null, 2).replace(/\n/g, '\r\n'), 'utf8');
    wrote += 1;
  }
}

const bytes = [...seen.values()].reduce((a, b) => a + b, 0);
console.log(`${DRY ? '[dry run] ' : ''}baked ${baked} token images (${(bytes / 1024 / 1024).toFixed(2)} MB) → ${OUT_DIR}/`);
console.log(`${DRY ? '[dry run] ' : ''}updated ${wrote} actors across ${PACKS.join(', ')}`);
if (skipped.length) {
  console.log(`skipped ${skipped.length}:`);
  for (const s of skipped) console.log('  ', s);
}
if (failed.length) {
  console.log(`failed to bake ${failed.length} (re-run to pick them up):`);
  for (const f of failed) console.log('  ', f);
  process.exitCode = 1;
}
