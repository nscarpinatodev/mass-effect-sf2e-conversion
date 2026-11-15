// Generates class progression feats: power upgrades (L6–L10) and class capstones (L12–L20).
// Usage: node scripts/generate-class-progressions.mjs

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const PUB = {
  title:   'Mass Effect Compendium',
  authors: 'nscarpinatodev',
  license: 'ORC',
  remaster: true,
};

const MIG = { version: 0.955, lastMigration: null, previous: null };

// category: 'classfeature' for features a class item grants, 'class' for passive
// class feats the player picks in a class feat slot.
function makePassiveFeat({ id, name, slug, img, level, prereqs = [], traits = [], rules = [], description, category = 'classfeature' }) {
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
      category,
    },
  };
}

function makeActionFeat({ id, name, slug, img, level, actions, actionType = 'action', prereqs = [], traits = [], description }) {
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
      rules:    [],
      _migration: MIG,
      traits: { otherTags: [], value: traits, rarity: 'common' },
      publication: PUB,
      level: { value: level },
      prerequisites: { value: prereqs.map(p => ({ value: p })) },
      actionType: { value: actionType },
      actions:    { value: actions },
      category:   'class',
    },
  };
}

const ITEMS = [];

// ── POWER UPGRADES (fill L6–L10 gaps) ────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeAmmoMst',  // 16 ✓
  name:    'Ammo Master',
  slug:    'me-upgrade-ammo-master',
  category: 'class',
  img:     'icons/weapons/ammunition/bullets-cartridge-shell-gray.webp',
  level:   6,
  prereqs: ['Incendiary Rounds', 'Disruptor Rounds'],
  description:
    '<p>Years of field experience with specialized ammunition have sharpened your instinct for ammo efficiency. Each ammo power you have active deals <strong>+1 additional damage die</strong> of its type.</p>'
    + '<p><em>Prerequisite: Any two ammo powers. Classes: Soldier.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeOverld0',  // 16 ✓
  name:    'Overload Upgrade',
  slug:    'me-upgrade-overload',
  category: 'class',
  img:     'icons/magic/lightning/bolt-strike-blue.webp',
  level:   8,
  prereqs: ['Overload'],
  description:
    '<p>Your mastery of electromagnetic pulse technology allows Overload to cascade across nearby shielded systems.</p>'
    + '<p>When Overload destroys a kinetic shield, it automatically chains to <strong>one additional shielded target within 15 feet</strong>, dealing half the original damage (no save).</p>'
    + '<p><em>Prerequisite: Overload. Classes: Engineer, Sentinel.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeIncinr0',  // 16 ✓
  name:    'Incinerate Upgrade',
  slug:    'me-upgrade-incinerate',
  category: 'class',
  img:     'icons/magic/fire/flame-burning-orange.webp',
  level:   8,
  prereqs: ['Incinerate'],
  description:
    '<p>You recalibrate your plasma projector for wide-pattern dispersion, turning Incinerate into an area attack.</p>'
    + '<p>Incinerate now targets a <strong>10-foot burst</strong> within 30 feet instead of a single creature. All creatures in the burst make the saving throw. Persistent fire damage applies only to those who critically fail.</p>'
    + '<p><em>Prerequisite: Incinerate. Classes: Engineer, Infiltrator.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeCharge0',  // 16 ✓
  name:    'Charge Upgrade',
  slug:    'me-upgrade-charge',
  category: 'class',
  img:     'icons/magic/movement/abstract-ribbons-blue-purple.webp',
  level:   8,
  prereqs: ['Charge'],
  description:
    '<p>Your biotic charge technique has evolved — you move so fast that enemies cannot react in time.</p>'
    + '<p>Charge <strong>no longer triggers reactions</strong> from enemies you pass through or arrive adjacent to. The push distance on a successful charge increases to <strong>15 feet</strong>.</p>'
    + '<p><em>Prerequisite: Charge. Classes: Vanguard.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeTacClk0',  // 16 ✓
  name:    'Tactical Cloak Upgrade',
  slug:    'me-upgrade-tactical-cloak',
  category: 'class',
  img:     'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
  level:   8,
  prereqs: ['Tactical Cloak'],
  description:
    '<p>Advanced cloaking algorithms keep the field stable even through the shock of a weapon discharge.</p>'
    + '<p>Tactical Cloak <strong>does not end when you make your first Strike</strong>. The cloak ends after your <strong>second Strike</strong> while cloaked, or at the start of your next turn, whichever comes first. Both Strikes made while cloaked gain the precision damage bonus.</p>'
    + '<p><em>Prerequisite: Tactical Cloak. Classes: Infiltrator.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeDrone000',  // 16 ✓
  name:    'Combat Drone Upgrade',
  slug:    'me-upgrade-combat-drone',
  category: 'class',
  img:     'icons/magic/lightning/orb-lightning-bolt-blue.webp',
  level:   10,
  prereqs: ['Combat Drone'],
  description:
    '<p>You push your drone\'s processing routines to the limit, dramatically increasing its combat efficiency.</p>'
    + '<p>Your Combat Drone gains <strong>one additional attack per round</strong> (total two attacks on its turn) and its maximum HP increases by <strong>your level</strong>.</p>'
    + '<p><em>Prerequisite: Combat Drone. Classes: Engineer.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeWarp000',  // 16 ✓
  name:    'Warp Upgrade',
  slug:    'me-upgrade-warp',
  category: 'class',
  img:     'icons/magic/unholy/orb-glowing-purple.webp',
  level:   10,
  prereqs: ['Warp'],
  description:
    '<p>You push your dark energy manipulation past its standard parameters, adding a disorienting fear component to the singularity field.</p>'
    + '<p>On a <strong>failure</strong>, the target also becomes <strong>Frightened 1</strong> in addition to normal effects. The persistent void damage increases to <strong>2d4 per round</strong> (up from 1d4).</p>'
    + '<p><em>Prerequisite: Warp. Classes: Adept, Sentinel.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeSingulr0',  // 16 ✓
  name:    'Singularity Upgrade',
  slug:    'me-upgrade-singularity',
  category: 'class',
  img:     'icons/magic/control/debuff-chains-blue.webp',
  level:   10,
  prereqs: ['Singularity'],
  description:
    '<p>You have learned to sustain the singularity field far beyond its normal duration, and expanded its gravitational reach.</p>'
    + '<p>Singularity\'s radius increases to <strong>25 feet</strong> (up from 15 feet). The singularity persists for <strong>2 rounds</strong> instead of 1, affecting creatures at the start of each round. Creatures remain Grabbed until they succeed on a check to break free.</p>'
    + '<p><em>Prerequisite: Singularity. Classes: Adept.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meUpgradeNova0000',  // 16 ✓
  name:    'Nova Upgrade',
  slug:    'me-upgrade-nova',
  category: 'class',
  img:     'icons/magic/light/explosion-star-glow-silhouette.webp',
  level:   10,
  prereqs: ['Nova'],
  description:
    '<p>You channel every ounce of your biotic reserves into a catastrophic release of mass effect energy.</p>'
    + '<p>Nova\'s burst radius increases to <strong>20 feet</strong> (up from 10 feet). The damage increases to <strong>4d8 force</strong> (up from 2d8). Critical failures also cause targets to be knocked Prone.</p>'
    + '<p><em>Prerequisite: Nova. Classes: Vanguard.</em></p>',
}));

