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

  const degree = power.degrees[ctx.outcome];
  if (!degree) {
    postResult(actor, power.name, ctx.outcome, ['No effect.']);
    return;
  }

  const log = [];

  // ── Direct damage (routes through the shield system via applyDamage) ──
  if (degree.damage) {
    try {
      const origin = message.flags?.pf2e?.origin?.uuid ?? ctx.origin?.uuid ?? '';
      const roll = await rollPowerDamage(power.area ? `${slug}|${origin}` : null, degree);
      if (roll) {
        await actor.applyDamage({ damage: roll, token: tokenDoc?.object ?? tokenDoc });
        log.push(`${roll.total} ${describeFormula(degree.damage)} damage`);
      } else {
        log.push('No damage (halved to 0)');
      }
    } catch (err) {
      console.warn('ME Powers | applyDamage failed, posting roll instead', err);
      const roll = await new Roll(stripTags(degree.damage)).evaluate();
      roll.toMessage({ flavor: `${power.name} damage`, speaker: { alias: power.name } });
      log.push(`${roll.total} damage (apply manually)`);
    }
  }

  // ── Persistent damage (PersistentDamage rule element on a new effect) ──
  if (degree.persistent) {
    const p = degree.persistent;
    await actor.createEmbeddedDocuments('Item', [{
      name: `${power.name} — Persistent ${cap(p.type)}`,
      type: 'effect',
      img: 'icons/magic/fire/flame-burning-orange.webp',
      system: {
        slug: `me-persistent-${slug}`,
        description: { value: `<p>${p.formula} persistent ${p.type} damage from ${power.name}. DC ${p.dc ?? 15} flat check to end.</p>` },
        duration: { value: -1, unit: 'unlimited' },
        rules: [{ key: 'PersistentDamage', formula: p.formula, damageType: p.type, dc: p.dc ?? 15 }],
      },
    }]);
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

function applyMasteryData(actor) {
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
  if (!actor || !actionCut(actor, item)) return;
  const sent = foundry.utils.getProperty(changes, 'system.actions.value');
  if (sent !== undefined && sent === item.system.actions.value && sent !== item._source.system.actions?.value) {
    delete changes.system.actions.value;
  }
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

  if (slug === 'me-biotic-charge' && flags.chargeBarrier) {
    const barrier = actor.itemTypes.effect.find((e) => e.flags?.[MODULE_ID]?.barrierMax != null);
    if (barrier) {
      const max = barrier.flags[MODULE_ID].barrierMax;
      const now = barrier.flags[MODULE_ID].barrierCurrent ?? 0;
      const next = Math.min(max, now + flags.chargeBarrier);
      if (next > now) {
        await barrier.update({
          [`flags.${MODULE_ID}.barrierCurrent`]: next,
          'system.badge': { type: 'counter', value: next, max },
        });
        postResult(actor, 'Vanguard Mastery', 'success', [`Biotic Barrier ${now} → ${next}`]);
      }
    }
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
const cap =s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
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
