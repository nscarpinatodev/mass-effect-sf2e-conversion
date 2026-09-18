# NPC Art Generation Prompts

Prompts for the 14 NPCs in `me-npcs` that have no canonical BioWare art. Written to match
the house style established by the installed portraits: head-and-shoulders bust, transparent
background, ME3-era in-game render look.

**Workflow:** generate → save as `assets/img/npcs/<slug>.png` → the slug is listed with each
entry → then run `npm run build` and re-sync. If you also produce a full-body render, save it
as `<slug>-token.png`; the Alliance N7 / MP-kit NPCs use that split (bust = sheet portrait,
full body = token).

---

## Shared style suffix

Append this to every prompt (or set it as a global style/preset):

```
Mass Effect 3 character render, head-and-shoulders bust portrait, three-quarter view,
subject centered, cinematic game-render style, physically based armor materials with
worn edges and subtle scratches, soft key light with a warm orange rim light from behind,
transparent background, sharp focus, high detail, no text, no watermark, no logos other
than those described, no border
```

**Negative prompt:** `full body, wide shot, multiple characters, text, watermark, signature, blurry, lowres, extra limbs, deformed anatomy, cartoon, anime, oil painting`

---

## Species anatomy reference

Give the generator these — most models render ME aliens poorly without them.

- **Krogan** — massive reptilian humanoid; broad bony head crest/hump over the skull, thick
  leathery hide, wide flat lipless mouth, small deep-set eyes, no external nose, heavy
  hunched shoulders. Think armored bipedal tortoise-crocodile.
- **Batarian** — humanoid with **four eyes in two stacked horizontal pairs**, grey-brown
  ridged skin, broad flat face, heavy brow ridges, small blunt teeth, no external ears.

---

## Cerberus (ME3 palette: white and black armor, gloss finish, amber-yellow glowing optics)

### 1. Cerberus Riot Trooper — `cerberus-riot-trooper.png`
```
A Cerberus riot trooper, human soldier in glossy white-and-black Cerberus combat armor with
amber-yellow glowing visor slits on a full-face helmet, holding the top edge of a heavy
matte-black ballistic riot shield angled across the chest, an electrified stun baton crackling
with blue arcs in the other hand, reinforced shoulder plates, disciplined military posture
```

### 2. Cerberus Technician — `cerberus-technician.png`
```
A Cerberus maintenance technician, human, no helmet, tired focused face, wearing a white and
black Cerberus jumpsuit uniform with a small amber Cerberus insignia on the chest and utility
harness over it, sleeves pushed up, an orange holographic omni-tool projected around the
forearm casting warm light on the face, technician rather than soldier
```
> Note: per your earlier direction this one is a **civilian in Cerberus uniform**, not a combatant.

---

## Eclipse (palette: bright yellow and black, silver trim)

### 3. Eclipse Enforcer — `eclipse-enforcer.png`
```
An Eclipse mercenary enforcer in a bulky powered exoskeleton, heavy yellow-and-black armor
plating with silver trim, oversized armored pauldrons and reinforced neck guard, sealed
helmet with a narrow glowing orange visor, the nozzle and pilot flame of a shoulder-mounted
incendiary flamethrower visible at the edge of frame, imposing walking-bunker silhouette
```

---

## Blood Pack (palette: deep red, oxblood, dark brown; crude scavenged plating)

### 4. Ganar Wrang — `ganar-wrang.png`
```
A veteran krogan mercenary lieutenant of the Blood Pack. Massive reptilian humanoid with a
broad bony head crest, thick leathery grey-green hide, deep facial scars, small hard eyes,
wide lipless mouth. Wearing battered deep-red and oxblood Blood Pack armor with crude welded
plating and scavenged metal, heavy shoulder guards, brutal and confident expression
```

---

## Systems Alliance (palette: navy blue, white, grey; N7 red-white-black stripe for special forces)

### 5. Alliance Officer — `alliance-officer.png`
```
A Systems Alliance commissioned officer, human, no helmet, composed authoritative expression,
wearing a navy-blue and grey Alliance service uniform with rank insignia at the collar and the
Systems Alliance emblem on the shoulder, close-cropped regulation hair, disciplined military
bearing, faint holographic display glow from off-screen
```