// ── SOLDIER CAPSTONES ─────────────────────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:      'meSoldierHvyWep0',  // 16 ✓
  name:    'Heavy Weapon Training',
  slug:    'me-soldier-heavy-weapon-training',
  category: 'class',
  img:     'icons/weapons/artillery/cannon-barrel-black.webp',
  level:   12,
  prereqs: ['Weapon Mastery (Assault Rifles)', 'Weapon Mastery (Shotguns)'],
  traits:  [],
  rules: [
    { key: 'FlatModifier', selector: 'strike-damage', type: 'circumstance', value: 2, predicate: ['item:group:bomb'], label: 'Heavy Weapon Training' },
  ],
  description:
    '<p>You\'ve mastered the art of carrying and operating the heaviest weapons in the Alliance\'s arsenal.</p>'
    + '<p>You gain proficiency with <strong>heavy weapons</strong> (bomb group). You deal <strong>+2 damage</strong> with heavy weapon attacks. Heavy weapons consume Power Cells (tracked as a separate consumable).</p>'
    + '<p><em>Prerequisite: Weapon Mastery (Assault Rifles) or Weapon Mastery (Shotguns). Classes: Soldier.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meSoldierTacRlod',  // 16 ✓
  name:    'Tactical Reload',
  slug:    'me-soldier-tactical-reload',
  category: 'class',
  img:     'icons/weapons/ammunition/bullets-cartridge-shell-gray.webp',
  level:   12,
  prereqs: ['Improved Combat Training'],
  description:
    '<p>Combat reflexes honed through thousands of engagements let you reload without breaking your rhythm.</p>'
    + '<p>Once per round, you may <strong>reload a weapon as a free action</strong>. This can be used to reload during a multi-attack sequence.</p>'
    + '<p><em>Prerequisite: Improved Combat Training. Classes: Soldier.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meSoldierDevRnds',  // 16 ✓
  name:    'Devastating Rounds',
  slug:    'me-soldier-devastating-rounds',
  category: 'class',
  img:     'icons/weapons/ammunition/bullets-cartridge-brass.webp',
  level:   14,
  prereqs: ['Ammo Master'],
  description:
    '<p>Your deep familiarity with ammo types lets you push each round to its absolute limits.</p>'
    + '<p>Each ammo power you have active deals <strong>+1 additional damage die</strong> of its type (stacks with Ammo Master\'s bonus, for +2 total additional dice).</p>'
    + '<p><em>Prerequisite: Ammo Master. Classes: Soldier.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meSoldierSuppFir',  // 16 ✓
  name:    'Suppressing Fire',
  slug:    'me-soldier-suppressing-fire',
  category: 'class',
  img:     'icons/skills/ranged/arrow-flying-gray.webp',
  level:   14,
  prereqs: ['Master Combat Training'],
  description:
    '<p>A sustained barrage of fire forces enemies to keep their heads down even when you miss.</p>'
    + '<p>Whenever you make <strong>3 or more Strikes</strong> in a single turn, all enemies you missed with any of those Strikes are <strong>Flat-Footed</strong> until the start of your next turn.</p>'
    + '<p><em>Prerequisite: Master Combat Training. Classes: Soldier.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meSoldierBatCmdr',  // 16 ✓
  name:    'Battlefield Commander',
  slug:    'me-soldier-battlefield-commander',
  img:     'icons/skills/social/intimidation-impressing.webp',
  level:   16,
  actions: 2,
  prereqs: ['Master Combat Training'],
  description:
    '<p>Your experience reading combat situations lets you coordinate allies with a few shouted commands and hand signals.</p>'
    + '<p>All allies within <strong>30 feet</strong> who can hear or see you gain a <strong>+1 status bonus to their next attack roll</strong> made before the start of your next turn.</p>'
    + '<p><em>Prerequisite: Master Combat Training. Classes: Soldier.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meSoldierLgndCbt',  // 16 ✓
  name:    'Legendary Combat',
  slug:    'me-soldier-legendary-combat',
  category: 'class',
  img:     'icons/skills/melee/sword-shield-stylized-blue.webp',
  level:   18,
  prereqs: ['Master Combat Training'],
  rules: [
    { key: 'FlatModifier', selector: 'strike-damage', value: 2, label: 'Legendary Combat' },
    { key: 'FlatModifier', selector: 'attack-roll', type: 'circumstance', value: 2, label: 'Legendary Combat' },
  ],
  description:
    '<p>You have reached the pinnacle of personal combat effectiveness. You deal an additional <strong>+2 damage</strong> on all Strikes (stacks with the Combat Training chain) and gain a <strong>+2 circumstance bonus to attack rolls</strong>. Critical hits you score ignore <strong>5 points</strong> of the target\'s damage resistance.</p>'
    + '<p><em>Prerequisite: Master Combat Training. Classes: Soldier.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meSoldierWarMach',  // 16 ✓
  name:    'War Machine',
  slug:    'me-soldier-war-machine',
  category: 'class',
  img:     'icons/equipment/chest/breastplate-banded-steel-grey.webp',
  level:   20,
  prereqs: ['Devastating Rounds'],
  description:
    '<p>You are a one-person army. Your weapons, your ammo, and your will are all operating at maximum capacity.</p>'
    + '<p>Your active ammo powers each deal <strong>+2 additional damage dice</strong> (replaces Devastating Rounds\' +2 total). You can maintain <strong>two different ammo powers simultaneously</strong> — both effects apply to every Strike.</p>'
    + '<p><em>Prerequisite: Devastating Rounds. Classes: Soldier.</em></p>',
}));

