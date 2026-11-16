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
    system: { id: 'pf2e' },
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

async function save(power, outcome, target, { caster = null, origin = 'Item.power', system = 'pf2e' } = {}) {
  if (caster) uuids[origin] = { actor: caster };
  posted.length = 0;
  await saveHook({
    speaker: { actor: target }, token: null,
    flags: { [system]: { origin: { uuid: origin }, context: { type: 'saving-throw', outcome, options: [`me-power:${power}`] } } },
  });
  return posted.at(-1)?.content ?? '';
}

console.log('SF2e: save cards keep their data in flags.sf2e');
{
  ctx.game.system.id = 'sf2e';
  const t = new Actor('T');
  await save('me-grenade-arc', 'failure', t, { origin: 'Item.sf2e-arc', system: 'sf2e' });
  ctx.game.system.id = 'pf2e';
  assert(t.damage.length === 1 && t.conditions.length === 0, `SF2e save applied: ${t.damage}`);
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

console.log('Nova: 2d6 + 1d6 per 5 barrier HP recorded on use');
{
  const vanguard = new Actor('Vanguard', { flags: { novaCharge: 14 } });
  const t1 = new Actor('T1'), t2 = new Actor('T2');
  await save('me-biotic-nova', 'failure', t1, { caster: vanguard, origin: 'Item.nova' });
  await save('me-biotic-nova', 'criticalFailure', t2, { caster: vanguard, origin: 'Item.nova' });
  assert(t1.damage[0] === 24 && t2.damage[0] === 48, `14 HP = 4d6: 24 / doubled 48: ${t1.damage} / ${t2.damage}`);
  // Nova Upgrade: +2d6, Stunned 1 on a failure, Stunned 3 on a critical failure
  const upgraded = new Actor('Upgraded', { flags: { novaCharge: 5 } });
  upgraded.items = [{ slug: 'me-upgrade-nova' }];
  const t3 = new Actor('T3'), t4 = new Actor('T4');
  await save('me-biotic-nova', 'failure', t3, { caster: upgraded, origin: 'Item.nova-up' });
  await save('me-biotic-nova', 'criticalFailure', t4, { caster: upgraded, origin: 'Item.nova-up2' });
  assert(t3.damage[0] === 30 && t3.conditions.includes('stunned:1'), `5 HP = 3d6 + 2d6 = 30, Stunned 1: ${t3.damage} ${t3.conditions}`);
  assert(t4.damage[0] === 60 && t4.conditions.includes('stunned:3') && t4.conditions.includes('prone'), `doubled 60, Stunned 3, prone: ${t4.damage} ${t4.conditions}`);
  assert(t2.conditions.includes('prone'), 'crit failure knocks prone');
  const empty = new Actor('Empty'); const t5 = new Actor('T5');
  const msg = await save('me-biotic-nova', 'failure', t5, { caster: empty, origin: 'Item.nova2' });
  assert(t5.damage.length === 0 && msg.includes('roll it by hand'), 'no recorded charge: no damage, says so');
}

console.log('Charge: a failed save adds nothing to the barrier (half came on use); a critical failure fills it');
{
  const barrier = barrierItem(2, 20);
  const vanguard = new Actor('Vanguard', { items: [barrier] });
  vanguard.level = 5;
  const t = new Actor('T');
  await save('me-biotic-charge', 'failure', t, { caster: vanguard, origin: 'Item.charge' });
  assert(barrier.flags[MOD].barrierCurrent === 2, `failure leaves the barrier at 2 (got ${barrier.flags[MOD].barrierCurrent})`);
  const t2 = new Actor('T2');
  await save('me-biotic-charge', 'criticalFailure', t2, { caster: vanguard, origin: 'Item.charge2' });
  assert(barrier.flags[MOD].barrierCurrent === 20, `critical failure fills it (got ${barrier.flags[MOD].barrierCurrent})`);
  assert(t.damage[0] === 24 && t.conditions.includes('prone'), `level 5: target takes 4d6 (24) and falls prone: ${t.damage}`);
  assert(t2.damage[0] === 48, `critical failure doubles it: ${t2.damage}`);
  // Basic save: half on a success; Unstoppable Charge knocks the target prone on a success too
  const t3 = new Actor('T3');
  await save('me-biotic-charge', 'success', t3, { caster: vanguard, origin: 'Item.charge3' });
  assert(t3.damage[0] === 12 && !t3.conditions.includes('prone'), `success: half (12), stays standing: ${t3.damage} ${t3.conditions}`);
  vanguard.items = [barrier, { slug: 'me-vanguard-unstoppable-charge' }];
  const t4 = new Actor('T4');
  await save('me-biotic-charge', 'success', t4, { caster: vanguard, origin: 'Item.charge4' });
  assert(t4.conditions.includes('prone'), `Unstoppable Charge: a success still knocks prone: ${t4.conditions}`);
  const t5 = new Actor('T5');
  await save('me-biotic-charge', 'criticalSuccess', t5, { caster: vanguard, origin: 'Item.charge5' });
  assert(t5.damage.length === 0 && t5.conditions.length === 0, 'critical success: unaffected');
  // The NPC Charge keeps its own dice (x1 at level 0-3)
  const npc = new Actor('Merc');
  npc.level = 2;
  const t6 = new Actor('T6');
  await save('me-npc-biotic-charge', 'failure', t6, { caster: npc, origin: 'Item.npc-charge' });
  assert(t6.damage[0] === 18 && t6.conditions.includes('prone'), `NPC Charge unchanged: 3d6 (18) on a failure: ${t6.damage}`);
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
  assert(b1.flags[MOD].barrierCurrent === 10, `half of 20 beats Mastery's 5 (got ${b1.flags[MOD].barrierCurrent})`);
  const b0 = barrierItem(0, 5);
  const low = new Actor('Level 1', { items: [b0], flags: { chargeBarrier: 5 } });
  low.items = [b0];
  await use('me-biotic-charge', low);
  assert(b0.flags[MOD].barrierCurrent === 5, `level 1: Mastery's 5 beats half of 5 (got ${b0.flags[MOD].barrierCurrent})`);
  const bh = barrierItem(1, 15);
  const bare = new Actor('No Mastery', { items: [bh] });
  bare.items = [bh];
  await use('me-biotic-charge', bare);
  assert(bh.flags[MOD].barrierCurrent === 9, `no Mastery: 1 + ceil(15 / 2) = 9 (got ${bh.flags[MOD].barrierCurrent})`);
  const b2 = barrierItem(0, 20);
  const unstop = new Actor('Unstoppable', { items: [b2], flags: { chargeBarrier: 5 } });
  unstop.items = [b2, { slug: 'me-vanguard-unstoppable-charge' }];
  await use('me-biotic-charge', unstop);
  assert(b2.flags[MOD].barrierCurrent === 10, `Unstoppable's 25% never beats the base half (got ${b2.flags[MOD].barrierCurrent})`);
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
  // A target's save names Nova as its origin too; it must not count as a second use
  await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.use' }, context: { type: 'saving-throw' } } } });
  assert(nova.flags[MOD].novaCharge === 17, `a save against Nova keeps the recorded 17 (got ${nova.flags[MOD].novaCharge})`);
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
  assert(t1.damage[0] === 24, `level 1 Charge 2d6 + Charge Upgrade 2d6 = ${t1.damage}`);
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

console.log('NPC biotics: dice scale with the caster\'s level');
{
  const elite = new Actor('Asari Commando', {}); elite.level = 8;      // x3
  const grunt = new Actor('Biotic Grunt', {}); grunt.level = 2;        // x1
  const t1 = new Actor('T1'), t2 = new Actor('T2');
  await save('me-npc-biotic-warp', 'failure', t1, { caster: elite, origin: 'Item.npc-warp-8' });
  await save('me-npc-biotic-warp', 'failure', t2, { caster: grunt, origin: 'Item.npc-warp-2' });
  assert(t1.damage[0] === 36 && t2.damage[0] === 12, `6d6 at level 8, 2d6 at level 2 (got ${t1.damage}, ${t2.damage})`);
  const pers = t1.created.find((d) => d.system.slug === 'persistent-damage');
  assert(pers?.system.persistent.formula === '3d4', `persistent 1d4 x3 = ${pers?.system.persistent.formula}`);

  const useHook = hooks.on.createChatMessage[1];
  const b = barrierItem(12, 20);
  const npc = new Actor('NPC Vanguard', { items: [b] }); npc.items = [b];
  uuids['Item.npc-nova'] = { slug: 'me-npc-biotic-nova', actor: npc };
  await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'action', uuid: 'Item.npc-nova' } } } });
  assert(npc.flags[MOD].novaCharge === 12 && b.flags[MOD].barrierCurrent === 0,
    `NPC Nova, posted as an action, records 12 and empties the barrier (got ${npc.flags[MOD].novaCharge}, ${b.flags[MOD].barrierCurrent})`);
}

