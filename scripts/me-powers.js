'use strict';
// Each module script runs in its own scope: Foundry loads "scripts" as classic scripts that share one
// global scope, so top-level names like MODULE_ID would collide between files.
(() => {
// ============================================================
// MASS EFFECT POWERS AUTOMATION — Foundry VTT v13
// ------------------------------------------------------------
// Save-based biotic/tech powers stay as feats. Each power's
// description carries a one-click save button:
//
//   @Check[reflex|dc:resolve(@actor.system.attributes.classDC.value)|options:me-power:<slug>]
//
// When the target resolves that save, this script reads the
// outcome from the chat message, looks up the power in the
// registry below, and auto-applies the mapped damage (routed
// through the shield system), persistent damage, and conditions
// to the saving creature.
// ============================================================

const MODULE_ID = 'mass-effect-sf2e-conversion';
const OPT_PREFIX = 'me-power:';

// The system's own flags on a chat message: flags.pf2e under PF2e, flags.sf2e under SF2e.
const sysFlags = (doc) => doc?.flags?.[game.system.id] ?? doc?.flags?.pf2e;

// The system's DamageRoll class. PF2e exposes it on game.pf2e; SF2e only registers it in CONFIG.Dice.rolls.
const DamageRoll = () => game.pf2e?.DamageRoll ?? CONFIG.Dice.rolls.find((r) => r.name === 'DamageRoll');

// ── POWER REGISTRY ──────────────────────────────────────────────────────────
// Keyed by the key in the save button's options (me-power:<key>), which is the
// feat's system.slug for powers. A power may set:
//   area        — damage is rolled once and shared by every creature that saves
//                 against the same use (see AREA_WINDOW_MS)
// Each degree may define:
//   damage      — a typed damage formula, e.g. "2d6[fire]" or "{4d6[fire],4d6[electricity]}".
//                 Dice printed here are the 1st-level dice: every power below except the grenade
//                 items is multiplied by the caster's level (see LEVEL SCALING)
//   scale       — multiplies the rolled damage (0.5 = half, 2 = double, for basic saves)
//   persistent  — { formula, type, dc }  (creates a persistent-damage effect)
//   conditions  — [ "off-guard", "stunned:1", "slowed:1", ... ]  (":" = value)
//   push        — feet the target is moved straight away from the caster's token
//   note        — reminder text shown in the result card (manual rulings)
// Nova: 2d6, plus 1d6 for every 10 HP the barrier held (every 5 until the 2026-11 rebalance).
const novaDice = (barrierHP) => 2 + Math.floor(barrierHP / 10);
const basic = (damage, extra = {}) => ({
  success:         { damage, scale: 0.5, ...extra.success },
  failure:         { damage, ...extra.failure },
  criticalFailure: { damage, scale: 2, ...extra.criticalFailure },
});
const ARMOR_FRAME_NOTE = 'Armor Frames take 1.5× damage from incendiary attacks.';

const POWERS = {
  // ── Grenade items (printed DCs) ──
  'me-grenade-arc': {
    name: 'Arc Grenade', save: 'reflex', area: true,
    degrees: basic('2d8[electricity]', { criticalFailure: { conditions: ['stunned:1'] } }),
  },
  'me-grenade-cryo': {
    name: 'Cryo Grenade', save: 'fortitude', area: true,
    degrees: {
      success:         { damage: '1d6[cold]' },
      failure:         { damage: '2d6[cold]', conditions: ['slowed:1'], note: 'Slowed until the end of its next turn.' },
      criticalFailure: { damage: '4d6[cold]', conditions: ['immobilized'], note: 'Immobilized until the end of its next turn.' },
    },
  },
  'me-grenade-incendiary': {
    name: 'Incendiary Grenade', save: 'reflex', area: true,
    degrees: {
      success:         { damage: '2d6[fire]', scale: 0.5 },
      failure:         { damage: '2d6[fire]', persistent: { formula: '1d4', type: 'fire' }, note: ARMOR_FRAME_NOTE },
      criticalFailure: { damage: '4d6[fire]', persistent: { formula: '2d4', type: 'fire' }, note: ARMOR_FRAME_NOTE },
    },
  },
  'me-grenade-cluster': {
    name: 'Cluster Grenade', save: 'reflex', area: true,
    degrees: basic('1d6[bludgeoning]', {
      success:         { note: 'One submunition. Roll again for each submunition in the creature\'s space (max 3).' },
      failure:         { note: 'One submunition. Roll again for each submunition in the creature\'s space (max 3).' },
      criticalFailure: { conditions: ['prone'], note: 'One submunition. Roll again for each submunition in the creature\'s space (max 3).' },
    }),
  },
  'me-grenade-lift': {
    name: 'Lift Grenade', save: 'reflex',
    degrees: {
      success:         { conditions: ['off-guard'], note: 'Lifted 5 feet; Off-Guard until the start of the thrower\'s next turn.' },
      failure:         { conditions: ['grabbed'], note: 'Lifted 10 feet and held by the field until the end of the thrower\'s next turn, then falls.' },
      criticalFailure: { conditions: ['grabbed'], note: 'Lifted 20 feet and suspended until the end of the thrower\'s next turn.' },
    },
  },
  'me-grenade-proximity-mine': {
    name: 'Proximity Mine', save: 'reflex', area: true,
    degrees: basic('3d6[bludgeoning]', {
      failure:         { conditions: ['prone'] },
      criticalFailure: { conditions: ['prone', 'stunned:1'] },
    }),
  },

  // ── Grenade feats (class DC) ──
  'me-frag-grenade': {
    name: 'Frag Grenade', save: 'reflex', area: true,
    degrees: {
      success:         { damage: '1d6[piercing]' },
      failure:         { damage: '2d6[piercing]', note: 'Speed −10 feet until the end of the thrower\'s next turn.' },
      criticalFailure: { damage: '4d6[piercing]', conditions: ['prone'], note: 'Speed −10 feet until the end of the thrower\'s next turn.' },
    },
  },
  'me-soldier-carnage': {
    name: 'Carnage', save: 'reflex', area: true,                    // 12th-level feat: 8d6 on a failure when gained
    degrees: {
      success:         { damage: '1d6[fire]' },
      failure:         { damage: '2d6[fire]' },
      criticalFailure: { damage: '4d6[fire]' },
    },
  },
  'me-cluster-grenade': {
    name: 'Cluster Grenade', save: 'reflex', area: true,
    degrees: {
      success:         { damage: '1d6[force]' },
      failure:         { damage: '2d6[force]', note: 'Pushed 5 feet away from the burst\'s center.' },
      criticalFailure: { damage: '4d6[force]', conditions: ['prone'], note: 'Pushed 10 feet away from the burst\'s center.' },
    },
  },
  'me-lift-grenade': {
    name: 'Lift Grenade', save: 'reflex', area: true,
    degrees: {
      success:         { conditions: ['off-guard'], note: 'Lifted 5 feet; Off-Guard until the end of the thrower\'s next turn.' },
      failure:         { conditions: ['grabbed'], note: 'Lifted 10 feet. The grab ends at the start of the thrower\'s next turn or on a successful Escape against their class DC.' },
      criticalFailure: { damage: '2d6[void]', conditions: ['grabbed', 'stunned:1'], note: 'Lifted 10 feet. The grab ends at the start of the thrower\'s next turn or on a successful Escape against their class DC.' },
    },
  },
  'me-sticky-grenade': {
    name: 'Sticky Grenade', save: 'reflex', area: true,
    degrees: {
      success:         { damage: '1d6[fire]' },
      failure:         { damage: '2d6[fire]', persistent: { formula: '1d6', type: 'fire', dc: 12 } },
      criticalFailure: { damage: '4d6[fire]', persistent: { formula: '2d6', type: 'fire', dc: 15 } },
    },
  },
  'me-engineer-omni-grenade': {
    name: 'Omni-Grenade', save: 'reflex', area: true,
    degrees: basic('{1d6[fire],1d6[electricity]}', { criticalFailure: { conditions: ['stunned:1'] } }),   // 16th-level feat: 5d6 + 5d6
  },

  // ── Biotic powers ──
  'me-biotic-charge': {
    name: 'Biotic Charge', save: 'reflex', trait: 'biotic',
    // Basic Reflex save: 2d6 at 1st level, +1d6 at 3rd and every 2 levels after; d8s with
    // Heavy Impact. The 50% barrier refill happens on use (see chargeUsed).
    damage: ({ caster }) => {
      const die = caster?.items?.some((i) => i.slug === 'me-vanguard-heavy-impact') ? 'd8' : 'd6';
      return `${1 + Math.ceil((caster?.level ?? 1) / 2)}${die}[bludgeoning]`;
    },
    degrees: {
      success:         { scale: 0.5 },
      failure:         { conditions: ['prone'] },
      criticalFailure: { scale: 2, conditions: ['prone'], casterBarrier: 1, push: 5 },
    },
    // The NPC Charge keeps its own dice, multiplied by level like the other NPC powers
    npc: {
      damage: null,
      degrees: {
        success:         { damage: '1d6[bludgeoning]' },
        failure:         { damage: '3d6[bludgeoning]', conditions: ['prone'] },
        criticalFailure: { damage: '6d6[bludgeoning]', conditions: ['prone'], casterBarrier: 1, push: 5 },
      },
    },
  },
  'me-biotic-dark-channel': {
    name: 'Dark Channel', save: 'fortitude', trait: 'biotic',
    degrees: {
      success:         { damage: '1d6[void]' },
      failure:         { damage: '1d6[void]', persistent: { formula: '1d6', type: 'void', dc: 15 }, note: 'At 0 HP, the persistent void damage jumps to the nearest enemy within 30 feet.' },
      criticalFailure: { damage: '1d6[void]', persistent: { formula: '2d6', type: 'void', dc: 18 }, note: 'At 0 HP, the persistent void damage jumps to the nearest enemy within 30 feet.' },
    },
  },
  'me-biotic-dominate': {
    name: 'Dominate', save: 'will', trait: 'biotic',
    degrees: {
      success:         { conditions: ['confused'], note: 'Confused until the end of its next turn.' },
      failure:         { conditions: ['controlled'], note: 'Controlled for 1 round; a new Will save at the end of each of its turns ends it.' },
      criticalFailure: { conditions: ['controlled', 'stupefied:2'], note: 'Controlled and Stupefied 2 for 1 minute; a new Will save at the end of each of its turns ends it.' },
    },
  },
  'me-biotic-flare': {
    name: 'Flare', save: 'reflex', trait: 'biotic', area: true,
    degrees: {
      criticalSuccess: { damage: '3d6[void]', scale: 0.5 },
      success:         { damage: '3d6[void]' },
      failure:         { damage: '3d6[void]', depleteBarrier: true },
      criticalFailure: { damage: '3d6[void]', scale: 2, depleteBarrier: true, conditions: ['prone'] },
    },
  },
  'me-biotic-lash': {
    name: 'Lash', save: 'reflex', trait: 'biotic',
    degrees: {
      success:         { damage: '1d6[bludgeoning]' },
      failure:         { damage: '2d6[bludgeoning]', note: 'Pulled up to 30 feet toward the caster; Off-Guard until the start of their next turn if it ends adjacent.' },
      criticalFailure: { damage: '4d6[bludgeoning]', conditions: ['grabbed'], note: 'Pulled up to 30 feet toward the caster and Grabbed until the start of their next turn.' },
    },
  },
  'me-biotic-lift': {
    name: 'Lift', save: 'reflex', trait: 'biotic',
    degrees: {
      success:         { conditions: ['off-guard'], note: 'Lifted 5 feet; Off-Guard until the start of the caster\'s next turn.' },
      failure:         { conditions: ['grabbed'], note: 'Lifted 10 feet until the start of the caster\'s next turn, then falls.' },
      criticalFailure: { conditions: ['grabbed'], note: 'Lifted 20 feet and suspended until the end of the caster\'s next turn, then falls.' },
    },
  },
  'me-biotic-nova': {
    name: 'Nova', save: 'fortitude', trait: 'biotic', area: true,
    // each detonation rolls its own damage, however soon the next one comes
    useKey: ({ caster }) => caster?.getFlag(MODULE_ID, 'novaAt') ?? '',
    // 2d6, +1d6 per 10 HP the barrier held when Nova was used (recorded by the Nova hook below)
    damage: ({ caster }) => {
      const hp = caster?.getFlag(MODULE_ID, 'novaCharge');
      return hp > 0 ? `${novaDice(hp)}d6[force]` : null;
    },
    degrees: {
      success:         { scale: 0.5 },
      failure:         { push: 5 },
      criticalFailure: { scale: 2, conditions: ['prone'], push: 10 },
    },
  },
  'me-biotic-pull': {
    name: 'Pull', save: 'reflex', trait: 'biotic',
    degrees: {
      success:         { note: 'Pulled 10 feet toward the caster.' },
      failure:         { conditions: ['grabbed'], note: 'Pulled up to 20 feet toward the caster; Grabbed until the start of their next turn.' },
      criticalFailure: { conditions: ['grabbed'], note: 'Pulled 30 feet; knocked Prone too if it ends adjacent to the caster.' },
    },
  },
  'me-biotic-reave': {
    name: 'Reave', save: 'fortitude', trait: 'biotic',
    degrees: {
      success:         { damage: '1d8[void]', note: 'Cannot regain HP until the start of the caster\'s next turn.' },
      failure:         { damage: '2d8[void]', casterHeal: '1d8', note: 'Cannot regain HP for 1 round.' },
      criticalFailure: { damage: '4d8[void]', casterHeal: '2d8', note: 'Cannot regain HP for 1 minute.' },
    },
  },
  'me-biotic-shockwave': {
    name: 'Shockwave', save: 'reflex', trait: 'biotic', area: true,
    degrees: {
      success:         { damage: '1d6[bludgeoning]' },
      failure:         { damage: '2d6[bludgeoning]', note: 'Pushed 10 feet away from the caster.' },
      criticalFailure: { damage: '4d6[bludgeoning]', conditions: ['prone'], note: 'Pushed 10 feet away from the caster.' },
    },
  },
  'me-biotic-singularity': {
    name: 'Singularity', save: 'reflex', trait: 'biotic',
    degrees: {
      success:         { note: 'Pulled 10 feet toward the singularity\'s center.' },
      failure:         { conditions: ['restrained'], note: 'Pulled to the center and Restrained while the singularity lasts (Escape against the caster\'s class DC).' },
      criticalFailure: { conditions: ['restrained'], note: 'As failure, and takes 2d6 bludgeoning at the start of each of its turns while Restrained.' },
    },
  },
  'me-biotic-slam': {
    name: 'Slam', save: 'fortitude', trait: 'biotic',
    degrees: {
      success:         { damage: '1d6[bludgeoning]', note: 'Moved 5 feet in a direction of the caster\'s choice.' },
      failure:         { damage: '3d6[bludgeoning]', conditions: ['stunned:1', 'prone'] },
      criticalFailure: { damage: '6d6[bludgeoning]', conditions: ['stunned:2', 'prone'], note: 'Speed halved until the end of its next turn.' },
    },
  },
  'me-biotic-stasis': {
    name: 'Stasis', save: 'will', trait: 'biotic',
    degrees: {
      success:         { conditions: ['immobilized'], note: 'Until the start of the caster\'s next turn.' },
      failure:         { conditions: ['paralyzed'], note: 'Until the start of the caster\'s next turn; a new Will save at the end of each of its turns ends it.' },
      criticalFailure: { conditions: ['paralyzed'], note: 'For 1 minute; a new Will save at the end of each of its turns ends it.' },
    },
  },
  'me-biotic-throw': {
    name: 'Throw', save: 'fortitude', trait: 'biotic',
    degrees: {
      success:         { note: 'Pushed 5 feet away from the caster.' },
      failure:         { damage: '2d8[bludgeoning]', note: 'Pushed 10 feet. Into a solid object: 1d6 more bludgeoning and Prone.' },
      criticalFailure: { damage: '4d8[bludgeoning]', note: 'Pushed 20 feet. Into an obstacle: 2d6 more bludgeoning and Prone.' },
    },
  },
  'me-biotic-warp': {
    name: 'Warp', save: 'fortitude', trait: 'biotic',
    // the barrier's counter: the shield system multiplies this power's damage against these
    // layers (world settings; the games' Warp does 2x to barriers and 1.5x to armor)
    layers: { barrier: 'warpPowerBarrierMult', armor: 'warpPowerArmorMult' },
    degrees: {
      success:         { damage: '1d6[void]' },
      failure:         { damage: '2d6[void]', persistent: { formula: '1d4', type: 'void' }, note: 'Cannot regain HP until the start of the caster\'s next turn.' },
      criticalFailure: { damage: '4d6[void]', persistent: { formula: '1d4', type: 'void' }, barrierBurst: '2d6[void]', note: 'Cannot regain HP until the start of the caster\'s next turn.' },
    },
  },
  'me-adept-warp-field': {
    name: 'Warp Field', save: 'fortitude', trait: 'biotic', area: true,
    degrees: {
      criticalSuccess: { damage: '1d4[void]' },
      success:         { damage: '1d4[void]' },
      failure:         { damage: '1d4[void]', conditions: ['off-guard'], note: 'Off-Guard until the start of the caster\'s next turn.' },
      criticalFailure: { damage: '1d4[void]', conditions: ['off-guard'], note: 'Off-Guard until the start of the caster\'s next turn.' },
    },
  },
  'me-adept-gravity-well': {
    name: 'Gravity Well', save: 'reflex', trait: 'biotic',
    degrees: {
      failure:         { conditions: ['grabbed'] },
      criticalFailure: { conditions: ['grabbed'] },
    },
  },

  // The burst of a Biotic Explosion (see BIOTIC EXPLOSIONS). Its damage is the roll already
  // made for the detonated creature, carried in the save's roll options.
  'me-biotic-explosion': {
    name: 'Biotic Explosion', save: 'reflex', area: true,
    useKey: ({ options }) => explosionOption(options)?.id ?? '',
    damage: ({ options }) => {
      const e = explosionOption(options);
      return e?.total > 0 ? `${e.total}[force]` : null;
    },
    degrees: { success: { scale: 0.5 }, failure: { scale: 1 }, criticalFailure: { scale: 2 } },   // an empty degree would count as "no effect"
  },

  // ── Tech powers ──
  'me-tech-ai-hacking': {
    name: 'AI Hacking', save: 'will', trait: 'tech',
    degrees: {
      success:         { conditions: ['stunned:1'] },
      failure:         { conditions: ['controlled'], note: 'An ally of the caster for up to 1 minute; ends if an ally deals it more than 10 damage in one hit.' },
      criticalFailure: { conditions: ['controlled'], note: 'As failure, with a +2 circumstance bonus to attack rolls and saves while controlled.' },
    },
  },
  'me-tech-armor-detonation': {
    name: 'Tech Armor Detonation', save: 'reflex', trait: 'tech', area: true,
    degrees: basic('2d6[electricity]'),
  },
  'me-tech-combat-drone-explosion': {
    name: 'Combat Drone Explosion', save: 'reflex', trait: 'tech', area: true,
    degrees: basic('1d6[electricity]'),
  },
  'me-tech-defense-drone': {
    name: 'Defense Drone', save: 'reflex', trait: 'tech', area: true,
    degrees: basic('1d6[electricity]'),
  },
  'me-tech-cryo-blast': {
    name: 'Cryo Blast', save: 'fortitude', trait: 'tech', area: true,
    degrees: {
      success:         { damage: '1d6[cold]' },
      failure:         { damage: '2d6[cold]', conditions: ['slowed:1'], note: 'Slowed until the end of its next turn.' },
      criticalFailure: { damage: '4d6[cold]', conditions: ['immobilized'], note: 'Immobilized until the end of its next turn.' },
    },
  },
  'me-tech-damping': {
    name: 'Damping', save: 'will', trait: 'tech',
    degrees: {
      success:         { conditions: ['stupefied:1'], note: 'Until the start of the caster\'s next turn.' },
      failure:         { conditions: ['stupefied:2'], note: 'Cannot use tech or biotic powers until the start of the caster\'s next turn.' },
      criticalFailure: { conditions: ['stupefied:2'], note: 'Cannot use tech or biotic powers until the end of its next turn.' },
    },
  },
  'me-tech-energy-drain': {
    name: 'Energy Drain', save: 'fortitude', trait: 'tech',
    degrees: {
      success:         { drain: { shields: 10, damage: '1d8[electricity]', gainShielded: 0, gainUnshielded: 0 } },
      failure:         { drain: { shields: 20, damage: '2d8[electricity]', gainShielded: 'drained', gainUnshielded: 10 } },
      criticalFailure: { drain: { shields: 40, damage: '4d8[electricity]', gainShielded: 20, gainUnshielded: 20 } },
    },
  },
  'me-tech-neural-shock': {
    name: 'Neural Shock', save: 'fortitude', trait: 'tech',
    degrees: {
      success:         { damage: '1d6[electricity]' },
      failure:         { damage: '2d6[electricity]', conditions: ['stunned:1'] },
      criticalFailure: { damage: '4d6[electricity]', conditions: ['stunned:3'], note: 'Off-Guard until the end of its next turn, even after Stunned ends.' },
    },
  },
  'me-tech-overload': {
    name: 'Overload', save: 'reflex', trait: 'tech',
    degrees: {
      success:         { damage: '1d8[electricity]' },
      failure:         { damage: '2d8[electricity]', vsSynthetic: '3d8[electricity]' },
      criticalFailure: { damage: '4d8[electricity]', vsSynthetic: '5d8[electricity]', conditions: ['stunned:1'] },
    },
  },
  'me-tech-sabotage': {
    name: 'Sabotage', save: 'will', trait: 'tech',
    degrees: {
      success:         { conditions: ['confused'], note: 'Until the end of the caster\'s next turn.' },
      failure:         { conditions: ['confused'], note: 'Attacks the nearest creature for 1 round; a new Will save at the end of each of its turns ends it.' },
      criticalFailure: { conditions: ['confused'], note: 'Attacks the nearest creature for 1 minute, dealing maximum damage; a new Will save at the end of each of its turns ends it.' },
    },
  },
  'me-engineer-system-override': {
    name: 'System Override', save: 'will', trait: 'tech',
    degrees: {
      success:         { conditions: ['stunned:1'] },
      failure:         { damage: '2d6[electricity]', conditions: ['stunned:2'] },                    // 12th-level feat: 8d6
      criticalFailure: { damage: '4d6[electricity]', conditions: ['stunned:3', 'controlled'], note: 'Controlled as by AI Hacking for 1 round.' },
    },
  },
  'me-engineer-network-shutdown': {
    name: 'Network Shutdown', save: 'will', trait: 'tech', area: true,
    degrees: {
      success:         { conditions: ['stunned:1'] },
      failure:         { damage: '2d6[electricity]', conditions: ['stunned:2'] },                    // 18th-level feat: 10d6
      criticalFailure: { damage: '4d6[electricity]', conditions: ['stunned:3'], note: 'Cannot use tech abilities for 1 round.' },
    },
  },
  'me-infiltrator-death-from-above': {
    name: 'Death From Above', save: 'will', trait: 'tech',
    degrees: {
      failure:         { conditions: ['frightened:2'] },
      criticalFailure: { conditions: ['frightened:2'] },
    },
  },

  // ── Powers ──
  'me-tech-incinerate': {
    name: 'Incinerate',
    save: 'reflex', trait: 'tech',
    // burns through armor: the shield system counts this power's damage 1.5x against an
    // Armor Frame (a world setting; Mass Effect 3's Incinerate does 1.5x to armor)
    layers: { armor: 'incineratePowerArmorMult' },
    degrees: {
      success:         { damage: '1d6[fire]' },
      failure:         { damage: '2d6[fire]', persistent: { formula: '1d4', type: 'fire', dc: 15 },
                         note: 'Target cannot regain HP until the start of your next turn.' },
      criticalFailure: { damage: '4d6[fire]', persistent: { formula: '2d4', type: 'fire', dc: 15 },
                         note: 'Target cannot regain HP until the start of your next turn.' },
    },
  },
};

// ── LEVEL SCALING ───────────────────────────────────────────────────────────
// A power's dice are multiplied by 1 + floor(caster level / 4): x1 at levels 1-3, x2 at 4-7,
// x3 at 8-11, x4 at 12-15, x5 at 16-19, x6 at 20. That covers its damage, its bonus against
// synthetics, persistent damage, the caster's healing, Energy Drain's damage and any dice
// named in its note. Player and NPC versions use the same rule, so a power does the same
// thing whoever uses it. Not scaled: Biotic Charge and Nova (their own formulas above), the
// grenade items (consumables with printed dice) and the flat or bonus damage a caster's
// gear and feats add.
const diceMult = (caster) => 1 + Math.floor((caster?.level ?? 0) / 4);
const scaleDice = (formula, m) => (m === 1 ? formula : formula.replace(/(\d+)d(\d+)/g, (_, n, d) => `${n * m}d${d}`));
const scaledByCaster = (value) => (typeof value === 'string' && /\dd\d/.test(value) ? ({ caster }) => scaleDice(value, diceMult(caster)) : value);
const scaleDegrees = (source) => {
  const degrees = {};
  for (const [name, degree] of Object.entries(source)) {
    const d = { ...degree };
    for (const field of ['damage', 'vsSynthetic', 'casterHeal', 'note', 'barrierBurst']) if (d[field]) d[field] = scaledByCaster(d[field]);
    if (d.persistent) d.persistent = { ...d.persistent, formula: scaledByCaster(d.persistent.formula) };
    if (d.drain) d.drain = { ...d.drain, damage: scaledByCaster(d.drain.damage) };
    degrees[name] = d;
  }
  return degrees;
};

// ── NPC VERSIONS ────────────────────────────────────────────────────────────
// The "(NPC)" biotic and tech actions (me-npc-*) have no class DC to lean on, so their DC
// is worked out from the creature's level in the save button itself. Their dice are the
// player power's, scaled by level the same way.
for (const [key, power] of Object.entries(POWERS)) {
  if (key.startsWith('me-grenade-') || key === 'me-biotic-explosion') continue;   // grenade items keep their printed dice; the explosion has its own
  const biotic = key.startsWith('me-biotic-') || ['me-cluster-grenade', 'me-lift-grenade'].includes(key);
  const tech = key.startsWith('me-tech-') || key === 'me-sticky-grenade';
  if (biotic || tech) {
    const src = { ...power, ...power.npc };     // a power may give its NPC version its own numbers
    delete src.npc;
    POWERS[`me-npc-${key.slice(3)}`] = { ...src, trait: biotic ? 'biotic' : 'tech', degrees: scaleDegrees(src.degrees) };
  }
  power.degrees = scaleDegrees(power.degrees);
}

// For macros and debugging: the full registry, PC and NPC entries alike.
globalThis.MassEffectPowers = {
  registry: POWERS,
  damageSource: () => damageSource,
  chargeLanding: (...a) => chargeLanding(...a),
  pushAway: (...a) => pushAway(...a),
  feetBetween: (...a) => feetBetween(...a),
  novaFollows: (...a) => novaFollows(...a),
  cooldownRounds: (actor, power) => cooldownRounds(actor, power === 'charge' ? CHARGE_COOLDOWN : NOVA_COOLDOWN),
  bioticCooldownRounds: (actor) => bioticCooldownRounds(actor),
  techCooldownRounds: (actor) => techCooldownRounds(actor),
  petStats: (actor, kind) => petStats(actor, kind),
  openSpaceBeside: (source) => openSpaceBeside(source),
  explosionDice: (caster) => explosionDice(caster),
  cloakStrikes: (actor) => cloakStrikes(actor),
  soldierCooldownRounds: (actor, slug) => soldierCooldownRounds(actor, slug),
  unityPercent: (caster) => unityPercent(caster),
  unityOn: (caster, actor) => unityOn(caster, actor),
  ensureUnitySpell: (actor) => ensureUnitySpell(actor),
};

// ── SETTINGS ────────────────────────────────────────────────────────────────
Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'autoApplyPowerEffects', {
    name: 'Auto-Apply Power Effects',
    hint: 'When a target resolves a save against a Mass Effect power, automatically apply its damage and conditions based on the outcome.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, 'automateCharge', {
    name: 'Automate Vanguard Powers',
    hint: 'Biotic Charge and Vanguard Rush posted with one creature targeted move the Vanguard next to it and roll its Reflex save; Nova (alone or after Rush) rolls the Fortitude save of each creature in its area that is not on the Vanguard\'s side. Cooldowns are tracked. Needs a GM connected.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, 'chargeAnimation', {
    name: 'Biotic Charge Animation',
    hint: 'When a Charge moves the Vanguard, play a biotic beam from start to landing (needs Sequencer, and JB2A installed; JB2A does not have to be enabled). The token crosses in a fraction of a second either way.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, 'novaAnimation', {
    name: 'Nova Animation',
    hint: 'When Nova detonates, play a purple biotic blast and a pulse wave that fills its area (needs Sequencer, and JB2A installed; JB2A does not have to be enabled).',
    scope: 'world', config: true, type: String, default: 'pulse',
    choices: { pulse: 'Blast and pulse wave', shockwave: 'Shockwave', off: 'None' },
  });
});