// ── ENGINEER CAPSTONES ────────────────────────────────────────────────────────

ITEMS.push(makeActionFeat({
  id:      'meEngineerSysOvr',  // 16 ✓
  name:    'System Override',
  slug:    'me-engineer-system-override',
  img:     'icons/magic/lightning/bolt-strike-blue.webp',
  level:   12,
  actions: 3,
  prereqs: ['AI Hacking'],
  traits:  ['tech'],
  description:
    '<p>You hack deeper into an enemy\'s nervous system or control chip than standard AI Hacking allows, affecting even organic targets.</p>'
    + '<p>Choose a creature within <strong>30 feet</strong>. It must attempt a <strong>Will</strong> save against your class DC.</p>'
    + '<p><strong>Critical Success:</strong> Unaffected.</p>'
    + '<p><strong>Success:</strong> The target is <strong>Stunned 1</strong>.</p>'
    + '<p><strong>Failure:</strong> The target is <strong>Stunned 2</strong> and takes <strong>3d6 electricity</strong> damage.</p>'
    + '<p><strong>Critical Failure:</strong> The target is <strong>Stunned 3</strong>, takes 6d6 electricity damage, and acts as if affected by AI Hacking for 1 round.</p>'
    + '<p>Works on organic and synthetic creatures alike.</p>'
    + '<p><em>Prerequisite: AI Hacking. Classes: Engineer.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meEngineerTechFl',  // 16 ✓
  name:    'Tech Field',
  slug:    'me-engineer-tech-field',
  img:     'icons/magic/lightning/orb-lightning-bolt-blue.webp',
  level:   12,
  actions: 2,
  prereqs: ['Improved Tech Mastery'],
  traits:  ['tech'],
  description:
    '<p>You deploy a stationary electromagnetic disruption field that continuously drains kinetic shields in the area.</p>'
    + '<p>Deploy a <strong>15-foot burst</strong> field at a point within 30 feet. The field persists for <strong>1 minute</strong> or until destroyed (AC 14, HP equal to twice your level). Each round at the start of your turn, all shielded creatures in the field lose <strong>5 shield HP</strong> (no save). Unshielded creatures take 1d4 electricity damage per round.</p>'
    + '<p><em>Prerequisite: Improved Tech Mastery. Classes: Engineer.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meEngineerOvldNt',  // 16 ✓
  name:    'Overload Network',
  slug:    'me-engineer-overload-network',
  category: 'class',
  img:     'icons/magic/lightning/bolt-strike-blue.webp',
  level:   14,
  prereqs: ['Overload Upgrade'],
  traits:  ['tech'],
  description:
    '<p>Your overload signal broadcasts across all EM-vulnerable systems simultaneously.</p>'
    + '<p>When Overload destroys a kinetic shield, it chains to <strong>all shielded targets within 15 feet</strong> (not just one), dealing half damage to each. Each additional target must also save or be Stunned 1.</p>'
    + '<p><em>Prerequisite: Overload Upgrade. Classes: Engineer.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meEngineerDrnCmd',  // 16 ✓
  name:    'Drone Commander',
  slug:    'me-engineer-drone-commander',
  category: 'class',
  img:     'icons/magic/lightning/orb-lightning-bolt-blue.webp',
  level:   14,
  prereqs: ['Combat Drone Upgrade'],
  traits:  ['tech'],
  description:
    '<p>Your command protocols can run two drone instances simultaneously without interference.</p>'
    + '<p>You may have <strong>two Combat Drones active at the same time</strong>. Deploying a second drone doesn\'t end the first. Each drone acts independently on your turn.</p>'
    + '<p><em>Prerequisite: Combat Drone Upgrade. Classes: Engineer.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meEngineerOmniGr',  // 16 ✓
  name:    'Omni-Grenade',
  slug:    'me-engineer-omni-grenade',
  img:     'icons/magic/fire/explosion-fireball-large-orange.webp',
  level:   16,
  actions: 2,
  prereqs: ['Master Tech Mastery'],
  traits:  ['tech', 'fire', 'electricity'],
  description:
    '<p>You synthesize a custom explosive payload on the fly, combining incendiary and electromagnetic charges in a single devastating burst.</p>'
    + '<p>Target a point within <strong>30 feet</strong>. All creatures in a <strong>15-foot burst</strong> must attempt a <strong>Reflex</strong> DC 22 save.</p>'
    + '<p><strong>Critical Success:</strong> Unaffected.</p>'
    + '<p><strong>Success:</strong> Half damage.</p>'
    + '<p><strong>Failure:</strong> <strong>4d6 fire + 4d6 electricity</strong> damage. Electricity damage is doubled against shields.</p>'
    + '<p><strong>Critical Failure:</strong> <strong>8d6 fire + 8d6 electricity</strong> damage; Stunned 1.</p>'
    + '<p><em>Prerequisite: Master Tech Mastery. Classes: Engineer.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meEngineerNetSdn',  // 16 ✓
  name:    'Network Shutdown',
  slug:    'me-engineer-network-shutdown',
  img:     'icons/magic/lightning/bolt-strike-blue.webp',
  level:   18,
  actions: 3,
  prereqs: ['System Override'],
  traits:  ['tech'],
  description:
    '<p>You broadcast a catastrophic shutdown signal across all synthetic systems in the area, freezing them mid-operation.</p>'
    + '<p>All <strong>synthetic</strong> enemies within <strong>30 feet</strong> must attempt a <strong>Will</strong> DC 22 save.</p>'
    + '<p><strong>Success:</strong> Stunned 1.</p>'
    + '<p><strong>Failure:</strong> Stunned 2 and take 4d6 electricity damage.</p>'
    + '<p><strong>Critical Failure:</strong> Stunned 3 and take 8d6 electricity damage; can\'t use tech abilities for 1 round.</p>'
    + '<p><em>Prerequisite: System Override. Classes: Engineer.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meEngineerApxEng',  // 16 ✓
  name:    'Apex Engineer',
  slug:    'me-engineer-apex-engineer',
  category: 'class',
  img:     'icons/equipment/wrist/bracer-runed-steel-orange.webp',
  level:   20,
  prereqs: ['Master Tech Mastery'],
  traits:  ['tech'],
  rules: [
    { key: 'FlatModifier', selector: 'strike-damage', type: 'circumstance', value: 2, label: 'Apex Engineer' },
  ],
  description:
    '<p>Your mastery of omni-tool tech is without parallel. Every system you touch becomes a weapon.</p>'
    + '<p>All tech powers you use deal <strong>+1d6 electricity damage</strong> in addition to their normal effects. Once per round, the first tech power you use costs <strong>0 actions</strong> (free action). You also deal <strong>+2 damage</strong> with all weapon Strikes (passive omni-field amplification).</p>'
    + '<p><em>Prerequisite: Master Tech Mastery. Classes: Engineer.</em></p>',
}));

