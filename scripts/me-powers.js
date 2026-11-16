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
//   damage      — a typed damage formula, e.g. "2d6[fire]" or "{4d6[fire],4d6[electricity]}"
//   scale       — multiplies the rolled damage (0.5 = half, 2 = double, for basic saves)
//   persistent  — { formula, type, dc }  (creates a persistent-damage effect)
//   conditions  — [ "off-guard", "stunned:1", "slowed:1", ... ]  (":" = value)
//   push        — feet the target is moved straight away from the caster's token
//   note        — reminder text shown in the result card (manual rulings)
const novaDice = (barrierHP) => 2 + Math.floor(barrierHP / 5);
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
      criticalFailure: { conditions: ['grabbed'], note: 'Lifted 20 feet and suspended until the end of the thrower\'s next turn. Primed for a Biotic Explosion.' },
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
      success:         { damage: '2d6[piercing]' },
      failure:         { damage: '4d6[piercing]', note: 'Speed −10 feet until the end of the thrower\'s next turn.' },
      criticalFailure: { damage: '6d6[piercing]', conditions: ['prone'], note: 'Speed −10 feet until the end of the thrower\'s next turn.' },
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
      success:         { damage: '2d6[fire]' },
      failure:         { damage: '4d6[fire]', persistent: { formula: '1d6', type: 'fire', dc: 12 } },
      criticalFailure: { damage: '6d6[fire]', persistent: { formula: '2d6', type: 'fire', dc: 15 } },
    },
  },
  'me-engineer-omni-grenade': {
    name: 'Omni-Grenade', save: 'reflex', area: true,
    degrees: basic('{4d6[fire],4d6[electricity]}', { criticalFailure: { conditions: ['stunned:1'] } }),
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
      criticalSuccess: { damage: '6d6[void]', scale: 0.5 },
      success:         { damage: '6d6[void]' },
      failure:         { damage: '6d6[void]', depleteBarrier: true },
      criticalFailure: { damage: '6d6[void]', scale: 2, depleteBarrier: true, conditions: ['prone'] },
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
    // 2d6, +1d6 per 5 HP the barrier held when Nova was used (recorded by the Nova hook below)
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
    degrees: {
      success:         { damage: '1d6[void]' },
      failure:         { damage: '2d6[void]', persistent: { formula: '1d4', type: 'void' }, note: 'Cannot regain HP until the start of the caster\'s next turn.' },
      criticalFailure: { damage: '4d6[void]', persistent: { formula: '1d4', type: 'void' }, note: 'Cannot regain HP until the start of the caster\'s next turn. An active Biotic Barrier detonates for 2d6 void in a 10-foot burst.' },
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
      failure:         { damage: '3d6[electricity]', conditions: ['stunned:2'] },
      criticalFailure: { damage: '6d6[electricity]', conditions: ['stunned:3', 'controlled'], note: 'Controlled as by AI Hacking for 1 round.' },
    },
  },
  'me-engineer-network-shutdown': {
    name: 'Network Shutdown', save: 'will', trait: 'tech', area: true,
    degrees: {
      success:         { conditions: ['stunned:1'] },
      failure:         { damage: '4d6[electricity]', conditions: ['stunned:2'] },
      criticalFailure: { damage: '8d6[electricity]', conditions: ['stunned:3'], note: 'Cannot use tech abilities for 1 round.' },
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
    save: 'reflex',
    degrees: {
      success:         { damage: '1d6[fire]' },
      failure:         { damage: '2d6[fire]', persistent: { formula: '1d4', type: 'fire', dc: 15 },
                         note: 'Target cannot regain HP until the start of your next turn. Armor Frames take 1.5× damage.' },
      criticalFailure: { damage: '4d6[fire]', persistent: { formula: '2d4', type: 'fire', dc: 15 },
                         note: 'Target cannot regain HP until the start of your next turn. Armor Frames take 1.5× damage.' },
    },
  },
};

