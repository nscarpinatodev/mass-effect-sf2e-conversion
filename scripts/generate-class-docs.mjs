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
import {
  bakeLevel, flattenEnrichers, indexPacks, summarizeClass, loadClassContent, sharedProficiencyFeatures, ordinalLevel, listLevels,
  shieldEffect, baseShield, combatFrames, boostLabels, weaponTraitKey, oneDieWeapons,
} from './doc-helpers.mjs';

const SRC = 'src/packs';

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

// A table in a description becomes a Markdown table: its first row is the header.
function tableToMd(table) {
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map(r => [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(c => c[1].replace(/<[^>]+>/g, '').trim()));
  if (!rows.length) return '';
  const line = cells => `| ${cells.join(' | ')} |`;
  return `\n\n${[line(rows[0]), line(rows[0].map(() => '---')), ...rows.slice(1).map(line)].join('\n')}\n\n`;
}

function htmlToMd(html) {
  return flattenEnrichers(html)
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (_, table) => tableToMd(table))
    .replace(/<h\d[^>]*>([\s\S]*?)<\/h\d>/g, '\n**$1**\n')
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

const ancestryBoosts = obj => boostLabels(obj);
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
  // A feat open to two ancestries (Biotic Adept: asari and human) prints under both.
  const featsBySlug = new Map();
  for (const f of ancestryFeats) {
    if (specialNames.has(f.name)) continue;
    for (const t of (f.system?.traits?.value ?? []).filter(x => ancestries.some(a => slugOf(a) === x))) {
      if (!featsBySlug.has(t)) featsBySlug.set(t, []);
      featsBySlug.get(t).push(f);
    }
  }

  const L = ['## ANCESTRIES', ''];
  L.push('*Your ancestry sets your starting Hit Points, size, Speed, attribute boosts and flaw, languages, and any special senses or biology. Choose one heritage at 1st level, then an ancestry feat at 1st level and every four levels thereafter (5th, 9th, 13th and 17th). Each species has its own section below, carrying its heritages and its full ancestry feat list.*', '');
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
      L.push('*Take one of these at 1st, 5th, 9th, 13th and 17th level, provided you meet its level requirement.*', '');
      for (const f of feats) L.push(renderFeat(f).replace(/^#### /, '##### '), '');
    }

    L.push('---', '');
  }

  return L;
}

function renderBackgrounds(backgrounds) {
  const L = ['## BACKGROUNDS', ''];
  L.push('*Choose one background during character creation. Each background grants two attribute boosts (one from the pair listed, one free), skill training, a Lore skill, and one 1st-level skill feat.*', '');
  L.push('| Background | Attribute Boosts | Skill | Lore | Skill Feat | Description |', '|---|---|---|---|---|---|');
  for (const b of [...backgrounds].sort((x, y) => x.name.localeCompare(y.name))) {
    const s = b.system;
    const boosts = boostLabels(s.boosts).join(', ') || '—';
    const skills = (s.trainedSkills?.value ?? []).map(k => SKILL_LABELS[k] ?? titleCase(k)).join(', ') || '—';
    const lore   = (s.trainedSkills?.lore ?? []).join(', ') || s.trainedLore || '—';
    const feat   = Object.values(s.items ?? {}).map(i => i.name).join(', ') || '—';
    const desc   = firstPara(s.description?.value) || plain(s.description?.value, 110);
    L.push(`| ${b.name} | ${boosts} | ${skills} | ${lore} | ${feat} | ${desc} |`);
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

// Mods and field gear print in full, like grenades: a table could only carry a clipped first sentence.
function itemEntriesMd(list, heading, intro) {
  const L = [`### ${heading}`, ''];
  if (intro) L.push(intro, '', '---', '');
  for (const m of [...list].sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))) {
    const s = m.system;
    const rarity = s.traits?.rarity && s.traits.rarity !== 'common' ? ` · ${titleCase(s.traits.rarity)}` : '';
    L.push(`#### ${m.name} — Level ${s.level?.value ?? '?'} · ${credits(s)}${rarity}`, '');
    L.push(htmlToMd(s.description?.value ?? ''), '');
    L.push('---', '');
  }
  return L;
}

/** A bio-amp's ratings, read from its rule elements. */
function ampStats(item) {
  const rules = item.system.rules ?? [];
  const flag = (name) => rules.find((r) => r.key === 'ActiveEffectLike' && r.path?.endsWith(`.${name}`))?.value ?? 0;
  return {
    recharge: flag('bioticRecharge'),
    damage: flag('ampDamageBonus'),
    dc: rules.find((r) => r.key === 'FlatModifier' && r.selector === 'class')?.value ?? 0,
    barrier: flag('barrierBonus'),
  };
}

