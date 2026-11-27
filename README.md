# Mass Effect Compendium

A Foundry VTT module that brings the Mass Effect universe to the **Starfinder 2e** tabletop system. Play as an Asari Justicar, outfit your squad with Cerberus armor and Geth plasma shotguns, and face down a Thresher Maw — with full rules support.

---

## Requirements

| Software | Minimum | Verified |
|----------|---------|---------|
| Foundry VTT | v14 | 14.371 |
| Starfinder 2e | 1.7.1 | 1.7.1 |

It also needs the free [Scorpious187's Lib](https://github.com/nscarpinatodev/scorpious187s-lib) module, which Foundry offers to install with it. Optional: **Sequencer** with **JB2A** for the Biotic Charge and Nova animations, and **Tokenizer 2** to frame tokens as they are dropped.

**Starfinder 2e only.** From 3.0.0 the module no longer ships Pathfinder 2e packs. 2.2.0-rc.6 is the last release that has them, and a Pathfinder world should stay on it.

**Updating a world from 2.x.** The first time a Gamemaster opens the world, the module brings existing player characters up to date (halved kinetic shields, the changed class features, Unity, Warp) and replaces item icons that pointed at files that do not exist. It lists what it changed. NPCs already in the world keep their old numbers: re-import them from the compendium. Biotic cooldowns now come from a bio-amp, so give each biotic character one.

---

## Installation

**Via manifest URL:**
1. In Foundry, go to **Add-on Modules → Install Module**
2. Paste the manifest URL into the search bar:
   ```
   https://github.com/nscarpinatodev/mass-effect-sf2e-conversion/releases/latest/download/module.json
   ```
3. Click Install, then enable the module in your world

**Manual:**
Download the latest release zip, extract it into your Foundry `Data/modules/` folder, and restart Foundry.

---

## What's Included

### Player Options
- **Ancestries** — Asari, Batarian, Drell, Elcor, Hanar, Human, Krogan, Quarian, Salarian, Turian, Volus, Vorcha
- **Heritages** — 44 heritages across the twelve ancestries, covering cultural and physiological variation
- **Ancestry Feats** — 77 ancestry feats, with 14 each for Asari and Turian
- **Backgrounds** — 23 backgrounds: Alliance Soldier, Citadel Bureaucrat, Infiltrator, Mercenary, Smuggler, Omega, and more
- **Classes** — Soldier, Engineer, Adept, Vanguard, Infiltrator and Sentinel, each with a 1st-to-20th progression and its own class feats
- **Combat Passives** — Class masteries, weapon and armor training, Fitness, and the other passive lines the classes draw on

### Gear
- **Weapons** — 65 weapons covering pistols, SMGs, assault rifles, shotguns, sniper rifles, and heavy weapons (M-8 Avenger, M-92 Mantis, M-920 Cain, and many more)
- **Weapon Mods** — 24 scope, barrel, and stock modifications
- **Armors** — 55 armors in Light, Medium, and Heavy variants (Assassin, Colossus, Explorer, Gladiator, Kestrel, and more)
- **Armor Mods** — 29 mods, including shield capacitors, recharge modules and power amplifiers
- **Shields and Frames** — The Kinetic Shield, its capacity and recharge mods, and four Combat Armor Frames
- **Bio-Amps** — 16 amps across seven makers (Solaris, Gemini, Unity, Polaris, Prodigy, Savant, HMBA). The amp a biotic wears sets how fast biotic powers cool down, and the stronger ones add power damage, class DC and barrier HP
- **Grenades** — Arc, cluster, cryo, incendiary and lift grenades, and the proximity mine
- **Medi-Gel and Omni-Gel** — Medi-gel in five grades, and omni-gel

### Combat Systems
- **Biotic Powers** — Pull, Throw, Warp, Singularity, Charge, Nova, Unity, and more
- **Tech Powers** — Incinerate, Cryo Blast, Overload, AI Hacking, Tactical Cloak, Combat Drone, and more
- **Ammo Powers** — Incendiary, Cryo, Disruptor, Warp, Armor-Piercing, Phasic and Shredder rounds, for ranged Strikes

### GM Content
- **NPCs** — 172 named and generic NPCs across eleven factions, including full companion stat blocks (Garrus, Tali, Liara, Mordin, Thane, Grunt, Legion, Samara, Jack, Wrex, and more)
- **Creatures** — 38 creatures covering Reaper forces (Husk, Brute, Banshee, Marauder, Praetorian), Geth units, Collectors, mechs (LOKI, Rampart, YMIR, Atlas), and wildlife (Varren, Thresher Maw, Klixen)
- **Vehicles & Ships** — 9 ground vehicles and 10 starship stat blocks

---

## Module Systems

### Shields, Barriers and Armor

Damage is taken by each defensive layer in turn, and the module applies this whenever damage is dealt:

**Biotic Barrier → Kinetic Shield → Combat Armor Frame → Hit Points**

- **Kinetic Shield** — Shown as temporary HP. The baseline shield holds 15 Shield HP and recharges 5 at the start of each turn, after 1 round without damage. A single hit worth more than half the shield's maximum collapses it, and a shield at 0 stays down until its wearer Takes Cover. Shield HP Mods and Regen Mods raise both numbers.
- **Biotic Barrier** — Raised with Activate Biotic Barrier for 5 HP per two levels (rounded up), plus any bio-amp bonus. It does not recharge on its own; Biotic Charge refills it.
- **Combat Armor Frame** — 20 to 200 Armor Points that do not come back. A spent frame is destroyed.
- **Counters** — Each ammo power is tuned against one layer: Disruptor Rounds double damage to shields, Warp Rounds deal 1.5× to barriers, Incendiary Rounds burn armor 1.5× faster. The Warp power counts double against a barrier and 1.5× against armor, and a critical failure against it detonates the barrier. Incinerate counts 1.5× against armor. Every multiplier is a module setting.

Tokens show a purple barrier bar and a yellow armor bar beside HP.

Shield items use the `mass-effect-sf2e-conversion` flag namespace:
```json
"flags": {
  "mass-effect-sf2e-conversion": {
    "shieldMax": 15,
    "shieldRegen": 5
  }
}
```

### Power Automation

Biotic and tech powers are feats with a save button. When the target rolls, the module applies the result for its degree of success: damage through the layers above, persistent damage, conditions, forced movement, and each power's own extras. It also:

- puts each power's **cooldown** on the sheet as an effect and refuses a second use while it runs. Biotic cooldowns are 4 rounds less the worn bio-amp's Recharge; tech cooldowns come from Intelligence (or Charisma for a Sentinel)
- scales every power's dice with the user's level, for players and NPCs alike
- runs the Vanguard's Biotic Charge and Nova in one click, with optional animations
- deploys the Engineer's Combat Drone and Sentry Turret as tokens that scale with the Engineer
- sets off the Adept's Biotic Explosions when a detonating power damages a Primed creature
- adds Unity to its owner's sheet as a focus spell that heals, recharges shields and revives

Automation is on by default and can be turned off in module settings.

### Datapad

Journal entries can be shown in a Mass Effect datapad. A Gamemaster can push an entry or a single page to every player with **Show in Datapad**; each player sees it only if they are allowed to read it.

### Paragon / Renegade Tracker

A GM tool for tracking the morality scores of party members across the Paragon (blue) and Renegade (red) scales, mirroring the moral choice system from the games.

**Opening the tracker:**
- Click the scale icon in the left Scene Controls toolbar
- Or run `MassEffectPR.open()` in the browser console

**Features:**
- Tracks all party members plus any manually added actors
- Adjusts scores with ±1/±2/±5 buttons or a direct Set field
- Automatically grants and removes perk items as score thresholds are reached (20 / 40 / 60 / 80 / 100)
- Activatable tier abilities (Inspiring Voice, Beacon of Hope, Noble Sacrifice at Paragon 40/60/80; Ruthless Efficiency, Command Through Fear, Uncompromising at Renegade 40/60/80)
- Hover perk chips for effect descriptions
- Score changes are whispered to the GM as chat messages
- Tier ability uses reset automatically on long rest (Rest for the Night)
- Actors can be ignored (hidden from the tracker) or manually added if not in the party
- Players can open the tracker to view their own scores (read-only)

**Paragon perks:**

| Score | Perk | Effect |
|-------|------|--------|
| 20 | Trusted Presence | +1 circumstance to Diplomacy |
| 40 | Inspiring Voice | Fortune on Diplomacy or Medicine (1/day) |
| 60 | Beacon of Hope | +2 circumstance to Diplomacy for Impression/Request (1/day, 1 min) |
| 80 | Noble Sacrifice | Set ally from 0 to 1 HP; you take level damage (1/day reaction) |
| 100 | Living Legend | +1 status to Diplomacy and Medicine |

**Renegade perks:**

| Score | Perk | Effect |
|-------|------|--------|
| 20 | Fearsome Reputation | +1 circumstance to Intimidation |
| 40 | Ruthless Efficiency | Fortune on Intimidation or Deception (1/day) |
| 60 | Command Through Fear | +2 circumstance to Intimidation when Coercing (1/day, 1 min) |
| 80 | Uncompromising | +2 to attack rolls; treat cover one step lower (1/day, 1 round) |
| 100 | Infamous | +1 status to Intimidation and Deception |

---

## Homebrew Traits

The module registers the following homebrew traits for the system:

**Creature traits:** Asari, Batarian, Drell, Elcor, Hanar, Krogan, Quarian, Salarian, Turian, Volus, Vorcha, Husk, Reaper, Geth, Cerberus, Collector, Mech, Vehicle, Ship, Alliance, Varren, Thresher Maw, Klixen, Aircraft

**Feat/action traits:** Asari, Batarian, Biotic, Drell, Elcor, Hanar, Human, Krogan, Quarian, Salarian, Tech, Turian, Volus, Vorcha

**Languages:** Thessian, Batarian, Drell, Elcor, Hanar, Krogan, Khelish (Quarian), Salarian, Turian, Volus, Vorcha

---

## Credits

Created by **Scorpious187**

Mass Effect is a trademark of Electronic Arts Inc. This is an unofficial fan project for personal and community use. No copyright infringement intended.

Licensed under ORC.