// ── ADEPT CAPSTONES ───────────────────────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:      'meAdeptBioticRes',  // 16 ✓
  name:    'Biotic Resonance',
  slug:    'me-adept-biotic-resonance',
  category: 'class',
  img:     'icons/magic/light/orb-shining-teal.webp',
  level:   12,
  prereqs: ['Improved Biotic Mastery'],
  traits:  ['biotic'],
  description:
    '<p>Your constant biotic activity creates a persistent resonance field that amplifies the damage output of your powers.</p>'
    + '<p>All biotic powers you use that deal damage deal an additional <strong>+1d6 void damage</strong>.</p>'
    + '<p><em>Prerequisite: Improved Biotic Mastery. Classes: Adept.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meAdeptWarpField',  // 16 ✓
  name:    'Warp Field',
  slug:    'me-adept-warp-field',
  img:     'icons/magic/unholy/orb-glowing-purple.webp',
  level:   14,
  actions: 2,
  prereqs: ['Warp Upgrade'],
  traits:  ['biotic'],
  description:
    '<p>You generate a sustained dark energy aura that continuously destabilizes everything around you.</p>'
    + '<p>You project a <strong>15-foot warp aura</strong> for <strong>1 minute</strong>. At the start of each of your turns, all enemies within the aura take <strong>1d4 void damage</strong> and must succeed on a <strong>Fortitude</strong> save (DC = your class DC) or become Flat-Footed until the start of your next turn. Dismiss as a free action.</p>'
    + '<p><em>Prerequisite: Warp Upgrade. Classes: Adept.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meAdeptGravWell0',  // 16 ✓
  name:    'Gravity Well',
  slug:    'me-adept-gravity-well',
  category: 'class',
  img:     'icons/magic/control/debuff-chains-blue.webp',
  level:   14,
  prereqs: ['Singularity Upgrade'],
  traits:  ['biotic'],
  description:
    '<p>The singularity fields you generate have grown powerful enough to distort space itself on a larger scale.</p>'
    + '<p>Singularity\'s radius increases to <strong>25 feet</strong> (replaces Singularity Upgrade\'s 20 ft). Any creature entering the field for the first time must succeed on a Reflex save or be <strong>Grabbed</strong> immediately. Creatures already inside are <strong>Slowed 1</strong> while within the field.</p>'
    + '<p><em>Prerequisite: Singularity Upgrade. Classes: Adept.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meAdeptBioCascd0',  // 16 ✓
  name:    'Biotic Cascade',
  slug:    'me-adept-biotic-cascade',
  category: 'class',
  img:     'icons/magic/light/explosion-star-glow-silhouette.webp',
  level:   16,
  prereqs: ['Biotic Resonance'],
  traits:  ['biotic'],
  description:
    '<p>When you detonate a Biotic Explosion, the shockwave propagates to nearby enemies, punishing tight formations.</p>'
    + '<p>Whenever you trigger a Biotic Explosion, <strong>one adjacent enemy within 10 feet</strong> of the original target also takes the <strong>full explosion damage</strong> (no save). The adjacent enemy must be a different creature than the primary target.</p>'
    + '<p><em>Prerequisite: Biotic Resonance. Classes: Adept.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meAdeptDarkMattr',  // 16 ✓
  name:    'Dark Matter',
  slug:    'me-adept-dark-matter',
  category: 'class',
  img:     'icons/magic/unholy/orb-glowing-purple.webp',
  level:   18,
  prereqs: ['Master Biotic Mastery'],
  traits:  ['biotic'],
  description:
    '<p>You have unlocked a deeper understanding of dark energy manipulation, pushing your biotic abilities beyond any recorded limit.</p>'
    + '<p>All biotic power save DCs you use increase by <strong>2</strong>. Your biotic damage ignores up to <strong>5 points</strong> of void damage resistance. Enemies that critically fail saves against your biotic powers become <strong>Frightened 2</strong> in addition to normal effects.</p>'
    + '<p><em>Prerequisite: Master Biotic Mastery. Classes: Adept.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meAdeptAscenForm',  // 16 ✓
  name:    'Ascendant Form',
  slug:    'me-adept-ascendant-form',
  img:     'icons/magic/light/explosion-star-glow-silhouette.webp',
  level:   20,
  actions: 1,
  prereqs: ['Dark Matter'],
  traits:  ['biotic'],
  description:
    '<p><strong>Frequency:</strong> Once per day.</p>'
    + '<p>You shed the limitations of normal biotic operation and enter a state of pure mass-effect resonance for <strong>1 minute</strong>.</p>'
    + '<p>While in Ascendant Form: all biotic powers you use are <strong>free actions</strong>; all biotic powers deal <strong>+1 damage die</strong>; you float 5 feet off the ground (ignore ground-based difficult terrain); you are immune to the Grabbed, Prone, and Immobilized conditions. Dismiss as a free action.</p>'
    + '<p><em>Prerequisite: Dark Matter. Classes: Adept.</em></p>',
}));

