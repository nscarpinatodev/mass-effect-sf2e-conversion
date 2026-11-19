// STALE: the files this script writes have since been edited by hand (class traits, class-feat category,
// automation text, prerequisites). Running it again overwrites those edits. Edit src/packs/me-combat-passives directly.
// Generates passive combat feat items (with 3-tier upgrade chains) and associated effects.
// Usage: node scripts/generate-combat-passives.mjs

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MODULE_ID = 'mass-effect-sf2e-conversion';
const PACK_NAME  = 'me-combat-passives';

const PUB = {
  title:   'Mass Effect Compendium',
  authors: 'nscarpinatodev',
  license: 'ORC',
  remaster: true,
};

const MIG = { version: 0.955, lastMigration: null, previous: null };

function uuid(id) {
  return `Compendium.${MODULE_ID}.${PACK_NAME}.Item.${id}`;
}

function makePassiveFeat({ id, name, slug, img, level, prereqs = [], traits = [], rules = [], description }) {
  return {
    _key:   `!items!${id}`,
    _id:    id,
    folder: null,
    name,
    type:   'feat',
    img,
    effects: [],
    flags:   {},
    ownership: { default: 0 },
    system: {
      slug,
      description: { gm: '', value: description },
      rules,
      _migration: MIG,
      traits: { otherTags: [], value: traits, rarity: 'common' },
      publication: PUB,
      level: { value: level },
      prerequisites: { value: prereqs.map(p => ({ value: p })) },
      actionType: { value: 'passive' },
      actions:    { value: null },
      category:   'classfeature',
    },
  };
}

function makeActionFeat({ id, name, slug, img, level, actions, actionType = 'action', prereqs = [], traits = [], selfEffect = null, description }) {
  const system = {
    slug,
    description: { gm: '', value: description },
    rules:    [],
    _migration: MIG,
    traits: { otherTags: [], value: traits, rarity: 'common' },
    publication: PUB,
    level: { value: level },
    prerequisites: { value: prereqs.map(p => ({ value: p })) },
    actionType: { value: actionType },
    actions:    { value: actions },
    category:   'class',
  };
  if (selfEffect) system.selfEffect = selfEffect;
  return {
    _key:   `!items!${id}`,
    _id:    id,
    folder: null,
    name,
    type:   'feat',
    img,
    effects: [],
    flags:   {},
    ownership: { default: 0 },
    system,
  };
}

function makeEffect({ id, name, slug, img, duration, rules = [], description }) {
  return {
    _key:   `!items!${id}`,
    _id:    id,
    folder: null,
    name,
    type:   'effect',
    img,
    effects: [],
    flags:   {},
    ownership: { default: 0 },
    system: {
      slug,
      description: { gm: '', value: description },
      rules,
      _migration: MIG,
      traits: { otherTags: [], value: [], rarity: 'common' },
      publication: PUB,
      duration,
      badge: null,
    },
  };
}

const ITEMS = [];

// ── FITNESS ──────────────────────────────────────────────────────────────────
// Each tier stacks incrementally (+4 HP each); Fortitude uses highest circ.

