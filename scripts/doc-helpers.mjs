// Shared by generate-class-docs.mjs and generate-class-html.mjs so the Markdown
// and HTML builds read classes, and flatten Foundry enrichers, the same way.

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const MODULE_ID = 'mass-effect-sf2e-conversion';

// ── Foundry enrichers → plain text ───────────────────────────────────────────
// @Check, @Damage, @Template and inline rolls are buttons in Foundry; in a
// printed document they are just the numbers.

const SAVE_LABELS = { fortitude: 'Fortitude', reflex: 'Reflex', will: 'Will' };

/** Read a bracketed argument starting at `open`, honouring nested brackets. */
function readBalanced(text, open, left, right) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === left) depth++;
    else if (text[i] === right && --depth === 0) return { inner: text.slice(open + 1, i), end: i + 1 };
  }
  return null;
}

function readLabel(text, at) {
  if (text[at] !== '{') return { label: null, end: at };
  const r = readBalanced(text, at, '{', '}');
  return r ? { label: r.inner, end: r.end } : { label: null, end: at };
}

function params(inner) {
  const [first, ...rest] = inner.split('|');
  const out = { first, flags: new Set() };
  for (const p of rest) {
    const i = p.indexOf(':');
    if (i < 0) out.flags.add(p);
    else out[p.slice(0, i)] = p.slice(i + 1);
  }
  return out;
}

function damageText(formula) {
  let f = formula.trim();
  if (f.startsWith('{') && f.endsWith('}')) f = f.slice(1, -1);
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i <= f.length; i++) {
    const c = f[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if ((c === ',' || c === undefined) && depth === 0) { parts.push(f.slice(start, i)); start = i + 1; }
  }
  return parts.map((p) => {
    const m = p.trim().match(/^(.*)\[([^\]]+)\]$/);
    if (!m) return p.trim();
    let dice = m[1].trim();
    if (dice.startsWith('(') && dice.endsWith(')')) dice = dice.slice(1, -1);
    return `${dice} ${m[2].split(',').join(' ')}`;
  }).join(' plus ');
}

const ENRICHERS = {
  Check(inner) {
    const p = params(inner);
    const save = SAVE_LABELS[p.first] ?? p.first.replace(/^\w/, (c) => c.toUpperCase());
    const basic = p.flags.has('basic') ? 'basic ' : '';
    return p.dc && !p.dc.startsWith('resolve') ? `DC ${p.dc} ${basic}${save}` : `${basic}${save}`;
  },
  Damage(inner) { return damageText(inner); },
  Template(inner) {
    const p = params(inner);
    const type = p.type ?? p.first;
    return p.distance ? `${p.distance}-foot ${type}` : type;
  },
  UUID(inner) { return inner.split('.').pop(); },
};

/**
 * Work out level-scaled formulas for one actor, so a printed statblock shows numbers: the NPC Biotics use
 * `@actor.system.details.level.value` in their save DCs (resolve(...)) and damage dice ((expr)dN).
 */
export function bakeLevel(html, level) {
  if (!html) return html;
  const evaluate = (expr) => {
    if (!/^[\d+\-*/(). floor]+$/.test(expr)) return null;
    try { return Function('floor', `return (${expr});`)(Math.floor); } catch { return null; }
  };
  return html
    .replaceAll('@actor.system.details.level.value', String(level))
    .replace(/resolve\(([^|\]]+?)\)(?=[|\]])/g, (m, e) => { const v = evaluate(e); return v == null ? m : String(v); })
    .replace(/\(([\d+\-*/(). floor]+)\)d(\d+)/g, (m, e, die) => { const v = evaluate(e); return v == null ? m : `${v}d${die}`; });
}

