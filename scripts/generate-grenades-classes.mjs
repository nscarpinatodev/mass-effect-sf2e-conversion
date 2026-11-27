// Generates grenade consumable items and ME class feat items.
// Usage: node scripts/generate-grenades-classes.mjs

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MODULE_ID = 'mass-effect-sf2e-conversion';

const PUB = {
  title: 'Mass Effect Compendium',
  authors: 'nscarpinatodev',
  license: 'ORC',
  remaster: true,
};

const MIG = { version: 0.955, lastMigration: null, previous: null };

const IDENTIFICATION = (name) => ({
  status: 'identified',
  unidentified: {
    name: `Unknown Item`,
    img: 'systems/pf2e/icons/unidentified_item_icons/held-item.webp',
    data: { description: { value: '' } },
  },
  misidentified: {},
});

// ── Grenade factory ───────────────────────────────────────────────────────────

function makeGrenade({ id, name, slug, img, level, price, traits, description, uses = 3 }) {
  return {
    _key: `!items!${id}`,
    _id: id,
    folder: null,
    name,
    type: 'consumable',
    img,
    effects: [],
    flags: {},
    ownership: { default: 0 },
    system: {
      slug,
      description: { gm: '', value: description },
      rules: [],
      _migration: MIG,
      traits: { otherTags: [], value: traits, rarity: 'common' },
      publication: PUB,
      level: { value: level },
      quantity: 1,
      baseItem: slug,
      bulk: { value: 'L' },
      price: { value: price },
      equipped: { carryType: 'stowed', inSlot: false },
      usage: { value: 'held-in-one-hand' },
      identification: IDENTIFICATION(name),
      subitems: [],
      specific: null,
      consumableType: { value: 'other' },
      uses: { value: uses, max: uses, autoDestroy: true },
      activation: { cost: 2, type: 'action', condition: '' },
    },
  };
}

// ── Class feat factory ────────────────────────────────────────────────────────

function makeClassFeat({ id, name, slug, img, description, rules = [] }) {
  return {
    _key: `!items!${id}`,
    _id: id,
    folder: null,
    name,
    type: 'feat',
    img,
    effects: [],
    flags: {},
    ownership: { default: 0 },
    system: {
      slug,
      description: { gm: '', value: description },
      rules,
      _migration: MIG,
      traits: { otherTags: [], value: [], rarity: 'common' },
      publication: PUB,
      level: { value: 1 },
      prerequisites: { value: [] },
      actionType: { value: 'passive' },
      actions: { value: null },
      category: 'classfeature',
    },
  };
}

// ── Grenades ──────────────────────────────────────────────────────────────────

