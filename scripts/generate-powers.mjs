// Generates all biotic and tech power feat/effect JSON source files.
// Also removes the redundant ammo *-action.json files (feats are hybrid
// feat-actions and appear in both the Feats panel and Actions tab).
//
// Usage: node scripts/generate-powers.mjs

import { writeFile, mkdir, unlink, access } from 'fs/promises';
import { join } from 'path';

const MODULE_ID = 'mass-effect-sf2e-conversion';

const PUB = {
  title: 'Mass Effect Compendium',
  authors: 'nscarpinatodev',
  license: 'ORC',
  remaster: true,
};

const MIG = { version: 0.955, lastMigration: null, previous: null };

// ── Item factories ────────────────────────────────────────────────────────────

function makeFeat({ id, name, slug, img, level, actions, traits, description, selfEffect }) {
  const item = {
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
      rules: [],
      _migration: MIG,
      traits: { otherTags: [], value: traits, rarity: 'common' },
      publication: PUB,
      level: { value: level },
      prerequisites: { value: [] },
      actionType: { value: 'action' },
      actions: { value: actions },
      category: 'class',
    },
  };
  if (selfEffect) item.system.selfEffect = selfEffect;
  return item;
}

function makeEffect({ id, name, slug, img, description, duration, rules = [], badge = null }) {
  return {
    _key: `!items!${id}`,
    _id: id,
    folder: null,
    name,
    type: 'effect',
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
      duration,
      badge,
    },
  };
}

// ── Biotic powers ─────────────────────────────────────────────────────────────

