'use strict';

// ============================================================
// MASS EFFECT SHIELD SYSTEM — Foundry VTT v13 Module
// System: Pathfinder 2e (Starfinder 2e proxy)
// ============================================================
//
// DAMAGE ROUTING ORDER:  Barrier → Shield → Armor → HP
//
// AMMO POWERS: action items that apply Effects with DamageDice
//   rule elements. Routing detects ammo type from the attacker's
//   active effects (actor flag check) and from chat damage types
//   (electricity fallback for natural electric weapons).
//
// ARMOR FRAMES: standalone equipment items with armorMax /
//   armorCurrent flags. Ablative — when depleted the item is
//   destroyed. No regeneration.
//
// SETUP (run from browser console as GM):
//   MassEffectShields.sync(true)   ← create/recreate all world items
//
// ============================================================

const MODULE_ID = 'mass-effect-sf2e-conversion';

console.log(
  '%cMASS EFFECT%c Compendium  |  Initializing module...',
  [
    'color:#4ab8ff',
    'font-size:3em',
    'font-weight:900',
    'font-family:serif',
    'letter-spacing:0.08em',
    'text-shadow:0 0 8px #4ab8ff, 0 0 20px #1a6eff, 2px 2px 0 #003a8c, -2px -2px 0 #00e5ff',
    'padding:0.2em 0.4em',
  ].join(';'),
  'color:#8ecfff;font-size:0.9em;font-weight:400;font-family:monospace;'
);


// ── AMMO DEFINITIONS ──────────────────────────────────────────────────────────

const AMMO_DEFS = [
  {
    id: 'incendiary',
    name: 'Incendiary Rounds',
    color: '#ff6f00',
    img: 'https://static.wikia.nocookie.net/masseffect/images/c/cf/ME3_Incendiary_Ammo.png',
    damageType: 'fire',
    diceNum: 0, dieSz: '',
    // Overrides the weapon's damage type to fire rather than adding bonus dice
    rules: [{ key: 'DamageDice', selector: 'strike-damage', override: { damageType: 'fire' } }],
    description: '<p>Thermite-tipped rounds that ignite on impact. Your weapon attacks deal <strong>fire damage</strong> instead of their normal damage type.</p>'
      + '<p>Incendiary rounds burn through armor faster: each point of incoming damage depletes 1.5× points of armor.</p>'
      + '<p>On a <strong>critical hit</strong>, the target ignites and suffers <strong>persistent fire damage</strong> (DC 15 flat check to extinguish).</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'phasic',
    name: 'Phasic Rounds',
    color: '#00e5ff',
    img: 'https://static.wikia.nocookie.net/masseffect/images/b/b5/Phasic_Rounds_MP.png',
    damageType: 'force',
    diceNum: 1, dieSz: 'd4',
    description: '<p>Rounds coated in a mass effect field that disrupts ablative plating. Your weapon attacks deal an additional <strong>1d4 force damage</strong>.</p>'
      + '<p>Phasic rounds bypass Combat Armor Frames entirely — damage goes directly to shields and HP. However, the phasing effect reduces total damage dealt to <strong>60%</strong>.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'disruptor',
    name: 'Disruptor Rounds',
    color: '#fff176',
    img: 'https://static.wikia.nocookie.net/masseffect/images/b/b2/ME3_Disruptor_Ammo.png',
    damageType: 'electricity',
    diceNum: 0, dieSz: '',
    // Overrides the weapon's damage type to electricity rather than adding bonus dice.
    // This ensures the damage-roll chat message carries item:damage:type:electricity,
    // which triggers the double-damage shield routing.
    rules: [{ key: 'DamageDice', selector: 'strike-damage', override: { damageType: 'electricity' } }],
    description: '<p>Rounds that generate a disruptive electrical pulse on impact. Your weapon attacks deal <strong>electricity damage</strong> instead of their normal damage type.</p>'
      + '<p>Disruptor rounds deal double damage to kinetic shields: all electricity damage against shielded targets is automatically doubled.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'cryo',
    name: 'Cryo Rounds',
    color: '#80deea',
    img: 'https://static.wikia.nocookie.net/masseffect/images/9/94/ME3_Cryo_Ammo.png',
    damageType: 'cold',
    diceNum: 1, dieSz: 'd4',
    description: '<p>Cryogenically-charged rounds that flash-freeze on impact. Your weapon attacks deal an additional <strong>1d4 cold damage</strong>.</p>'
      + '<p>When Cryo Rounds deal direct HP damage, the target becomes <strong>Chilled</strong> (off-guard until the end of their next turn).</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'warp',
    name: 'Warp Rounds',
    color: '#ce93d8',
    img: 'https://static.wikia.nocookie.net/masseffect/images/6/63/ME3_Warp_Ammo.png',
    damageType: 'void',
    diceNum: 1, dieSz: 'd4',
    description: '<p>Rounds infused with destabilizing dark energy. Your weapon attacks deal an additional <strong>1d4 void damage</strong>.</p>'
      + '<p>Warp rounds are devastating against biotic barriers: damage to a Biotic Barrier is multiplied by 1.5×. Depleting a barrier with Warp rounds triggers a dark energy detonation.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'armor-piercing',
    name: 'Armor-Piercing Rounds',
    color: '#90a4ae',
    img: 'https://static.wikia.nocookie.net/masseffect/images/b/bc/ME3_Armor_Piercing_Ammo.png',
    damageType: null,
    diceNum: 0, dieSz: '',
    description: '<p>Hard alloy sabot rounds designed to penetrate ablative armor plating. These rounds add no bonus damage type.</p>'
      + '<p>When striking a target with an active Combat Armor Frame, 50% of the incoming HP damage bypasses the armor entirely and is dealt directly to shields and HP.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'shredder',
    name: 'Shredder Rounds',
    color: '#d32f2f',
    img: 'https://static.wikia.nocookie.net/masseffect/images/9/95/Shredderammo.png',
    damageType: 'slashing',
    diceNum: 1, dieSz: 'd6',
    description: '<p>Serrated flechette rounds designed to shred unprotected tissue. Your weapon attacks deal an additional <strong>1d6 slashing damage</strong>.</p>'
      + '<p>Most effective against targets with no active shields, barriers, or armor.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
];

// ── SETTINGS ──────────────────────────────────────────────────────────────────

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'takeCoverSlug', {
    name: 'Take Cover Effect Slug',
    hint: 'The slug of the "Take Cover" effect used to detect when a depleted shield can begin recharging.',
    scope: 'world',
    config: true,
    type: String,
    default: 'effect-cover',
  });

  // ── Damage multipliers ──
  game.settings.register(MODULE_ID, 'warpMult', {
    name: 'Warp Rounds — Barrier Damage Multiplier',
    hint: 'Damage multiplier applied to biotic barriers when hit by Warp Rounds.',
    scope: 'world', config: true, type: Number, default: 1.5,
    range: { min: 1.0, max: 3.0, step: 0.1 },
  });
  game.settings.register(MODULE_ID, 'disruptorMult', {
    name: 'Disruptor Rounds — Shield Damage Multiplier',
    hint: 'Damage multiplier applied to kinetic shields when hit by Disruptor Rounds.',
    scope: 'world', config: true, type: Number, default: 2.0,
    range: { min: 1.0, max: 4.0, step: 0.1 },
  });
  game.settings.register(MODULE_ID, 'shieldCollapsePct', {
    name: 'Shield Collapse Threshold (%)',
    hint: 'A single hit exceeding this percentage of max shield HP triggers a shield overload collapse.',
    scope: 'world', config: true, type: Number, default: 50,
    range: { min: 10, max: 100, step: 5 },
  });
  game.settings.register(MODULE_ID, 'incendiaryArmorMult', {
    name: 'Incendiary Rounds — Armor Damage Multiplier',
    hint: 'How much faster Incendiary Rounds burn through Combat Armor Frames.',
    scope: 'world', config: true, type: Number, default: 1.5,
    range: { min: 1.0, max: 3.0, step: 0.1 },
  });
  game.settings.register(MODULE_ID, 'apBleedThrough', {
    name: 'Armor-Piercing Rounds — HP Bleed-Through (%)',
    hint: 'Percentage of HP damage that bypasses the armor layer when AP Rounds are used.',
    scope: 'world', config: true, type: Number, default: 50,
    range: { min: 0, max: 100, step: 5 },
  });
  game.settings.register(MODULE_ID, 'phasicDamagePct', {
    name: 'Phasic Rounds — Total Damage Modifier (%)',
    hint: 'Phasic Rounds bypass armor entirely but deal reduced total damage. Set to 100 to disable the reduction.',
    scope: 'world', config: true, type: Number, default: 60,
    range: { min: 10, max: 100, step: 5 },
  });

  // ── Ammo special effects ──
  game.settings.register(MODULE_ID, 'cryoChilled', {
    name: 'Cryo Rounds — Apply Chilled Condition',
    hint: 'When enabled, Cryo Rounds apply the Chilled condition when they deal direct HP damage.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, 'incendiaryPersistentFire', {
    name: 'Incendiary Rounds — Persistent Fire on Critical Hit',
    hint: 'When enabled, critical hits with Incendiary Rounds apply persistent fire damage to the target.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, 'incendiaryPersistentDice', {
    name: 'Incendiary Rounds — Persistent Fire Dice Formula',
    hint: 'Dice formula for the persistent fire damage applied on a critical hit (e.g. 1d6, 2d6).',
    scope: 'world', config: true, type: String, default: '1d6',
  });

  // ── Shield behaviour ──
  game.settings.register(MODULE_ID, 'shieldOfflineMessage', {
    name: 'Shield Offline Chat Message',
    hint: 'Post a chat message at turn start when shields are depleted and the actor has not taken cover.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, 'autoDeleteBarrier', {
    name: 'Auto-Delete Depleted Barriers',
    hint: 'Automatically remove the Biotic Barrier effect when its HP reaches zero. When disabled, the barrier persists as an empty field and can be refilled by spending actions or by using Charge.',
    scope: 'world', config: true, type: Boolean, default: false,
  });
  game.settings.register(MODULE_ID, 'shieldRechargeDelay', {
    name: 'Shield Recharge Delay (rounds)',
    hint: 'Rounds a kinetic barrier must go without taking damage before it resumes recharging. Recharge Accelerator mods reduce this.',
    scope: 'world', config: true, type: Number, default: 1,
    range: { min: 0, max: 5, step: 1 },
  });

  // ── Token bars ──
  game.settings.register(MODULE_ID, 'showArmorBars', {
    name: 'Token Bars — Show Armor Points',
    hint: 'Display a yellow Armor Points bar on tokens with an active Combat Armor Frame.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, 'showBarrierBars', {
    name: 'Token Bars — Show Biotic Barrier',
    hint: 'Display a purple Biotic Barrier bar on tokens with an active biotic barrier.',
    scope: 'world', config: true, type: Boolean, default: true,
  });

});

