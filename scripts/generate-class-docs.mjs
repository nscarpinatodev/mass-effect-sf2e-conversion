// Generates docs/mass-effect-starfinder-2e-conversion.md from source pack JSON files.
//
// Emits the complete document: classes, General Feats, Ancestries, Heritages,
// Backgrounds, Equipment and NPCs — the same coverage as generate-class-html.mjs,
// read from the same packs, so the two artifacts cannot drift.
//
// Prices are shown in Credits (SF2e's denomination, stored as sp: 1 Credit = 1 sp,
// 10 sp = 1 gp), matching the HTML/PDF build.
// Usage: node scripts/generate-class-docs.mjs

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { flattenEnrichers, indexPacks, summarizeClass } from './doc-helpers.mjs';

const SRC = 'src/packs';

async function loadFeat(packDir, filename) {
  const p = join(SRC, packDir, filename);
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function loadDir(packDir) {
  const dir = join(SRC, packDir);
  let files;
  try { files = (await readdir(dir)).filter(f => f.endsWith('.json') && !f.startsWith('_folder')); }
  catch { return []; }
  const out = [];
  for (const f of files) {
    try { out.push(JSON.parse(await readFile(join(dir, f), 'utf8'))); } catch { /* skip */ }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// me-npcs is organised into faction subfolders, each with a _folder.json
// carrying the display name and sort order.
async function loadNpcsByFaction() {
  const root = join(SRC, 'me-npcs');
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); } catch { return []; }
  const factions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    let meta = null; const npcs = [];
    for (const file of (await readdir(dir)).filter(f => f.endsWith('.json'))) {
      let doc; try { doc = JSON.parse(await readFile(join(dir, file), 'utf8')); } catch { continue; }
      if (file === '_folder.json') { meta = doc; continue; }
      if (doc?.system?.details) npcs.push(doc);
    }
    if (!npcs.length) continue;
    npcs.sort((a, b) => (a.system.details.level.value - b.system.details.level.value) || a.name.localeCompare(b.name));
    factions.push({ name: meta?.name ?? entry.name, sort: meta?.sort ?? 9e9, npcs });
  }
  return factions.sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
}

// ── shared formatting helpers ────────────────────────────────────────────────
const SIGN = n => `${n >= 0 ? '+' : ''}${n}`;
const NPC_SIZES = { tiny:'Tiny', sm:'Small', med:'Medium', lg:'Large', huge:'Huge', grg:'Gargantuan' };
const DTYPE = { piercing:'P', bludgeoning:'B', slashing:'S', electricity:'E', fire:'Fire', cold:'Cold', force:'Force', void:'Void' };

function credits(sys) {
  const v = sys?.price?.value;
  if (!v || typeof v !== 'object') return '—';
  const total = (v.pp ?? 0) * 100 + (v.gp ?? 0) * 10 + (v.sp ?? 0) + (v.cp ?? 0) * 0.1;
  if (!total) return '—';
  return `${(Math.round(total * 100) / 100).toLocaleString('en-US')} cr`;
}