ITEMS.push(makePassiveFeat({
  id:    'meCPFitness00000',
  name:  'Fitness',
  slug:  'me-cp-fitness',
  img:   'icons/magic/life/heart-cross-strong-flame-red.webp',
  level: 1,
  rules: [{ key: 'FlatModifier', selector: 'hp', value: 4, label: 'Fitness' }],
  description:
    '<p>Rigorous physical conditioning increases your survivability. You gain <strong>+4 maximum HP</strong>.</p>'
    + '<p><em>Classes: All.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPFitnessImpvd',
  name:    'Improved Fitness',
  slug:    'me-cp-fitness-improved',
  img:     'icons/magic/life/heart-cross-strong-flame-red.webp',
  level:   4,
  prereqs: ['Fitness'],
  rules: [
    { key: 'FlatModifier', selector: 'hp', value: 4, label: 'Improved Fitness' },
    { key: 'FlatModifier', selector: 'fortitude', type: 'circumstance', value: 1, label: 'Improved Fitness' },
  ],
  description:
    '<p>Advanced conditioning deepens your physical resilience. You gain an additional <strong>+4 maximum HP</strong> (total +8 with Fitness) and a <strong>+1 circumstance bonus to Fortitude saves</strong>.</p>'
    + '<p><em>Prerequisite: Fitness.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPFitnessMastr',
  name:    'Master Fitness',
  slug:    'me-cp-fitness-master',
  img:     'icons/magic/life/heart-cross-strong-flame-red.webp',
  level:   8,
  prereqs: ['Improved Fitness'],
  rules: [
    { key: 'FlatModifier', selector: 'hp', value: 4, label: 'Master Fitness' },
    { key: 'FlatModifier', selector: 'fortitude', type: 'circumstance', value: 2, label: 'Master Fitness' },
    { key: 'FlatModifier', selector: 'speed', value: 5, label: 'Master Fitness' },
  ],
  description:
    '<p>Peak physical conditioning. You gain an additional <strong>+4 maximum HP</strong> (total +12 with the chain), your Fortitude circumstance bonus increases to <strong>+2</strong>, and your movement speed increases by <strong>5 feet</strong>.</p>'
    + '<p><em>Prerequisite: Improved Fitness.</em></p>',
}));

// ── COMBAT TRAINING ───────────────────────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:    'meCPCombatTrain0',
  name:  'Combat Training',
  slug:  'me-cp-combat-training',
  img:   'icons/skills/melee/sword-shield-stylized-blue.webp',
  level: 1,
  rules: [{ key: 'FlatModifier', selector: 'attack-roll', type: 'circumstance', value: 1, label: 'Combat Training' }],
  description:
    '<p>Intensive combat drills sharpen your offensive fundamentals. You gain a <strong>+1 circumstance bonus to attack rolls</strong>.</p>'
    + '<p><em>Classes: Soldier, Vanguard, Infiltrator.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPCombatTrnImp',
  name:    'Improved Combat Training',
  slug:    'me-cp-combat-training-improved',
  img:     'icons/skills/melee/sword-shield-stylized-blue.webp',
  level:   4,
  prereqs: ['Combat Training'],
  rules: [
    { key: 'FlatModifier', selector: 'strike-damage', value: 2, label: 'Improved Combat Training' },
  ],
  description:
    '<p>Your combat mastery extends to follow-through. You deal <strong>+2 damage</strong> on all Strikes (stacks with Combat Training\'s attack bonus).</p>'
    + '<p><em>Prerequisite: Combat Training.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPCombatTrnMst',
  name:    'Master Combat Training',
  slug:    'me-cp-combat-training-master',
  img:     'icons/skills/melee/sword-shield-stylized-blue.webp',
  level:   8,
  prereqs: ['Improved Combat Training'],
  rules: [
    { key: 'FlatModifier', selector: 'strike-damage', value: 2, label: 'Master Combat Training' },
    { key: 'FlatModifier', selector: 'saving-throw', type: 'circumstance', value: 1, label: 'Master Combat Training' },
  ],
  description:
    '<p>Elite combat discipline across all dimensions. You deal an additional <strong>+2 damage</strong> on all Strikes (total +4 with the chain) and gain a <strong>+1 circumstance bonus to all saving throws</strong> from battlefield awareness.</p>'
    + '<p><em>Prerequisite: Improved Combat Training.</em></p>',
}));

// ── BIOTIC MASTERY ────────────────────────────────────────────────────────────
// Description-only — action cost reduction cannot be automated via rule elements.