// ── SAVE-RESULT HOOK ────────────────────────────────────────────────────────
Hooks.on('createChatMessage', async (message) => {
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) return;

  const ctx = sysFlags(message)?.context;
  if (!ctx || ctx.type !== 'saving-throw' || !ctx.outcome) return;

  const opt = (ctx.options ?? []).find(o => o.startsWith(OPT_PREFIX));
  if (!opt) return;
  const slug  = opt.slice(OPT_PREFIX.length);
  const power = POWERS[slug];
  if (!power) return;

  const actor = ChatMessage.getSpeakerActor(message.speaker);
  if (!actor) return;
  const tokenDoc = message.token
    ?? canvas?.scene?.tokens?.get(message.speaker?.token)
    ?? actor.getActiveTokens(true, true)[0] ?? null;

  const caster = await resolveCaster(message, ctx);
  const degree = { ...(power.degrees[ctx.outcome] ?? {}) };
  if (typeof degree.note === 'function') degree.note = degree.note({ actor, caster });   // dice in a note scale too

  // Dark Matter: critical failures against the Adept's biotic powers frighten
  const frighten = caster?.flags?.[MODULE_ID]?.critFailFrightened;
  if (ctx.outcome === 'criticalFailure' && power.trait === 'biotic' && frighten) {
    degree.conditions = [...(degree.conditions ?? []), `frightened:${frighten}`];
  }
  // Vanguard feats that change what a degree does
  const casterHas = (s) => !!caster?.items?.some((i) => i.slug === s);
  const addCondition = (c) => { degree.conditions = [...(degree.conditions ?? []), c]; };
  if (slug === 'me-biotic-nova' && casterHas('me-upgrade-nova')) {           // Nova Upgrade
    if (ctx.outcome === 'failure') addCondition('stunned:1');
    if (ctx.outcome === 'criticalFailure') addCondition('stunned:3');
  }
  if (slug === 'me-biotic-charge' && ctx.outcome === 'success' && casterHas('me-vanguard-unstoppable-charge')) {
    addCondition('prone');                                                  // Unstoppable Charge
  }
  const failed = ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure';
  // Improved Adept Mastery: a failed save against the Adept's Biotic Explosion knocks the creature prone
  if (slug === 'me-biotic-explosion' && failed && casterHas(EXPLOSION_KNOCKDOWN_FEATURE)) addCondition('prone');
  if (slug === 'me-biotic-charge' && failed && casterHas('me-vanguard-heavy-impact')) {
    addCondition('off-guard');                                              // Heavy Impact
    degree.note = [degree.note, 'Off-guard until the end of the Vanguard\'s next turn (Heavy Impact).'].filter(Boolean).join(' ');
  }

  // Vanguard Rush ends in Nova whatever the save,
  // once this save's own effects, such as a critical failure's full barrier, are in place
  const chain = (ctx.options ?? []).find((o) => o.startsWith(CHAIN_OPT))?.slice(CHAIN_OPT.length);
  const followUp = async () => {
    if (!chain || !caster || !novaFollows(chain, ctx.outcome)) return;
    const from = caster.getActiveTokens(true, true).find((t) => t.parent === tokenDoc?.parent);
    if (from) await novaBurst(caster, from);
    else postResult(caster, 'Nova', 'Not automated', [`${caster.name} has no token here: use Nova from the sheet.`], { owners: true });
    // a failed save resets Charge and Nova (and a critical failure refills half the barrier)
    await rushReset(caster, ctx.outcome, 'Vanguard Rush');
  };

  if (!Object.keys(degree).length) {
    postResult(actor, power.name, ctx.outcome, ['No effect.']);
    return followUp();
  }

  const log = [];

  // ── Direct damage (routes through the shield system via applyDamage) ──
  const spec = (degree.vsSynthetic && isSynthetic(actor)) ? degree.vsSynthetic : (degree.damage ?? power.damage);
  const options = ctx.options ?? [];
  const base = typeof spec === 'function' ? spec({ actor, caster, options }) : spec;
  // Extra damage the caster's gear and features add to the power's damage roll
  const cflags = caster?.flags?.[MODULE_ID] ?? {};
  const extra = [];
  if (POWER_TRAITS.includes(power.trait)) {
    // item bonuses: a Power Amplifier (tech and biotic) or a bio-amp (biotic), the higher one
    const itemBonus = Math.max(Number(cflags.powerDamageBonus) || 0, power.trait === 'biotic' ? Number(cflags.ampDamageBonus) || 0 : 0);
    if (itemBonus > 0) extra.push(String(itemBonus));                                     // Power Amplifier / bio-amp
    if (cflags.powerBonusDice) extra.push(cflags.powerBonusDice);                         // Superior Sentinel Mastery
    const heritage = power.trait === 'biotic' ? Number(cflags.bioticDamageBonus) || 0 : 0;
    if (heritage > 0) extra.push(String(heritage));                                       // Commando / Ardat-Yakshi Asari
    const mastery = Number(cflags.masteryDamage?.[power.trait]) || 0;
    if (mastery > 0) extra.push(String(mastery));                                         // Biotic Mastery / Tech Mastery class feats
  }
  if (slug === 'me-biotic-charge' && cflags.chargeUpgrade === 'damage') extra.push('2d6'); // Charge Upgrade
  if (slug === 'me-biotic-nova' && casterHas('me-upgrade-nova')) extra.push('2d6');         // Nova Upgrade
  const formula = base && extra.length ? addTerms(base, extra) : base;
  if (spec && !formula) log.push('No damage recorded for this use; roll it by hand.');
  let dealt = false;                 // whether this power damaged the target (a detonation needs it)
  const barrierBefore = getBarrier(actor)?.flags[MODULE_ID].barrierCurrent ?? 0;   // before this power's damage reaches it
  if (formula) {
    let roll = null;
    try {
      const origin = sysFlags(message)?.origin?.uuid ?? ctx.origin?.uuid ?? '';
      const use = power.useKey?.({ actor, caster, options }) ?? '';
      roll = await rollPowerDamage(power.area ? `${slug}|${origin}|${use}` : null, { ...degree, damage: formula });
      if (roll) {
        const against = layerNotes(actor, power);
        await applyPowerDamage(actor, roll, tokenDoc, power);
        log.push(`${roll.total} ${describeFormula(formula)} damage${against}`);
        dealt = roll.total > 0;
      } else {
        log.push('No damage (halved to 0)');
      }
    } catch (err) {
      if (roll) {
        // The roll exists, so the error came from applying it, and the system may already have
        // changed the target's HP by then. Report the same roll; never a second, different one.
        console.warn('ME Powers | applyDamage reported an error', err);
        log.push(`${roll.total} ${describeFormula(formula)} damage (the system reported an error applying it: check the target's HP)`);
      } else {
        console.warn('ME Powers | damage roll failed, posting a plain roll instead', err);
        const plain = await new Roll(stripTags(formula)).evaluate();
        plain.toMessage({ flavor: `${power.name} damage`, speaker: { alias: power.name } });
        log.push(`${plain.total} damage (apply manually)`);
      }
    }
  }

  // ── Energy Drain: shields if it has them, otherwise damage ──
  if (degree.drain) {
    const d = degree.drain;
    const shields = actor.system.attributes.hp?.temp ?? 0;
    let gain;
    if (shields > 0) {
      const drained = Math.min(d.shields, shields);
      await actor.update({ 'system.attributes.hp.temp': shields - drained });
      log.push(`${drained} shield HP drained`);
      gain = d.gainShielded === 'drained' ? drained : d.gainShielded;
    } else {
      const drainDamage = typeof d.damage === 'function' ? d.damage({ actor, caster }) : d.damage;
      const roll = await new (DamageRoll())(drainDamage).evaluate();
      await applyPowerDamage(actor, roll, tokenDoc, power);
      log.push(`${roll.total} ${describeFormula(drainDamage)} damage`);
      gain = d.gainUnshielded;
    }
    if (gain > 0) log.push(await giveCasterShields(caster, gain));
  }

  // ── Persistent damage (the system's own persistent-damage condition) ──
  if (degree.persistent) {
    const p = degree.persistent;
    const pformula = typeof p.formula === 'function' ? p.formula({ actor, caster }) : p.formula;
    await addPersistentDamage(actor, pformula, p.type, p.dc ?? 15);
    log.push(`${pformula} persistent ${p.type}`);
  }

  // ── Conditions ──
  for (const c of degree.conditions ?? []) {
    const [name, value] = c.split(':');
    try {
      await actor.increaseCondition(name, value ? { value: Number(value) } : undefined);
      log.push(value ? `${cap(name)} ${value}` : cap(name));
    } catch (err) {
      console.warn(`ME Powers | could not apply condition "${c}"`, err);
      log.push(`${cap(name)} (apply manually)`);
    }
  }

  // ── Barriers ──
  if (degree.depleteBarrier) {
    const barrier = getBarrier(actor);
    if (barrier && (barrier.flags[MODULE_ID].barrierCurrent ?? 0) > 0) {
      await setBarrier(barrier, 0);
      log.push('Biotic Barrier depleted');
    }
  }
  if (degree.barrierBurst && barrierBefore > 0) {
    log.push(...await barrierDetonation({ caster, actor, tokenDoc, power, formula: typeof degree.barrierBurst === 'function' ? degree.barrierBurst({ actor, caster }) : degree.barrierBurst }));
  }
  if (degree.casterBarrier) log.push(await refillCasterBarrier(caster, degree.casterBarrier));

  // ── Forced movement ──
  if (degree.push) {
    const from = caster?.getActiveTokens(true, true).find((t) => t.parent === tokenDoc?.parent);
    const moved = await pushAway(tokenDoc, from, degree.push);
    if (moved === null) log.push(`Pushed ${degree.push} feet away from ${caster?.name ?? 'the caster'} (move by hand)`);
    else if (moved === degree.push) log.push(`Pushed ${moved} feet`);
    else if (moved > 0) log.push(`Pushed ${moved} feet (of ${degree.push}): another creature is in the way`);
    else log.push(`Not pushed: another creature holds the space behind it`);
  }

  // ── Healing for the caster ──
  const heal = typeof degree.casterHeal === 'function' ? degree.casterHeal({ actor, caster }) : degree.casterHeal;
  if (heal) {
    if (caster) {
      const roll = await new Roll(heal).evaluate();
      const hp = caster.system.attributes.hp;
      const healed = Math.min(roll.total, hp.max - hp.value);
      if (healed > 0) await caster.update({ 'system.attributes.hp.value': hp.value + healed });
      log.push(`${caster.name} regains ${healed} HP`);
    } else {
      log.push(`The caster regains ${heal} HP (apply manually)`);
    }
  }

  // ── Vanguard follow-ups ──
  // Nova Cascade: a critical failure against Nova refills half the barrier, once per detonation
  if (slug === 'me-biotic-nova' && ctx.outcome === 'criticalFailure' && casterHas('me-vanguard-nova-cascade')) {
    const detonation = caster.getFlag(MODULE_ID, 'novaAt');
    if (detonation && caster.getFlag(MODULE_ID, 'cascadeFor') !== detonation) {
      await caster.setFlag(MODULE_ID, 'cascadeFor', detonation);
      log.push(`Nova Cascade: ${await refillCasterBarrier(caster, 0.5)}`);
    }
  }
  // Improved Engineer Mastery: a tech power that deals damage shortens one tech cooldown, once a round
  if (dealt && power.trait === 'tech' && casterHas('me-engineer-mastery-improved')) {
    try {
      const cut = await engineerCooldownCut(caster);
      if (cut) log.push(cut);
    } catch (err) {
      console.warn('ME Powers | Improved Engineer Mastery cooldown cut failed', err);
    }
  }
  // ── Biotic Explosions: an Adept's detonator sets off a Primed creature; a primer primes ──
  const powerKey = slug.replace(/^me-npc-/, 'me-');
  const primed = getPrimed(actor);
  if (primed && dealt && DETONATORS.has(powerKey) && casterHas(EXPLOSION_FEATURE)) {
    const use = `${powerKey}|${sysFlags(message)?.origin?.uuid ?? ctx.origin?.uuid ?? ''}`;
    try {
      log.push(await bioticExplosion({ caster, actor, tokenDoc, primed, use }));
    } catch (err) {
      console.warn('ME Powers | Biotic Explosion failed', err);
      log.push('Biotic Explosion: something went wrong; resolve it by hand.');
    }
  } else if (PRIMERS.has(powerKey) && failed) {
    log.push(await primeTarget(actor, caster));
  }
  if (degree.note) log.push(`<em>${degree.note}</em>`);
  postResult(actor, power.name, ctx.outcome, log);

  // Chain Charge: a critical failure, or the target dropping, lets the Vanguard charge on
  if (slug === 'me-biotic-charge' && casterHas('me-vanguard-chain-charge')
      && (ctx.outcome === 'criticalFailure' || (actor.system.attributes?.hp?.value ?? 1) <= 0)) {
    postResult(caster, 'Chain Charge', 'Ready', [`${actor.name} ${ctx.outcome === 'criticalFailure' ? 'critically failed' : 'is down'}: target another enemy within 30 feet and use Chain Charge (free action, once per round).`], { owners: true });
  }
  await followUp();
});

