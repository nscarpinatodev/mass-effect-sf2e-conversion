// Generates the biotic amps into src/packs/me-items (biotic-amp-*.json).
// Run: node scripts/generate-biotic-amps.mjs
//
// An amp has a Recharge rating (−1 to −3 rounds off the 4-round biotic cooldown) and a
// Power rating: Power 1 = +1 biotic power damage and +5 barrier HP; Power 2 = +2 damage,
// +1 class DC, +10 barrier HP; Power 3 = +3 damage, +2 class DC, +15 barrier HP. Polaris
// trades Power for a bigger barrier. All bonuses are item bonuses (upgrade, never stack).
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const MODULE_ID = 'mass-effect-sf2e-conversion';
const DIR = join('src', 'packs', 'me-items');
const IMG = `modules/${MODULE_ID}/assets/img/armor-mods/ME3_Barrier.png`;
const PRICE = { 1: 20, 3: 60, 5: 160, 6: 250, 8: 500, 9: 700, 10: 900, 11: 1400, 12: 2000, 13: 3000, 14: 4500, 15: 6500, 16: 10000, 18: 24000, 19: 40000 };
const ROMAN = ['', 'I', 'II', 'III'];

const MODELS = [
  {
    key: 'solaris', name: 'Solaris', maker: 'Aldrin Labs', rarity: 'common',
    flavor: 'Aldrin Labs\' entry-level amp, the one most Alliance biotics are issued out of training. Dependable, inexpensive and unremarkable: a little faster recharge, and in its later revision a little more push behind every field.',
    versions: [{ level: 1, recharge: 1, power: 0 }, { level: 5, recharge: 1, power: 1 }],
  },
  {
    key: 'gemini', name: 'Gemini', maker: 'Armax Arsenal', rarity: 'common',
    flavor: 'Armax Arsenal builds the Gemini for one thing: cycling the user\'s element zero nodes back to readiness as fast as the nervous system will tolerate. It adds no strength to a biotic\'s fields, only tempo.',
    versions: [{ level: 3, recharge: 1, power: 0 }, { level: 9, recharge: 2, power: 0 }, { level: 15, recharge: 3, power: 0 }],
  },
  {
    key: 'unity', name: 'Unity', maker: 'Sirta Foundation', rarity: 'common',
    flavor: 'The Sirta Foundation\'s Unity amp balances recharge against output, a field medic\'s choice that does nothing brilliantly and nothing badly.',
    versions: [{ level: 5, recharge: 1, power: 1 }, { level: 11, recharge: 2, power: 2 }],
  },
  {
    key: 'polaris', name: 'Polaris', maker: 'Kassa Fabrication', rarity: 'common',
    flavor: 'Kassa Fabrication tunes the Polaris for sustained fields rather than sharp ones. Its users hold a thicker biotic barrier, favored by Vanguards who spend that barrier as a weapon.',
    versions: [{ level: 6, recharge: 1, power: 0, barrier: 10 }, { level: 12, recharge: 2, power: 0, barrier: 20 }],
  },
  {
    key: 'prodigy', name: 'Prodigy', maker: 'Armali Council', rarity: 'uncommon',
    flavor: 'An asari design from the Armali Council, built for commandos who expect to fight for centuries. The Prodigy recovers a biotic\'s focus remarkably quickly but adds no raw power.',
    versions: [{ level: 8, recharge: 2, power: 0 }, { level: 16, recharge: 3, power: 0 }],
  },
  {
    key: 'savant', name: 'Savant', maker: 'Serrice Council', rarity: 'rare',
    flavor: 'The Serrice Council\'s Savant is the finest amp available to anyone outside an asari matriarch\'s inner circle: fast recharge and fields of startling strength. Few humans ever handle one.',
    versions: [{ level: 13, recharge: 2, power: 3 }, { level: 19, recharge: 3, power: 3 }],
  },
  {
    key: 'hmba', name: 'HMBA', maker: 'Spectre requisitions', rarity: 'uncommon', tiers: ['Basic', 'Advanced', 'Master'],
    flavor: 'The HMBA is Spectre-issue gear, available only through Spectre requisitions: a balanced, battlefield-proven amp whose later revisions recover faster than the first.',
    versions: [{ level: 10, recharge: 2, power: 2 }, { level: 14, recharge: 2, power: 2 }, { level: 18, recharge: 3, power: 2 }],
  },
];