ITEMS.push(makePassiveFeat({
  id:    'meCPBioticMast00',
  name:  'Biotic Mastery',
  slug:  'me-cp-biotic-mastery',
  img:   'icons/magic/light/orb-shining-teal.webp',
  level: 2,
  traits: ['biotic'],
  description:
    '<p>Refined biotic focus reduces the effort required to shape mass effect fields. All biotic powers you use have their action cost <strong>reduced by 1</strong> (minimum 1 action).</p>'
    + '<p><em>Classes: Adept, Vanguard, Sentinel.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPBioticMastIm',
  name:    'Improved Biotic Mastery',
  slug:    'me-cp-biotic-mastery-improved',
  img:     'icons/magic/light/orb-shining-teal.webp',
  level:   6,
  prereqs: ['Biotic Mastery'],
  traits:  ['biotic'],
  description:
    '<p>Your biotic efficiency reaches exceptional levels. All biotic powers you use have their action cost <strong>reduced by 1</strong> (minimum 1 action). Once per round, after triggering a Biotic Explosion, you may use a biotic power as a <strong>free action</strong>.</p>'
    + '<p><em>Prerequisite: Biotic Mastery.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPBioticMastMs',
  name:    'Master Biotic Mastery',
  slug:    'me-cp-biotic-mastery-master',
  img:     'icons/magic/light/orb-shining-teal.webp',
  level:   10,
  prereqs: ['Improved Biotic Mastery'],
  traits:  ['biotic'],
  rules:   [{ key: 'FlatModifier', selector: 'strike-damage', type: 'circumstance', value: 2, label: 'Biotic Mastery' }],
  description:
    '<p>You have mastered the art of mass effect manipulation. All biotic powers have their action cost <strong>reduced by 1</strong> (minimum 1 action). Once per round a biotic power may be used as a <strong>free action</strong>. Your constant biotic field adds <strong>+2 damage</strong> to all Strikes.</p>'
    + '<p><em>Prerequisite: Improved Biotic Mastery.</em></p>',
}));

// ── TECH MASTERY ──────────────────────────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:    'meCPTechMastery0',
  name:  'Tech Mastery',
  slug:  'me-cp-tech-mastery',
  img:   'icons/equipment/wrist/bracer-runed-steel-orange.webp',
  level: 2,
  traits: ['tech'],
  description:
    '<p>Optimized omni-tool firmware and muscle memory for tech power deployment. All tech powers you use have their action cost <strong>reduced by 1</strong> (minimum 1 action).</p>'
    + '<p><em>Classes: Engineer, Infiltrator, Sentinel.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPTechMastryIm',
  name:    'Improved Tech Mastery',
  slug:    'me-cp-tech-mastery-improved',
  img:     'icons/equipment/wrist/bracer-runed-steel-orange.webp',
  level:   6,
  prereqs: ['Tech Mastery'],
  traits:  ['tech'],
  description:
    '<p>Advanced omni-tool integration lets you chain tech powers seamlessly. All tech powers have their action cost <strong>reduced by 1</strong> (minimum 1 action). Once per round, after destroying a shield with Overload or a similar power, you may use a tech power as a <strong>free action</strong>.</p>'
    + '<p><em>Prerequisite: Tech Mastery.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPTechMastryMs',
  name:    'Master Tech Mastery',
  slug:    'me-cp-tech-mastery-master',
  img:     'icons/equipment/wrist/bracer-runed-steel-orange.webp',
  level:   10,
  prereqs: ['Improved Tech Mastery'],
  traits:  ['tech'],
  rules:   [{ key: 'FlatModifier', selector: 'will', type: 'circumstance', value: 1, label: 'Tech Mastery' }],
  description:
    '<p>Your omni-tool is an extension of your nervous system. All tech powers have their action cost <strong>reduced by 1</strong> (minimum 1 action). Once per round a tech power may be used as a <strong>free action</strong>. Your deep system knowledge also grants a <strong>+1 circumstance bonus to Will saves</strong>.</p>'
    + '<p><em>Prerequisite: Improved Tech Mastery.</em></p>',
}));

// ── WEAPON MASTERY ────────────────────────────────────────────────────────────
// Tier 1: +2 circ damage. Tier 2: +4 circ damage + +1 circ attack.
// Tier 3: +6 circ damage + +2 circ attack. (Highest circ wins per category.)