const GRENADES = [
  makeGrenade({
    id: 'meGrenadeInc0000',
    name: 'Incendiary Grenade',
    slug: 'me-incendiary-grenade',
    img: 'icons/magic/fire/projectile-fireball-orange.webp',
    level: 2,
    price: { gp: 100 },
    traits: ['fire', 'thrown'],
    uses: 3,
    description:
      '<p>A thermite-packed grenade that detonates in a spray of burning gel on impact.</p>'
      + '<p><strong>Throw (2 actions):</strong> Throw at a point within <strong>30 feet</strong>. All creatures in a <strong>10-foot burst</strong> must attempt a <strong>Reflex</strong> DC 17 save.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> Half damage.</p>'
      + '<p><strong>Failure</strong> <strong>2d6 fire</strong> damage and <strong>1d4 persistent fire</strong> damage.</p>'
      + '<p><strong>Critical Failure</strong> <strong>4d6 fire</strong> damage and <strong>2d4 persistent fire</strong> damage.</p>'
      + '<p>Incendiary Grenades apply 1.5× damage to Combat Armor Frames (same as Incendiary Rounds).</p>',
  }),

  makeGrenade({
    id: 'meGrenadeCryo000',
    name: 'Cryo Grenade',
    slug: 'me-cryo-grenade',
    img: 'icons/magic/water/ice-crystal-white.webp',
    level: 2,
    price: { gp: 100 },
    traits: ['cold', 'thrown'],
    uses: 3,
    description:
      '<p>A grenade that releases a cloud of cryogenic gas on detonation, flash-freezing everything in the blast radius.</p>'
      + '<p><strong>Throw (2 actions):</strong> Throw at a point within <strong>30 feet</strong>. All creatures in a <strong>10-foot burst</strong> must attempt a <strong>Fortitude</strong> DC 17 save.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> <strong>1d6 cold</strong> damage.</p>'
      + '<p><strong>Failure</strong> <strong>2d6 cold</strong> damage and the creature is <strong>Slowed 1</strong> until the end of its next turn.</p>'
      + '<p><strong>Critical Failure</strong> <strong>4d6 cold</strong> damage and the creature is <strong>Immobilized</strong> until the end of its next turn.</p>',
  }),

  makeGrenade({
    id: 'meGrenadeArc0000',
    name: 'Arc Grenade',
    slug: 'me-arc-grenade',
    img: 'icons/magic/lightning/orb-ball-spiral-blue.webp',
    level: 2,
    price: { gp: 120 },
    traits: ['electricity', 'thrown'],
    uses: 3,
    description:
      '<p>A grenade packed with an electromagnetic charge that releases a burst of electricity on detonation. Particularly effective against kinetic shields.</p>'
      + '<p><strong>Throw (2 actions):</strong> Throw at a point within <strong>30 feet</strong>. All creatures in a <strong>10-foot burst</strong> must attempt a <strong>Reflex</strong> DC 17 save.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> Half damage.</p>'
      + '<p><strong>Failure</strong> <strong>2d8 electricity</strong> damage.</p>'
      + '<p><strong>Critical Failure</strong> <strong>4d8 electricity</strong> damage and the creature is <strong>Stunned 1</strong>.</p>'
      + '<p>Electricity damage from Arc Grenades is doubled against kinetic shields (handled automatically by the shield system).</p>',
  }),

  makeGrenade({
    id: 'meGrenadeProxMin',
    name: 'Proximity Mine',
    slug: 'me-proximity-mine',
    img: 'icons/weapons/thrown/bomb-detonator.webp',
    level: 1,
    price: { gp: 80 },
    traits: ['thrown'],
    uses: 3,
    description:
      '<p>A pressure-triggered explosive mine that detonates when a creature moves within range. Deploy it defensively or place it in a chokepoint.</p>'
      + '<p><strong>Place (2 actions):</strong> Place the mine at a point within <strong>15 feet</strong>. The mine arms at the start of your next turn. It remains active for 1 hour or until triggered.</p>'
      + '<p><strong>Trigger:</strong> Any creature (enemy or ally) that moves into or through the mine\'s <strong>5-foot space</strong> triggers it. All creatures in a <strong>10-foot burst</strong> must attempt a <strong>Reflex</strong> DC 16 save.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> Half damage.</p>'
      + '<p><strong>Failure</strong> <strong>3d6 bludgeoning</strong> damage and <strong>Knocked Prone</strong>.</p>'
      + '<p><strong>Critical Failure</strong> <strong>6d6 bludgeoning</strong> damage, Knocked Prone, and <strong>Stunned 1</strong>.</p>',
  }),

  makeGrenade({
    id: 'meGrenadeCluster',
    name: 'Cluster Grenade',
    slug: 'me-cluster-grenade',
    img: 'icons/magic/fire/explosion-fireball-large-orange.webp',
    level: 3,
    price: { gp: 150 },
    traits: ['thrown'],
    uses: 3,
    description:
      '<p>A grenade that splits into multiple submunitions mid-air, saturating a wide area with overlapping explosions.</p>'
      + '<p><strong>Throw (2 actions):</strong> Throw at a point within <strong>30 feet</strong>. The grenade splits into 3 submunitions that land in a <strong>20-foot burst</strong>, each covering a <strong>5-foot burst</strong>. Each creature in the overall area must attempt a <strong>Reflex</strong> DC 18 save for each submunition that lands in their space.</p>'
      + '<p><strong>Critical Success</strong> Unaffected (per submunition).</p>'
      + '<p><strong>Success</strong> Half damage (per submunition).</p>'
      + '<p><strong>Failure</strong> <strong>1d6 bludgeoning</strong> damage per submunition (max 3d6).</p>'
      + '<p><strong>Critical Failure</strong> <strong>2d6 bludgeoning</strong> per submunition and Knocked Prone.</p>'
      + '<p>A creature can be hit by at most 3 submunitions.</p>',
  }),

  makeGrenade({
    id: 'meGrenadeLift000',
    name: 'Lift Grenade',
    slug: 'me-lift-grenade',
    img: 'icons/magic/movement/pinwheel-turning-blue.webp',
    level: 4,
    price: { gp: 200 },
    traits: ['thrown'],
    uses: 3,
    description:
      '<p>A grenade packed with a mass effect field generator that triggers a localized anti-gravity burst on detonation, suspending enemies in the air.</p>'
      + '<p><strong>Throw (2 actions):</strong> Throw at a point within <strong>30 feet</strong>. All creatures in a <strong>10-foot burst</strong> must attempt a <strong>Reflex</strong> DC 19 save.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The creature is lifted 5 feet off the ground and is <strong>Off-Guard</strong> until the start of your next turn.</p>'
      + '<p><strong>Failure</strong> The creature is lifted 10 feet into the air and becomes <strong>Grabbed</strong> (by the field) and <strong>Off-Guard</strong> until the end of your next turn. When the effect ends, the creature falls and takes fall damage.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but the creature is lifted 20 feet and suspended until the end of your next turn. This sets up a <em>Biotic Explosion</em> combo (Lifted condition acts as a biotic primer).</p>',
  }),
];