// ── NPC VERSIONS ────────────────────────────────────────────────────────────
// The "(NPC)" biotic and tech actions (me-npc-*) have no class DC to lean on, so they
// scale from the caster's level instead. Their DC is worked out in the save
// button itself; here their dice are the PC power's, multiplied by
// 1 + floor(level / 4): x1 at levels 0-3, x2 at 4-7, x3 at 8-11, and so on.
const npcDiceMult = (caster) => 1 + Math.floor((caster?.level ?? 0) / 4);
const scaleDice = (formula, m) => formula.replace(/(\d+)d(\d+)/g, (_, n, d) => `${n * m}d${d}`);
const scaledByCaster = (value) => (typeof value === 'string' ? ({ caster }) => scaleDice(value, npcDiceMult(caster)) : value);

for (const [key, power] of Object.entries(POWERS)) {
  const biotic = key.startsWith('me-biotic-') || ['me-cluster-grenade', 'me-lift-grenade'].includes(key);
  const tech = key.startsWith('me-tech-') || key === 'me-sticky-grenade';
  if (!biotic && !tech) continue;
  const src = { ...power, ...power.npc };       // a power may give its NPC version its own numbers
  delete src.npc;
  const degrees = {};
  for (const [name, degree] of Object.entries(src.degrees)) {
    const d = { ...degree };
    for (const field of ['damage', 'vsSynthetic', 'casterHeal']) if (d[field]) d[field] = scaledByCaster(d[field]);
    if (d.persistent) d.persistent = { ...d.persistent, formula: scaledByCaster(d.persistent.formula) };
    degrees[name] = d;
  }
  POWERS[`me-npc-${key.slice(3)}`] = { ...src, trait: biotic ? 'biotic' : 'tech', degrees };
}

