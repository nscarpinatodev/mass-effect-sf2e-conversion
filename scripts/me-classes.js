'use strict';
// ============================================================
// MASS EFFECT CLASSES — trait registration
// ------------------------------------------------------------
// The six ME classes are real `class` items whose slugs double
// as traits on their class feats. Neither PF2e nor SF2e knows
// five of them (both already have "soldier" and "tech"), so the
// labels are registered here. Without them the feat browser's
// class filter has nothing to offer, and the traits show as raw
// slugs on feat cards.
// ============================================================

const ME_CLASS_TRAITS = {
  adept: 'Adept',
  engineer: 'Engineer',
  infiltrator: 'Infiltrator',
  sentinel: 'Sentinel',
  soldier: 'Soldier',
  vanguard: 'Vanguard',
};

const ME_FEAT_TRAITS = {
  biotic: 'Biotic',
  tech: 'Tech',
};

Hooks.once('init', () => {
  const config = CONFIG.PF2E;
  if (!config) return;

  // Never overwrite a label the system already ships ("soldier", "tech").
  for (const [slug, label] of Object.entries(ME_CLASS_TRAITS)) {
    config.classTraits[slug] ??= label;
    config.featTraits[slug] ??= label;
  }
  for (const [slug, label] of Object.entries(ME_FEAT_TRAITS)) {
    config.featTraits[slug] ??= label;
    config.actionTraits[slug] ??= label;
  }
});
