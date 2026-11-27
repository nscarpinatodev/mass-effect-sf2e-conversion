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
console.log('A target with no token on the scene: damage is applied once and the card says so');
{
  // the system's applyDamage changes HP first, then throws if it has no token to name
  const strict = (name) => {
    const a = new Actor(name);
    a.applyDamage = async ({ damage, token }) => { a.damage.push(damage.total); if (!token) throw new TypeError('Cannot read properties of null (reading \'name\')'); };
    return a;
  };
  const t = strict('No Token');
  t.getTokenDocument = async () => ({ name: 'No Token' });
  rollCount = 0;
  const msg = await save('me-tech-overload', 'failure', t, { origin: 'Item.tokenless' });
  assert(t.damage.length === 1 && t.damage[0] === 16 && rollCount === 1, `applied once, one roll (got ${t.damage}, ${rollCount} rolls)`);
  assert(msg.includes('16 ') && !msg.includes('apply manually') && !msg.includes('error'), 'the card reports the damage as applied');
  // if the system still throws after applying, the card repeats the same roll and says to check
  const broken = strict('Broken');
  rollCount = 0;
  const msg2 = await save('me-tech-overload', 'failure', broken, { origin: 'Item.tokenless2' });
  assert(broken.damage.length === 1 && rollCount === 1, `still one roll, not a second one (got ${rollCount})`);
  assert(msg2.includes('16 ') && msg2.includes('check the target') && !msg2.includes('apply manually'), 'the card names the same roll and says to check HP');
}

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
  const engineer = new Actor('Engineer'); engineer.level = 16;         // x5: 5d6 fire + 5d6 electricity
  const t = new Actor('T');
  await save('me-engineer-omni-grenade', 'success', t, { caster: engineer, origin: 'Item.omni' });
  assert(t.damage[0] === 30, `half of 30 fire + 30 electricity = ${t.damage[0]}`);
}

console.log('Overload: extra damage only against synthetics');
{
  const human = new Actor('Human', { traits: ['humanoid'] }), geth = new Actor('Geth', { traits: ['geth', 'construct'] });
  await save('me-tech-overload', 'failure', human);
  await save('me-tech-overload', 'failure', geth);
  assert(human.damage[0] === 16 && geth.damage[0] === 24, `2d8 vs 3d8: ${human.damage} / ${geth.damage}`);
}

console.log('Nova: 2d6 + 1d6 per 10 barrier HP recorded on use');
{
  const vanguard = new Actor('Vanguard', { flags: { novaCharge: 14 } });
  const t1 = new Actor('T1'), t2 = new Actor('T2');
  await save('me-biotic-nova', 'failure', t1, { caster: vanguard, origin: 'Item.nova' });
  await save('me-biotic-nova', 'criticalFailure', t2, { caster: vanguard, origin: 'Item.nova' });
  assert(t1.damage[0] === 18 && t2.damage[0] === 36, `14 HP = 3d6: 18 / doubled 36: ${t1.damage} / ${t2.damage}`);
  // Nova Upgrade: +2d6, Stunned 1 on a failure, Stunned 3 on a critical failure
  const upgraded = new Actor('Upgraded', { flags: { novaCharge: 5 } });
  upgraded.items = [{ slug: 'me-upgrade-nova' }];
  const t3 = new Actor('T3'), t4 = new Actor('T4');
  await save('me-biotic-nova', 'failure', t3, { caster: upgraded, origin: 'Item.nova-up' });
  await save('me-biotic-nova', 'criticalFailure', t4, { caster: upgraded, origin: 'Item.nova-up2' });
  assert(t3.damage[0] === 24 && t3.conditions.includes('stunned:1'), `5 HP = 2d6 + 2d6 = 24, Stunned 1: ${t3.damage} ${t3.conditions}`);
  assert(t4.damage[0] === 48 && t4.conditions.includes('stunned:3') && t4.conditions.includes('prone'), `doubled 48, Stunned 3, prone: ${t4.damage} ${t4.conditions}`);
  assert(t2.conditions.includes('prone'), 'crit failure knocks prone');
  // one detonation shares one roll; the next detonation, even seconds later, rolls anew
  const again = new Actor('Again', { flags: { novaCharge: 10, novaAt: 1 } });
  rollCount = 0;
  await save('me-biotic-nova', 'failure', new Actor('A1'), { caster: again, origin: 'Item.nova-again' });
  await save('me-biotic-nova', 'failure', new Actor('A2'), { caster: again, origin: 'Item.nova-again' });
  assert(rollCount === 1, `one detonation, one roll (got ${rollCount})`);
  again.flags[MOD].novaAt = 2;
  await save('me-biotic-nova', 'failure', new Actor('A3'), { caster: again, origin: 'Item.nova-again' });
  assert(rollCount === 2, `the next detonation rolls its own damage (got ${rollCount})`);
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
  assert(barrier.flags[MOD].barrierCurrent === 0 && t.damage[0] === 36, `barrier 0, 3d6 doubled = ${t.damage}`);
  const t2 = new Actor('T2');
  await save('me-biotic-flare', 'criticalSuccess', t2, { origin: 'Item.flare' });
  assert(t2.damage[0] === 9, `critical success still takes half: ${t2.damage}`);
}

console.log('Warp: its damage tells the shield system to count double against a barrier and 1.5x against armor');
{
  const settings = ctx.game.settings.get;
  ctx.game.settings.get = (_, key) => ({ warpPowerBarrierMult: 2, warpPowerArmorMult: 1.5, incineratePowerArmorMult: 1.5 }[key] ?? true);
  // what the shield system would read while each point of damage is being applied
  const watched = (name, items = []) => {
    const a = new Actor(name, { items });
    a.seen = [];
    a.applyDamage = async ({ damage }) => { a.damage.push(damage.total); a.seen.push(JSON.stringify(ctx.MassEffectPowers.damageSource())); };
    return a;
  };
  const barrier = barrierItem(30, 30);
  const frame = { type: 'effect', flags: { [MOD]: { armorMax: 20, armorCurrent: 20 } } };
  const t = watched('T', [barrier, frame]);
  const card = await save('me-biotic-warp', 'failure', t, { origin: 'Item.warp' });
  assert(t.damage[0] === 12 && t.seen[0] === '{"layers":{"barrier":2,"armor":1.5}}', `2d6 applied with both multipliers (got ${t.damage}, ${t.seen})`);
  assert(ctx.MassEffectPowers.damageSource() === null, 'nothing is left set once the damage is applied');
  assert(card.includes('double against its Biotic Barrier') && card.includes('1.5× against its Armor Frame'), 'the card names both layers');
  assert(barrier.flags[MOD].barrierCurrent === 30 && t.damage.length === 1, 'a failure does not detonate the barrier');

  const plain = watched('Plain');
  const plainCard = await save('me-biotic-warp', 'success', plain, { origin: 'Item.warp' });
  assert(plain.damage[0] === 6 && !plainCard.includes('against its'), 'no barrier or armor: nothing extra on the card');

  const o = watched('O', [barrierItem(30, 30)]);
  await save('me-tech-overload', 'failure', o, { origin: 'Item.overload' });
  assert(o.seen[0] === '{"layers":{}}', `another power is still marked as a power, with no multipliers (got ${o.seen})`);

  // Incinerate burns armor: 1.5x against a frame, nothing against a barrier
  const inc = watched('Inc', [barrierItem(30, 30), { type: 'effect', flags: { [MOD]: { armorMax: 20, armorCurrent: 20 } } }]);
  const incCard = await save('me-tech-incinerate', 'failure', inc, { origin: 'Item.incinerate' });
  assert(inc.damage[0] === 12 && inc.seen[0] === '{"layers":{"armor":1.5}}', `Incinerate: 2d6 with the armor multiplier only (got ${inc.damage}, ${inc.seen})`);
  assert(incCard.includes('1.5× against its Armor Frame') && !incCard.includes('Biotic Barrier'), 'its card names the Armor Frame and not the barrier');

  // a critical failure detonates an active barrier: it empties, and the burst is rolled once
  const b2 = barrierItem(9, 30);
  const c = watched('C', [b2]);
  const critCard = await save('me-biotic-warp', 'criticalFailure', c, { origin: 'Item.warp' });
  assert(c.damage.join() === '24,12' && b2.flags[MOD].barrierCurrent === 0, `4d6, then a 2d6 burst, barrier 0 (got ${c.damage}, barrier ${b2.flags[MOD].barrierCurrent})`);
  assert(critCard.includes('Biotic Barrier detonates'), 'the card reports the detonation');

  const adept = new Actor('Adept', { type: 'character' });
  adept.level = 8;
  const b3 = barrierItem(5, 30);
  const high = watched('High', [b3]);
  await save('me-biotic-warp', 'criticalFailure', high, { caster: adept, origin: 'Item.warp8' });
  assert(high.damage.join() === '72,36', `at 8th level the burst is 6d6 beside 12d6 (got ${high.damage})`);

  const spent = watched('Spent', [barrierItem(0, 30)]);
  await save('me-biotic-warp', 'criticalFailure', spent, { origin: 'Item.warp' });
  assert(spent.damage.join() === '24', `an empty barrier does not detonate (got ${spent.damage})`);
  ctx.game.settings.get = settings;
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
  // without Apex Vanguard, a second Nova has only the empty barrier to detonate
  await use('me-biotic-nova', nova);
  assert(nova.flags[MOD].novaCharge === 0, `no Apex: the second Nova detonates 0 (got ${nova.flags[MOD].novaCharge})`);
}

console.log('Apex Vanguard: a second Nova each turn detonates as if the barrier were full');
{
  const useHook = hooks.on.createChatMessage[1];
  const use = async (slug, actor) => {
    uuids['Item.use'] = { slug, actor };
    await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.use' } } } });
  };
  const b = barrierItem(12, 60);
  const apex = new Actor('Apex', { items: [b] });
  apex.items = [b, { slug: 'me-vanguard-apex-vanguard' }];
  await use('me-biotic-nova', apex);
  assert(apex.flags[MOD].novaCharge === 12 && b.flags[MOD].barrierCurrent === 0, `first Nova spends the 12 HP it has (got ${apex.flags[MOD].novaCharge}, barrier ${b.flags[MOD].barrierCurrent})`);
  const first = apex.flags[MOD].novaAt;
  await new Promise((r) => setTimeout(r, 2));
  await use('me-biotic-nova', apex);
  assert(apex.flags[MOD].novaCharge === 60, `second Nova detonates the full 60 though the barrier is empty (got ${apex.flags[MOD].novaCharge})`);
  assert(b.flags[MOD].barrierCurrent === 0, `and spends nothing (barrier ${b.flags[MOD].barrierCurrent})`);
  assert(apex.flags[MOD].novaAt !== first, 'the second Nova is its own detonation (rolls its own damage)');
  b.flags[MOD].barrierCurrent = 30;
  await use('me-biotic-nova', apex);
  assert(apex.flags[MOD].novaCharge === 30 && b.flags[MOD].barrierCurrent === 0, `a third Nova is a first again: spends the barrier's 30 (got ${apex.flags[MOD].novaCharge}, barrier ${b.flags[MOD].barrierCurrent})`);
  const b2 = barrierItem(30, 60);
  const kept = new Actor('Apex, barrier up', { items: [b2] });
  kept.items = [b2, { slug: 'me-vanguard-apex-vanguard' }];
  await use('me-biotic-nova', kept);
  b2.flags[MOD].barrierCurrent = 25;                        // refilled between the two
  await use('me-biotic-nova', kept);
  assert(kept.flags[MOD].novaCharge === 60 && b2.flags[MOD].barrierCurrent === 25, `the second Nova leaves a refilled barrier alone (got ${kept.flags[MOD].novaCharge}, barrier ${b2.flags[MOD].barrierCurrent})`);
}