const weaponMastery = [
  {
    group: 'rifle',
    label: 'Assault Rifles',
    classes: 'Soldier, Sentinel',
    t2note: 'Your range-fire discipline tightens.',
    t3note: 'Critical hits with assault rifles ignore 5 points of the target\'s damage resistance.',
  },
  {
    group: 'sniper',
    label: 'Sniper Rifles',
    classes: 'Infiltrator',
    t2note: 'Your range increment penalty with sniper rifles is reduced by 1.',
    t3note: 'You ignore the Prone condition\'s penalty to ranged attacks when using a sniper rifle.',
  },
  {
    group: 'shotgun',
    label: 'Shotguns',
    classes: 'Vanguard, Soldier',
    t2note: 'You do not take penalties for firing while adjacent to a prone or grabbed enemy.',
    t3note: 'Critical hits with a shotgun push the target 10 feet and knock them Prone.',
  },
  {
    group: 'pistol',
    label: 'Pistols & SMGs',
    classes: 'Adept, Engineer, Infiltrator',
    t2note: 'You may draw a pistol or SMG as part of the same action used to Strike with it.',
    t3note: 'Your MAP penalty for subsequent pistol/SMG attacks is −3 instead of −5.',
  },
];

const WPN_IMGS = {
  rifle:   'icons/weapons/guns/gun-pistol-flintlock-black.webp',
  sniper:  'icons/weapons/guns/gun-pistol-flintlock-black.webp',
  shotgun: 'icons/weapons/guns/gun-pistol-flintlock-black.webp',
  pistol:  'icons/weapons/guns/gun-pistol-flintlock-black.webp',
};

const WPN_ID_PREFIXES = {
  rifle:   { t1: 'meCPWpnMstRifle0', t2: 'meCPWpnMstRifImp', t3: 'meCPWpnMstRifMst' },
  sniper:  { t1: 'meCPWpnMstSniper', t2: 'meCPWpnMstSniImp', t3: 'meCPWpnMstSniMst' },
  shotgun: { t1: 'meCPWpnMstShotgn', t2: 'meCPWpnMstShgImp', t3: 'meCPWpnMstShgMst' },
  pistol:  { t1: 'meCPWpnMstPistol', t2: 'meCPWpnMstPstImp', t3: 'meCPWpnMstPstMst' },
};

for (const { group, label, classes, t2note, t3note } of weaponMastery) {
  const ids = WPN_ID_PREFIXES[group];
  const img = WPN_IMGS[group];
  const pred = [`item:group:${group}`];
  const baseName  = `Weapon Mastery (${label})`;
  const impvName  = `Improved Weapon Mastery (${label})`;
  const mastrName = `Master Weapon Mastery (${label})`;

  ITEMS.push(makePassiveFeat({
    id:    ids.t1,
    name:  baseName,
    slug:  `me-cp-weapon-mastery-${group}`,
    img,
    level: 1,
    rules: [{ key: 'FlatModifier', selector: 'strike-damage', type: 'circumstance', value: 2, predicate: pred, label: baseName }],
    description:
      `<p>Extensive training with ${label.toLowerCase()} improves your firing discipline. You deal <strong>+2 damage</strong> with ${label.toLowerCase()} attacks.</p>`
      + `<p><em>Classes: ${classes}.</em></p>`,
  }));

  ITEMS.push(makePassiveFeat({
    id:      ids.t2,
    name:    impvName,
    slug:    `me-cp-weapon-mastery-${group}-improved`,
    img,
    level:   4,
    prereqs: [baseName],
    rules: [
      { key: 'FlatModifier', selector: 'strike-damage', type: 'circumstance', value: 4, predicate: pred, label: baseName },
      { key: 'FlatModifier', selector: 'attack-roll',   type: 'circumstance', value: 1, predicate: pred, label: baseName },
    ],
    description:
      `<p>Expert ${label.toLowerCase()} proficiency. You deal <strong>+4 damage</strong> and gain a <strong>+1 circumstance bonus to attack rolls</strong> with ${label.toLowerCase()} (replaces the +2 damage). ${t2note}</p>`
      + `<p><em>Prerequisite: ${baseName}.</em></p>`,
  }));

  ITEMS.push(makePassiveFeat({
    id:      ids.t3,
    name:    mastrName,
    slug:    `me-cp-weapon-mastery-${group}-master`,
    img,
    level:   8,
    prereqs: [impvName],
    rules: [
      { key: 'FlatModifier', selector: 'strike-damage', type: 'circumstance', value: 6, predicate: pred, label: baseName },
      { key: 'FlatModifier', selector: 'attack-roll',   type: 'circumstance', value: 2, predicate: pred, label: baseName },
    ],
    description:
      `<p>Master-level ${label.toLowerCase()} proficiency. You deal <strong>+6 damage</strong> and gain a <strong>+2 circumstance bonus to attack rolls</strong> with ${label.toLowerCase()} (replaces previous bonuses). ${t3note}</p>`
      + `<p><em>Prerequisite: ${impvName}.</em></p>`,
  }));
}

