// ============================================================
// MASS EFFECT PARAGON / RENEGADE TRACKER — Foundry VTT v13 Module
// ============================================================
(() => {
'use strict';

const PR_MODULE = 'mass-effect-sf2e-conversion';
const S_IGNORED = 'prIgnoredActors';
const S_EXTRA   = 'prExtraActors';

const N = v => Number(v) || 0;
const clamp = (v, lo, hi) => Math.min(Math.max(N(v), lo), hi);
const stripHtml = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');

function mkAction({ name, img, atype, category, perDay, descHTML, rules = [] }) {
  return {
    type: 'action', name, img,
    system: {
      actionType: { value: atype },
      actions: { value: atype === 'one' ? 1 : null },
      category,
      description: { value: descHTML },
      frequency: { max: perDay, per: 'day', value: perDay },
      rules, traits: { value: [] },
      _migration: { version: null, previous: null },
    },
  };
}

// ── ITEM BLUEPRINTS ────────────────────────────────────────────────────────────

const PARAGON_ITEMS = {
  'Paragon 20 — Trusted Presence': {
    type: 'effect', name: 'Paragon 20 — Trusted Presence', img: 'icons/svg/aura.svg',
    system: {
      description: { value: '+1 circumstance to Diplomacy checks.' },
      duration: { value: -1, unit: 'unlimited' }, start: { value: 0 }, tokenIcon: { show: true },
      rules: [{ key: 'FlatModifier', selector: 'diplomacy', type: 'circumstance', value: 1 }],
    },
  },
  'Paragon 40 — Inspiring Voice': mkAction({
    name: 'Paragon 40 — Inspiring Voice', img: 'icons/svg/upgrade.svg',
    atype: 'free', category: 'defensive', perDay: 1,
    descHTML: 'Free Action (1/day). Fortune on one Diplomacy or Medicine check (keep higher).',
    rules: [{ key: 'RollTwice', selector: ['diplomacy', 'medicine'], keep: 'higher', effectType: 'fortune', removeAfterRoll: true }],
  }),
  'Paragon 60 — Beacon of Hope': mkAction({
    name: 'Paragon 60 — Beacon of Hope', img: 'icons/svg/sun.svg',
    atype: 'one', category: 'interaction', perDay: 1,
    descHTML: 'Action (1/day). For 1 minute, +2 circumstance to Diplomacy when you Make an Impression or Request.',
  }),
  'Paragon 80 — Noble Sacrifice': mkAction({
    name: 'Paragon 80 — Noble Sacrifice', img: 'icons/svg/shield.svg',
    atype: 'reaction', category: 'defensive', perDay: 1,
    descHTML: 'Reaction (1/day). Trigger: ally in 30 ft would drop to 0 HP. Effect: ally set to 1 HP; you take damage equal to your level.',
  }),
  'Paragon 100 — Living Legend': {
    type: 'effect', name: 'Paragon 100 — Living Legend', img: 'icons/svg/star.svg',
    system: {
      description: { value: '+1 status to Diplomacy and Medicine.' },
      duration: { value: -1, unit: 'unlimited' }, start: { value: 0 }, tokenIcon: { show: true },
      rules: [
        { key: 'FlatModifier', selector: 'diplomacy', type: 'status', value: 1 },
        { key: 'FlatModifier', selector: 'medicine',  type: 'status', value: 1 },
      ],
    },
  },
};

const RENEGADE_ITEMS = {
  'Renegade 20 — Fearsome Reputation': {
    type: 'effect', name: 'Renegade 20 — Fearsome Reputation', img: 'icons/svg/daze.svg',
    system: {
      description: { value: '+1 circumstance to Intimidation checks.' },
      duration: { value: -1, unit: 'unlimited' }, start: { value: 0 }, tokenIcon: { show: true },
      rules: [{ key: 'FlatModifier', selector: 'intimidation', type: 'circumstance', value: 1 }],
    },
  },
  'Renegade 40 — Ruthless Efficiency': mkAction({
    name: 'Renegade 40 — Ruthless Efficiency', img: 'icons/svg/bolt.svg',
    atype: 'free', category: 'offensive', perDay: 1,
    descHTML: 'Free Action (1/day). Fortune on one Intimidation or Deception check (keep higher).',
    rules: [{ key: 'RollTwice', selector: ['intimidation', 'deception'], keep: 'higher', effectType: 'fortune', removeAfterRoll: true }],
  }),
  'Renegade 60 — Command Through Fear': mkAction({
    name: 'Renegade 60 — Command Through Fear', img: 'icons/svg/terror.svg',
    atype: 'one', category: 'interaction', perDay: 1,
    descHTML: 'Action (1/day). For 1 minute, +2 circumstance to Intimidation when you Coerce.',
  }),
  'Renegade 80 — Uncompromising': mkAction({
    name: 'Renegade 80 — Uncompromising', img: 'icons/svg/target.svg',
    atype: 'one', category: 'offensive', perDay: 1,
    descHTML: 'Action (1/day). Before a Strike this turn: +2 circumstance to attack; treat cover one step lower.',
  }),
  'Renegade 100 — Infamous': {
    type: 'effect', name: 'Renegade 100 — Infamous', img: 'icons/svg/explosion.svg',
    system: {
      description: { value: '+1 status to Intimidation and Deception.' },
      duration: { value: -1, unit: 'unlimited' }, start: { value: 0 }, tokenIcon: { show: true },
      rules: [
        { key: 'FlatModifier', selector: 'intimidation', type: 'status', value: 1 },
        { key: 'FlatModifier', selector: 'deception',    type: 'status', value: 1 },
      ],
    },
  },
};

const PARAGON_THRESH = [
  { value: 20,  grants: ['Paragon 20 — Trusted Presence'] },
  { value: 40,  grants: ['Paragon 40 — Inspiring Voice'] },
  { value: 60,  grants: ['Paragon 60 — Beacon of Hope'] },
  { value: 80,  grants: ['Paragon 80 — Noble Sacrifice'] },
  { value: 100, grants: ['Paragon 100 — Living Legend'] },
];

const RENEGADE_THRESH = [
  { value: 20,  grants: ['Renegade 20 — Fearsome Reputation'] },
  { value: 40,  grants: ['Renegade 40 — Ruthless Efficiency'] },
  { value: 60,  grants: ['Renegade 60 — Command Through Fear'] },
  { value: 80,  grants: ['Renegade 80 — Uncompromising'] },
  { value: 100, grants: ['Renegade 100 — Infamous'] },
];

function namesFor(val, table) {
  const out = new Set();
  for (const row of table) if (N(val) >= row.value) for (const n of row.grants) out.add(n);
  return out;
}

// ── ENGINE ─────────────────────────────────────────────────────────────────────

async function syncTrack(actor, track, newVal) {
  const oldVal = N(actor.getFlag('world', track));
  const val = clamp(newVal, 0, 100);
  await actor.setFlag('world', track, val);
  if (val !== oldVal) {
    const delta = val - oldVal;
    const label = track === 'paragon' ? 'Paragon' : 'Renegade';
    const color = track === 'paragon' ? '#4ab8ff' : '#D60C0C';
    ChatMessage.create({
      content: `<p style="margin:0;font-size:0.9em"><span style="color:${color};font-weight:700">${label}</span> — <b>${actor.name}</b>: ${delta > 0 ? '+' : ''}${delta} (now <b>${val}</b>)</p>`,
      whisper: ChatMessage.getWhisperRecipients('GM'),
    });
  }
  const isParagon = track === 'paragon';
  const table = isParagon ? PARAGON_THRESH : RENEGADE_THRESH;
  const defs  = isParagon ? PARAGON_ITEMS  : RENEGADE_ITEMS;
  const should = namesFor(val, table);
  const owned  = actor.items.contents;
  const byName = new Map(owned.map(i => [i.name, i]));
  const toCreate = [];
  for (const name of should) if (!byName.has(name)) toCreate.push(defs[name]);
  if (toCreate.length) await actor.createEmbeddedDocuments('Item', toCreate);
  const prefix   = isParagon ? 'Paragon ' : 'Renegade ';
  const toDelete = owned
    .filter(i => (i.type === 'effect' || i.type === 'action') && i.name.startsWith(prefix) && !should.has(i.name))
    .map(i => i.id);
  if (toDelete.length) await actor.deleteEmbeddedDocuments('Item', toDelete);
  return val;
}

async function useTier(actor, track, tier) {
  const name =
    track === 'paragon' ? (
      tier === 40 ? 'Paragon 40 — Inspiring Voice'  :
      tier === 60 ? 'Paragon 60 — Beacon of Hope'   :
      tier === 80 ? 'Paragon 80 — Noble Sacrifice'  : null
    ) : (
      tier === 40 ? 'Renegade 40 — Ruthless Efficiency'  :
      tier === 60 ? 'Renegade 60 — Command Through Fear' :
      tier === 80 ? 'Renegade 80 — Uncompromising'       : null
    );
  if (!name) return;
  // Actors set up with the original tracker macro have en-dash names ("Paragon 40 – Inspiring Voice")
  const normDash = s => s.replace(/\s[–-]\s/, ' — ');
  const item = actor.items.find(i => normDash(i.name) === name);
  if (!item) return ui.notifications.warn(`${name} not found on actor.`);
  const freq = item.system?.frequency;
  if (!freq || N(freq.value) <= 0) return ui.notifications.warn('No uses left today.');
  const speaker = ChatMessage.getSpeaker({ actor });

  if (name.includes('Inspiring Voice')) {
    await ChatMessage.create({ speaker, content: '<b>Inspiring Voice</b>: Fortune on one Diplomacy or Medicine check (keep higher).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Inspiring Voice (Fortune)', img: 'icons/svg/upgrade.svg',
      system: { description: { value: 'Roll Twice (fortune): Diplomacy/Medicine; remove after first eligible roll.' },
        duration: { value: 1, unit: 'minutes' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'RollTwice', selector: ['diplomacy', 'medicine'], keep: 'higher', effectType: 'fortune', removeAfterRoll: true }] },
    }]);
  } else if (name.includes('Beacon of Hope')) {
    await ChatMessage.create({ speaker, content: '<b>Beacon of Hope</b>: +2 circumstance to Diplomacy for Make an Impression / Request (1 minute).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Beacon of Hope (+2 Diplomacy: Impression/Request)', img: 'icons/svg/sun.svg',
      system: { description: { value: '+2 circumstance to Diplomacy (Make an Impression / Request).' },
        duration: { value: 1, unit: 'minutes' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'FlatModifier', selector: 'diplomacy', type: 'circumstance', value: 2, predicate: [{ or: ['action:make-an-impression', 'action:request'] }] }] },
    }]);
  } else if (name.includes('Noble Sacrifice')) {
    await ChatMessage.create({ speaker, content: '<b>Noble Sacrifice</b>: Ally in 30 ft would drop to 0 → instead set to 1 HP; you take damage equal to your level (GM adjudication).' });
  } else if (name.includes('Ruthless Efficiency')) {
    await ChatMessage.create({ speaker, content: '<b>Ruthless Efficiency</b>: Fortune on one Intimidation or Deception check (keep higher).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Ruthless Efficiency (Fortune)', img: 'icons/svg/bolt.svg',
      system: { description: { value: 'Roll Twice (fortune): Intimidation/Deception; remove after first eligible roll.' },
        duration: { value: 1, unit: 'minutes' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'RollTwice', selector: ['intimidation', 'deception'], keep: 'higher', effectType: 'fortune', removeAfterRoll: true }] },
    }]);
  } else if (name.includes('Command Through Fear')) {
    await ChatMessage.create({ speaker, content: '<b>Command Through Fear</b>: +2 circumstance to Intimidation when you Coerce (1 minute).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Command Through Fear (+2 Intimidation: Coerce)', img: 'icons/svg/terror.svg',
      system: { description: { value: '+2 circumstance to Intimidation when you Coerce.' },
        duration: { value: 1, unit: 'minutes' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'FlatModifier', selector: 'intimidation', type: 'circumstance', value: 2, predicate: ['action:coerce'] }] },
    }]);
  } else if (name.includes('Uncompromising')) {
    await ChatMessage.create({ speaker, content: '<b>Uncompromising</b>: +2 circumstance to attack rolls; treat cover one step lower (1 round).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Uncompromising (+2 to attacks; cover -1 step)', img: 'icons/svg/target.svg',
      system: { description: { value: 'For 1 round: +2 circumstance to attack rolls; treat cover one step lower (GM adjudication).' },
        duration: { value: 1, unit: 'rounds' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'FlatModifier', selector: 'attack-roll', type: 'circumstance', value: 2 }] },
    }]);
  }

  await item.update({ 'system.frequency.value': Math.max(0, N(freq.value) - 1) });
  ui.notifications.info(`Used: ${name}`);
}