console.log('Vanguard Strike: Charge gives Weapon Synergy (3d6 force, 4d6 from 18th) until the end of the next turn');
{
  const useHook = hooks.on.createChatMessage[1];
  const use = async (slug, actor) => {
    uuids['Item.use'] = { slug, actor };
    await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.use' } } } });
  };
  const synergy = (a) => a.created.filter((d) => d.system?.slug === 'me-effect-weapon-synergy');
  const vanguard = (name, level, feat = true) => {
    const b = barrierItem(0, 40);
    const a = new Actor(name, { items: [b] });
    a.level = level;
    a.items = feat ? [b, { slug: 'me-vanguard-vanguard-strike' }] : [b];
    a.deleteEmbeddedDocuments = async () => {};
    return a;
  };
  const vg = vanguard('Vanguard 14', 14);
  await use('me-biotic-charge', vg);
  const [eff] = synergy(vg);
  assert(eff && eff.system.duration.value === 1 && eff.system.duration.expiry === 'turn-end', 'Charge gives Weapon Synergy until the end of the next turn');
  assert(eff?.system.description.value.includes('3d6 force'), 'at 14th: 3d6 force');
  const vg18 = vanguard('Vanguard 18', 18);
  await use('me-biotic-charge', vg18);
  assert(synergy(vg18)[0]?.system.description.value.includes('4d6 force'), 'at 18th: 4d6 force');
  const plain = vanguard('No Vanguard Strike', 14, false);
  await use('me-biotic-charge', plain);
  assert(synergy(plain).length === 0, 'no Weapon Synergy without the feat');
  const strikeFeat = JSON.parse(readFileSync(new URL('../src/packs/me-class-progressions/vanguard-vanguard-strike.json', import.meta.url), 'utf8'));
  const rule = strikeFeat.system.rules.find((r) => r.key === 'DamageDice');
  assert(strikeFeat.system.actionType.value === 'passive' && rule?.selector === 'strike-damage' && rule.damageType === 'force', 'the feat is passive, with a force DamageDice on Strikes');
}

console.log('Power Amplifier: item bonus to biotic and tech power damage only');
{
  const caster = new Actor('Engineer', { flags: { powerDamageBonus: 2 } });
  const human = new Actor('Human', { traits: ['humanoid'] }), other = new Actor('Other');
  await save('me-tech-overload', 'failure', human, { caster, origin: 'Item.ovl-amp' });
  await save('me-frag-grenade', 'failure', other, { caster, origin: 'Item.frag-amp' });
  assert(human.damage[0] === 18, `2d8 + 2 = ${human.damage}`);
  assert(other.damage[0] === 12, `grenade feat (no power trait) unchanged: ${other.damage}`);
}

console.log('Biotic Mastery and Tech Mastery feats: flat bonus to powers of their own trait');
{
  const caster = new Actor('Sentinel', { flags: { masteryDamage: { biotic: 4, tech: 6 } } });
  const bioticOnly = new Actor('Vanguard', { flags: { masteryDamage: { biotic: 6 }, powerDamageBonus: 1 } });
  const a = new Actor('A', { traits: ['humanoid'] }), b = new Actor('B'), c = new Actor('C'), d = new Actor('D', { traits: ['humanoid'] }), e = new Actor('E');
  await save('me-tech-overload', 'failure', a, { caster, origin: 'Item.ovl-mastery' });
  await save('me-biotic-warp', 'failure', b, { caster, origin: 'Item.warp-mastery' });
  await save('me-frag-grenade', 'failure', c, { caster, origin: 'Item.frag-mastery' });
  await save('me-tech-overload', 'failure', d, { caster: bioticOnly, origin: 'Item.ovl-biotic-only' });
  await save('me-biotic-warp', 'failure', e, { caster: bioticOnly, origin: 'Item.warp-biotic-only' });
  assert(a.damage[0] === 22, `tech power 2d8 + 6 = ${a.damage}`);
  assert(b.damage[0] === 16, `biotic power 2d6 + 4 = ${b.damage}`);
  assert(c.damage[0] === 12, `grenade feat (no power trait) unchanged: ${c.damage}`);
  assert(d.damage[0] === 17, `Biotic Mastery adds nothing to a tech power; item bonus still does: 2d8 + 1 = ${d.damage}`);
  assert(e.damage[0] === 19, `stacks with an item bonus: 2d6 + 1 + 6 = ${e.damage}`);
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
  // Vanguard Rush already combines Charge and Nova into one card: no mastery cut on it
  const combo = (slug) => ({
    type: 'feat', slug, _source: { system: { actions: { value: 2 } } },
    system: { actionType: { value: 'action' }, actions: { value: 2 }, traits: { value: ['biotic'] } },
  });
  const rush = combo('me-vanguard-rush');
  actor.itemTypes.feat.push(rush);
  Character.prototype.prepareDerivedData.call(actor);
  Character.prototype.prepareDerivedData.call(actor);
  assert(feat.system.actions.value === 1, `2-action biotic power costs 1 (got ${feat.system.actions.value})`);
  assert(rush.system.actions.value === 2, `Rush isn't cut again (got ${rush.system.actions.value})`);
  assert(weapon.system.ammo.capacity === 18, `capacity 12 -> 18 after two prepares (got ${weapon.system.ammo.capacity})`);
}

console.log('Player powers: dice multiply by 1 + a quarter of the caster\'s level, as NPC powers do');
{
  const at = (level, opts = {}) => { const a = new Actor(`Caster ${level}`, opts); a.level = level; return a; };
  const hit = async (key, outcome, caster, origin, targetOpts = {}) => {
    const t = new Actor(`Target ${origin}`, targetOpts);
    const msg = await save(key, outcome, t, { caster, origin: `Item.scale-${origin}` });
    return { t, msg };
  };
  const low = await hit('me-biotic-warp', 'failure', at(3), 'warp3');
  const mid = await hit('me-biotic-warp', 'failure', at(8), 'warp8');
  const top = await hit('me-biotic-warp', 'failure', at(20), 'warp20');
  assert(low.t.damage[0] === 12 && mid.t.damage[0] === 36 && top.t.damage[0] === 72, `Warp 2d6 / 6d6 / 12d6 at 3rd, 8th, 20th (got ${low.t.damage}, ${mid.t.damage}, ${top.t.damage})`);
  const pers = mid.t.created.find((d) => d.system.slug === 'persistent-damage');
  assert(pers?.system.persistent.formula === '3d4', `persistent 1d4 x3 = ${pers?.system.persistent.formula}`);

  const geth = await hit('me-tech-overload', 'failure', at(20), 'ovl20', { traits: ['geth', 'construct'] });
  assert(geth.t.damage[0] === 144, `Overload against a synthetic at 20th: 18d8 = ${geth.t.damage}`);

  const adept = at(4, { hp: 30 });
  const reave = await hit('me-biotic-reave', 'failure', adept, 'reave4');
  assert(reave.t.damage[0] === 32 && adept.system.attributes.hp.value === 46, `Reave at 4th: 4d8 = ${reave.t.damage}, heals 2d8 (HP ${adept.system.attributes.hp.value})`);

  const engineer = at(8);
  const drain = await hit('me-tech-energy-drain', 'failure', engineer, 'drain8');
  assert(drain.t.damage[0] === 48 && engineer.system.attributes.hp.temp === 10, `Energy Drain at 8th: 6d8 = ${drain.t.damage}; the shield amounts stay flat (${engineer.system.attributes.hp.temp})`);

  const thrown = await hit('me-biotic-throw', 'failure', at(8), 'throw8');
  assert(thrown.t.damage[0] === 48 && thrown.msg.includes('3d6 more bludgeoning'), `Throw at 8th: 6d8 = ${thrown.t.damage}; the wall damage in its note is 3d6`);

  const frag = await hit('me-frag-grenade', 'failure', at(12), 'frag12');
  const override = await hit('me-engineer-system-override', 'failure', at(12), 'override12');
  assert(frag.t.damage[0] === 48 && override.t.damage[0] === 48, `Frag Grenade and System Override at 12th: 8d6 = ${frag.t.damage}, ${override.t.damage}`);

  const flat = await hit('me-biotic-warp', 'failure', at(8, { flags: { masteryDamage: { biotic: 4 } } }), 'warp8-mastery');
  assert(flat.t.damage[0] === 40, `flat bonuses are added once, not multiplied: 6d6 + 4 = ${flat.t.damage}`);

  const item = await hit('me-grenade-arc', 'failure', at(12), 'arc12');
  assert(item.t.damage[0] === 16, `a grenade item keeps its printed 2d8 at any level: ${item.t.damage}`);

  const charge = await hit('me-biotic-charge', 'failure', at(8), 'charge8');
  assert(charge.t.damage[0] === 30, `Biotic Charge keeps its own formula: 5d6 at 8th = ${charge.t.damage}`);

  const incinerate = await hit('me-tech-incinerate', 'failure', at(1, { flags: { masteryDamage: { tech: 2 } } }), 'incinerate-tech');
  assert(incinerate.t.damage[0] === 14, `Incinerate counts as a tech power: 2d6 + 2 = ${incinerate.t.damage}`);
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
  // Forced movement stops short of another creature's space
  const shover = tok(0, 7000), shoved = tok(100, 7000);
  tok(300, 7000);                                             // a creature two spaces behind
  const went = await pushAway(shoved, shover, 10);
  assert(went === 5 && shoved.x === 200, `10 ft push stops after 5 ft at a creature: moved ${went}, now at ${shoved.x}`);
  const wedged = tok(1000, 7000), wall = tok(1100, 7000), pushing = tok(900, 7000);
  assert(await pushAway(wedged, pushing, 5) === 0 && wedged.x === 1000, `blocked at once: not pushed (${wedged.x})`);
  void wall;
}

console.log('Bio-amps: cooldowns are 4 rounds less the amp\'s Recharge; amp damage is biotic only');
{
  const { cooldownRounds } = ctx.MassEffectPowers;
  const biotic = (recharge, extra = {}) => {
    const a = new Actor('Biotic', { flags: recharge == null ? {} : { bioticRecharge: recharge }, ...extra });
    a.system.abilities = { cha: { mod: 5 } };              // Charisma no longer matters
    return a;
  };
  assert(cooldownRounds(biotic(null), 'nova') === 4, `no amp: 4 rounds, whatever the Charisma (got ${cooldownRounds(biotic(null), 'nova')})`);
  assert(cooldownRounds(biotic(1), 'nova') === 3 && cooldownRounds(biotic(2), 'nova') === 2 && cooldownRounds(biotic(3), 'nova') === 1,
    'Recharge 1/2/3: 3/2/1 rounds');
  assert(cooldownRounds(biotic(9), 'nova') === 1, 'never below 1 round');
  assert(cooldownRounds(biotic(3), 'charge') === 2, 'Biotic Charge keeps its own 2 rounds');

  const amped = new Actor('Amped', { flags: { novaCharge: 14, ampDamageBonus: 3, powerDamageBonus: 1 } });
  const n1 = new Actor('N1');
  await save('me-biotic-nova', 'failure', n1, { caster: amped, origin: 'Item.nova-amp' });
  assert(n1.damage[0] === 21, `Nova 3d6 (18) + 3 from the amp, not + the Power Amplifier's 1 too (got ${n1.damage[0]})`);
  const human = new Actor('Human', { traits: ['humanoid'] });
  await save('me-tech-overload', 'failure', human, { caster: amped, origin: 'Item.overload-amp' });
  assert(human.damage[0] === 17, `a tech power takes the Power Amplifier's +1 but not the amp's +3 (got ${human.damage[0]})`);
}