function plain(html, limit) {
  const t = (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return limit && t.length > limit ? t.slice(0, limit).trimEnd() + '…' : t;
}

function firstPara(html) {
  const m = (html ?? '').match(/<p[^>]*>(?:<em>)?([\s\S]*?)(?:<\/em>)?<\/p>/);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

const ABBR = { cha:'Cha', con:'Con', dex:'Dex', int:'Int', str:'Str', wis:'Wis' };
const SKILL_LABELS = { acr:'Acrobatics', arc:'Arcana', ath:'Athletics', cra:'Crafting', dec:'Deception',
  dip:'Diplomacy', itm:'Intimidation', med:'Medicine', nat:'Nature', occ:'Occultism', prf:'Performance',
  rel:'Religion', soc:'Society', ste:'Stealth', sur:'Survival', thi:'Thievery' };

function boostList(obj) {
  const out = [];
  for (const v of Object.values(obj ?? {})) {
    const vals = v?.value ?? [];
    if (Array.isArray(vals) && vals.length === 1) out.push(ABBR[vals[0]] ?? vals[0]);
    else if (Array.isArray(vals) && vals.length > 1) out.push(vals.map(x => ABBR[x] ?? x).join(' or '));
    else if (Array.isArray(vals)) out.push('Free');
  }
  return out;
}

function titleCase(s) {
  return String(s).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Vehicles carry only a Fortitude save.
function savesMd(s) {
  const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);
  return [['fortitude', 'Fort'], ['reflex', 'Ref'], ['will', 'Will']]
    .filter(([k]) => s.saves?.[k]?.value != null)
    .map(([k, label]) => `**${label}** ${sign(s.saves[k].value)}`)
    .join(', ');
}

function htmlToMd(html) {
  return flattenEnrichers(html)
    .replace(/<h\d[^>]*>([\s\S]*?)<\/h\d>/g, '\n**$1**\n')
    .replace(/<tr>([\s\S]*?)<\/tr>/g, (_, row) => `| ${[...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(m => m[1]).join(' | ')} |\n`)
    .replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/g, '*$1*')
    .replace(/<hr\s*\/?>/g, '\n---\n')
    .replace(/<li>([\s\S]*?)<\/li>/g, '- $1\n')
    .replace(/<ul>([\s\S]*?)<\/ul>/g, '$1')
    .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function actionSymbol(actionType, actions) {
  if (actionType === 'reaction') return ' ↺';
  if (actionType === 'free')     return ' ◇';
  if (actionType === 'passive')  return '';
  if (actions === 1) return ' ◆';
  if (actions === 2) return ' ◆◆';
  if (actions === 3) return ' ◆◆◆';
  return '';
}

function renderFeat(feat) {
  const s = feat.system;
  const level   = s.level.value;
  const sym     = actionSymbol(s.actionType.value, s.actions.value);
  const prereqs = s.prerequisites.value.map(p => p.value).filter(Boolean);
  const desc    = htmlToMd(s.description.value);

  let out = `#### ${feat.name}${sym} — Level ${level}\n`;
  if (prereqs.length) out += `*Prerequisite: ${prereqs.join(', ')}*\n`;
  out += '\n' + desc;
  return out;
}

// ── Class-to-feat mapping ────────────────────────────────────────────────────

const CLASSES = [
  {
    name: 'SOLDIER',
    classFile: ['me-classes', 'soldier.json'],
    masteryChain: [
      ['me-combat-passives', 'soldier-mastery.json'],
      ['me-combat-passives', 'soldier-mastery-improved.json'],
      ['me-combat-passives', 'soldier-mastery-superior.json'],
    ],
    feats: [
      ['me-combat-passives', 'adrenaline-rush.json'],
      ['me-combat-passives', 'adrenaline-rush-improved.json'],
      ['me-combat-passives', 'adrenaline-rush-master.json'],
      ['me-combat-passives', 'concussive-shot.json'],
      ['me-combat-passives', 'concussive-shot-improved.json'],
      ['me-combat-passives', 'concussive-shot-master.json'],
      ['me-combat-passives', 'concussive-shot-volley.json'],
      ['me-combat-passives', 'frag-grenade-feat.json'],
      ['me-ammo-powers',     'incendiary-feat.json'],
      ['me-ammo-powers',     'disruptor-feat.json'],
      ['me-ammo-powers',     'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-ammo-master.json'],
      ['me-class-progressions', 'soldier-heavy-weapon-training.json'],
      ['me-class-progressions', 'soldier-tactical-reload.json'],
      ['me-class-progressions', 'soldier-devastating-rounds.json'],
      ['me-class-progressions', 'soldier-suppressing-fire.json'],
      ['me-class-progressions', 'soldier-battlefield-commander.json'],
      ['me-class-progressions', 'soldier-legendary-combat.json'],
      ['me-class-progressions', 'soldier-war-machine.json'],
    ],
  },
  {
    name: 'ENGINEER',
    classFile: ['me-classes', 'engineer.json'],
    masteryChain: [
      ['me-combat-passives', 'engineer-mastery.json'],
      ['me-combat-passives', 'engineer-mastery-improved.json'],
      ['me-combat-passives', 'engineer-mastery-superior.json'],
    ],
    feats: [
      ['me-tech-powers', 'incinerate-feat.json'],
      ['me-tech-powers', 'overload-feat.json'],
      ['me-tech-powers', 'cryo-blast-feat.json'],
      ['me-tech-powers', 'combat-drone-feat.json'],
      ['me-tech-powers', 'sabotage-feat.json'],
      ['me-tech-powers', 'sentry-turret-feat.json'],
      ['me-class-progressions', 'upgrade-overload.json'],
      ['me-class-progressions', 'upgrade-incinerate.json'],
      ['me-class-progressions', 'upgrade-combat-drone.json'],
      ['me-class-progressions', 'engineer-system-override.json'],
      ['me-class-progressions', 'engineer-tech-field.json'],
      ['me-class-progressions', 'engineer-overload-network.json'],
      ['me-class-progressions', 'engineer-drone-commander.json'],
      ['me-class-progressions', 'engineer-omni-grenade.json'],
      ['me-class-progressions', 'engineer-network-shutdown.json'],
      ['me-class-progressions', 'engineer-apex-engineer.json'],
    ],
  },
  {
    name: 'ADEPT',
    classFile: ['me-classes', 'adept.json'],
    masteryChain: [
      ['me-combat-passives', 'adept-mastery.json'],
      ['me-combat-passives', 'adept-mastery-improved.json'],
      ['me-combat-passives', 'adept-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'throw-feat.json'],
      ['me-biotic-powers', 'pull-feat.json'],
      ['me-biotic-powers', 'shockwave-feat.json'],
      ['me-biotic-powers', 'warp-feat.json'],
      ['me-biotic-powers', 'singularity-feat.json'],
      ['me-biotic-powers', 'cluster-grenade-feat.json'],
      ['me-class-progressions', 'upgrade-warp.json'],
      ['me-class-progressions', 'upgrade-singularity.json'],
      ['me-class-progressions', 'adept-biotic-resonance.json'],
      ['me-class-progressions', 'adept-warp-field.json'],
      ['me-class-progressions', 'adept-gravity-well.json'],
      ['me-class-progressions', 'adept-biotic-cascade.json'],
      ['me-class-progressions', 'adept-dark-matter.json'],
      ['me-class-progressions', 'adept-ascendant-form.json'],
    ],
  },
  {
    name: 'VANGUARD',
    classFile: ['me-classes', 'vanguard.json'],
    masteryChain: [
      ['me-combat-passives', 'vanguard-mastery.json'],
      ['me-combat-passives', 'vanguard-mastery-improved.json'],
      ['me-combat-passives', 'vanguard-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'pull-feat.json'],
      ['me-biotic-powers', 'charge-feat.json'],
      ['me-biotic-powers', 'shockwave-feat.json'],
      ['me-biotic-powers', 'nova-feat.json'],
      ['me-biotic-powers', 'vanguard-rush-feat.json'],
      ['me-ammo-powers',   'incendiary-feat.json'],
      ['me-ammo-powers',   'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-charge.json'],
      ['me-class-progressions', 'upgrade-nova.json'],
      ['me-class-progressions', 'vanguard-unstoppable-charge.json'],
      ['me-class-progressions', 'vanguard-biotic-warrior.json'],
      ['me-class-progressions', 'vanguard-vanguard-strike.json'],
      ['me-class-progressions', 'vanguard-rampage.json'],
      ['me-class-progressions', 'vanguard-deaths-embrace.json'],
      ['me-class-progressions', 'vanguard-apex-vanguard.json'],
    ],
  },
  {
    name: 'INFILTRATOR',
    classFile: ['me-classes', 'infiltrator.json'],
    masteryChain: [
      ['me-combat-passives', 'infiltrator-mastery.json'],
      ['me-combat-passives', 'infiltrator-mastery-improved.json'],
      ['me-combat-passives', 'infiltrator-mastery-superior.json'],
    ],
    feats: [
      ['me-tech-powers', 'incinerate-feat.json'],
      ['me-tech-powers', 'tactical-cloak-feat.json'],
      ['me-tech-powers', 'sabotage-feat.json'],
      ['me-tech-powers', 'sticky-grenade-feat.json'],
      ['me-ammo-powers', 'disruptor-feat.json'],
      ['me-ammo-powers', 'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-incinerate.json'],
      ['me-class-progressions', 'upgrade-tactical-cloak.json'],
      ['me-class-progressions', 'infiltrator-ghost-protocol.json'],
      ['me-class-progressions', 'infiltrator-assassination-protocol.json'],
      ['me-class-progressions', 'infiltrator-hunters-mark.json'],
      ['me-class-progressions', 'infiltrator-phantom-protocol.json'],
      ['me-class-progressions', 'infiltrator-death-from-above.json'],
      ['me-class-progressions', 'infiltrator-apex-infiltrator.json'],
    ],
  },
  {
    name: 'SENTINEL',
    classFile: ['me-classes', 'sentinel.json'],
    masteryChain: [
      ['me-combat-passives', 'sentinel-mastery.json'],
      ['me-combat-passives', 'sentinel-mastery-improved.json'],
      ['me-combat-passives', 'sentinel-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'throw-feat.json'],
      ['me-biotic-powers', 'warp-feat.json'],
      ['me-biotic-powers', 'lift-grenade-feat.json'],
      ['me-tech-powers',   'armor-feat.json'],
      ['me-tech-powers',   'overload-feat.json'],
      ['me-tech-powers',   'cryo-blast-feat.json'],
      ['me-class-progressions', 'upgrade-overload.json'],
      ['me-class-progressions', 'upgrade-warp.json'],
      ['me-class-progressions', 'sentinel-hybrid-core.json'],
      ['me-class-progressions', 'sentinel-adaptive-defense.json'],
      ['me-class-progressions', 'sentinel-interference-field.json'],
      ['me-class-progressions', 'sentinel-battle-hardened.json'],
      ['me-class-progressions', 'sentinel-sentinels-resolve.json'],
      ['me-class-progressions', 'sentinel-apex-sentinel.json'],
    ],
  },
];

// ── General Feats ────────────────────────────────────────────────────────────

const GENERAL_FEATS = [
  ['me-biotic-powers', 'lift-feat.json'],
  ['me-biotic-powers', 'lash-feat.json'],
  ['me-biotic-powers', 'slam-feat.json'],
  ['me-biotic-powers', 'reave-feat.json'],
  ['me-biotic-powers', 'stasis-feat.json'],
  ['me-biotic-powers', 'dark-channel-feat.json'],
  ['me-biotic-powers', 'dominate-feat.json'],
  ['me-biotic-powers', 'flare-feat.json'],
  ['me-tech-powers', 'damping-feat.json'],
  ['me-tech-powers', 'neural-shock-feat.json'],
  ['me-tech-powers', 'geth-shield-boost-feat.json'],
  ['me-tech-powers', 'decoy-feat.json'],
  ['me-tech-powers', 'ai-hacking-feat.json'],
  ['me-tech-powers', 'energy-drain-feat.json'],
  ['me-tech-powers', 'defense-drone-feat.json'],
  ['me-tech-powers', 'defense-matrix-feat.json'],
  ['me-ammo-powers', 'armor-piercing-feat.json'],
  ['me-ammo-powers', 'phasic-feat.json'],
  ['me-ammo-powers', 'shredder-feat.json'],
  ['me-ammo-powers', 'warp-feat.json'],
  ['me-combat-passives', 'fortification.json'],
  ['me-combat-passives', 'fortification-improved.json'],
  ['me-combat-passives', 'fortification-master.json'],
];

// ── Section renderers ────────────────────────────────────────────────────────

const MD_LANGUAGES = {
  taldane:'Common', thessian:'Thessian', khelish:'Khelish', batarian:'Batarian',
  drell:'Drell', elcor:'Elcor', hanar:'Hanar', krogan:'Krogan',
  salarian:'Salarian', turian:'Turian', volus:'Volus', vorcha:'Vorcha',
};
const MD_VISION       = { 'low-light-vision':'Low-Light Vision', darkvision:'Darkvision' };
const MD_SHORT_VISION = { 'low-light-vision':'Low-Light', darkvision:'Dark' };
const MD_ABILITY = { cha:'Charisma', con:'Constitution', dex:'Dexterity', int:'Intelligence', str:'Strength', wis:'Wisdom' };
const MD_HEADING_MAP = { 'Alignment and Religion':'Beliefs' };

function mdLanguage(c) { return MD_LANGUAGES[c] ?? titleCase(c); }

// Boosts: a slot listing every attribute is a free boost; several read "Two Free".
function ancestryBoosts(obj) {
  const fixed = []; let free = 0;
  for (const v of Object.values(obj ?? {})) {
    const vals = v?.value ?? [];
    if (vals.length >= 6) free += 1;
    else if (vals.length === 1) fixed.push(MD_ABILITY[vals[0]] ?? vals[0]);
    else if (vals.length > 1) fixed.push(vals.map(x => MD_ABILITY[x] ?? x).join(' or '));
  }
  const NUM = ['', 'Free', 'Two Free', 'Three Free', 'Four Free'];
  return free ? [...fixed, NUM[free] ?? `${free} Free`] : fixed;
}
function ancestryFlaws(obj) {
  const out = [];
  for (const v of Object.values(obj ?? {})) out.push(...(v?.value ?? []).map(x => MD_ABILITY[x] ?? x));
  return out;
}

// Same shape as the HTML generator parses: hook + overview, <hr/>, then
// <p><strong>Heading</strong></p> blocks.
function parseAncestryDescription(value) {
  const parts = (value ?? '').split(/<hr\s*\/?>/);
  const head = parts[0] ?? '';
  const rest = parts.slice(1).join('');
  const paras = [...head.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => m[1]);
  const flavor = plain(paras[0] ?? '');
  const overview = paras.slice(1).map(p => htmlToMd(`<p>${p}</p>`)).filter(Boolean);
  const sections = [];
  const re = /<p[^>]*><strong>([^<]+)<\/strong><\/p>([\s\S]*?)(?=<p[^>]*><strong>|$)/g;
  let m;
  while ((m = re.exec(rest))) {
    let heading = m[1].trim().replace(/\.\.\.$/, '\u2026');
    heading = MD_HEADING_MAP[heading] ?? heading;
    sections.push({ heading, body: htmlToMd(m[2].trim()) });
  }
  return { flavor, overview, sections };
}

function ancestrySpecialNames(ancestries) {
  return new Set(ancestries.flatMap(a => Object.values(a.system?.items ?? {}).map(i => i.name)));
}

function renderAncestries(ancestries, heritages, ancestryFeats) {
  const sorted = [...ancestries].sort((x, y) => x.name.localeCompare(y.name));
  const slugOf = a => a.system?.slug ?? a.name.toLowerCase();

  const heritageMap = new Map();
  for (const h of heritages) {
    const key = h.system?.ancestry?.slug ?? 'other';
    if (!heritageMap.has(key)) heritageMap.set(key, []);
    heritageMap.get(key).push(h);
  }

  // The two level-0 grants per ancestry are special abilities, listed in the
  // mechanics block rather than as feats.
  const specialNames = ancestrySpecialNames(ancestries);
  const featsBySlug = new Map();
  for (const f of ancestryFeats) {
    if (specialNames.has(f.name)) continue;
    const t = (f.system?.traits?.value ?? []).find(x => ancestries.some(a => slugOf(a) === x));
    if (!t) continue;
    if (!featsBySlug.has(t)) featsBySlug.set(t, []);
    featsBySlug.get(t).push(f);
  }

  const L = ['## ANCESTRIES', ''];
  L.push('*Your ancestry sets your starting Hit Points, size, Speed, attribute boosts and flaw, languages, and any special senses or biology. Choose one heritage at 1st level, then an ancestry feat at 1st level and every even level thereafter. Each species has its own section below, carrying its heritages and its full ancestry feat list.*', '');
  L.push('| Ancestry | HP | Size | Speed | Boosts | Flaw | Vision | Heritages |', '|---|---|---|---|---|---|---|---|');
  for (const a of sorted) {
    const s = a.system;
    L.push(`| **${a.name}** | ${s.hp} | ${NPC_SIZES[s.size] ?? titleCase(s.size ?? 'med')} | ${s.speed} ft `
      + `| ${ancestryBoosts(s.boosts).join(', ') || '—'} | ${ancestryFlaws(s.flaws).join(', ') || '—'} `
      + `| ${MD_SHORT_VISION[s.vision] ?? 'Normal'} | ${(heritageMap.get(slugOf(a)) ?? []).length} |`);
  }
  L.push('', '---', '');

  for (const a of sorted) {
    const s = a.system;
    const slug = slugOf(a);
    const { flavor, overview, sections } = parseAncestryDescription(s.description?.value);

    L.push(`### ${a.name.toUpperCase()}`, '');
    L.push(`![${a.name}](images/ancestries/${slug}.jpg)`, '');
    const rarity = s.traits?.rarity ?? 'common';
    L.push(`*${[rarity, ...(s.traits?.value ?? [])].map(titleCase).join(' · ')}*`, '');
    if (flavor) L.push(`> ${flavor}`, '');
    for (const p of overview) L.push(p, '');
    for (const sec of sections) {
      L.push(`**${sec.heading}**`, '');
      L.push(sec.body, '');
    }

    L.push(`#### ${a.name} Mechanics`, '');
    L.push(`**Hit Points** ${s.hp}  `);
    L.push(`**Size** ${NPC_SIZES[s.size] ?? titleCase(s.size ?? 'med')}  `);
    L.push(`**Speed** ${s.speed} feet  `);
    L.push(`**Attribute Boosts** ${ancestryBoosts(s.boosts).join(', ') || '—'}  `);
    const flaws = ancestryFlaws(s.flaws);
    L.push(`**Attribute Flaw${flaws.length > 1 ? 's' : ''}** ${flaws.join(', ') || '—'}  `);
    const base  = (s.languages?.value ?? []).map(mdLanguage).join(', ');
    const pool  = (s.additionalLanguages?.value ?? []).map(mdLanguage).join(', ');
    const count = s.additionalLanguages?.count ?? 0;
    const extra = count > 0
      ? `${count} additional language${count === 1 ? '' : 's'}, plus a number of languages equal to your Intelligence modifier (if positive)`
      : 'a number of additional languages equal to your Intelligence modifier (if positive)';
    L.push(`**Languages** ${base}. You also gain ${extra}, chosen from ${pool}.`, '');

    const vision = MD_VISION[s.vision];
    if (vision) {
      L.push(`**${vision}** You can see in dim light as though it were bright light`
        + `${s.vision === 'darkvision' ? ', and in darkness as though it were dim light (in black and white only)' : ''}.`, '');
    }
    for (const item of Object.values(s.items ?? {})) {
      const f = ancestryFeats.find(x => x.name === item.name);
      if (f) L.push(`**${f.name}** ${htmlToMd(f.system.description.value)}`, '');
    }

    const hs = (heritageMap.get(slug) ?? []).sort((x, y) => x.name.localeCompare(y.name));
    if (hs.length) {
      L.push(`#### ${a.name} Heritages`, '');
      for (const h of hs) {
        const rare = h.system?.traits?.rarity && h.system.traits.rarity !== 'common' ? ` *(${h.system.traits.rarity})*` : '';
        L.push(`**${h.name}**${rare} ${htmlToMd(h.system?.description?.value ?? '')}`, '');
      }
    }

    const feats = (featsBySlug.get(slug) ?? [])
      .sort((x, y) => (x.system.level.value - y.system.level.value) || x.name.localeCompare(y.name));
    // Ancestry feats print in full here, as the core rulebook does; the Feats
    // section carries an index back to these sections rather than a second copy.
    if (feats.length) {
      L.push(`#### ${a.name} Feats`, '');
      L.push('*Take one of these at 1st level and every even level thereafter, provided you meet its level requirement.*', '');
      for (const f of feats) L.push(renderFeat(f).replace(/^#### /, '##### '), '');
    }

    L.push('---', '');
  }

  return L;
}

function renderBackgrounds(backgrounds) {
  const L = ['## BACKGROUNDS', ''];
  L.push('*Choose one background during character creation. Backgrounds grant two ability boosts, skill training, a Lore skill, and a 1st-level skill feat.*', '');
  L.push('| Background | Ability Boosts | Skill | Lore | Description |', '|---|---|---|---|---|');
  for (const b of [...backgrounds].sort((x, y) => x.name.localeCompare(y.name))) {
    const s = b.system;
    const boosts = boostList(s.boosts).join(', ') || '—';
    const skills = (s.trainedSkills?.value ?? []).map(k => SKILL_LABELS[k] ?? titleCase(k)).join(', ') || '—';
    const lore   = s.trainedLore || '—';
    const desc   = firstPara(s.description?.value) || plain(s.description?.value, 110);
    L.push(`| ${b.name} | ${boosts} | ${skills} | ${lore} | ${desc} |`);
  }
  L.push('', '---', '');
  return L;
}

function weaponMd(list, heading) {
  const L = [`#### ${heading}`, ''];
  L.push('| Name | Level | Bulk | Credits | Damage | Type | Range | Traits |', '|---|---|---|---|---|---|---|---|');
  for (const w of [...list].sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))) {
    const s = w.system;
    const traits = (s.traits?.value ?? []).filter(t => !['tech', 'common'].includes(t)).join(', ') || '—';
    L.push(`| ${w.name} | ${s.level?.value ?? '?'} | ${s.bulk?.value ?? '?'} | ${credits(s)} | ${s.damage?.dice ?? '?'}${s.damage?.die ?? ''} | ${DTYPE[s.damage?.damageType] ?? s.damage?.damageType ?? '?'} | ${s.range ?? '—'} ft | ${traits} |`);
  }
  L.push('');
  return L;
}

function armorMd(list, heading) {
  const L = [`#### ${heading}`, ''];
  L.push('| Name | Level | Bulk | Credits | AC | Dex Cap | Check | Speed | Str |', '|---|---|---|---|---|---|---|---|---|');
  for (const a of [...list].sort((x, y) => (x.system.level?.value ?? 0) - (y.system.level?.value ?? 0) || x.name.localeCompare(y.name))) {
    const s = a.system;
    L.push(`| ${a.name} | ${s.level?.value ?? 0} | ${s.bulk?.value ?? '?'} | ${credits(s)} | +${s.acBonus ?? '?'} | ${s.dexCap ?? '?'} | ${s.checkPenalty ?? 0} | ${s.speedPenalty ?? 0} | ${s.strength ?? '?'} |`);
  }
  L.push('');
  return L;
}

function modMd(list, heading, intro) {
  const L = [`### ${heading}`, ''];
  if (intro) L.push(intro, '');
  L.push('| Mod | Level | Credits | Effect |', '|---|---|---|---|');
  for (const m of [...list].sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))) {
    L.push(`| ${m.name} | ${m.system.level?.value ?? '?'} | ${credits(m.system)} | ${plain(m.system.description?.value, 100)} |`);
  }
  L.push('');
  return L;
}

const SHIELD_EFFECTS = {
  'Kinetic Shield': '30 Shield HP; recharges 10 HP/turn',
  'Shield HP Mod - Tier 1': '+10 max Shield HP (30 → 40)',
  'Shield HP Mod - Tier 2': '+20 max Shield HP (30 → 50)',
  'Shield HP Mod - Tier 3': '+40 max Shield HP (30 → 70)',
  'Shield HP Mod - Tier 4': '+70 max Shield HP (30 → 100)',
  'Shield Regen Mod - Tier 1': 'Recharge rate 10 → 15 HP/turn',
  'Shield Regen Mod - Tier 2': 'Recharge rate 10 → 20 HP/turn',
  'Shield Regen Mod - Tier 3': 'Recharge rate 10 → 25 HP/turn',
  'Shield Regen Mod - Tier 4': 'Recharge rate 10 → 30 HP/turn',
};
const FRAME_AP = { 'Light Combat Frame': 20, 'Standard Combat Frame': 50, 'Heavy Combat Frame': 100, 'Titan Combat Frame': 200 };

function renderEquipment(weapons, armors, weaponMods, armorMods, grenades, shields) {
  const byGroup = { pistol: [], rifle: [], shotgun: [], sniper: [], bomb: [] };
  for (const w of weapons) (byGroup[w.system.group] ?? byGroup.pistol).push(w);

  const L = ['## EQUIPMENT', '', '### Weapons', ''];
  L.push('*All Mass Effect weapons carry the **tech** trait. Action cost to Strike is ◆ unless noted. Damage type: P = piercing, B = bludgeoning, S = slashing, E = electricity.*', '');
  L.push('**Trait Key**');
  L.push('- **automatic** — Can fire a burst; all targets in a 10-ft cone make Reflex saves instead of individual attack rolls.');
  L.push('- **burst-fire** — Makes 3 attacks as a 2-action activity; all share the same roll, each deals half damage.');
  L.push('- **fatal-dX** — On a critical hit, the damage die increases to dX and you roll one additional die.');
  L.push('- **kickback** — −2 to attack rolls unless you have both hands on the weapon or brace against a surface.');
  L.push('- **scatter-X** — All creatures within X feet of the primary target also take splash damage equal to the damage dice result.');
  L.push('- **unwieldy** — Cannot be used for more than one Strike per turn.');
  L.push('- **volley-X** — −2 to attack rolls against targets within X feet of you.', '');
  L.push(...weaponMd(byGroup.pistol, 'Pistols & SMGs'));
  L.push(...weaponMd(byGroup.rifle, 'Assault Rifles'));
  L.push(...weaponMd(byGroup.shotgun, 'Shotguns'));
  L.push(...weaponMd(byGroup.sniper, 'Sniper Rifles'));
  L.push(...weaponMd(byGroup.bomb, 'Heavy Weapons'));

  L.push('### Armor', '');
  L.push('*All armors carry the **tech** trait. Heavy armors also carry **bulwark**. Str = Strength score required to avoid the Speed penalty.*', '');
  L.push(...armorMd(armors.filter(a => a.system.category === 'light'), 'Light Armor'));
  L.push(...armorMd(armors.filter(a => a.system.category === 'medium'), 'Medium Armor'));
  L.push(...armorMd(armors.filter(a => a.system.category === 'heavy'), 'Heavy Armor'));

  L.push('### Kinetic Shields & Combat Frames', '');
  L.push('Kinetic shields are worn equipment that provide Shield HP — temporary protection that regenerates at the start of each turn. Combat frames absorb damage after shields, before actual HP.', '');
  L.push('| Item | Level | Credits | Effect |', '|---|---|---|---|');
  for (const s of shields.filter(x => SHIELD_EFFECTS[x.name])
    .sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))) {
    L.push(`| ${s.name.replace(' - ', ' — ')} | ${s.system.level?.value ?? '?'} | ${credits(s.system)} | ${SHIELD_EFFECTS[s.name]} |`);
  }
  L.push('', '*Only one HP Mod and one Regen Mod can be installed at a time.*', '');
  L.push('#### Combat Frames', '');
  L.push('| Frame | Armor Points |', '|---|---|');
  for (const s of shields.filter(x => FRAME_AP[x.name])) L.push(`| ${s.name} | ${FRAME_AP[s.name]} |`);
  L.push('');
  L.push('#### Biotic Barrier', '');
  L.push('Biotics can activate a personal mass effect barrier. **HP = 5 × ⌊level ÷ 2⌋**, calculated at activation. Absorbs damage before shields and HP. Does not recharge passively — must be reactivated.', '');

  L.push(...modMd(weaponMods, 'Weapon Modifications', 'Weapon mods install into a single weapon and provide passive or triggered bonuses. Most weapons accept one mod.'));
  L.push(...modMd(armorMods, 'Armor Modifications', 'Armor mods install into a single suit of armor. Most armors accept one mod.'));

  L.push('### Grenades', '');
  L.push('Grenades are consumable items sold in packs of 3. All grenades require ◆◆ to use unless noted.', '', '---', '');
  for (const g of [...grenades].sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))) {
    const s = g.system;
    L.push(`#### ${g.name} ◆◆ — Level ${s.level?.value ?? '?'} · ${s.bulk?.value ? `${s.bulk.value} Bulk` : 'L Bulk'} · ${credits(s)}`, '');
    L.push(htmlToMd(s.description?.value ?? ''), '');
    L.push('---', '');
  }
  return L;
}