/** Rush fires Nova whatever the Charge target rolls; a plain Charge sets off nothing. */
function novaFollows(chain, outcome) {
  void outcome;
  return chain === 'rush';
}

// ── CLASS MASTERIES ─────────────────────────────────────────────────────────
// The masteries' rules write their effects as actor flags (ActiveEffectLike,
// in memory only), and this section acts on them:
//   powerEfficiency.biotic / .tech — powers with that trait cost N fewer actions (min 1)
//   chargeBarrier                  — Charge refills this much Biotic Barrier HP
//   momentumStrike                 — Charge or Nova grants the Vanguard Momentum effect
//   masteryDamage.biotic / .tech   — Biotic Mastery / Tech Mastery class feats: flat damage on powers with that trait
//   bioticCooldownCut              — Adept Mastery: biotic cooldowns this many rounds shorter, never below 2
//   techCooldownCut                — Engineer Mastery, Infiltrator Mastery: tech cooldowns this many rounds shorter, never below 2
//   soldierCooldownCut             — Improved Soldier Mastery: the Soldier's own cooldowns this many rounds shorter, never below 2
//   techMasteryCooldownCut         — Tech Mastery feats: tech cooldowns this many rounds shorter, never below 2
//   techCooldownAlt                — Sentinel Mastery: an attribute tech cooldowns may use instead of Intelligence, if better
// The Sentinel's Tech Armor resistance is all rule elements: the Tech Armor effect sets the
// roll option "me-tech-armor", and the masteries' Resistance rules are predicated on it.
// It also adds the roll option "self:me-barrier:full" while the barrier is full.
// No rule element can alter a feat's action cost, so the actor's derived-data
// step is wrapped instead.
const POWER_TRAITS = ['biotic', 'tech'];
const MOMENTUM_SLUG = 'me-effect-vanguard-momentum';
const COMBO_SLUGS = ['me-vanguard-rush'];

Hooks.once('init', () => {
  const Character = CONFIG.PF2E?.Actor?.documentClasses?.character;
  if (!Character) return;
  const prepareDerivedData = Character.prototype.prepareDerivedData;
  Character.prototype.prepareDerivedData = function () {
    prepareDerivedData.call(this);
    try {
      applyMasteryData(this);
    } catch (err) {
      console.warn('ME Powers | mastery data failed', err);
    }
  };
});

/** Action cost cut a mastery gives this item, or 0. */
function actionCut(actor, item) {
  const efficiency = actor.flags?.[MODULE_ID]?.powerEfficiency;
  if (!efficiency || item.type !== 'feat' || item.system.actionType?.value !== 'action') return 0;
  // Vanguard Rush already combines Charge and Nova into one action; the masteries' cut
  // doesn't apply to it again
  if (COMBO_SLUGS.includes(item.slug)) return 0;
  const traits = item.system.traits?.value ?? [];
  return Math.max(0, ...POWER_TRAITS.filter((t) => traits.includes(t)).map((t) => Number(efficiency[t]) || 0));
}

/** Largest ammoCapacityMultiplier among the mods installed in this weapon. */
function capacityMultiplier(item) {
  if (item.type !== 'weapon') return 1;
  return Math.max(1, ...(item.subitems?.contents ?? [])
    .map((s) => Number(s.flags?.[MODULE_ID]?.ammoCapacityMultiplier) || 1));
}

function applyMasteryData(actor) {
  // Magazine Upgrade I raises capacity by half; ItemAlteration can only
  // multiply by whole numbers, so it is applied here, from the stored value.
  for (const weapon of actor.itemTypes.weapon) {
    const mult = capacityMultiplier(weapon);
    const base = weapon._source.system.ammo?.capacity;
    if (mult > 1 && base > 0) weapon.system.ammo.capacity = Math.ceil(base * mult);
  }

  for (const item of actor.itemTypes.feat) {
    const cut = actionCut(actor, item);
    const base = item._source.system.actions?.value;   // never compound on a re-prepare
    if (!cut || !(base > 1)) continue;
    item.system.actions.value = Math.max(1, base - cut);
  }

  const barrier = actor.itemTypes.effect.find((e) => e.flags?.[MODULE_ID]?.barrierMax != null);
  const max = barrier?.flags[MODULE_ID].barrierMax ?? 0;
  if (max > 0 && (barrier.flags[MODULE_ID].barrierCurrent ?? 0) >= max) {
    actor.rollOptions.all['self:me-barrier:full'] = true;
  }
}

// The item sheet submits what it shows, so a reduced cost would be saved as
// the power's real cost. Drop that echo; any other edit goes through.
Hooks.on('preUpdateItem', (item, changes) => {
  const actor = item.actor;
  if (!actor) return;
  const echo = (path) => {
    const sent = foundry.utils.getProperty(changes, path);
    const shown = foundry.utils.getProperty(item, path);
    const stored = foundry.utils.getProperty(item._source, path);
    if (sent !== undefined && sent === shown && sent !== stored) {
      const keys = path.split('.');
      delete keys.slice(0, -1).reduce((o, k) => o?.[k], changes)?.[keys.at(-1)];
    }
  };
  if (actionCut(actor, item)) echo('system.actions.value');
  if (capacityMultiplier(item) > 1) echo('system.ammo.capacity');
});

// Charge and Nova: run on the client that posted the card, which owns the actor.
Hooks.on('createChatMessage', async (message) => {
  if (message.author?.id !== game.user.id) return;
  // A target's save against the power also names the power as its origin; only the
  // power's own card (no roll context) counts as using it.
  if (sysFlags(message)?.context) return;
  const origin = sysFlags(message)?.origin;
  if (!['feat', 'action'].includes(origin?.type) || !origin.uuid) return;
  const item = await fromUuid(origin.uuid);
  const actor = item?.actor;
  if (!actor) return;
  const slug = baseSlug(item);                              // NPC versions trigger the same effects

  if (slug === 'me-biotic-charge') {
    // A Charge posted during its cooldown does nothing (the Charge automation says so)
    if (cooldownLeft(actor, CHARGE_COOLDOWN)) return;
    await chargeUsed(actor);
  }
  // With the automation on, the GM's client runs Nova from start to finish (see runNova)
  if (slug === 'me-biotic-nova' && !vanguardAutomation() && (!cooldownLeft(actor, NOVA_COOLDOWN) || apexSecondNova(actor))) await novaUsed(actor);
  // every other biotic or tech power a character uses starts its own cooldown. A drone or turret
  // is deployed by the GM's client, which starts that cooldown itself (see deployPet).
  if (actor.type === 'character' && tracksCooldown(item) && !(PETS[item.slug] && game.users?.activeGM)
      && game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) {
    const ready = !cooldownLeft(actor, cooldownSlug(item));
    await powerUsed(actor, item);
    if (ready && item.slug === 'me-tech-armor') await raiseTechArmor(actor);
    if (ready && item.slug === 'me-tech-tactical-cloak') await raiseCloak(actor);
    if (ready && SOLDIER_POWERS[item.slug]) await soldierPowerUsed(actor, item);
  }
  if (!game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) return;
  // an NPC's cloak has no tracked cooldown: its card always raises the cloak
  if (actor.type !== 'character' && slug === 'me-tech-tactical-cloak') await raiseCloak(actor);
  if (slug === 'me-infiltrator-hunters-mark') await markTarget(actor, item);
  // Phantom Protocol and Assassination Protocol bring the cloak back after a kill, cooldown or not:
  // posting either feat to chat is how the player says it happened
  if (CLOAK_RETURNS.includes(slug) && await raiseCloak(actor)) {
    postResult(actor, item.name, 'Cloak restored', ['Tactical Cloak is back up, whatever its cooldown.'], { owners: true });
  }
});

/** Using Tech Armor puts its effect on the character, unless it is already up. */
async function raiseTechArmor(actor) {
  if (actor.itemTypes?.effect?.some((e) => e.slug === 'me-effect-tech-armor')) return;
  const pack = game.system.id === 'sf2e' ? 'sf2e-me-tech-powers' : 'me-tech-powers';
  const effect = await fromUuid(`Compendium.${MODULE_ID}.${pack}.Item.meEffTechArmor00`).catch(() => null);
  if (!effect) return;
  await actor.createEmbeddedDocuments('Item', [effect.toObject()]);
}

// The Engineer's Combat Drone and Sentry Turret: the GM's client puts the token on the scene.
Hooks.on('createChatMessage', async (message) => {
  if (!game.users?.activeGM?.isSelf || !game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) return;
  if (sysFlags(message)?.context) return;
  const origin = sysFlags(message)?.origin;
  if (!['feat', 'action'].includes(origin?.type) || !origin.uuid) return;
  const item = await fromUuid(origin.uuid).catch(() => null);
  if (!item?.actor || item.actor.type !== 'character' || !PETS[item.slug]) return;
  try {
    await deployPet(message, item);
  } catch (err) {
    console.warn(`ME Powers | ${item.name} deployment failed`, err);
    postResult(item.actor, item.name, 'Not automated', [`Something went wrong; place the ${PETS[item.slug].name} by hand.`], { owners: true });
  }
});

/**
 * Charge's refill on use, whatever the target rolls: half the barrier's maximum, or more
 * from Vanguard Mastery (flat) or Apex Vanguard / the barrier Charge Upgrade (full). A
 * critical failure on the save fills it (see POWERS). Also gives Vanguard Momentum.
 */
/**
 * A biotic keeps one Biotic Barrier for good; one who has never raised it gets it here,
 * empty, so a Charge has something to refill. Returns the barrier (null if it can't be made).
 */
async function ensureBarrier(actor) {
  const have = getBarrier(actor);
  if (have) return have;
  const pack = game.system.id === 'sf2e' ? 'sf2e-me-shields' : 'me-shields';
  const effect = await fromUuid(`Compendium.${MODULE_ID}.${pack}.Item.meBioticBarrier0`).catch(() => null);
  if (!effect) return null;
  // the same size the shield system gives a raised barrier: 5 × half the level, rounded up, + the amp's bonus
  const max = 5 * Math.max(1, Math.ceil((actor.level ?? 1) / 2)) + Math.max(0, Number(actor.flags?.[MODULE_ID]?.barrierBonus) || 0);
  const source = foundry.utils.mergeObject(effect.toObject(), {
    _id: null,
    flags: { [MODULE_ID]: { barrier: true, barrierMax: max, barrierCurrent: 0 } },
    system: { badge: { type: 'counter', value: 0, min: 0, max } },
  });
  await actor.createEmbeddedDocuments('Item', [source]);
  return getBarrier(actor);
}

async function chargeUsed(actor) {
  const flags = actor.flags?.[MODULE_ID] ?? {};
  const barrier = await ensureBarrier(actor);
  if (barrier) {
    const max = barrier.flags[MODULE_ID].barrierMax;
    const now = barrier.flags[MODULE_ID].barrierCurrent ?? 0;
    const has = (s) => actor.items.some((i) => i.slug === s);
    const refill = Math.max(
      Math.ceil(max / 2),
      Number(flags.chargeBarrier) || 0,
      has('me-vanguard-apex-vanguard') || flags.chargeUpgrade === 'barrier' ? max : 0,
    );
    const next = Math.min(max, now + refill);
    if (next > now) {
      await setBarrier(barrier, next);
      postResult(actor, 'Biotic Charge', 'success', [`Biotic Barrier ${now} → ${next}`]);
    }
  }
  await grantMomentum(actor);
  await grantWeaponSynergy(actor);
}

/**
 * Vanguard Strike (Weapon Synergy): every Charge gives Strikes +3d6 force (4d6 from 18th)
 * until the end of the Vanguard's next turn. The feat's DamageDice rule reads the effect;
 * a new Charge replaces the effect, so its duration starts over instead of stacking.
 */
const SYNERGY_SLUG = 'me-effect-weapon-synergy';
async function grantWeaponSynergy(actor) {
  if (!actor.items.some((i) => i.slug === 'me-vanguard-vanguard-strike')) return;
  const old = actor.itemTypes.effect.filter((e) => e.slug === SYNERGY_SLUG).map((e) => e.id);
  if (old.length) await actor.deleteEmbeddedDocuments('Item', old);
  const dice = (actor.level ?? 1) >= 18 ? 4 : 3;
  await actor.createEmbeddedDocuments('Item', [{
    name: 'Weapon Synergy',
    type: 'effect',
    img: 'icons/magic/lightning/bolt-strike-purple-pink.webp',
    system: {
      slug: SYNERGY_SLUG,
      description: { value: `<p>Your Strikes deal an extra <strong>${dice}d6 force</strong> damage until the end of your next turn (Vanguard Strike).</p>` },
      duration: { value: 1, unit: 'rounds', expiry: 'turn-end', sustained: false },
      rules: [],
    },
  }]);
}

// ── APEX VANGUARD: A SECOND NOVA ────────────────────────────────────────────
// Apex Vanguard can use Nova twice per turn. The second ignores Nova's cooldown, detonates
// as if the barrier were full (even when it is empty), and leaves the barrier as it is.
// Novas are counted per turn (combat, round, turn); outside an encounter the Nova right
// after another is the second.

/** How many Novas the actor has used this turn. */
function novasThisTurn(actor) {
  const seen = actor.getFlag(MODULE_ID, 'novaTurn');
  if (!seen || seen.key !== (turnKey() ?? 'any')) return 0;
  // outside an encounter, a pair of Novas starts the count again
  return seen.key === 'any' && seen.n >= 2 ? 0 : seen.n;
}