// For macros and debugging: the full registry, PC and NPC entries alike.
globalThis.MassEffectPowers = {
  registry: POWERS,
  chargeLanding: (...a) => chargeLanding(...a),
  pushAway: (...a) => pushAway(...a),
  feetBetween: (...a) => feetBetween(...a),
  novaFollows: (...a) => novaFollows(...a),
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
    hint: 'Biotic Charge, Vanguard Rush and Vanguard Strike posted with one creature targeted move the Vanguard next to it and roll its Reflex save; Nova (alone or after Rush or Strike) rolls the Fortitude save of each creature in its area that is not on the Vanguard\'s side. Cooldowns are tracked. Needs a GM connected.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, 'chargeAnimation', {
    name: 'Biotic Charge Animation',
    hint: 'When a Charge moves the Vanguard, play a biotic beam from start to landing (needs Sequencer, and JB2A installed; JB2A does not have to be enabled). The token crosses in a fraction of a second either way.',
    scope: 'world', config: true, type: Boolean, default: true,
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
  if (slug === 'me-biotic-charge' && failed && casterHas('me-vanguard-heavy-impact')) {
    addCondition('off-guard');                                              // Heavy Impact
    degree.note = [degree.note, 'Off-guard until the end of the Vanguard\'s next turn (Heavy Impact).'].filter(Boolean).join(' ');
  }

  // Vanguard Rush (on a failed save) and Vanguard Strike (whatever the save) end in Nova,
  // once this save's own effects, such as a critical failure's full barrier, are in place
  const chain = (ctx.options ?? []).find((o) => o.startsWith(CHAIN_OPT))?.slice(CHAIN_OPT.length);
  const followUp = async () => {
    if (!chain || !caster || !novaFollows(chain, ctx.outcome)) return;
    const from = caster.getActiveTokens(true, true).find((t) => t.parent === tokenDoc?.parent);
    if (from) await novaBurst(caster, from);
    else postResult(caster, 'Nova', 'Not automated', [`${caster.name} has no token here: use Nova from the sheet.`], { owners: true });
  };

  if (!Object.keys(degree).length) {
    postResult(actor, power.name, ctx.outcome, ['No effect.']);
    return followUp();
  }

  const log = [];

  // ── Direct damage (routes through the shield system via applyDamage) ──
  const spec = (degree.vsSynthetic && isSynthetic(actor)) ? degree.vsSynthetic : (degree.damage ?? power.damage);
  const base = typeof spec === 'function' ? spec({ actor, caster }) : spec;
  // Extra damage the caster's gear and features add to the power's damage roll
  const cflags = caster?.flags?.[MODULE_ID] ?? {};
  const extra = [];
  if (POWER_TRAITS.includes(power.trait)) {
    if (Number(cflags.powerDamageBonus) > 0) extra.push(String(cflags.powerDamageBonus)); // Power Amplifier
    if (cflags.powerBonusDice) extra.push(cflags.powerBonusDice);                         // Superior Sentinel Mastery
  }
  if (slug === 'me-biotic-charge' && cflags.chargeUpgrade === 'damage') extra.push('2d6'); // Charge Upgrade
  if (slug === 'me-biotic-nova' && casterHas('me-upgrade-nova')) extra.push('2d6');         // Nova Upgrade
  const formula = base && extra.length ? addTerms(base, extra) : base;
  if (spec && !formula) log.push('No damage recorded for this use; roll it by hand.');
  if (formula) {
    try {
      const origin = sysFlags(message)?.origin?.uuid ?? ctx.origin?.uuid ?? '';
      const roll = await rollPowerDamage(power.area ? `${slug}|${origin}` : null, { ...degree, damage: formula });
      if (roll) {
        await actor.applyDamage({ damage: roll, token: tokenDoc?.object ?? tokenDoc });
        log.push(`${roll.total} ${describeFormula(formula)} damage`);
      } else {
        log.push('No damage (halved to 0)');
      }
    } catch (err) {
      console.warn('ME Powers | applyDamage failed, posting roll instead', err);
      const roll = await new Roll(stripTags(formula)).evaluate();
      roll.toMessage({ flavor: `${power.name} damage`, speaker: { alias: power.name } });
      log.push(`${roll.total} damage (apply manually)`);
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
      const roll = await new (DamageRoll())(d.damage).evaluate();
      await actor.applyDamage({ damage: roll, token: tokenDoc?.object ?? tokenDoc });
      log.push(`${roll.total} ${describeFormula(d.damage)} damage`);
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
  if (degree.note) log.push(`<em>${degree.note}</em>`);
  postResult(actor, power.name, ctx.outcome, log);

  // Chain Charge: a critical failure, or the target dropping, lets the Vanguard charge on
  if (slug === 'me-biotic-charge' && casterHas('me-vanguard-chain-charge')
      && (ctx.outcome === 'criticalFailure' || (actor.system.attributes?.hp?.value ?? 1) <= 0)) {
    postResult(caster, 'Chain Charge', 'Ready', [`${actor.name} ${ctx.outcome === 'criticalFailure' ? 'critically failed' : 'is down'}: target another enemy within 30 feet and use Chain Charge (free action, once per round).`], { owners: true });
  }
  await followUp();
});

/** Whether a Charge save sets off Nova: Rush on a failure, Strike whatever the result. */
function novaFollows(chain, outcome) {
  if (chain === 'strike') return true;
  if (chain === 'rush') return outcome === 'failure' || outcome === 'criticalFailure';
  return false;
}

// ── CLASS MASTERIES ─────────────────────────────────────────────────────────
// The masteries' rules write their effects as actor flags (ActiveEffectLike,
// in memory only), and this section acts on them:
//   powerEfficiency.biotic / .tech — powers with that trait cost N fewer actions (min 1)
//   chargeBarrier                  — Charge refills this much Biotic Barrier HP
//   momentumStrike                 — Charge or Nova grants the Vanguard Momentum effect
// It also adds the roll option "self:me-barrier:full" while the barrier is full.
// No rule element can alter a feat's action cost, so the actor's derived-data
// step is wrapped instead.
const POWER_TRAITS = ['biotic', 'tech'];
const MOMENTUM_SLUG = 'me-effect-vanguard-momentum';
const COMBO_SLUGS = ['me-vanguard-rush', 'me-vanguard-vanguard-strike'];

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
  // Vanguard Rush and Vanguard Strike already combine Charge and Nova for one action less
  // than the two (2 instead of 3); the masteries' cut is that combination, not another
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
  if (slug === 'me-biotic-nova' && !vanguardAutomation() && !cooldownLeft(actor, NOVA_COOLDOWN)) await novaUsed(actor);
});

/**
 * Charge's refill on use, whatever the target rolls: half the barrier's maximum, or more
 * from Vanguard Mastery (flat) or Apex Vanguard / the barrier Charge Upgrade (full). A
 * critical failure on the save fills it (see POWERS). Also gives Vanguard Momentum.
 */
