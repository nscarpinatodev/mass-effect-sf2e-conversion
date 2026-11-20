// Applies the 2026-11 enemy rule to NPC stat blocks in src/packs (see docs/power-level-review.md, "The tiered design").
//
// Module characters out-damage and out-last base Starfinder 2e characters, so a stat block built to the
// GM Core bands (scripts/npc-builder.py, scripts/rescale-npc.py) is too weak for them. This script lifts it:
//
//   Every NPC   Kinetic Shield and Shield HP Mod copies take the compendium's current (halved) values, and the
//               points the shield lost go into Hit Points, so the stat block is as hard to drop as it was.
//   3rd level+  Strikes: +2 to hit, and 25% more damage (added to the Strike's flat damage).
//               Saves against its abilities: DC +2 (fixed DCs here; the level-scaling NPC powers through
//               their shared formula, which adds the same +2 from 3rd level).
//   8th-15th    Hit Points raised so that HP + shield + combat frame + barrier is 10% higher.
//   16th+       The same, 25% higher.
//
// A stat block is marked once done (flags.mass-effect-sf2e-conversion.enemyRule = 1) and skipped after that,
// so the script is safe to run again after adding NPCs. Run it on a new NPC before `npm run build`.
//
// Usage: node scripts/apply-enemy-rule.mjs [--dry-run] [file.json ...]
//        With no files it walks src/packs/me-npcs, src/packs/me-creatures and the hostile vehicles.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, sep } from 'path';

const MOD = 'mass-effect-sf2e-conversion';
const DRY = process.argv.includes('--dry-run');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const HOSTILE_VEHICLES = ['Atlas Mech Mk.I', 'Atlas Mech Mk.II', 'Atlas Mech Mk.III', 'Atlas Mech Mk.IV', 'Cerberus Gunship'];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.json') ? [join(d, e.name)] : []));
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const SHIELD_SRC = Object.fromEntries(readdirSync('src/packs/me-shields').filter((f) => f.endsWith('.json')).map((f) => read(join('src/packs/me-shields', f))).filter((j) => j.name).map((j) => [j.name, j]));

/** The power-DC formula the level-scaling NPC powers share, before and after. +2 from 3rd level, with floor() only. */
export const NPC_DC_OLD = 'resolve(13+@actor.system.details.level.value+floor(@actor.system.details.level.value/3))';
export const NPC_DC_NEW = 'resolve(13+@actor.system.details.level.value+floor(@actor.system.details.level.value/3)+2*floor((@actor.system.details.level.value+97)/100))';

const hpFactor = (level) => (level >= 16 ? 1.25 : level >= 8 ? 1.1 : 1);
const avg = (formula) => { let t = 0; for (const m of String(formula).matchAll(/(\d+)d(\d+)/g)) t += m[1] * (+m[2] + 1) / 2; const flat = String(formula).replace(/\d+d\d+/g, '').replace(/\s/g, ''); if (flat) t += Number(flat) || 0; return t; };
const addFlat = (formula, n) => {
  const m = String(formula).replace(/\s/g, '').match(/^(\d+d\d+)([+-]\d+)?$/);
  if (!m) return null;
  const flat = Number(m[2] || 0) + n;
  return m[1] + (flat > 0 ? '+' + flat : flat < 0 ? String(flat) : '');
};

