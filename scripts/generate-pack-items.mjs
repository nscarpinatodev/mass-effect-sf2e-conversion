// Generates all JSON source files for the me-shields and me-ammo-powers packs.
// Run once: node scripts/generate-pack-items.mjs
// Then: npm run build

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MODULE_ID  = 'mass-effect-sf2e-conversion';
const MODULE_PKG = 'mass-effect-sf2e-conversion';
const PUB = { title: 'Mass Effect Compendium', authors: 'nscarpinatodev', license: 'ORC', remaster: true };
const MIG = { version: 0.955, lastMigration: null, previous: null };

function item(id, name, type, img, system, flags = {}) {
  return {
    _key: `!items!${id}`,
    _id: id,
    folder: null,
    name,
    type,
    img,
    effects: [],
    flags,
    ownership: { default: 0 },
    system,
  };
}

// ── me-shields ───────────────────────────────────────────────────────────────

const SHIELDS_DIR = 'src/packs/me-shields';
await mkdir(SHIELDS_DIR, { recursive: true });

// Kinetic Shield (equipment)
await writeFile(join(SHIELDS_DIR, 'kinetic-shield.json'), JSON.stringify(item(
  'meKineticShield0',
  'Kinetic Shield',
  'equipment',
  'icons/magic/defensive/shield-barrier-blue.webp',
  {
    slug: 'me-kinetic-shield',
    description: { gm: '', value: '<p>A personal kinetic barrier providing <strong>30 Shield HP</strong>. Recharges <strong>10 HP per turn</strong>.</p><p>Equip <strong>Shield HP</strong> and <strong>Regen</strong> mods to upgrade your barrier. If fully depleted, the wearer must <strong>Take Cover</strong> before the shield will begin recharging.</p>' },
    rules: [], _migration: MIG,
    traits: { otherTags: [], value: [], rarity: 'common' },
    publication: PUB,
    level: { value: 1 },
    quantity: 1,
    baseItem: 'me-kinetic-shield',
    bulk: { value: 1 },
    price: { value: { sp: 150 } },
    equipped: { carryType: 'worn', inSlot: true },
    usage: { value: 'other' },
    identification: { status: 'identified', unidentified: { name: 'Unknown Mod', img: 'systems/pf2e/icons/unidentified_item_icons/worn-item.webp', data: { description: { value: '' } } }, misidentified: {} },
    subitems: [], specific: null,
  },
  { [MODULE_ID]: { shieldMax: 30, shieldRegen: 10 } },
), null, 2));

// Shield HP Mods (equipment)
const HP_MODS = [
  { tier: 1, id: 'meShieldHpMod001', bonus: 10, level: 3,  price: 600   },
  { tier: 2, id: 'meShieldHpMod002', bonus: 20, level: 6,  price: 2500  },
  { tier: 3, id: 'meShieldHpMod003', bonus: 40, level: 9,  price: 7000  },
  { tier: 4, id: 'meShieldHpMod004', bonus: 70, level: 12, price: 16000 },
];
for (const m of HP_MODS) {
  await writeFile(join(SHIELDS_DIR, `shield-hp-mod-t${m.tier}.json`), JSON.stringify(item(
    m.id,
    `Shield HP Mod — Tier ${m.tier}`,
    'equipment',
    'icons/magic/defensive/shield-barrier-glowing-blue.webp',
    {
      slug: `me-shield-hp-mod-t${m.tier}`,
      description: { gm: '', value: `<p>Increases kinetic shield capacity by <strong>+${m.bonus} HP</strong> (base 30 → ${30 + m.bonus}).</p><p>Only one Shield HP Mod can be installed at a time.</p>` },
      rules: [], _migration: MIG,
      traits: { otherTags: [], value: [], rarity: 'common' },
      publication: PUB,
      level: { value: m.level },
      quantity: 1,
      baseItem: `me-shield-hp-mod`,
      bulk: { value: 0 },
      price: { value: { sp: m.price } },
      equipped: { carryType: 'worn', inSlot: true },
      usage: { value: 'other' },
      identification: { status: 'identified', unidentified: { name: 'Unknown Mod', img: 'systems/pf2e/icons/unidentified_item_icons/worn-item.webp', data: { description: { value: '' } } }, misidentified: {} },
      subitems: [], specific: null,
    },
    { [MODULE_ID]: { shieldHpBonus: m.bonus } },
  ), null, 2));
}

