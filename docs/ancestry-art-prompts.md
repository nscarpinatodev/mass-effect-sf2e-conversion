# Ancestry Banner Art Prompts

Wide cinematic banners for the 12 playable ancestries, used as the hero image on each
ancestry page in `docs/mass-effect-starfinder-2e-conversion.html` and embedded at the top of
each ancestry item's description in `me-ancestries`.

**Target:** 21:9, 2K, Nano Banana Pro (`nano-banana-pro` / `text2image`) — 40 credits each.
Output is 3168×1344 PNG. (The first pass used `nano-banana-2` at 30 credits; Pro was noticeably
better on lighting and alien facial anatomy, so the shipped set is Pro.)
**Save as:**
- `assets/img/ancestries/<slug>-banner.webp` — 1600px wide, WebP q80. Referenced by the
  header block injected into each ancestry item's description.
- `docs/images/ancestries/<slug>.jpg` — 1400px wide, JPEG q82. Used by the HTML/MD docs.
  **JPEG, not WebP:** Chrome's PDF export passes JPEG through untouched but re-encodes WebP
  as lossless PNG, which took the PDF from 10.7 MB to 30 MB.

---

## Shared style suffix

Append to every prompt:

```
Mass Effect 3 concept art, cinematic ultra-wide establishing shot, in-game render aesthetic,
physically based materials with worn edges, volumetric light shafts, teal and amber colour
grade, shallow depth of field on the background, subtle film grain, sharp focus, high detail,
no text, no watermark, no logos, no HUD or UI elements, no border
```

**Negative prompt:** `text, watermark, signature, UI overlay, letterbox bars, blurry, lowres,
extra limbs, deformed anatomy, cartoon, anime, oil painting, modern-day clothing`

## Species anatomy reference

Most models render Mass Effect aliens badly without explicit anatomy. These lines are folded
into the individual prompts below.

- **Krogan** — massive reptilian humanoid; broad bony crest/hump over the skull, thick leathery
  hide, wide flat lipless mouth, small deep-set eyes, no external nose, hunched shoulders.
- **Batarian** — humanoid with **four eyes in two stacked horizontal pairs**, grey-brown ridged
  skin, broad flat face, heavy brow ridges, no external ears.
- **Turian** — avian-reptilian; grey plated carapace face, two mandibles flanking the jaw, a
  fringe of backswept spurs on the skull, digitigrade legs, painted colony markings.
- **Salarian** — tall and very slender amphibian; elongated skull with two backswept horns,
  huge dark eyes, wide lipless mouth, long thin fingers.
- **Elcor** — massive six-limbed quadruped; thick grey pachyderm hide, low broad head held
  near the ground, tiny eyes, no visible neck.
- **Hanar** — floating jellyfish; bell-shaped translucent body, six long trailing tentacles,
  pink-violet bioluminescence pulsing along the limbs, no face.
- **Volus** — short and rotund; fully enclosed pressure suit, spherical helmet with a single
  wide lens, corrugated breathing hoses at the throat.
- **Vorcha** — gaunt hunched humanoid; ridged skull with backswept flaps, needle teeth in a
  wide jaw, mottled pink-grey skin, sunken eyes.
- **Quarian** — slender, fully sealed envirosuit with a tinted faceplate showing only two
  glowing eyes, layered cloth hood and wraps over the suit, three-toed boots.
- **Drell** — lean humanoid with green-and-black (or red-and-black) scaled skin, large black
  eyes, no external nose, ridged brow and cheek scales.

---

## 1. Asari — `asari`

```
A sunlit plaza on Thessia, three asari walking together: tall blue and violet skinned
humanoid women with smooth ridged head crests instead of hair, wearing sleek layered
biotic-commando armour and flowing formal robes, one trailing faint blue biotic light from
her hand, elegant organic spire architecture and hanging gardens rising behind them
```

## 2. Batarian — `batarian`