// ── VANGUARD CAPSTONES ────────────────────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:      'meVanguardUnstCg',  // 16 ✓
  name:    'Unstoppable Charge',
  slug:    'me-vanguard-unstoppable-charge',
  category: 'class',
  img:     'icons/magic/movement/abstract-ribbons-blue-purple.webp',
  level:   12,
  prereqs: ['Charge Upgrade'],
  traits:  ['biotic'],
  description:
    '<p>Your biotic charge has evolved into a wall-shattering force of nature that nothing can stop or slow.</p>'
    + '<p>Charge ignores <strong>difficult terrain</strong> and <strong>cannot be interrupted</strong> by reactions or effects triggered by your movement. The push distance increases to <strong>20 feet</strong>. Charge now restores <strong>25% of your maximum shield HP</strong> on a hit (up from 0).</p>'
    + '<p><em>Prerequisite: Charge Upgrade. Classes: Vanguard.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meVanguardBioWar',  // 16 ✓
  name:    'Biotic Warrior',
  slug:    'me-vanguard-biotic-warrior',
  category: 'class',
  img:     'icons/magic/movement/abstract-ribbons-blue-purple.webp',
  level:   12,
  prereqs: ['Charge'],
  traits:  ['biotic'],
  description:
    '<p>You have learned to channel your biotic field directly through your fists, making you deadly even when unarmed.</p>'
    + '<p>Your unarmed Strikes deal <strong>1d8 bludgeoning + 1d6 void</strong> damage and gain the <em>agile</em> and <em>finesse</em> traits. On a critical hit with an unarmed Strike, the target is pushed 5 feet and knocked Prone.</p>'
    + '<p><em>Prerequisite: Charge. Classes: Vanguard.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meVanguardVngStr',  // 16 ✓
  name:    'Vanguard Strike',
  slug:    'me-vanguard-vanguard-strike',
  img:     'icons/magic/movement/abstract-ribbons-blue-purple.webp',
  level:   14,
  actions: 3,
  prereqs: ['Nova Upgrade'],
  traits:  ['biotic'],
  description:
    '<p>You combine Charge and Nova into a single devastating sequence that recharges your defenses through pure momentum.</p>'
    + '<p>Charge into an enemy within 60 feet. Immediately after arriving, unleash Nova as a free action (this Nova does not expend a barrier charge). Your shields are restored to <strong>50% of maximum</strong>. Targets hit by both Charge and Nova take the full damage of each.</p>'
    + '<p><em>Prerequisite: Nova Upgrade. Classes: Vanguard.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meVanguardRmpge0',  // 16 ✓
  name:    'Rampage',
  slug:    'me-vanguard-rampage',
  category: 'class',
  img:     'icons/magic/movement/abstract-ribbons-blue-purple.webp',
  level:   16,
  prereqs: ['Unstoppable Charge'],
  traits:  ['biotic'],
  description:
    '<p>Your Charge carries such momentum that you naturally transition into a devastating follow-up strike.</p>'
    + '<p>Immediately after a successful Charge, you may make <strong>one free shotgun Strike</strong> against the same target as a free action. This Strike doesn\'t count toward your multiple attack penalty for the round.</p>'
    + '<p><em>Prerequisite: Unstoppable Charge. Classes: Vanguard.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meVanguardDthEmb',  // 16 ✓
  name:    "Death's Embrace",
  slug:    'me-vanguard-deaths-embrace',
  img:     'icons/magic/movement/abstract-ribbons-blue-purple.webp',
  level:   18,
  actions: null,
  actionType: 'reaction',
  prereqs: ['Vanguard Strike'],
  traits:  ['biotic'],
  description:
    '<p><strong>Trigger:</strong> You would be reduced to 0 HP.</p>'
    + '<p>You refuse to fall. Instead of going down, you immediately Charge the nearest enemy within 60 feet as a reaction. You arrive at the target\'s location with <strong>1 HP</strong> and your shields restored to <strong>full</strong>. If no valid target exists within 60 feet, this ability does not trigger.</p>'
    + '<p><em>Prerequisite: Vanguard Strike. Classes: Vanguard.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meVanguardApexVg',  // 16 ✓
  name:    'Apex Vanguard',
  slug:    'me-vanguard-apex-vanguard',
  category: 'class',
  img:     'icons/magic/movement/abstract-ribbons-blue-purple.webp',
  level:   20,
  prereqs: ["Death's Embrace"],
  traits:  ['biotic'],
  description:
    '<p>You are a living weapon, an unstoppable force of biotic aggression at the absolute peak of Vanguard capability.</p>'
    + '<p>Charge restores your shields to <strong>full</strong> (up from 50% with Unstoppable Charge). Nova can be used <strong>twice per turn</strong> without expending a barrier charge the second time. Your Rampage free Strike also gains the +2d6 precision damage bonus from Biotic Warrior if you are in melee range.</p>'
    + '<p><em>Prerequisite: Death\'s Embrace. Classes: Vanguard.</em></p>',
}));