/** Whether the actor's next Nova is Apex Vanguard's free second one. */
const apexSecondNova = (actor) => actor.items.some((i) => i.slug === 'me-vanguard-apex-vanguard') && novasThisTurn(actor) === 1;

/**
 * Nova spends the whole barrier; its HP sets the dice every target saves against. Returns that
 * HP. Apex Vanguard's second Nova in a turn uses the barrier's maximum and spends nothing.
 */
async function novaUsed(actor) {
  const barrier = getBarrier(actor);
  const apex = !!barrier && apexSecondNova(actor);
  const now = apex ? barrier.flags[MODULE_ID].barrierMax : barrier?.flags[MODULE_ID].barrierCurrent ?? 0;
  // novaAt names this detonation, so Nova Cascade refills once however many creatures crit-fail
  await actor.update({
    [`flags.${MODULE_ID}.novaCharge`]: now,
    [`flags.${MODULE_ID}.novaAt`]: Date.now(),
    [`flags.${MODULE_ID}.novaTurn`]: { key: turnKey() ?? 'any', n: novasThisTurn(actor) + 1 },
  });
  if (now > 0 && !apex) await setBarrier(barrier, 0);
  const dice = `${novaDice(now)}d6 force${actor.items.some((i) => i.slug === 'me-upgrade-nova') ? ' + 2d6 (Nova Upgrade)' : ''}`;
  postResult(actor, 'Nova', 'success', [apex
    ? `Apex Vanguard, second Nova: detonates as if the barrier were full (${now} HP): ${dice}. The barrier stays at ${barrier.flags[MODULE_ID].barrierCurrent ?? 0}.`
    : now > 0 ? `Detonates ${now} barrier HP: ${dice}`
    : 'No barrier HP to detonate (Nova needs an active Biotic Barrier)']);
  await grantMomentum(actor);
  return now;
}

/** Improved Vanguard Mastery: after Charge or Nova, the next Strike this turn deals +1d6 void. */
async function grantMomentum(actor) {
  if (!actor.flags?.[MODULE_ID]?.momentumStrike || actor.itemTypes.effect.some((e) => e.slug === MOMENTUM_SLUG)) return;
  await actor.createEmbeddedDocuments('Item', [{
    name: 'Vanguard Momentum',
    type: 'effect',
    img: 'icons/magic/movement/trail-streak-impact-blue.webp',
    system: {
      slug: MOMENTUM_SLUG,
      description: { value: '<p>Your next Strike this turn deals an extra <strong>1d6 void</strong> damage (Improved Vanguard Mastery). Remove this effect after that Strike.</p>' },
      duration: { value: 0, unit: 'rounds', expiry: 'turn-end', sustained: false },
      rules: [],
    },
  }]);
}

// ── ONE-CLICK VANGUARD POWERS ───────────────────────────────────────────────
// Posting Biotic Charge or Vanguard Rush with one creature targeted:
// the poster's client notes the target on the card, then the active GM's client
// (which can move any token and roll any save) checks the cooldowns and range,
// moves the Vanguard next to the target, starts the cooldowns, and rolls the
// target's Reflex save. That save goes through the save-result hook above like any
// other, which then sets off Nova for Rush (whatever the save).
// Nova on its own needs no target: it detonates around the Vanguard. Every Nova
// rolls the Fortitude save of each creature in its area not on the Vanguard's side.
const CHARGE_COOLDOWN = 'me-effect-charge-cooldown';
const NOVA_COOLDOWN = 'me-effect-nova-cooldown';
const RUSH_COOLDOWN = 'me-effect-rush-cooldown';
const COOLDOWN_NAMES = { [CHARGE_COOLDOWN]: 'Biotic Charge', [NOVA_COOLDOWN]: 'Nova', [RUSH_COOLDOWN]: 'Vanguard Rush' };
// what a Vanguard card sets off: Rush ends in Nova; Chain Charge is a free Charge
const CHAINS = { 'me-vanguard-rush': 'rush', 'me-vanguard-chain-charge': 'free' };
const CHAIN_OPT = 'me-chain:';
const baseSlug = (item) => item?.slug?.replace(/^me-npc-/, 'me-');
const vanguardAutomation = () => !!game.settings.get(MODULE_ID, 'automateCharge') && !!game.users?.activeGM;

/** Whole rounds left on a cooldown effect, or 0 when there is none. */
function cooldownLeft(actor, slug) {
  const effect = actor.itemTypes?.effect?.find((e) => e.slug === slug);
  if (!effect) return 0;
  return Math.max(1, Math.ceil((effect.remainingDuration?.remaining ?? 0) / (CONFIG.time?.roundTime || 6)));
}

// Biotic powers cool down for 4 rounds, less the Recharge of the bio-amp the biotic wears
const BIOTIC_COOLDOWN = 4;
const ampRecharge = (actor) => Math.max(0, Number(actor.flags?.[MODULE_ID]?.bioticRecharge) || 0);

/**
 * How long each Vanguard cooldown lasts: Biotic Charge 2 rounds (1 with Improved Charge),
 * Nova and Vanguard Rush 4 rounds less the amp's Recharge (minimum 1).
 */
function cooldownRounds(actor, slug) {
  if (slug === CHARGE_COOLDOWN) return actor.items.some((i) => i.slug === 'me-vanguard-improved-charge') ? 1 : 2;
  return bioticCooldownRounds(actor);
}

/**
 * A biotic power's cooldown: 4 rounds, less the bio-amp's Recharge (minimum 1). Adept Mastery
 * takes a further round off, but never to less than 2: only an amp reaches 1 round. Nova uses
 * this as it stands; other powers go through bioticPowerCooldown.
 */
function bioticCooldownRounds(actor) {
  const base = Math.max(1, BIOTIC_COOLDOWN - ampRecharge(actor));
  const cut = Math.max(0, Number(actor.flags?.[MODULE_ID]?.bioticCooldownCut) || 0);
  return cut ? Math.min(base, Math.max(2, base - cut)) : base;
}

/**
 * A tech power's cooldown: 7 rounds less the Intelligence modifier (minimum 1). The Tech Mastery
 * feats and the class masteries take rounds off that, but never to less than 2: only the
 * attribute brings a tech cooldown down to 1 round.
 */
const TECH_COOLDOWN = 7;
/** The attribute a character's tech cooldowns run on: Intelligence, or a better one a feature allows (Sentinel Mastery: Charisma). */
function techCooldownAttribute(actor) {
  const mod = (a) => Number(actor.system?.abilities?.[a]?.mod) || 0;
  const alt = actor.flags?.[MODULE_ID]?.techCooldownAlt;
  return alt && mod(alt) > mod('int') ? { attribute: alt, mod: mod(alt) } : { attribute: 'int', mod: mod('int') };
}
function techCooldownRounds(actor) {
  const flags = actor.flags?.[MODULE_ID] ?? {};
  const int = techCooldownAttribute(actor).mod;
  const base = Math.max(1, TECH_COOLDOWN - int);
  const cut = Math.max(0, Number(flags.techMasteryCooldownCut) || 0) + Math.max(0, Number(flags.techCooldownCut) || 0);
  return cut ? Math.min(base, Math.max(2, base - cut)) : base;
}

/**
 * The cooldown a biotic power other than Charge and Nova starts. A 1-round cooldown (a
 * Recharge 3 amp) goes only to the first such power used each turn; the rest that turn take 2
 * rounds. The 1-round effect is the marker: it ends when the character's next turn starts.
 */
function bioticPowerCooldown(actor) {
  const rounds = bioticCooldownRounds(actor);
  if (rounds > 1) return { rounds, first: false, later: false };
  const usedOne = !!actor.itemTypes?.effect?.some((e) => e.flags?.[MODULE_ID]?.firstBioticPower && !e.isExpired);
  return usedOne ? { rounds: 2, first: false, later: true } : { rounds: 1, first: true, later: false };
}

// Charge and Nova keep the cooldown handling written for them; every other biotic power
// (slug me-biotic-*) and every tech power (me-tech-*) gets a cooldown effect of its own when
// a character posts its card.
const OWN_COOLDOWN = ['me-biotic-charge', 'me-biotic-nova'];
const POWER_COOLDOWN_PREFIX = 'me-effect-cooldown-';
const isTechPower = (item) => !!item.slug?.startsWith('me-tech-');
const tracksCooldown = (item) => (item.slug?.startsWith('me-biotic-') || isTechPower(item) || !!SOLDIER_POWERS[item.slug]) && !OWN_COOLDOWN.includes(item.slug);
/** The slug of a power's cooldown effect. Feats that share a cooldown (the three Concussive Shots, say) share one effect. */
const cooldownSlug = (item) => `${POWER_COOLDOWN_PREFIX}${SOLDIER_POWERS[item.slug]?.group ?? item.slug}`;

/** A character used a biotic power: start its cooldown, or say it is still cooling down. */
async function powerUsed(actor, item) {
  const slug = cooldownSlug(item);
  const plural = (n) => `${n} round${n === 1 ? '' : 's'}`;
  const left = cooldownLeft(actor, slug);
  if (left) {
    postResult(actor, item.name, 'On cooldown', [`${item.name} is still cooling down (${plural(left)} left).`], { owners: true });
    return;
  }
  const flags = actor.flags?.[MODULE_ID] ?? {};
  let rounds, rule, first = false, floor = 'minimum 1';
  if (SOLDIER_POWERS[item.slug]) {
    ({ rounds, rule } = soldierCooldown(actor, item));
  } else if (isTechPower(item)) {
    rounds = techCooldownRounds(actor);
    const { attribute, mod: int } = techCooldownAttribute(actor), mastery = Number(flags.techMasteryCooldownCut) || 0, cut = Number(flags.techCooldownCut) || 0;
    const attributeName = { int: 'Intelligence', cha: 'Charisma' }[attribute] ?? attribute;
    rule = ['7 rounds', int ? `less ${int} for ${attributeName}` : null, mastery ? `less ${mastery} from Tech Mastery (never below 2)` : null,
      cut ? `less ${cut} from ${actor.items.some((i) => i.slug === 'me-infiltrator-mastery') ? 'Infiltrator' : 'Engineer'} Mastery (never below 2)` : null].filter(Boolean).join(', ');
  } else {
    let later;
    ({ rounds, first, later } = bioticPowerCooldown(actor));
    if (first) floor = 'the first biotic power this turn';
    if (later) floor = 'only the first biotic power each turn cools down in 1 round';
    const recharge = ampRecharge(actor), cut = Number(flags.bioticCooldownCut) || 0;
    rule = ['4 rounds', recharge ? `less ${recharge} from the bio-amp` : null, cut ? `less ${cut} from Adept Mastery (never below 2)` : null].filter(Boolean).join(', ');
  }
  await actor.createEmbeddedDocuments('Item', [{
    name: `${SOLDIER_POWERS[item.slug]?.label ?? item.name} Cooldown`,
    type: 'effect',
    img: item.img,
    system: {
      slug,
      description: { value: `<p>${item.name} can be used again when this ends: ${plural(rounds)} (${rule}; ${floor}).</p>` },
      duration: { value: rounds, unit: 'rounds', expiry: 'turn-start', sustained: false },
      tokenIcon: { show: false },
      rules: [],
    },
    ...(first ? { flags: { [MODULE_ID]: { firstBioticPower: true } } } : {}),
  }]);
  return rounds;
}

// ── IMPROVED ENGINEER MASTERY ───────────────────────────────────────────────
// Once per round, when one of the Engineer's tech powers deals damage, the tech cooldown
// with the longest left to run is one round shorter. Rounds are the encounter's; outside
// one, six seconds stand in for a round.
const engineerCuts = new Map();
async function engineerCooldownCut(caster) {
  const combat = game.combat?.started ? game.combat : null;
  const now = combat ? `${combat.id}.${combat.round}` : Math.floor(Date.now() / 6000);
  const id = caster.uuid ?? caster.id ?? caster.name;
  if (engineerCuts.get(id) === now) return null;
  const running = (caster.itemTypes?.effect ?? []).filter((e) => e.slug?.startsWith(`${POWER_COOLDOWN_PREFIX}me-tech-`))
    .map((e) => ({ effect: e, left: cooldownLeft(caster, e.slug) }))
    .sort((a, b) => b.left - a.left)[0];
  if (!running) return null;
  engineerCuts.set(id, now);                       // claimed before anything is awaited: an area's saves arrive together
  const name = running.effect.name.replace(/ Cooldown$/, '');
  if (running.left <= 1) {
    await running.effect.delete();
    return `Improved Engineer Mastery: ${name} is ready again`;
  }
  await running.effect.update({ 'system.duration.value': Math.max(1, (running.effect.system.duration.value ?? running.left) - 1) });
  return `Improved Engineer Mastery: ${name}'s cooldown is 1 round shorter (${running.left - 1} left)`;
}

// ── THE ENGINEER'S DRONE AND TURRET ─────────────────────────────────────────
// Combat Drone and Sentry Turret put a token on the scene, with numbers worked out from the
// Engineer: attack = class DC − 10, damage dice multiplied by level as powers are, AC = class
// DC − 3 (drone) or − 4 (turret), HP = 15 + 5 × level (drone) or 22 + 8 × level (turret).
// Each Engineer has one actor of each kind in the world, made on first use from the creatures
// compendium and refreshed on every deployment; its tokens are unlinked, so two drones
// (Drone Commander) keep their own HP.
const PETS = {
  'me-tech-combat-drone': { kind: 'drone', name: 'Combat Drone', actorId: 'meEngCombatDrone' },
  'me-tech-sentry-turret': { kind: 'turret', name: 'Sentry Turret', actorId: 'meEngSentryTurrt' },
};

/** The numbers a drone or turret has for this Engineer. */
function petStats(actor, kind) {
  const level = Math.max(1, actor.level ?? 1), m = diceMult(actor);
  const dc = actor.system?.attributes?.classDC?.value ?? 10 + level;
  const has = (slug) => !!actor.items?.some((i) => i.slug === slug);
  if (kind === 'drone') {
    return {
      level, dc, attack: dc - 10, damage: `${m}d6`, damageType: 'electricity', ac: dc - 3, save: dc - 12,
      hp: 15 + 5 * level + (has('me-engineer-mastery-improved') ? 2 * level : 0) + (has('me-upgrade-combat-drone') ? level : 0),
      strikes: has('me-upgrade-combat-drone') ? 2 : 1, limit: has('me-engineer-drone-commander') ? 2 : 1,
    };
  }
  return { level, dc, attack: dc - 10, damage: `${m}d8+${2 * m}`, damageType: 'piercing', ac: dc - 4, save: dc - 12, hp: 22 + 8 * level, strikes: 1, limit: 1 };
}

/** The nearest open grid space around a token, as { x, y }, or null when everything within 3 spaces is taken. */
function openSpaceBeside(source) {
  const scene = source.parent, size = scene.grid.size, at = placed(source);
  const taken = (x, y) => scene.tokens.some((t) => {
    const q = placed(t);
    return x < q.x + t.width * size && x + size > q.x && y < q.y + t.height * size && y + size > q.y;
  });
  const inside = (x, y) => !scene.dimensions || (x >= scene.dimensions.sceneX && y >= scene.dimensions.sceneY
    && x + size <= scene.dimensions.sceneX + scene.dimensions.sceneWidth && y + size <= scene.dimensions.sceneY + scene.dimensions.sceneHeight);
  for (let ring = 1; ring <= 3; ring++) {
    for (let dy = -ring; dy < source.height + ring; dy++) {
      for (let dx = -ring; dx < source.width + ring; dx++) {
        const edge = dx === -ring || dy === -ring || dx === source.width + ring - 1 || dy === source.height + ring - 1;
        const x = at.x + dx * size, y = at.y + dy * size;
        if (edge && inside(x, y) && !taken(x, y)) return { x, y };
      }
    }
  }
  return null;
}

/** An Engineer used Combat Drone or Sentry Turret: start the cooldown and put the token beside them. */
async function deployPet(message, item) {
  const actor = item.actor, def = PETS[item.slug];
  const tell = (outcome, lines) => postResult(actor, item.name, outcome, lines, { owners: true });
  const plural = (n) => `${n} round${n === 1 ? '' : 's'}`;
  const left = cooldownLeft(actor, `${POWER_COOLDOWN_PREFIX}${item.slug}`);
  if (left) return tell('On cooldown', [`${item.name} is still cooling down (${plural(left)} left). Nothing was deployed.`]);
  const rounds = await powerUsed(actor, item);

  const stats = petStats(actor, def.kind);
  let pet = game.actors.find((a) => a.flags?.[MODULE_ID]?.pet?.owner === actor.id && a.flags[MODULE_ID].pet.kind === def.kind);
  if (!pet) {
    const pack = game.system.id === 'sf2e' ? 'sf2e-me-creatures' : 'me-creatures';
    const source = await fromUuid(`Compendium.${MODULE_ID}.${pack}.Actor.${def.actorId}`).catch(() => null);
    if (!source) return tell('Not automated', [`The ${def.name} is missing from the creatures compendium; place one by hand.`]);
    const data = source.toObject();
    delete data._id;
    pet = await Actor.create({
      ...data, name: `${actor.name}'s ${def.name}`, folder: null,
      ownership: foundry.utils.deepClone(actor.ownership),
      flags: { ...data.flags, [MODULE_ID]: { pet: { owner: actor.id, kind: def.kind } } },
    });
  }
  await pet.update({
    'system.details.level.value': stats.level,
    'system.details.alliance': actor.alliance ?? 'party',
    'system.attributes.ac.value': stats.ac,
    'system.attributes.hp.max': stats.hp,
    'system.saves.fortitude.value': stats.save,
    'system.saves.reflex.value': stats.save,
    'system.saves.will.value': stats.save,
    'system.perception.mod': stats.save,
    ownership: foundry.utils.deepClone(actor.ownership),
  });
  // on its own, after the new maximum is in place: the system caps current HP at the old maximum
  await pet.update({ 'system.attributes.hp.value': stats.hp });
  const strike = pet.items.find((i) => i.type === 'melee');
  if (strike) {
    const key = Object.keys(strike.system.damageRolls ?? {})[0] ?? '0';
    await strike.update({ 'system.bonus.value': stats.attack, [`system.damageRolls.${key}.damage`]: stats.damage, [`system.damageRolls.${key}.damageType`]: stats.damageType });
  }
  // actions that carry a save button take the Engineer's class DC
  for (const action of pet.items.filter((i) => i.type === 'action' && /dc:\d+/.test(i.system.description?.value ?? ''))) {
    await action.update({ 'system.description.value': action.system.description.value.replace(/dc:\d+/g, `dc:${stats.dc}`) });
  }

  const sign = (n) => (n >= 0 ? `+${n}` : String(n));
  const lines = [`Attack ${sign(stats.attack)}, ${stats.damage} ${stats.damageType}; AC ${stats.ac}, ${stats.hp} HP`,
    def.kind === 'drone' ? `On each of your turns it makes ${stats.strikes === 2 ? 'two Strikes (the second at −5)' : 'one Strike'} without costing you an action`
      : 'On each of your turns it fires once at the nearest enemy within 60 feet, or at a target you name'];
  if (rounds) lines.push(`Cooldown: ${plural(rounds)}`);
  const source = speakerToken(message, actor);
  if (!source) {
    lines.push(`${actor.name} has no token on the scene: drag ${pet.name} from the Actors tab.`);
    return tell('Deployed', lines);
  }
  const scene = source.parent;
  // one at a time (two drones with Drone Commander): the oldest makes way
  const out = scene.tokens.filter((t) => t.actorId === pet.id || t.actor?.id === pet.id);
  const extra = out.slice(0, Math.max(0, out.length - (stats.limit - 1)));
  if (extra.length) await scene.deleteEmbeddedDocuments('Token', extra.map((t) => t.id));
  const space = openSpaceBeside(source);
  if (!space) {
    lines.push(`No open space beside ${actor.name}: drag ${pet.name} from the Actors tab.`);
    return tell('Deployed', lines);
  }
  const token = (await pet.getTokenDocument({ x: space.x, y: space.y })).toObject();
  await scene.createEmbeddedDocuments('Token', [{ ...token, actorLink: false, disposition: source.disposition }]);
  lines.push(`Placed beside ${actor.name}: move it to the point you chose, within 30 feet`);
  if (extra.length) lines.push(`Replaced the ${def.name.toLowerCase()} already out`);
  tell('Deployed', lines);
}