// ── Classes ───────────────────────────────────────────────────────────────────

const CLASSES = [
  makeClassFeat({
    id: 'meClassSoldier00',
    name: 'Soldier',
    slug: 'me-class-soldier',
    img: 'icons/equipment/chest/breastplate-banded-steel-grey.webp',
    rules: [
      {
        key: 'FlatModifier',
        selector: 'hp',
        value: 4,
        label: 'Soldier Durability',
      },
    ],
    description:
      '<p>Masters of combat in every environment, Soldiers rely on weapon proficiency, tactical awareness, and a suite of ammo powers to dominate the battlefield. They eschew biotic and tech powers in favor of being the best shot in any engagement.</p>'
      + '<p><strong>Bonus:</strong> +4 HP from combat conditioning.</p>'
      + '<hr>'
      + '<p><strong>Signature Abilities:</strong> Adrenaline Rush, Concussive Shot, Fortification</p>'
      + '<p><strong>Power Access:</strong> All ammo powers (<em>ME Ammo Powers</em> compendium). Soldiers do not natively access biotic or tech power feats.</p>'
      + '<p><strong>Weapons:</strong> Proficient with all weapon groups — assault rifles, shotguns, sniper rifles, pistols, submachine guns, heavy weapons.</p>'
      + '<p><strong>Armor:</strong> Heavy, medium, and light armor. Heavy armor preferred.</p>'
      + '<p><strong>Playstyle:</strong> Front-line combatant. Soldiers are the most resilient class and the most weapon-versatile. Their ammo powers let them adapt to any enemy type without investing in biotic or tech abilities. In a squad, the Soldier is the one who goes through the front door.</p>',
  }),

  makeClassFeat({
    id: 'meClassEngineer0',
    name: 'Engineer',
    slug: 'me-class-engineer',
    img: 'icons/equipment/wrist/bracer-orange-fancy.webp',
    rules: [
      {
        key: 'FlatModifier',
        selector: 'will',
        type: 'circumstance',
        value: 2,
        label: 'Engineer Systems Knowledge',
      },
    ],
    description:
      '<p>Specialists in technical warfare, Engineers control the battlefield through drone deployment, electronic warfare, and the ability to strip enemy shields and set enemies on fire. They are the definitive tech class, capable of solving almost any tactical problem with the right tool.</p>'
      + '<p><strong>Bonus:</strong> +2 circumstance bonus to Will saves (trained mind, resistant to hacking and mental subversion).</p>'
      + '<hr>'
      + '<p><strong>Signature Abilities:</strong> Combat Drone, Sentry Turret, Incinerate, Overload, AI Hacking, Cryo Blast</p>'
      + '<p><strong>Power Access:</strong> All tech powers (<em>ME Tech Powers</em> compendium). Engineers do not natively access biotic power feats.</p>'
      + '<p><strong>Weapons:</strong> Pistols, submachine guns. Light weapons preferred; heavy weapons and sniper rifles are not standard.</p>'
      + '<p><strong>Armor:</strong> Light and medium armor only. Combat Drone provides area denial that compensates for lighter armor.</p>'
      + '<p><strong>Playstyle:</strong> Force multiplier and control specialist. Engineers rarely trade shots directly — they strip defenses, deploy drones and turrets, and create conditions that the rest of the squad exploits. Best when given time to set up.</p>',
  }),

  makeClassFeat({
    id: 'meClassAdept0000',
    name: 'Adept',
    slug: 'me-class-adept',
    img: 'icons/magic/unholy/orb-swirling-teal.webp',
    rules: [
      {
        key: 'FlatModifier',
        selector: 'fortitude',
        type: 'circumstance',
        value: 2,
        label: 'Biotic Conditioning',
      },
    ],
    description:
      '<p>The most powerful biotic class in the galaxy, Adepts use mass effect fields to dominate, suspend, and destroy enemies with devastating efficiency. Their biotic combos — particularly the Biotic Explosion chain — are the most powerful burst damage in the game.</p>'
      + '<p><strong>Bonus:</strong> +2 circumstance bonus to Fortitude saves (years of biotic conditioning hardens the body against physical trauma).</p>'
      + '<hr>'
      + '<p><strong>Signature Abilities:</strong> Singularity, Warp, Throw, Stasis, Pull, Dark Channel, Dominate</p>'
      + '<p><strong>Power Access:</strong> All biotic powers (<em>ME Biotic Powers</em> compendium). Adepts do not natively access tech power feats.</p>'
      + '<p><strong>Weapons:</strong> Pistols and submachine guns only. Adepts depend on powers, not guns.</p>'
      + '<p><strong>Armor:</strong> Light armor only. Biotic Barrier compensates for the lack of physical protection.</p>'
      + '<p><strong>Playstyle:</strong> Crowd control and combo detonation. An Adept\'s power is in setup — priming multiple enemies simultaneously with Singularity, then detonating with Throw or Warp for cascading Biotic Explosions. Fragile without their barrier up; devastating when they control positioning.</p>',
  }),

  makeClassFeat({
    id: 'meClassVanguard0',
    name: 'Vanguard',
    slug: 'me-class-vanguard',
    img: 'icons/magic/movement/trail-streak-impact-blue.webp',
    rules: [
      {
        key: 'FlatModifier',
        selector: 'reflex',
        type: 'circumstance',
        value: 2,
        label: 'Vanguard Momentum',
      },
    ],
    description:
      '<p>The most aggressive class in the galaxy, Vanguards combine biotic power with close-range weapon mastery. Their signature abilities — Charge and Nova — define a high-risk, high-reward playstyle built around closing distance, overwhelming enemies, and recharging defenses through momentum.</p>'
      + '<p><strong>Bonus:</strong> +2 circumstance bonus to Reflex saves (constant movement and biotic enhancement make Vanguards extremely hard to pin down).</p>'
      + '<hr>'
      + '<p><strong>Signature Abilities:</strong> Charge, Nova, Biotic Barrier, Reave, Pull, Shockwave</p>'
      + '<p><strong>Power Access:</strong> Charge, Nova, Biotic Barrier, and the close-range biotic suite from the <em>ME Biotic Powers</em> compendium. Vanguards have limited access to long-range biotic control powers (no Singularity, limited Warp). No native tech power access.</p>'
      + '<p><strong>Weapons:</strong> Shotguns (primary), pistols (secondary). Vanguards close the distance with Charge and finish with a shotgun burst.</p>'
      + '<p><strong>Armor:</strong> Heavy armor preferred. Vanguards tank through aggression — Charge restores shield HP, Nova is a last resort. They need the HP to survive the approach.</p>'
      + '<p><strong>Playstyle:</strong> Aggressive melee-range biotic fighter. Charge into a group, Nova for point-blank devastation, shotgun any survivors, and rely on Charge\'s shield recharge to stay alive. Extremely effective in close quarters; exposed at range.</p>',
  }),

  makeClassFeat({
    id: 'meClassInfiltrat',
    name: 'Infiltrator',
    slug: 'me-class-infiltrator',
    img: 'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
    rules: [
      {
        key: 'FlatModifier',
        selector: 'stealth',
        type: 'circumstance',
        value: 2,
        label: 'Infiltrator Training',
      },
    ],
    description:
      '<p>Elite marksmen who combine precision weapon skills with just enough tech to gain and exploit an edge. Infiltrators rely on Tactical Cloak to set up devastating precision strikes, then use tech powers to strip defenses and neutralize specific threats.</p>'
      + '<p><strong>Bonus:</strong> +2 circumstance bonus to Stealth checks (trained in concealment and operational silence).</p>'
      + '<hr>'
      + '<p><strong>Signature Abilities:</strong> Tactical Cloak, Incinerate, AI Hacking (or Sabotage), Energy Drain</p>'
      + '<p><strong>Power Access:</strong> Tactical Cloak (core, always available), plus a limited selection of tech powers from the <em>ME Tech Powers</em> compendium — typically one offensive power (Incinerate or Cryo Blast) and one utility/crowd control power (AI Hacking, Sabotage, or Energy Drain). No biotic power access.</p>'
      + '<p><strong>Weapons:</strong> Sniper rifles (primary), pistols and submachine guns (secondary). The Tactical Cloak precision bonus is designed for sniper follow-through.</p>'
      + '<p><strong>Armor:</strong> Light and medium armor. Infiltrators rely on positioning and cloak rather than taking hits.</p>'
      + '<p><strong>Playstyle:</strong> Precision control from range. Cloak to reposition, uncloak for a precision sniper shot (+2d6 from Tactical Cloak), strip one enemy\'s defenses with Incinerate or Energy Drain, and use AI Hacking to remove a synthetic threat from the fight entirely. High single-target damage; low survivability in open combat.</p>',
  }),

  makeClassFeat({
    id: 'meClassSentinel0',
    name: 'Sentinel',
    slug: 'me-class-sentinel',
    img: 'icons/magic/defensive/shield-barrier-deflect-teal.webp',
    rules: [
      {
        key: 'FlatModifier',
        selector: 'saving-throw',
        type: 'circumstance',
        value: 1,
        label: 'Sentinel Conditioning',
      },
    ],
    description:
      '<p>The most defensively robust class in the game, Sentinels combine Tech Armor with a selection of both tech and biotic powers. They sacrifice the peak offensive output of pure specialists in exchange for unmatched survivability and tactical versatility.</p>'
      + '<p><strong>Bonus:</strong> +1 circumstance bonus to all saving throws (combined biotic/tech training creates comprehensive defensive conditioning).</p>'
      + '<hr>'
      + '<p><strong>Signature Abilities:</strong> Tech Armor, Throw, Warp, Overload, Cryo Blast</p>'
      + '<p><strong>Power Access:</strong> A hybrid selection from both <em>ME Biotic Powers</em> and <em>ME Tech Powers</em> compendiums. Sentinels can take biotic powers from the control/debuff suite (Throw, Warp, Stasis) and defensive/utility tech powers (Tech Armor, Overload, Cryo Blast). They do not access the highest-tier powers of either type.</p>'
      + '<p><strong>Weapons:</strong> Assault rifles and shotguns. More weapon-versatile than pure biotic/tech classes.</p>'
      + '<p><strong>Armor:</strong> Medium and heavy armor, supplemented by Tech Armor. The combination makes Sentinels the hardest class to kill outright.</p>'
      + '<p><strong>Playstyle:</strong> Durable generalist. Sentinels don\'t dominate any single tactical dimension but handle every situation adequately. Tech Armor provides a damage-buffer layer on top of regular armor. Throw and Warp enable biotic combos at lower power level, while Overload and Cryo Blast handle shields and crowd control. Best for players who want to be the team\'s anchor rather than its specialist.</p>',
  }),
];

// ── Write files ───────────────────────────────────────────────────────────────

const PACK_GRENADES = 'src/packs/me-grenades';
const PACK_CLASSES  = 'src/packs/me-classes';

await mkdir(PACK_GRENADES, { recursive: true });
await mkdir(PACK_CLASSES,  { recursive: true });

for (const item of GRENADES) {
  const filename = item.system.slug.replace('me-', '') + '.json';
  const path = join(PACK_GRENADES, filename);
  await writeFile(path, JSON.stringify(item, null, 2), 'utf8');
  console.log(`  wrote ${path}`);
}

for (const item of CLASSES) {
  const filename = item.system.slug.replace('me-class-', '') + '.json';
  const path = join(PACK_CLASSES, filename);
  await writeFile(path, JSON.stringify(item, null, 2), 'utf8');
  console.log(`  wrote ${path}`);
}

console.log('\n✓ Grenade and class generation complete. Run: npm run build');