// Shield Regen Mods (equipment)
const REGEN_MODS = [
  { tier: 1, id: 'meShieldRegen001', mult: 1.5, pct: 50,  level: 3,  price: 600   },
  { tier: 2, id: 'meShieldRegen002', mult: 2.0, pct: 100, level: 6,  price: 2500  },
  { tier: 3, id: 'meShieldRegen003', mult: 2.5, pct: 150, level: 9,  price: 7000  },
  { tier: 4, id: 'meShieldRegen004', mult: 3.0, pct: 200, level: 12, price: 16000 },
];
for (const m of REGEN_MODS) {
  await writeFile(join(SHIELDS_DIR, `shield-regen-mod-t${m.tier}.json`), JSON.stringify(item(
    m.id,
    `Shield Regen Mod — Tier ${m.tier}`,
    'equipment',
    'icons/magic/defensive/shield-barrier-flaming-diamond-blue-yellow.webp',
    {
      slug: `me-shield-regen-mod-t${m.tier}`,
      description: { gm: '', value: `<p>Boosts kinetic shield recharge rate by <strong>+${m.pct}%</strong> (base 10 → ${Math.round(10 * m.mult)} HP/turn).</p><p>Only one Shield Regen Mod can be installed at a time.</p>` },
      rules: [], _migration: MIG,
      traits: { otherTags: [], value: [], rarity: 'common' },
      publication: PUB,
      level: { value: m.level },
      quantity: 1,
      baseItem: 'me-shield-regen-mod',
      bulk: { value: 0 },
      price: { value: { sp: m.price } },
      equipped: { carryType: 'worn', inSlot: true },
      usage: { value: 'other' },
      identification: { status: 'identified', unidentified: { name: 'Unknown Mod', img: 'systems/pf2e/icons/unidentified_item_icons/worn-item.webp', data: { description: { value: '' } } }, misidentified: {} },
      subitems: [], specific: null,
    },
    { [MODULE_ID]: { regenMult: m.mult } },
  ), null, 2));
}

// Combat Armor Frames (effect)
const ARMOR_FRAMES = [
  { tier: 1, id: 'meLightCombatFrm', name: 'Light Combat Frame',    ap: 20  },
  { tier: 2, id: 'meStdCombatFrame', name: 'Standard Combat Frame', ap: 50  },
  { tier: 3, id: 'meHvyCombatFrame', name: 'Heavy Combat Frame',    ap: 100 },
  { tier: 4, id: 'meTitanCombatFrm', name: 'Titan Combat Frame',    ap: 200 },
];
for (const f of ARMOR_FRAMES) {
  await writeFile(join(SHIELDS_DIR, `armor-frame-t${f.tier}.json`), JSON.stringify(item(
    f.id,
    f.name,
    'effect',
    'modules/mass-effect-sf2e-conversion/assets/img/icons/combat-armor-frame.png',
    {
      slug: `me-armor-frame-t${f.tier}`,
      description: { gm: '', value: `<p>An ablative combat armor frame providing <strong>${f.ap} Armor Points</strong>.</p><p>Armor Points absorb damage that gets through shields, before it reaches your HP. The frame is destroyed when all Armor Points are depleted.</p><p><strong>Incendiary Rounds</strong> burn through armor 50% faster. <strong>Phasic Rounds</strong> bypass the armor frame entirely. <strong>Armor-Piercing Rounds</strong> allow 50% of damage to bleed through to shields/HP.</p>` },
      rules: [], _migration: MIG,
      traits: { otherTags: [], value: [], rarity: 'common' },
      publication: PUB,
      duration: { value: -1, unit: 'unlimited', expiry: null },
      badge: { type: 'counter', value: f.ap, max: f.ap, label: 'Armor Points' },
    },
    { [MODULE_ID]: { armorMax: f.ap, armorCurrent: f.ap } },
  ), null, 2));
}