/**
 * Start one of the Vanguard cooldowns. Returns its rounds. `lockout` instead holds the power
 * back only until the start of the actor's next turn (after a Rush reset, see below).
 */
async function startCooldown(actor, slug, img, { lockout = false } = {}) {
  const rounds = lockout ? 1 : cooldownRounds(actor, slug);
  const name = COOLDOWN_NAMES[slug];
  const recharge = ampRecharge(actor);
  const rule = lockout ? 'after a Vanguard Rush reset, only one of Charge and Nova this turn'
    : slug === CHARGE_COOLDOWN ? '2 rounds, 1 with Improved Charge'
    : recharge ? `4 − ${recharge} from the bio-amp, minimum 1` : '4 rounds without a bio-amp';
  await actor.createEmbeddedDocuments('Item', [{
    name: `${name} Cooldown`,
    type: 'effect',
    img,
    system: {
      slug,
      description: { value: `<p>${name} can be used again when this ends: ${rounds} round${rounds === 1 ? '' : 's'} (${rule}).</p>` },
      duration: { value: rounds, unit: 'rounds', expiry: 'turn-start', sustained: false },
      rules: [],
    },
  }]);
  return rounds;
}

// ── VANGUARD RUSH RESET ─────────────────────────────────────────────────────
// Vanguard Rush: when the Charge target fails its save, Charge's and
// Nova's cooldowns reset at once, and the Vanguard may use ONE of them again this turn, not
// both. The barrier also refills to half after the Nova: enough for a half-strength second
// Nova now, and the next Rush's Charge tops it back to full. Rush is a flourish: once per turn.

/** The current turn as a key (combat, round, turn), or null outside an encounter. */
function turnKey() {
  const c = game.combat;
  return c?.started ? `${c.id}.${c.round}.${c.turn}` : null;
}