// ── READY ─────────────────────────────────────────────────────────────────────

Hooks.once('ready', async () => {
  const version = game.modules.get(MODULE_ID)?.version ?? '?';
  console.log(`ME Shields | Mass Effect Shield System v${version} loaded.`);
  if (game.user.isGM) {
    await syncEffects(version);
    await migrateActorItems();
  }

  // ── SF2e: Replace UPB currency with Omni-Gel ─────────────────────────────
  if (game.system.id === 'sf2e') {
    const OMNI_GEL_ICON = `modules/${MODULE_ID}/assets/img/items/omni-gel.webp`;

    // CSS: swap the UPB icon everywhere it appears as an <img>
    const style = document.createElement('style');
    style.id = 'me-upb-omni-gel';
    style.textContent = `
      img[src*="upb" i], img[src*="UPB"],
      .currency-item[data-denomination="upb"] img,
      [data-denomination="upb"] img {
        content: url('${OMNI_GEL_ICON}') !important;
      }
    `;
    document.head.appendChild(style);

    // Text walker: replace "UPB" / "UPBs" text nodes with "Omni-Gel"
    function patchUPBText(root) {
      const el = root instanceof HTMLElement ? root : root[0];
      if (!el) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (/\bUPBs?\b/.test(node.textContent))
          node.textContent = node.textContent.replace(/\bUPBs\b/g, 'Omni-Gel').replace(/\bUPB\b/g, 'Omni-Gel');
      }
      el.querySelectorAll('[title*="UPB"],[placeholder*="UPB"],[aria-label*="UPB"]').forEach(node => {
        if (node.title)      node.title      = node.title.replace(/\bUPBs?\b/g, 'Omni-Gel');
        if (node.placeholder) node.placeholder = node.placeholder.replace(/\bUPBs?\b/g, 'Omni-Gel');
        if (node.ariaLabel)  node.ariaLabel  = node.ariaLabel.replace(/\bUPBs?\b/g, 'Omni-Gel');
      });
    }

    for (const hookName of ['renderActorSheet', 'renderItemSheet', 'renderSFRPGActorSheetV2', 'renderApplication']) {
      Hooks.on(hookName, (_app, html) => patchUPBText(html));
    }
  }
});

// ── EFFECT LIFECYCLE ──────────────────────────────────────────────────────────

