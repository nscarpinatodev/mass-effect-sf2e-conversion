// Drives scripts/me-powers.js's save and on-use hooks with mock Foundry objects.
// Dice roll their maximum, so every expected number is exact. Run: npm test
import { readFileSync, readdirSync } from 'fs';
import vm from 'vm';

const MOD = 'mass-effect-sf2e-conversion';
const src = readFileSync(new URL('../scripts/me-powers.js', import.meta.url), 'utf8');

// ── mocks ──
const hooks = { on: {}, once: {} };
const posted = [];
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.log('  FAIL', msg); } else console.log('  ok  ', msg); };

// Deterministic dice: every die rolls its maximum, so totals are predictable.
function evalFormula(f) {
  let s = f.trim();
  if (s.startsWith('{')) s = s.slice(1, -1);
  return s.split(/,(?![^\[]*\])/).map((part) => {
    const m = part.match(/^\(?([^\[]+?)\)?\[([^\]]+)\]$/) ?? [null, part, 'untyped'];
    const total = m[1].replace(/(\d+)d(\d+)/g, (_, n, d) => String(n * d)).split('+').reduce((a, b) => a + Number(b), 0);
    return { type: m[2], total };
  });
}
let rollCount = 0;
class DamageRoll {
  constructor(formula) { this.formula = formula; }
  async evaluate() { rollCount++; this.instances = evalFormula(this.formula); this.total = this.instances.reduce((a, i) => a + i.total, 0); return this; }
}
class Roll extends DamageRoll {}
class Actor {
  constructor(name, { traits = [], hp = 50, temp = 0, items = [], flags = {}, type = 'npc' } = {}) {
    Object.assign(this, { name, type, flags: { [MOD]: flags }, items, damage: [], conditions: [], created: [] });
    this.system = { traits: { value: traits }, attributes: { hp: { value: hp, max: 60, temp } } };
    this.itemTypes = { effect: items.filter((i) => i.type === 'effect'), equipment: items.filter((i) => i.type === 'equipment'), feat: [] };
  }
  getActiveTokens() { return []; }
  getFlag(scope, key) { return this.flags[scope]?.[key]; }
  async setFlag(scope, key, v) { this.flags[scope][key] = v; }
  async applyDamage({ damage }) { this.damage.push(damage.total); }
  async increaseCondition(name, opts) { this.conditions.push(opts ? `${name}:${opts.value}` : name); }
  async createEmbeddedDocuments(_, docs) { this.created.push(...docs); }
  async update(data) {
    for (const [k, v] of Object.entries(data)) {
      const path = k.split('.'); let o = this; while (path.length > 1) o = o[path.shift()]; o[path[0]] = v;
    }
  }
}
function barrierItem(current, max) {
  const item = { type: 'effect', flags: { [MOD]: { barrierMax: max, barrierCurrent: current } } };
  item.update = async (data) => { item.flags[MOD].barrierCurrent = data[`flags.${MOD}.barrierCurrent`]; };
  return item;
}

const uuids = {};
const ctx = vm.createContext({
  console, Math, Date, Number, String, Object, Array, Set, Map, Promise, JSON, Infinity,
  Hooks: { on: (n, f) => (hooks.on[n] ??= []).push(f), once: (n, f) => (hooks.once[n] ??= []).push(f) },
  game: {
    user: { isGM: true, id: 'gm' }, users: [],
    settings: { get: () => true, register() {} },
    pf2e: {
      DamageRoll,
      ConditionManager: { getCondition: (slug) => ({ toObject: () => ({ type: 'condition', system: { slug } }) }) },
    },
  },
  ChatMessage: { getSpeakerActor: (s) => s.actor, create: (d) => posted.push(d) },
  CONFIG: {}, canvas: undefined, foundry: { utils: { getProperty: () => undefined } },
  Actor, Roll,
  fromUuid: async (u) => uuids[u] ?? null,
});
vm.runInContext(src, ctx);
const saveHook = hooks.on.createChatMessage[0];

async function save(power, outcome, target, { caster = null, origin = 'Item.power' } = {}) {
  if (caster) uuids[origin] = { actor: caster };
  posted.length = 0;
  await saveHook({
    speaker: { actor: target }, token: null,
    flags: { pf2e: { origin: { uuid: origin }, context: { type: 'saving-throw', outcome, options: [`me-power:${power}`] } } },
  });
  return posted.at(-1)?.content ?? '';
}