// Biotic Barrier (effect)
await writeFile(join(SHIELDS_DIR, 'biotic-barrier.json'), JSON.stringify(item(
  'meBioticBarrier0',
  'Biotic Barrier',
  'effect',
  'icons/magic/lightning/barrier-shield-crackling-orb-pink.webp',
  {
    slug: 'me-biotic-barrier',
    description: { gm: '', value: '<p>A biotic barrier. HP = 5 × ⌊level ÷ 2⌋, calculated at activation.</p><p>Absorbs damage before shields and actual HP. Does not recharge per turn — spend actions to reactivate at full strength.</p>' },
    rules: [], _migration: MIG,
    traits: { otherTags: [], value: [], rarity: 'common' },
    publication: PUB,
    duration: { value: -1, unit: 'unlimited', expiry: null },
    badge: { type: 'counter', value: 5, max: 5, label: 'Barrier HP' },
  },
  { [MODULE_ID]: { barrier: true } },
), null, 2));

// Activate Biotic Barrier — PC feat
const BARRIER_SELF_EFFECT = { uuid: `Compendium.${MODULE_PKG}.me-shields.Item.meBioticBarrier0`, name: 'Biotic Barrier' };
const BARRIER_DESC = '<p>You project a protective mass effect field. You gain a biotic barrier with Hit Points equal to 5 × half your level (rounded down, minimum 5). The barrier absorbs damage before your shields and actual HP.</p>'
  + '<p>The barrier lasts until depleted or dismissed. It does not recharge automatically — spend 2 actions to reactivate at full strength. Reactivating replaces any remaining barrier HP with a fresh full barrier.</p>'
  + '<table><tbody><tr><td><strong>Level</strong></td><td><strong>Barrier HP</strong></td></tr>'
  + '<tr><td>1–3</td><td>5</td></tr><tr><td>4–5</td><td>10</td></tr><tr><td>6–7</td><td>15</td></tr>'
  + '<tr><td>8–9</td><td>20</td></tr><tr><td>10–11</td><td>25</td></tr><tr><td>12–13</td><td>30</td></tr>'
  + '<tr><td>14–15</td><td>35</td></tr><tr><td>16–17</td><td>40</td></tr><tr><td>18–19</td><td>45</td></tr>'
  + '<tr><td>20</td><td>50</td></tr></tbody></table>';

await writeFile(join(SHIELDS_DIR, 'activate-biotic-barrier.json'), JSON.stringify(item(
  'meActivateBbarFt',
  'Activate Biotic Barrier',
  'feat',
  'icons/magic/lightning/barrier-shield-crackling-orb-pink.webp',
  {
    slug: 'me-activate-biotic-barrier',
    description: { gm: '', value: BARRIER_DESC },
    rules: [], _migration: MIG,
    traits: { otherTags: ['biotic', 'barrier'], value: [], rarity: 'common' },
    publication: PUB,
    level: { value: 1 },
    prerequisites: { value: [] },
    actionType: { value: 'action' },
    actions: { value: 2 },
    category: 'classfeature',   // granted at level 1 by Adept and Vanguard
    selfEffect: BARRIER_SELF_EFFECT,
  },
  { [MODULE_ID]: { barrier: true } },
), null, 2));

// Activate Biotic Barrier — NPC action
await writeFile(join(SHIELDS_DIR, 'activate-biotic-barrier-npc.json'), JSON.stringify(item(
  'meActivateBbarNp',
  'Activate Biotic Barrier (NPC)',
  'action',
  'icons/magic/lightning/barrier-shield-crackling-orb-pink.webp',
  {
    slug: 'me-activate-biotic-barrier-npc',
    description: { gm: '', value: BARRIER_DESC },
    rules: [], _migration: MIG,
    traits: { otherTags: ['biotic', 'barrier'], value: [], rarity: 'common' },
    publication: PUB,
    actionType: { value: 'action' },
    actions: { value: 2 },
    category: 'interaction',
    selfEffect: BARRIER_SELF_EFFECT,
  },
  { [MODULE_ID]: { barrier: true } },
), null, 2));

console.log(`me-shields: wrote ${2 + HP_MODS.length + REGEN_MODS.length + ARMOR_FRAMES.length + 2} files`);

// ── me-ammo-powers ───────────────────────────────────────────────────────────

const AMMO_DIR = 'src/packs/me-ammo-powers';
await mkdir(AMMO_DIR, { recursive: true });

