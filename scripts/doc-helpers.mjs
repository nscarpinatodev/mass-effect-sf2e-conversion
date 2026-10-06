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

  // Standard PF2e advancement, from the class item's own schedules
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
    signatureFeature: grants.find((g) => g.level === 1 && g.item._id.startsWith('meClass'))?.item ?? null,
  };
}