console.log('Vanguard Rush: when Nova follows; Nova\'s emanation and pushes');
{
  const { novaFollows, feetBetween } = ctx.MassEffectPowers;
  assert(novaFollows('rush', 'failure') && novaFollows('rush', 'criticalFailure'), 'Rush: Nova on a failed save');
  assert(novaFollows('rush', 'success') && novaFollows('rush', 'criticalSuccess'), 'Rush: Nova whatever the target rolls');
  assert(!novaFollows('strike', 'failure') && !novaFollows('free', 'criticalFailure'), 'Vanguard Strike is no longer a combo; Chain Charge sets off no Nova');
  assert(!novaFollows(null, 'failure') && !novaFollows(undefined, 'criticalFailure'), 'a plain Charge sets off nothing');

  const grid = { size: 100, distance: 5, measurePath: ([a, b]) => ({ distance: 5 * Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) / 100 }) };
  const scene = { grid };
  const at = (x, y, w = 1) => ({ x, y, width: w, height: w, parent: scene });
  const me = at(1000, 1000);
  assert(feetBetween(me, at(1100, 1000)) === 5, 'adjacent: 5 feet');
  assert(feetBetween(me, at(1100, 1100)) === 5, 'diagonally adjacent: 5 feet');
  assert(feetBetween(me, at(1200, 1000)) === 10 && feetBetween(me, at(1300, 1000)) === 15, 'two and three spaces: 10 and 15 feet');
  assert(feetBetween(me, at(1100, 1000, 2)) === 5, 'a Large creature beside it: 5 feet');
  const stale = at(0, 0);
  stale._source = { x: 1100, y: 1000 };
  assert(feetBetween(me, stale) === 5, 'measured from where a token landed, not where it is animating');

  const caster = new Actor('Vanguard', { flags: { novaCharge: 10 } });
  const t1 = new Actor('T1'), t2 = new Actor('T2');
  const m1 = await save('me-biotic-nova', 'failure', t1, { caster, origin: 'Item.nova-push1' });
  const m2 = await save('me-biotic-nova', 'criticalFailure', t2, { caster, origin: 'Item.nova-push2' });
  assert(m1.includes('Pushed 5 feet') && m2.includes('Pushed 10 feet'), 'Nova pushes 5 feet on a failure, 10 on a critical failure');
}

console.log('Heavy Impact and Nova Cascade');
{
  const heavy = new Actor('Heavy', {});
  heavy.level = 5;
  heavy.items = [{ slug: 'me-vanguard-heavy-impact' }];
  const t1 = new Actor('T1');
  const msg = await save('me-biotic-charge', 'failure', t1, { caster: heavy, origin: 'Item.heavy' });
  assert(t1.damage[0] === 32, `level 5 Charge in d8s: 4d8 = 32 (got ${t1.damage[0]})`);
  assert(t1.conditions.includes('prone') && t1.conditions.includes('off-guard') && msg.includes('Heavy Impact'), `a failed save also leaves it off-guard: ${t1.conditions}`);
  const t2 = new Actor('T2');
  await save('me-biotic-charge', 'success', t2, { caster: heavy, origin: 'Item.heavy2' });
  assert(!t2.conditions.includes('off-guard'), 'a success is not off-guard');

  const b = barrierItem(0, 40);
  const cascader = new Actor('Cascade', { items: [b], flags: { novaCharge: 10, novaAt: 111 } });
  cascader.items = [b, { slug: 'me-vanguard-nova-cascade' }];
  const c1 = new Actor('C1'), c2 = new Actor('C2'), c3 = new Actor('C3');
  await save('me-biotic-nova', 'criticalFailure', c1, { caster: cascader, origin: 'Item.casc' });
  assert(b.flags[MOD].barrierCurrent === 20, `a critical failure refills half: 0 -> 20 (got ${b.flags[MOD].barrierCurrent})`);
  await save('me-biotic-nova', 'criticalFailure', c2, { caster: cascader, origin: 'Item.casc' });
  assert(b.flags[MOD].barrierCurrent === 20, `a second critical failure from the same Nova adds nothing (got ${b.flags[MOD].barrierCurrent})`);
  await save('me-biotic-nova', 'failure', c3, { caster: cascader, origin: 'Item.casc' });
  assert(b.flags[MOD].barrierCurrent === 20, 'a plain failure adds nothing');
  cascader.flags[MOD].novaAt = 222;                           // the next detonation
  await save('me-biotic-nova', 'criticalFailure', new Actor('C4'), { caster: cascader, origin: 'Item.casc2' });
  assert(b.flags[MOD].barrierCurrent === 40, `the next Nova can cascade again (got ${b.flags[MOD].barrierCurrent})`);
}

console.log('Biotic Explosion: priming');
const PRIMED = 'me-effect-biotic-primed';
// a Primed effect the mock actor can find and the engine can delete
const prime = (actor) => {
  const effect = { type: 'effect', slug: PRIMED, deleted: false };
  effect.delete = async () => { effect.deleted = true; actor.itemTypes.effect = actor.itemTypes.effect.filter((e) => e !== effect); };
  actor.itemTypes.effect.push(effect);
  return effect;
};
const adeptAt = (level, { items = [], flags = {} } = {}) => {
  const a = new Actor('Adept', { type: 'character', flags, items: [{ type: 'feat', slug: 'me-adept-biotic-explosion' }, ...items] });
  a.level = level; a.system.attributes.classDC = { value: 30 };
  return a;
};
const primedMade = (actor) => actor.created.filter((d) => d.system?.slug === PRIMED).length;
{
  const sentinel = new Actor('Sentinel', { type: 'character' });
  const a = new Actor('A'), b = new Actor('B'), c = new Actor('C'), d = new Actor('D');
  const msg = await save('me-biotic-warp', 'failure', a, { caster: sentinel, origin: 'Item.prime-warp' });
  await save('me-biotic-warp', 'success', b, { caster: sentinel, origin: 'Item.prime-warp2' });
  await save('me-biotic-throw', 'failure', c, { caster: sentinel, origin: 'Item.prime-throw' });
  await save('me-npc-biotic-singularity', 'criticalFailure', d, { caster: new Actor('Asari Commando'), origin: 'Item.prime-npc' });
  assert(primedMade(a) === 1 && msg.includes('Primed for a Biotic Explosion until the end of Sentinel'), 'a failed save against Warp primes, whoever uses it');
  assert(a.created.find((x) => x.system?.slug === PRIMED).system.duration.expiry === 'turn-end', 'the priming lasts to the end of the caster\'s next turn');
  assert(primedMade(b) === 0, 'a successful save does not prime');
  assert(primedMade(c) === 0, 'Throw is not a primer');
  assert(primedMade(d) === 1, 'an NPC\'s Singularity primes too');
}

console.log('Biotic Explosion: an Adept\'s detonator sets off a Primed creature');
{
  const { explosionDice } = ctx.MassEffectPowers;
  assert([1, 3, 4, 8, 12, 16, 20].map((level) => explosionDice({ level })).join() === '2,2,3,4,5,6,7', '2d6, +1d6 at 4th and every 4 levels (7d6 at 20th)');

  const adept = adeptAt(8, { flags: { masteryDamage: { biotic: 6 }, ampDamageBonus: 3 } });
  const t = new Actor('T'); const effect = prime(t);
  const msg = await save('me-biotic-throw', 'failure', t, { caster: adept, origin: 'Item.det-throw' });
  assert(t.damage.join() === '57,24', `Throw 6d8 + 3 + 6 = 57, then the explosion 4d6 = 24 with no bonuses (got ${t.damage})`);
  assert(effect.deleted && msg.includes('Biotic Explosion: 24 more force damage'), 'the priming is spent and the card says so');
  assert(posted.some((m) => m.content.includes('Biotic Explosion') && m.content.includes('T detonates: 24 force damage (4d6, no save)')), 'the Adept gets a Biotic Explosion card');

  const vanguard = new Actor('Vanguard', { type: 'character' }); vanguard.level = 8;
  const t2 = new Actor('T2'); const kept = prime(t2);
  await save('me-biotic-throw', 'failure', t2, { caster: vanguard, origin: 'Item.det-none' });
  assert(t2.damage.join() === '48' && !kept.deleted, `without the Adept's feature nothing detonates (got ${t2.damage})`);

  const t3 = new Actor('T3'); const kept3 = prime(t3);
  await save('me-biotic-throw', 'success', t3, { caster: adeptAt(8), origin: 'Item.det-miss' });
  assert(t3.damage.length === 0 && !kept3.deleted, 'a detonator that deals no damage sets nothing off');

  const t4 = new Actor('T4'); const spent = prime(t4);
  await save('me-biotic-warp', 'failure', t4, { caster: adeptAt(8), origin: 'Item.det-warp' });
  assert(t4.damage.join() === '36,24' && spent.deleted && primedMade(t4) === 0, `Warp on a Primed creature detonates and does not prime again (got ${t4.damage})`);

  const t5 = new Actor('T5');
  await save('me-biotic-warp', 'failure', t5, { caster: adeptAt(8), origin: 'Item.det-warp2' });
  assert(t5.damage.join() === '36' && primedMade(t5) === 1, 'Warp on an unprimed creature primes it instead');
}