// ── INFILTRATOR CAPSTONES ─────────────────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:      'meInfiltratGhost',  // 16 ✓
  name:    'Ghost Protocol',
  slug:    'me-infiltrator-ghost-protocol',
  category: 'class',
  img:     'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
  level:   12,
  prereqs: ['Tactical Cloak Upgrade'],
  traits:  ['tech'],
  description:
    '<p>Advanced field harmonics keep your cloaking device stable through multiple weapon discharges.</p>'
    + '<p>Tactical Cloak does not end when you Strike. The cloak remains active until you make your <strong>second Strike</strong> or the start of your next turn (whichever comes first). You may Strike twice from concealment, both attacks gaining the precision damage bonus. The cloak ends automatically after the second Strike.</p>'
    + '<p><em>Prerequisite: Tactical Cloak Upgrade. Classes: Infiltrator.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meInfiltratAssas',  // 16 ✓
  name:    'Assassination Protocol',
  slug:    'me-infiltrator-assassination-protocol',
  category: 'class',
  img:     'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
  level:   12,
  prereqs: ['Ghost Protocol'],
  traits:  ['tech'],
  description:
    '<p>You have optimized your ambush technique to the point of lethal perfection.</p>'
    + '<p>The precision damage bonus from Tactical Cloak increases to <strong>+3d6</strong> per Strike made while cloaked (replaces the base +2d6). Additionally, if your cloaked Strike reduces a target to 0 HP, your Tactical Cloak immediately reactivates at no action cost (once per minute).</p>'
    + '<p><em>Prerequisite: Ghost Protocol. Classes: Infiltrator.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meInfiltratHntMk',  // 16 ✓
  name:    "Hunter's Mark",
  slug:    'me-infiltrator-hunters-mark',
  img:     'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
  level:   14,
  actions: 1,
  prereqs: ['Master Weapon Mastery (Sniper Rifles)'],
  traits:  ['tech'],
  description:
    '<p>You mark a target through your scope, feeding real-time biometric data to your weapon\'s targeting system.</p>'
    + '<p>Designate one creature you can see within 120 feet as your <strong>Marked target</strong>. You deal <strong>+2 damage</strong> against the Marked target with all weapon Strikes, and you always know the Marked target\'s exact location (even if Concealed). The Mark persists until the target is incapacitated or you Mark a new target.</p>'
    + '<p><em>Prerequisite: Master Weapon Mastery (Sniper Rifles). Classes: Infiltrator.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meInfiltratPhnm0',  // 16 ✓
  name:    'Phantom Protocol',
  slug:    'me-infiltrator-phantom-protocol',
  category: 'class',
  img:     'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
  level:   16,
  prereqs: ['Ghost Protocol'],
  traits:  ['tech'],
  description:
    '<p>Your cloaking device can reinitiate automatically when a kill provides the brief opening needed to recalibrate.</p>'
    + '<p>Once per encounter, when you reduce an enemy to 0 HP, <strong>Tactical Cloak automatically reactivates</strong> as a free action. This can occur even if Tactical Cloak is currently on cooldown.</p>'
    + '<p><em>Prerequisite: Ghost Protocol. Classes: Infiltrator.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meInfiltratDthAb',  // 16 ✓
  name:    'Death From Above',
  slug:    'me-infiltrator-death-from-above',
  category: 'class',
  img:     'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
  level:   18,
  prereqs: ['Assassination Protocol'],
  traits:  ['tech'],
  description:
    '<p>A critical strike made from the shadows carries terrifying force multipliers that push damage beyond the edge of comprehension.</p>'
    + '<p>When you score a <strong>critical hit</strong> with a Strike made while Tactical Cloak is active, you deal an additional <strong>2d6 precision damage</strong> (stacks with Assassination Protocol\'s +3d6 for a total of +5d6 on a crit). Enemies that witness this must succeed on a <strong>Will</strong> DC 20 save or become <strong>Frightened 2</strong>.</p>'
    + '<p><em>Prerequisite: Assassination Protocol. Classes: Infiltrator.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meInfiltratApxIn',  // 16 ✓
  name:    'Apex Infiltrator',
  slug:    'me-infiltrator-apex-infiltrator',
  category: 'class',
  img:     'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
  level:   20,
  prereqs: ['Death From Above'],
  traits:  ['tech'],
  description:
    '<p>You have become something beyond human — a ghost, a myth, a phantom that enemies never see coming twice.</p>'
    + '<p>The <strong>first Strike you make each turn</strong> while Tactical Cloak is active is treated as a <strong>critical hit</strong> regardless of the attack roll result (if it would hit). Your Hunter\'s Mark bonus increases to <strong>+4 damage</strong>. Phantom Protocol now triggers on any kill, not just once per encounter.</p>'
    + '<p><em>Prerequisite: Death From Above. Classes: Infiltrator.</em></p>',
}));