### 6. Alliance Medic — `alliance-medic.png`
```
A Systems Alliance field medic, human, wearing navy-blue and white Alliance armor with a white
medical cross marking on the shoulder plate, helmet off or visor raised, focused urgent
expression, an orange holographic omni-tool active at the wrist, a medi-gel dispenser canister
clipped to the chest harness, faint battlefield haze behind
```

### 7. Alliance Combat Engineer — `alliance-combat-engineer.png`
```
A Systems Alliance combat engineer, human, navy-blue and grey Alliance armor with utility
pouches and tool clips across the chest rig, visor up showing a concentrating face, a bright
orange holographic omni-tool unfolded around the forearm, a small glowing blue spherical
combat drone hovering just behind the shoulder
```

---

## Generic troops (faction-neutral: grey, gunmetal, olive; no faction insignia)

Keep these deliberately unbranded so a GM can reskin them to any faction.

### 8. Human Veteran — `human-veteran.png`
```
A battle-hardened human veteran soldier and squad leader, mid-40s, weathered scarred face with
a hard steady gaze and short greying stubble, no helmet, wearing well-used unmarked gunmetal-grey
combat armor with visible repairs and scuffed plating, assault rifle sling strap across the chest,
calm and dangerous
```

### 9. Shock Trooper — `generic-shock-trooper.png`
```
An aggressive close-assault shock trooper, human, heavy unmarked dark-grey combat armor with
reinforced chest and shoulder plates, full-face helmet with a narrow horizontal blue visor,
combat shotgun held upright close to the body, forward-leaning aggressive stance
```

### 10. Heavy Gunner — `generic-heavy-gunner.png`
```
A heavy weapons trooper, human, bulky reinforced olive-grey armor with an armored collar and
thick shoulder plating, full-face helmet with amber visor, a belt-fed light machine gun braced
across the chest with an ammunition belt feeding into it, heavy immovable stance
```

### 11. Combat Medic — `generic-combat-medic.png`
```
A field combat medic, human, practical unmarked grey-and-white armor with a medical marking on
the shoulder, helmet off, alert compassionate expression, orange holographic omni-tool glowing at
the wrist, medi-gel canisters on the chest harness, sidearm holstered at the hip
```

### 12. Militia Recruit — `human-militia-recruit.png`
```
A young colonial militia recruit, human, late teens or early twenties, frightened but determined
expression, no helmet, wearing ill-fitting mismatched surplus body armor over civilian clothes,
gripping a pistol awkwardly with both hands too close to the chest, green and untrained
```

### 13. Human Civilian — `human-civilian.png`
```
An ordinary human civilian colonist in a 22nd-century setting, no armor and no weapons, wearing
simple practical work clothes — a utilitarian jacket over a plain shirt — tired everyday face,
weary but resilient expression, ordinary person rather than a soldier
```

---

## Batarian

### 14. Batarian Trader — `batarian-trader.png`
```
A batarian black-market trader. Humanoid alien with FOUR EYES arranged in two stacked horizontal
pairs, grey-brown ridged leathery skin, broad flat face with heavy brow ridges, no external ears.
Wearing a merchant's layered civilian coat with a high collar over a utility vest, several rings
and a data-slate tucked under one arm, shrewd calculating half-smile, appraising the viewer.
NOT armored, NOT a soldier — a fence and dealer
```
> Note: the previous image for this NPC was deleted at your request; this prompt deliberately
> specifies a merchant rather than the armored batarian soldier the wiki kit art depicts.

---

## After generating

```bash
# drop files into assets/img/npcs/ named exactly as the slug above, then:
npm run build
# sync to Foundry:
#   packs/me-npcs + packs/sf2e-me-npcs  →  %LOCALAPPDATA%/FoundryVTT/Data/modules/mass-effect-sf2e-conversion/packs/
#   assets/img/npcs/*.png               →  …/modules/mass-effect-sf2e-conversion/assets/img/npcs/
```

The actor JSON `img` and `prototypeToken.texture.src` fields still point at
`icons/svg/mystery-man.svg` for these 14 — they need repointing once the art exists.