export function flattenEnrichers(html) {
  if (!html) return html;
  let out = '';
  let i = 0;
  while (i < html.length) {
    const tag = html.slice(i).match(/^@(Check|Damage|Template|UUID)\[/);
    if (tag) {
      const r = readBalanced(html, i + tag[0].length - 1, '[', ']');
      if (r) {
        const { label, end } = readLabel(html, r.end);
        out += label ?? ENRICHERS[tag[1]](r.inner);
        i = end;
        continue;
      }
    }
    if (html.startsWith('[[/', i)) {
      // [[/r 2d6[electricity]]] nests, so balance the brackets
      const r = readBalanced(html, i, '[', ']');
      if (r) {
        const body = r.inner.slice(2, -1).replace(/^\w+\s+/, '');   // drop "[/", "]" and r/br/gmr
        const { label, end } = readLabel(html, r.end);
        out += label ?? damageText(body.split('#')[0].trim());
        i = end;
        continue;
      }
    }
    out += html[i++];
  }
  return out;
}

// ── Pack index ───────────────────────────────────────────────────────────────

/** Map every "<pack>.Item.<id>" in src/packs to its document. */
export async function indexPacks(srcDir) {
  const index = new Map();
  for (const pack of await readdir(srcDir)) {
    let files;
    try { files = await readdir(join(srcDir, pack)); } catch { continue; }
    for (const f of files.filter((f) => f.endsWith('.json') && !f.startsWith('_folder'))) {
      const doc = JSON.parse(await readFile(join(srcDir, pack, f), 'utf8'));
      if (doc._id) index.set(`${pack}.Item.${doc._id}`, doc);
    }
  }
  return index;
}

export function resolveUuid(index, uuid) {
  return index.get(uuid.replace(`Compendium.${MODULE_ID}.`, '')) ?? null;
}

// ── Classes and their feats ──────────────────────────────────────────────────
// One copy of what belongs to each class, read from the packs, so the Markdown
// and HTML builds cannot drift from each other or from the content.

/** Display order of the six classes. */
export const CLASS_ORDER = ['soldier', 'engineer', 'adept', 'vanguard', 'infiltrator', 'sentinel'];

/** The packs that hold class feats. */
const CLASS_FEAT_PACKS = ['me-combat-passives', 'me-biotic-powers', 'me-tech-powers', 'me-ammo-powers', 'me-class-progressions'];

/**
 * Class feats printed once, under General & Skill Feats, rather than under every class that can
 * take them. This list is the only hand-kept one: every other class feat is filed under each
 * class named in its traits.
 */
export const SHARED_FEATS = [
  // Biotic powers
  ['me-biotic-powers', 'lift-feat.json'],
  ['me-biotic-powers', 'lash-feat.json'],
  ['me-biotic-powers', 'slam-feat.json'],
  ['me-biotic-powers', 'reave-feat.json'],
  ['me-biotic-powers', 'stasis-feat.json'],
  ['me-biotic-powers', 'dark-channel-feat.json'],
  ['me-biotic-powers', 'dominate-feat.json'],
  ['me-biotic-powers', 'flare-feat.json'],
  ['me-biotic-powers', 'unity-feat.json'],
  ['me-biotic-powers', 'unity-improved-feat.json'],
  ['me-biotic-powers', 'unity-superior-feat.json'],
  // Tech powers
  ['me-tech-powers', 'damping-feat.json'],
  ['me-tech-powers', 'neural-shock-feat.json'],
  ['me-tech-powers', 'geth-shield-boost-feat.json'],
  ['me-tech-powers', 'decoy-feat.json'],
  ['me-tech-powers', 'ai-hacking-feat.json'],
  ['me-tech-powers', 'energy-drain-feat.json'],
  ['me-tech-powers', 'defense-drone-feat.json'],
  ['me-tech-powers', 'defense-matrix-feat.json'],
  // Ammo powers
  ['me-ammo-powers', 'armor-piercing-feat.json'],
  ['me-ammo-powers', 'phasic-feat.json'],
  ['me-ammo-powers', 'shredder-feat.json'],
  ['me-ammo-powers', 'warp-feat.json'],
  // Combat passives
  ['me-combat-passives', 'fortification.json'],
  ['me-combat-passives', 'fortification-improved.json'],
  ['me-combat-passives', 'fortification-master.json'],
];

const byLevelThenName = (a, b) => (a.system.level.value - b.system.level.value) || a.name.localeCompare(b.name);

/**
 * Every class with its class item and feats, read from the packs.
 *   classes[] — { name: 'SOLDIER', slug, item, feats: the class's own feats, shared: SHARED_FEATS it can take }
 *   shared[]  — { pack, feat } for each SHARED_FEATS entry, in list order
 * A class feat that names none of the six classes in its traits is reported: no class would list it.
 */
export async function loadClassContent(srcDir) {
  const sharedKeys = new Set(SHARED_FEATS.map(([pack, file]) => `${pack}/${file}`));
  const own = [];
  const shared = [];
  for (const pack of CLASS_FEAT_PACKS) {
    for (const file of (await readdir(join(srcDir, pack))).filter((f) => f.endsWith('.json') && !f.startsWith('_folder')).sort()) {
      const feat = JSON.parse(await readFile(join(srcDir, pack, file), 'utf8'));
      if (feat.type !== 'feat' || feat.system?.category !== 'class') continue;
      if (sharedKeys.delete(`${pack}/${file}`)) { shared.push({ pack, file, feat }); continue; }
      own.push(feat);
      if (!(feat.system.traits?.value ?? []).some((t) => CLASS_ORDER.includes(t))) {
        console.warn(`  WARNING: class feat ${pack}/${file} (${feat.name}) names no class in its traits, so no class lists it`);
      }
    }
  }
  for (const key of sharedKeys) console.warn(`  WARNING: shared feat ${key} is not a class feat in the packs`);
  shared.sort((a, b) => SHARED_FEATS.findIndex(([p, f]) => p === a.pack && f === a.file) - SHARED_FEATS.findIndex(([p, f]) => p === b.pack && f === b.file));

  const classes = [];
  for (const slug of CLASS_ORDER) {
    const item = JSON.parse(await readFile(join(srcDir, 'me-classes', `${slug}.json`), 'utf8'));
    const has = (feat) => (feat.system.traits?.value ?? []).includes(slug);
    classes.push({
      name: slug.toUpperCase(),
      slug,
      item,
      feats: own.filter(has).sort(byLevelThenName),
      shared: shared.map((s) => s.feat).filter(has).sort(byLevelThenName),
    });
  }
  return { classes, shared };
}

/**
 * The proficiency features the classes share (Weapon Expertise, Reflex Mastery and so on), each with
 * the classes that gain it and the level they gain it at.
 */
export function sharedProficiencyFeatures(summaries) {
  const out = new Map();
  for (const info of summaries) {
    for (const g of info.grants) {
      if (!g.item._id.startsWith('meProf')) continue;
      if (!out.has(g.item._id)) out.set(g.item._id, { item: g.item, classes: [] });
      out.get(g.item._id).classes.push({ name: info.name, level: g.level });
    }
  }
  return [...out.values()].sort((a, b) => a.item.name.localeCompare(b.item.name));
}

/** "1, 2, 4 and 6" */
export function listLevels(levels) {
  const l = [...levels].sort((a, b) => a - b);
  return l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} and ${l.at(-1)}`;
}

/** Ordinal for a level: 1st, 2nd, 3rd, 11th. */
export function ordinalLevel(n) {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${tail}`;
}