// ── SENTINEL CAPSTONES ────────────────────────────────────────────────────────

ITEMS.push(makePassiveFeat({
  id:      'meSentinelHybrid',  // 16 ✓
  name:    'Hybrid Core',
  slug:    'me-sentinel-hybrid-core',
  category: 'class',
  img:     'icons/magic/defensive/shield-barrier-deflect.webp',
  level:   12,
  prereqs: ['Biotic Mastery', 'Tech Mastery'],
  traits:  ['biotic', 'tech'],
  description:
    '<p>Your dual biotic-tech training has fused at a deep level, letting your powers amplify each other when used in sequence.</p>'
    + '<p>When you use a biotic power and then a tech power (or vice versa) within the same turn, your second power deals <strong>+1d6 void damage</strong> in addition to its normal effects. This bonus applies once per turn.</p>'
    + '<p><em>Prerequisite: Biotic Mastery, Tech Mastery. Classes: Sentinel.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meSentinelAdapDf',  // 16 ✓
  name:    'Adaptive Defense',
  slug:    'me-sentinel-adaptive-defense',
  category: 'class',
  img:     'icons/magic/defensive/shield-barrier-deflect.webp',
  level:   12,
  prereqs: ['Tech Armor', 'Fortification'],
  traits:  ['tech'],
  description:
    '<p>Your hybrid conditioning allows your tech and biotic defenses to coexist without interfering with each other.</p>'
    + '<p>Tech Armor and Fortification can both be <strong>active simultaneously</strong>. The combined defensive bonuses apply: Resistance from Fortification reduces damage before Tech Armor\'s AC bonus applies. You may activate and dismiss each independently.</p>'
    + '<p><em>Prerequisite: Tech Armor, Fortification. Classes: Sentinel.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meSentinelIntrfr',  // 16 ✓
  name:    'Interference Field',
  slug:    'me-sentinel-interference-field',
  img:     'icons/magic/defensive/shield-barrier-deflect.webp',
  level:   14,
  actions: 2,
  prereqs: ['Master Tech Mastery'],
  traits:  ['tech'],
  description:
    '<p>You broadcast a broad-spectrum jamming field that disrupts incoming tech-based attacks against your allies.</p>'
    + '<p>You project a <strong>20-foot interference aura</strong> for <strong>1 minute</strong>. The first time each round that any tech power would affect a friendly creature within the aura, it automatically <strong>fails</strong> (the attacker\'s action is wasted). Non-tech attacks and biotic powers are unaffected. Dismiss as a free action.</p>'
    + '<p><em>Prerequisite: Master Tech Mastery. Classes: Sentinel.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meSentinelBatHrd',  // 16 ✓
  name:    'Battle Hardened',
  slug:    'me-sentinel-battle-hardened',
  category: 'class',
  img:     'icons/magic/defensive/shield-barrier-deflect.webp',
  level:   16,
  prereqs: ['Adaptive Defense'],
  traits:  [],
  rules: [
    { key: 'FlatModifier', selector: 'saving-throw', value: 2, label: 'Battle Hardened' },
  ],
  description:
    '<p>Decades of surviving the worst the galaxy has to offer have made you immune to conditions that would break lesser warriors.</p>'
    + '<p>You are <strong>immune to the Stunned, Dazed, and Confused conditions</strong>. You gain a <strong>+2 bonus to all saving throws</strong> (untyped, stacks with other bonuses).</p>'
    + '<p><em>Prerequisite: Adaptive Defense. Classes: Sentinel.</em></p>',
}));