const flag = (path, value) => ({ key: 'ActiveEffectLike', mode: 'upgrade', path: `flags.${MODULE_ID}.${path}`, value });

function amp(model, v, i) {
  const tier = model.tiers ? model.tiers[i] : ROMAN[i + 1];
  const name = model.tiers ? `${model.name} ${tier} Bio-Amp` : `${model.name} Bio-Amp ${tier}`;
  const slug = `biotic-amp-${model.key}-${i + 1}`;
  const id = `meAmp${model.key.slice(0, 6)}${i + 1}`.padEnd(16, '0').slice(0, 16);
  const damage = v.power;
  const dc = Math.max(0, v.power - 1);
  const barrier = v.barrier ?? 5 * v.power;
  const cooldown = Math.max(1, 4 - v.recharge);

  const rules = [flag('bioticRecharge', v.recharge)];
  if (damage) rules.push(flag('ampDamageBonus', damage));
  if (dc) rules.push({ key: 'FlatModifier', selector: 'class', type: 'item', value: dc, label: name });
  if (barrier) rules.push(flag('barrierBonus', barrier));

  const stats = [`<li><strong>Recharge −${v.recharge}:</strong> your biotic powers' cooldowns are <strong>${cooldown} round${cooldown === 1 ? '' : 's'}</strong> (4 − ${v.recharge}, minimum 1). Powers with a fixed cooldown of their own, such as Biotic Charge, keep it.</li>`];
  if (v.power) {
    stats.push(`<li><strong>Power ${v.power}:</strong> +${damage} item bonus to the damage your biotic powers deal${dc ? `, +${dc} item bonus to your class DC` : ''}, and +${barrier} Hit Points to your Biotic Barrier when you raise it.</li>`);
  } else if (barrier) {
    stats.push(`<li><strong>Barrier:</strong> your Biotic Barrier has +${barrier} Hit Points when you raise it.</li>`);
  }
  const description = `<p>${model.flavor}</p><p><em>${model.maker} · ${tier}</em></p><ul>${stats.join('')}</ul>`
    + '<p>A bio-amp plugs into a biotic implant (or rests against the nervous system of a naturally biotic species, like the asari). Amps don\'t stack: if you wear more than one, you get only the highest of each bonus.</p>'
    + '<hr/><p><em>Wear it to gain its bonuses. Item bonuses from amps don\'t stack with other item bonuses to the same thing, such as a Power Amplifier\'s damage or a Biotic Feedback Generator\'s class DC. The Vanguard automation applies the Recharge and barrier bonus itself; other biotics count their cooldowns by hand.</em></p>';

  return {
    _id: id, _key: `!items!${id}`, folder: null, name, type: 'equipment', img: IMG,
    effects: [], flags: {}, ownership: { default: 0 },
    system: {
      description: { gm: '', value: description },
      rules,
      slug,
      _migration: { version: 0.955, lastMigration: null, previous: null },
      traits: { otherTags: [], value: ['biotic'], rarity: model.rarity },
      publication: { title: 'Mass Effect Compendium', authors: 'nscarpinatodev', license: 'ORC', remaster: true },
      level: { value: v.level },
      quantity: 1,
      baseItem: 'biotic-amp',
      bulk: { value: 0 },
      price: { value: { gp: PRICE[v.level] } },
      equipped: { carryType: 'worn', invested: null },
      usage: { value: 'worn' },
      identification: {
        status: 'identified',
        unidentified: { name: 'Unknown Bio-Amp', img: 'systems/pf2e/icons/unidentified_item_icons/worn-item.webp', data: { description: { value: '' } } },
        misidentified: {},
      },
      subitems: [],
      specific: null,
    },
  };
}

const ids = new Set();
for (const model of MODELS) {
  for (const [i, v] of model.versions.entries()) {
    const item = amp(model, v, i);
    if (ids.has(item._id)) throw new Error(`duplicate id ${item._id}`);
    ids.add(item._id);
    await writeFile(join(DIR, `${item.system.slug}.json`), `${JSON.stringify(item, null, 2)}\n`);
    console.log(`${item.system.slug.padEnd(24)} L${String(v.level).padEnd(3)} ${item.name}`);
  }
}
console.log(`${ids.size} amps written`);