Hooks.on('createItem', async (item, _options, _userId) => {
  if (!game.user.isGM) return;
  const actor = item.parent;
  if (!actor) return;

  if (isShieldEffect(item)) {
    const baseMax = item.getFlag(MODULE_ID, 'shieldMax') ?? 0;
    const hpMod   = getShieldHpMod(actor);
    const hpBonus = hpMod ? (hpMod.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0) : 0;
    const effectiveMax = baseMax + hpBonus;
    if (effectiveMax > 0) await actor.update({ 'system.attributes.hp.temp': effectiveMax });
    return;
  }

  if (isShieldHpMod(item)) {
    for (const e of [...(actor.itemTypes?.equipment ?? []), ...(actor.itemTypes?.effect ?? [])]
        .filter(e => isShieldHpMod(e) && e.id !== item.id)) {
      await e.delete();
    }
    const shield = getShieldEffect(actor);
    if (shield) {
      const baseMax  = shield.getFlag(MODULE_ID, 'shieldMax') ?? 0;
      const hpBonus  = item.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0;
      const effectiveMax = baseMax + hpBonus;
      if (effectiveMax > 0) await actor.update({ 'system.attributes.hp.temp': effectiveMax });
    }
    return;
  }

  if (isRegenMod(item)) {
    for (const e of [...(actor.itemTypes?.equipment ?? []), ...(actor.itemTypes?.effect ?? [])]
        .filter(e => isRegenMod(e) && e.id !== item.id)) {
      await e.delete();
    }
    return;
  }

  if (isBioticBarrier(item)) {
    for (const e of actor.itemTypes.effect.filter(e => isBioticBarrier(e) && e.id !== item.id)) {
      await e.delete();
    }
    const existingMax = item.getFlag(MODULE_ID, 'barrierMax');
    const level = actor.level ?? 1;
    const max = existingMax ?? Math.max(5, 5 * Math.floor(level / 2));
    await item.update({
      [`flags.${MODULE_ID}.barrierMax`]:     max,
      [`flags.${MODULE_ID}.barrierCurrent`]: max,
      'system.badge': { type: 'counter', value: max, max },
    });
    return;
  }

  if (isArmorFrame(item)) {
    const max = item.getFlag(MODULE_ID, 'armorMax') ?? 0;
    if (max > 0 && item.getFlag(MODULE_ID, 'armorCurrent') == null) {
      await item.update({
        [`flags.${MODULE_ID}.armorCurrent`]: max,
        'system.badge': { type: 'counter', value: max, max, label: 'Armor Points' },
      });
    }
    return;
  }

  if (isAmmoEffect(item)) {
    // Only one ammo effect at a time
    for (const e of (actor.itemTypes?.effect ?? []).filter(e => isAmmoEffect(e) && e.id !== item.id)) {
      await e.delete();
    }
  }
});

Hooks.on('deleteItem', async (item, _options, _userId) => {
  if (!game.user.isGM) return;
  const actor = item.parent;
  if (!actor) return;

  if (isShieldEffect(item)) {
    await actor.update(
      { 'system.attributes.hp.temp': 0 },
      { [MODULE_ID]: { shieldRemoval: true } }
    );
    return;
  }

  if (isShieldHpMod(item)) {
    const shield = getShieldEffect(actor);
    if (shield) {
      const baseMax     = shield.getFlag(MODULE_ID, 'shieldMax') ?? 0;
      const currentTemp = actor.system.attributes.hp.temp ?? 0;
      if (currentTemp > baseMax) {
        await actor.update(
          { 'system.attributes.hp.temp': baseMax },
          { [MODULE_ID]: { shieldRemoval: true } }
        );
      }
    }
  }
});

// ── DAMAGE ROUTING ────────────────────────────────────────────────────────────
// Priority: Barrier → Shield → Armor → HP