function renderNpcs(factions) {
  const total = factions.reduce((n, f) => n + f.npcs.length, 0);
  const L = ['## NPCS', ''];
  L.push(`*${total} ready-to-run NPCs grouped by faction, matching the **ME NPCs** compendium. Shield values are kinetic barriers that absorb damage before Hit Points and recharge at the start of each turn.*`, '');
  L.push('---', '');
  for (const f of factions) {
    L.push(`### ${f.name.toUpperCase()}`, '');
    for (const npc of f.npcs) {
      const s = npc.system;
      const items = npc.items ?? [];
      const rarity = s.traits?.rarity ?? 'common';
      const tags = [rarity !== 'common' ? titleCase(rarity) : null, NPC_SIZES[s.traits?.size?.value] ?? 'Medium',
        ...(s.traits?.value ?? []).map(titleCase)].filter(Boolean);
      L.push(`#### ${npc.name} — Creature ${s.details.level.value}`, '');
      L.push(`*${tags.join(' · ')}*`, '');
      if (s.details.blurb) L.push(`${s.details.blurb}`, '');
      const skills = Object.entries(s.skills ?? {}).map(([k, v]) => `${titleCase(k)} ${SIGN(v.base ?? 0)}`).sort().join(', ');
      L.push(`**Perception** ${SIGN(s.perception?.mod ?? 0)}${skills ? `; **Skills** ${skills}` : ''}`);
      L.push(`**Abilities** ${['str','dex','con','int','wis','cha'].map(a => `${ABBR[a]} ${SIGN(s.abilities?.[a]?.mod ?? 0)}`).join(', ')}`);
      const gear = items.filter(i => ['weapon','armor','equipment'].includes(i.type)).map(i => i.name);
      if (gear.length) L.push(`**Items** ${gear.join(', ')}`);
      const shield = items.find(i => i.flags?.['mass-effect-sf2e-conversion']?.shieldMax)?.flags['mass-effect-sf2e-conversion'];
      L.push(`**AC** ${s.attributes.ac.value}; ${savesMd(s)}`);
      L.push(`**HP** ${s.attributes.hp.max}${shield ? `; **Shields** ${shield.shieldMax} (recharge ${shield.shieldRegen}/turn)` : ''}`);
      L.push(`**Speed** ${s.attributes.speed?.value ?? 25} feet`);
      for (const st of items.filter(i => i.type === 'melee')) {
        const sy = st.system ?? {};
        const traits = sy.traits?.value ?? [];
        const rt = traits.find(t => /^range-increment-\d+$/.test(t));
        const shown = traits.filter(t => t !== rt);
        if (rt) shown.unshift(`range increment ${rt.split('-').pop()} ft`);
        const dmg = Object.values(sy.damageRolls ?? {}).map(r => `${r.damage} ${r.damageType}`).join(' plus ');
        L.push(`**${rt ? 'Ranged' : 'Melee'}** ◆ ${st.name} ${SIGN(sy.bonus?.value ?? 0)}${shown.length ? ` (${shown.join(', ')})` : ''}${dmg ? `, **Damage** ${dmg}` : ''}`);
      }
      for (const ab of items.filter(i => i.type === 'action')) {
        const sym = actionSymbol(ab.system?.actionType?.value, ab.system?.actions?.value);
        let body = ab.system?.description?.value ?? '';
        const m = body.match(/^\s*<p>\s*<strong>([^<]*)<\/strong>[\s\S]*?<\/p>\s*(?:<hr\s*\/?>)?/i);
        if (m && m[1].trim().toLowerCase() === ab.name.trim().toLowerCase()) body = body.slice(m[0].length);
        body = htmlToMd(body.replace(/<span class="action-glyph">[^<]*<\/span>/g, ''));
        L.push(`**${ab.name}**${sym} ${body}`);
      }
      L.push('', '---', '');
    }
  }
  return L;
}