function apply(actor) {
  const level = actor.system.details.level.value, changes = [];
  const flagsOf = (i) => i.flags?.[MOD] ?? {};
  // layers before
  let shieldOld = 0, frame = 0, barrier = 0;
  for (const i of actor.items) {
    const f = flagsOf(i);
    if (f.shieldMax != null) shieldOld += f.shieldMax;
    if (f.shieldHpBonus != null) shieldOld += f.shieldHpBonus;
    if (f.armorMax != null) frame += f.armorMax;
    if (f.barrierMax != null) barrier += f.barrierMax; else if (f.barrier === true && i.type !== 'action') barrier += 5 * Math.max(1, Math.ceil(level / 2));
  }
  // shield copies follow the compendium
  let shieldNew = 0;
  for (const i of actor.items) {
    const src = SHIELD_SRC[i.name], f = flagsOf(i);
    if (!src || (f.shieldMax == null && f.shieldHpBonus == null)) continue;
    for (const key of ['shieldMax', 'shieldRegen', 'shieldHpBonus']) if (f[key] != null) f[key] = src.flags[MOD][key];
    if (i.system?.description) i.system.description.value = src.system.description.value;
    shieldNew += (f.shieldMax ?? 0) + (f.shieldHpBonus ?? 0);
  }
  const hp = actor.system.attributes.hp, hpOld = hp.max;
  const hpNew = Math.round((hpOld + shieldOld + frame + barrier) * hpFactor(level) - shieldNew - frame - barrier);
  if (hpNew !== hpOld || shieldNew !== shieldOld) changes.push(`HP ${hpOld} to ${hpNew}${shieldOld ? `, shield ${shieldOld} to ${shieldNew}` : ''}`);
  hp.max = hpNew; hp.value = hpNew; if (shieldOld || hp.temp) hp.temp = shieldNew;

  if (level >= 3) {
    for (const i of actor.items) {
      if (i.type === 'melee') {
        const rolls = Object.values(i.system.damageRolls ?? {}).filter((r) => r.category !== 'persistent');
        const total = rolls.reduce((s, r) => s + avg(r.damage), 0), extra = Math.round(total * 0.25);
        const first = rolls[0], was = first?.damage;
        if (first && extra > 0) { const now = addFlat(first.damage, extra); if (now) first.damage = now; else changes.push(`! ${i.name}: could not read "${first.damage}"`); }
        if (i.system.bonus?.value != null) i.system.bonus.value += 2;
        changes.push(`${i.name} +${i.system.bonus?.value}${first ? ` ${was} to ${first.damage}` : ''}`);
      }
      const d = i.system?.description;
      if (d?.value) {
        const bumped = new Set();
        let text = d.value.replace(/@Check\[(fortitude|reflex|will)\|dc:(\d+)/g, (m, save, dc) => { bumped.add(dc); return `@Check[${save}|dc:${+dc + 2}`; });
        for (const dc of bumped) text = text.replace(new RegExp(`\\bDC ${dc}\\b`, 'g'), `DC ${+dc + 2}`);
        if (text !== d.value) { d.value = text; changes.push(`${i.name}: save DC +2`); }
      }
    }
  }
  (actor.flags ??= {})[MOD] = { ...(actor.flags[MOD] ?? {}), enemyRule: 1 };
  return changes;
}

const targets = files.length ? files : [...walk('src/packs/me-npcs'), ...walk('src/packs/me-creatures'), ...walk('src/packs/me-vehicles')];
let done = 0, skipped = 0; const problems = [];
for (const f of targets) {
  const raw = readFileSync(f, 'utf8'); let actor;
  try { actor = JSON.parse(raw); } catch { continue; }
  if (actor.type !== 'npc') continue;
  if (f.split(sep).join('/').includes('/me-vehicles/') && !HOSTILE_VEHICLES.includes(actor.name)) continue;   // party vehicles are left alone
  if (actor.flags?.[MOD]?.enemyRule) { skipped++; continue; }
  const changes = apply(actor);
  for (const c of changes) if (c.startsWith('!')) problems.push(`${actor.name}: ${c}`);
  if (DRY) console.log(`${actor.name} (level ${actor.system.details.level.value}): ${changes.join('; ')}`);
  else {
    const crlf = raw.includes('\r\n'), indent = (raw.replace(/\r/g, '').match(/^([ \t]+)"/m) ?? [, '  '])[1];
    let out = JSON.stringify(actor, null, indent) + (/\n$/.test(raw) ? '\n' : '');
    if (crlf) out = out.replace(/\r?\n/g, '\r\n');
    writeFileSync(f, out);
  }
  done++;
}
// the shared NPC power-DC formula, wherever it is written (compendium powers and the copies on stat blocks)
let dcFiles = 0;
if (!files.length) for (const f of walk('src/packs')) {
  const raw = readFileSync(f, 'utf8');
  if (!raw.includes(NPC_DC_OLD)) continue;
  dcFiles++; if (!DRY) writeFileSync(f, raw.split(NPC_DC_OLD).join(NPC_DC_NEW));
}
console.log(`${DRY ? 'Would change' : 'Changed'} ${done} stat block(s); ${skipped} already done; NPC power-DC formula in ${dcFiles} file(s).`);
if (problems.length) { console.log('Problems:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