// ── Gear read from the packs ─────────────────────────────────────────────────

const flagsOf = (item) => item.flags?.[MODULE_ID] ?? {};

/** Kinetic shield hardware: what each item does, from its flags. */
export function shieldEffect(item, base) {
  const f = flagsOf(item);
  if (f.shieldMax) return `${f.shieldMax} Shield HP; recharges ${f.shieldRegen} HP/turn`;
  if (f.shieldHpBonus) return `+${f.shieldHpBonus} max Shield HP (${base.shieldMax} → ${base.shieldMax + f.shieldHpBonus})`;
  if (f.regenMult) return `Recharge rate ${base.shieldRegen} → ${Math.round(base.shieldRegen * f.regenMult)} HP/turn`;
  return null;
}

/** The baseline kinetic shield's numbers, for the rules text. */
export function baseShield(shields) {
  const f = flagsOf(shields.find((s) => flagsOf(s).shieldMax) ?? {});
  return { shieldMax: f.shieldMax ?? 0, shieldRegen: f.shieldRegen ?? 0 };
}

/** Combat frames with their Armor Points, weakest first. */
export function combatFrames(shields) {
  return shields.filter((s) => flagsOf(s).armorMax)
    .map((s) => ({ name: s.name, armor: flagsOf(s).armorMax }))
    .sort((a, b) => a.armor - b.armor);
}