function renderFeats(classFeatSets, ancestryFeats, ancestries, generalFeats) {
  const L = ['## FEATS', ''];
  L.push('*Class feats, racial (ancestry) feats, and general/skill feats.*', '');
  L.push('---', '');

  L.push('### Class Feats', '');
  for (const { name, feats } of classFeatSets) {
    if (!feats.length) continue;
    L.push(`#### ${titleCase(name)}`, '');
    for (const f of [...feats].sort((a, b) => (a.system.level.value - b.system.level.value) || a.name.localeCompare(b.name))) {
      L.push(renderFeat(f), '', '---', '');
    }
  }

  L.push('### Racial Feats', '');
  L.push('*Ancestry feats print in full in each species\' own section under Ancestries, alongside the heritages and special abilities they interact with. This index lists them all by ancestry and level.*', '');
  const specialNames = ancestrySpecialNames(ancestries);
  const byAnc = new Map();
  for (const f of ancestryFeats) {
    if (specialNames.has(f.name)) continue;
    const traits = f.system?.traits?.value ?? [];
    const anc = ancestries.find(a => traits.includes(a.system?.slug ?? a.name.toLowerCase()));
    if (!anc) continue;
    if (!byAnc.has(anc)) byAnc.set(anc, []);
    byAnc.get(anc).push(f);
  }
  L.push('| Ancestry | Feats (level) |', '|---|---|');
  for (const [anc, feats] of [...byAnc].sort((a, b) => a[0].name.localeCompare(b[0].name))) {
    const listed = [...feats]
      .sort((a, b) => (a.system.level.value - b.system.level.value) || a.name.localeCompare(b.name))
      .map(f => `${f.name} (${f.system.level.value})`)
      .join(', ');
    L.push(`| **${anc.name}** | ${listed} |`);
  }
  L.push('', '---', '');

  L.push('### General & Skill Feats', '');
  L.push('*Powers and feats that appear on two or more class lists, or are open to any character meeting the prerequisites.*', '');
  for (const f of generalFeats) L.push(renderFeat(f), '', '---', '');
  return L;
}