// ── cases ──
console.log('Arc Grenade: basic area, one shared roll');
{
  const a = new Actor('A'), b = new Actor('B'), c = new Actor('C');
  rollCount = 0;
  await save('me-grenade-arc', 'failure', a, { origin: 'Item.arc1' });
  await save('me-grenade-arc', 'success', b, { origin: 'Item.arc1' });
  await save('me-grenade-arc', 'criticalFailure', c, { origin: 'Item.arc1' });
  assert(a.damage[0] === 16 && b.damage[0] === 8 && c.damage[0] === 32, `full/half/double of one 2d8 roll: ${a.damage} ${b.damage} ${c.damage}`);
  assert(c.conditions.includes('stunned:1'), 'crit failure stuns');
}

console.log('Omni-Grenade: mixed types halve per type');
{
  const t = new Actor('T');
  await save('me-engineer-omni-grenade', 'success', t, { origin: 'Item.omni' });
  assert(t.damage[0] === 24, `half of 24 fire + 24 electricity = ${t.damage[0]}`);
}

console.log('Overload: extra damage only against synthetics');
{
  const human = new Actor('Human', { traits: ['humanoid'] }), geth = new Actor('Geth', { traits: ['geth', 'construct'] });
  await save('me-tech-overload', 'failure', human);
  await save('me-tech-overload', 'failure', geth);
  assert(human.damage[0] === 16 && geth.damage[0] === 24, `2d8 vs 3d8: ${human.damage} / ${geth.damage}`);
}

console.log('Nova: damage is the barrier HP recorded on use');
{
  const vanguard = new Actor('Vanguard', { flags: { novaCharge: 14 } });
  const t1 = new Actor('T1'), t2 = new Actor('T2');
  await save('me-biotic-nova', 'failure', t1, { caster: vanguard, origin: 'Item.nova' });
  await save('me-biotic-nova', 'criticalFailure', t2, { caster: vanguard, origin: 'Item.nova' });
  assert(t1.damage[0] === 14 && t2.damage[0] === 28, `14 / doubled 28: ${t1.damage} / ${t2.damage}`);
  assert(t2.conditions.includes('prone'), 'crit failure knocks prone');
  const empty = new Actor('Empty'); const t3 = new Actor('T3');
  const msg = await save('me-biotic-nova', 'failure', t3, { caster: empty, origin: 'Item.nova2' });
  assert(t3.damage.length === 0 && msg.includes('roll it by hand'), 'no recorded charge: no damage, says so');
}

console.log('Charge: failure refills half the caster\'s barrier');
{
  const barrier = barrierItem(2, 20);
  const vanguard = new Actor('Vanguard', { items: [barrier] });
  const t = new Actor('T');
  await save('me-biotic-charge', 'failure', t, { caster: vanguard, origin: 'Item.charge' });
  assert(barrier.flags[MOD].barrierCurrent === 12, `2 + 10 = ${barrier.flags[MOD].barrierCurrent}`);
  assert(t.damage[0] === 18 && t.conditions.includes('prone'), 'target takes 3d6 and falls prone');
}

console.log('Reave: caster heals, capped at max HP');
{
  const adept = new Actor('Adept', { hp: 55 });
  const t = new Actor('T');
  await save('me-biotic-reave', 'criticalFailure', t, { caster: adept, origin: 'Item.reave' });
  assert(adept.system.attributes.hp.value === 60 && t.damage[0] === 32, `heal capped at 60 (got ${adept.system.attributes.hp.value}); 4d8 = ${t.damage}`);
}

console.log('Energy Drain: shields first, else damage');
{
  const shieldItem = { type: 'equipment', flags: { [MOD]: { shieldMax: 30 } } };
  const eng = new Actor('Engineer', { temp: 25, items: [shieldItem] });
  const shielded = new Actor('Shielded', { temp: 15 });
  await save('me-tech-energy-drain', 'failure', shielded, { caster: eng, origin: 'Item.drain' });
  assert(shielded.system.attributes.hp.temp === 0 && eng.system.attributes.hp.temp === 30, `drained 15, caster capped at 30 (got ${eng.system.attributes.hp.temp})`);
  const bare = new Actor('Bare');
  const eng2 = new Actor('Engineer2');
  await save('me-tech-energy-drain', 'failure', bare, { caster: eng2, origin: 'Item.drain2' });
  assert(bare.damage[0] === 16 && eng2.system.attributes.hp.temp === 10, `2d8 damage and 10 temp (got ${bare.damage}, ${eng2.system.attributes.hp.temp})`);
}