const BIOTIC_FEATS = [
  makeFeat({
    id: 'meBioticThrow000',
    name: 'Throw',
    slug: 'me-biotic-throw',
    img: 'icons/magic/sonic/projectile-shock-wave-blue.webp',
    level: 2,
    actions: 2,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You project a mass effect field that hurls a creature or object with violent force.</p>'
      + '<p>Choose a creature or unattended object within <strong>60 feet</strong>. The target must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target is pushed 5 feet away from you.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>2d8 bludgeoning</strong> damage and is pushed 10 feet away from you. If pushed into a solid object, the target takes an additional 1d6 bludgeoning damage and is knocked prone.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but 4d8 bludgeoning damage and pushed 20 feet. If pushed into an obstacle, additional 2d6 bludgeoning and knocked prone.</p>',
  }),

  makeFeat({
    id: 'meBioticWarp0000',
    name: 'Warp',
    slug: 'me-biotic-warp',
    img: 'icons/magic/unholy/beam-impact-purple.webp',
    level: 4,
    actions: 2,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You suffuse a creature with destabilizing dark energy that tears apart molecular bonds and prevents regeneration.</p>'
      + '<p>Choose a creature within <strong>60 feet</strong>. The target must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d6 void</strong> damage.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>2d6 void</strong> damage and <strong>1d4 persistent void</strong> damage. The target cannot regain HP until the start of your next turn. Warp damage also deals 1.5× damage to Biotic Barriers.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>4d6 void</strong> damage. If the target has an active Biotic Barrier, it detonates in a dark energy explosion (2d6 void in a 10-foot burst).</p>',
  }),

  makeFeat({
    id: 'meBioticSingulry',
    name: 'Singularity',
    slug: 'me-biotic-singularity',
    img: 'icons/magic/air/wind-vortex-swirl-blue-purple.webp',
    level: 8,
    actions: 3,
    traits: ['biotic', 'concentrate', 'manipulate'],
    description:
      '<p>You create a localized mass effect gravity well that pulls nearby enemies in and suspends them helplessly.</p>'
      + '<p>You create a Singularity at a point within <strong>60 feet</strong>. All creatures within a <strong>20-foot radius</strong> burst centered on that point must attempt a <strong>Reflex</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The creature is pulled 10 feet toward the singularity\'s center.</p>'
      + '<p><strong>Failure</strong> The creature is pulled to the singularity\'s center and becomes <strong>Restrained</strong> (Escape DC equals your class DC). The singularity persists until the start of your next turn; you may Sustain it as a free action each round for up to 1 minute.</p>'
      + '<p><strong>Critical Failure</strong> As failure. Additionally, the creature takes <strong>2d6 bludgeoning</strong> damage at the start of each of its turns while restrained.</p>',
  }),

  makeFeat({
    id: 'meBioticStasis00',
    name: 'Stasis',
    slug: 'me-biotic-stasis',
    img: 'icons/magic/time/clock-analog-gray.webp',
    level: 6,
    actions: 2,
    traits: ['biotic', 'incapacitation', 'manipulate'],
    description:
      '<p>You encase a single target in an impenetrable mass effect stasis field, freezing them completely in place.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Will</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The creature is <strong>Immobilized</strong> until the start of your next turn.</p>'
      + '<p><strong>Failure</strong> The creature is <strong>Paralyzed</strong> until the start of your next turn. At the end of each of its turns, it can attempt a new Will save to end the effect early.</p>'
      + '<p><strong>Critical Failure</strong> The creature is <strong>Paralyzed</strong> for 1 minute. At the end of each of its turns, it can attempt a new Will save (same DC) to end the effect early.</p>',
  }),

  makeFeat({
    id: 'meBioticLift0000',
    name: 'Lift',
    slug: 'me-biotic-lift',
    img: 'icons/magic/movement/pinwheel-turning-blue.webp',
    level: 2,
    actions: 2,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You unleash an anti-gravity sphere that violently hurls nearby creatures into the air, leaving them floating helplessly.</p>'
      + '<p>All creatures in a <strong>10-foot radius</strong> burst within <strong>30 feet</strong> must attempt a <strong>Reflex</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The creature is lifted 5 feet off the ground and becomes <strong>Off-Guard</strong> until the start of your next turn.</p>'
      + '<p><strong>Failure</strong> The creature is lifted 10 feet into the air and becomes <strong>Grabbed</strong> and <strong>Off-Guard</strong> until the start of your next turn. When the effect ends, the creature falls and takes appropriate fall damage.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but the creature is lifted 20 feet and remains suspended until the end of your next turn.</p>',
  }),

  makeFeat({
    id: 'meBioticPull0000',
    name: 'Pull',
    slug: 'me-biotic-pull',
    img: 'icons/magic/control/energy-stream-link-blue.webp',
    level: 2,
    actions: 1,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You project a focused mass effect field that seizes a single target and yanks them toward you.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Reflex</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The creature is pulled 10 feet toward you.</p>'
      + '<p><strong>Failure</strong> The creature is pulled up to 20 feet toward you and becomes <strong>Grabbed</strong> until the start of your next turn. The creature is Off-Guard while grabbed this way.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but the creature is pulled 30 feet. If pulled adjacent to you, it is also <strong>Knocked Prone</strong>.</p>',
  }),

  makeFeat({
    id: 'meBioticCharge00',
    name: 'Charge',
    slug: 'me-biotic-charge',
    img: 'icons/magic/movement/trail-streak-impact-blue.webp',
    level: 4,
    actions: 2,
    traits: ['biotic', 'manipulate', 'move'],
    description:
      '<p>You surround yourself with a biotic field and launch forward in a devastating dash, crashing through enemies with tremendous impact force.</p>'
      + '<p>You move up to <strong>60 feet</strong> in a straight line, passing through the space of a single target. That target must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d6 bludgeoning</strong> damage.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>3d6 bludgeoning</strong> damage and is pushed 10 feet away from you and knocked prone. Your kinetic shields (if any) recharge for 10 HP.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>6d6 bludgeoning</strong> and pushed 20 feet. Shield recharge is 20 HP.</p>',
  }),

  makeFeat({
    id: 'meBioticShockwav',
    name: 'Shockwave',
    slug: 'me-biotic-shockwave',
    img: 'icons/magic/lightning/bolt-strike-purple.webp',
    level: 4,
    actions: 2,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You slam biotic energy into the ground, sending a rolling kinetic shockwave along the surface that topples everything in its path.</p>'
      + '<p>All creatures in a <strong>60-foot line</strong> must attempt a <strong>Reflex</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The creature takes <strong>1d6 bludgeoning</strong> damage.</p>'
      + '<p><strong>Failure</strong> The creature takes <strong>2d6 bludgeoning</strong> damage and is pushed 10 feet away from you.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>4d6 bludgeoning</strong> and also <strong>Knocked Prone</strong>.</p>',
  }),

  makeFeat({
    id: 'meBioticReave000',
    name: 'Reave',
    slug: 'me-biotic-reave',
    img: 'icons/magic/life/ankh-shadow-green.webp',
    level: 6,
    actions: 2,
    traits: ['biotic', 'manipulate', 'healing'],
    description:
      '<p>You drain the vital energy from a foe, siphoning their life force and preventing them from recovering while bolstering your own resilience.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d8 void</strong> damage and cannot regain HP until the start of your next turn.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>2d8 void</strong> damage, cannot regain HP for 1 round, and you regain <strong>1d8 HP</strong>.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>4d8 void</strong> damage, you regain <strong>2d8 HP</strong>, and the target cannot regain HP for 1 minute (or until the end of combat).</p>',
  }),

  makeFeat({
    id: 'meBioticNova0000',
    name: 'Nova',
    slug: 'me-biotic-nova',
    img: 'icons/magic/fire/explosion-fireball-medium-purple-pink.webp',
    level: 8,
    actions: 1,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You discharge all of your biotic barrier energy in a devastating point-blank explosion, obliterating everything around you at the cost of your defenses.</p>'
      + '<p><strong>Requirements</strong> You have an active Biotic Barrier with at least 1 HP remaining.</p>'
      + '<p>You expend your entire Biotic Barrier in a <strong>20-foot emanation</strong>. The damage equals the barrier\'s current HP at the time of detonation. All creatures in the area must attempt a <strong>Reflex</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> Half damage.</p>'
      + '<p><strong>Failure</strong> Full damage and pushed <strong>15 feet</strong> away from you.</p>'
      + '<p><strong>Critical Failure</strong> Double damage, pushed 15 feet, and knocked prone.</p>'
      + '<p>Remove your Biotic Barrier effect after using this power regardless of outcome.</p>',
  }),

  makeFeat({
    id: 'meBioticFlare000',
    name: 'Flare',
    slug: 'me-biotic-flare',
    img: 'icons/magic/light/explosion-star-teal.webp',
    level: 12,
    actions: 3,
    traits: ['biotic', 'concentrate', 'manipulate'],
    description:
      '<p>You gather and compress an enormous sphere of biotic dark energy and hurl it forward in a slow-moving but catastrophically destructive projectile.</p>'
      + '<p>You launch a Flare projectile at a point within <strong>60 feet</strong>. On impact, it detonates in a <strong>15-foot radius</strong> burst. All creatures in the area must attempt a <strong>Reflex</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Half damage.</p>'
      + '<p><strong>Success</strong> Full damage.</p>'
      + '<p><strong>Failure</strong> <strong>6d6 void</strong> damage. Any Biotic Barriers in the area are immediately depleted.</p>'
      + '<p><strong>Critical Failure</strong> <strong>12d6 void</strong> damage, all Biotic Barriers depleted, and targets are knocked prone.</p>',
  }),

  makeFeat({
    id: 'meBioticSlam0000',
    name: 'Slam',
    slug: 'me-biotic-slam',
    img: 'icons/magic/earth/strike-body-stone-crumble.webp',
    level: 6,
    actions: 2,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You seize a target with a biotic field, lift them helplessly into the air, then slam them into the ground with crushing force.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d6 bludgeoning</strong> damage and is moved 5 feet in any direction.</p>'
      + '<p><strong>Failure</strong> The target is lifted 10 feet into the air and then slammed down, taking <strong>3d6 bludgeoning</strong> damage and becoming <strong>Stunned 1</strong> and <strong>Prone</strong>.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>6d6 bludgeoning</strong>, <strong>Stunned 2</strong>, and the target\'s movement speed is halved until the end of its next turn.</p>',
  }),

  makeFeat({
    id: 'meBioticLash0000',
    name: 'Lash',
    slug: 'me-biotic-lash',
    img: 'icons/magic/air/wind-swirl-pink-purple.webp',
    level: 4,
    actions: 2,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You extend a whip-like biotic tendril that snares an enemy and violently yanks them toward you, dealing damage on impact.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Reflex</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d6 bludgeoning</strong> damage.</p>'
      + '<p><strong>Failure</strong> The target is pulled up to <strong>30 feet</strong> toward you and takes <strong>2d6 bludgeoning</strong> damage. If pulled adjacent to you, it is Off-Guard until the start of your next turn.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>4d6 bludgeoning</strong> and the target is also <strong>Grabbed</strong> until the start of your next turn.</p>',
  }),

  makeFeat({
    id: 'meBioticDominate',
    name: 'Dominate',
    slug: 'me-biotic-dominate',
    img: 'icons/magic/control/hypnosis-mesmerism-eye.webp',
    level: 10,
    actions: 3,
    traits: ['biotic', 'incapacitation', 'manipulate', 'mental'],
    description:
      '<p>You reach into an organic creature\'s nervous system with a mass effect field and seize direct control of their actions, turning them against their own allies.</p>'
      + '<p><strong>Requirements</strong> The target must be an organic creature.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Will</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The creature is <strong>Confused</strong> until the end of its next turn.</p>'
      + '<p><strong>Failure</strong> The creature is under your control for 1 round, treating you and your allies as friends and enemies as foes. It uses its actions as you direct. At the end of each of its turns, it can attempt a new Will save to end the effect.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but the effect lasts for 1 minute. The creature is also <strong>Stupefied 2</strong> for the duration.</p>',
  }),

  makeFeat({
    id: 'meBioticDarkChan',
    name: 'Dark Channel',
    slug: 'me-biotic-dark-channel',
    img: 'icons/magic/unholy/beam-ringed-impact-purple.webp',
    level: 8,
    actions: 2,
    traits: ['biotic', 'manipulate'],
    description:
      '<p>You mark a target with a persistent dark energy curse that eats away at them from within — and leaps to a new host when they fall.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d6 void</strong> damage.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>1d6 void</strong> damage and gains <strong>1d6 persistent void</strong> damage (DC 15 flat check to end). When a creature affected by Dark Channel is reduced to 0 HP, the persistent void damage automatically transfers to the nearest enemy within <strong>30 feet</strong>.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>2d6 persistent void</strong> damage (DC 18 flat check to end).</p>',
  }),
];