function statblockMd(npc) {
  const s = npc.system;
  const items = npc.items ?? [];
  const rarity = s.traits?.rarity ?? 'common';
  const tags = [rarity !== 'common' ? titleCase(rarity) : null,
    NPC_SIZES[s.traits?.size?.value] ?? 'Medium', ...(s.traits?.value ?? []).map(titleCase)].filter(Boolean);
  const L = [`##### ${npc.name} — Creature ${s.details.level.value}`, '', `*${tags.join(' · ')}*`, ''];
  if (s.details.blurb) L.push(s.details.blurb, '');
  const skills = Object.entries(s.skills ?? {}).map(([k, v]) => `${titleCase(k)} ${SIGN(v.base ?? 0)}`).sort().join(', ');
  L.push(`**Perception** ${SIGN(s.perception?.mod ?? 0)}${skills ? `; **Skills** ${skills}` : ''}`);
  L.push(`**Abilities** ${['str','dex','con','int','wis','cha'].map(a => `${ABBR[a]} ${SIGN(s.abilities?.[a]?.mod ?? 0)}`).join(', ')}`);
  const gear = items.filter(i => ['weapon','armor','equipment'].includes(i.type)).map(i => i.name);
  if (gear.length) L.push(`**Items** ${gear.join(', ')}`);
  const sh = items.find(i => i.flags?.['mass-effect-sf2e-conversion']?.shieldMax)?.flags['mass-effect-sf2e-conversion'];
  L.push(`**AC** ${s.attributes.ac.value}; ${savesMd(s)}`);
  L.push(`**HP** ${s.attributes.hp.max}${sh ? `; **Shields** ${sh.shieldMax} (recharge ${sh.shieldRegen}/turn)` : ''}`);
  L.push(`**Speed** ${s.attributes.speed?.value ?? 25} feet`);
  for (const st of items.filter(i => i.type === 'melee')) {
    const sy = st.system ?? {};
    const traits = sy.traits?.value ?? [];
    const rt = traits.find(t => /^range-increment-\d+$/.test(t));
    const shown = traits.filter(t => t !== rt);
    if (rt) shown.unshift(`range increment ${rt.split('-').pop()} ft`);
    const dmg = Object.values(sy.damageRolls ?? {}).map(r => `${r.damage} ${r.damageType}`).join(' plus ');
    L.push(`**${rt ? 'Ranged' : 'Melee'}** ◆ ${st.name} ${SIGN(sy.bonus?.value ?? 0)}${shown.length ? ` (${shown.join(', ')})` : ''}${dmg ? `, **Damage** ${dmg}` : ''}`);
  }
  for (const ab of items.filter(i => i.type === 'action')) {
    const sym = actionSymbol(ab.system?.actionType?.value, ab.system?.actions?.value);
    let body = ab.system?.description?.value ?? '';
    const m = body.match(/^\s*<p>\s*<strong>([^<]*)<\/strong>[\s\S]*?<\/p>\s*(?:<hr\s*\/?>)?/i);
    if (m && m[1].trim().toLowerCase() === ab.name.trim().toLowerCase()) body = body.slice(m[0].length);
    L.push(`**${ab.name}**${sym} ${htmlToMd(body.replace(/<span class="action-glyph">[^<]*<\/span>/g, ''))}`);
  }
  L.push('', '---', '');
  return L;
}