function renderEquipment(weapons, armors, weaponMods, armorMods, grenades, shields, amps = [], fieldGear = []) {
  const byGroup = { pistol: [], rifle: [], shotgun: [], sniper: [], bomb: [] };
  for (const w of weapons) (byGroup[w.system.group] ?? byGroup.pistol).push(w);

  const L = ['## EQUIPMENT', '', '### Weapons', ''];
  L.push('*All Mass Effect weapons carry the **tech** trait. Action cost to Strike is ◆ unless noted. Damage type: P = piercing, B = bludgeoning, S = slashing, E = electricity.*', '');
  L.push('**Trait Key**');
  for (const [, label, text] of weaponTraitKey(weapons)) L.push(`- **${label}** — ${text}`);
  L.push('');
  L.push('**Weapon Grades**', '');
  L.push('Every weapon can be upgraded through Starfinder\'s grades. A grade\'s cost is added to the weapon\'s own price: tactical 350 credits, advanced 1,000, superior 10,000, elite 20,000, ultimate 100,000, paragon 400,000. Upgrading costs the difference between the two grades.', '');
  L.push('- **Attack rolls:** +1 tracking at tactical grade, +2 at superior, +3 at ultimate.');
  L.push('- **Damage:** the damage listed below is what a weapon rolls up to superior grade. It rolls one more damage die at elite grade and a second at paragon.');
  L.push(`- **One-die weapons** (${oneDieWeapons(weapons).join(', ')}) follow the standard progression instead: two dice at advanced grade, three at elite, four at paragon.`, '');
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

  const base = baseShield(shields);
  L.push('### Kinetic Shields & Combat Frames', '');
  L.push('Kinetic shields are worn equipment that provide Shield HP — temporary protection that regenerates at the start of each turn. Combat frames absorb damage after shields, before actual HP.', '');
  L.push('| Item | Level | Credits | Effect |', '|---|---|---|---|');
  for (const s of shields.filter(x => shieldEffect(x, base))
    .sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))) {
    L.push(`| ${s.name.replace(' - ', ' — ')} | ${s.system.level?.value ?? '?'} | ${credits(s.system)} | ${shieldEffect(s, base)} |`);
  }
  L.push('', '*Only one HP Mod and one Regen Mod can be installed at a time.*', '');
  L.push('#### Combat Frames', '');
  L.push('| Frame | Armor Points |', '|---|---|');
  for (const f of combatFrames(shields)) L.push(`| ${f.name} | ${f.armor} |`);
  L.push('');
  L.push('#### Biotic Barrier', '');
  L.push(BARRIER_SUMMARY, '');

  L.push('### Bio-Amps', '');
  L.push('A bio-amp plugs into a biotic\'s implant. Biotic powers cool down for **4 rounds, less the Recharge of the amp you wear** (minimum 1); powers with a fixed cooldown of their own, such as Biotic Charge, keep it. A 1-round cooldown goes only to the first biotic power used each turn (Nova apart): any others that turn take 2 rounds. Power adds an item bonus to biotic power damage and class DC, and Hit Points to the Biotic Barrier. Amps don\'t stack: wearing more than one gives only the highest of each bonus.', '');
  L.push('| Amp | Level | Credits | Recharge | Cooldown | Power |', '|---|---|---|---|---|---|');
  for (const a of amps) {
    const s = ampStats(a);
    const power = [s.damage && `+${s.damage} damage`, s.dc && `+${s.dc} class DC`, s.barrier && `+${s.barrier} barrier HP`].filter(Boolean).join(', ') || '—';
    const rarity = a.system.traits?.rarity && a.system.traits.rarity !== 'common' ? ` *(${a.system.traits.rarity})*` : '';
    L.push(`| ${a.name}${rarity} | ${a.system.level?.value ?? '?'} | ${credits(a.system)} | −${s.recharge} | ${s.recharge >= 3 ? '1 round (first power each turn), then 2' : `${4 - s.recharge} rounds`} | ${power} |`);
  }
  L.push('');

  L.push(...itemEntriesMd(weaponMods, 'Weapon Modifications', 'Weapon mods install into a single weapon and provide passive or triggered bonuses. Most weapons accept one mod.'));
  L.push(...itemEntriesMd(armorMods, 'Armor Modifications', 'Armor mods install into a single suit of armor. Most armors accept one mod.'));
  L.push(...itemEntriesMd(fieldGear, 'Medi-Gel & Omni-Gel', 'Field consumables, and the dispenser upgrades that raise what a dose of medi-gel heals.'));

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
  L.push('*Class feats by class, an index of racial (ancestry) feats, and the powers and feats several classes share.*', '');
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
    for (const anc of ancestries.filter(a => traits.includes(a.system?.slug ?? a.name.toLowerCase()))) {
      if (!byAnc.has(anc)) byAnc.set(anc, []);
      byAnc.get(anc).push(f);
    }
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
  L.push('*Powers and feats shared by two or more classes. Each class\'s feat table lists the ones it can take.*', '');
  L.push('**Power Scaling.** A power\'s entry prints its dice at 1st level. All of a biotic power\'s, tech power\'s or grenade feat\'s dice are **doubled at 4th level, tripled at 8th, and multiplied by 4 at 12th, by 5 at 16th and by 6 at 20th**: Warp\'s 2d6 on a failed save is 6d6 at 8th level and 12d6 at 20th. This covers persistent damage and any healing dice. Powers gained at higher levels print the dice for the level you gain them. Biotic Charge and Nova use their own formulas, grenade items keep their printed dice, and flat bonuses from gear and feats are added once. NPC powers follow the same rule.', '');
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
    let body = bakeLevel(ab.system?.description?.value ?? '', s.details.level.value);
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