console.log('Biotic Explosion: the burst, Biotic Cascade, and once per power use');
{
  const grid = { size: 100, distance: 5, measurePath: ([a, b]) => ({ distance: 5 * Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) / 100 }) };
  const field = () => {
    const scene = { grid, tokens: [] };
    const rolls = [];
    const place = (name, x, disposition = -1, primed = false) => {
      const actor = new Actor(name);
      const token = { name, x, y: 0, width: 1, height: 1, parent: scene, actor, hidden: false, disposition };
      actor.getActiveTokens = () => [token];
      actor.saves = { reflex: { roll: async (args) => { rolls.push({ name, args }); } } };
      scene.tokens.push(token);
      return { actor, token, effect: primed ? prime(actor) : null };
    };
    return { place, rolls };
  };
  // a save a burst creature rolls, with the roll options the engine gave it
  const burstSave = async (target, outcome, options, caster) => {
    uuids['Item.burst'] = { actor: caster };
    posted.length = 0;
    await saveHook({ speaker: { actor: target }, token: null, flags: { pf2e: { origin: { uuid: 'Item.burst' }, context: { type: 'saving-throw', outcome, options } } } });
  };

  const f = field();
  const primary = f.place('Primary', 0, -1, true), near = f.place('Near', 100), edge = f.place('Edge', 200), far = f.place('Far', 300), friend = f.place('Friend', 100, 1);
  const adept = adeptAt(12, { items: [{ type: 'feat', slug: 'me-adept-mastery-improved' }] });
  await save('me-biotic-slam', 'failure', primary.actor, { caster: adept, origin: 'Item.burst-slam' });
  assert(primary.actor.damage.join() === '72,30', `Slam 12d6 = 72, explosion 5d6 = 30 at 12th (got ${primary.actor.damage})`);
  assert(f.rolls.map((r) => r.name).join() === 'Near,Edge', `enemies within 10 feet roll; the far one and the ally do not (got ${f.rolls.map((r) => r.name)})`);
  const opts = f.rolls[0].args.extraRollOptions;
  assert(f.rolls[0].args.dc.value === 30 && opts.includes('me-power:me-biotic-explosion') && opts.some((o) => o.startsWith('me-explosion:30:')), 'a Reflex save against the class DC that carries the explosion\'s roll');
  assert(!posted.some((m) => m.content.includes('free action')), 'no free power is offered after a Biotic Explosion (removed in the 2026-11 rebalance)');
  await burstSave(near.actor, 'success', opts, adept);
  await burstSave(edge.actor, 'criticalFailure', opts, adept);
  await burstSave(far.actor, 'failure', opts, adept);
  assert(near.actor.damage.join() === '15' && edge.actor.damage.join() === '60' && far.actor.damage.join() === '30', `basic save on the same 30: half, double, full (got ${near.actor.damage}, ${edge.actor.damage}, ${far.actor.damage})`);
  assert(!near.actor.created.some((d) => d.system?.slug === PRIMED), 'the burst does not prime');
  // Improved Adept Mastery: a failed burst save knocks the creature prone
  assert(!near.actor.conditions.includes('prone') && edge.actor.conditions.includes('prone') && far.actor.conditions.includes('prone'),
    `Improved Adept Mastery: a failure or critical failure against the burst knocks prone, a success does not (got ${near.actor.conditions}; ${edge.actor.conditions}; ${far.actor.conditions})`);
  {
    // Throw knocks no one down itself, so this shows the detonated creature is left standing
    const w = field();
    const p = w.place('Primary', 0, -1, true); w.place('Near', 100);
    await save('me-biotic-throw', 'failure', p.actor, { caster: adeptAt(12, { items: [{ type: 'feat', slug: 'me-adept-mastery-improved' }] }), origin: 'Item.burst-stand' });
    assert(posted.some((m) => m.content.includes('knocks the creature Prone')), 'the Biotic Explosion card says a failed burst save knocks prone');
    assert(!p.actor.conditions.includes('prone'), `the detonated creature rolls no save and stays standing (got ${p.actor.conditions})`);
  }
  {
    const k = field();
    const p = k.place('Primary', 0, -1, true), n = k.place('Near', 100);
    const plain = adeptAt(12);
    await save('me-biotic-throw', 'failure', p.actor, { caster: plain, origin: 'Item.burst-plain' });
    assert(!posted.some((m) => m.content.includes('knocks the creature Prone')), 'without Improved Adept Mastery the card promises no knockdown');
    await burstSave(n.actor, 'criticalFailure', k.rolls[0].args.extraRollOptions, plain);
    assert(n.actor.damage.join() === '60' && !n.actor.conditions.includes('prone'), `without Improved Adept Mastery the burst deals its damage and knocks no one down (got ${n.actor.damage}; ${n.actor.conditions})`);
  }

  const g = field();
  const p2 = g.place('Primary', 0, -1, true), n2 = g.place('Near', 100), e2 = g.place('Edge', 200);
  await save('me-biotic-throw', 'failure', p2.actor, { caster: adeptAt(16, { items: [{ type: 'feat', slug: 'me-adept-biotic-cascade' }] }), origin: 'Item.burst-cascade' });
  assert(n2.actor.damage.join() === '36' && g.rolls.map((r) => r.name).join() === 'Edge', `Biotic Cascade: the nearest enemy takes the full 6d6 = 36 with no save; the rest roll (got ${n2.actor.damage}; ${g.rolls.map((r) => r.name)})`);

  // Shockwave over two Primed creatures standing together: each takes explosion damage once
  const h = field();
  const a = h.place('A', 0, -1, true), b = h.place('B', 100, -1, true), c = h.place('C', 200);
  const shock = adeptAt(8);
  await save('me-biotic-shockwave', 'failure', a.actor, { caster: shock, origin: 'Item.burst-shock' });
  await save('me-biotic-shockwave', 'failure', b.actor, { caster: shock, origin: 'Item.burst-shock' });
  assert(a.actor.damage.join() === '36,24' && b.actor.damage.join() === '36', `A takes its explosion; B, already in A's burst, is not hit again directly (got ${a.actor.damage}; ${b.actor.damage})`);
  assert(h.rolls.map((r) => r.name).join() === 'B,C' && a.effect.deleted && b.effect.deleted, `B and C each roll one burst save, A none; both primings are spent (got ${h.rolls.map((r) => r.name)})`);

  const lone = new Actor('Lone'); prime(lone);
  await save('me-biotic-throw', 'failure', lone, { caster: adeptAt(8), origin: 'Item.burst-none' });
  assert(posted.some((m) => m.content.includes('no token on the scene: resolve the 10-foot burst by hand')), 'with no token on the scene the burst is left to the GM');
}

console.log('Biotic cooldowns: every power gets one; Adept Mastery shortens it, never below 2');
{
  const { bioticCooldownRounds } = ctx.MassEffectPowers;
  const rounds = (bioticRecharge, bioticCooldownCut) => bioticCooldownRounds(new Actor('X', { flags: { bioticRecharge, bioticCooldownCut } }));
  assert([0, 1, 2, 3].map((r) => rounds(r, 0)).join() === '4,3,2,1', 'no mastery: 4 rounds less the amp\'s Recharge');
  assert([0, 1, 2, 3].map((r) => rounds(r, 1)).join() === '3,2,2,1', 'Adept Mastery: one round less, but only an amp reaches 1');

  const useHook = hooks.on.createChatMessage[1];
  const use = async (actor, slug, name) => {
    uuids['Item.cd'] = { slug, name, img: 'warp.webp', actor };
    posted.length = 0;
    await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.cd' } } } });
  };
  const adept = new Actor('Adept', { type: 'character', flags: { bioticRecharge: 1, bioticCooldownCut: 1 } });
  await use(adept, 'me-biotic-warp', 'Warp');
  const cd = adept.created.find((d) => d.system?.slug === 'me-effect-cooldown-me-biotic-warp');
  assert(cd?.name === 'Warp Cooldown' && cd.system.duration.value === 2 && cd.system.duration.expiry === 'turn-start', `using Warp starts a 2-round Warp Cooldown (got ${cd?.system.duration.value})`);
  adept.itemTypes.effect.push({ slug: cd.system.slug, remainingDuration: { remaining: 12 } });
  await use(adept, 'me-biotic-warp', 'Warp');
  assert(adept.created.filter((d) => d.system?.slug === cd.system.slug).length === 1 && posted.some((m) => m.content.includes('still cooling down (2 rounds left)')), 'used again too soon: no second effect, and the card says how long is left');
  await use(adept, 'me-biotic-throw', 'Throw');
  assert(adept.created.some((d) => d.system?.slug === 'me-effect-cooldown-me-biotic-throw'), 'each power has its own cooldown');
  const npc = new Actor('Commando');
  await use(npc, 'me-npc-biotic-warp', 'Warp (NPC)');
  assert(npc.created.length === 0, 'NPCs keep their Recharge roll: no cooldown effect');
}

console.log('Biotic cooldowns: with Recharge 3, only the first power each turn cools down in 1 round');
{
  const useHook = hooks.on.createChatMessage[1];
  const use = async (actor, slug, name) => {
    uuids['Item.cd3'] = { slug, name, img: 'p.webp', actor };
    posted.length = 0;
    await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.cd3' } } } });
    const made = actor.created.filter((d) => d.system?.slug === 'me-effect-cooldown-' + slug).at(-1);
    if (made) actor.itemTypes.effect.push({ slug: made.system.slug, flags: made.flags ?? {}, remainingDuration: { remaining: made.system.duration.value * 6 } });
    return made;
  };
  const adept = new Actor('Adept 15', { type: 'character', flags: { bioticRecharge: 3, bioticCooldownCut: 1 } });
  const warp = await use(adept, 'me-biotic-warp', 'Warp');
  assert(warp?.system.duration.value === 1 && warp.flags?.[MOD]?.firstBioticPower === true && warp.system.description.value.includes('the first biotic power this turn'),
    `the first power of the turn: 1 round, and marked (got ${warp?.system.duration.value})`);
  const slam = await use(adept, 'me-biotic-slam', 'Slam'), throwCd = await use(adept, 'me-biotic-throw', 'Throw');
  assert(slam?.system.duration.value === 2 && !slam.flags?.[MOD]?.firstBioticPower && throwCd?.system.duration.value === 2 && slam.system.description.value.includes('only the first biotic power each turn'),
    `the second and third that turn: 2 rounds each, and the effect says why (got ${slam?.system.duration.value}, ${throwCd?.system.duration.value})`);
  // next turn: the 1-round effect has ended (or is marked expired); the 2-round ones are still there
  const mark = adept.itemTypes.effect.find((e) => e.flags?.[MOD]?.firstBioticPower);
  mark.isExpired = true; mark.slug = 'gone';
  const reave = await use(adept, 'me-biotic-reave', 'Reave');
  assert(reave?.system.duration.value === 1 && reave.flags?.[MOD]?.firstBioticPower === true, 'on the next turn the first power is 1 round again');

  const two = new Actor('Adept 13', { type: 'character', flags: { bioticRecharge: 2 } });
  const a = await use(two, 'me-biotic-warp', 'Warp'), b = await use(two, 'me-biotic-slam', 'Slam');
  assert(a?.system.duration.value === 2 && b?.system.duration.value === 2 && !a.flags?.[MOD]?.firstBioticPower && a.system.description.value.includes('minimum 1'), 'Recharge 2: every power 2 rounds, nothing marked');
  assert(ctx.MassEffectPowers.bioticCooldownRounds(adept) === 1, 'Nova\'s own cooldown is still 1 round with Recharge 3, whatever else was used');
}