// ── Tech effects ──────────────────────────────────────────────────────────────

const TECH_EFFECTS = [
  makeEffect({
    id: 'meEffTactCloak00',
    name: 'Tactical Cloak',
    slug: 'me-effect-tactical-cloak',
    img: 'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
    description:
      '<p>You are concealed by a personal cloaking field. You are <strong>Undetected</strong> by all creatures until you make a Strike or the duration expires.</p>'
      + '<p>Your first Strike made while Undetected deals an additional <strong>2d6 precision damage</strong>. Remove this effect after making that Strike.</p>',
    duration: { value: 1, unit: 'rounds', expiry: 'turn-end' },
    rules: [
      {
        key: 'DamageDice',
        selector: 'strike-damage',
        label: 'Tactical Cloak Precision Strike',
        diceNumber: 2,
        dieSize: 'd6',
        damageType: 'precision',
      },
    ],
    badge: null,
  }),

  makeEffect({
    id: 'meEffTechArmor00',
    name: 'Tech Armor',
    slug: 'me-effect-tech-armor',
    img: 'icons/equipment/chest/breastplate-banded-steel-grey.webp',
    description:
      '<p>An energy-reinforced exoskeleton surrounds you, boosting your defenses. You gain a <strong>+2 circumstance bonus to AC</strong>.</p>'
      + '<p>If you take 20 or more damage from a single hit while this effect is active, it detonates: all creatures in a <strong>10-foot emanation</strong> take <strong>2d6 electricity</strong> damage (Reflex DC 18 basic save) and this effect ends. This detonation can be triggered intentionally as a free action on your turn.</p>',
    duration: { value: -1, unit: 'unlimited', expiry: null },
    rules: [
      {
        key: 'FlatModifier',
        selector: 'ac',
        label: 'Tech Armor',
        type: 'circumstance',
        value: 2,
      },
    ],
    badge: null,
  }),

  makeEffect({
    id: 'meEffGethShldBst',
    name: 'Geth Shield Boost',
    slug: 'me-effect-geth-shield-boost',
    img: 'icons/magic/defensive/shield-barrier-glowing-blue.webp',
    description:
      '<p>Geth-derived shield algorithms temporarily double your kinetic shield capacity. Your kinetic shield maximum is doubled until the start of your next turn.</p>'
      + '<p>When this effect expires, your shield HP returns to its normal maximum (any HP above the normal max is lost). The GM should manually update temp HP to reflect the doubled maximum when this effect is applied.</p>',
    duration: { value: 1, unit: 'rounds', expiry: 'turn-start' },
    rules: [],
    badge: null,
  }),

  makeEffect({
    id: 'meEffDefMatrix00',
    name: 'Defense Matrix',
    slug: 'me-effect-defense-matrix',
    img: 'icons/magic/defensive/shield-barrier-deflect-teal.webp',
    description:
      '<p>Protective energy currents reinforce your frame. You gain <strong>resistance 3 to all damage</strong>.</p>'
      + '<p><strong>Purge (Free Action):</strong> You can dismiss Defense Matrix as a free action on your turn. When you do, your kinetic shields immediately restore <strong>15 HP</strong> (the accumulated defensive charge). Remove this effect when purged or when it expires.</p>',
    duration: { value: -1, unit: 'unlimited', expiry: null },
    rules: [
      {
        key: 'Resistance',
        type: 'all',
        value: 3,
        label: 'Defense Matrix',
      },
    ],
    badge: null,
  }),
];