console.log('NPC tech: dice scale too, synthetic bonus included');
{
  const engineer = new Actor('Eclipse Engineer', {}); engineer.level = 8;   // x3
  const geth = new Actor('Geth', { traits: ['geth', 'construct'] });
  await save('me-npc-tech-overload', 'failure', geth, { caster: engineer, origin: 'Item.npc-ovl' });
  assert(geth.damage[0] === 72, `3d8 synthetic x3 = 9d8 (got ${geth.damage})`);
}

console.log('Every save button in the packs has a registry entry');
{
  // the live registry, so the NPC entries me-powers.js generates count too
  const registered = new Set(Object.keys(ctx.MassEffectPowers.registry));
  const packs = new URL('../src/packs/', import.meta.url);
  const used = new Map();
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(new URL(`${entry.name}/`, dir), `${rel}/${entry.name}`);
      else if (entry.name.endsWith('.json')) {
        const text = readFileSync(new URL(entry.name, dir), 'utf8');
        for (const m of text.matchAll(/options:me-power:([\w-]+)/g)) used.set(m[1], `${rel}/${entry.name}`);
      }
    }
  };
  walk(packs, '');
  const missing = [...used].filter(([key]) => !registered.has(key));
  assert(missing.length === 0, `${used.size} keys used, ${registered.size} registered${missing.length ? `; missing: ${missing.map(([k, f]) => `${k} (${f})`).join(', ')}` : ''}`);
}