```
A smoky freight dock on Khar'shan, a group of batarians loading cargo: broad-shouldered
humanoids with four eyes arranged in two stacked horizontal pairs, grey-brown ridged skin
and heavy brow ridges, wearing scavenged plate armour and long leather coats, one glaring
directly at the viewer, hazy orange industrial light and hanging chains behind them
```

## 3. Drell — `drell`

```
A rain-slick temple terrace on Kahje above a vast ocean, two drell standing at the railing:
lean humanoids with green-and-black scaled skin, large black eyes and ridged brow scales,
wearing tight dark leather assassin's garb with a high collar, one in mid-motion vaulting the
rail, domed hanar arcology lights glowing through the sea mist behind them
```

## 4. Elcor — `elcor`

```
A dusty caravan trail on Dekuuna, two elcor moving slowly across the frame: enormous
six-limbed quadrupedal aliens with thick grey pachyderm hide, broad low-slung heads held
near the ground and tiny deep-set eyes, heavy cargo harnesses and strapped crates across
their backs, tall golden grass and distant low mesas behind them
```

## 5. Hanar — `hanar`

```
An ocean arcology on Kahje at dusk, three hanar drifting above a flooded walkway: large
floating jellyfish aliens with translucent bell-shaped bodies and six long trailing
tentacles, pink and violet bioluminescence pulsing along their limbs and lighting the water
below, glass domes and rain sheeting off them, deep blue water and cloud behind
```

## 6. Human — `human`

```
The hangar deck of a Systems Alliance frigate, four human soldiers in matte black and grey
N7-pattern hardsuits with red-and-white stripe accents standing at ease around a shuttle
ramp, helmets under arms, mixed ages and ethnicities, blue Alliance deck lighting, a
planet visible through the open bay shield behind them
```

## 7. Krogan — `krogan`

```
The ruined concrete wastes of Tuchanka in a dust storm, three krogan advancing toward the
viewer: enormous reptilian humanoids with broad bony crests over the skull, thick leathery
hide, wide flat lipless mouths and small deep-set eyes, wearing battered red and bronze
plate armour, shotguns held low, collapsed skyscraper skeletons behind them
```

## 8. Quarian — `quarian`

```
A crowded liveship deck in the Migrant Fleet, four quarians at a repair bay: slender figures
in fully sealed envirosuits with tinted faceplates showing only two glowing eyes, layered
purple and grey cloth hoods and wraps over the suits, one crouched with an orange holographic
omni-tool lighting the frame, tangled conduit and improvised habitation modules behind them
```

## 9. Salarian — `salarian`

```
A terraced jungle research facility on Sur'Kesh, three salarians in conversation: tall very
slender amphibian aliens with elongated skulls and two backswept horns, huge dark eyes and
wide lipless mouths, wearing white and green lab overcoats and light STG armour, one
gesturing mid-sentence, glass walkways and dense green canopy behind them
```

## 10. Turian — `turian`

```
A barracks parade ground on Palaven, three turian soldiers standing in formation:
avian-reptilian humanoids with grey plated carapace faces, two mandibles flanking the jaw
and a fringe of backswept skull spurs, blue and white colony markings painted on their
faces, digitigrade legs, wearing dark blue hierarchy combat armour, rifles shouldered,
the shattered moon of Palaven low in a bright hazy sky behind them
```

## 11. Volus — `volus`

```
A trading floor in the Citadel financial district, two volus mid-negotiation: short rotund
aliens in fully enclosed pressure suits with spherical helmets, a single wide glowing lens
and corrugated breathing hoses at the throat, gesturing at a floating holographic market
display, tall polished corridors and the curve of the Citadel arm through a window behind
```

## 12. Vorcha — `vorcha`

```
A grimy neon-lit maintenance tunnel on Omega, three vorcha crowded toward the viewer: gaunt
hunched humanoids with ridged skulls and backswept head flaps, needle teeth in wide jaws,
mottled pink-grey skin and sunken eyes, wearing welded scrap armour and breather rigs, one
holding a jury-rigged flamethrower, dripping pipes and flickering red signage behind them
```