ITEMS.push(makeActionFeat({
  id:      'meSentinelResolv',  // 16 ✓
  name:    "Sentinel's Resolve",
  slug:    'me-sentinel-sentinels-resolve',
  img:     'icons/magic/defensive/shield-barrier-deflect.webp',
  level:   18,
  actions: 2,
  prereqs: ['Battle Hardened'],
  traits:  [],
  description:
    '<p><strong>Frequency:</strong> Once per day.</p>'
    + '<p>You activate every defensive system simultaneously, entering a near-invulnerable combat state.</p>'
    + '<p>For <strong>1 minute</strong>: Resistance to all damage <strong>20</strong>; <strong>+4 circumstance to AC</strong>; all biotic and tech power costs reduced by 1 (minimum 1). Dismiss as a free action.</p>'
    + '<p><em>Prerequisite: Battle Hardened. Classes: Sentinel.</em></p>',
}));

ITEMS.push(makePassiveFeat({
  id:      'meSentinelApexSt',  // 16 ✓
  name:    'Apex Sentinel',
  slug:    'me-sentinel-apex-sentinel',
  category: 'class',
  img:     'icons/magic/defensive/shield-barrier-deflect.webp',
  level:   20,
  prereqs: ["Sentinel's Resolve"],
  traits:  ['biotic', 'tech'],
  description:
    '<p>You are the ultimate expression of the hybrid warrior — a near-perfect fusion of biotic and tech capability wrapped in impenetrable armor.</p>'
    + '<p>Adrenaline Rush and Fortification can both be activated <strong>simultaneously as free actions</strong> (once per round each). The action cost reductions from both Biotic Mastery and Tech Mastery apply to every power. Sentinel\'s Resolve can be used <strong>twice per day</strong>.</p>'
    + '<p><em>Prerequisite: Sentinel\'s Resolve. Classes: Sentinel.</em></p>',
}));

// ── Write files ───────────────────────────────────────────────────────────────

const PACK_DIR = 'src/packs/me-class-progressions';
await mkdir(PACK_DIR, { recursive: true });

for (const item of ITEMS) {
  const filename = item.system.slug
    .replace(/^me-upgrade-/, 'upgrade-')
    .replace(/^me-soldier-/, 'soldier-')
    .replace(/^me-engineer-/, 'engineer-')
    .replace(/^me-adept-/, 'adept-')
    .replace(/^me-vanguard-/, 'vanguard-')
    .replace(/^me-infiltrator-/, 'infiltrator-')
    .replace(/^me-sentinel-/, 'sentinel-')
    + '.json';
  const path = join(PACK_DIR, filename);
  await writeFile(path, JSON.stringify(item, null, 2), 'utf8');
  console.log(`  wrote ${path}`);
}

console.log(`\n✓ Generated ${ITEMS.length} items in ${PACK_DIR}. Run: npm run build`);