// ── STYLES ─────────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('me-pr-styles')) return;
  const style = document.createElement('style');
  style.id = 'me-pr-styles';
  style.textContent = `
    #me-paragon-renegade .window-content { padding: 0; overflow: hidden; }

    .me-pr-layout { display: flex; height: 100%; overflow: hidden; }

    /* ── Sidebar ── */
    .me-pr-sidebar {
      width: 200px; flex-shrink: 0;
      border-right: 1px solid var(--color-border-light, #2a3340);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .me-pr-sidebar-tabs {
      display: flex; flex-shrink: 0;
      border-bottom: 1px solid var(--color-border-light, #2a3340);
    }
    .me-pr-tab {
      flex: 1; padding: 0.3rem 0;
      font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
      background: transparent; border: none; border-bottom: 2px solid transparent;
      cursor: pointer; color: var(--color-text-secondary, #6a7a9a); margin-bottom: -1px;
    }
    .me-pr-tab:hover { color: var(--color-text-primary, #dbe5ff); }
    .me-pr-tab.active { color: var(--color-text-primary, #dbe5ff); border-bottom-color: #4a9eff; }

    .me-pr-sidebar-list { flex: 1; overflow-y: auto; }

    .me-pr-sidebar-item {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.45rem 0.6rem; cursor: pointer;
      border-left: 3px solid transparent; user-select: none;
    }
    .me-pr-sidebar-item:hover { background: rgba(255,255,255,0.05); }
    .me-pr-sidebar-item.active { border-left-color: #4a9eff; background: rgba(74,158,255,0.1); }

    .me-pr-sidebar-remove {
      flex-shrink: 0; margin-left: auto;
      background: transparent; border: none;
      color: transparent; cursor: pointer;
      font-size: 0.82rem; padding: 0 0.15rem; line-height: 1;
    }
    .me-pr-sidebar-item:hover .me-pr-sidebar-remove { color: var(--color-text-secondary, #6a7a9a); }
    .me-pr-sidebar-remove:hover { color: #D60C0C !important; }

    .me-pr-sidebar-portrait {
      width: 32px; height: 32px; border-radius: 3px; object-fit: cover;
      flex-shrink: 0; border: 1px solid var(--color-border-light, #3a4659);
    }
    .me-pr-sidebar-name {
      font-size: 0.78rem; font-weight: 500;
      color: var(--color-text-primary, #dbe5ff);
      line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
    }

    .me-pr-sidebar-footer {
      flex-shrink: 0; padding: 0.4rem 0.5rem;
      border-top: 1px solid var(--color-border-light, #2a3340);
    }
    .me-pr-sidebar-add {
      width: 100%; padding: 0.25rem 0; font-size: 0.7rem; font-weight: 600;
      border: 1px dashed rgba(74,158,255,0.4); border-radius: 3px;
      background: transparent; color: rgba(74,158,255,0.7); cursor: pointer;
    }
    .me-pr-sidebar-add:hover { border-color: #4a9eff; color: #4ab8ff; background: rgba(74,158,255,0.05); }

    /* Add actor panel */
    .me-pr-add-panel {
      flex: 1; display: flex; flex-direction: column; overflow: hidden;
      padding: 0.4rem 0.5rem; gap: 0.3rem;
    }
    .me-pr-add-search {
      width: 100%; padding: 0.2rem 0.4rem; font-size: 0.72rem;
      border-radius: 3px; border: 1px solid var(--color-border-light, #3a4659);
      background: rgba(255,255,255,0.06); color: var(--color-text-primary, #dbe5ff);
      box-sizing: border-box;
    }
    .me-pr-add-list { flex: 1; overflow-y: auto; }
    .me-pr-add-item {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.3rem 0.4rem; cursor: pointer; border-radius: 3px;
    }
    .me-pr-add-item:hover { background: rgba(74,158,255,0.08); }
    .me-pr-add-cancel {
      flex-shrink: 0; padding: 0.2rem; font-size: 0.65rem; width: 100%;
      border: 1px solid rgba(255,255,255,0.15); border-radius: 3px;
      background: transparent; color: var(--color-text-secondary, #90a0bf); cursor: pointer;
    }
    .me-pr-add-cancel:hover { background: rgba(255,255,255,0.05); }
    .me-pr-add-empty, .me-pr-empty-small {
      font-size: 0.65rem; color: var(--color-text-secondary, #6a7a9a);
      text-align: center; padding: 0.75rem 0.5rem; font-style: italic; margin: 0;
    }

    /* ── Detail panel ── */
    .me-pr-detail {
      flex: 1; display: flex; flex-direction: column;
      padding: 0.6rem 0.9rem 0; overflow: hidden; gap: 0.4rem; min-width: 0;
    }
    .me-pr-detail-header {
      display: flex; align-items: center; gap: 0.6rem;
      padding-bottom: 0.4rem; border-bottom: 1px solid var(--color-border-light, #2a3340);
      flex-shrink: 0;
    }
    .me-pr-detail-portrait {
      width: 40px; height: 40px; border-radius: 4px; object-fit: cover;
      border: 1px solid var(--color-border-light, #3a4659); flex-shrink: 0;
    }
    .me-pr-detail-name {
      flex: 1; margin: 0; font-size: 1.05rem; font-weight: 700;
      color: var(--color-text-primary, #dbe5ff);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
    }
    .me-pr-ignore-btn {
      flex-shrink: 0; font-size: 0.65rem; font-weight: 600;
      padding: 0.1rem 0.45rem;
      border: 1px solid rgba(255,255,255,0.18); border-radius: 3px;
      background: transparent; color: var(--color-text-secondary, #7a8aaa); cursor: pointer;
    }
    .me-pr-ignore-btn:hover {
      border-color: rgba(255,255,255,0.35); color: var(--color-text-primary, #dbe5ff);
      background: rgba(255,255,255,0.05);
    }

    /* Track block */
    .me-pr-track { flex-shrink: 0; }
    .me-pr-track-header {
      display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.2rem;
    }
    .me-pr-track-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .me-pr-track-label.paragon  { color: #4a9eff; }
    .me-pr-track-label.renegade { color: #D60C0C; }
    .me-pr-score { font-size: 1rem; font-weight: 700; color: var(--color-text-primary, #dbe5ff); }

    .me-pr-bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; }
    .me-pr-bar-fill { height: 100%; border-radius: 3px; transition: width 0.25s ease; }
    .me-pr-bar-fill.paragon  { background: linear-gradient(90deg, #1a6eff, #4ab8ff); }
    .me-pr-bar-fill.renegade { background: linear-gradient(90deg, #8a0808, #D60C0C); }

    .me-pr-tiers { display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.2rem; }
    .me-pr-tier-btn {
      padding: 0.1rem 0.5rem; font-size: 0.65rem; font-weight: 600;
      border-radius: 3px; cursor: pointer; border: 1px solid; white-space: nowrap;
    }
    .me-pr-tier-btn.paragon  { border-color: #4a9eff; background: rgba(74,158,255,0.1); color: #4ab8ff; }
    .me-pr-tier-btn.paragon:hover  { background: rgba(74,158,255,0.22); }
    .me-pr-tier-btn.renegade { border-color: #D60C0C; background: rgba(214,12,12,0.1); color: #D60C0C; }
    .me-pr-tier-btn.renegade:hover { background: rgba(214,12,12,0.22); }

    /* Perks */
    .me-pr-perks-section { display: flex; flex-direction: column; gap: 0.2rem; overflow: hidden; }
    .me-pr-perks-row { display: flex; align-items: center; gap: 0.4rem; overflow: hidden; }
    .me-pr-perks-label {
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; flex-shrink: 0; width: 52px;
    }
    .me-pr-perks-label.paragon  { color: #4a9eff; }
    .me-pr-perks-label.renegade { color: #D60C0C; }
    .me-pr-perks-list { display: flex; flex-wrap: wrap; gap: 0.2rem; overflow: hidden; }
    .me-pr-perk {
      font-size: 0.62rem; font-weight: 500; padding: 0.05rem 0.35rem;
      border-radius: 2px; border: 1px solid; white-space: nowrap;
    }
    .me-pr-perk.paragon  { border-color: rgba(74,158,255,0.5); background: rgba(74,158,255,0.08); color: #4ab8ff; }
    .me-pr-perk.renegade { border-color: rgba(214,12,12,0.5);  background: rgba(214,12,12,0.08);  color: #D60C0C; }
    .me-pr-perk-none { font-size: 0.62rem; color: var(--color-text-secondary, #556070); }

    /* Bottom controls */
    .me-pr-bottom-controls {
      margin-top: auto; flex-shrink: 0;
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0 0.5rem;
      border-top: 1px solid var(--color-border-light, #2a3340);
    }
    .me-pr-track-toggle { display: flex; flex-shrink: 0; }
    .me-pr-track-select {
      padding: 0.15rem 0.55rem; font-size: 0.68rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em;
      border: 1px solid; cursor: pointer; line-height: 1.5; background: transparent;
    }
    .me-pr-track-select:first-child { border-radius: 3px 0 0 3px; }
    .me-pr-track-select:last-child  { border-radius: 0 3px 3px 0; margin-left: -1px; }
    .me-pr-track-select.paragon         { border-color: rgba(74,158,255,0.3); color: rgba(74,158,255,0.4); }
    .me-pr-track-select.paragon.active  { border-color: #4a9eff; background: rgba(74,158,255,0.15); color: #4ab8ff; }
    .me-pr-track-select.renegade        { border-color: rgba(214,12,12,0.3); color: rgba(214,12,12,0.4); }
    .me-pr-track-select.renegade.active { border-color: #D60C0C; background: rgba(214,12,12,0.15); color: #D60C0C; }

    .me-pr-adjustments { display: flex; align-items: center; gap: 0.25rem; }
    .me-pr-btn {
      padding: 0.1rem 0.45rem; font-size: 0.72rem; font-weight: 600;
      border-radius: 3px; border: 1px solid var(--color-border-light, #3a4659);
      background: var(--color-bg-btn, #1a2230); color: var(--color-text-primary, #dbe5ff);
      cursor: pointer; line-height: 1.5; white-space: nowrap;
    }
    .me-pr-btn:hover { background: var(--color-bg-btn-hover, #2a3a55); }
    .me-pr-btn.neg   { color: #D60C0C; }
    .me-pr-set-input {
      width: 42px; padding: 0.1rem 0.25rem; font-size: 0.72rem; border-radius: 3px;
      border: 1px solid var(--color-border-light, #3a4659);
      background: rgba(255,255,255,0.06); color: var(--color-text-primary, #dbe5ff); text-align: center;
    }
    .me-pr-set-input::-webkit-inner-spin-button { -webkit-appearance: none; }

    .me-pr-empty { padding: 2rem; text-align: center; color: var(--color-text-secondary, #888); font-style: italic; }
  `;
  document.head.appendChild(style);
}