/** Boosts as printed: a slot offering every attribute is a free boost; several read "Two Free". */
export function boostLabels(boosts, label = (k) => ATTRIBUTES[k] ?? k) {
  const fixed = []; let free = 0;
  for (const v of Object.values(boosts ?? {})) {
    const vals = v?.value ?? [];
    if (vals.length >= 6) free += 1;
    else if (vals.length === 1) fixed.push(label(vals[0]));
    else if (vals.length > 1) fixed.push(vals.map(label).join(' or '));
  }
  const NUM = ['', 'Free', 'Two Free', 'Three Free', 'Four Free'];
  return free ? [...fixed, NUM[free] ?? `${free} Free`] : fixed;
}

/** Weapon traits the equipment section explains, in the order printed. Checked against the weapons pack. */
export const WEAPON_TRAIT_KEY = [
  ['agile', 'agile', 'The multiple attack penalty with this weapon is −4 and −8 instead of −5 and −10.', 'MAP −4/−8'],
  ['automatic', 'automatic', 'Can fire a burst; all targets in a 10-ft cone make Reflex saves instead of individual attack rolls.', 'Burst: cone Reflex save'],
  ['burst-fire', 'burst-fire', 'Makes 3 attacks as a 2-action activity; all share the same roll, each deals half damage.', '3 attacks ◆◆, half damage each'],
  ['deadly', 'deadly-dX', 'On a critical hit, add one die of size dX to the damage after doubling.', 'Crit: +1 dX'],
  ['fatal', 'fatal-dX', 'On a critical hit, the damage die increases to dX and you roll one additional die.', 'Crit: die→dX +1'],
  ['kickback', 'kickback', '−2 to attack rolls unless you have both hands on the weapon or brace against a surface.', '−2 attack unless braced'],
  ['scatter', 'scatter-X', 'All creatures within X feet of the primary target also take splash damage equal to the damage dice result.', 'Splash within X ft'],
  ['unwieldy', 'unwieldy', 'Cannot be used for more than one Strike per turn.', '1 Strike/turn'],
  ['volley', 'volley-X', '−2 to attack rolls against targets within X feet of you.', '−2 within X ft'],
];

/** The trait key rows for the traits these weapons really carry; warns about a trait with no entry. */
export function weaponTraitKey(weapons) {
  const used = new Set(weapons.flatMap((w) => w.system.traits?.value ?? []).map((t) => t.replace(/-d?\d+$/, '')));
  for (const t of used) {
    if (t !== 'tech' && !WEAPON_TRAIT_KEY.some(([base]) => base === t)) console.warn(`  WARNING: weapon trait "${t}" has no entry in the trait key`);
  }
  return WEAPON_TRAIT_KEY.filter(([base]) => used.has(base));
}

/** Weapons whose printed damage is a single die: they follow the standard grade progression. */
export function oneDieWeapons(weapons) {
  return weapons.filter((w) => w.system.damage?.dice === 1)
    .sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))
    .map((w) => w.name);
}

// ── Class summary ────────────────────────────────────────────────────────────

const ATTRIBUTES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
const RANKS = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'];
const SKILLS = {
  acrobatics: 'Acrobatics', arcana: 'Arcana', athletics: 'Athletics', crafting: 'Crafting', deception: 'Deception',
  diplomacy: 'Diplomacy', intimidation: 'Intimidation', medicine: 'Medicine', nature: 'Nature', occultism: 'Occultism',
  performance: 'Performance', religion: 'Religion', society: 'Society', stealth: 'Stealth', survival: 'Survival',
  thievery: 'Thievery',
};
const BOOST_LEVELS = [5, 10, 15, 20];

function list(words) {
  return words.length < 3 ? words.join(' and ') : `${words.slice(0, -1).join(', ')}, and ${words.at(-1)}`;
}