// ── CONCUSSIVE SHOT ───────────────────────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:    'meCPConcussShot0',
  name:  'Concussive Shot',
  slug:  'me-cp-concussive-shot',
  img:   'icons/magic/air/wind-tornado-small-blue.webp',
  level: 1,
  description:
    '<p>Your shots carry a concussive punch that staggers targets on a well-placed hit.</p>'
    + '<p>When you score a <strong>critical hit</strong> with a weapon Strike, the target is <strong>Stunned 1</strong>.</p>'
    + '<p><em>Classes: Soldier.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPConcusShtImp',
  name:    'Improved Concussive Shot',
  slug:    'me-cp-concussive-shot-improved',
  img:     'icons/magic/air/wind-tornado-small-blue.webp',
  level:   4,
  prereqs: ['Concussive Shot'],
  description:
    '<p>Your concussive strikes now send enemies sprawling.</p>'
    + '<p>When you score a <strong>critical hit</strong> with a weapon Strike, the target is <strong>Stunned 1</strong> and <strong>Knocked Prone</strong>.</p>'
    + '<p><em>Prerequisite: Concussive Shot.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meCPConcusShtMst',
  name:    'Master Concussive Shot',
  slug:    'me-cp-concussive-shot-master',
  img:     'icons/magic/air/wind-tornado-small-blue.webp',
  level:   8,
  prereqs: ['Improved Concussive Shot'],
  description:
    '<p>Your striking force disrupts enemy coordination even on ordinary hits.</p>'
    + '<p>Any creature you hit with a weapon Strike is <strong>Off-Guard</strong> until the start of your next turn. On a <strong>critical hit</strong>, the target is instead <strong>Stunned 2</strong> and <strong>Knocked Prone</strong>.</p>'
    + '<p><em>Prerequisite: Improved Concussive Shot.</em></p>',
}));

// ── ADRENALINE RUSH ───────────────────────────────────────────────────────────

const ADRENALINE_IMG = 'icons/magic/movement/trail-streak-impact-blue.webp';
const ROUND_1 = { value: 1, unit: 'rounds', expiry: 'turn-end' };

ITEMS.push(makeEffect({
  id:       'meEffAdrenaline0',
  name:     'Adrenaline Rush',
  slug:     'me-effect-adrenaline-rush',
  img:      ADRENALINE_IMG,
  duration: ROUND_1,
  rules:    [{ key: 'FlatModifier', selector: 'speed', type: 'status', value: 15, label: 'Adrenaline Rush' }],
  description:
    '<p>Combat stimulants flood your system. You are <strong>Quickened 1</strong> this round (use the extra action only to Stride or Strike). Your movement speed increases by <strong>15 feet</strong>.</p>',
}));

ITEMS.push(makeEffect({
  id:       'meEffAdrenalinIm',
  name:     'Improved Adrenaline Rush',
  slug:     'me-effect-adrenaline-rush-improved',
  img:      ADRENALINE_IMG,
  duration: ROUND_1,
  rules: [
    { key: 'FlatModifier', selector: 'speed',       type: 'status', value: 20, label: 'Improved Adrenaline Rush' },
    { key: 'FlatModifier', selector: 'attack-roll', type: 'status', value: 1,  label: 'Improved Adrenaline Rush' },
  ],
  description:
    '<p>Your combat reflexes hit overdrive. You are <strong>Quickened 1</strong> this round (Stride, Strike, or Draw). Your movement speed increases by <strong>20 feet</strong> and you gain a <strong>+1 status bonus to attack rolls</strong>.</p>',
}));