console.log('Flare: crit failure depletes the target\'s barrier');
{
  const barrier = barrierItem(9, 10);
  const t = new Actor('T', { items: [barrier] });
  await save('me-biotic-flare', 'criticalFailure', t, { origin: 'Item.flare' });
  assert(barrier.flags[MOD].barrierCurrent === 0 && t.damage[0] === 72, `barrier 0, 12d6 = ${t.damage}`);
  const t2 = new Actor('T2');
  await save('me-biotic-flare', 'criticalSuccess', t2, { origin: 'Item.flare' });
  assert(t2.damage[0] === 18, `critical success still takes half: ${t2.damage}`);
}

console.log('Dark Matter: critical failure against a biotic power frightens');
{
  const adept = new Actor('Adept', { flags: { critFailFrightened: 2 } });
  const t = new Actor('T'), u = new Actor('U');
  await save('me-biotic-warp', 'criticalFailure', t, { caster: adept, origin: 'Item.warp' });
  await save('me-tech-overload', 'criticalFailure', u, { caster: adept, origin: 'Item.ovl' });
  assert(t.conditions.includes('frightened:2'), 'biotic: Frightened 2');
  assert(!u.conditions.some((c) => c.startsWith('frightened')), 'tech: no Frightened');
  assert(t.created.some((d) => d.system.slug === 'persistent-damage' && d.system.persistent.formula === '1d4' && d.system.persistent.damageType === 'void'),
    'persistent void is a real persistent-damage condition');
}

console.log('Warp Field: damage on every degree');
{
  const t = new Actor('T');
  await save('me-adept-warp-field', 'criticalSuccess', t, { origin: 'Item.wf' });
  assert(t.damage[0] === 4 && t.conditions.length === 0, `1d4 even on a critical success: ${t.damage}`);
}

console.log('Unregistered outcome: Gravity Well success');
{
  const t = new Actor('T');
  const msg = await save('me-adept-gravity-well', 'success', t);
  assert(msg.includes('No effect') && t.conditions.length === 0, 'reports no effect');
}

console.log('On use: Charge refills by the best Vanguard feature; Nova records and empties the barrier');
{
  const useHook = hooks.on.createChatMessage[1];
  const use = async (slug, actor) => {
    uuids['Item.use'] = { slug, actor };
    await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.use' } } } });
  };
  const b1 = barrierItem(0, 20);
  const plain = new Actor('Plain', { items: [b1], flags: { chargeBarrier: 5 } });
  plain.items = [b1];
  await use('me-biotic-charge', plain);
  assert(b1.flags[MOD].barrierCurrent === 5, `Vanguard Mastery: +5 (got ${b1.flags[MOD].barrierCurrent})`);
  const b2 = barrierItem(0, 20);
  const unstop = new Actor('Unstoppable', { items: [b2], flags: { chargeBarrier: 5 } });
  unstop.items = [b2, { slug: 'me-vanguard-unstoppable-charge' }];
  await use('me-biotic-charge', unstop);
  assert(b2.flags[MOD].barrierCurrent === 5, `Unstoppable 25% of 20 = 5, ties mastery (got ${b2.flags[MOD].barrierCurrent})`);
  const b3 = barrierItem(3, 40);
  const apex = new Actor('Apex', { items: [b3], flags: { chargeBarrier: 5 } });
  apex.items = [b3, { slug: 'me-vanguard-apex-vanguard' }];
  await use('me-biotic-charge', apex);
  assert(b3.flags[MOD].barrierCurrent === 40, `Apex Vanguard: full (got ${b3.flags[MOD].barrierCurrent})`);
  const b4 = barrierItem(17, 20);
  const nova = new Actor('Nova', { items: [b4] });
  nova.items = [b4];
  await use('me-biotic-nova', nova);
  assert(nova.flags[MOD].novaCharge === 17 && b4.flags[MOD].barrierCurrent === 0, `records 17, barrier 0 (got ${nova.flags[MOD].novaCharge}, ${b4.flags[MOD].barrierCurrent})`);
}