// ── Tech powers ───────────────────────────────────────────────────────────────

const TECH_FEATS = [
  makeFeat({
    id: 'meTechOverload00',
    name: 'Overload',
    slug: 'me-tech-overload',
    img: 'icons/magic/lightning/bolt-strike-blue.webp',
    level: 2,
    actions: 2,
    traits: ['tech', 'electricity', 'manipulate'],
    description:
      '<p>You fire a concentrated electromagnetic pulse that shreds kinetic shields and fries synthetic circuitry.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Reflex</strong> save against your class DC. Electricity damage dealt to kinetic shields is doubled by the shield system.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d8 electricity</strong> damage.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>2d8 electricity</strong> damage. Synthetic or mech creatures take an additional <strong>1d8 electricity</strong> damage.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>4d8 electricity</strong> damage (plus the synthetic bonus). The target is also <strong>Stunned 1</strong>.</p>',
  }),

  makeFeat({
    id: 'meTechDamping000',
    name: 'Damping',
    slug: 'me-tech-damping',
    img: 'icons/magic/light/beam-impact-deflect-teal.webp',
    level: 2,
    actions: 2,
    traits: ['tech', 'manipulate'],
    description:
      '<p>You deploy a proximity mine that emits a dampening pulse, scrambling the neural implants and omni-tool interfaces of all nearby enemies.</p>'
      + '<p>You place a Damping Mine at a point within <strong>30 feet</strong>. All creatures in a <strong>10-foot radius</strong> burst must attempt a <strong>Will</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The creature is <strong>Stupefied 1</strong> until the start of your next turn (it can use Tech and Biotic powers, but at a –1 penalty to DCs and attack rolls with them).</p>'
      + '<p><strong>Failure</strong> The creature cannot use Tech or Biotic powers until the start of your next turn and is <strong>Stupefied 2</strong>.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but the effect lasts until the end of the affected creature\'s next turn.</p>',
  }),

  makeFeat({
    id: 'meTechSabotage00',
    name: 'Sabotage',
    slug: 'me-tech-sabotage',
    img: 'icons/skills/melee/blade-tip-orange.webp',
    level: 4,
    actions: 2,
    traits: ['tech', 'manipulate'],
    description:
      '<p>You hack a synthetic enemy\'s combat VI, turning it against its own allies and causing it to attack everything in sight.</p>'
      + '<p><strong>Requirements</strong> The target must be a synthetic, mech, or drone-type creature.</p>'
      + '<p>Choose a qualifying target within <strong>30 feet</strong>. The target must attempt a <strong>Will</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target is <strong>Confused</strong> until the end of your next turn.</p>'
      + '<p><strong>Failure</strong> The target treats all creatures as enemies and attacks the nearest target each round for 1 round. At the end of each of its turns, it can attempt a new Will save to end the effect.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but the effect lasts for 1 minute. The target also attacks with its maximum damage each round.</p>',
  }),

  makeFeat({
    id: 'meTechAiHacking0',
    name: 'AI Hacking',
    slug: 'me-tech-ai-hacking',
    img: 'icons/magic/control/debuff-chains-green.webp',
    level: 6,
    actions: 3,
    traits: ['tech', 'concentrate', 'incapacitation', 'manipulate'],
    description:
      '<p>You perform a deep hack of a synthetic enemy\'s core AI, fully subverting its combat programming and converting it to fight for your side.</p>'
      + '<p><strong>Requirements</strong> The target must be a synthetic or mech-type creature that is not immune to mental effects.</p>'
      + '<p>Choose a qualifying target within <strong>30 feet</strong>. The target must attempt a <strong>Will</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target is <strong>Stunned 1</strong>.</p>'
      + '<p><strong>Failure</strong> The target becomes your ally for up to <strong>1 minute</strong>, fighting as directed. This effect ends immediately if the target takes damage from one of your allies exceeding 10 HP in a single hit. At the end of each minute, it can attempt a new Will save to end the effect.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but the target also has a +2 circumstance bonus to attack rolls and saving throws while under your control (its combat programming has been maximized).</p>',
  }),

  makeFeat({
    id: 'meTechNeuralShck',
    name: 'Neural Shock',
    slug: 'me-tech-neural-shock',
    img: 'icons/magic/lightning/bolt-strike-sparks-yellow.webp',
    level: 2,
    actions: 2,
    traits: ['tech', 'incapacitation', 'manipulate'],
    description:
      '<p>You fire a targeted bio-electric pulse through a specialized omni-tool attachment that overloads an organic creature\'s nervous system.</p>'
      + '<p><strong>Requirements</strong> The target must be an organic creature.</p>'
      + '<p>Choose a qualifying creature within <strong>30 feet</strong>. The target must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d6 electricity</strong> damage.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>2d6 electricity</strong> damage and is <strong>Stunned 1</strong>.</p>'
      + '<p><strong>Critical Failure</strong> The target takes <strong>4d6 electricity</strong> damage and is <strong>Stunned 3</strong>. Additionally, the target is <strong>Off-Guard</strong> until the end of its next turn even after the Stunned condition expires.</p>',
  }),

  makeFeat({
    id: 'meTechCombatDrn0',
    name: 'Combat Drone',
    slug: 'me-tech-combat-drone',
    img: 'icons/commodities/tech/cog-brass.webp',
    level: 4,
    actions: 3,
    traits: ['tech', 'concentrate', 'manipulate'],
    description:
      '<p>You deploy a hovering AI combat drone that harasses enemies and draws their fire away from your allies.</p>'
      + '<p>You deploy a Combat Drone at a point within <strong>30 feet</strong>. The drone occupies a 5-foot space, has <strong>20 HP</strong>, AC 15, and cannot be healed. It acts on your initiative and persists for up to <strong>1 minute</strong> or until destroyed.</p>'
      + '<p>On each of your turns, you can direct the drone as a free action. The drone\'s presence applies <strong>Off-Guard</strong> to one adjacent enemy of your choice (your choice, once per your turn). As an action, you can order it to make a ranged Strike (+4 attack, 1d6 electricity, 20-foot range) against a target within 30 feet.</p>'
      + '<p>If the drone is destroyed, it explodes in a <strong>5-foot burst</strong> dealing 1d6 electricity damage (Reflex DC 15 basic save).</p>',
  }),

  makeFeat({
    id: 'meTechGethShldBs',
    name: 'Geth Shield Boost',
    slug: 'me-tech-geth-shield-boost',
    img: 'icons/magic/defensive/shield-barrier-glowing-blue.webp',
    level: 2,
    actions: 1,
    traits: ['tech', 'manipulate'],
    description:
      '<p>You activate a geth-derived shield optimization algorithm from your omni-tool, temporarily supercharging your kinetic barrier.</p>'
      + '<p>Your kinetic shield maximum is doubled until the start of your next turn. Immediately set your current temp HP to the doubled maximum. Remove the Geth Shield Boost effect at the start of your next turn and reset temp HP to your normal shield maximum.</p>',
    selfEffect: {
      uuid: `Compendium.${MODULE_ID}.me-tech-powers.Item.meEffGethShldBst`,
      name: 'Geth Shield Boost',
    },
  }),

  makeFeat({
    id: 'meTechArmor00000',
    name: 'Tech Armor',
    slug: 'me-tech-armor',
    img: 'icons/equipment/chest/breastplate-banded-steel-grey.webp',
    level: 4,
    actions: 2,
    traits: ['tech', 'manipulate'],
    description:
      '<p>You activate a hardlight exoskeleton projected from your omni-tool, reinforcing your body with a crackling energy shell that detonates if overwhelmed.</p>'
      + '<p>You gain the Tech Armor effect: <strong>+2 circumstance bonus to AC</strong>. If you take 20 or more damage from a single hit while this effect is active, it detonates — all creatures in a <strong>10-foot emanation</strong> take <strong>2d6 electricity</strong> damage (Reflex DC 18 basic save) and the effect ends. You may also voluntarily detonate it as a free action on your turn.</p>',
    selfEffect: {
      uuid: `Compendium.${MODULE_ID}.me-tech-powers.Item.meEffTechArmor00`,
      name: 'Tech Armor',
    },
  }),

  makeFeat({
    id: 'meTechIncinerat0',
    name: 'Incinerate',
    slug: 'me-tech-incinerate',
    img: 'icons/magic/fire/flame-burning-embers-orange.webp',
    level: 4,
    actions: 2,
    traits: ['tech', 'fire', 'manipulate'],
    description:
      '<p>You launch a superheated plasma projectile from your omni-tool that burns through armor and sets targets ablaze.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Reflex</strong> save against your class DC. Incinerate ignores up to 5 points of fire resistance.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d6 fire</strong> damage.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>2d6 fire</strong> damage and <strong>1d4 persistent fire</strong> damage. The target cannot regain HP until the start of your next turn. Armor Frames hit by Incinerate take 1.5× damage.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but <strong>4d6 fire</strong> damage and <strong>2d4 persistent fire</strong>.</p>',
  }),

  makeFeat({
    id: 'meTechCryoBlast0',
    name: 'Cryo Blast',
    slug: 'me-tech-cryo-blast',
    img: 'icons/magic/water/snowflake-ice-blue-white.webp',
    level: 4,
    actions: 2,
    traits: ['tech', 'cold', 'manipulate'],
    description:
      '<p>You fire a cryogenic burst from your omni-tool that flash-freezes targets in a wide area, slowing their movements.</p>'
      + '<p>All creatures in a <strong>10-foot radius</strong> burst within <strong>30 feet</strong> must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d6 cold</strong> damage.</p>'
      + '<p><strong>Failure</strong> The target takes <strong>2d6 cold</strong> damage and is <strong>Slowed 1</strong> until the end of its next turn.</p>'
      + '<p><strong>Critical Failure</strong> The target takes <strong>4d6 cold</strong> damage and is <strong>Immobilized</strong> until the end of its next turn. If the target is already Slowed, it is Immobilized instead.</p>',
  }),

  makeFeat({
    id: 'meTechTactCloak0',
    name: 'Tactical Cloak',
    slug: 'me-tech-tactical-cloak',
    img: 'icons/magic/perception/eye-ringed-glow-angry-teal.webp',
    level: 6,
    actions: 2,
    traits: ['tech', 'manipulate'],
    description:
      '<p>You activate a personal light-bending cloaking device, becoming completely invisible to enemies while setting up a devastating ambush strike.</p>'
      + '<p>You become <strong>Undetected</strong> by all creatures until the start of your next turn or until you make a Strike, whichever comes first. You gain the Tactical Cloak effect, which adds <strong>+2d6 precision damage</strong> to your first Strike made while Undetected. Remove the effect after making that Strike.</p>',
    selfEffect: {
      uuid: `Compendium.${MODULE_ID}.me-tech-powers.Item.meEffTactCloak00`,
      name: 'Tactical Cloak',
    },
  }),

  makeFeat({
    id: 'meTechEnergyDrn0',
    name: 'Energy Drain',
    slug: 'me-tech-energy-drain',
    img: 'icons/magic/lightning/bolt-strike-forked-blue.webp',
    level: 6,
    actions: 2,
    traits: ['tech', 'electricity', 'manipulate'],
    description:
      '<p>You fire an omni-tool beam that siphons kinetic barrier energy directly from a target and transfers it to your own shields.</p>'
      + '<p>Choose a creature within <strong>30 feet</strong>. The target must attempt a <strong>Fortitude</strong> save against your class DC.</p>'
      + '<p><strong>Critical Success</strong> Unaffected.</p>'
      + '<p><strong>Success</strong> The target takes <strong>1d8 electricity</strong> damage, or loses 10 shield HP if it has an active kinetic shield.</p>'
      + '<p><strong>Failure</strong> Against a shielded target: drain up to <strong>20 HP of shields</strong>; you gain that amount as temp HP (stacking with existing shields, up to your maximum). Against an unshielded target: <strong>2d8 electricity</strong> damage and you regain 10 temp HP.</p>'
      + '<p><strong>Critical Failure</strong> As failure, but drain <strong>40 shield HP</strong> (or 4d8 electricity) and you gain 20 temp HP from the drain.</p>',
  }),

  makeFeat({
    id: 'meTechSentryTrrt',
    name: 'Sentry Turret',
    slug: 'me-tech-sentry-turret',
    img: 'icons/weapons/guns/gun-blunderbuss-bronze.webp',
    level: 4,
    actions: 3,
    traits: ['tech', 'concentrate', 'manipulate'],
    description:
      '<p>You fabricate and deploy a stationary automated turret from your omni-tool that provides sustained suppressive fire.</p>'
      + '<p>You deploy a Sentry Turret at a point within <strong>30 feet</strong>. The turret occupies a 5-foot space, has <strong>30 HP</strong>, AC 14, and cannot move or be healed. It acts on your initiative and persists for up to <strong>1 minute</strong> or until destroyed.</p>'
      + '<p>On each of your turns, the turret automatically fires at the nearest enemy within 60 feet as a free action: ranged Strike (<strong>+6 attack</strong>, <strong>1d8+2 piercing</strong>, 60-foot range). You can direct it to target a specific creature as a free action on your turn.</p>'
      + '<p>If a creature ends its turn within 10 feet of the turret, the turret fires a bonus opportunistic shot (same stats, does not count against its action economy).</p>',
  }),

  makeFeat({
    id: 'meTechDecoy00000',
    name: 'Decoy',
    slug: 'me-tech-decoy',
    img: 'icons/magic/control/silhouette-hold-change-blue.webp',
    level: 2,
    actions: 2,
    traits: ['tech', 'illusion', 'manipulate', 'visual'],
    description:
      '<p>You project a photorealistic holographic duplicate of yourself that draws enemy fire and attention away from your actual position.</p>'
      + '<p>You create a holographic Decoy at a point within <strong>30 feet</strong>. The Decoy mimics your appearance and makes minor movements to appear alive. It has <strong>1 HP</strong> and is destroyed by any damage.</p>'
      + '<p>When an enemy targets you while the Decoy is active, it must succeed on a <strong>DC 17 Perception</strong> check (Seek action) to distinguish you from the Decoy; on a failure it must target the Decoy instead. Enemies that critically succeed become immune to your Decoy for 24 hours.</p>'
      + '<p>The Decoy lasts for <strong>1 minute</strong>, until destroyed, or until you use Decoy again (only one Decoy can be active at a time).</p>',
  }),

  makeFeat({
    id: 'meTechDefDrone00',
    name: 'Defense Drone',
    slug: 'me-tech-defense-drone',
    img: 'icons/magic/lightning/orb-ball-blue.webp',
    level: 6,
    actions: 3,
    traits: ['tech', 'electricity', 'concentrate', 'manipulate'],
    description:
      '<p>You deploy a hovering electrocution drone that follows you and automatically zaps any enemy that ventures too close.</p>'
      + '<p>You deploy a Defense Drone that orbits you. The drone has <strong>10 HP</strong>, is immune to electricity, and cannot move independently (it follows you). It persists for up to <strong>1 minute</strong> or until destroyed.</p>'
      + '<p>At the start of each of your turns, the drone automatically zaps all enemies within <strong>10 feet</strong> of you: each must attempt a <strong>Reflex</strong> DC 18 save or take <strong>1d6 electricity</strong> damage (half on a success).</p>'
      + '<p>Additionally, any enemy that hits you with a melee attack while the drone is active takes <strong>1d4 electricity</strong> damage (no save) as the drone retaliates.</p>',
  }),

  makeFeat({
    id: 'meTechDefMatrix0',
    name: 'Defense Matrix',
    slug: 'me-tech-defense-matrix',
    img: 'icons/magic/defensive/shield-barrier-deflect-teal.webp',
    level: 8,
    actions: 2,
    traits: ['tech', 'manipulate'],
    description:
      '<p>You activate a sophisticated energy matrix from your omni-tool that absorbs incoming damage and can be purged to restore your kinetic shields.</p>'
      + '<p>You gain the Defense Matrix effect: <strong>resistance 3 to all damage</strong>. You can Purge Defense Matrix as a <strong>free action</strong> on your turn to end the effect and immediately restore <strong>15 HP</strong> to your kinetic shields.</p>',
    selfEffect: {
      uuid: `Compendium.${MODULE_ID}.me-tech-powers.Item.meEffDefMatrix00`,
      name: 'Defense Matrix',
    },
  }),
];