const AMMO_DEFS = [
  {
    id: 'incendiary',
    name: 'Incendiary Rounds',
    img: 'https://static.wikia.nocookie.net/masseffect/images/c/cf/ME3_Incendiary_Ammo.png',
    effectId: 'meAmmoIncendiary',
    actionId: 'meAmmoInceAction',
    featId:   'meAmmoInceFeat00',
    rules: [{ key: 'DamageDice', selector: 'strike-damage', override: { damageType: 'fire' } }],
    desc: '<p>Thermite-tipped rounds that ignite on impact. Your weapon attacks deal <strong>fire damage</strong> instead of their normal damage type.</p>'
      + '<p>Incendiary rounds burn through armor faster: each point of incoming damage depletes 1.5× points of armor.</p>'
      + '<p>On a <strong>critical hit</strong>, the target ignites and suffers <strong>persistent fire damage</strong> (DC 15 flat check to extinguish).</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'phasic',
    name: 'Phasic Rounds',
    img: 'https://static.wikia.nocookie.net/masseffect/images/b/b5/Phasic_Rounds_MP.png',
    effectId: 'meAmmoPhasicEff0',
    actionId: 'meAmmoPhasicAct0',
    featId:   'meAmmoPhasicFeat',
    rules: [{ key: 'DamageDice', selector: 'strike-damage', diceNumber: 1, dieSize: 'd4', damageType: 'force', label: 'Phasic Rounds' }],
    desc: '<p>Rounds coated in a mass effect field that disrupts ablative plating. Your weapon attacks deal an additional <strong>1d4 force damage</strong>.</p>'
      + '<p>Phasic rounds bypass Combat Armor Frames entirely — damage goes directly to shields and HP. However, the phasing effect reduces total damage dealt to <strong>60%</strong>.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'disruptor',
    name: 'Disruptor Rounds',
    img: 'https://static.wikia.nocookie.net/masseffect/images/b/b2/ME3_Disruptor_Ammo.png',
    effectId: 'meAmmoDisruptEff',
    actionId: 'meAmmoDisruptAct',
    featId:   'meAmmoDisruptFt0',
    rules: [{ key: 'DamageDice', selector: 'strike-damage', override: { damageType: 'electricity' } }],
    desc: '<p>Rounds that generate a disruptive electrical pulse on impact. Your weapon attacks deal <strong>electricity damage</strong> instead of their normal damage type.</p>'
      + '<p>Disruptor rounds deal double damage to kinetic shields: all electricity damage against shielded targets is automatically doubled.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'cryo',
    name: 'Cryo Rounds',
    img: 'https://static.wikia.nocookie.net/masseffect/images/9/94/ME3_Cryo_Ammo.png',
    effectId: 'meAmmoCryoEff000',
    actionId: 'meAmmoCryoAct000',
    featId:   'meAmmoCryoFeat00',
    rules: [{ key: 'DamageDice', selector: 'strike-damage', diceNumber: 1, dieSize: 'd4', damageType: 'cold', label: 'Cryo Rounds' }],
    desc: '<p>Cryogenically-charged rounds that flash-freeze on impact. Your weapon attacks deal an additional <strong>1d4 cold damage</strong>.</p>'
      + '<p>When Cryo Rounds deal direct HP damage, the target becomes <strong>Chilled</strong> (off-guard until the end of their next turn).</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'warp',
    name: 'Warp Rounds',
    img: 'https://static.wikia.nocookie.net/masseffect/images/6/63/ME3_Warp_Ammo.png',
    effectId: 'meAmmoWarpEff000',
    actionId: 'meAmmoWarpAct000',
    featId:   'meAmmoWarpFeat00',
    rules: [{ key: 'DamageDice', selector: 'strike-damage', diceNumber: 1, dieSize: 'd4', damageType: 'void', label: 'Warp Rounds' }],
    desc: '<p>Rounds infused with destabilizing dark energy. Your weapon attacks deal an additional <strong>1d4 void damage</strong>.</p>'
      + '<p>Warp rounds are devastating against biotic barriers: damage to a Biotic Barrier is multiplied by 1.5×. Depleting a barrier with Warp rounds triggers a dark energy detonation.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'armor-piercing',
    name: 'Armor-Piercing Rounds',
    img: 'https://static.wikia.nocookie.net/masseffect/images/b/bc/ME3_Armor_Piercing_Ammo.png',
    effectId: 'meAmmoAPierceEff',
    actionId: 'meAmmoAPierceAct',
    featId:   'meAmmoAPierceFt0',
    rules: [],
    desc: '<p>Hard alloy sabot rounds designed to penetrate ablative armor plating. These rounds add no bonus damage type.</p>'
      + '<p>When striking a target with an active Combat Armor Frame, 50% of the incoming HP damage bypasses the armor entirely and is dealt directly to shields and HP.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'shredder',
    name: 'Shredder Rounds',
    img: 'https://static.wikia.nocookie.net/masseffect/images/9/95/Shredderammo.png',
    effectId: 'meAmmoShredEff00',
    actionId: 'meAmmoShredAct00',
    featId:   'meAmmoShredFeat0',
    rules: [{ key: 'DamageDice', selector: 'strike-damage', diceNumber: 1, dieSize: 'd6', damageType: 'slashing', label: 'Shredder Rounds' }],
    desc: '<p>Serrated flechette rounds designed to shred unprotected tissue. Your weapon attacks deal an additional <strong>1d6 slashing damage</strong>.</p>'
      + '<p>Most effective against targets with no active shields, barriers, or armor.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
];

for (const ammo of AMMO_DEFS) {
  const effectUUID = `Compendium.${MODULE_PKG}.me-ammo-powers.Item.${ammo.effectId}`;
  const selfEffect = { uuid: effectUUID, name: ammo.name };

  // 1 — Ammo effect
  await writeFile(join(AMMO_DIR, `${ammo.id}-effect.json`), JSON.stringify(item(
    ammo.effectId,
    ammo.name,
    'effect',
    ammo.img,
    {
      slug: `me-ammo-${ammo.id}`,
      description: { gm: '', value: ammo.desc },
      rules: ammo.rules, _migration: MIG,
      traits: { otherTags: [], value: [], rarity: 'common' },
      publication: PUB,
      duration: { value: -1, unit: 'unlimited', expiry: null },
      badge: null,
    },
    { [MODULE_ID]: { ammoType: ammo.id } },
  ), null, 2));

  // 2 — Load action (for NPCs / quick access)
  const loadDesc = `<p>You load ${ammo.name.toLowerCase()} into your weapon. ${ammo.desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}</p>`;
  await writeFile(join(AMMO_DIR, `${ammo.id}-action.json`), JSON.stringify(item(
    ammo.actionId,
    `Load ${ammo.name}`,
    'action',
    ammo.img,
    {
      slug: `me-load-${ammo.id}`,
      description: { gm: '', value: loadDesc },
      rules: [], _migration: MIG,
      traits: { otherTags: ['ammo-power'], value: [], rarity: 'common' },
      publication: PUB,
      actionType: { value: 'action' },
      actions: { value: 1 },
      category: 'offensive',
      selfEffect,
    },
    { [MODULE_ID]: { ammoType: ammo.id } },
  ), null, 2));

  // 3 — Ammo feat (PC class feat that IS the load action)
  const featDesc = `<p>You have been trained in the use of ${ammo.name.toLowerCase()}. This feat grants you the ability to load your weapon with this special ammunition as a single action.</p>${ammo.desc}`;
  await writeFile(join(AMMO_DIR, `${ammo.id}-feat.json`), JSON.stringify(item(
    ammo.featId,
    ammo.name,
    'feat',
    ammo.img,
    {
      slug: `me-feat-${ammo.id}`,
      description: { gm: '', value: featDesc },
      rules: [], _migration: MIG,
      traits: { otherTags: ['ammo-power'], value: [], rarity: 'common' },
      publication: PUB,
      level: { value: 2 },
      prerequisites: { value: [] },
      actionType: { value: 'action' },
      actions: { value: 1 },
      category: 'class',
      selfEffect,
    },
    { [MODULE_ID]: { ammoFeat: ammo.id } },
  ), null, 2));
}

console.log(`me-ammo-powers: wrote ${AMMO_DEFS.length * 3} files`);
console.log('\n✓ Done. Run: npm run build');