console.log('Tech cooldowns: 7 rounds less Intelligence; Tech Mastery and the class masteries never below 2');
const withInt = (actor, mod) => { actor.system.abilities = { int: { mod } }; return actor; };
{
  const { techCooldownRounds } = ctx.MassEffectPowers;
  const rounds = (int, flags) => techCooldownRounds(withInt(new Actor('X', { flags }), int));
  assert([0, 4, 5, 6, 7].map((i) => rounds(i, {})).join() === '7,3,2,1,1', 'no feats: 7 less the Intelligence modifier, minimum 1');
  assert(rounds(3, { techMasteryCooldownCut: 1 }) === 3 && rounds(3, { techMasteryCooldownCut: 2 }) === 2 && rounds(4, { techMasteryCooldownCut: 2 }) === 2 && rounds(5, { techMasteryCooldownCut: 2 }) === 2,
    'Tech Mastery takes 1 or 2 rounds off, but only to 2');
  assert(rounds(6, { techMasteryCooldownCut: 2 }) === 1, 'Intelligence +6 still reaches 1 round by itself');
  assert([4, 5, 6].map((i) => rounds(i, { techCooldownCut: 1 })).join() === '2,2,1', 'Engineer Mastery takes a round off, but only to 2');
  assert(rounds(4, { techCooldownCut: 1, techMasteryCooldownCut: 2 }) === 2 && rounds(2, { techCooldownCut: 1, techMasteryCooldownCut: 2 }) === 2 && rounds(1, { techCooldownCut: 1, techMasteryCooldownCut: 2 }) === 3,
    'the two together take up to 3 rounds off, and still stop at 2');

  const useHook = hooks.on.createChatMessage[1];
  const engineer = withInt(new Actor('Engineer', { type: 'character', flags: { techCooldownCut: 1 } }), 4);
  uuids['Item.tech-cd'] = { slug: 'me-tech-overload', name: 'Overload', img: 'o.webp', actor: engineer };
  await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.tech-cd' } } } });
  const cd = engineer.created.find((d) => d.system?.slug === 'me-effect-cooldown-me-tech-overload');
  assert(cd?.system.duration.value === 2 && cd.system.description.value.includes('less 4 for Intelligence'), `using Overload starts a 2-round cooldown and says why (got ${cd?.system.duration.value})`);
}

console.log('Sentinel: tech cooldowns on the better of Intelligence and Charisma; using Tech Armor raises it');
{
  const { techCooldownRounds } = ctx.MassEffectPowers;
  const sentinel = (int, cha, flags = { techCooldownAlt: 'cha' }) => { const a = new Actor('Sentinel', { type: 'character', flags }); a.system.abilities = { int: { mod: int }, cha: { mod: cha } }; return a; };
  assert(techCooldownRounds(sentinel(1, 4)) === 3 && techCooldownRounds(sentinel(4, 1)) === 3, 'Sentinel Mastery: 7 less the higher of the two');
  assert(techCooldownRounds(sentinel(1, 4, {})) === 6, 'without it, Charisma does not count');

  const useHook = hooks.on.createChatMessage[1];
  const s = sentinel(1, 4);
  uuids['Compendium.' + MOD + '.me-tech-powers.Item.meEffTechArmor00'] = { toObject: () => ({ name: 'Tech Armor', type: 'effect', system: { slug: 'me-effect-tech-armor' } }) };
  uuids['Item.tech-armor'] = { slug: 'me-tech-armor', name: 'Tech Armor', img: 'a.webp', actor: s };
  const use = () => useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.tech-armor' } } } });
  const armors = () => s.created.filter((d) => d.system?.slug === 'me-effect-tech-armor').length;
  await use();
  const cd = s.created.find((d) => d.system?.slug === 'me-effect-cooldown-me-tech-armor');
  assert(armors() === 1 && cd?.system.duration.value === 3 && cd.system.description.value.includes('less 4 for Charisma'), `using Tech Armor adds its effect and a 3-round cooldown on Charisma (got ${cd?.system.duration.value})`);
  s.itemTypes.effect.push({ slug: 'me-effect-cooldown-me-tech-armor', remainingDuration: { remaining: 12 } });
  await use();
  assert(armors() === 1, 'used again during the cooldown: no second effect');
  s.itemTypes.effect = [{ slug: 'me-effect-tech-armor' }];
  await use();
  assert(armors() === 1, 'already up: not added twice');
}

console.log('Improved Engineer Mastery: a damaging tech power shortens the longest tech cooldown, once a round');
{
  const cooldown = (actor, slug, name, left) => {
    const e = { type: 'effect', slug: `me-effect-cooldown-${slug}`, name: `${name} Cooldown`, remainingDuration: { remaining: left * 6 }, system: { duration: { value: left } }, deleted: false };
    e.update = async (d) => { e.system.duration.value = d['system.duration.value']; e.remainingDuration.remaining = e.system.duration.value * 6; };
    e.delete = async () => { e.deleted = true; actor.itemTypes.effect = actor.itemTypes.effect.filter((x) => x !== e); };
    actor.itemTypes.effect.push(e);
    return e;
  };
  const engineer = new Actor('Engineer', { type: 'character', items: [{ type: 'feat', slug: 'me-engineer-mastery-improved' }] });
  const incinerate = cooldown(engineer, 'me-tech-incinerate', 'Incinerate', 3), cryo = cooldown(engineer, 'me-tech-cryo-blast', 'Cryo Blast', 1);
  cooldown(engineer, 'me-biotic-warp', 'Warp', 4);
  const m1 = await save('me-tech-overload', 'failure', new Actor('T1'), { caster: engineer, origin: 'Item.iem1' });
  assert(incinerate.system.duration.value === 2 && m1.includes('Incinerate\'s cooldown is 1 round shorter (2 left)'), `the longest tech cooldown loses a round; a biotic one is left alone (got ${incinerate.system.duration.value})`);
  const m2 = await save('me-tech-overload', 'failure', new Actor('T2'), { caster: engineer, origin: 'Item.iem2' });
  assert(incinerate.system.duration.value === 2 && !m2.includes('Improved Engineer Mastery'), 'only once a round');
  const m3 = await save('me-tech-overload', 'criticalSuccess', new Actor('T3'), { caster: new Actor('Other', { type: 'character', items: [{ type: 'feat', slug: 'me-engineer-mastery-improved' }] }), origin: 'Item.iem3' });
  assert(!m3.includes('Improved Engineer Mastery'), 'no damage, no cut');
  const last = new Actor('Engineer 2', { type: 'character', items: [{ type: 'feat', slug: 'me-engineer-mastery-improved' }] });
  const ending = cooldown(last, 'me-tech-cryo-blast', 'Cryo Blast', 1);
  const m4 = await save('me-tech-overload', 'failure', new Actor('T4'), { caster: last, origin: 'Item.iem4' });
  assert(ending.deleted && m4.includes('Cryo Blast is ready again') && !cryo.deleted, 'a cooldown with one round left ends');
}

console.log('Engineer drone and turret: numbers from the Engineer; a token beside them');
{
  const { petStats, openSpaceBeside } = ctx.MassEffectPowers;
  const eng = (level, dc, slugs = []) => { const a = new Actor('Engineer', { type: 'character', items: slugs.map((slug) => ({ type: 'feat', slug })) }); a.level = level; a.system.attributes.classDC = { value: dc }; return a; };
  const d1 = petStats(eng(1, 18), 'drone'), t1 = petStats(eng(1, 18), 'turret');
  assert(d1.attack === 8 && d1.damage === '1d6' && d1.ac === 15 && d1.hp === 20 && d1.strikes === 1 && d1.limit === 1, `a 1st-level drone: +8, 1d6, AC 15, 20 HP (got ${JSON.stringify(d1)})`);
  assert(t1.attack === 8 && t1.damage === '1d8+2' && t1.ac === 14 && t1.hp === 30, `a 1st-level turret: +8, 1d8+2, AC 14, 30 HP (got ${JSON.stringify(t1)})`);
  const d10 = petStats(eng(10, 32, ['me-engineer-mastery-improved', 'me-upgrade-combat-drone']), 'drone');
  assert(d10.attack === 22 && d10.damage === '3d6' && d10.ac === 29 && d10.hp === 95 && d10.strikes === 2, `10th with the mastery and the upgrade: +22, 3d6, AC 29, 95 HP, two Strikes (got ${JSON.stringify(d10)})`);
  const t20 = petStats(eng(20, 48), 'turret'), d14 = petStats(eng(14, 37, ['me-engineer-drone-commander']), 'drone');
  assert(t20.attack === 38 && t20.damage === '6d8+12' && t20.ac === 44 && t20.hp === 182 && d14.limit === 2, `a 20th-level turret: +38, 6d8+12, AC 44, 182 HP; Drone Commander allows two drones (got ${JSON.stringify(t20)})`);

  const grid = { size: 100, distance: 5 };
  const scene = { grid, tokens: [] };
  let made = 0;
  scene.createEmbeddedDocuments = async (_, docs) => { for (const d of docs) scene.tokens.push({ ...d, id: `tok${++made}`, width: 1, height: 1, parent: scene }); };
  scene.deleteEmbeddedDocuments = async (_, ids) => { scene.tokens = scene.tokens.filter((t) => !ids.includes(t.id)); };
  const engineer = eng(10, 32, ['me-engineer-mastery-improved']);
  Object.assign(engineer, { id: 'eng1', alliance: 'party', ownership: { default: 0, player1: 3 } });
  const engToken = { id: 'engTok', x: 1000, y: 1000, width: 1, height: 1, parent: scene, actor: engineer, disposition: 1 };
  scene.tokens.push(engToken, { id: 'wall', x: 900, y: 900, width: 1, height: 1, parent: scene });
  engineer.getActiveTokens = () => [engToken];
  const space = openSpaceBeside(engToken);
  assert(space.x === 1000 && space.y === 900, `the first open space around the Engineer, skipping a taken one (got ${JSON.stringify(space)})`);

  // what deployPet needs from Foundry
  ctx.game.users.activeGM = { isSelf: true };
  ctx.game.scenes = { get: () => undefined };
  ctx.game.actors = [];
  ctx.foundry.utils.deepClone = (x) => JSON.parse(JSON.stringify(x ?? {}));
  let pets = 0;
  Actor.create = async (data) => {
    const a = new Actor(data.name); a.id = `pet${++pets}`; a.flags = data.flags; a.updates = [];
    const strike = { type: 'melee', system: { bonus: { value: 8 }, damageRolls: { 0: { damage: '1d6', damageType: 'electricity' } } }, updates: [] };
    strike.update = async (d) => strike.updates.push(d);
    a.items = [strike];
    a.update = async (d) => a.updates.push(d);
    a.getTokenDocument = async (pos) => ({ toObject: () => ({ ...pos, name: a.name, actorId: a.id }) });
    ctx.game.actors.push(a);
    return a;
  };
  uuids['Compendium.' + MOD + '.me-creatures.Actor.meEngCombatDrone'] = { toObject: () => ({ _id: 'meEngCombatDrone', name: 'Combat Drone', flags: {} }) };
  uuids['Item.pet-drone'] = { slug: 'me-tech-combat-drone', name: 'Combat Drone', img: 'd.webp', actor: engineer };
  const message = { author: { id: 'gm' }, speaker: {}, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.pet-drone' } } } };
  const useHook = hooks.on.createChatMessage[1], petHook = hooks.on.createChatMessage[2];
  const droneTokens = () => scene.tokens.filter((t) => t.actorId === 'pet1');
  const cooldowns = () => engineer.created.filter((d) => d.system?.slug === 'me-effect-cooldown-me-tech-combat-drone').length;

  await useHook(message);
  assert(cooldowns() === 0, 'with a GM online, the player\'s client leaves the drone\'s cooldown to the GM\'s');
  posted.length = 0;
  await petHook(message);
  const pet = ctx.game.actors[0];
  assert(pet?.name === 'Engineer\'s Combat Drone' && pet.flags[MOD].pet.owner === 'eng1' && cooldowns() === 1, 'the Engineer gets a drone actor of their own, and the cooldown starts');
  const u = pet.updates[0];
  assert(u['system.attributes.ac.value'] === 29 && u['system.attributes.hp.max'] === 85 && u['system.details.level.value'] === 10 && u['system.details.alliance'] === 'party' && u.ownership.player1 === 3,
    `its sheet takes the Engineer's numbers and owners: AC 29, 85 HP, level 10 (got ${u['system.attributes.ac.value']}, ${u['system.attributes.hp.max']})`);
  assert(pet.updates[1]['system.attributes.hp.value'] === 85, 'and it arrives at full HP, set after the new maximum');
  assert(pet.items[0].updates[0]['system.bonus.value'] === 22 && pet.items[0].updates[0]['system.damageRolls.0.damage'] === '3d6', 'its Strike is +22 for 3d6');
  assert(droneTokens().length === 1 && droneTokens()[0].x === 1000 && droneTokens()[0].y === 900 && droneTokens()[0].actorLink === false && droneTokens()[0].disposition === 1, 'an unlinked token goes into the open space beside the Engineer, on their side');
  assert(posted.some((m) => m.content.includes('Attack +22, 3d6 electricity; AC 29, 85 HP')), 'the card gives its numbers');

  engineer.itemTypes.effect.push({ slug: 'me-effect-cooldown-me-tech-combat-drone', remainingDuration: { remaining: 12 } });
  posted.length = 0;
  await petHook(message);
  assert(droneTokens().length === 1 && ctx.game.actors.length === 1 && posted.some((m) => m.content.includes('Nothing was deployed')), 'used again during its cooldown: nothing is deployed');

  engineer.itemTypes.effect = [];
  const first = droneTokens()[0].id;
  await petHook(message);
  assert(droneTokens().length === 1 && droneTokens()[0].id !== first && ctx.game.actors.length === 1, 'deployed again: the same actor, and the new drone replaces the old one');

  engineer.items.push({ type: 'feat', slug: 'me-engineer-drone-commander' });
  await petHook(message);
  const pair = droneTokens().map((t) => t.id);
  await petHook(message);
  assert(pair.length === 2 && droneTokens().length === 2 && !droneTokens().some((t) => t.id === pair[0]) && droneTokens().some((t) => t.id === pair[1]), 'Drone Commander: two drones out; a third replaces the oldest');

  delete ctx.game.users.activeGM;
  const solo = eng(1, 18);
  uuids['Item.pet-solo'] = { slug: 'me-tech-sentry-turret', name: 'Sentry Turret', img: 't.webp', actor: solo };
  await useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.pet-solo' } } } });
  assert(solo.created.some((d) => d.system?.slug === 'me-effect-cooldown-me-tech-sentry-turret'), 'with no GM online, the player\'s client still starts the cooldown');
}

console.log('Level brackets in rules leave the migration to the system');
{
  // A rule value written as level brackets must reach the system unstamped: the system's own
  // migrations turn brackets into the formula syntax it reads now (SF2e 1.7 no longer reads
  // brackets in a Strike's dice). An item stamped with an older schema skips that migration.
  const { readdirSync, statSync } = await import('fs');
  const root = new URL('../src/packs/', import.meta.url);
  const stamped = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const url = new URL(name, dir);
      if (statSync(url).isDirectory()) { walk(new URL(`${name}/`, dir)); continue; }
      if (!name.endsWith('.json')) continue;
      const text = readFileSync(url, 'utf8');
      if (text.includes('"brackets"') && JSON.parse(text).system?._migration) stamped.push(name);
    }
  };
  walk(root);
  assert(stamped.length === 0, `no bracketed item carries a _migration stamp${stamped.length ? `: ${stamped.join(', ')}` : ''}`);
}