console.log('Biotic Charge: lands in the nearest open space beside the target; pushes straight back');
{
  const { chargeLanding, pushAway } = ctx.MassEffectPowers;
  // 100 px squares of 5 ft; PF2e-style diagonals don't matter here, so count the longer axis
  const grid = { size: 100, distance: 5, measurePath: ([a, b]) => ({ distance: 5 * Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) / 100 }) };
  const tokens = [];
  const scene = { grid, tokens };
  tokens.filter = Array.prototype.filter.bind(tokens);
  const tok = (x, y, w = 1) => {
    const d = { x, y, width: w, height: w, hidden: false, parent: scene,
      async update(c) { Object.assign(d, c); } };
    tokens.push(d);
    return d;
  };
  const vanguard = tok(0, 0), enemy = tok(1000, 0);           // 50 ft apart on one row
  let land = chargeLanding(vanguard, enemy);
  assert(land.x === 900 && land.y === 0 && land.distance === 45, `straight run to the near side: ${JSON.stringify(land)}`);
  tok(900, 0);                                                // an ally already stands there
  land = chargeLanding(vanguard, enemy);
  assert(land.x === 900 && land.y !== 0 && land.distance === 45, `takes the next-nearest open space: ${JSON.stringify(land)}`);
  const big = tok(2000, 2000, 2);                             // a Large target
  land = chargeLanding(vanguard, big);
  assert(land.x === 1900 && land.y === 1900, `corner of a Large target: ${JSON.stringify(land)}`);
  const adjacent = tok(1100, 0);
  assert(chargeLanding(adjacent, enemy).distance === 0, 'already adjacent: no move');

  const pushed = tok(1000, 1000), pusher = tok(900, 900);
  assert(await pushAway(pushed, pusher, 5) && pushed.x === 1100 && pushed.y === 1100, `diagonal push one space: ${pushed.x},${pushed.y}`);
  const p2 = tok(500, 3000), from2 = tok(500, 2900);
  await pushAway(p2, from2, 10);
  assert(p2.x === 500 && p2.y === 3200, `10 ft push is two spaces straight back: ${p2.x},${p2.y}`);
  // Mid-animation, Foundry v14 still reports the old x/y; the stored source has the new spot
  const charger = tok(500, 5100);
  charger._source = { x: 300, y: 5000 };                      // really standing just left of the victim
  const victim = tok(400, 5000);
  await pushAway(victim, charger, 5);
  assert(victim.x === 500 && victim.y === 5000, `push uses where the charger landed, not where it is animating: ${victim.x},${victim.y}`);
}

console.log('The module scripts load side by side');
{
  // Foundry runs module.json "scripts" as classic scripts sharing one global scope, so a top-level name
  // declared in two files throws a redeclaration SyntaxError and that whole file never runs. Load them the same
  // way; other errors only mean the mocks below are thinner than Foundry.
  const manifest = JSON.parse(readFileSync(new URL('../module.json', import.meta.url), 'utf8'));
  const shared = vm.createContext({ console: { log() {}, warn() {}, error() {}, debug() {} } });
  const clashes = [];
  for (const path of manifest.scripts) {
    try {
      vm.runInContext(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), shared, { filename: path });
    } catch (err) {
      if (err instanceof SyntaxError || err?.name === 'SyntaxError') clashes.push(`${path}: ${err.message}`);
    }
  }
  assert(clashes.length === 0, `${manifest.scripts.length} scripts${clashes.length ? `; ${clashes.join('; ')}` : ''}`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exitCode = failures ? 1 : 0;