// ── TIER LABELS ────────────────────────────────────────────────────────────────

const TIER_LABEL = {
  paragon:  { 40: 'Inspiring Voice', 60: 'Beacon of Hope',     80: 'Noble Sacrifice' },
  renegade: { 40: 'Ruthless Efficiency', 60: 'Command Through Fear', 80: 'Uncompromising' },
};

// ── APPLICATION ────────────────────────────────────────────────────────────────

Hooks.once('init', () => {

  game.settings.register(PR_MODULE, S_IGNORED, { scope: 'world', config: false, type: Array, default: [] });
  game.settings.register(PR_MODULE, S_EXTRA,   { scope: 'world', config: false, type: Array, default: [] });

  class ParagonRenegadeDashboard extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: 'me-paragon-renegade',
      classes: ['me-pr-dashboard'],
      tag: 'div',
      window: { title: 'Paragon / Renegade Tracker', icon: 'fa-solid fa-scale-balanced', resizable: true, minimizable: true },
      position: { width: 980, height: 600 },
    };

    static _instance = null;

    _selectedId  = null;
    _activeTrack = 'paragon';
    _showIgnored = false;
    _addingActor = false;
    _addSearch   = '';

    static async open(actorId = null) {
      for (const key of [S_IGNORED, S_EXTRA]) {
        const ids = game.settings.get(PR_MODULE, key) ?? [];
        const clean = ids.filter(id => !!game.actors.get(id));
        if (clean.length !== ids.length) game.settings.set(PR_MODULE, key, clean);
      }
      ParagonRenegadeDashboard._instance?.close();
      const inst = new ParagonRenegadeDashboard();
      if (actorId) {
        // Opened from a character sheet: make sure the GM's list includes that actor
        if (game.user.isGM) {
          const ignored = game.settings.get(PR_MODULE, S_IGNORED) ?? [];
          const tracked = inst._getTracked().some(a => a.id === actorId);
          if (ignored.includes(actorId)) inst._showIgnored = true;
          else if (!tracked) await game.settings.set(PR_MODULE, S_EXTRA, [...(game.settings.get(PR_MODULE, S_EXTRA) ?? []), actorId]);
        }
        inst._selectedId = actorId;
      }
      ParagonRenegadeDashboard._instance = inst;
      inst.render(true);
    }

    _getTracked() {
      const ignored = new Set(game.settings.get(PR_MODULE, S_IGNORED) ?? []);
      const extra   = game.settings.get(PR_MODULE, S_EXTRA) ?? [];
      const party   = game.actors.find(a => a.type === 'party');
      const partyMembers = (party?.system?.details?.members ?? []).map(m => fromUuidSync(m.uuid)).filter(Boolean);
      const extraActors  = extra.map(id => game.actors.get(id)).filter(Boolean);
      const seen = new Set();
      return [...partyMembers, ...extraActors].filter(a => {
        if (!a || seen.has(a.id) || ignored.has(a.id)) return false;
        seen.add(a.id); return true;
      });
    }

    _getIgnored() {
      return (game.settings.get(PR_MODULE, S_IGNORED) ?? []).map(id => game.actors.get(id)).filter(Boolean);
    }

    get _isGM() { return game.user.isGM; }

    async _prepareContext(options) {
      const isGM = this._isGM;
      // Non-GM: only actors the player owns, no ignored/extra management
      let tracked, ignored;
      if (isGM) {
        tracked = this._getTracked();
        ignored = this._getIgnored();
      } else {
        tracked = game.actors.filter(a => a.type !== 'party' && a.isOwner);
        ignored = [];
        this._showIgnored = false;
      }
      const list = (isGM && this._showIgnored) ? ignored : tracked;
      if (!this._selectedId || !list.find(a => a.id === this._selectedId))
        this._selectedId = list[0]?.id ?? null;

      const extraIds = new Set(game.settings.get(PR_MODULE, S_EXTRA) ?? []);
      const mapActor = actor => {
        const pVal  = N(actor.getFlag('world', 'paragon'));
        const rVal  = N(actor.getFlag('world', 'renegade'));
        const items = actor.items.contents;
        return {
          id: actor.id, name: actor.name, img: actor.img,
          selected: actor.id === this._selectedId,
          isExtra: isGM && extraIds.has(actor.id),
          paragon: pVal, renegade: rVal,
          paragonPerks:  items.filter(i => (i.type==='effect'||i.type==='action') && i.name.startsWith('Paragon ')).map(i=>i.name),
          renegadePerks: items.filter(i => (i.type==='effect'||i.type==='action') && i.name.startsWith('Renegade ')).map(i=>i.name),
          paragonTiers:  [40,60,80].filter(t => pVal >= t),
          renegadeTiers: [40,60,80].filter(t => rVal >= t),
        };
      };

      const trackedIds = new Set([...tracked, ...ignored].map(a => a.id));
      const available  = !this._addingActor ? [] : game.actors.filter(
        a => a.type !== 'party' && !trackedIds.has(a.id) &&
             (!this._addSearch || a.name.toLowerCase().includes(this._addSearch.toLowerCase()))
      );

      return { members: list.map(mapActor), showIgnored: this._showIgnored, activeTrack: this._activeTrack, addingActor: this._addingActor, available, isGM };
    }

    async _renderHTML(context, options) {
      const wrap = document.createElement('div');
      wrap.className = 'me-pr-layout';
      const selected = context.members.find(m => m.selected) ?? null;

      const memberList = `
        <div class="me-pr-sidebar-list">
          ${context.members.map(m => `
            <div class="me-pr-sidebar-item${m.selected?' active':''}" data-action="select" data-actor-id="${m.id}">
              <img class="me-pr-sidebar-portrait" src="${m.img}" alt="${m.name}">
              <span class="me-pr-sidebar-name">${m.name}</span>
              ${m.isExtra && !context.showIgnored ? `<button class="me-pr-sidebar-remove" data-action="remove-actor" data-actor-id="${m.id}" title="Remove from tracker">×</button>` : ''}
            </div>`).join('') || '<p class="me-pr-empty-small">None.</p>'}
        </div>`;

      const sidebarContent = !context.isGM ? memberList
        : context.addingActor ? `
        <div class="me-pr-add-panel">
          <input class="me-pr-add-search" type="text" placeholder="Search actors…" value="" autocomplete="off">
          <div class="me-pr-add-list">
            ${context.available.length
              ? context.available.map(a => `
                  <div class="me-pr-add-item" data-action="add-confirm" data-actor-id="${a.id}">
                    <img class="me-pr-sidebar-portrait" src="${a.img}" alt="${a.name}">
                    <span class="me-pr-sidebar-name">${a.name}</span>
                  </div>`).join('')
              : '<p class="me-pr-add-empty">No actors found.</p>'}
          </div>
          <button class="me-pr-add-cancel" data-action="add-cancel">Cancel</button>
        </div>` : `
        ${memberList}
        <div class="me-pr-sidebar-footer">
          <button class="me-pr-sidebar-add" data-action="add-start"><i class="fa-solid fa-plus"></i> Add Actor</button>
        </div>`;

      const tabs = context.isGM ? `
        <div class="me-pr-sidebar-tabs">
          <button class="me-pr-tab${!context.showIgnored?' active':''}" data-action="show-active">Active</button>
          <button class="me-pr-tab${context.showIgnored?' active':''}" data-action="show-ignored">Ignored</button>
        </div>` : '';

      wrap.innerHTML = `
        <div class="me-pr-sidebar">
          ${tabs}
          ${sidebarContent}
        </div>
        <div class="me-pr-detail" data-actor-id="${selected?.id ?? ''}">
          ${selected ? this._detailHTML(selected, context) : '<p class="me-pr-empty">No members tracked.</p>'}
        </div>`;
      return wrap;
    }

    _replaceHTML(result, content, options) { content.replaceChildren(result); }

    _detailHTML(m, context) {
      const actionKey   = context.showIgnored ? 'unignore-actor' : 'ignore-actor';
      const actionLabel = context.showIgnored ? 'Unignore' : 'Ignore';
      const ignoreBtn   = context.isGM
        ? `<button class="me-pr-ignore-btn" data-action="${actionKey}" data-actor-id="${m.id}">${actionLabel}</button>`
        : '';
      const pChips = m.paragonPerks.length
        ? m.paragonPerks.map(p => {
            const tip = stripHtml(PARAGON_ITEMS[p]?.system?.description?.value ?? '');
            return `<span class="me-pr-perk paragon" title="${tip}">${p.replace(/^Paragon \d+ — /,'')}</span>`;
          }).join('')
        : '<span class="me-pr-perk-none">—</span>';
      const rChips = m.renegadePerks.length
        ? m.renegadePerks.map(p => {
            const tip = stripHtml(RENEGADE_ITEMS[p]?.system?.description?.value ?? '');
            return `<span class="me-pr-perk renegade" title="${tip}">${p.replace(/^Renegade \d+ — /,'')}</span>`;
          }).join('')
        : '<span class="me-pr-perk-none">—</span>';
      const curVal = context.activeTrack === 'paragon' ? m.paragon : m.renegade;
      const bottomControls = context.isGM ? `
        <div class="me-pr-bottom-controls">
          <div class="me-pr-track-toggle">
            <button class="me-pr-track-select paragon${context.activeTrack==='paragon'?' active':''}" data-action="set-track" data-track="paragon">Paragon</button>
            <button class="me-pr-track-select renegade${context.activeTrack==='renegade'?' active':''}" data-action="set-track" data-track="renegade">Renegade</button>
          </div>
          <div class="me-pr-adjustments">
            <button class="me-pr-btn neg" data-action="delta" data-delta="-1">-1</button>
            <button class="me-pr-btn" data-action="delta" data-delta="1">+1</button>
            <button class="me-pr-btn" data-action="delta" data-delta="2">+2</button>
            <button class="me-pr-btn" data-action="delta" data-delta="5">+5</button>
            <input class="me-pr-set-input" type="number" min="0" max="100" value="${curVal}">
            <button class="me-pr-btn" data-action="set">Set</button>
          </div>
        </div>` : '';

      return `
        <div class="me-pr-detail-header">
          <img class="me-pr-detail-portrait" src="${m.img}" alt="${m.name}">
          <h3 class="me-pr-detail-name">${m.name}</h3>
          ${ignoreBtn}
        </div>
        ${this._trackHTML(m, 'paragon')}
        ${this._trackHTML(m, 'renegade')}
        <div class="me-pr-perks-section">
          <div class="me-pr-perks-row">
            <span class="me-pr-perks-label paragon">Paragon</span>
            <div class="me-pr-perks-list">${pChips}</div>
          </div>
          <div class="me-pr-perks-row">
            <span class="me-pr-perks-label renegade">Renegade</span>
            <div class="me-pr-perks-list">${rChips}</div>
          </div>
        </div>
        ${bottomControls}`;
    }

    _trackHTML(m, track) {
      const isParagon = track === 'paragon';
      const val   = isParagon ? m.paragon  : m.renegade;
      const tiers = isParagon ? m.paragonTiers : m.renegadeTiers;
      const label = isParagon ? 'Paragon' : 'Renegade';
      const tiersHTML = tiers.length
        ? `<div class="me-pr-tiers">${tiers.map(t =>
            `<button class="me-pr-tier-btn ${track}" data-action="use-tier" data-track="${track}" data-tier="${t}">${TIER_LABEL[track][t]}</button>`
          ).join('')}</div>` : '';
      return `
        <div class="me-pr-track">
          <div class="me-pr-track-header">
            <span class="me-pr-track-label ${track}">${label}</span>
            <span class="me-pr-score">${val}</span>
          </div>
          <div class="me-pr-bar"><div class="me-pr-bar-fill ${track}" style="width:${val}%"></div></div>
          ${tiersHTML}
        </div>`;
    }

    _onRender(context, options) {
      if (this._listenerElement !== this.element) {
        this.element.addEventListener('click', this._onClick.bind(this));
        this.element.addEventListener('keydown', this._onKeydown.bind(this));
        this._listenerElement = this.element;
      }
      const searchInput = this.element.querySelector('.me-pr-add-search');
      if (searchInput) {
        searchInput.addEventListener('input', this._onAddSearch.bind(this));
        searchInput.focus();
      }
    }

    _onAddSearch(event) {
      this._addSearch = event.target.value;
      const listEl = this.element.querySelector('.me-pr-add-list');
      if (!listEl) return;
      const trackedIds = new Set([...this._getTracked(), ...this._getIgnored()].map(a => a.id));
      const search     = this._addSearch.toLowerCase();
      const available  = game.actors.filter(
        a => a.type !== 'party' && !trackedIds.has(a.id) && (!search || a.name.toLowerCase().includes(search))
      );
      listEl.innerHTML = available.length
        ? available.map(a => `
            <div class="me-pr-add-item" data-action="add-confirm" data-actor-id="${a.id}">
              <img class="me-pr-sidebar-portrait" src="${a.img}" alt="${a.name}">
              <span class="me-pr-sidebar-name">${a.name}</span>
            </div>`).join('')
        : '<p class="me-pr-add-empty">No actors found.</p>';
    }

    async _onClick(event) {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'select')       { this._selectedId = btn.dataset.actorId; await this.render(); return; }
      if (action === 'show-active')  { this._showIgnored = false; this._selectedId = null; await this.render(); return; }
      if (action === 'show-ignored') { this._showIgnored = true;  this._selectedId = null; await this.render(); return; }
      if (action === 'add-start')    { this._addingActor = true;  this._addSearch = ''; await this.render(); return; }
      if (action === 'add-cancel')   { this._addingActor = false; this._addSearch = ''; await this.render(); return; }
      if (action === 'set-track')    { this._activeTrack = btn.dataset.track; await this.render(); return; }

      if (action === 'remove-actor') {
        const extra = (game.settings.get(PR_MODULE, S_EXTRA) ?? []).filter(id => id !== btn.dataset.actorId);
        await game.settings.set(PR_MODULE, S_EXTRA, extra);
        if (this._selectedId === btn.dataset.actorId) this._selectedId = null;
        await this.render(); return;
      }

      if (action === 'add-confirm') {
        const extra = [...(game.settings.get(PR_MODULE, S_EXTRA) ?? [])];
        if (!extra.includes(btn.dataset.actorId)) extra.push(btn.dataset.actorId);
        await game.settings.set(PR_MODULE, S_EXTRA, extra);
        this._addingActor = false; this._addSearch = '';
        await this.render(); return;
      }
      if (action === 'ignore-actor') {
        const ignored = [...(game.settings.get(PR_MODULE, S_IGNORED) ?? [])];
        if (!ignored.includes(btn.dataset.actorId)) ignored.push(btn.dataset.actorId);
        await game.settings.set(PR_MODULE, S_IGNORED, ignored);
        this._selectedId = null; await this.render(); return;
      }
      if (action === 'unignore-actor') {
        const ignored = (game.settings.get(PR_MODULE, S_IGNORED) ?? []).filter(id => id !== btn.dataset.actorId);
        await game.settings.set(PR_MODULE, S_IGNORED, ignored);
        this._selectedId = null; await this.render(); return;
      }

      const detailEl = this.element.querySelector('.me-pr-detail[data-actor-id]');
      if (!detailEl?.dataset.actorId) return;
      const actor = game.actors.get(detailEl.dataset.actorId);
      if (!actor) return;

      if (action === 'delta') {
        await syncTrack(actor, this._activeTrack, N(actor.getFlag('world', this._activeTrack)) + N(btn.dataset.delta));
        await this.render();
      } else if (action === 'set') {
        const input = this.element.querySelector('.me-pr-set-input');
        await syncTrack(actor, this._activeTrack, N(input?.value));
        await this.render();
      } else if (action === 'use-tier') {
        await useTier(actor, btn.dataset.track, N(btn.dataset.tier));
        await this.render();
      }
    }

    async _onKeydown(event) {
      if (event.key !== 'Enter') return;
      const input = event.target;
      if (!input.classList.contains('me-pr-set-input')) return;
      const detailEl = this.element.querySelector('.me-pr-detail[data-actor-id]');
      if (!detailEl?.dataset.actorId) return;
      const actor = game.actors.get(detailEl.dataset.actorId);
      if (!actor) return;
      await syncTrack(actor, this._activeTrack, N(input.value));
      await this.render();
    }
  }

  Hooks.on('renderSceneControls', (app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];
    const menu = root?.querySelector('#scene-controls-layers')
               ?? document.querySelector('#scene-controls-layers');
    if (!menu || menu.querySelector('[data-me-pr-btn]')) return;
    const li = document.createElement('li');
    li.innerHTML = `<button type="button"
      class="control ui-control layer icon fa-solid fa-scale-balanced"
      data-me-pr-btn="1"
      aria-label="Paragon / Renegade Tracker"
      title="Paragon / Renegade Tracker"></button>`;
    li.querySelector('button').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      ParagonRenegadeDashboard.open();
    });
    menu.appendChild(li);
  });

  // Character sheet header button: opens the tracker focused on that character.
  // PF2e/SF2e character sheets are ApplicationV1, which fires get<Class>HeaderButtons up the chain.
  Hooks.on('getActorSheetHeaderButtons', (app, buttons) => {
    const actor = app.actor ?? app.document;
    if (actor?.type !== 'character' || !actor.isOwner) return;
    buttons.unshift({
      label: 'Paragon/Renegade',
      class: 'me-pr-open',
      icon: 'fa-solid fa-scale-balanced',
      onclick: () => ParagonRenegadeDashboard.open(actor.id),
    });
  });

  globalThis.MassEffectPR = { open: (actorOrId) => ParagonRenegadeDashboard.open(actorOrId?.id ?? actorOrId ?? null) };

  Hooks.on('updateActor', (actor) => {
    const inst = ParagonRenegadeDashboard._instance;
    if (!inst || inst._state < 1) return;
    if ([...inst._getTracked(), ...inst._getIgnored()].some(a => a.id === actor.id))
      inst.render();
  });

  // PF2e resets per-day frequencies automatically on rest; we just refresh the display
  Hooks.on('pf2e.restForTheNight', () => {
    const inst = ParagonRenegadeDashboard._instance;
    if (inst?._state >= 1) inst.render();
  });

}); // end Hooks.once('init')

Hooks.once('ready', () => { injectStyles(); });

})(); // end IIFE