console.log('Infiltrator: Tactical Cloak goes up on use, comes off after its Strikes, and leaves a wake');
{
  const { techCooldownRounds, cloakStrikes } = ctx.MassEffectPowers;
  const infiltrator = (int, slugs = []) => {
    const a = new Actor('Infiltrator', { type: 'character', flags: { techCooldownCut: 1 }, items: ['me-infiltrator-mastery', ...slugs].map((slug) => ({ type: 'feat', slug })) });
    a.system.abilities = { int: { mod: int } };
    return a;
  };
  assert(techCooldownRounds(infiltrator(4)) === 2 && techCooldownRounds(infiltrator(5)) === 2 && techCooldownRounds(infiltrator(6)) === 1,
    'Infiltrator Mastery: 1 round off tech cooldowns, never below 2; Intelligence 6 still reaches 1');
  assert(cloakStrikes(infiltrator(4)) === 1 && cloakStrikes(infiltrator(4, ['me-upgrade-tactical-cloak'])) === 2, 'the cloak lasts one Strike, two with Tactical Cloak Upgrade');

  const useHook = hooks.on.createChatMessage[1], strikeHook = hooks.on.createChatMessage[5];
  assert(hooks.on.createChatMessage.length === 8, 'the Strike hook is the sixth chat hook of eight (Unity\'s cast is the last)');
  uuids['Compendium.' + MOD + '.me-tech-powers.Item.meEffTactCloak00'] = { toObject: () => ({ name: 'Tactical Cloak', type: 'effect', img: 'c.webp', flags: {}, system: { slug: 'me-effect-tactical-cloak' } }) };
  const post = (actor, slug, name) => { uuids['Item.' + slug] = { slug, name, img: 'f.webp', actor }; return useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.' + slug } } } }); };
  const made = (actor, slug) => actor.created.filter((d) => d.system?.slug === slug);

  // using it
  const a = infiltrator(4);
  await post(a, 'me-tech-tactical-cloak', 'Tactical Cloak');
  const cd = made(a, 'me-effect-cooldown-me-tech-tactical-cloak')[0], up = made(a, 'me-effect-tactical-cloak')[0];
  assert(up?.flags[MOD].cloakStrikes === 0 && cd?.system.duration.value === 2 && cd.system.description.value.includes('from Infiltrator Mastery'),
    `using Tactical Cloak adds its effect and a 2-round cooldown (got ${cd?.system.duration.value})`);
  a.itemTypes.effect.push({ slug: 'me-effect-cooldown-me-tech-tactical-cloak', remainingDuration: { remaining: 12 } });
  await post(a, 'me-tech-tactical-cloak', 'Tactical Cloak');
  assert(made(a, 'me-effect-tactical-cloak').length === 1, 'used again during the cooldown: no second cloak');
  posted.length = 0;
  await post(a, 'me-infiltrator-phantom-protocol', 'Phantom Protocol');
  assert(made(a, 'me-effect-tactical-cloak').length === 2 && posted.some((m) => m.content.includes('Tactical Cloak is back up')), 'Phantom Protocol sent to chat brings the cloak back during the cooldown');

  // Strikes under the cloak
  const cloaked = (actor) => {
    const e = { type: 'effect', slug: 'me-effect-tactical-cloak', img: 'c.webp', flags: { [MOD]: { cloakStrikes: 0 } }, deleted: false };
    e.update = async (d) => { e.flags[MOD].cloakStrikes = d[`flags.${MOD}.cloakStrikes`]; };
    e.delete = async () => { e.deleted = true; actor.itemTypes.effect = actor.itemTypes.effect.filter((x) => x !== e); };
    actor.itemTypes.effect.push(e);
    return e;
  };
  const roll = (actor, type, extra = {}, author = 'gm') => strikeHook({ author: { id: author }, speaker: { actor }, flags: { pf2e: { context: { type, domains: [type === 'attack-roll' ? 'strike-attack-roll' : 'strike-damage'], ...extra } } } });

  const b = infiltrator(4); let c = cloaked(b);
  await roll(b, 'attack-roll', { outcome: 'success' });
  assert(!c.deleted && c.flags[MOD].cloakStrikes === 0, 'a hit does not end the cloak until its damage is rolled');
  await roll(b, 'attack-roll', { outcome: 'failure', domains: ['spell-attack-roll'] });
  await roll(b, 'damage-roll', {}, 'someone-else');
  assert(!c.deleted, 'an attack roll that is not a Strike, or another user\'s message, is ignored');
  await roll(b, 'damage-roll');
  assert(c.deleted && !made(b, 'me-effect-cloak-wake').length, 'rolling the damage ends the cloak; no wake without Ghost Protocol or the superior mastery');
  c = cloaked(b);
  await roll(b, 'attack-roll', { outcome: 'criticalFailure' });
  assert(c.deleted, 'a miss ends the cloak when it is rolled');

  const u = infiltrator(5, ['me-upgrade-tactical-cloak']); c = cloaked(u);
  await roll(u, 'damage-roll');
  assert(!c.deleted && c.flags[MOD].cloakStrikes === 1, 'Tactical Cloak Upgrade: the first Strike is counted and the cloak stays');
  await roll(u, 'attack-roll', { outcome: 'failure' });
  assert(c.deleted, 'and the second Strike ends it');

  // the wake
  const conditions = ctx.game.pf2e.ConditionManager.getCondition;
  ctx.game.pf2e.ConditionManager.getCondition = (slug) => ({ sourceId: 'Compendium.pf2e.conditionitems.Item.' + slug });
  const g = infiltrator(5, ['me-infiltrator-ghost-protocol', 'me-infiltrator-mastery-superior']); c = cloaked(g);
  const old = { slug: 'me-effect-cloak-wake', deleted: false, delete: async () => { old.deleted = true; } }; g.itemTypes.effect.push(old);
  posted.length = 0;
  await roll(g, 'damage-roll');
  const wake = made(g, 'me-effect-cloak-wake')[0];
  assert(c.deleted && old.deleted && wake?.system.duration.expiry === 'turn-start' && wake.system.duration.value === 1
    && wake.system.rules.some((r) => r.key === 'RollOption' && r.option === 'me-cloak-wake')
    && wake.system.rules.some((r) => r.key === 'GrantItem' && r.uuid.endsWith('.concealed') && r.inMemoryOnly),
    'Ghost Protocol and the superior mastery: a wake until the next turn, with concealment, replaces the cloak');
  assert(posted[0]?.content.includes('Ghost Protocol: concealed') && posted[0].content.includes('resistance 5'), 'and a card says what the wake gives');
  ctx.game.pf2e.ConditionManager.getCondition = conditions;

  // Apex Infiltrator no longer has an automatic critical hit (2026-11 rebalance), so nothing marks one as used
  const x = infiltrator(6, ['me-infiltrator-apex-infiltrator', 'me-upgrade-tactical-cloak']); c = cloaked(x);
  await roll(x, 'attack-roll', { outcome: 'criticalSuccess' });
  assert(made(x, 'me-effect-apex-infiltrator-used').length === 0, 'Apex Infiltrator: a cloaked attack roll leaves no automatic-critical marker');
}

console.log('2026-11 rebalance: the changed features and the shield read as designed in the packs');
{
  const pack = (rel) => JSON.parse(readFileSync(new URL(`../src/packs/${rel}`, import.meta.url), 'utf8'));
  const flags = (rel) => pack(rel).flags['mass-effect-sf2e-conversion'];
  const rule = (rel, pred) => pack(rel).system.rules.filter(pred);
  const shield = flags('me-shields/kinetic-shield.json');
  assert(shield.shieldMax === 15 && shield.shieldRegen === 5, `Kinetic Shield: 15 points, recharging 5 (got ${shield.shieldMax} / ${shield.shieldRegen})`);
  const mods = [1, 2, 3, 4].map((t) => flags(`me-shields/shield-hp-mod-t${t}.json`).shieldHpBonus);
  assert(mods.join() === '5,10,20,35', `Shield HP mods: +5 / +10 / +20 / +35 (got ${mods})`);
  const cloak = rule('me-tech-powers/tactical-cloak-effect.json', (r) => r.key === 'DamageDice')[0];
  assert(cloak.diceNumber === '3*(1+floor(@actor.level/4))', `Tactical Cloak: 3d6 a step (got ${cloak.diceNumber})`);
  const mastery = rule('me-combat-passives/infiltrator-mastery-improved.json', (r) => r.key === 'DamageDice')[0];
  assert(mastery.diceNumber === 4, `Improved Infiltrator Mastery: 4d6 on cloaked Strikes (got ${mastery.diceNumber})`);
  assert(rule('me-class-progressions/infiltrator-apex-infiltrator.json', (r) => r.key === 'AdjustDegreeOfSuccess').length === 0, 'Apex Infiltrator: no automatic critical hit');
  const soldier = ['', '-improved', '-superior'].map((s) => rule(`me-combat-passives/soldier-mastery${s}.json`, (r) => r.key === 'FlatModifier' && r.selector === 'strike-damage')[0].value);
  assert(soldier.join() === '1,1,1', `Soldier Mastery chain: +1 a step (got ${soldier})`);
  const adeptDc = ['', '-improved', '-superior'].flatMap((s) => rule(`me-combat-passives/adept-mastery${s}.json`, (r) => r.selector === 'class'));
  assert(adeptDc.length === 0, 'Adept Mastery chain: no bonus to the class DC');
  const improvedAdept = pack('me-combat-passives/adept-mastery-improved.json').system;
  assert(improvedAdept.slug === 'me-adept-mastery-improved' && /fails its Reflex save<\/strong> against your Biotic Explosion is knocked <strong>Prone/.test(improvedAdept.description.value),
    'Improved Adept Mastery: its text gives the Biotic Explosion knockdown under the slug the engine reads');
  assert(!pack('me-class-progressions/engineer-apex-engineer.json').system.description.value.includes('0 actions'), 'Apex Engineer: no free tech power');
}

console.log('Infiltrator: Hunter\'s Mark marks the one targeted creature');
{
  const useHook = hooks.on.createChatMessage[1];
  const h = new Actor('Marksman', { type: 'character', items: [{ type: 'feat', slug: 'me-infiltrator-hunters-mark' }] });
  uuids['Item.hm'] = { slug: 'me-infiltrator-hunters-mark', name: 'Hunter\'s Mark', img: 'h.webp', actor: h };
  const use = () => useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.hm' } } } });
  const marks = () => h.created.filter((d) => d.system?.slug === 'me-effect-hunters-mark');
  ctx.game.user.targets = new Set();
  posted.length = 0;
  await use();
  assert(!marks().length && posted.some((m) => m.content.includes('Target exactly one creature')), 'with no target it marks nothing and says why');
  ctx.game.user.targets = new Set([{ document: { name: 'Husk', uuid: 'Scene.s.Token.husk' } }]);
  const old = { slug: 'me-effect-hunters-mark', deleted: false, delete: async () => { old.deleted = true; } }; h.itemTypes.effect.push(old);
  await use();
  const mark = marks()[0];
  assert(old.deleted && mark?.name === 'Hunter\'s Mark: Husk' && mark.system.rules[0].key === 'TokenMark' && mark.system.rules[0].slug === 'hunters-mark' && mark.system.rules[0].uuid === 'Scene.s.Token.husk',
    'with one target it replaces the old mark with one on that token');
  delete ctx.game.user.targets;
}

console.log('Soldier: cooldowns for its own powers, cut by Improved Soldier Mastery');
{
  const { soldierCooldownRounds } = ctx.MassEffectPowers;
  const soldier = ({ con = 4, str = 2, cha = 0, key = 'con', cut = 0, level = 1, slugs = [] } = {}) => {
    const a = new Actor('Soldier', { type: 'character', flags: cut ? { soldierCooldownCut: cut } : {}, items: slugs.map((slug) => ({ type: 'feat', slug })) });
    a.system.abilities = { con: { mod: con }, str: { mod: str }, cha: { mod: cha } }; a.system.details = { keyability: { value: key } }; a.level = level;
    return a;
  };
  assert(soldierCooldownRounds(soldier(), 'me-cp-adrenaline-rush') === 3 && soldierCooldownRounds(soldier({ cut: 1 }), 'me-cp-adrenaline-rush') === 2
    && soldierCooldownRounds(soldier({ con: 6, cut: 1 }), 'me-cp-adrenaline-rush') === 1, 'Adrenaline Rush: 7 less Constitution; the mastery takes a round off, never below 2');
  assert(soldierCooldownRounds(soldier({ con: 2, str: 4 }), 'me-cp-concussive-shot-master') === 3 && soldierCooldownRounds(soldier({ con: 2, str: 4 }), 'me-soldier-carnage') === 3,
    'Concussive Shot and Carnage: the higher of Constitution and Strength');
  assert(soldierCooldownRounds(soldier({ con: 1, cha: 4, key: 'cha' }), 'me-cp-fortification') === 3, 'Fortification: the higher of Constitution and the key attribute');
  assert(soldierCooldownRounds(soldier(), 'me-frag-grenade') === 3 && soldierCooldownRounds(soldier({ cut: 1 }), 'me-frag-grenade') === 2, 'Frag Grenade: 3 rounds, 2 with the mastery');

  const useHook = hooks.on.createChatMessage[1], strikeHook = hooks.on.createChatMessage[5], hitHook = hooks.on.createChatMessage[6];
  const passive = (id, slug) => { uuids['Compendium.' + MOD + '.me-combat-passives.Item.' + id] = { toObject: () => ({ name: slug, type: 'effect', system: { slug } }) }; };
  passive('meEffAdrenaline0', 'me-effect-adrenaline-rush'); passive('meEffAdrenalinIm', 'me-effect-adrenaline-rush-improved'); passive('meEffAdrnalMastr', 'me-effect-adrenaline-rush-master'); passive('meEffFortifictnM', 'me-effect-fortification-master');
  const post = (actor, slug, name) => { uuids['Item.' + slug] = { slug, name, img: 'f.webp', actor }; return useHook({ author: { id: 'gm' }, flags: { pf2e: { origin: { type: 'feat', uuid: 'Item.' + slug } } } }); };
  const made = (actor, slug) => actor.created.filter((d) => d.system?.slug === slug);
  const cooling = (actor, group, rounds) => actor.itemTypes.effect.push({ slug: 'me-effect-cooldown-' + group, remainingDuration: { remaining: rounds * 6 } });

  const a = soldier({ cut: 1 });
  await post(a, 'me-cp-adrenaline-rush', 'Adrenaline Rush');
  const cd = made(a, 'me-effect-cooldown-adrenaline-rush')[0];
  assert(made(a, 'me-effect-adrenaline-rush').length === 1 && cd?.system.duration.value === 2 && cd.system.description.value.includes('less 4 for Constitution') && cd.system.description.value.includes('Improved Soldier Mastery'),
    `using Adrenaline Rush adds its effect and a 2-round cooldown (got ${cd?.system.duration.value})`);
  cooling(a, 'adrenaline-rush', 2);
  await post(a, 'me-cp-adrenaline-rush', 'Adrenaline Rush');
  assert(made(a, 'me-effect-adrenaline-rush').length === 1, 'used again during the cooldown: no second effect');
  await post(a, 'me-cp-adrenaline-rush-improved', 'Improved Adrenaline Rush');
  assert(made(a, 'me-effect-adrenaline-rush-improved').length === 1 && made(a, 'me-effect-cooldown-adrenaline-reaction').length === 1, 'the reaction has its own cooldown, apart from Adrenaline Rush');
  cooling(a, 'adrenaline-reaction', 2);
  await post(a, 'me-cp-adrenaline-rush-master', 'Master Adrenaline Rush');
  assert(!made(a, 'me-effect-adrenaline-rush-master').length, 'Improved and Master Adrenaline Rush share that cooldown');
  await post(a, 'me-cp-fortification-master', 'Master Fortification');
  assert(made(a, 'me-effect-fortification-master').length === 1 && made(a, 'me-effect-cooldown-fortification')[0]?.system.duration.value === 2, 'Fortification puts its effect on and starts the shared Fortification cooldown');

  // Concussive Shot
  const c = soldier({ level: 8, slugs: ['me-cp-concussive-volley'] });
  await post(c, 'me-cp-concussive-shot-improved', 'Improved Concussive Shot');
  const shot = made(c, 'me-effect-concussive-shot')[0], dice = shot?.system.rules.find((r) => r.key === 'DamageDice');
  assert(dice?.diceNumber === 6 && dice.dieSize === 'd8' && dice.damageType === 'bludgeoning' && shot.flags[MOD].strikesAllowed === 2 && made(c, 'me-effect-cooldown-concussive-shot').length === 1,
    `Improved Concussive Shot at 8th: 2d8 x3 = 6d8 on the next Strike, two Strikes with Concussive Volley (got ${dice?.diceNumber}d8)`);
  const one = soldier({ level: 3 });
  await post(one, 'me-cp-concussive-shot', 'Concussive Shot');
  assert(made(one, 'me-effect-concussive-shot')[0]?.system.rules[1].diceNumber === 1 && made(one, 'me-effect-concussive-shot')[0].flags[MOD].strikesAllowed === 1, 'Concussive Shot at 3rd: 1d8, one Strike');
  const loaded = { type: 'effect', slug: 'me-effect-concussive-shot', flags: { [MOD]: { strikes: 0, strikesAllowed: 1 } }, deleted: false };
  loaded.delete = async () => { loaded.deleted = true; }; one.itemTypes.effect.push(loaded);
  await strikeHook({ author: { id: 'gm' }, speaker: { actor: one }, flags: { pf2e: { context: { type: 'attack-roll', domains: ['strike-attack-roll'], outcome: 'success' } } } });
  assert(!loaded.deleted, 'a hit keeps the Concussive Shot effect until the damage is rolled');
  await strikeHook({ author: { id: 'gm' }, speaker: { actor: one }, flags: { pf2e: { context: { type: 'damage-roll', domains: ['strike-damage'] } } } });
  assert(loaded.deleted, 'and rolling the damage takes it off');

  ctx.game.users.activeGM = { isSelf: true };
  const target = new Actor('Husk'); uuids['Scene.s.Token.husk'] = { actor: target, name: 'Husk' };
  const hit = (outcome, options = ['me-concussive-shot']) => { posted.length = 0; return hitHook({ speaker: { actor: one }, flags: { pf2e: { context: { type: 'attack-roll', outcome, options, target: { token: 'Scene.s.Token.husk' } } } } }); };
  await hit('failure'); await hit('success', []);
  assert(!target.conditions.length, 'a miss, or a Strike without Concussive Shot, knocks no one down');
  await hit('success');
  assert(target.conditions.join() === 'prone' && posted[0]?.content.includes('Husk is knocked prone') && !posted[0].content.includes('push'), 'a Concussive Shot that hits knocks the target prone');
  await hit('criticalSuccess');
  assert(target.conditions.length === 2 && posted[0]?.content.includes('push it 10 feet by hand'), 'a critical hit also calls for the 10-foot push');
  delete ctx.game.users.activeGM;
}

console.log('Soldier: Carnage scales as a power, and turn-bound effects end with the turn');
{
  const caster = new Actor('Soldier 12', { type: 'character' }); caster.level = 12;
  const t = new Actor('Carnage target');
  await save('me-soldier-carnage', 'failure', t, { caster, origin: 'Item.carnage12' });
  assert(t.damage[0] === 48, `Carnage on a failure at 12th: 2d6 x4 = 8d6 (got ${t.damage})`);

  ctx.game.users.activeGM = { isSelf: true };
  const s = new Actor('Rushed', { type: 'character' });
  const mk = (ends) => { const e = { type: 'effect', flags: { [MOD]: ends ? { endsWithTurn: true } : {} }, deleted: false }; e.delete = async () => { e.deleted = true; }; return e; };
  const reaction = mk(true), other = mk(false); s.itemTypes.effect.push(reaction, other);
  await hooks.on['pf2e.endTurn'][0]({ actor: s });
  assert(reaction.deleted && !other.deleted, 'the Adrenaline Rush reaction\'s effect comes off when its owner\'s turn ends; other effects stay');
  delete ctx.game.users.activeGM;
}

console.log('Unity: a share of maximum HP, a full shield and a revive, for the caster and allies in range');
{
  const { unityPercent, unityOn } = ctx.MassEffectPowers;
  const at = (level) => unityPercent({ level });
  assert([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(at).join() === '10,10,20,20,30,30,40,40,50,50', `10% a step at 5th, 9th, 13th and 17th (got ${[1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(at)})`);

  // a creature with conditions the way the system keeps them (max HP is 60 in these mocks)
  const unit = (name, { hp = 60, temp = 0, conditions = {}, items = [] } = {}) => {
    const a = new Actor(name, { hp, temp, items, type: 'character' });
    a.cond = { ...conditions };
    a.hasCondition = (s) => s in a.cond;
    a.getCondition = (s) => (s in a.cond ? { value: a.cond[s] } : null);
    a.decreaseCondition = async (s, o) => { if (o?.forceRemove || !(a.cond[s] > 1)) delete a.cond[s]; else a.cond[s]--; };
    a.increaseCondition = async (s) => { a.cond[s] = (a.cond[s] || 0) + 1; };
    a.itemTypes.condition = [];
    a.deleteEmbeddedDocuments = async (_, ids) => { a.itemTypes.condition = a.itemTypes.condition.filter((c) => !ids.includes(c.id)); };
    return a;
  };
  const shield = () => [{ type: 'equipment', flags: { [MOD]: { shieldMax: 15 } } }, { type: 'equipment', flags: { [MOD]: { shieldHpBonus: 5 } } }];
  const caster = unit('Caster'); caster.level = 5;                        // 20% of 60 = 12

  const hurt = unit('Hurt', { hp: 20, temp: 3, items: shield(), conditions: { frightened: 2, 'persistent-damage': null } });
  hurt.itemTypes.condition = [{ id: 'burn', slug: 'persistent-damage' }];
  let line = await unityOn(caster, hurt);
  assert(hurt.system.attributes.hp.value === 32 && hurt.system.attributes.hp.temp === 20, `20% of 60 and a full 20-point shield (got ${hurt.system.attributes.hp.value} HP, ${hurt.system.attributes.hp.temp} shield)`);
  assert(line.includes('20 → 32 HP') && line.includes('shield 3 → 20'), `the line says so: ${line}`);
  assert(hurt.cond.frightened === 2 && hurt.itemTypes.condition.length === 1, 'plain Unity leaves conditions and persistent damage alone');

  const nearFull = unit('Near full', { hp: 55 });
  await unityOn(caster, nearFull);
  assert(nearFull.system.attributes.hp.value === 60 && nearFull.system.attributes.hp.temp === 0, 'healing stops at maximum HP, and a creature without a shield gets none');
  assert((await unityOn(caster, unit('Full'))).includes('HP already full'), 'a creature at full HP is told so');

  const downed = unit('Downed', { hp: 0, items: shield(), conditions: { dying: 2, unconscious: null, prone: null, wounded: 1 } });
  line = await unityOn(caster, downed);
  assert(downed.system.attributes.hp.value === 12 && !('dying' in downed.cond) && !('unconscious' in downed.cond), `a dying ally wakes with the healing (got ${downed.system.attributes.hp.value} HP, ${Object.keys(downed.cond)})`);
  assert(downed.cond.wounded === 2 && 'prone' in downed.cond && downed.system.attributes.hp.temp === 20, `Wounded 1 → 2, still prone, shield full (got wounded ${downed.cond.wounded})`);
  assert(line.includes('revived (Wounded 2)'), `the line says so: ${line}`);

  const fresh = unit('First time down', { hp: 0, conditions: { dying: 1, unconscious: null } });
  await unityOn(caster, fresh);
  assert(fresh.cond.wounded === 1, `a creature that was not wounded becomes Wounded 1 (got ${fresh.cond.wounded})`);

  const dead = unit('Dead', { hp: 0 }); dead.isDead = true;
  assert((await unityOn(caster, dead)).includes('dead') && dead.system.attributes.hp.value === 0, 'Unity does not raise the dead');

  // Improved Unity: Frightened, Sickened and Stunned 1 go; a higher Stunned stays
  caster.items = [{ slug: 'unity-improved' }];
  const shaken = unit('Shaken', { hp: 30, conditions: { frightened: 2, sickened: 1, stunned: 1 } });
  const stunned = unit('Stunned 2', { hp: 30, conditions: { stunned: 2 } });
  line = await unityOn(caster, shaken); await unityOn(caster, stunned);
  assert(!Object.keys(shaken.cond).length && line.includes('no longer Frightened, Sickened, Stunned 1'), `Improved Unity clears all three: ${line}`);
  assert(stunned.cond.stunned === 2, 'Stunned 2 is not reduced');

  // Superior Unity: no Wounded from the revive, on their feet, persistent damage ended
  caster.items = [{ slug: 'unity-improved' }, { slug: 'unity-superior' }];
  const saved = unit('Saved', { hp: 0, conditions: { dying: 1, unconscious: null, prone: null, wounded: 1 } });
  saved.itemTypes.condition = [{ id: 'burn', slug: 'persistent-damage' }, { id: 'other', slug: 'clumsy' }];
  line = await unityOn(caster, saved);
  assert(saved.cond.wounded === 1 && !('prone' in saved.cond) && !('dying' in saved.cond), `Superior Unity: Wounded stays 1, no longer prone (got ${JSON.stringify(saved.cond)})`);
  assert(saved.itemTypes.condition.map((c) => c.id).join() === 'other' && line.includes('persistent damage ended') && line.includes('on their feet'), `persistent damage ends, other conditions stay: ${line}`);
  const clean = unit('Clean', { hp: 0, conditions: { dying: 1, unconscious: null } });
  await unityOn(caster, clean);
  assert(!('wounded' in clean.cond), 'Superior Unity: a creature that was not wounded stays that way');
}

console.log('Unity: the cast heals the caster and allies within 30 feet; a card only shown in chat does nothing');
{
  const person = (name, hp) => {
    const a = new Actor(name, { hp, type: 'character' });
    a.hasCondition = () => false; a.getCondition = () => null; a.itemTypes.condition = [];
    return a;
  };
  const caster = person('Caster', 10); caster.level = 9;                  // 30% of 60 = 18
  caster.isAllyOf = (other) => other.side === 'party';
  const near = person('Near', 10), far = person('Far', 10), foe = person('Foe', 10);
  near.side = 'party'; far.side = 'party'; foe.side = 'opposition';
  const scene = { grid: { size: 100, distance: 5, measurePath: ([a, b]) => ({ distance: Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) / 20 }) } };
  const token = (actor, squares) => ({ actor, parent: scene, x: squares * 100, y: 0, width: 1, height: 1 });
  const source = token(caster, 0);
  scene.tokens = [source, token(near, 6), token(far, 7), token(foe, 1)];   // 30 feet, 35 feet, 5 feet
  caster.getActiveTokens = () => [source];
  ctx.game.users.activeGM = { isSelf: true };
  ctx.game.users.filter = () => [];
  ctx.game.scenes = { get: () => null };
  uuids['Item.unity-spell'] = { slug: 'me-spell-unity', actor: caster };
  const cast = async (rollOptions) => {
    posted.length = 0;
    const message = { speaker: {}, flags: { pf2e: { origin: { type: 'spell', uuid: 'Item.unity-spell', rollOptions } } } };
    for (const hook of hooks.on.createChatMessage) { try { await hook(message); } catch { /* hooks for other cards */ } }
    return posted.map((p) => p.content).join(' ');
  };
  const hpOf = () => [caster, near, far, foe].map((a) => a.system.attributes.hp.value).join();

  let card = await cast([]);
  assert(hpOf() === '10,10,10,10' && card.includes('shown in chat, not cast'), `shown in chat only: no one healed, and the card says why (${hpOf()})`);
  card = await cast(['origin:action:slug:cast-a-spell']);
  assert(hpOf() === '28,28,10,10', `cast at 9th: the caster and the ally at 30 feet regain 18; the ally at 35 feet and the enemy do not (${hpOf()})`);
  assert(card.includes('30% of maximum HP') && card.includes('Near: 10 → 28 HP') && !card.includes('Far') && !card.includes('Foe'), 'the card lists who it reached');
  delete ctx.game.users.activeGM; delete ctx.game.scenes;
}

console.log('Unity: the pack has the focus spell, and the feats are passive');
{
  const read = (f) => JSON.parse(readFileSync(new URL(`../src/packs/me-biotic-powers/${f}`, import.meta.url), 'utf8'));
  const spell = read('unity-spell.json');
  assert(spell.type === 'spell' && spell.system.slug === 'me-spell-unity' && spell.system.traits.value.includes('focus') && spell.system.time.value === '2', 'Unity is a two-action focus spell');
  const feats = ['unity-feat.json', 'unity-improved-feat.json', 'unity-superior-feat.json'].map(read);
  assert(feats.every((f) => f.system.actionType.value === 'passive' && f.system.description.value.includes('Item.meSpellUnity0001')), 'the three feats are passive and link the spell');
  assert(feats.map((f) => f.system.level.value).join() === '1,6,10' && feats.map((f) => f.system.slug).join() === 'unity,unity-improved,unity-superior', 'levels 1, 6 and 10; slugs unchanged');
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

console.log('The manifest keeps this release away from Pathfinder installs');
{
  // Foundry offers an update on version alone, from the manifest URL the installed copy saved.
  // Copies of 2.2.0-rc.6 and earlier (the last with Pathfinder packs) saved releases/latest, so
  // this line must never be served from there, and must list Starfinder 2e as its only system.
  const manifest = JSON.parse(readFileSync(new URL('../module.json', import.meta.url), 'utf8'));
  assert(!/releases\/latest/.test(manifest.manifest) && /releases\/download\/sf2e\/module\.json$/.test(manifest.manifest), `its own manifest URL (${manifest.manifest})`);
  assert(!/releases\/latest/.test(manifest.download), 'the download is pinned to a tag');
  const systems = manifest.relationships.systems.map((s) => s.id);
  assert(systems.join() === 'sf2e', `Starfinder 2e only (${systems})`);
  assert(manifest.packs.every((p) => p.system === 'sf2e'), 'every pack is a Starfinder 2e pack');
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exitCode = failures ? 1 : 0;