Hooks.on('preUpdateActor', (actor, changes, options, _userId) => {
  if (!game.user.isGM) return;
  if (options?.[MODULE_ID]?.shieldRemoval) return;

  const barrier    = getBioticBarrier(actor);
  const shield     = getShieldEffect(actor);
  const armorFrame = getArmorFrame(actor);
  if (!barrier && !shield && !armorFrame) return;

  const currentHP   = actor.system.attributes.hp.value;
  const currentTemp = actor.system.attributes.hp.temp ?? 0;
  const newHP   = foundry.utils.getProperty(changes, 'system.attributes.hp.value') ?? currentHP;
  const newTemp = foundry.utils.getProperty(changes, 'system.attributes.hp.temp') ?? currentTemp;

  const derivedDamage = Math.max(0, (currentHP - newHP) + (currentTemp - newTemp));
  if (derivedDamage <= 0) return;

  const reportedDamage = options?.damageTaken ?? null;
  let   totalDamage    = reportedDamage ?? derivedDamage;

  // Ammo detection: check attacker's active effects for all routing-relevant types.
  // Electricity also falls back to chat message scan so natural-electric weapons work.
  const attackerAmmoType = getAttackerAmmoType();
  const detectedTypes    = detectDamageTypes();
  // Double-check via attacker ammo type flag in case the rule element's override
  // doesn't propagate item:damage:type:electricity into the roll options.
  const isElectricity    = detectedTypes.has('electricity') || attackerAmmoType === 'disruptor';
  const isWarp           = attackerAmmoType === 'warp';
  const isIncendiary     = attackerAmmoType === 'incendiary';
  const isPhasic         = attackerAmmoType === 'phasic';
  const isAP             = attackerAmmoType === 'armor-piercing';
  const isCryo           = attackerAmmoType === 'cryo';
  const isCrit           = detectCriticalHit();

  // Phasic rounds bypass armor entirely but deal reduced total damage
  if (isPhasic) {
    const pct = game.settings.get(MODULE_ID, 'phasicDamagePct') / 100;
    totalDamage = Math.floor(totalDamage * pct);
  }

  const barrierHPBefore = barrier ? (barrier.getFlag(MODULE_ID, 'barrierCurrent') ?? 0) : null;
  const barrierMax      = barrier ? (barrier.getFlag(MODULE_ID, 'barrierMax')     ?? 0) : null;
  const shieldBaseMax   = shield?.getFlag(MODULE_ID, 'shieldMax') ?? 0;
  const shieldHpMod     = shield ? getShieldHpMod(actor) : null;
  const shieldHpBonus   = shieldHpMod ? (shieldHpMod.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0) : 0;
  const shieldMax       = shieldBaseMax + shieldHpBonus;
  const armorMax        = armorFrame ? (armorFrame.getFlag(MODULE_ID, 'armorMax') ?? 0) : 0;
  const armorCurrent    = armorFrame ? (armorFrame.getFlag(MODULE_ID, 'armorCurrent') ?? armorMax) : 0;

  console.group(`ME Shields | [${actor.name}] Damage Routing`);
  console.log(`  PRE-STATE  barrier:${barrierHPBefore ?? '-'}  shields:${currentTemp}/${shieldMax}  armor:${armorCurrent}/${armorMax}  HP:${currentHP}`);
  console.log(`  DAMAGE     total:${totalDamage}  ammo:${attackerAmmoType ?? 'standard'}`);

  // ── Step 1: Barrier absorption (Warp = 1.5×) ──────────────────────────────
  let overflow       = totalDamage;
  let barrierDepleted = false;
  let warpDetonated   = false;

  if (barrier && barrierHPBefore > 0) {
    const warpMult = isWarp ? game.settings.get(MODULE_ID, 'warpMult') : 1.0;
    const effectiveBarrierDamage = Math.min(Math.floor(overflow * warpMult), barrierHPBefore);
    const originalAbsorbed = Math.min(overflow, Math.ceil(effectiveBarrierDamage / warpMult));
    overflow -= originalAbsorbed;
    const newBarrierHP = barrierHPBefore - effectiveBarrierDamage;
    console.log(`  BARRIER    absorbs ${originalAbsorbed} (×${warpMult})  (${barrierHPBefore}→${Math.max(0, newBarrierHP)})`);
    if (newBarrierHP > 0) {
      barrier.update({
        [`flags.${MODULE_ID}.barrierCurrent`]: newBarrierHP,
        'system.badge': { type: 'counter', value: newBarrierHP, max: barrierMax },
      });
    } else {
      barrierDepleted = true;
      warpDetonated   = isWarp;
      if (game.settings.get(MODULE_ID, 'autoDeleteBarrier')) {
        barrier.delete();
      } else {
        barrier.update({
          [`flags.${MODULE_ID}.barrierCurrent`]: 0,
          'system.badge': { type: 'counter', value: 0, max: barrierMax },
        });
      }
    }
  }

  // ── Step 2: Shield rules (electricity = 2×, massive hit = collapse) ────────
  const rawShieldDamage = Math.min(overflow, currentTemp);
  const disruptorMult   = game.settings.get(MODULE_ID, 'disruptorMult');
  const effectiveShieldDamage = isElectricity
    ? Math.min(rawShieldDamage * disruptorMult, currentTemp)
    : rawShieldDamage;

  const massiveThreshold = shieldMax * (game.settings.get(MODULE_ID, 'shieldCollapsePct') / 100);
  const isCollapse = shield && currentTemp > 0 && effectiveShieldDamage > massiveThreshold;

  const shieldAbsorbs = isCollapse ? Math.ceil(massiveThreshold) : rawShieldDamage;
  const finalShieldHP = isCollapse ? 0 : Math.max(0, currentTemp - rawShieldDamage);
  let   hpDamage      = Math.max(0, Math.floor(overflow - shieldAbsorbs));

  console.log(`  SHIELDS    ${currentTemp}/${shieldMax}  collapse:${isCollapse}  after:${finalShieldHP}`);

  // ── Step 3: Armor routing ──────────────────────────────────────────────────
  let finalHpDamage    = hpDamage;
  let armorDepleted    = false;
  let newArmorHP       = armorCurrent;
  let armorDamageTaken = 0;

  if (armorFrame && hpDamage > 0) {
    if (isPhasic) {
      // Phasic bypasses armor entirely
      console.log(`  ARMOR      BYPASSED (phasic)  HP:${hpDamage}`);
    } else {
      // Incendiary burns faster; AP lets a portion bleed through
      const armorDmgMult = isIncendiary ? game.settings.get(MODULE_ID, 'incendiaryArmorMult') : 1.0;
      armorDamageTaken   = Math.min(Math.floor(hpDamage * armorDmgMult), armorCurrent);
      newArmorHP         = armorCurrent - armorDamageTaken;
      const hpNeutralized  = Math.min(hpDamage, Math.floor(armorDamageTaken / armorDmgMult));
      const apBleedPct     = game.settings.get(MODULE_ID, 'apBleedThrough') / 100;
      const apBleedThrough = isAP ? Math.floor(hpDamage * apBleedPct) : 0;
      finalHpDamage = Math.max(apBleedThrough, hpDamage - hpNeutralized);

      if (newArmorHP <= 0) {
        armorDepleted = true;
        armorFrame.delete();
        console.log(`  ARMOR      DEPLETED  HP overflow:${finalHpDamage}`);
      } else {
        armorFrame.update({
          [`flags.${MODULE_ID}.armorCurrent`]: newArmorHP,
          'system.badge': { type: 'counter', value: newArmorHP, max: armorMax, label: 'Armor Points' },
        });
        console.log(`  ARMOR      ${armorCurrent}→${newArmorHP}  HP leaked:${finalHpDamage}`);
      }
    }
  }

  console.log(`  HP         overflow:${finalHpDamage}  HP after:${Math.max(0, currentHP - finalHpDamage)}`);

  // ── Step 4: Rewrite changes ────────────────────────────────────────────────
  foundry.utils.setProperty(changes, 'system.attributes.hp.temp',  finalShieldHP);
  foundry.utils.setProperty(changes, 'system.attributes.hp.value', Math.max(0, currentHP - finalHpDamage));
  // Stamp the round shields last took damage (drives recharge delay). Combat-only.
  if (shield && totalDamage > 0 && game.combat) {
    foundry.utils.setProperty(changes, `flags.${MODULE_ID}.shieldDamageRound`,  game.combat.round);
    foundry.utils.setProperty(changes, `flags.${MODULE_ID}.shieldDamageCombat`, game.combat.id);
  }
  console.groupEnd();

  // ── Step 5: Post messages ──────────────────────────────────────────────────
  if (warpDetonated) {
    postChat(actor, warpBarrierHtml(barrierHPBefore, barrierMax));
  } else if (barrierDepleted) {
    postChat(actor, barrierDepletedHtml());
  }

  if (isElectricity && shield && rawShieldDamage > 0) {
    postChat(actor, lightningShieldHtml(effectiveShieldDamage, currentTemp, finalShieldHP, shieldMax));
  }
  if (isCollapse) {
    postChat(actor, shieldCollapseHtml(shieldMax, massiveThreshold));
  }

  if (isPhasic && armorFrame && hpDamage > 0) {
    postChat(actor, phasicBypassHtml(armorCurrent, armorMax));
  } else if (armorDepleted) {
    postChat(actor, armorDepletedHtml(armorMax));
  } else if (armorFrame && armorDamageTaken > 0) {
    postChat(actor, armorStatusHtml(newArmorHP, armorMax, isIncendiary, isAP));
  }

  if (isCryo && finalHpDamage > 0 && game.settings.get(MODULE_ID, 'cryoChilled')) {
    createChilledEffect(actor);
  }

  if (isIncendiary && isCrit && finalHpDamage > 0
      && game.settings.get(MODULE_ID, 'incendiaryPersistentFire')) {
    const dice = game.settings.get(MODULE_ID, 'incendiaryPersistentDice');
    createPersistentFireEffect(actor);
    postChat(actor, persistentFireHtml(dice));
  }
});

// ── TURN-START REGEN ──────────────────────────────────────────────────────────

Hooks.on('pf2e.startTurn', async (first, second) => {
  const combatant = first?.actor  ? first
                  : second?.actor ? second
                  : null;

  if (!game.user.isGM) return;

  const actor = combatant?.actor;
  if (!actor) return;

  const shield  = getShieldEffect(actor);
  const barrier = getBioticBarrier(actor);
  if (!shield && !barrier) return;

  const parts = [];

  if (shield) {
    const baseMax   = shield.getFlag(MODULE_ID, 'shieldMax')   ?? 0;
    const baseRegen = shield.getFlag(MODULE_ID, 'shieldRegen') ?? 0;
    const hpMod     = getShieldHpMod(actor);
    const hpBonus   = hpMod ? (hpMod.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0) : 0;
    const max       = baseMax + hpBonus;
    const regenMod  = getRegenMod(actor);
    const mult      = regenMod ? (regenMod.getFlag(MODULE_ID, 'regenMult') ?? 1) : 1;
    const regen     = Math.round(baseRegen * mult);
    const current   = actor.system.attributes.hp.temp ?? 0;

    // Recharge delay: shields must go `effectiveDelay` rounds without damage.
    const delayMod      = getRechargeDelayMod(actor);
    const reduction     = delayMod ? (delayMod.getFlag(MODULE_ID, 'rechargeDelayReduction') ?? 0) : 0;
    const noCover       = delayMod ? (delayMod.getFlag(MODULE_ID, 'noCoverRecharge') === true) : false;
    const baseDelay     = game.settings.get(MODULE_ID, 'shieldRechargeDelay') ?? 1;
    const effectiveDelay = Math.max(0, baseDelay - reduction);
    const dmgRound      = shield && actor.getFlag(MODULE_ID, 'shieldDamageRound');
    const dmgCombat     = actor.getFlag(MODULE_ID, 'shieldDamageCombat');
    const round         = game.combat?.round ?? 0;
    const sameCombat    = dmgCombat && game.combat && dmgCombat === game.combat.id;
    const lastDmg       = sameCombat ? dmgRound : null;
    const delayActive   = lastDmg != null && (round - lastDmg) <= effectiveDelay;

    if (current > 0) {
      if (current >= max) {
        parts.push(fullHtml(max));
      } else if (delayActive) {
        parts.push(delayedHtml(current, max));
      } else {
        const newTemp  = Math.min(current + regen, max);
        const restored = newTemp - current;
        await actor.update({ 'system.attributes.hp.temp': newTemp });
        parts.push(rechargeHtml(newTemp, max, restored));
      }
    } else {
      const canRecharge = noCover || hasTakeCover(actor);
      if (delayActive) {
        if (game.settings.get(MODULE_ID, 'shieldOfflineMessage')) parts.push(delayedHtml(0, max));
      } else if (canRecharge) {
        const newTemp = Math.min(regen, max);
        await actor.update({ 'system.attributes.hp.temp': newTemp });
        parts.push(restoringHtml(newTemp, max));
      } else if (game.settings.get(MODULE_ID, 'shieldOfflineMessage')) {
        parts.push(offlineHtml(max));
      }
    }
  }

  if (barrier) {
    const barrierMax     = barrier.getFlag(MODULE_ID, 'barrierMax')     ?? 0;
    const barrierCurrent = barrier.getFlag(MODULE_ID, 'barrierCurrent') ?? 0;
    if (barrierCurrent <= 0) {
      if (game.settings.get(MODULE_ID, 'autoDeleteBarrier')) {
        await barrier.delete();
      } else {
        parts.push(barrierDepletedHtml());
      }
    } else {
      parts.push(barrierStatusHtml(barrierCurrent, barrierMax));
    }
  }

  if (parts.length > 0) postChat(actor, parts.join(''));
});

