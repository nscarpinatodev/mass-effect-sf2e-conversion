import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";

const PACKS = [
  { src: "src/packs/me-ancestries",     dest: "packs/me-ancestries" },
  { src: "src/packs/me-heritages",      dest: "packs/me-heritages" },
  { src: "src/packs/me-ancestry-feats", dest: "packs/me-ancestry-feats" },
  { src: "src/packs/me-backgrounds",    dest: "packs/me-backgrounds" },
  { src: "src/packs/me-npcs",           dest: "packs/me-npcs" },
  { src: "src/packs/me-creatures",      dest: "packs/me-creatures" },
  { src: "src/packs/me-armors",         dest: "packs/me-armors" },
  { src: "src/packs/me-armor-mods",     dest: "packs/me-armor-mods" },
  { src: "src/packs/me-weapons",        dest: "packs/me-weapons" },
  { src: "src/packs/me-weapon-mods",    dest: "packs/me-weapon-mods" },
  { src: "src/packs/me-vehicles",       dest: "packs/me-vehicles" },
  { src: "src/packs/me-ships",          dest: "packs/me-ships" },
  { src: "src/packs/me-shields",        dest: "packs/me-shields" },
  { src: "src/packs/me-ammo-powers",    dest: "packs/me-ammo-powers" },
  { src: "src/packs/me-biotic-powers",  dest: "packs/me-biotic-powers" },
  { src: "src/packs/me-tech-powers",    dest: "packs/me-tech-powers" },
  { src: "src/packs/me-grenades",       dest: "packs/me-grenades" },
  { src: "src/packs/me-items",          dest: "packs/me-items" },
  { src: "src/packs/me-classes",          dest: "packs/me-classes" },
  { src: "src/packs/me-combat-passives",      dest: "packs/me-combat-passives" },
  { src: "src/packs/me-class-progressions",  dest: "packs/me-class-progressions" },
];

const SF2E_PACKS = PACKS.map(({ src, dest }) => ({
  src,
  dest: dest.replace("packs/", "packs/sf2e-"),
  sf2e: true,
}));

// The same src compiles into both the PF2e (me-*) and SF2e (sf2e-me-*) pack
// families. Source references (compendiumSource / sourceId) are authored
// pointing at the me-* packs; when building the SF2e variants we rewrite them
// to the matching sf2e-me-* pack so each system self-references correctly.
const SF2E_SOURCE_RX = /(Compendium\.mass-effect-sf2e-conversion\.)(me-)/g;

// Content also hard-codes `systems/pf2e/...` icon paths (strike/action glyphs,
// feat & background icons, unidentified-item art). Those files don't exist for a
// user running SF2e without PF2e installed, so the SF2e build repoints them at
// the SF2e system, which ships the same icon set under the same names — with two
// exceptions that must be mapped explicitly.
const SF2E_ASSET_EXCEPTIONS = {
  "systems/pf2e/icons/unidentified_item_icons/worn-item.webp":
    "systems/sf2e/icons/unidentified_item_icons/worn-items.webp", // sf2e uses the plural
  "systems/pf2e/icons/spells/mystic-armor.webp":
    "systems/sf2e/icons/spells/instant-armor.webp",
};
const SF2E_ASSET_RX = /systems\/pf2e\//g;

// SF2e denominates prices in Credits, which the system stores in `price.value.sp`
// (its lang maps PF2E.Currency.credits -> "Credits", and its own equipment pack
// uses {sp: N} almost exclusively). Source is authored in PF2e coin, so the SF2e
// build folds every denomination down to a single sp total: 1 Credit = 1 sp,
// 10 sp = 1 gp, 10 gp = 1 pp, 10 cp = 1 sp.
const COIN_TO_SP = { pp: 100, gp: 10, sp: 1, cp: 0.1 };

function toCredits(priceValue) {
  let total = 0, found = false;
  for (const [coin, mult] of Object.entries(COIN_TO_SP)) {
    const n = priceValue[coin];
    if (typeof n === "number" && n !== 0) { total += n * mult; found = true; }
  }
  if (!found) return null;
  // Guard against float drift from cp (0.1) without truncating real values.
  total = Math.round(total * 100) / 100;
  return { sp: total };
}

function rewriteSf2eSources(value) {
  if (typeof value === "string") {
    const mapped = SF2E_ASSET_EXCEPTIONS[value];
    if (mapped) return mapped;
    return value
      .replace(SF2E_ASSET_RX, "systems/sf2e/")
      .replace(SF2E_SOURCE_RX, "$1sf2e-me-");
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => { value[i] = rewriteSf2eSources(v); });
    return value;
  }
  if (value && typeof value === "object") {
    // Convert `price: { value: {...coin} }` in place before recursing.
    const pv = value.price?.value;
    if (pv && typeof pv === "object" && !Array.isArray(pv)) {
      const credits = toCredits(pv);
      if (credits) value.price.value = credits;
    }
    for (const k of Object.keys(value)) value[k] = rewriteSf2eSources(value[k]);
    return value;
  }
  return value;
}

for (const { src, dest, sf2e } of [...PACKS, ...SF2E_PACKS]) {
  try {
    await fs.access(src);
  } catch {
    console.warn(`Skipping ${src} (not found)`);
    continue;
  }
  console.log(`Compiling ${src} → ${dest}`);
  await compilePack(src, dest, {
    recursive: true,
    transformEntry: sf2e ? (entry => { rewriteSf2eSources(entry); }) : undefined,
  });
}

console.log("\n✓ Build complete.");