const BARRIER_SUMMARY = 'A biotic raises a personal mass effect barrier with **Activate Biotic Barrier** (◆◆). **HP = 5 × ⌈level ÷ 2⌉**, calculated at activation, plus a worn bio-amp\'s barrier bonus. It absorbs damage before shields and Hit Points and does not recharge on its own: at 0 HP it stays up as an empty field until it is reactivated at full strength or refilled by an ability such as Biotic Charge.';

function renderShieldMechanics(shields) {
  const base = baseShield(shields);
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
  L.push(`A kinetic shield provides **Shield HP** that absorbs damage before anything except a biotic barrier. The baseline *Kinetic Shield* carries **${base.shieldMax} Shield HP** and recharges **${base.shieldRegen} HP per turn**. Shield HP Mods raise the maximum; Shield Regen Mods raise the recharge rate. Only one of each may be installed at a time.`, '');
  L.push('Recharging pauses for **1 round** after the shield takes damage (configurable; Recharge Accelerator mods reduce the delay).', '');
  L.push('### Depletion & Taking Cover', '');
  L.push('When a shield is reduced to 0 it stays offline until its bearer **Takes Cover** — it will not recharge on its own. While a shield is down at the start of a turn the module posts a reminder in chat.', '');
  L.push('### Overload Collapse', '');
  L.push("A single hit dealing more than **50%** of the shield's maximum Shield HP overwhelms the emitter: the shield absorbs only that threshold amount and immediately **collapses to 0**, with the excess carrying through to the next layer. Large alpha strikes therefore punch through shields rather than being soaked by them.", '');
  L.push('---', '');

  L.push('## COMBAT ARMOR FRAMES', '');
  L.push('Combat frames sit between shields and Hit Points and provide **Armor Points**. Armor Points are **ablative**: they do *not* regenerate, and when the frame is fully depleted the item is destroyed and must be replaced.', '');
  L.push('| Frame | Armor Points |', '|---|---|');
  for (const f of combatFrames(shields)) L.push(`| ${f.name} | ${f.armor} |`);
  L.push('');
  L.push('---', '');

  L.push('## BIOTIC BARRIER', '');
  L.push('A biotic raises a personal mass effect field with **Activate Biotic Barrier** (◆◆). Barrier HP is calculated at activation as **5 × ⌈level ÷ 2⌉** plus any bio-amp barrier bonus, and it absorbs damage *before* both shields and Hit Points.', '');
  L.push('A barrier does **not** recharge passively, and it is never lost: at 0 HP it stays up as an empty field. Reactivating it replaces whatever is left with a fresh full barrier, and some abilities refill it without a reactivation: Biotic Charge restores half of it, or all of it when the target critically fails its save.', '');
  L.push('---', '');

  L.push('## AMMO POWERS VS. DEFENCES', '');
  L.push('*Ammo powers are the counterplay to the layered defences — each is tuned against a specific layer. They change what a gun fires, so they apply to ranged Strikes only: a melee Strike gets nothing from them. The numbers below are the module\'s default settings, and each can be changed in module settings.*', '');
  L.push('| Ammo | Targets | Effect |', '|---|---|---|');
  L.push('| Disruptor Rounds | Kinetic Shields | Deal **2×** damage to shields |');
  L.push('| Warp Rounds | Biotic Barriers | Deal **1.5×** damage to barriers; depleting one triggers a dark-energy detonation |');
  L.push('| Incendiary Rounds | Combat Frames | Burn armor **1.5×** faster; critical hits add persistent fire (1d6) |');
  L.push('| Armor-Piercing Rounds | Combat Frames | **50%** of HP damage bypasses armor entirely |');
  L.push('| Phasic Rounds | Combat Frames | Bypass frames completely, but total damage is reduced to **60%** |');
  L.push('| Shredder Rounds | Hit Points | Most effective against targets with no shields, barriers or armor |');
  L.push('| Cryo Rounds | Hit Points | Apply the **Chilled** condition on direct HP damage |');
  L.push('');
  L.push('**Warp, the power.** Warp is the biotic answer to a barrier. Its damage counts **double** against a Biotic Barrier and **1.5×** against a Combat Armor Frame (its persistent damage does not), and a critical failure against it detonates an active barrier: what is left of the barrier is gone, and the target and each of the caster\'s enemies within 10 feet take the burst with no save. Both multipliers can be changed in module settings.', '');
  L.push('**Incinerate.** Incinerate burns through armor: its damage counts **1.5×** against a Combat Armor Frame (its persistent fire does not). The multiplier can be changed in module settings.', '');
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
  const items = await loadDir('me-items');
  const amps = items.filter((i) => i.system?.baseItem === 'biotic-amp')
    .sort((a, b) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name));
  // Everything else in ME Items (medi-gel, its upgrades, omni-gel) prints in full
  const fieldGear = items.filter((i) => i.system?.baseItem !== 'biotic-amp');


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
  lines.push('*The six Mass Effect classes. Each entry covers its advancement and every class feature in full, plus an index of its feats — the feats themselves are catalogued under Feats.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  const packIndex = await indexPacks(SRC);
  const { classes, shared } = await loadClassContent(SRC);
  const summaries = [];
  for (const cls of classes) {
    const info = summarizeClass(cls.item, packIndex);
    summaries.push(info);

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

    // Every feature the class grants, in full, read from the class item. The proficiency
    // features several classes share print once, after the six classes.
    if (info.features.length) {
      lines.push('#### Class Features');
      lines.push('');
      lines.push('*These features are automatically granted at the indicated levels. The proficiency features in the Advancement table are described under Class Proficiency Features.*');
      lines.push('');
      for (const feat of info.features) {
        lines.push(renderFeat(feat));
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    // Full feat text lives under Feats; the class carries a level index.
    classFeatSets.push({ name: cls.name, feats: cls.feats });
    if (cls.feats.length) {
      lines.push('#### Class Feats');
      lines.push('');
      lines.push(`*${titleCase(cls.name)} feats are listed in full under **Feats -> Class Feats -> ${titleCase(cls.name)}**. Class feats are available at levels ${listLevels([...info.classFeatLevels])}. Powers shared with other classes are listed in full under **General & Skill Feats**.*`);
      lines.push('');
      lines.push('| Level | Feats |');
      lines.push('|---|---|');
      const byLvl = new Map();
      // Shared powers: their full text is under General & Skill Feats; the class table only indexes them.
      for (const f of [...cls.feats, ...cls.shared]) {
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

  const proficiencyFeatures = sharedProficiencyFeatures(summaries);
  if (proficiencyFeatures.length) {
    lines.push('### CLASS PROFICIENCY FEATURES');
    lines.push('');
    lines.push('*Shared by the classes that list them in their Advancement table, at the levels given here. Each class\'s own class DC features (such as Adept Expertise, Master Adept and Legendary Adept) are printed with that class; every power uses your class DC.*');
    lines.push('');
    for (const { item, classes: gainedBy } of proficiencyFeatures) {
      lines.push(`**${item.name}** ${htmlToMd(item.system.description.value)}`);
      lines.push('');
      lines.push(`*${gainedBy.map(c => `${c.name} ${ordinalLevel(c.level)}`).join(', ')}*`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  const generalFeats = shared.map(s => s.feat)
    .sort((a, b) => (a.system.level.value - b.system.level.value) || a.name.localeCompare(b.name));

  lines.push(...renderBackgrounds(backgrounds));
  lines.push(...renderFeats(classFeatSets, ancestryFeats, ancestries, generalFeats));
  lines.push(...renderEquipment(weapons, armors, weaponMods, armorMods, grenades, shields, amps, fieldGear));
  lines.push(...renderBestiary(npcFactions, creatures, vehicles, ships));
  lines.push(...renderShieldMechanics(shields));

  const output = lines.join('\n');
  await mkdir('docs', { recursive: true });
  await writeFile('docs/mass-effect-starfinder-2e-conversion.md', output, 'utf8');
  console.log(`✓ Wrote docs/mass-effect-starfinder-2e-conversion.md (${output.length.toLocaleString()} chars)`);
  console.log(`  ancestries ${ancestries.length} · heritages ${heritages.length} · backgrounds ${backgrounds.length}`);
  console.log(`  weapons ${weapons.length} · armors ${armors.length} · mods ${weaponMods.length + armorMods.length} · grenades ${grenades.length}`);
  console.log(`  NPCs ${npcFactions.reduce((n, f) => n + f.npcs.length, 0)} across ${npcFactions.length} factions`);
}

main().catch(err => { console.error(err); process.exit(1); });