// ── CUSTOM TOKEN BARS ─────────────────────────────────────────────────────────

const ME_BAR_TAG = '_mebar';

function _meBarH() {
  return Math.max((canvas?.dimensions?.size ?? 100) / 12, 8);
}

function refreshMETokenBars(token) {
  if (!token?.bars) return;

  const stale = token.bars.children.filter(c => c[ME_BAR_TAG]);
  for (const c of stale) {
    if (c.parent) c.parent.removeChild(c);
    c.destroy();
  }

  const actor = token.actor;
  if (!actor) return;

  const barrier    = getBioticBarrier(actor);
  const armorFrame = getArmorFrame(actor);
  if (!barrier && !armorFrame) return;

  const h = _meBarH();
  const w = token.w;
  let n = 2;

  if (armorFrame && game.settings.get(MODULE_ID, 'showArmorBars')) {
    const cur = armorFrame.getFlag(MODULE_ID, 'armorCurrent') ?? 0;
    const max = armorFrame.getFlag(MODULE_ID, 'armorMax')     ?? 0;
    _renderMEBar(token, w, h, n++, cur, max, 0xf9a825);
  }
  if (barrier && game.settings.get(MODULE_ID, 'showBarrierBars')) {
    const cur = barrier.getFlag(MODULE_ID, 'barrierCurrent') ?? 0;
    const max = barrier.getFlag(MODULE_ID, 'barrierMax')     ?? 0;
    _renderMEBar(token, w, h, n, cur, max, 0xce93d8);
  }
}

function _renderMEBar(token, w, h, n, value, max, fillColor) {
  const pct = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  const g   = new PIXI.Graphics();
  g[ME_BAR_TAG] = true;
  g.position.set(0, token.h - h - n * (h + 2));

  g.beginFill(0x000000, 0.5);
  g.drawRoundedRect(0, 0, w, h, 2);
  g.endFill();

  const fillW = pct * (w - 2);
  if (fillW >= 1) {
    g.beginFill(fillColor, 1.0);
    g.drawRoundedRect(1, 1, fillW, h - 2, 1);
    g.endFill();
  }

  token.bars.addChild(g);
}

Hooks.on('drawToken',    (token)          => refreshMETokenBars(token));
Hooks.on('refreshToken', (token, options) => {
  if (options !== undefined && !options.bars) return;
  refreshMETokenBars(token);
});
// canvas.tokens.placeables.filter(t => t.actor === actor) is used instead of
// actor.getActiveTokens() so that unlinked (synthetic) actor instances match by
// reference — getActiveTokens() matches by actorId, which can return tokens for
// other unlinked copies of the same base actor.
function _tokensForActor(actor) {
  return (canvas.tokens?.placeables ?? []).filter(t => t.actor === actor);
}

Hooks.on('updateItem', (item) => {
  if (!item.parent || (!isBioticBarrier(item) && !isArmorFrame(item))) return;
  for (const t of _tokensForActor(item.parent)) refreshMETokenBars(t);
});

// Toggling investiture on a shield-HP mod (e.g. Shield Capacitor) changes the
// effective shield max — clamp current shield HP if it now exceeds the cap.
Hooks.on('updateItem', async (item, changes) => {
  if (!game.user.isGM) return;
  if (foundry.utils.getProperty(changes, 'system.equipped.invested') === undefined) return;
  if (item.flags?.[MODULE_ID]?.shieldHpBonus == null) return;
  const actor = item.parent;
  const shield = actor ? getShieldEffect(actor) : null;
  if (!shield) return;
  const baseMax = shield.getFlag(MODULE_ID, 'shieldMax') ?? 0;
  const hpMod   = getShieldHpMod(actor);
  const bonus   = hpMod ? (hpMod.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0) : 0;
  const max     = baseMax + bonus;
  const cur     = actor.system.attributes.hp.temp ?? 0;
  if (cur > max) await actor.update({ 'system.attributes.hp.temp': max });
});
Hooks.on('createItem', (item) => {
  if (!item.parent || (!isBioticBarrier(item) && !isArmorFrame(item))) return;
  for (const t of _tokensForActor(item.parent)) refreshMETokenBars(t);
});
Hooks.on('deleteItem', (item) => {
  if (!item.parent || (!isBioticBarrier(item) && !isArmorFrame(item))) return;
  for (const t of _tokensForActor(item.parent)) refreshMETokenBars(t);
});

// ── HELPERS ───────────────────────────────────────────────────────────────────

function isShieldEffect(item) {
  return item.flags?.[MODULE_ID]?.shieldMax != null
    && (item.type === 'equipment' || item.type === 'effect');
}

function getShieldEffect(actor) {
  return actor?.itemTypes?.equipment?.find(isShieldEffect)
    ?? actor?.itemTypes?.effect?.find(isShieldEffect)
    ?? null;
}

function isBioticBarrier(item) {
  return item.type === 'effect'
    && (item.flags?.[MODULE_ID]?.barrier === true
        || item.flags?.[MODULE_ID]?.barrierMax != null);
}

function getBioticBarrier(actor) {
  return actor?.itemTypes?.effect?.find(isBioticBarrier) ?? null;
}

function isArmorFrame(item) {
  return item.flags?.[MODULE_ID]?.armorMax != null
    && (item.type === 'effect' || item.type === 'equipment');
}

function getArmorFrame(actor) {
  return actor?.itemTypes?.effect?.find(isArmorFrame)
    ?? actor?.itemTypes?.equipment?.find(isArmorFrame)
    ?? null;
}