// ── Write files ───────────────────────────────────────────────────────────────

const PACK_BIOTIC = 'src/packs/me-biotic-powers';
const PACK_TECH   = 'src/packs/me-tech-powers';

await mkdir(PACK_BIOTIC, { recursive: true });
await mkdir(PACK_TECH,   { recursive: true });

for (const item of BIOTIC_FEATS) {
  const slug = item.system.slug.replace('me-biotic-', '');
  const path = join(PACK_BIOTIC, `${slug}-feat.json`);
  await writeFile(path, JSON.stringify(item, null, 2), 'utf8');
  console.log(`  wrote ${path}`);
}

for (const item of TECH_EFFECTS) {
  const slug = item.system.slug.replace('me-effect-', '');
  const path = join(PACK_TECH, `${slug}-effect.json`);
  await writeFile(path, JSON.stringify(item, null, 2), 'utf8');
  console.log(`  wrote ${path}`);
}

for (const item of TECH_FEATS) {
  const slug = item.system.slug.replace('me-tech-', '');
  const path = join(PACK_TECH, `${slug}-feat.json`);
  await writeFile(path, JSON.stringify(item, null, 2), 'utf8');
  console.log(`  wrote ${path}`);
}

// ── Remove redundant ammo action files ────────────────────────────────────────
// The feat items are hybrid feat-actions (actionType: action) and already
// appear in both the Feats panel and the Actions tab. The standalone action
// items are redundant and create duplicate names in the compendium.

const AMMO_ACTIONS = [
  'src/packs/me-ammo-powers/incendiary-action.json',
  'src/packs/me-ammo-powers/phasic-action.json',
  'src/packs/me-ammo-powers/disruptor-action.json',
  'src/packs/me-ammo-powers/cryo-action.json',
  'src/packs/me-ammo-powers/warp-action.json',
  'src/packs/me-ammo-powers/armor-piercing-action.json',
  'src/packs/me-ammo-powers/shredder-action.json',
];

for (const file of AMMO_ACTIONS) {
  try {
    await access(file);
    await unlink(file);
    console.log(`  deleted ${file}`);
  } catch {
    console.warn(`  skip (not found): ${file}`);
  }
}

console.log('\n✓ Power generation complete. Run: npm run build');
