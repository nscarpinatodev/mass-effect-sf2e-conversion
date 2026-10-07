'use strict';
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
//   note        — reminder text shown in the result card (manual rulings)
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
    degrees: {
      success:         { damage: '1d6[bludgeoning]' },
      failure:         { damage: '3d6[bludgeoning]', conditions: ['prone'], casterBarrier: 0.5 },
      criticalFailure: { damage: '6d6[bludgeoning]', conditions: ['prone'], casterBarrier: 1, note: 'Pushed 5 feet away from the Vanguard.' },
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
    // The barrier HP recorded when Nova was used (see the Nova hook below)
    damage: ({ caster }) => {
      const hp = caster?.getFlag(MODULE_ID, 'novaCharge');
      return hp > 0 ? `${hp}[force]` : null;
    },
    degrees: {
      success:         { scale: 0.5 },
      failure:         { note: 'Pushed 5 feet away from the Vanguard.' },
      criticalFailure: { scale: 2, conditions: ['prone'], note: 'Pushed 10 feet away from the Vanguard.' },
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

// ── SETTINGS ────────────────────────────────────────────────────────────────
Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'autoApplyPowerEffects', {
    name: 'Auto-Apply Power Effects',
    hint: 'When a target resolves a save against a Mass Effect power, automatically apply its damage and conditions based on the outcome.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
});

// ── SAVE-RESULT HOOK ────────────────────────────────────────────────────────
Hooks.on('createChatMessage', async (message) => {
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) return;

  const ctx = message.flags?.pf2e?.context;
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

  if (!Object.keys(degree).length) {
    postResult(actor, power.name, ctx.outcome, ['No effect.']);
    return;
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
  const formula = base && extra.length ? addTerms(base, extra) : base;
  if (spec && !formula) log.push('No damage recorded for this use; roll it by hand.');
  if (formula) {
    try {
      const origin = message.flags?.pf2e?.origin?.uuid ?? ctx.origin?.uuid ?? '';
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
      const roll = await new game.pf2e.DamageRoll(d.damage).evaluate();
      await actor.applyDamage({ damage: roll, token: tokenDoc?.object ?? tokenDoc });
      log.push(`${roll.total} ${describeFormula(d.damage)} damage`);
      gain = d.gainUnshielded;
    }
    if (gain > 0) log.push(await giveCasterShields(caster, gain));
  }

  // ── Persistent damage (the system's own persistent-damage condition) ──
  if (degree.persistent) {
    const p = degree.persistent;
    await addPersistentDamage(actor, p.formula, p.type, p.dc ?? 15);
    log.push(`${p.formula} persistent ${p.type}`);
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

  // ── Healing for the caster ──
  if (degree.casterHeal) {
    if (caster) {
      const roll = await new Roll(degree.casterHeal).evaluate();
      const hp = caster.system.attributes.hp;
      const healed = Math.min(roll.total, hp.max - hp.value);
      if (healed > 0) await caster.update({ 'system.attributes.hp.value': hp.value + healed });
      log.push(`${caster.name} regains ${healed} HP`);
    } else {
      log.push(`The caster regains ${degree.casterHeal} HP (apply manually)`);
    }
  }

  if (degree.note) log.push(`<em>${degree.note}</em>`);
  postResult(actor, power.name, ctx.outcome, log);
});

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
  const origin = message.flags?.pf2e?.origin;
  if (origin?.type !== 'feat' || !origin.uuid) return;
  const item = await fromUuid(origin.uuid);
  const actor = item?.actor;
  if (!actor) return;
  const flags = actor.flags?.[MODULE_ID] ?? {};
  const slug = item.slug;

  const barrier = getBarrier(actor);

  // Charge refills the barrier on use, whatever the target rolls: the most
  // generous of Vanguard Mastery (flat), Unstoppable Charge (25%) and Apex Vanguard (full).
  if (slug === 'me-biotic-charge' && barrier) {
    const max = barrier.flags[MODULE_ID].barrierMax;
    const now = barrier.flags[MODULE_ID].barrierCurrent ?? 0;
    const has = (s) => actor.items.some((i) => i.slug === s);
    const refill = Math.max(
      Number(flags.chargeBarrier) || 0,
      has('me-vanguard-unstoppable-charge') ? Math.ceil(max / 4) : 0,
      has('me-vanguard-apex-vanguard') || flags.chargeUpgrade === 'barrier' ? max : 0,
    );
    const next = Math.min(max, now + refill);
    if (next > now) {
      await setBarrier(barrier, next);
      postResult(actor, 'Biotic Charge', 'success', [`Biotic Barrier ${now} → ${next}`]);
    }
  }

  // Nova spends the whole barrier; its HP becomes the damage every target saves against.
  if (slug === 'me-biotic-nova') {
    const now = barrier?.flags[MODULE_ID].barrierCurrent ?? 0;
    await actor.setFlag(MODULE_ID, 'novaCharge', now);
    if (now > 0) await setBarrier(barrier, 0);
    postResult(actor, 'Nova', 'success', [now > 0
      ? `Detonates ${now} barrier HP as force damage`
      : 'No barrier HP to detonate (Nova needs an active Biotic Barrier)']);
  }

  if ((slug === 'me-biotic-charge' || slug === 'me-biotic-nova') && flags.momentumStrike
      && !actor.itemTypes.effect.some((e) => e.slug === MOMENTUM_SLUG)) {
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
});

// ── TARGETS AND CASTERS ─────────────────────────────────────────────────────
const SYNTHETIC_TRAITS = ['construct', 'geth', 'mech', 'robot'];
const isSynthetic = (actor) => actor.type === 'vehicle'
  || (actor.system.traits?.value ?? []).some((t) => SYNTHETIC_TRAITS.includes(t));

/** The actor who used the power: the save message's origin item, else its origin actor. */
async function resolveCaster(message, ctx) {
  for (const uuid of [message.flags?.pf2e?.origin?.uuid, ctx.origin?.item, ctx.origin?.actor]) {
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
    'system.badge': { type: 'counter', value, max },
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
    base = { at: Date.now(), roll: await new game.pf2e.DamageRoll(degree.damage).evaluate() };
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
  return new game.pf2e.DamageRoll(parts.length > 1 ? `{${parts.join(',')}}` : parts[0]).evaluate();
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

function postResult(actor, powerName, outcome, lines) {
  const color = outcome.includes('Failure') || outcome === 'failure' ? '#ff6f00' : '#4fc3f7';
  const body = `<div style="border-left:3px solid ${color};padding:5px 10px;background:${color}18;border-radius:2px;font-size:0.95em;">`
    + `<strong>🔥 ${powerName} — ${OUTCOME_LABEL[outcome] ?? outcome}</strong>`
    + `<br>Target: <strong>${actor.name}</strong>`
    + (lines.length ? `<ul style="margin:4px 0 0 0;padding-left:18px;">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : '')
    + `</div>`;
  ChatMessage.create({
    speaker: { alias: '⚙ ME Powers' },
    content: body,
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
  });
}

console.log('ME Powers | automation loaded.');