async function chargeUsed(actor) {
  const flags = actor.flags?.[MODULE_ID] ?? {};
  const barrier = getBarrier(actor);
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
}

/** Nova spends the whole barrier; its HP sets the dice every target saves against. Returns that HP. */
async function novaUsed(actor) {
  const barrier = getBarrier(actor);
  const now = barrier?.flags[MODULE_ID].barrierCurrent ?? 0;
  // novaAt names this detonation, so Nova Cascade refills once however many creatures crit-fail
  await actor.update({ [`flags.${MODULE_ID}.novaCharge`]: now, [`flags.${MODULE_ID}.novaAt`]: Date.now() });
  if (now > 0) await setBarrier(barrier, 0);
  postResult(actor, 'Nova', 'success', [now > 0
    ? `Detonates ${now} barrier HP: ${novaDice(now)}d6 force${actor.items.some((i) => i.slug === 'me-upgrade-nova') ? ' + 2d6 (Nova Upgrade)' : ''}`
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
// Posting Biotic Charge, Vanguard Rush or Vanguard Strike with one creature targeted:
// the poster's client notes the target on the card, then the active GM's client
// (which can move any token and roll any save) checks the cooldowns and range,
// moves the Vanguard next to the target, starts the cooldowns, and rolls the
// target's Reflex save. That save goes through the save-result hook above like any
// other, which then sets off Nova for Rush (on a failure) and Strike (always).
// Nova on its own needs no target: it detonates around the Vanguard. Every Nova
// rolls the Fortitude save of each creature in its area not on the Vanguard's side.
const CHARGE_COOLDOWN = 'me-effect-charge-cooldown';
const NOVA_COOLDOWN = 'me-effect-nova-cooldown';
const RUSH_COOLDOWN = 'me-effect-rush-cooldown';
const COOLDOWN_NAMES = { [CHARGE_COOLDOWN]: 'Biotic Charge', [NOVA_COOLDOWN]: 'Nova', [RUSH_COOLDOWN]: 'Vanguard Rush' };
// what a Vanguard card sets off: Rush and Strike end in Nova; Chain Charge is a free Charge
const CHAINS = { 'me-vanguard-rush': 'rush', 'me-vanguard-vanguard-strike': 'strike', 'me-vanguard-chain-charge': 'free' };
const CHAIN_OPT = 'me-chain:';
const baseSlug = (item) => item?.slug?.replace(/^me-npc-/, 'me-');
const vanguardAutomation = () => !!game.settings.get(MODULE_ID, 'automateCharge') && !!game.users?.activeGM;

/** Whole rounds left on a cooldown effect, or 0 when there is none. */
function cooldownLeft(actor, slug) {
  const effect = actor.itemTypes?.effect?.find((e) => e.slug === slug);
  if (!effect) return 0;
  return Math.max(1, Math.ceil((effect.remainingDuration?.remaining ?? 0) / (CONFIG.time?.roundTime || 6)));
}

/**
 * How long each Vanguard cooldown lasts: Biotic Charge 2 rounds (1 with Improved Charge),
 * Nova and Vanguard Rush 5 - Charisma modifier rounds (minimum 1).
 */
function cooldownRounds(actor, slug) {
  if (slug === CHARGE_COOLDOWN) return actor.items.some((i) => i.slug === 'me-vanguard-improved-charge') ? 1 : 2;
  return Math.max(1, 5 - (actor.system.abilities?.cha?.mod ?? 0));
}

/** Start one of the Vanguard cooldowns. Returns its rounds. */
async function startCooldown(actor, slug, img) {
  const rounds = cooldownRounds(actor, slug);
  const name = COOLDOWN_NAMES[slug];
  const rule = slug === CHARGE_COOLDOWN ? '2 rounds, 1 with Improved Charge' : '5 − Charisma modifier, minimum 1';
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

  // Rush and Strike use Charge and Nova, so all three cooldowns stand in their way;
  // Chain Charge is a Charge outside the cooldowns
  const combo = chain === 'rush' || chain === 'strike';
  const blocking = chain === 'free' ? [] : combo ? [CHARGE_COOLDOWN, NOVA_COOLDOWN, RUSH_COOLDOWN] : [CHARGE_COOLDOWN];
  for (const slug of blocking) {
    const left = cooldownLeft(actor, slug);
    if (left) return tell([`${COOLDOWN_NAMES[slug]} is on cooldown (${left} round${left === 1 ? '' : 's'} left). Nothing moved and no save was rolled.`]);
  }
  const barrier = getBarrier(actor);
  if (chain === 'rush' && !((barrier?.flags[MODULE_ID].barrierCurrent ?? 0) >= 1)) return tell(['Vanguard Rush needs a Biotic Barrier with at least 1 HP.']);
  if (chain === 'strike' && !barrier) return tell(['Vanguard Strike needs an active Biotic Barrier to recharge.']);
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
  if (chain === 'strike') {
    await setBarrier(barrier, barrier.flags[MODULE_ID].barrierMax);
    lines.push('Biotic Barrier recharged to full');
  }
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
      const rush = await startCooldown(actor, RUSH_COOLDOWN, item.img);
      lines.push(`Cooldowns: Biotic Charge ${plural(rounds)}, Nova ${plural(nova)}, Vanguard Rush ${plural(rush)}`);
    } else {
      lines.push(`Cooldown: ${plural(rounds)}`);
    }
  }
  // a plain Charge card refills on use (see chargeUsed); these cards are not one
  if (chain) await chargeUsed(actor);

  // Rush and Strike use the actor's own Charge for its DC and its save
  const charge = chain ? actor.items.find((i) => baseSlug(i) === 'me-biotic-charge') ?? item : item;
  const dc = powerDC(charge);
  if (!dc) {
    lines.push(`Roll ${target.name}'s Reflex save from the Charge card`);
    return postResult(actor, name, 'Charged', lines, { owners: true });
  }
  if (chain === 'rush') lines.push('Nova follows if the target fails its save');
  if (chain === 'strike') lines.push('Nova follows whatever the target rolls');
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

// Load the Charge's videos on every client up front, so the beam starts the moment it is used
Hooks.once('ready', () => {
  try {
    const art = chargeArt();
    if (art) Sequencer.Preloader?.preload?.([art.flash, ...art.beams, art.impact], false);
  } catch (err) {
    console.warn('ME Powers | could not preload the Charge animation', err);
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
  const left = cooldownLeft(actor, NOVA_COOLDOWN);
  if (left) return tell([`Nova is on cooldown (${left} round${left === 1 ? '' : 's'} left). The barrier was not spent.`]);
  if (!((getBarrier(actor)?.flags[MODULE_ID].barrierCurrent ?? 0) >= 1)) return tell(['Nova needs an active Biotic Barrier with at least 1 HP.']);
  const rounds = await startCooldown(actor, NOVA_COOLDOWN, item.img);
  const source = speakerToken(message, actor);
  postResult(actor, 'Nova', 'Detonated', [`Cooldown: ${rounds} round${rounds === 1 ? '' : 's'}`], { owners: true });
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
  const dc = nova ? powerDC(nova) : actor.system.attributes?.classDC?.value;
  const standing = (t) => !((t.actor.system.attributes?.hp?.max ?? 0) > 0 && (t.actor.system.attributes.hp.value ?? 0) <= 0);
  const inside = source.parent.tokens.filter((t) => t !== source && t.actor && !t.hidden && standing(t) && feetBetween(source, t) <= radius);
  // the system's own sides (party and opposition), or the tokens' dispositions without them
  const ally = (t) => (typeof actor.isAllyOf === 'function' ? actor.isAllyOf(t.actor) : t.disposition === source.disposition);
  const foes = inside.filter((t) => !ally(t));
  const friends = inside.filter((t) => ally(t));
  const lines = [`${radius}-foot emanation: ${foes.length ? foes.map((t) => t.name).join(', ') : 'no one'} ${foes.length === 1 ? 'rolls' : 'roll'} Fortitude`];
  if (friends.length) lines.push(`On ${actor.name}'s side, so roll by hand from the Nova card: ${friends.map((t) => t.name).join(', ')}`);
  if (!dc) lines.push('No DC found: roll the saves from the Nova card');
  postResult(actor, 'Nova', 'Detonated', lines, { owners: true });
  if (!dc) return;
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