function isAmmoEffect(item) {
  return item.type === 'effect'
    && item.flags?.[MODULE_ID]?.ammoType != null;
}

// A mod with the `invested` trait only applies while actually invested.
// Items without the trait (legacy shield/regen mods) keep working on presence.
function modInvestedOK(item) {
  const needsInvest = item.system?.traits?.value?.includes('invested');
  return !needsInvest || item.system?.equipped?.invested === true;
}

function isRegenMod(item) {
  return item.flags?.[MODULE_ID]?.regenMult != null
    && (item.type === 'equipment' || item.type === 'effect')
    && modInvestedOK(item);
}

function getRegenMod(actor) {
  return actor?.itemTypes?.equipment?.find(isRegenMod)
    ?? actor?.itemTypes?.effect?.find(isRegenMod)
    ?? null;
}

function isRechargeDelayMod(item) {
  return item.flags?.[MODULE_ID]?.rechargeDelayReduction != null
    && (item.type === 'equipment' || item.type === 'effect')
    && modInvestedOK(item);
}

function getRechargeDelayMod(actor) {
  return actor?.itemTypes?.equipment?.find(isRechargeDelayMod)
    ?? actor?.itemTypes?.effect?.find(isRechargeDelayMod)
    ?? null;
}

function isShieldHpMod(item) {
  return item.flags?.[MODULE_ID]?.shieldHpBonus != null
    && (item.type === 'equipment' || item.type === 'effect')
    && modInvestedOK(item);
}

function getShieldHpMod(actor) {
  return actor?.itemTypes?.equipment?.find(isShieldHpMod)
    ?? actor?.itemTypes?.effect?.find(isShieldHpMod)
    ?? null;
}

// Returns true when the most recent damage-roll message was a critical hit.
function detectCriticalHit() {
  const recent = [...game.messages.contents].slice(-10).reverse();
  for (const msg of recent) {
    const pf2e = msg.flags?.pf2e;
    if (!pf2e) continue;
    if (pf2e.context?.type !== 'damage-roll') continue;
    return pf2e.context?.degreeOfSuccess === 3;
  }
  return false;
}

// Returns a Set of damage types from the most recent damage-roll chat message.
function detectDamageTypes() {
  const recent = [...game.messages.contents].slice(-10).reverse();
  for (const msg of recent) {
    const pf2e = msg.flags?.pf2e;
    if (!pf2e) continue;
    if (pf2e.context?.type !== 'damage-roll') continue;
    const options = pf2e.context?.options ?? [];
    const types = new Set();
    for (const opt of options) {
      const m = opt.match(/^item:damage:type:(.+)$/);
      if (m) types.add(m[1]);
    }
    return types;
  }
  return new Set();
}

// Finds the attacker's active ammo effect by scanning the most recent
// damage-roll message for the speaker token, then checking that actor's effects.
function getAttackerAmmoType() {
  const recent = [...game.messages.contents].slice(-10).reverse();
  for (const msg of recent) {
    const pf2e = msg.flags?.pf2e;
    if (!pf2e) continue;
    if (pf2e.context?.type !== 'damage-roll') continue;
    const tokenId = msg.speaker?.token;
    const sceneId = msg.speaker?.scene;
    if (!tokenId) break;
    const scene = game.scenes.get(sceneId) ?? game.scenes.current;
    const token = scene?.tokens?.get(tokenId);
    const attackerActor = token?.actor;
    if (!attackerActor) break;
    const ammoEffect = attackerActor.itemTypes?.effect?.find(isAmmoEffect);
    return ammoEffect?.getFlag(MODULE_ID, 'ammoType') ?? null;
  }
  return null;
}

function hasTakeCover(actor) {
  const slug = game.settings.get(MODULE_ID, 'takeCoverSlug');
  return actor?.itemTypes?.effect?.some(e => e.system?.slug === slug) ?? false;
}

function getWhisperRecipients(actor) {
  const ids = new Set(game.users.filter(u => u.isGM).map(u => u.id));
  for (const [userId, level] of Object.entries(actor.ownership ?? {})) {
    if (userId === 'default') continue;
    if (level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) ids.add(userId);
  }
  return [...ids];
}

function postChat(actor, content) {
  ChatMessage.create({
    speaker: { alias: `⚡ ${actor.name}` },
    content,
    whisper: getWhisperRecipients(actor),
  });
}

// The system's own persistent-damage condition, so it rolls at end of turn and
// offers the DC 15 flat check. (There is no PersistentDamage rule element.)
async function createPersistentFireEffect(actor) {
  const dice = game.settings.get(MODULE_ID, 'incendiaryPersistentDice');
  const condition = game.pf2e.ConditionManager.getCondition('persistent-damage').toObject();
  condition.system.persistent = { formula: dice, damageType: 'fire', dc: 15 };
  await actor.createEmbeddedDocuments('Item', [condition]);
}

async function createChilledEffect(actor) {
  await actor.createEmbeddedDocuments('Item', [{
    name: 'Chilled',
    type: 'effect',
    img: 'icons/magic/water/ice-snowflake-cold-blue.webp',
    flags: {},
    system: {
      slug: 'me-chilled',
      description: {
        value: '<p>Off-guard until the end of your next turn. Applied by Cryo Rounds.</p>',
      },
      duration: { value: 1, unit: 'turns', expiry: 'turn-end' },
      rules: [],
    },
  }]);
}

// ── CHAT HTML ─────────────────────────────────────────────────────────────────

const C = {
  active:   '#4fc3f7',
  broken:   '#ef5350',
  restore:  '#66bb6a',
  barrier:  '#ce93d8',
  overload: '#ff6f00',
  lightning:'#fff176',
  armor:    '#90a4ae',
  phasic:   '#00e5ff',
  warp:     '#ce93d8',
  incendiary: '#ff6f00',
  cryo:     '#80deea',
};

function shieldBar(current, max, color) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  return `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
    <div style="flex:1;background:rgba(0,0,0,0.3);border-radius:3px;height:7px;overflow:hidden;">
      <div style="width:${pct}%;background:${color};height:100%;border-radius:3px;"></div>
    </div>
    <span style="font-size:0.85em;white-space:nowrap;"><strong>${current}/${max}</strong></span>
  </div>`;
}

function card(color, body) {
  return `<div style="border-left:3px solid ${color};padding:5px 10px;`
    + `background:${color}18;border-radius:2px;font-size:0.95em;margin-top:4px;">${body}</div>`;
}

function fullHtml(max) {
  return card(C.active, `<strong>⚡ Shields at Full Capacity</strong>` + shieldBar(max, max, C.active));
}

function rechargeHtml(current, max, restored) {
  return card(C.active, `<strong>⚡ Shields Recharging</strong> +${restored}` + shieldBar(current, max, C.active));
}

function restoringHtml(current, max) {
  return card(C.restore,
    `<strong>🛡️ Shields Coming Online</strong><br>`
    + `Cover taken — kinetic barrier beginning to recharge.`
    + shieldBar(current, max, C.restore));
}

function offlineHtml(max) {
  return card(C.broken,
    `<strong>🛡️ Shields Offline</strong><br>`
    + `Kinetic barrier is depleted. <em>Take Cover to begin recharging.</em>`
    + shieldBar(0, max, C.broken));
}