/** Everything the docs print about a class, read from its class item. */
export function summarizeClass(classItem, index) {
  const s = classItem.system;
  const html = s.description.value;
  const flavor = (html.match(/<p>([\s\S]*?)<\/p>/) ?? [, ''])[1];
  const lastHr = html.search(/<hr\s*\/?>(?![\s\S]*<hr\s*\/?>)/i);
  const mechanics = lastHr >= 0 ? [...html.slice(lastHr).matchAll(/<p>[\s\S]*?<\/p>/g)].map((m) => m[0]) : [];

  // Proficiencies, worded as in the class item
  const byRank = (obj, keys) => {
    const groups = new Map();
    for (const k of keys) if (obj[k] > 0) groups.set(obj[k], [...(groups.get(obj[k]) ?? []), k]);
    return groups;
  };
  const saves = Object.entries(s.savingThrows).map(([k, r]) => `${RANKS[r]} in ${k[0].toUpperCase()}${k.slice(1)}`);
  const attacks = [];
  for (const [rank, cats] of byRank(s.attacks, ['simple', 'martial', 'advanced'])) {
    attacks.push(`${RANKS[rank]} in ${list(cats)} weapons`);
  }
  for (const rule of s.rules ?? []) {
    if (rule.key === 'MartialProficiency') attacks.push(`Trained in martial ${rule.label.toLowerCase()}`);
  }
  if (s.attacks.unarmed > 0) attacks.push(`${RANKS[s.attacks.unarmed]} in unarmed attacks`);
  const armor = ['light', 'medium', 'heavy'].filter((k) => s.defenses[k] > 0);
  const skills = s.trainedSkills.value.map((k) => SKILLS[k] ?? k);

  const proficiencies = [
    { group: 'Perception', items: [`${RANKS[s.perception]} in Perception`] },
    { group: 'Saving Throws', items: saves },
    { group: 'Skills', items: [
      ...(skills.length ? [`Trained in ${list(skills)}`] : []),
      `Trained in a number of additional skills equal to ${s.trainedSkills.additional} plus your Intelligence modifier`,
    ] },
    { group: 'Attacks', items: attacks },
    { group: 'Defenses', items: [`Trained in ${list([...armor.map((a) => `${a} armor`), 'unarmored defense'])}`] },
    { group: 'Class DC', items: [`Trained in ${classItem.name} class DC`] },
  ];

  const grants = Object.values(s.items)
    .map((e) => ({ level: e.level, name: e.name, item: resolveUuid(index, e.uuid) }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const missing = grants.filter((g) => !g.item);
  if (missing.length) throw new Error(`${classItem.name}: unresolved grants ${missing.map((g) => g.name).join(', ')}`);

  // The class's 1st-level signature feature prints with the class header; the proficiency features
  // several classes share print once for all of them. Every other granted feature prints in full
  // under the class, so a feature added to a class item reaches the docs with no list to update.
  const signatureFeature = grants.find((g) => g.level === 1 && g.item._id.startsWith('meClass'))?.item ?? null;
  const features = grants.map((g) => g.item)
    .filter((item) => item !== signatureFeature && !item._id.startsWith('meProf'));

  // Standard advancement, from the class item's own schedules
  const standard = {};
  const add = (levels, label) => { for (const l of levels) (standard[l] ??= []).push(label); };
  add([1], 'Initial Proficiencies');
  add(s.ancestryFeatLevels.value, 'Ancestry Feat');
  add(s.skillFeatLevels.value, 'Skill Feat');
  add(s.generalFeatLevels.value, 'General Feat');
  add(s.skillIncreaseLevels.value, 'Skill Increase');
  add(BOOST_LEVELS, 'Attribute Boosts');

  return {
    name: classItem.name,
    slug: s.slug,
    hp: s.hp,
    keyAttributes: s.keyAbility.value.map((k) => ATTRIBUTES[k] ?? k),
    flavor,
    mechanics,
    proficiencies,
    grants,
    classFeatLevels: new Set(s.classFeatLevels.value),
    standard,
    /** The 1st-level feature that carries the class's signature bonus. */
    signatureFeature,
    /** Granted features printed in full under the class, by level then name. */
    features,
  };
}