/** After the Nova of a Rush: reset the cooldowns if the Charge target failed. */
async function rushReset(actor, outcome, name) {
  if (outcome !== 'failure' && outcome !== 'criticalFailure') return;
  const ids = actor.itemTypes.effect.filter((e) => e.slug === CHARGE_COOLDOWN || e.slug === NOVA_COOLDOWN).map((e) => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments('Item', ids);
  await actor.setFlag(MODULE_ID, 'rushFollowUp', turnKey() ?? 'any');
  const lines = [`The target failed: Biotic Charge and Nova are ready again. Use one of them once more this turn, not both.`];
  // the barrier refills to half after the Nova, so the next Rush's Charge tops it back to full
  const barrier = getBarrier(actor);
  if (barrier) {
    const max = barrier.flags[MODULE_ID].barrierMax;
    const now = barrier.flags[MODULE_ID].barrierCurrent ?? 0;
    const half = Math.ceil(max / 2);
    if (now < half) await setBarrier(barrier, half);
    lines.push(`Biotic Barrier refilled to ${Math.max(now, half)} of ${max}`);
  }
  postResult(actor, name, 'Cooldowns reset', lines, { owners: true });
}

/**
 * A Charge or Nova used after a reset: the other is held back until the Vanguard's next turn.
 * Returns a line for the card, or null when there was no reset this turn.
 */
async function spendRushFollowUp(actor, used, img) {
  const key = actor.getFlag(MODULE_ID, 'rushFollowUp');
  if (!key) return null;
  await actor.unsetFlag(MODULE_ID, 'rushFollowUp');
  if (key !== (turnKey() ?? 'any')) return null;          // an earlier turn's reset, unused
  const other = used === CHARGE_COOLDOWN ? NOVA_COOLDOWN : CHARGE_COOLDOWN;
  if (cooldownLeft(actor, other)) return null;
  await startCooldown(actor, other, img, { lockout: true });
  return `${COOLDOWN_NAMES[other]} waits for your next turn: after a Rush reset, Charge or Nova, not both`;
}

/** Whether this turn already had a reset whose follow-up is still open. */
const rushFollowUpOpen = (actor) => {
  const key = actor.getFlag(MODULE_ID, 'rushFollowUp');
  return !!key && key === (turnKey() ?? 'any');
};

Hooks.on('preCreateChatMessage', (message) => {
  if (!game.settings.get(MODULE_ID, 'automateCharge')) return;
  const sys = sysFlags(message);
  if (sys?.context || !['feat', 'action'].includes(sys?.origin?.type) || !sys.origin.uuid) return;
  const slug = baseSlug(fromUuidSync(sys.origin.uuid));
  if (slug === 'me-biotic-charge' || CHAINS[slug]) {
    const targets = [...game.user.targets].map((t) => t.document.uuid);
    message.updateSource({ [`flags.${MODULE_ID}.charge`]: { targets, chain: CHAINS[slug] ?? null } });
  } else if (slug === 'me-biotic-nova') {
    message.updateSource({ [`flags.${MODULE_ID}.nova`]: true });
  }
});

Hooks.on('createChatMessage', async (message) => {
  const own = message.flags?.[MODULE_ID];
  if (!(own?.charge || own?.nova) || !game.users.activeGM?.isSelf) return;
  const item = await fromUuid(sysFlags(message)?.origin?.uuid).catch(() => null);
  if (!item?.actor) return;
  try {
    if (own.nova) await runNova(message, item);
    else await runCharge(message, item, own.charge.targets ?? [], own.charge.chain ?? null);
  } catch (err) {
    console.warn(`ME Powers | ${item.name} automation failed`, err);
    postResult(item.actor, item.name, 'Not automated', [`Something went wrong; resolve this ${item.name} by hand.`], { owners: true });
  }
});

/** The token that posted the card, or the actor's token on the given scene (or the current one). */
function speakerToken(message, actor, scene) {
  const scn = scene ?? game.scenes.get(message.speaker?.scene) ?? canvas?.scene;
  const posted = scn?.tokens.get(message.speaker?.token);
  return posted?.actor === actor ? posted : actor.getActiveTokens(true, true).find((t) => !scn || t.parent === scn) ?? null;
}

async function runCharge(message, item, targetUuids, chain) {
  const actor = item.actor;
  const name = chain ? item.name : 'Biotic Charge';
  const tell = (lines) => postResult(actor, name, 'Not automated', lines, { owners: true });

  // Rush uses Charge and Nova, so both cooldowns stand in its way (it has none of its
  // own); Chain Charge is a Charge outside the cooldowns
  const combo = chain === 'rush';
  const blocking = chain === 'free' ? [] : combo ? [CHARGE_COOLDOWN, NOVA_COOLDOWN] : [CHARGE_COOLDOWN];
  for (const slug of blocking) {
    const left = cooldownLeft(actor, slug);
    if (left) return tell([`${COOLDOWN_NAMES[slug]} is on cooldown (${left} round${left === 1 ? '' : 's'} left). Nothing moved and no save was rolled.`]);
  }
  // after a reset the Vanguard gets one more Charge or Nova, not a combo that is both
  if (combo && rushFollowUpOpen(actor)) return tell([`After a Vanguard Rush reset, use Biotic Charge or Nova once more this turn, not ${name}.`]);
  // Rush is a flourish: once per turn
  if (chain === 'rush' && turnKey() && actor.getFlag(MODULE_ID, 'rushTurn') === turnKey()) {
    return tell(['Vanguard Rush is a flourish: you have already used it this turn.']);
  }
  // Rush needs no barrier HP: the Charge refills it before the Nova (an empty one is raised if need be)
  const barrier = combo ? await ensureBarrier(actor) : getBarrier(actor);
  if (combo && !barrier) return tell([`${name} could not find the Biotic Barrier effect in the compendium.`]);
  if (targetUuids.length !== 1) {
    return tell([targetUuids.length ? `Target only one creature to automate ${name}.` : `Target a creature before using ${name} to automate it.`]);
  }
  const target = await fromUuid(targetUuids[0]).catch(() => null);
  if (!target?.actor) return tell(['The targeted token is gone.']);

  const scene = target.parent;
  const source = speakerToken(message, actor, scene);
  if (!source) return tell([`${actor.name} has no token on ${scene.name}.`]);

  const range = chain === 'free' ? 30 : 60 + (actor.flags?.[MODULE_ID]?.chargeUpgrade === 'damage' ? 30 : 0);
  const landing = chargeLanding(source, target);
  if (!landing) return tell([`No open space next to ${target.name}.`]);
  if (landing.distance > range) return tell([`${target.name} is out of reach: the nearest space beside it is ${landing.distance} feet away, and Charge covers ${range} feet.`]);

  const lines = [];
  if (chain === 'rush' && turnKey()) await actor.setFlag(MODULE_ID, 'rushTurn', turnKey());
  if (landing.distance > 0) {
    // a blur of biotic light rather than a walk: the beam plays as the token streaks across
    const grid = scene.grid;
    const center = (x, y) => ({ x: x + (source.width * grid.size) / 2, y: y + (source.height * grid.size) / 2 });
    const from = center(placed(source).x, placed(source).y);
    const to = center(landing.x, landing.y);
    // the token sets off as the beam fires and lands as it reaches the end (without an
    // animation it crosses at once, at CHARGE_SPEED)
    const fx = await playChargeBeam(from, to, source.width * grid.size);
    const spaces = Math.hypot(to.x - from.x, to.y - from.y) / grid.size;
    const movementSpeed = fx ? spaces / (fx.travelMs / 1000) : CHARGE_SPEED;
    await source.update({ x: landing.x, y: landing.y }, { animation: { movementSpeed } });
    if (fx) {
      // the impact plays as the token touches down
      await Promise.race([source.object?.movementAnimationPromise ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);
      fx.impact();
    }
    lines.push(`${actor.name} charges ${landing.distance} feet to ${target.name}`);
  }
  const plural = (n) => `${n} round${n === 1 ? '' : 's'}`;
  if (chain === 'free') {
    lines.push('No cooldown: a Chain Charge rides the one before it');
  } else {
    const rounds = await startCooldown(actor, CHARGE_COOLDOWN, item.img);
    if (combo) {
      const nova = await startCooldown(actor, NOVA_COOLDOWN, item.img);
      lines.push(`Cooldowns: Biotic Charge ${plural(rounds)}, Nova ${plural(nova)} (both reset if the target fails its save)`);
    } else {
      lines.push(`Cooldown: ${plural(rounds)}`);
      const held = await spendRushFollowUp(actor, CHARGE_COOLDOWN, item.img);
      if (held) lines.push(held);
    }
  }
  // a plain Charge card refills on use (see chargeUsed); these cards are not one
  if (chain) await chargeUsed(actor);

  // Rush and Chain Charge use the actor's own Charge for its DC and its save
  const charge = chain ? actor.items.find((i) => baseSlug(i) === 'me-biotic-charge') ?? item : item;
  const dc = powerDC(charge);
  if (!dc) {
    lines.push(`Roll ${target.name}'s Reflex save from the Charge card`);
    return postResult(actor, name, 'Charged', lines, { owners: true });
  }
  if (combo) lines.push('Nova follows whatever the target rolls; a failed save resets Charge and Nova');
  postResult(actor, name, 'Charged', lines, { owners: true });
  await target.actor.saves.reflex.roll({
    dc: { value: dc },
    extraRollOptions: [`${OPT_PREFIX}${baseSlug(charge) === 'me-biotic-charge' ? charge.slug : 'me-biotic-charge'}`, ...(combo ? [`${CHAIN_OPT}${chain}`] : [])],
    origin: actor, item: charge, token: target, skipDialog: true,
  });
}

// ── THE CHARGE, SEEN ────────────────────────────────────────────────────────
// The token crosses in a fraction of a second (grid spaces per second; a walk is 6), and
// with Sequencer and JB2A installed a blue beam streaks from start to landing, with a flash
// where the Vanguard leaves and a ground-cracking impact where it lands. JB2A only has to be
// installed, not enabled: its files are played by path. The patreon pack has blue versions;
// the free pack's orange ones are shifted to blue.
const CHARGE_SPEED = 60;
// JB2A Beam001 (every length): a wind-up glow at the caster, then the beam fires at 1.17 s
// and its tip reaches the far end at 1.30 s (measured frame by frame). It plays at 2x.
const BEAM_RATE = 2;
const BEAM_FIRES_MS = (1.17 / BEAM_RATE) * 1000;
const BEAM_REACHES_MS = (1.30 / BEAM_RATE) * 1000;
// a token move waits on the server before it starts (measured ~50 ms), so it is sent this early
const MOVE_LEAD_MS = 50;
const JB2A_PACKS = [
  { id: 'jb2a_patreon', color: 'Blue', hue: 0 },
  { id: 'JB2A_DnD5e', color: 'Orange', hue: 190 },
];

/** The installed JB2A pack the Charge animation can use, with its file paths, or null. */
function chargeArt() {
  if (!game.settings.get(MODULE_ID, 'chargeAnimation')) return null;
  if (!game.modules.get('sequencer')?.active || typeof Sequence !== 'function') return null;
  const pack = JB2A_PACKS.find((p) => game.modules.get(p.id));
  if (!pack) return null;
  const lib = `modules/${pack.id}/Library`;
  const beam = (reach) => `${lib}/Generic/RangedSpell/Beam/Beam001_01_Regular_${pack.color}_${reach}.webm`;
  return {
    pack,
    // the teleport flash is blue in both packs
    flash: `${lib}/Generic/Energy/Teleport/Teleport01_01_Regular_Blue_500x300.webm`,
    beam: (feet) => beam(feet <= 15 ? '15ft_1000x400' : feet <= 30 ? '30ft_1600x400' : feet <= 60 ? '60ft_2800x400' : '90ft_4000x400'),
    beams: ['15ft_1000x400', '30ft_1600x400', '60ft_2800x400', '90ft_4000x400'].map(beam),
    impact: `${lib}/Generic/Impact/GroundCrackImpact_01_Regular_${pack.color}_600x600.webm`,
  };
}

// Nova's detonation. "pulse" (the default): JB2A's Explosion 04 blast under its OutPulse 02
// wave, the wave played at 1.5x so it rolls out in about 1.6 s. "shockwave": Thunderwave.
// Purple in the patreon pack; the free pack only has these in blue, shifted to purple.
const NOVA_PACKS = [
  {
    id: 'jb2a_patreon', hue: 0,
    blast: 'Generic/Explosion/Explosion_04_Dark_Purple_400x400',
    wave: 'Generic/Template/Circle/OutPulse/OutPulse_02_Regular_PurplePink_Burst_600x600',
    shockwave: '1st_Level/Thunderwave/Thunderwave_01_Dark_Purple_Center_600x600',
  },
  {
    id: 'JB2A_DnD5e', hue: 45,
    blast: 'Generic/Explosion/Explosion_04_Regular_Blue_400x400',
    wave: 'Generic/Template/Circle/OutPulse/OutPulse_02_Regular_BlueWhite_Burst_600x600',
    shockwave: '1st_Level/Thunderwave/Thunderwave_01_Bright_Blue_Center_600x600',
  },
];
const NOVA_WAVE_RATE = 1.5;
// rolling the saves stalls the canvas for a moment, so they wait until the wave is under way
const NOVA_SAVES_DELAY_MS = 500;

/** The Nova animation the setting asks for, from the installed JB2A pack ({ hue, layers }), or null. */
function novaArt() {
  const style = game.settings.get(MODULE_ID, 'novaAnimation');
  if (!style || style === 'off') return null;
  if (!game.modules.get('sequencer')?.active || typeof Sequence !== 'function') return null;
  const pack = NOVA_PACKS.find((p) => game.modules.get(p.id));
  if (!pack) return null;
  const file = (path) => `modules/${pack.id}/Library/${path}.webm`;
  const layers = style === 'shockwave'
    ? [{ file: file(pack.shockwave), rate: 1 }]
    : [{ file: file(pack.wave), rate: NOVA_WAVE_RATE }, { file: file(pack.blast), rate: 1 }];
  return { hue: pack.hue, layers };
}

/**
 * Play Nova's pulse around the Vanguard's token, filling an emanation of `radius` feet.
 * Returns whether an animation was started.
 */
function playNovaPulse(source, radius) {
  try {
    const art = novaArt();
    if (!art) return false;
    const grid = canvas.grid;
    // the emanation's width: the token plus the radius on each side
    const size = (source.width + (2 * radius) / grid.distance) * grid.size;
    const seq = new Sequence({ moduleName: MODULE_ID, softFail: true });
    for (const { file, rate } of art.layers) {
      const effect = seq.effect().file(file).atLocation(source).size(size).playbackRate(rate).fadeOut(250);
      if (art.hue) effect.filter('ColorMatrix', { hue: art.hue });
    }
    seq.play().catch((err) => console.warn('ME Powers | Nova animation failed', err));
    return true;
  } catch (err) {
    console.warn('ME Powers | Nova animation failed', err);
    return false;
  }
}

// Load the Charge's and Nova's videos on every client up front, so they start the moment
// they are used
Hooks.once('ready', () => {
  try {
    const art = chargeArt();
    if (art) Sequencer.Preloader?.preload?.([art.flash, ...art.beams, art.impact], false);
    const nova = novaArt();
    if (nova) Sequencer.Preloader?.preload?.(nova.layers.map((l) => l.file), false);
  } catch (err) {
    console.warn('ME Powers | could not preload the power animations', err);
  }
});

/**
 * Play the Charge's flash and beam. Resolves at the moment the token should set off (as the
 * beam fires, less the server's lag) with { travelMs, impact }: how long the crossing should
 * take so the token lands as the beam's tip reaches the end, and a function that plays the
 * impact, to be called when the token lands. Resolves at once (null) when there is no
 * animation, and never later than 2 seconds.
 */
function playChargeBeam(from, to, size) {
  return new Promise((resolve) => {
    let settled = false;
    const go = (value) => { if (!settled) { settled = true; resolve(value); } };
    try {
      const art = chargeArt();
      if (!art) return go(null);
      setTimeout(() => go(null), 2000);
      const travelMs = Math.round(BEAM_REACHES_MS - BEAM_FIRES_MS);
      const feet = Math.round(Math.hypot(to.x - from.x, to.y - from.y) / canvas.grid.size * canvas.grid.distance);
      const shift = (effect) => (art.pack.hue ? effect.filter('ColorMatrix', { hue: art.pack.hue }) : effect);
      const impact = () => {
        const hit = new Sequence({ moduleName: MODULE_ID, softFail: true });
        shift(hit.effect().file(art.impact).atLocation(to).size(size * 2).fadeOut(300));
        hit.play().catch((err) => console.warn('ME Powers | Charge impact failed', err));
      };
      const seq = new Sequence({ moduleName: MODULE_ID, softFail: true });
      seq.effect().file(art.flash).atLocation(from).size(size * 1.6).fadeOut(200);
      shift(seq.effect().file(art.beam(feet)).atLocation(from).stretchTo(to).playbackRate(BEAM_RATE).fadeOut(250));
      seq.wait(Math.max(0, Math.round(BEAM_FIRES_MS - MOVE_LEAD_MS)));   // the wind-up glow
      seq.thenDo(() => go({ travelMs, impact }));               // the beam fires: the token streaks along it
      seq.play().catch((err) => { console.warn('ME Powers | Charge animation failed', err); go(null); });
    } catch (err) {
      console.warn('ME Powers | Charge animation failed', err);
      go(null);
    }
  });
}

/** Nova on its own: the cooldown, then the detonation around the Vanguard. */
async function runNova(message, item) {
  const actor = item.actor;
  const tell = (lines) => postResult(actor, 'Nova', 'Not automated', lines, { owners: true });
  // Apex Vanguard's second Nova this turn: no cooldown to wait for or start, no barrier needed
  const apex = !!getBarrier(actor) && apexSecondNova(actor);
  const left = cooldownLeft(actor, NOVA_COOLDOWN);
  if (left && !apex) {
    const twice = actor.items.some((i) => i.slug === 'me-vanguard-apex-vanguard') && novasThisTurn(actor) >= 2;
    return tell([twice ? 'Apex Vanguard: Nova twice per turn, and you have used both. The barrier was not spent.'
      : `Nova is on cooldown (${left} round${left === 1 ? '' : 's'} left). The barrier was not spent.`]);
  }
  if (!apex && !((getBarrier(actor)?.flags[MODULE_ID].barrierCurrent ?? 0) >= 1)) return tell(['Nova needs an active Biotic Barrier with at least 1 HP.']);
  const rounds = apex ? 0 : await startCooldown(actor, NOVA_COOLDOWN, item.img);
  // after a Rush reset, the second Nova is the follow-up: Charge waits for the next turn
  const held = await spendRushFollowUp(actor, NOVA_COOLDOWN, item.img);
  const source = speakerToken(message, actor);
  postResult(actor, 'Nova', 'Detonated', [apex ? 'Apex Vanguard: second Nova this turn, no cooldown' : `Cooldown: ${rounds} round${rounds === 1 ? '' : 's'}`, ...(held ? [held] : [])], { owners: true });
  if (!source) {
    await novaUsed(actor);
    return tell([`${actor.name} has no token on the scene: roll each creature's Fortitude save from the Nova card.`]);
  }
  await novaBurst(actor, source);
}

/**
 * Spend the barrier as Nova and roll the Fortitude save of each creature in its emanation
 * (10 feet, 20 with Nova Upgrade) that is not on the Vanguard's side. Creatures on its side
 * are named so their players can roll; the save-result hook does the rest.
 */
async function novaBurst(actor, source) {
  const hp = await novaUsed(actor);
  if (!(hp > 0)) return;
  const nova = actor.items.find((i) => baseSlug(i) === 'me-biotic-nova');
  const radius = actor.items.some((i) => i.slug === 'me-upgrade-nova') ? 20 : 10;
  const animated = playNovaPulse(source, radius);
  const dc = nova ? powerDC(nova) : actor.system.attributes?.classDC?.value;
  const standing = (t) => !((t.actor.system.attributes?.hp?.max ?? 0) > 0 && (t.actor.system.attributes.hp.value ?? 0) <= 0);
  const inside = source.parent.tokens.filter((t) => t !== source && t.actor && !t.hidden && standing(t) && feetBetween(source, t) <= radius);
  // the system's own sides (party and opposition), or the tokens' dispositions without them
  const ally = (t) => (typeof actor.isAllyOf === 'function' ? actor.isAllyOf(t.actor) : t.disposition === source.disposition);
  const foes = inside.filter((t) => !ally(t));
  const friends = inside.filter((t) => ally(t));
  const lines = [`${radius}-foot emanation: ${foes.length ? foes.map((t) => t.name).join(', ') : 'no one'} ${foes.length <= 1 ? 'rolls' : 'roll'} Fortitude`];
  if (friends.length) lines.push(`On ${actor.name}'s side, so roll by hand from the Nova card: ${friends.map((t) => t.name).join(', ')}`);
  if (!dc) lines.push('No DC found: roll the saves from the Nova card');
  postResult(actor, 'Nova', 'Detonated', lines, { owners: true });
  if (!dc) return;
  if (animated && foes.length) await new Promise((r) => setTimeout(r, NOVA_SAVES_DELAY_MS));
  for (const t of foes) {
    await t.actor.saves.fortitude.roll({
      dc: { value: dc },
      extraRollOptions: [`${OPT_PREFIX}${nova?.slug ?? 'me-biotic-nova'}`],
      origin: actor, item: nova ?? undefined, token: t, skipDialog: true,
    });
  }
}

// ── BIOTIC ATTACK HITS ──────────────────────────────────────────────────────
// Barrier Siphon: a Biotic Attack hit refills 5 barrier HP (10 from 12th level), once a
// round in an encounter. Biotic Warrior: a critical hit knocks the target prone and pushes
// it 5 feet. Run on the active GM's client, which can move the target.
Hooks.on('createChatMessage', async (message) => {
  if (!game.users.activeGM?.isSelf) return;
  const ctx = sysFlags(message)?.context;
  if (ctx?.type !== 'attack-roll' || !(ctx.options ?? []).includes('item:slug:biotic-attack')) return;
  if (ctx.outcome !== 'success' && ctx.outcome !== 'criticalSuccess') return;
  const actor = ChatMessage.getSpeakerActor(message.speaker);
  if (!actor) return;
  const has = (s) => actor.items.some((i) => i.slug === s);
  const lines = [];

  if (has('me-vanguard-barrier-siphon')) {
    const combat = game.combat?.started ? game.combat : null;
    const round = combat ? `${combat.id}.${combat.round}` : null;
    if (!round || actor.getFlag(MODULE_ID, 'siphonRound') !== round) {
      if (round) await actor.setFlag(MODULE_ID, 'siphonRound', round);
      const barrier = getBarrier(actor);
      if (barrier) {
        const max = barrier.flags[MODULE_ID].barrierMax;
        const now = barrier.flags[MODULE_ID].barrierCurrent ?? 0;
        const next = Math.min(max, now + (actor.level >= 12 ? 10 : 5));
        if (next > now) await setBarrier(barrier, next);
        lines.push(`Barrier Siphon: Biotic Barrier ${now} → ${next}`);
      } else {
        lines.push(`Barrier Siphon: ${actor.name} has no Biotic Barrier to refill`);
      }
    }
  }

  if (ctx.outcome === 'criticalSuccess' && has('me-vanguard-biotic-warrior')) {
    const target = await fromUuid(ctx.target?.token ?? '').catch(() => null);
    if (target?.actor) {
      try {
        await target.actor.increaseCondition('prone');
        lines.push(`Biotic Warrior: ${target.name} is knocked prone`);
      } catch (err) {
        lines.push(`Biotic Warrior: knock ${target.name} prone by hand`);
      }
      const from = actor.getActiveTokens(true, true).find((t) => t.parent === target.parent);
      const moved = await pushAway(target, from, 5);
      lines.push(moved === 5 ? 'and pushed 5 feet' : moved === 0 ? 'but not pushed: another creature holds the space behind it' : 'push it 5 feet by hand');
    } else {
      lines.push('Biotic Warrior: the target is knocked prone and pushed 5 feet (apply by hand: no target was set)');
    }
  }

  if (lines.length) postResult(actor, 'Biotic Attack', ctx.outcome, lines, { owners: true });
});

/**
 * Feet between two tokens' nearest spaces, by their committed positions (see placed):
 * adjacent tokens are 5 feet apart, as an emanation counts them.
 */
function feetBetween(a, b) {
  const grid = a.parent.grid;
  const size = grid.size;
  const center = (d) => ({ x: placed(d).x + (d.width * size) / 2, y: placed(d).y + (d.height * size) / 2 });
  const between = grid.measurePath([center(a), center(b)]).distance;
  return Math.max(0, Math.round(between - (((a.width + b.width) / 2) - 1) * grid.distance));
}

/** The DC in the power's own save button (@Check[...|dc:N] or dc:resolve(formula)). */
function powerDC(item) {
  const m = item.system.description?.value?.match(/@Check\[[^\]]*?dc:(?:resolve\(([^|\]]+)\)|(\d+))/);
  if (!m) return item.actor?.system.attributes?.classDC?.value ?? null;
  if (m[2]) return Number(m[2]);
  const value = Roll.safeEval(Roll.replaceFormulaData(m[1], item.getRollData()));
  return Number.isFinite(value) ? value : null;
}

/**
 * The open grid space touching the target that is the shortest move for the
 * charger, as { x, y, distance } (distance in feet), or null when every space
 * beside the target is occupied. Charge phases through obstacles, so walls are
 * ignored.
 */
// A token's committed position. While a move animates, Foundry v14 keeps the old
// position in token.x / token.y; the stored source already holds the new one.
const placed = (d) => d._source ?? d;

function chargeLanding(source, target) {
  const scene = target.parent;
  const grid = scene.grid;
  const size = grid.size;
  const box = (d, x = placed(d).x, y = placed(d).y) => ({ x, y, w: d.width * size, h: d.height * size });
  const t = box(target);
  const occupied = scene.tokens.filter((d) => d !== source && d !== target && !d.hidden).map((d) => box(d));
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const from = center(box(source));

  let best = null;
  const sw = source.width * size, sh = source.height * size;
  for (let x = t.x - sw; x <= t.x + t.w; x += size) {
    for (let y = t.y - sh; y <= t.y + t.h; y += size) {
      const spot = box(source, x, y);
      if (overlaps(spot, t) || occupied.some((o) => overlaps(spot, o))) continue;
      const to = center(spot);
      const distance = Math.round(grid.measurePath([from, to]).distance);
      const straight = Math.hypot(to.x - from.x, to.y - from.y);
      if (!best || distance < best.distance || (distance === best.distance && straight < best.straight)) {
        best = { x, y, distance, straight };
      }
    }
  }
  return best && { x: best.x, y: best.y, distance: best.distance };
}

/**
 * Move a token straight away from another, in whole grid spaces. Like any forced movement it
 * stops short of a space another creature holds. Returns the feet it moved (0 when the first
 * space is taken), or null when there are no tokens to move.
 */
async function pushAway(tokenDoc, fromDoc, feet) {
  if (!tokenDoc || !fromDoc || tokenDoc.parent !== fromDoc.parent) return null;
  const grid = tokenDoc.parent.grid;
  const size = grid.size;
  const center = (d) => ({ x: placed(d).x + (d.width * size) / 2, y: placed(d).y + (d.height * size) / 2 });
  const a = center(fromDoc), b = center(tokenDoc);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (!len) return null;
  const sx = Math.round((b.x - a.x) / len), sy = Math.round((b.y - a.y) / len);
  const spaces = Math.max(1, Math.round(feet / grid.distance));
  const at = placed(tokenDoc);
  const box = (d, x = placed(d).x, y = placed(d).y) => ({ x, y, w: d.width * size, h: d.height * size });
  const others = tokenDoc.parent.tokens.filter((d) => d !== tokenDoc && !d.hidden).map((d) => box(d));
  const overlaps = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
  let moved = 0;
  for (let step = 1; step <= spaces; step++) {
    const spot = box(tokenDoc, at.x + sx * size * step, at.y + sy * size * step);
    if (others.some((o) => overlaps(spot, o))) break;
    moved = step;
  }
  if (moved) await tokenDoc.update({ x: at.x + sx * size * moved, y: at.y + sy * size * moved });
  return moved * grid.distance;
}

// ── THE INFILTRATOR'S CLOAK ─────────────────────────────────────────────────
// Using Tactical Cloak puts its effect on the user. The effect counts the Strikes made under
// it and comes off after the first (the second with Tactical Cloak Upgrade): a miss counts
// when the attack is rolled, a hit when its damage is. When a Strike ends the cloak, Ghost
// Protocol and Superior Infiltrator Mastery leave a wake until the start of the user's next
// turn (concealment and the mastery's resistance). Hunter's Mark marks the user's one target.
// All of it runs on the client that made the roll or posted the card. (Apex Infiltrator's
// automatic critical hit was removed in the 2026-11 rebalance, and its marker with it.)
const CLOAK_SLUG = 'me-effect-tactical-cloak';
const WAKE_SLUG = 'me-effect-cloak-wake';
const MARK_SLUG = 'me-effect-hunters-mark';
const CLOAK_RETURNS = ['me-infiltrator-phantom-protocol', 'me-infiltrator-assassination-protocol'];
const cloakOf = (actor) => actor.itemTypes?.effect?.find((e) => e.slug === CLOAK_SLUG);
/** Strikes the cloak lasts through: one, or two with Tactical Cloak Upgrade. */
const cloakStrikes = (actor) => (actor.items?.some((i) => i.slug === 'me-upgrade-tactical-cloak') ? 2 : 1);

/** Put the Tactical Cloak effect on, unless it is already up. Returns whether it went on. */
async function raiseCloak(actor) {
  if (cloakOf(actor)) return false;
  const pack = game.system.id === 'sf2e' ? 'sf2e-me-tech-powers' : 'me-tech-powers';
  const effect = await fromUuid(`Compendium.${MODULE_ID}.${pack}.Item.meEffTactCloak00`).catch(() => null);
  if (!effect) return false;
  const source = effect.toObject();
  source.flags = { ...source.flags, [MODULE_ID]: { ...source.flags?.[MODULE_ID], cloakStrikes: 0 } };
  await actor.createEmbeddedDocuments('Item', [source]);
  return true;
}

/** An effect that lasts until the start of the actor's next turn. */
const untilNextTurn = (name, slug, img, description, rules) => ({
  name, type: 'effect', img,
  system: { slug, description: { value: description }, duration: { value: 1, unit: 'rounds', expiry: 'turn-start', sustained: false }, rules },
});

/** A Strike ended the cloak: leave the wake, if the Infiltrator has anything that uses one. */
async function cloakWake(actor, img) {
  const has = (s) => actor.items.some((i) => i.slug === s);
  const ghost = has('me-infiltrator-ghost-protocol'), superior = has('me-infiltrator-mastery-superior');
  if (!ghost && !superior) return;
  const rules = [{ key: 'RollOption', domain: 'all', option: 'me-cloak-wake' }], lines = [];
  if (ghost) {
    const condition = game.pf2e?.ConditionManager?.getCondition?.('concealed');
    const uuid = condition?.sourceId ?? condition?._stats?.compendiumSource ?? null;
    if (uuid) rules.push({ key: 'GrantItem', uuid, inMemoryOnly: true });
    lines.push(uuid ? 'Ghost Protocol: concealed until the start of your next turn' : 'Ghost Protocol: you are concealed until the start of your next turn (apply it by hand)');
  }
  if (superior) lines.push('Superior Infiltrator Mastery: resistance 5 to all damage until the start of your next turn');
  for (const old of actor.itemTypes.effect.filter((e) => e.slug === WAKE_SLUG)) await old.delete();
  await actor.createEmbeddedDocuments('Item', [untilNextTurn('Cloak Wake', WAKE_SLUG, img,
    '<p>Your cloak has just dropped, and its field has not fully dispersed. Lasts until the start of your next turn.</p>', rules)]);
  postResult(actor, 'Tactical Cloak', 'Ended by a Strike', lines, { owners: true });
}

/** One Strike has been made under the cloak: count it, and drop the cloak when it was the last. */
async function cloakedStrike(actor, cloak) {
  const made = (Number(cloak.flags?.[MODULE_ID]?.cloakStrikes) || 0) + 1;
  if (made < cloakStrikes(actor)) { await cloak.update({ [`flags.${MODULE_ID}.cloakStrikes`]: made }); return; }
  const img = cloak.img;
  await cloak.delete();
  await cloakWake(actor, img);
}

Hooks.on('createChatMessage', async (message) => {
  if (message.author?.id !== game.user.id) return;
  const ctx = sysFlags(message)?.context;
  if (!['attack-roll', 'damage-roll'].includes(ctx?.type)) return;
  if (!game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) return;
  const actor = ChatMessage.getSpeakerActor(message.speaker);
  const cloak = actor && cloakOf(actor);
  const concussive = actor?.itemTypes?.effect?.find((e) => e.slug === CONCUSSIVE_SLUG);
  if (!cloak && !concussive) return;
  const spent = async () => { if (cloak) await cloakedStrike(actor, cloak); if (concussive) await countedStrike(concussive); };
  const domains = ctx.domains ?? [];
  if (ctx.type === 'attack-roll') {
    if (domains.length && !domains.includes('strike-attack-roll')) return;      // a Strike, not some other attack roll
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') await spent();
    return;
  }
  if (domains.length ? domains.includes('strike-damage') : ctx.sourceType === 'attack') await spent();
});

/** Hunter's Mark: mark the one creature the user has targeted, in place of any earlier mark. */
async function markTarget(actor, item) {
  const targets = [...(game.user.targets ?? [])];
  if (targets.length !== 1) {
    postResult(actor, item.name, 'No mark', ['Target exactly one creature, then use Hunter\'s Mark again.'], { owners: true });
    return;
  }
  const token = targets[0].document ?? targets[0];
  for (const old of actor.itemTypes.effect.filter((e) => e.slug === MARK_SLUG)) await old.delete();
  await actor.createEmbeddedDocuments('Item', [{
    name: `Hunter's Mark: ${token.name}`, type: 'effect', img: item.img,
    system: {
      slug: MARK_SLUG,
      description: { value: `<p>${token.name} is your Marked target. Use Hunter's Mark again to mark another creature, or remove this effect when the mark ends.</p>` },
      duration: { value: -1, unit: 'unlimited', expiry: null, sustained: false },
      rules: [{ key: 'TokenMark', slug: 'hunters-mark', uuid: token.uuid }],
    },
  }]);
}

// ── SOLDIER POWERS ──────────────────────────────────────────────────────────
// Adrenaline Rush, its reaction, Concussive Shot, Fortification, the Frag Grenade and Carnage
// each start a cooldown when a character posts the card, and the first four put their effect
// on. Feats in one group share a cooldown. `by` is what the cooldown is 7 rounds less of:
// Constitution; the higher of Constitution and Strength (the Soldier's key attributes); or the
// higher of Constitution and the character's key attribute (Fortification, which Sentinels share).
const SOLDIER_POWERS = {
  'me-cp-adrenaline-rush':          { group: 'adrenaline-rush', by: 'con', effect: 'meEffAdrenaline0' },
  'me-cp-adrenaline-rush-improved': { group: 'adrenaline-reaction', label: 'Adrenaline Rush Reaction', by: 'con', effect: 'meEffAdrenalinIm' },
  'me-cp-adrenaline-rush-master':   { group: 'adrenaline-reaction', label: 'Adrenaline Rush Reaction', by: 'con', effect: 'meEffAdrnalMastr' },
  'me-cp-concussive-shot':          { group: 'concussive-shot', label: 'Concussive Shot', by: 'conOrStr', dice: 1 },
  'me-cp-concussive-shot-improved': { group: 'concussive-shot', label: 'Concussive Shot', by: 'conOrStr', dice: 2 },
  'me-cp-concussive-shot-master':   { group: 'concussive-shot', label: 'Concussive Shot', by: 'conOrStr', dice: 3 },
  'me-cp-fortification':            { group: 'fortification', label: 'Fortification', by: 'conOrKey', effect: 'meEffFortifictn0' },
  'me-cp-fortification-improved':   { group: 'fortification', label: 'Fortification', by: 'conOrKey', effect: 'meEffFortifictnI' },
  'me-cp-fortification-master':     { group: 'fortification', label: 'Fortification', by: 'conOrKey', effect: 'meEffFortifictnM' },
  'me-frag-grenade':                { group: 'frag-grenade', rounds: 3 },
  'me-soldier-carnage':             { group: 'carnage', by: 'conOrStr' },
};
const CONCUSSIVE_SLUG = 'me-effect-concussive-shot';
const ATTRIBUTE_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

/** How long one of the Soldier's powers cools down, and the sentence that explains it. */
function soldierCooldown(actor, item) {
  const power = SOLDIER_POWERS[item.slug];
  const mod = (a) => Number(actor.system?.abilities?.[a]?.mod) || 0;
  const best = (...list) => list.filter(Boolean).reduce((x, y) => (mod(y) > mod(x) ? y : x));
  let base, rule;
  if (power.rounds) { base = power.rounds; rule = `${base} rounds`; }
  else {
    const attribute = power.by === 'con' ? 'con' : power.by === 'conOrStr' ? best('con', 'str') : best('con', actor.system?.details?.keyability?.value);
    base = Math.max(1, 7 - mod(attribute));
    rule = ['7 rounds', mod(attribute) ? `less ${mod(attribute)} for ${ATTRIBUTE_NAMES[attribute] ?? attribute}` : null].filter(Boolean).join(', ');
  }
  const cut = Math.max(0, Number(actor.flags?.[MODULE_ID]?.soldierCooldownCut) || 0);
  if (!cut) return { rounds: base, rule };
  return { rounds: Math.min(base, Math.max(2, base - cut)), rule: `${rule}, less ${cut} from Improved Soldier Mastery (never below 2)` };
}
const soldierCooldownRounds = (actor, slug) => soldierCooldown(actor, { slug }).rounds;

/** One of the Soldier's powers was used off cooldown: put its effect on, or load a Concussive Shot. */
async function soldierPowerUsed(actor, item) {
  const power = SOLDIER_POWERS[item.slug];
  if (power.dice) return loadConcussiveShot(actor, item, power.dice);
  if (!power.effect) return;
  const pack = game.system.id === 'sf2e' ? 'sf2e-me-combat-passives' : 'me-combat-passives';
  const effect = await fromUuid(`Compendium.${MODULE_ID}.${pack}.Item.${power.effect}`).catch(() => null);
  if (!effect) return;
  const source = effect.toObject();
  if (actor.itemTypes?.effect?.some((e) => e.slug === source.system?.slug)) return;
  await actor.createEmbeddedDocuments('Item', [source]);
}

/**
 * Concussive Shot: the next Strike (the next two with Concussive Volley) deals the shot's dice,
 * multiplied by level as a power's are. The effect comes off when those Strikes are made.
 */
async function loadConcussiveShot(actor, item, base) {
  for (const old of actor.itemTypes.effect.filter((e) => e.slug === CONCUSSIVE_SLUG)) await old.delete();
  const dice = base * diceMult(actor), strikes = actor.items.some((i) => i.slug === 'me-cp-concussive-volley') ? 2 : 1;
  await actor.createEmbeddedDocuments('Item', [{
    name: 'Concussive Shot', type: 'effect', img: item.img,
    flags: { [MODULE_ID]: { strikes: 0, strikesAllowed: strikes } },
    system: {
      slug: CONCUSSIVE_SLUG,
      description: { value: `<p>Your next ranged Strike${strikes > 1 ? ' against each of two creatures' : ''} deals ${dice}d8 bludgeoning damage more and knocks its target prone on a hit. A critical hit also pushes the target back 10 feet. This effect comes off when the Strike is made.</p>` },
      duration: { value: 0, unit: 'rounds', expiry: 'turn-end', sustained: false },
      rules: [
        { key: 'RollOption', domain: 'all', option: 'me-concussive-shot' },
        { key: 'DamageDice', selector: 'strike-damage', label: 'Concussive Shot', diceNumber: dice, dieSize: 'd8', damageType: 'bludgeoning' },
      ],
    },
  }]);
}

/** One Strike has been made under an effect that lasts a set number of them: count it, and drop the effect on the last. */
async function countedStrike(effect) {
  const flags = effect.flags?.[MODULE_ID] ?? {}, made = (Number(flags.strikes) || 0) + 1;
  if (made < (Number(flags.strikesAllowed) || 1)) await effect.update({ [`flags.${MODULE_ID}.strikes`]: made });
  else await effect.delete();
}

// A Concussive Shot that hits knocks its target prone; a critical hit also pushes it 10 feet.
// Run on the active GM's client, which can change the target.
Hooks.on('createChatMessage', async (message) => {
  if (!game.users.activeGM?.isSelf) return;
  const ctx = sysFlags(message)?.context;
  if (ctx?.type !== 'attack-roll' || !(ctx.options ?? []).includes('me-concussive-shot')) return;
  if (ctx.outcome !== 'success' && ctx.outcome !== 'criticalSuccess') return;
  if (!game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) return;
  const actor = ChatMessage.getSpeakerActor(message.speaker);
  if (!actor) return;
  const target = await fromUuid(ctx.target?.token ?? '').catch(() => null);
  if (!target?.actor) { postResult(actor, 'Concussive Shot', ctx.outcome, ['The target is knocked prone (apply by hand: no target was set)'], { owners: true }); return; }
  const lines = [];
  try { await target.actor.increaseCondition('prone'); lines.push(`${target.name} is knocked prone`); }
  catch (err) { lines.push(`Knock ${target.name} prone by hand`); }
  if (ctx.outcome === 'criticalSuccess') {
    const from = actor.getActiveTokens(true, true).find((t) => t.parent === target.parent);
    const moved = from ? await pushAway(target, from, 10) : null;
    lines.push(moved === 10 ? 'and pushed 10 feet' : moved === 0 ? 'but not pushed: something holds the space behind it' : 'push it 10 feet by hand');
  }
  postResult(actor, 'Concussive Shot', ctx.outcome, lines, { owners: true });
});

// Effects marked to end with their owner's turn (the Adrenaline Rush reactions, which start on
// someone else's turn) come off when that turn ends.
Hooks.on('pf2e.endTurn', async (combatant) => {
  if (!game.users.activeGM?.isSelf) return;
  const ending = combatant?.actor?.itemTypes?.effect?.filter((e) => e.flags?.[MODULE_ID]?.endsWithTurn) ?? [];
  for (const effect of ending) await effect.delete();
});

// ── UNITY ───────────────────────────────────────────────────────────────────
// Unity is a focus spell, not a feat with a cooldown: the Unity feat puts the spell on the
// character (in a "Biotic Focus" entry), the system spends the Focus Point when it is cast,
// and the GM's client does the rest: the caster and each ally within 30 feet regain a share
// of their maximum HP (10%, +10% at 5th, 9th, 13th and 17th) and a full kinetic shield, and
// a creature at 0 HP is revived. Improved Unity and Superior Unity add to what the pulse does.
const UNITY_FEAT = 'unity';
const UNITY_IMPROVED = 'unity-improved';
const UNITY_SUPERIOR = 'unity-superior';
const UNITY_SPELL = 'me-spell-unity';
const UNITY_RANGE = 30;
// the system marks a spell's card with this when it was cast (and paid for), not just shown in chat
const CAST_OPTION = 'origin:action:slug:cast-a-spell';

/** The share of maximum HP Unity restores: 10% at 1st to 4th level, up to 50% from 17th. */
const unityPercent = (caster) => 10 * Math.min(5, Math.max(1, Math.ceil((caster?.level ?? 1) / 4)));

/** Give a character with the Unity feat its spell and a Biotic Focus entry to hold it. True if anything was added. */
async function ensureUnitySpell(actor) {
  if (actor?.type !== 'character' || !actor.itemTypes?.feat?.some((i) => i.slug === UNITY_FEAT)) return false;
  if (actor.itemTypes.spell?.some((s) => s.slug === UNITY_SPELL)) return false;
  const pack = game.system.id === 'sf2e' ? 'sf2e-me-biotic-powers' : 'me-biotic-powers';
  const spell = await fromUuid(`Compendium.${MODULE_ID}.${pack}.Item.meSpellUnity0001`).catch(() => null);
  if (!spell) return false;
  let entry = actor.itemTypes.spellcastingEntry?.find((e) => e.flags?.[MODULE_ID]?.bioticFocus);
  if (!entry) {
    [entry] = await actor.createEmbeddedDocuments('Item', [{
      name: 'Biotic Focus',
      type: 'spellcastingEntry',
      flags: { [MODULE_ID]: { bioticFocus: true } },
      system: { tradition: { value: 'occult' }, prepared: { value: 'focus' }, ability: { value: 'cha' }, proficiency: { value: 1 } },
    }]);
  }
  if (!entry) return false;
  const before = actor.system.resources?.focus?.max ?? 0;
  const source = spell.toObject();
  source.system.location = { ...(source.system.location ?? {}), value: entry.id };
  await actor.createEmbeddedDocuments('Item', [source]);
  // the Focus Point the spell adds to the pool starts filled
  const focus = actor.system.resources?.focus;
  if (focus && focus.max > before && (focus.value ?? 0) < focus.max) {
    await actor.update({ 'system.resources.focus.value': Math.min(focus.max, (focus.value ?? 0) + (focus.max - before)) });
  }
  return true;
}

// Taking the feat brings the spell; losing the feat takes it away again.
Hooks.on('createItem', async (item, _options, userId) => {
  if (userId !== game.user.id || item.type !== 'feat' || item.slug !== UNITY_FEAT) return;
  try {
    await ensureUnitySpell(item.actor);
  } catch (err) {
    console.warn('ME Powers | could not add the Unity spell', err);
  }
});
Hooks.on('deleteItem', async (item, _options, userId) => {
  const actor = item.actor;
  if (userId !== game.user.id || item.type !== 'feat' || item.slug !== UNITY_FEAT || actor?.type !== 'character') return;
  if (actor.itemTypes.feat.some((i) => i.slug === UNITY_FEAT)) return;
  try {
    const spells = actor.itemTypes.spell.filter((s) => s.slug === UNITY_SPELL).map((s) => s.id);
    const entries = actor.itemTypes.spellcastingEntry
      .filter((e) => e.flags?.[MODULE_ID]?.bioticFocus && !actor.itemTypes.spell.some((s) => s.system.location?.value === e.id && !spells.includes(s.id)))
      .map((e) => e.id);
    if (spells.length || entries.length) await actor.deleteEmbeddedDocuments('Item', [...spells, ...entries]);
  } catch (err) {
    console.warn('ME Powers | could not remove the Unity spell', err);
  }
});
// Characters who took Unity before it was a spell (or while no hook ran) get it when the world loads.
Hooks.once('ready', async () => {
  if (!game.users?.activeGM?.isSelf) return;
  for (const actor of game.actors ?? []) {
    try {
      if (await ensureUnitySpell(actor)) console.log(`ME Powers | ${actor.name}: Unity is now a focus spell (Biotic Focus)`);
    } catch (err) {
      console.warn(`ME Powers | could not add the Unity spell to ${actor.name}`, err);
    }
  }
});

// The cast itself: the GM's client can heal everyone the pulse reaches.
Hooks.on('createChatMessage', async (message) => {
  if (!game.users?.activeGM?.isSelf || !game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) return;
  const origin = sysFlags(message)?.origin;
  if (origin?.type !== 'spell' || !origin.uuid) return;
  const item = await fromUuid(origin.uuid).catch(() => null);
  if (item?.slug !== UNITY_SPELL || !item.actor) return;
  const caster = item.actor;
  if (!(origin.rollOptions ?? []).includes(CAST_OPTION)) {
    return postResult(caster, 'Unity', 'Not cast', ['Unity was shown in chat, not cast: no Focus Point was spent and no one was healed. Cast it from Biotic Focus on the spells tab.'], { owners: true });
  }
  try {
    await runUnity(message, caster);
  } catch (err) {
    console.warn('ME Powers | Unity automation failed', err);
    postResult(caster, 'Unity', 'Not automated', ['Something went wrong; apply this Unity by hand.'], { owners: true });
  }
});

/** One Unity: the caster, then each ally with a token within 30 feet of the caster's. */
async function runUnity(message, caster) {
  const source = speakerToken(message, caster);
  const reached = [caster];
  if (source) {
    const ally = (t) => (typeof caster.isAllyOf === 'function' ? caster.isAllyOf(t.actor) : t.disposition === source.disposition);
    for (const t of source.parent.tokens) {
      if (t === source || !t.actor || reached.includes(t.actor) || !ally(t)) continue;
      if (feetBetween(source, t) <= UNITY_RANGE) reached.push(t.actor);
    }
  }
  const lines = [];
  for (const actor of reached) lines.push(await unityOn(caster, actor));
  if (!source) lines.push(`${caster.name} has no token on the scene, so no allies were found: apply Unity to them by hand.`);
  postResult(caster, 'Unity', `${unityPercent(caster)}% of maximum HP`, lines, { owners: true });
}

/** Unity on one creature. Returns the line that says what it did. */
async function unityOn(caster, actor) {
  const hp = actor.system?.attributes?.hp;
  if (!(hp?.max > 0)) return `${actor.name}: no Hit Points to restore`;
  const has = (slug) => !!actor.hasCondition?.(slug);
  const valueOf = (slug) => Number(actor.getCondition?.(slug)?.value) || 0;
  const drop = async (slug) => { if (has(slug)) { await actor.decreaseCondition(slug, { forceRemove: true }); return true; } return false; };
  const down = (hp.value ?? 0) <= 0;
  if (down && actor.isDead === true && !has('dying') && !has('unconscious')) return `${actor.name}: dead, beyond Unity's reach`;
  const improved = caster.items.some((i) => i.slug === UNITY_IMPROVED);
  const superior = caster.items.some((i) => i.slug === UNITY_SUPERIOR);
  const parts = [];

  // ── Hit Points, and the revive ──
  const wasDying = has('dying');
  const wounded = valueOf('wounded');
  const was = hp.value ?? 0;
  const now = Math.min(hp.max, was + Math.max(1, Math.floor(hp.max * unityPercent(caster) / 100)));
  if (now > was) await actor.update({ 'system.attributes.hp.value': now });
  parts.push(now > was ? `${was} → ${now} HP` : 'HP already full');
  if (down) {
    await drop('dying');
    await drop('unconscious');
    // losing the dying condition leaves a creature wounded 1 higher; Superior Unity spares it that
    const want = wasDying && !superior ? wounded + 1 : wounded;
    for (let i = valueOf('wounded'); i < want; i++) await actor.increaseCondition('wounded');
    for (let i = valueOf('wounded'); i > want; i--) await actor.decreaseCondition('wounded', i === 1 ? { forceRemove: true } : undefined);
    const stood = superior && await drop('prone');
    parts.push(`revived${want > wounded ? ` (Wounded ${want})` : wasDying ? ' (not wounded by it)' : ''}${stood ? ' and on their feet' : ''}`);
  }

  // ── The kinetic shield, back to full ──
  const gear = [...(actor.itemTypes?.equipment ?? []), ...(actor.itemTypes?.effect ?? [])];
  const base = gear.find((i) => i.flags?.[MODULE_ID]?.shieldMax != null);
  const shieldMax = globalThis.MassEffectShields?.shieldMax?.(actor)
    ?? (base ? (base.flags[MODULE_ID].shieldMax ?? 0) + Math.max(0, ...gear.map((i) => Number(i.flags?.[MODULE_ID]?.shieldHpBonus) || 0)) : 0);
  const temp = hp.temp ?? 0;
  if (shieldMax > temp) {
    await actor.update({ 'system.attributes.hp.temp': shieldMax });
    parts.push(`shield ${temp} → ${shieldMax}`);
  }

  // ── Improved Unity, Superior Unity ──
  const lost = [];
  if (improved) {
    if (await drop('frightened')) lost.push('Frightened');
    if (await drop('sickened')) lost.push('Sickened');
    if (valueOf('stunned') === 1 && await drop('stunned')) lost.push('Stunned 1');
  }
  if (lost.length) parts.push(`no longer ${lost.join(', ')}`);
  if (superior) {
    const burning = (actor.itemTypes?.condition ?? []).filter((c) => c.slug === 'persistent-damage').map((c) => c.id);
    if (burning.length) {
      await actor.deleteEmbeddedDocuments('Item', burning);
      parts.push('persistent damage ended');
    }
  }
  return `${actor.name}: ${parts.join(', ')}`;
}

// ── TARGETS AND CASTERS ─────────────────────────────────────────────────────
const SYNTHETIC_TRAITS = ['construct', 'geth', 'mech', 'robot'];
const isSynthetic = (actor) => actor.type === 'vehicle'
  || (actor.system.traits?.value ?? []).some((t) => SYNTHETIC_TRAITS.includes(t));

/** The actor who used the power: the save message's origin item, else its origin actor. */
async function resolveCaster(message, ctx) {
  for (const uuid of [sysFlags(message)?.origin?.uuid, ctx.origin?.item, ctx.origin?.actor]) {
    if (typeof uuid !== 'string') continue;
    const doc = await fromUuid(uuid).catch(() => null);
    const actor = doc instanceof Actor ? doc : doc?.actor;
    if (actor) return actor;
  }
  return null;
}

// Biotic Barrier effect, as the shield system keeps it
const getBarrier = (actor) => actor?.itemTypes.effect.find((e) => e.flags?.[MODULE_ID]?.barrierMax != null) ?? null;

async function setBarrier(barrier, value) {
  const max = barrier.flags[MODULE_ID].barrierMax;
  await barrier.update({
    [`flags.${MODULE_ID}.barrierCurrent`]: value,
    'system.badge': { type: 'counter', value, min: 0, max },   // min 0: an empty barrier stays on the actor
  });
}

async function refillCasterBarrier(caster, fraction) {
  const barrier = getBarrier(caster);
  if (!barrier) return caster ? `${caster.name} has no Biotic Barrier to recharge` : 'Recharge the caster\'s Biotic Barrier by hand';
  const max = barrier.flags[MODULE_ID].barrierMax;
  const now = barrier.flags[MODULE_ID].barrierCurrent ?? 0;
  const next = Math.min(max, now + Math.ceil(max * fraction));
  if (next > now) await setBarrier(barrier, next);
  return `${caster.name}'s Biotic Barrier ${now} → ${next}`;
}

/** Energy Drain: the caster's shields (temp HP) rise, capped at their kinetic shield's maximum. */
async function giveCasterShields(caster, amount) {
  if (!caster) return `The caster gains ${amount} shield HP (apply manually)`;
  const gear = [...caster.itemTypes.equipment, ...caster.itemTypes.effect];
  const shield = gear.find((i) => i.flags?.[MODULE_ID]?.shieldMax != null);
  const bonus = Math.max(0, ...gear.map((i) => Number(i.flags?.[MODULE_ID]?.shieldHpBonus) || 0));
  const cap = shield ? (shield.flags[MODULE_ID].shieldMax ?? 0) + bonus : Infinity;
  const now = caster.system.attributes.hp?.temp ?? 0;
  const next = Math.max(now, Math.min(cap, now + amount));
  if (next > now) await caster.update({ 'system.attributes.hp.temp': next });
  return `${caster.name}'s shields ${now} → ${next}`;
}

/** The system's own persistent-damage condition; there is no PersistentDamage rule element. */
async function addPersistentDamage(actor, formula, damageType, dc = 15) {
  const condition = game.pf2e.ConditionManager.getCondition('persistent-damage').toObject();
  condition.system.persistent = { formula, damageType, dc };
  await actor.createEmbeddedDocuments('Item', [condition]);
}

// ── BIOTIC EXPLOSIONS ───────────────────────────────────────────────────────
// A creature that fails its save against a priming power is Primed until the end of the
// caster's next turn (anyone's biotic powers prime, NPC versions included). When a character
// with the Adept's Biotic Explosion feature damages a Primed creature with a detonating
// power, the priming is spent and the creature explodes: it takes 2d6 force, +1d6 per 4
// levels of the Adept, with no save, and the Adept's other enemies within 10 feet roll a
// basic Reflex save against the class DC for the same roll. One use of a power primes or
// detonates, never both, and a creature takes explosion damage once from one use. With
// Improved Adept Mastery, a creature that fails that Reflex save is also knocked prone.
const EXPLOSION_FEATURE = 'me-adept-biotic-explosion';
const EXPLOSION_KNOCKDOWN_FEATURE = 'me-adept-mastery-improved';
const PRIMED_SLUG = 'me-effect-biotic-primed';
const EXPLOSION_OPT = 'me-explosion:';
const EXPLOSION_RADIUS = 10;
const PRIMERS = new Set(['me-biotic-warp', 'me-biotic-reave', 'me-biotic-dark-channel', 'me-biotic-singularity', 'me-biotic-pull',
  'me-biotic-lift', 'me-biotic-stasis', 'me-biotic-lash', 'me-lift-grenade', 'me-grenade-lift']);
const DETONATORS = new Set(['me-biotic-throw', 'me-biotic-shockwave', 'me-biotic-slam', 'me-biotic-warp', 'me-biotic-reave',
  'me-biotic-flare', 'me-cluster-grenade']);
const getPrimed = (actor) => actor?.itemTypes?.effect?.find((e) => e.slug === PRIMED_SLUG) ?? null;
const explosionDice = (caster) => 2 + Math.floor((caster?.level ?? 0) / 4);

/** The explosion a burst save belongs to, from its roll options: { total, id }. */
function explosionOption(options) {
  const opt = (options ?? []).find((o) => o.startsWith(EXPLOSION_OPT));
  if (!opt) return null;
  const [total, id] = opt.slice(EXPLOSION_OPT.length).split(':');
  return { total: Number(total) || 0, id: id ?? '' };
}

/** Mark a creature Primed until the end of the caster's next turn. Returns a line for the card. */
async function primeTarget(actor, caster) {
  const who = caster?.name ?? 'the caster';
  await getPrimed(actor)?.delete();
  await actor.createEmbeddedDocuments('Item', [{
    name: 'Primed',
    type: 'effect',
    img: 'icons/magic/unholy/beam-impact-purple.webp',
    system: {
      slug: PRIMED_SLUG,
      description: { value: `<p>A biotic field holds this creature. If an Adept damages it with a detonating power (Throw, Shockwave, Slam, Warp, Reave, Flare or Cluster Grenade), the field is spent in a Biotic Explosion. Lasts until the end of ${who}'s next turn.</p>` },
      duration: { value: 1, unit: 'rounds', expiry: 'turn-end', sustained: false },
      rules: [],
    },
  }]);
  return `Primed for a Biotic Explosion until the end of ${who}'s next turn`;
}

// The creatures each power use has already caught in an explosion, kept as long as an area's shared roll
const explosionUses = new Map();
function caughtBy(use) {
  const now = Date.now();
  for (const [key, entry] of explosionUses) if (now - entry.at > AREA_WINDOW_MS) explosionUses.delete(key);
  if (!explosionUses.has(use)) explosionUses.set(use, { at: now, caught: new Set() });
  return explosionUses.get(use).caught;
}

/** Detonate a Primed creature. Returns a line for the detonating power's card. */
async function bioticExplosion({ caster, actor, tokenDoc, primed, use }) {
  // Who is caught is settled before anything is awaited: an area detonator's saves arrive
  // together, and two explosions from one use must not both take the same creature.
  const caught = caughtBy(use);
  const idOf = (a) => a.uuid ?? a.id ?? a.name;
  const hitsTarget = !caught.has(idOf(actor));
  caught.add(idOf(actor));
  const scene = tokenDoc?.parent?.tokens ? tokenDoc.parent : null;
  let others = [];
  if (scene) {
    const casterToken = caster.getActiveTokens?.(true, true).find((t) => t.parent === scene);
    const standing = (t) => !((t.actor.system.attributes?.hp?.max ?? 0) > 0 && (t.actor.system.attributes.hp.value ?? 0) <= 0);
    // the system's own sides, or the tokens' dispositions without them
    const ally = (t) => t.actor === caster || (typeof caster.isAllyOf === 'function' ? caster.isAllyOf(t.actor)
      : casterToken ? t.disposition === casterToken.disposition : t.disposition !== tokenDoc.disposition);
    others = scene.tokens
      .filter((t) => t !== tokenDoc && t.actor && t.actor !== actor && !t.hidden && standing(t) && !ally(t)
        && feetBetween(tokenDoc, t) <= EXPLOSION_RADIUS && !caught.has(idOf(t.actor)))
      .sort((a, b) => feetBetween(tokenDoc, a) - feetBetween(tokenDoc, b));
    for (const t of others) caught.add(idOf(t.actor));
  }

  await primed.delete();
  // an area detonator can reach a creature an earlier explosion from the same use already took,
  // with no one new beside it: the priming goes, and there is nothing left to roll
  if (!hitsTarget && !others.length) return 'Biotic Explosion: already caught in one from this power; the priming is spent';
  const dice = explosionDice(caster);
  const roll = await new (DamageRoll())(`${dice}d6[force]`).evaluate();
  const lines = [];
  if (hitsTarget) {
    await applyPowerDamage(actor, roll, tokenDoc);
    lines.push(`${actor.name} detonates: ${roll.total} force damage (${dice}d6, no save)`);
  } else {
    lines.push(`${actor.name} detonates (${roll.total} force), but was already caught in an explosion from this power`);
  }
  if (!scene) lines.push(`${actor.name} has no token on the scene: resolve the 10-foot burst by hand (basic Reflex against the class DC, ${roll.total} force).`);
  // Biotic Cascade: the nearest other enemy in the burst takes the explosion in full
  if (others.length && caster.items.some((i) => i.slug === 'me-adept-biotic-cascade')) {
    const t = others.shift();
    await applyPowerDamage(t.actor, roll, t);
    lines.push(`Biotic Cascade: ${t.name} takes the full ${roll.total} force damage, no save`);
  }
  const dc = caster.system?.attributes?.classDC?.value;
  if (others.length) {
    const names = others.map((t) => t.name).join(', ');
    const knockdown = caster.items.some((i) => i.slug === EXPLOSION_KNOCKDOWN_FEATURE) ? '; a failure also knocks the creature Prone' : '';
    lines.push(dc ? `10-foot burst: ${names} ${others.length === 1 ? 'rolls' : 'roll'} a basic Reflex save (DC ${dc})${knockdown}`
      : `No class DC found: roll a basic Reflex save by hand for ${names} (${roll.total} force)${knockdown}`);
  } else if (scene) {
    lines.push('10-foot burst: no other enemy in reach');
  }
  postResult(caster, 'Biotic Explosion', 'Detonated', lines, { owners: true });
  if (dc) {
    const feature = caster.items.find((i) => i.slug === EXPLOSION_FEATURE);
    const id = Date.now().toString(36);
    for (const t of others) {
      await t.actor.saves.reflex.roll({
        dc: { value: dc },
        extraRollOptions: [`${OPT_PREFIX}me-biotic-explosion`, `${EXPLOSION_OPT}${roll.total}:${id}`],
        origin: caster, item: feature ?? undefined, token: t, skipDialog: true,
      });
    }
  }
  return `Biotic Explosion: ${hitsTarget ? `${roll.total} more force damage` : 'the priming is spent'}`;
}

/**
 * The token to hand the system's applyDamage. It names the token in its "takes N damage"
 * line after it has already changed the actor's HP, so with no token it throws with the
 * damage applied. A target that has no token on the scene gets an unplaced one from its
 * prototype instead.
 */
async function damageToken(actor, tokenDoc) {
  if (tokenDoc) return tokenDoc.object ?? tokenDoc;
  try { return (await actor.getTokenDocument?.()) ?? null; } catch { return null; }
}

// ── POWER DAMAGE AND THE DEFENSIVE LAYERS ───────────────────────────────────
// The shield system routes every HP change through barrier, shield and armor. While a power's
// damage is being applied it reads this to learn that the damage is a power's (so no weapon's
// ammo applies to it) and what the power does to each layer: Warp counts double against a
// Biotic Barrier and 1.5x against an Armor Frame, and Incinerate 1.5x against an Armor Frame.
let damageSource = null;

/** A power's layer multipliers, read from the world settings it names. */
function powerLayers(power) {
  const layers = {};
  for (const [layer, setting] of Object.entries(power?.layers ?? {})) {
    const value = Number(game.settings.get(MODULE_ID, setting));
    if (value > 0 && value !== 1) layers[layer] = value;
  }
  return layers;
}

async function applyPowerDamage(actor, roll, tokenDoc, power = null) {
  const token = await damageToken(actor, tokenDoc);
  damageSource = { layers: powerLayers(power) };
  try { await actor.applyDamage({ damage: roll, token }); } finally { damageSource = null; }
}

const timesText = (n) => (n === 2 ? 'double' : `${n}×`);

/** For the result card: which of the target's layers this power's damage is multiplied against. */
function layerNotes(actor, power) {
  const layers = powerLayers(power);
  const parts = [];
  if (layers.barrier && (getBarrier(actor)?.flags[MODULE_ID].barrierCurrent ?? 0) > 0) parts.push(`${timesText(layers.barrier)} against its Biotic Barrier`);
  const armored = actor?.items?.some?.((i) => i.flags?.[MODULE_ID]?.armorMax != null && (i.flags[MODULE_ID].armorCurrent ?? i.flags[MODULE_ID].armorMax) > 0);
  if (layers.armor && armored) parts.push(`${timesText(layers.armor)} against its Armor Frame`);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/**
 * A critical failure against Warp detonates the target's Biotic Barrier: what is left of the
 * barrier is gone, and the target and each of the caster's enemies within 10 feet of it take
 * the burst's damage, with no save.
 */
async function barrierDetonation({ caster, actor, tokenDoc, power, formula }) {
  const lines = [];
  const barrier = getBarrier(actor);
  if (barrier && (barrier.flags[MODULE_ID].barrierCurrent ?? 0) > 0) await setBarrier(barrier, 0);
  const roll = await new (DamageRoll())(formula).evaluate();
  const scene = tokenDoc?.parent?.tokens ? tokenDoc.parent : null;
  let others = [];
  if (scene && caster) {
    const casterToken = caster.getActiveTokens?.(true, true).find((t) => t.parent === scene);
    const standing = (t) => !((t.actor.system.attributes?.hp?.max ?? 0) > 0 && (t.actor.system.attributes.hp.value ?? 0) <= 0);
    const ally = (t) => t.actor === caster || (typeof caster.isAllyOf === 'function' ? caster.isAllyOf(t.actor)
      : casterToken ? t.disposition === casterToken.disposition : t.disposition !== tokenDoc.disposition);
    others = scene.tokens.filter((t) => t !== tokenDoc && t.actor && t.actor !== actor && !t.hidden && standing(t) && !ally(t)
      && feetBetween(tokenDoc, t) <= EXPLOSION_RADIUS);
  }
  await applyPowerDamage(actor, roll, tokenDoc, power);
  lines.push(`Biotic Barrier detonates: ${actor.name} takes ${roll.total} ${describeFormula(formula)} damage, no save`);
  for (const t of others) await applyPowerDamage(t.actor, roll, t, power);
  if (others.length) lines.push(`10-foot burst: ${others.map((t) => t.name).join(', ')} ${others.length === 1 ? 'takes' : 'take'} the same ${roll.total} damage, no save`);
  else if (!scene) lines.push(`${actor.name} has no token on the scene: resolve the 10-foot burst by hand (${roll.total} damage, no save).`);
  return lines;
}

// ── DAMAGE ROLLS ────────────────────────────────────────────────────────────
// An area is rolled once and every creature in it takes that roll (halved or
// doubled by its own save). Each target's save arrives as its own chat
// message, so the first roll for a use is kept briefly and reused.
const AREA_WINDOW_MS = 30_000;
const areaRolls = new Map();

async function rollPowerDamage(areaKey, degree) {
  const key = areaKey ? `${areaKey}|${degree.damage}` : null;
  let base = key && areaRolls.get(key);
  if (!base || Date.now() - base.at > AREA_WINDOW_MS) {
    base = { at: Date.now(), roll: await new (DamageRoll())(degree.damage).evaluate() };
    if (key) areaRolls.set(key, base);
  }
  const scale = degree.scale ?? 1;
  if (scale === 1) return base.roll;

  // Scale each damage type separately so a mixed roll keeps its types.
  const parts = base.roll.instances
    .map((i) => [Math.floor(i.total * scale), i.type])
    .filter(([n]) => n > 0)
    .map(([n, type]) => `${n}[${type}]`);
  if (!parts.length) return null;
  return new (DamageRoll())(parts.length > 1 ? `{${parts.join(',')}}` : parts[0]).evaluate();
}

// ── HELPERS ─────────────────────────────────────────────────────────────────
/** Add terms to the first damage instance: "2d6[fire]" + ["2", "1d4"] -> "(2d6+2+1d4)[fire]". */
function addTerms(formula, terms) {
  return formula.replace(/^(\{?)([^\[{,]+)\[/, (_, brace, dice) => `${brace}(${[dice.trim(), ...terms].join('+')})[`);
}
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const stripTags = f => f.replace(/\[[^\]]*\]/g, '');
function describeFormula(f) {
  const types = [...f.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].replace(/persistent,?/, '').trim());
  return [...new Set(types)].join(' + ');
}

const OUTCOME_LABEL = {
  criticalSuccess: 'Critical Success',
  success: 'Success',
  failure: 'Failure',
  criticalFailure: 'Critical Failure',
};

/** Whispered to the GMs; with owners: true, also to the players who own the actor. */
function postResult(actor, powerName, outcome, lines, { owners = false } = {}) {
  const color = outcome.includes('Failure') || outcome === 'failure' ? '#ff6f00' : '#4fc3f7';
  const body = `<div style="border-left:3px solid ${color};padding:5px 10px;background:${color}18;border-radius:2px;font-size:0.95em;">`
    + `<strong>🔥 ${powerName} — ${OUTCOME_LABEL[outcome] ?? outcome}</strong>`
    + `<br>Target: <strong>${actor.name}</strong>`
    + (lines.length ? `<ul style="margin:4px 0 0 0;padding-left:18px;">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : '')
    + `</div>`;
  ChatMessage.create({
    speaker: { alias: '⚙ ME Powers' },
    content: body,
    whisper: game.users.filter(u => u.isGM || (owners && actor.testUserPermission?.(u, 'OWNER'))).map(u => u.id),
  });
}

console.log('ME Powers | automation loaded.');
})(); // end IIFE