ITEMS.push(makeEffect({
  id:       'meEffAdrnalMastr',
  name:     'Master Adrenaline Rush',
  slug:     'me-effect-adrenaline-rush-master',
  img:      ADRENALINE_IMG,
  duration: ROUND_1,
  rules: [
    { key: 'FlatModifier', selector: 'speed',       type: 'status', value: 30, label: 'Master Adrenaline Rush' },
    { key: 'FlatModifier', selector: 'attack-roll', type: 'status', value: 2,  label: 'Master Adrenaline Rush' },
  ],
  description:
    '<p>Hyper-accelerated combat awareness. You are <strong>Quickened 2</strong> this round (Stride, Strike, or Draw). Your movement speed increases by <strong>30 feet</strong> and you gain a <strong>+2 status bonus to attack rolls</strong>.</p>',
}));

ITEMS.push(makeActionFeat({
  id:         'meCPAdrenaline00',
  name:       'Adrenaline Rush',
  slug:       'me-cp-adrenaline-rush',
  img:        ADRENALINE_IMG,
  level:      2,
  actions:    1,
  actionType: 'action',
  selfEffect: { uuid: uuid('meEffAdrenaline0'), name: 'Adrenaline Rush' },
  description:
    '<p>You spike your body\'s combat stimulant response, accelerating your reaction speed for a burst of action. Apply the <strong>Adrenaline Rush</strong> effect: Quickened 1 and +15 speed until the end of your turn.</p>'
    + '<p><em>Classes: Soldier.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:         'meCPAdrenalineIm',
  name:       'Improved Adrenaline Rush',
  slug:       'me-cp-adrenaline-rush-improved',
  img:        ADRENALINE_IMG,
  level:      6,
  actions:    null,
  actionType: 'reaction',
  prereqs:    ['Adrenaline Rush'],
  selfEffect: { uuid: uuid('meEffAdrenalinIm'), name: 'Improved Adrenaline Rush' },
  description:
    '<p><strong>Trigger:</strong> You take damage from a Strike while not Flat-Footed.</p>'
    + '<p>Your body automatically triggers an adrenaline response when threatened. Apply the <strong>Improved Adrenaline Rush</strong> effect: Quickened 1, +20 speed, and +1 to attack rolls until the end of your turn.</p>'
    + '<p><em>Prerequisite: Adrenaline Rush.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:         'meCPAdrenalMastr',
  name:       'Master Adrenaline Rush',
  slug:       'me-cp-adrenaline-rush-master',
  img:        ADRENALINE_IMG,
  level:      10,
  actions:    null,
  actionType: 'reaction',
  prereqs:    ['Improved Adrenaline Rush'],
  selfEffect: { uuid: uuid('meEffAdrnalMastr'), name: 'Master Adrenaline Rush' },
  description:
    '<p><strong>Trigger:</strong> You take damage from any source while not Flat-Footed.</p>'
    + '<p>Your augmented combat systems trigger a full adrenaline surge at the slightest provocation. Apply the <strong>Master Adrenaline Rush</strong> effect: Quickened 2, +30 speed, and +2 to attack rolls until the end of your turn.</p>'
    + '<p><em>Prerequisite: Improved Adrenaline Rush.</em></p>',
}));

// ── FORTIFICATION ─────────────────────────────────────────────────────────────

const FORT_IMG   = 'icons/magic/defensive/shield-barrier-deflect.webp';
const UNLIMITED  = { value: -1, unit: 'unlimited', expiry: null };

ITEMS.push(makeEffect({
  id:       'meEffFortifictn0',
  name:     'Fortification',
  slug:     'me-effect-fortification',
  img:      FORT_IMG,
  duration: UNLIMITED,
  rules:    [{ key: 'Resistance', type: 'all', value: 5, label: 'Fortification' }],
  description:
    '<p>Your armor is hardened with protective current. You have <strong>Resistance 5 to all damage</strong>. Dismiss as a free action to deactivate.</p>',
}));