console.log('Power Amplifier: item bonus to biotic and tech power damage only');
{
  const caster = new Actor('Engineer', { flags: { powerDamageBonus: 2 } });
  const human = new Actor('Human', { traits: ['humanoid'] }), other = new Actor('Other');
  await save('me-tech-overload', 'failure', human, { caster, origin: 'Item.ovl-amp' });
  await save('me-frag-grenade', 'failure', other, { caster, origin: 'Item.frag-amp' });
  assert(human.damage[0] === 18, `2d8 + 2 = ${human.damage}`);
  assert(other.damage[0] === 24, `grenade feat (no power trait) unchanged: ${other.damage}`);
}

console.log('Charge Upgrade and Superior Sentinel Mastery add to power damage');
{
  const vanguard = new Actor('Vanguard', { flags: { chargeUpgrade: 'damage' } });
  const sentinel = new Actor('Sentinel', { flags: { powerBonusDice: '1d4', powerDamageBonus: 1 } });
  const t1 = new Actor('T1'), t2 = new Actor('T2');
  await save('me-biotic-charge', 'failure', t1, { caster: vanguard, origin: 'Item.charge-up' });
  await save('me-biotic-warp', 'failure', t2, { caster: sentinel, origin: 'Item.warp-sent' });
  assert(t1.damage[0] === 30, `3d6 + 2d6 = ${t1.damage}`);
  assert(t2.damage[0] === 17, `2d6 + 1 + 1d4 = ${t2.damage}`);

  const useHook = hooks.on.createChatMessage[1];
  const b = barrierItem(1, 30);
  const v = new Actor('Barrier Vanguard', { items: [b], flags: { chargeUpgrade: 'barrier' } });
  v.items = [b];
  uuids['Item.use2'] = { slug: 'me-biotic-charge', actor: v };
  await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.use2' } } } });
  assert(b.flags[MOD].barrierCurrent === 30, `barrier option refills to full on use (got ${b.flags[MOD].barrierCurrent})`);
}

console.log('Derived data: action costs and Magazine Upgrade I, never compounding');
{
  class Character { prepareDerivedData() {} }
  ctx.CONFIG.PF2E = { Actor: { documentClasses: { character: Character } } };
  for (const f of hooks.once.init ?? []) f();
  const feat = {
    type: 'feat', _source: { system: { actions: { value: 2 } } },
    system: { actionType: { value: 'action' }, actions: { value: 2 }, traits: { value: ['biotic'] } },
  };
  const weapon = {
    type: 'weapon', _source: { system: { ammo: { capacity: 12 } } }, system: { ammo: { capacity: 12 } },
    subitems: { contents: [{ flags: { [MOD]: { ammoCapacityMultiplier: 1.5 } } }] },
  };
  const actor = {
    flags: { [MOD]: { powerEfficiency: { biotic: 1 } } }, rollOptions: { all: {} },
    itemTypes: { feat: [feat], weapon: [weapon], effect: [] },
  };
  Character.prototype.prepareDerivedData.call(actor);
  Character.prototype.prepareDerivedData.call(actor);
  assert(feat.system.actions.value === 1, `2-action biotic power costs 1 (got ${feat.system.actions.value})`);
  assert(weapon.system.ammo.capacity === 18, `capacity 12 -> 18 after two prepares (got ${weapon.system.ammo.capacity})`);
}

console.log('Every save button in the packs has a registry entry');
{
  const registered = new Set([...src.matchAll(/^  '([\w-]+)': \{\s*\n\s*name:/gm)].map((m) => m[1]));
  const packs = new URL('../src/packs/', import.meta.url);
  const used = new Map();
  for (const pack of readdirSync(packs)) {
    for (const file of readdirSync(new URL(`${pack}/`, packs)).filter((f) => f.endsWith('.json'))) {
      const text = readFileSync(new URL(`${pack}/${file}`, packs), 'utf8');
      for (const m of text.matchAll(/options:me-power:([\w-]+)/g)) used.set(m[1], `${pack}/${file}`);
    }
  }
  const missing = [...used].filter(([key]) => !registered.has(key));
  assert(missing.length === 0, `${used.size} keys used, ${registered.size} registered${missing.length ? `; missing: ${missing.map(([k, f]) => `${k} (${f})`).join(', ')}` : ''}`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exitCode = failures ? 1 : 0;