function renderBestiary(npcFactions, creatures, vehicles, ships) {
  const byLevel = list => [...list].sort((a, b) =>
    (a.system.details.level.value - b.system.details.level.value) || a.name.localeCompare(b.name));
  const total = npcFactions.reduce((n, f) => n + f.npcs.length, 0) + creatures.length + vehicles.length + ships.length;
  const L = ['# PART II — BESTIARY', ''];
  L.push(`*${total} ready-to-run adversaries and allies: faction NPCs, hostile creatures and synthetics, and crewed vehicles and ships.*`, '');
  L.push('---', '');

  L.push('## NPCS', '');
  L.push('*Grouped by faction, matching the **ME NPCs** compendium. Shield values are kinetic barriers that absorb damage before Hit Points and recharge at the start of each turn.*', '');
  for (const f of npcFactions) {
    L.push(`### ${f.name.toUpperCase()}`, '');
    for (const npc of f.npcs) L.push(...statblockMd(npc));
  }

  L.push('## CREATURES', '');
  L.push('*Hostile lifeforms, synthetics and Reaper constructs from the **ME Creatures** compendium.*', '');
  const GROUPS = [['Reaper Forces', /husk|reaper|collector/i], ['Geth', /geth/i], ['Mechs', /mech/i], ['Wildlife & Other', /.*/]];
  const used = new Set();
  for (const [name, rx] of GROUPS) {
    const list = byLevel(creatures.filter(c => {
      if (used.has(c.name)) return false;
      const hay = `${c.name} ${(c.system.traits?.value ?? []).join(' ')}`;
      if (!rx.test(hay)) return false;
      used.add(c.name); return true;
    }));
    if (!list.length) continue;
    L.push(`### ${name.toUpperCase()}`, '');
    for (const c of list) L.push(...statblockMd(c));
  }

  L.push('## VEHICLES & SHIPS', '');
  L.push('*Crewed vehicles, gunships and capital ships. Speed represents tactical movement.*', '');
  L.push('### VEHICLES', '');
  for (const v of byLevel(vehicles)) L.push(...statblockMd(v));
  L.push('### SHIPS', '');
  for (const v of byLevel(ships)) L.push(...statblockMd(v));
  return L;
}

