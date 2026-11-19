# Mass Effect Compendium

A Foundry VTT module that brings the Mass Effect universe to the **Starfinder 2e** tabletop system. Play as an Asari Justicar, outfit your squad with Cerberus armor and Geth plasma shotguns, and face down a Thresher Maw — with full rules support.

---

## Requirements

| Software | Minimum | Verified |
|----------|---------|---------|
| Foundry VTT | v14 | v14 |
| Starfinder 2e | 1.0 | 1.1.1 |

The module is built for the Starfinder 2e system. It no longer ships Pathfinder 2e packs: 2.2.0-rc.6 is the last release that has them, and a Pathfinder world should stay on it.

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
- **Heritages** — Multiple heritages per ancestry covering cultural and physiological variation
- **Ancestry Feats** — Ancestry-specific feats and features
- **Backgrounds** — Alliance Soldier, Citadel Bureaucrat, Infiltrator, Mercenary, Smuggler, Omega, and more
- **Classes** — Mass Effect class conversions with full progression tables
- **Combat Passives** — Passive combat abilities tied to classes and training

### Gear
- **Weapons** — 29 weapons covering pistols, SMGs, assault rifles, shotguns, sniper rifles, and heavy weapons (M-8 Avenger, M-92 Mantis, M-920 Cain, and many more)
- **Weapon Mods** — Scope, barrel, and stock modifications
- **Armors** — 15+ armor sets in Light, Medium, and Heavy variants (Assassin, Colossus, Explorer, Gladiator, Kestrel, and more)
- **Armor Mods** — Kinetic shield upgrades and armor enhancements
- **Shields** — Kinetic barrier equipment items
- **Grenades** — Frag, incendiary, cryo, and tech grenades

### Combat Systems
- **Biotic Powers** — Pull, Throw, Warp, Singularity, Charge, Nova, and more
- **Tech Powers** — Incinerate, Cryo Blast, Overload, AI Hacking, Tactical Scan, and more
- **Ammo Powers** — Incendiary, Cryo, Disruptor, Warp, and Armor-Piercing ammo

### GM Content
- **NPCs** — 60+ named and generic NPCs across all major factions and species, including full companion stat blocks (Garrus, Tali, Liara, Mordin, Thane, Grunt, Legion, Samara, Jack, Wrex, and more)
- **Creatures** — 37 creatures covering Reaper forces (Husk, Brute, Banshee, Marauder, Praetorian), Geth units, Collectors, mechs (LOKI, Rampart, YMIR, Atlas), and wildlife (Varren, Thresher Maw, Klixen)
- **Vehicles & Ships** — Ground vehicles and starship stat blocks

---

## Module Systems

### Kinetic Shield System

All actors equipped with a **Kinetic Shield** item gain an active barrier that absorbs incoming damage before HP is affected. Shields:

- Are displayed as a temporary HP bar on the actor sheet
- Recharge automatically at the start of each turn (regeneration rate varies by shield tier)
- Can be upgraded with **Shield HP Mod** items that increase maximum capacity
- Are bypassed by certain damage types (configurable per shield item via flags)

Shield items use the `mass-effect-sf2e-conversion` flag namespace:
```json
"flags": {
  "mass-effect-sf2e-conversion": {
    "shieldMax": 40,
    "shieldRegen": 12
  }
}
```

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