function delayedHtml(current, max) {
  return card(C.lightning,
    `<strong>⏳ Recharge Delayed</strong><br>`
    + `Barrier took fire recently — recharge suspended this round.`
    + shieldBar(current, max, C.lightning));
}

function lightningShieldHtml(shieldDamage, _prevTemp, finalShieldHP, shieldMax) {
  return card(C.lightning,
    `<strong>⚡ Lightning Strike — Shields take double damage!</strong><br>`
    + `Shield damage: <strong>${shieldDamage}</strong> (${shieldDamage / 2} × 2)`
    + shieldBar(finalShieldHP, shieldMax, C.lightning));
}

function shieldCollapseHtml(shieldMax, threshold) {
  return card(C.overload,
    `<strong>🔴 Shield Overload — Shields Collapsed!</strong><br>`
    + `Massive hit exceeded overload threshold (${Math.ceil(threshold)} damage). `
    + `<em>Take Cover to restart.</em>`
    + shieldBar(0, shieldMax, C.overload));
}

function barrierStatusHtml(current, max) {
  return card(C.barrier, `<strong>🟣 Biotic Barrier</strong>` + shieldBar(current, max, C.barrier));
}

function barrierDepletedHtml() {
  return card(C.barrier,
    `<strong>🟣 Biotic Barrier Collapsed</strong><br>`
    + `Barrier depleted — spend actions to reactivate.`);
}

function warpBarrierHtml(prevHP, max) {
  return card(C.warp,
    `<strong>🟣 Warp Detonation — Barrier Collapsed!</strong><br>`
    + `Warp rounds destroyed the biotic barrier (${prevHP} HP) in a dark energy detonation.`
    + shieldBar(0, max, C.warp));
}

function armorStatusHtml(current, max, isIncendiary, isAP) {
  const incMult = game.settings.get(MODULE_ID, 'incendiaryArmorMult');
  const apPct   = game.settings.get(MODULE_ID, 'apBleedThrough');
  const note = isIncendiary ? ` <em>(Incendiary — ${incMult}× armor damage)</em>`
             : isAP         ? ` <em>(AP — ${apPct}% bleed-through)</em>`
             : '';
  return card(C.armor,
    `<strong>🔩 Armor Absorbing Damage</strong>${note}`
    + shieldBar(current, max, C.armor));
}

function armorDepletedHtml(max) {
  return card(C.broken,
    `<strong>🔩 Armor Destroyed!</strong><br>`
    + `Combat Armor Frame has been completely ablated.`
    + shieldBar(0, max, C.broken));
}

function persistentFireHtml(dice) {
  return card(C.incendiary,
    `<strong>🔥 Persistent Fire — Critical Hit!</strong><br>`
    + `Incendiary rounds ignite the target. Taking <strong>${dice} persistent fire</strong> damage each turn.`
    + ` <em>DC 15 Flat check to extinguish.</em>`);
}

function phasicBypassHtml(armorCurrent, armorMax) {
  const damagePct = game.settings.get(MODULE_ID, 'phasicDamagePct');
  return card(C.phasic,
    `<strong>🔵 Phasic Bypass — Armor Ignored</strong><br>`
    + `Phasic rounds bypass the armor frame (${armorCurrent}/${armorMax} AP). Damage reduced to ${damagePct}%.`
    + shieldBar(armorCurrent, armorMax, C.phasic));
}

// ── WORLD ACTOR ITEM MIGRATION ────────────────────────────────────────────────
// Ensures all ME shield/barrier/armor/mod items embedded in world actors have
// the correct flags. Handles items imported from old compendium versions that
// may have missing or renamed flags. Runs automatically at ready (GM only).

// Maps equipment item name → required flags with their correct values.
// Matched by name only — no flag pre-condition, so items with no ME flags are found.
const EQUIPMENT_FLAG_DEFAULTS = {
  'Kinetic Shield':            { shieldMax: 30, shieldRegen: 10 },
  'Shield HP Mod - Tier 1':    { shieldHpBonus: 10 },
  'Shield HP Mod - Tier 2':    { shieldHpBonus: 20 },
  'Shield HP Mod - Tier 3':    { shieldHpBonus: 40 },
  'Shield HP Mod - Tier 4':    { shieldHpBonus: 70 },
  'Shield Regen Mod - Tier 1': { regenMult: 1.5 },
  'Shield Regen Mod - Tier 2': { regenMult: 2.0 },
  'Shield Regen Mod - Tier 3': { regenMult: 2.5 },
  'Shield Regen Mod - Tier 4': { regenMult: 3.0 },
};

// Maps armor frame effect item name → correct armorMax value.
const ARMOR_FRAME_DEFAULTS = {
  'Light Combat Frame':    20,
  'Standard Combat Frame': 50,
  'Heavy Combat Frame':    100,
  'Titan Combat Frame':    200,
};