function renderShieldMechanics() {
  const L = ['# PART III — SHIELD MECHANICS', ''];
  L.push('*Mass Effect layers three depletable defences on top of Hit Points. The module applies them automatically whenever damage is dealt; this section documents the order and the rules governing each layer.*', '');
  L.push('---', '');

  L.push('## DAMAGE ROUTING', '');
  L.push('Incoming damage is consumed by each active layer in turn. A layer only passes the remainder on once it is fully depleted.', '');
  L.push('**Biotic Barrier → Kinetic Shield → Combat Armor Frame → Hit Points**', '');
  L.push('Tokens display a purple **Biotic Barrier** bar and a yellow **Armor Points** bar alongside the standard HP bar, so every layer is visible at a glance. Both can be disabled in module settings.', '');
  L.push('---', '');

  L.push('## KINETIC SHIELDS', '');
  L.push('### Capacity & Recharge', '');
  L.push('A kinetic shield provides **Shield HP** that absorbs damage before anything except a biotic barrier. The baseline *Kinetic Shield* carries **30 Shield HP** and recharges **10 HP per turn**. Shield HP Mods raise the maximum; Shield Regen Mods raise the recharge rate. Only one of each may be installed at a time.', '');
  L.push('Recharging pauses for **1 round** after the shield takes damage (configurable; Recharge Accelerator mods reduce the delay).', '');
  L.push('### Depletion & Taking Cover', '');
  L.push('When a shield is reduced to 0 it stays offline until its bearer **Takes Cover** — it will not recharge on its own. While a shield is down at the start of a turn the module posts a reminder in chat.', '');
  L.push('### Overload Collapse', '');
  L.push("A single hit dealing more than **50%** of the shield's maximum Shield HP overwhelms the emitter: the shield absorbs only that threshold amount and immediately **collapses to 0**, with the excess carrying through to the next layer. Large alpha strikes therefore punch through shields rather than being soaked by them.", '');
  L.push('---', '');

  L.push('## COMBAT ARMOR FRAMES', '');
  L.push('Combat frames sit between shields and Hit Points and provide **Armor Points**. Armor Points are **ablative**: they do *not* regenerate, and when the frame is fully depleted the item is destroyed and must be replaced.', '');
  L.push('| Frame | Armor Points |', '|---|---|');
  L.push('| Light Combat Frame | 20 |', '| Standard Combat Frame | 50 |', '| Heavy Combat Frame | 100 |', '| Titan Combat Frame | 200 |', '');
  L.push('---', '');

  L.push('## BIOTIC BARRIER', '');
  L.push('A biotic can raise a personal mass effect field as an action. Barrier HP is calculated at activation as **5 × ⌊level ÷ 2⌋** (minimum 5), and it absorbs damage *before* both shields and Hit Points.', '');
  L.push('A barrier does **not** recharge passively. Once depleted it must be reactivated, or refilled by spending actions or using Charge.', '');
  L.push('---', '');

  L.push('## AMMO POWERS VS. DEFENCES', '');
  L.push('*Ammo powers are the counterplay to the layered defences — each is tuned against a specific layer. All multipliers are configurable in module settings.*', '');
  L.push('| Ammo | Targets | Effect |', '|---|---|---|');
  L.push('| Disruptor Rounds | Kinetic Shields | Deal **2×** damage to shields |');
  L.push('| Warp Rounds | Biotic Barriers | Deal **1.5×** damage to barriers; depleting one triggers a dark-energy detonation |');
  L.push('| Incendiary Rounds | Combat Frames | Burn armor **1.5×** faster; critical hits add persistent fire (1d6) |');
  L.push('| Armor-Piercing Rounds | Combat Frames | **50%** of HP damage bypasses armor entirely |');
  L.push('| Phasic Rounds | Combat Frames | Bypass frames completely, but total damage is reduced to **60%** |');
  L.push('| Shredder Rounds | Hit Points | Most effective against targets with no shields, barriers or armor |');
  L.push('| Cryo Rounds | Hit Points | Apply the **Chilled** condition on direct HP damage |');
  L.push('');
  return L;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const lines = [];
  const classFeatSets = [];  // { name, feats } consumed by renderFeats

  // ── Load remaining packs ───────────────────────────────────────────────────
  const [ancestries, heritages, ancestryFeats, backgrounds,
         weapons, armors, weaponMods, armorMods, grenades, shields,
         creatures, vehicles, ships] = await Promise.all([
    loadDir('me-ancestries'), loadDir('me-heritages'), loadDir('me-ancestry-feats'),
    loadDir('me-backgrounds'), loadDir('me-weapons'), loadDir('me-armors'),
    loadDir('me-weapon-mods'), loadDir('me-armor-mods'), loadDir('me-grenades'),
    loadDir('me-shields'), loadDir('me-creatures'), loadDir('me-vehicles'), loadDir('me-ships'),
  ]);
  const npcFactions = await loadNpcsByFaction();


  lines.push('# Mass Effect Starfinder 2e Conversion');
  lines.push('');
  lines.push('*Action costs: ◆ = 1 action · ◆◆ = 2 actions · ◆◆◆ = 3 actions · ↺ = reaction · no symbol = passive*');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('# PART I — CHARACTER OPTIONS');
  lines.push('');
  lines.push('*Everything needed to build a character: ancestries and heritages, the six classes, backgrounds, the full feat catalogue, and equipment.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push(...renderAncestries(ancestries, heritages, ancestryFeats));

  lines.push('## CLASSES');
  lines.push('');
  lines.push('*The six Mass Effect classes. Each entry covers its class feature, advancement and mastery chain, plus an index of its feats — the feats themselves are catalogued under Feats.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  const packIndex = await indexPacks(SRC);
  const proficiencyFeatures = new Map();
  for (const cls of CLASSES) {
    const classFeat = await loadFeat(...cls.classFile);
    for (const g of summarizeClass(classFeat, packIndex).grants) {
      if (g.item._id.startsWith('meProf')) proficiencyFeatures.set(g.item._id, g.item);
    }

    // Load mastery chain
    const masteryFeats = [];
    for (const [pack, filename] of (cls.masteryChain ?? [])) {
      try {
        masteryFeats.push(await loadFeat(pack, filename));
      } catch (e) {
        console.warn(`  WARNING: could not load mastery feat ${pack}/${filename}: ${e.message}`);
      }
    }

    // Load class feats
    const feats = [];
    for (const [pack, filename] of cls.feats) {
      try {
        feats.push(await loadFeat(pack, filename));
      } catch (e) {
        console.warn(`  WARNING: could not load ${pack}/${filename}: ${e.message}`);
      }
    }

    feats.sort((a, b) => {
      const d = a.system.level.value - b.system.level.value;
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });

    const info = summarizeClass(classFeat, packIndex);
    lines.push(`### ${cls.name}`);
    lines.push('');
    lines.push(htmlToMd(`<p>${info.flavor}</p>`));
    lines.push('');
    lines.push(`**Key Attribute:** ${info.keyAttributes.join(' or ')}`);
    lines.push('');
    lines.push(`**Hit Points:** ${info.hp} plus your Constitution modifier per level`);
    lines.push('');
    for (const m of info.mechanics) lines.push(htmlToMd(m), '');
    lines.push('#### Initial Proficiencies');
    lines.push('');
    for (const { group, items } of info.proficiencies) lines.push(`- **${group}:** ${items.join('; ')}`);
    lines.push('');
    lines.push('#### Advancement');
    lines.push('');
    lines.push('| Level | Class Features |');
    lines.push('|---|---|');
    for (let lvl = 1; lvl <= 20; lvl++) {
      const parts = info.grants.filter(g => g.level === lvl).map(g => g.name);
      if (info.classFeatLevels.has(lvl)) parts.push('Class Feat');
      parts.push(...(info.standard[lvl] ?? []));
      lines.push(`| ${lvl} | ${parts.join(', ')} |`);
    }
    lines.push('');
    if (info.signatureFeature) {
      lines.push(renderFeat(info.signatureFeature));
      lines.push('');
    }
    lines.push('---');
    lines.push('');

    if (masteryFeats.length) {
      lines.push('#### Class Mastery');
      lines.push('');
      lines.push('*These features are automatically granted at the indicated levels.*');
      lines.push('');
      for (const feat of masteryFeats) {
        lines.push(renderFeat(feat));
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    // Full feat text lives under Feats; the class carries a level index.
    const nonProgression = feats.filter(f => !(f.system?.traits?.value ?? []).includes('progression'));
    classFeatSets.push({ name: cls.name, feats: nonProgression });
    if (nonProgression.length) {
      lines.push('#### Class Feats');
      lines.push('');
      lines.push(`*${titleCase(cls.name)} feats are listed in full under **Feats -> Class Feats -> ${titleCase(cls.name)}**. Class feats are available at levels 1, 2, 4, 6, 8, 10, 12, 14, 16, 18 and 20.*`);
      lines.push('');
      lines.push('| Level | Feats |');
      lines.push('|---|---|');
      const byLvl = new Map();
      for (const f of nonProgression) {
        const l = f.system.level.value;
        if (!byLvl.has(l)) byLvl.set(l, []);
        byLvl.get(l).push(f.name);
      }
      for (const l of [...byLvl.keys()].sort((a, b) => a - b)) {
        lines.push(`| ${l} | ${byLvl.get(l).sort().join(', ')} |`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  if (proficiencyFeatures.size) {
    lines.push('### CLASS PROFICIENCY FEATURES');
    lines.push('');
    lines.push('*Shared by the classes that list them in their Advancement table. Each class\'s own DC features (such as Adept Expertise, Master Adept and Legendary Adept) raise that class DC to expert, master and legendary; every power uses your class DC.*');
    lines.push('');
    for (const f of [...proficiencyFeatures.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`**${f.name}** ${htmlToMd(f.system.description.value)}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  const generalFeats = [];
  for (const [pack, filename] of GENERAL_FEATS) {
    try {
      generalFeats.push(await loadFeat(pack, filename));
    } catch (e) {
      console.warn(`  WARNING: could not load general feat ${pack}/${filename}: ${e.message}`);
    }
  }
  generalFeats.sort((a, b) => {
    const d = a.system.level.value - b.system.level.value;
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });

  lines.push(...renderBackgrounds(backgrounds));
  lines.push(...renderFeats(classFeatSets, ancestryFeats, ancestries, generalFeats));
  lines.push(...renderEquipment(weapons, armors, weaponMods, armorMods, grenades, shields));
  lines.push(...renderBestiary(npcFactions, creatures, vehicles, ships));
  lines.push(...renderShieldMechanics());

  const output = lines.join('\n');
  await mkdir('docs', { recursive: true });
  await writeFile('docs/mass-effect-starfinder-2e-conversion.md', output, 'utf8');
  console.log(`✓ Wrote docs/mass-effect-starfinder-2e-conversion.md (${output.length.toLocaleString()} chars)`);
  console.log(`  ancestries ${ancestries.length} · heritages ${heritages.length} · backgrounds ${backgrounds.length}`);
  console.log(`  weapons ${weapons.length} · armors ${armors.length} · mods ${weaponMods.length + armorMods.length} · grenades ${grenades.length}`);
  console.log(`  NPCs ${npcFactions.reduce((n, f) => n + f.npcs.length, 0)} across ${npcFactions.length} factions`);
}

main().catch(err => { console.error(err); process.exit(1); });