ITEMS.push(makeEffect({
  id:       'meEffFortifictnI',
  name:     'Improved Fortification',
  slug:     'me-effect-fortification-improved',
  img:      FORT_IMG,
  duration: UNLIMITED,
  rules: [
    { key: 'Resistance',   type: 'all', value: 8, label: 'Improved Fortification' },
    { key: 'FlatModifier', selector: 'ac', type: 'circumstance', value: 1, label: 'Improved Fortification' },
  ],
  description:
    '<p>Advanced armor hardening. You have <strong>Resistance 8 to all damage</strong> and a <strong>+1 circumstance bonus to AC</strong>. Dismiss as a free action to deactivate.</p>',
}));

ITEMS.push(makeEffect({
  id:       'meEffFortifictnM',
  name:     'Master Fortification',
  slug:     'me-effect-fortification-master',
  img:      FORT_IMG,
  duration: UNLIMITED,
  rules: [
    { key: 'Resistance',   type: 'all', value: 12, label: 'Master Fortification' },
    { key: 'FlatModifier', selector: 'ac',           type: 'circumstance', value: 2, label: 'Master Fortification' },
    { key: 'FlatModifier', selector: 'saving-throw', type: 'circumstance', value: 2, label: 'Master Fortification' },
  ],
  description:
    '<p>Near-impenetrable combat shell. You have <strong>Resistance 12 to all damage</strong>, a <strong>+2 circumstance bonus to AC</strong>, and a <strong>+2 circumstance bonus to all saves</strong>. Dismiss as a free action to deactivate.</p>',
}));

ITEMS.push(makeActionFeat({
  id:         'meCPFortificatn0',
  name:       'Fortification',
  slug:       'me-cp-fortification',
  img:        FORT_IMG,
  level:      2,
  actions:    1,
  actionType: 'action',
  selfEffect: { uuid: uuid('meEffFortifictn0'), name: 'Fortification' },
  description:
    '<p>You run a hardening current through your armor plating, distributing kinetic energy across the suit\'s surface to reduce incoming damage. Apply the <strong>Fortification</strong> effect: Resistance 5 to all damage until dismissed.</p>'
    + '<p><em>Classes: Soldier, Sentinel.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:         'meCPFortifictnIm',
  name:       'Improved Fortification',
  slug:       'me-cp-fortification-improved',
  img:        FORT_IMG,
  level:      6,
  actions:    1,
  actionType: 'action',
  prereqs:    ['Fortification'],
  selfEffect: { uuid: uuid('meEffFortifictnI'), name: 'Improved Fortification' },
  description:
    '<p>Enhanced armor hardening channels additional energy into your plating. Apply the <strong>Improved Fortification</strong> effect: Resistance 8 to all damage + +1 circumstance AC until dismissed.</p>'
    + '<p><em>Prerequisite: Fortification.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:         'meCPFortifictnMs',
  name:       'Master Fortification',
  slug:       'me-cp-fortification-master',
  img:        FORT_IMG,
  level:      10,
  actions:    1,
  actionType: 'action',
  prereqs:    ['Improved Fortification'],
  selfEffect: { uuid: uuid('meEffFortifictnM'), name: 'Master Fortification' },
  description:
    '<p>Your fortification system creates a near-impenetrable combat shell. Apply the <strong>Master Fortification</strong> effect: Resistance 12 to all damage + +2 AC + +2 saves until dismissed.</p>'
    + '<p><em>Prerequisite: Improved Fortification.</em></p>',
}));

// ── Write files ───────────────────────────────────────────────────────────────

const PACK_DIR = 'src/packs/me-combat-passives';
await mkdir(PACK_DIR, { recursive: true });

for (const item of ITEMS) {
  const filename = item.system.slug
    .replace(/^me-cp-/, '')
    .replace(/^me-effect-/, 'effect-')
    + '.json';
  const path = join(PACK_DIR, filename);
  await writeFile(path, JSON.stringify(item, null, 2), 'utf8');
  console.log(`  wrote ${path}`);
}

console.log(`\n✓ Generated ${ITEMS.length} items in ${PACK_DIR}. Run: npm run build`);