async function migrateActorItems() {
  if (!game.user.isGM) return;

  // actorLog: { actorName → string[] of what was fixed }
  const actorLog = new Map();
  const note = (actor, msg) => {
    if (!actorLog.has(actor.name)) actorLog.set(actor.name, []);
    actorLog.get(actor.name).push(msg);
  };

  for (const actor of game.actors.contents) {
    let shieldFixed = false;

    // ── Equipment items (shields, mods) ──
    for (const item of (actor.itemTypes?.equipment ?? [])) {
      const defaults = EQUIPMENT_FLAG_DEFAULTS[item.name];
      if (!defaults) continue;

      const existing = item.flags?.[MODULE_ID] ?? {};
      const updates = {};
      for (const [key, val] of Object.entries(defaults)) {
        if (existing[key] == null) updates[`flags.${MODULE_ID}.${key}`] = val;
      }

      if (Object.keys(updates).length > 0) {
        await item.update(updates);
        note(actor, `${item.name}: set ${Object.keys(updates).map(k => k.split('.').pop()).join(', ')}`);
        if (item.name === 'Kinetic Shield' || item.name.startsWith('Shield HP Mod')) shieldFixed = true;
      }
    }

    // ── Sync hp.temp if shield base or HP mod was repaired ──
    if (shieldFixed) {
      const shield  = getShieldEffect(actor);
      const hpMod   = getShieldHpMod(actor);
      const baseMax = shield?.getFlag(MODULE_ID, 'shieldMax') ?? 0;
      const bonus   = hpMod?.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0;
      const correct = baseMax + bonus;
      if (correct > 0 && actor.system.attributes.hp.temp !== correct) {
        await actor.update({ 'system.attributes.hp.temp': correct });
        note(actor, `Shield HP reset to ${correct}`);
      }
    }

    // ── Effect items (armor frames, biotic barriers) ──
    for (const item of (actor.itemTypes?.effect ?? [])) {
      const flags = item.flags?.[MODULE_ID] ?? {};

      // Armor frames: ensure armorMax, armorCurrent, and badge are set
      const expectedArmorMax = ARMOR_FRAME_DEFAULTS[item.name];
      if (expectedArmorMax != null) {
        const updates = {};
        if (flags.armorMax == null)     updates[`flags.${MODULE_ID}.armorMax`]     = expectedArmorMax;
        if (flags.armorCurrent == null) updates[`flags.${MODULE_ID}.armorCurrent`] = expectedArmorMax;
        const needsBadge = item.system?.badge?.type !== 'counter' || item.system?.badge?.max == null;
        if (Object.keys(updates).length > 0 || needsBadge) {
          const max = flags.armorMax ?? expectedArmorMax;
          const cur = flags.armorCurrent ?? expectedArmorMax;
          await item.update({
            ...updates,
            'system.badge': { type: 'counter', value: cur, max, label: 'Armor Points' },
          });
          note(actor, `${item.name}: repaired armor frame (${cur}/${max} AP)`);
        }
        continue;
      }

      // Biotic barriers: ensure barrierMax and barrierCurrent are set
      if (flags.barrier === true || flags.barrierMax != null) {
        const updates = {};
        if (flags.barrierMax == null) {
          const level = actor.system?.details?.level?.value ?? 1;
          const max = Math.max(5, 5 * Math.floor(level / 2));
          updates[`flags.${MODULE_ID}.barrierMax`]     = max;
          updates[`flags.${MODULE_ID}.barrierCurrent`] = max;
          updates['system.badge'] = { type: 'counter', value: max, max };
          note(actor, `${item.name}: initialized barrier (${max} HP)`);
        } else if (flags.barrierCurrent == null) {
          const max = flags.barrierMax;
          updates[`flags.${MODULE_ID}.barrierCurrent`] = max;
          updates['system.badge'] = { type: 'counter', value: max, max };
          note(actor, `${item.name}: restored barrierCurrent to ${max}`);
        }
        if (Object.keys(updates).length > 0) await item.update(updates);
      }
    }
  }

  // ── Report ──
  const totalActors = actorLog.size;
  if (totalActors === 0) {
    console.log('ME Shields | Migration complete — nothing to fix.');
    ui.notifications.info('ME Shields | All actors are up to date.');
    return;
  }

  console.log(`ME Shields | Migration complete — updated ${totalActors} actor(s).`);
  for (const [name, fixes] of actorLog) {
    console.log(`  ${name}: ${fixes.join(' | ')}`);
  }

  const rows = [...actorLog.entries()]
    .map(([name, fixes]) => `<li><strong>${name}</strong><ul>${fixes.map(f => `<li>${f}</li>`).join('')}</ul></li>`)
    .join('');

  const DialogClass = foundry.applications?.api?.DialogV2 ?? Dialog;

  if (foundry.applications?.api?.DialogV2) {
    DialogClass.alert({
      window: { title: 'ME Shields — Migration Complete' },
      content: `<p>Updated <strong>${totalActors}</strong> actor(s):</p><ul>${rows}</ul>`,
    });
  } else {
    new Dialog({
      title: 'ME Shields — Migration Complete',
      content: `<p>Updated <strong>${totalActors}</strong> actor(s):</p><ul>${rows}</ul>`,
      buttons: { ok: { label: 'OK' } },
      default: 'ok',
    }).render(true);
  }
}

// ── LEGACY CLEANUP ────────────────────────────────────────────────────────────
// All module items (shields, barriers, armor frames, ammo) now live in the
// me-shields and me-ammo-powers compendiums. If old world items from a previous
// sync() run are present they can be removed with MassEffectShields.sync().

async function syncEffects(version, { force = false } = {}) {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can run sync.');
  console.log(`ME Shields | Removing legacy world items (module v${version})…`);

  const stale = game.items.filter(i => {
    const f = i.flags?.[MODULE_ID];
    return f && (
      f.shieldMax     != null ||
      f.barrier       === true ||
      f.barrierMax    != null ||
      f.regenMult     != null ||
      f.shieldHpBonus != null ||
      f.armorMax      != null ||
      f.ammoType      != null ||
      f.ammoFeat      != null
    );
  });
  for (const item of stale) await item.delete();

  for (const folderName of ['Mass Effect Shields', 'Mass Effect Barriers', 'Mass Effect Mods', 'Mass Effect Armor', 'Mass Effect Ammo Powers']) {
    const folder = game.folders.find(f => f.name === folderName && f.type === 'Item');
    if (folder && folder.contents.length === 0) await folder.delete();
  }

  const removed = stale.length;
  ui.notifications.info(`ME Shields | Removed ${removed} legacy world item(s). Items now live in the ME Shields & Armor and ME Ammo Powers compendiums.`);
  console.log(`ME Shields | Sync complete — ${removed} legacy items removed.`);
}

// ── DEBUG UTILITY ─────────────────────────────────────────────────────────────

function debugShields(actor) {
  actor ??= canvas.tokens.controlled[0]?.actor ?? game.combat?.combatant?.actor;
  if (!actor) { console.warn('ME Shields | debug(): no actor selected'); return; }

  console.group(`ME Shields | Debug — ${actor.name}`);
  console.log('tempHP:', actor.system.attributes.hp.temp);

  const shield = getShieldEffect(actor);
  if (shield) {
    console.log('Shield:', shield.name, `| max=${shield.getFlag(MODULE_ID,'shieldMax')} regen=${shield.getFlag(MODULE_ID,'shieldRegen')}`);
  } else {
    console.warn('No shield effect found.');
  }

  const barrier = getBioticBarrier(actor);
  if (barrier) {
    console.log('Barrier:', barrier.name, `| max=${barrier.getFlag(MODULE_ID,'barrierMax')} current=${barrier.getFlag(MODULE_ID,'barrierCurrent')}`);
  }

  const armorFrame = getArmorFrame(actor);
  if (armorFrame) {
    console.log('Armor Frame:', armorFrame.name, `| max=${armorFrame.getFlag(MODULE_ID,'armorMax')} current=${armorFrame.getFlag(MODULE_ID,'armorCurrent')}`);
  }

  const hpMod = getShieldHpMod(actor);
  if (hpMod) console.log('HP Mod:', hpMod.name, `| bonus=${hpMod.getFlag(MODULE_ID,'shieldHpBonus')}`);

  const regenMod = getRegenMod(actor);
  if (regenMod) console.log('Regen Mod:', regenMod.name, `| mult=${regenMod.getFlag(MODULE_ID,'regenMult')}`);

  const ammoEffect = actor.itemTypes?.effect?.find(isAmmoEffect);
  if (ammoEffect) console.log('Ammo:', ammoEffect.name, `| type=${ammoEffect.getFlag(MODULE_ID,'ammoType')}`);

  console.log('Take Cover:', hasTakeCover(actor));
  console.groupEnd();
}

// Removes any stuck "Load X Rounds" feat items from all world actors.
// Call once after sync() to clean up old classfeature/bonus feats.
async function cleanAmmoFeats() {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can run cleanAmmoFeats.');
  let removed = 0;
  for (const actor of game.actors.contents) {
    const stuck = actor.items.filter(i => i.type === 'feat' && i.flags?.[MODULE_ID]?.ammoType != null);
    for (const item of stuck) {
      await item.delete();
      removed++;
    }
  }
  ui.notifications.info(`ME Shields | Removed ${removed} stuck ammo feat(s) from world actors.`);
  console.log(`ME Shields | cleanAmmoFeats removed ${removed} item(s).`);
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

globalThis.MassEffectShields = {
  sync:             () => syncEffects(game.modules.get(MODULE_ID)?.version ?? '?'),
  migrate:          migrateActorItems,
  debug:            debugShields,
  refreshTokenBars: refreshMETokenBars,
  cleanAmmoFeats,
};
