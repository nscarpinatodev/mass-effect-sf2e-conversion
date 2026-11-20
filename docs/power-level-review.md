# Power level review

Written 2026-11-19. Two questions: are this module's characters stronger, weaker or level with base Starfinder 2e characters of the same level, and is a 20th-level party balanced against level 20 Mass Effect enemies? The review itself changed nothing in the module, and everything up to "Rebalancing options" describes the module as it was before. The options were for a decision: option D (some of each) was chosen the same day, then narrowed to the tiered design in the last section, which was built into the module on 2026-11-19. That section says what went in.

**Correction, 2026-11-20.** The base SF2e figures in this review came from one main routine per class, not from each class's best feats. With searched builds the SF2e classes deal up to 90% more (the Mechanic about three times as much from 10th), so every "times an SF2e party" figure below overstates the module's lead: after the rebalance it is 1.6 to 1.75 times at 10th to 16th and 1.4 times at 20th, not 2.0 to 2.3 and 1.9. The fights the rebalance was tuned to still hold up. The last section, "Stock SF2e classes: searched builds, and the module's shield and guns", has the new figures; the sections in between are left as written.

Status words, as in `class-audit.md`: **confirmed** means read from the source files or the system's compendia; **checked in Foundry** means seen working in the test world (Foundry v14, SF2e 1.7.0, module 2.2.0-rc.6); **measured** means a simulation number; **arithmetic** means worked out by hand from confirmed numbers.

## Verdicts

**Against base SF2e: stronger, and by a wide margin from the middle levels.**
- Damage is about level at 1st, about 1.7 times a base SF2e party's at 5th, and 2.2 to 2.5 times from 10th to 20th on one target (1.8 to 2.1 times across three targets).
- Characters are also harder to kill at every level: a kinetic shield that comes back every fight, a Biotic Barrier for two classes, and armor that gives 1 to 3 more AC than SF2e armor.
- The only base SF2e build that comes near is a spellcaster spending its top spell slots on a group that stands still: level with the Adept across three targets on a one-fight day, 85% of it at four fights a day, 48% of it on one target.

**A 20th-level party against level 20 Mass Effect enemies: not balanced, and the enemies do not exist yet.**
- The module's highest enemy in its NPC and creature packs is level 16 (one Harvester). There is nothing there at 17th to 20th. (Correction, added at the build: the vehicles pack was not counted. It holds an Atlas Mech Mk.III at level 16 and a Mk.IV at level 19.)
- Level 18 to 24 enemies built the way the module builds its level 13 to 16 ones lose every simulated fight in 1 to 2.5 rounds and take off 0 to 10% of the party's Hit Points, up to and including fights budgeted as extreme (160 XP).
- A base SF2e party in the same fights takes 2 to 5 rounds, loses 13 to 75% of its Hit Points, and loses the hardest one about one time in five. That is what SF2e's encounter budgets are meant to feel like.

**The two answers point the same way.** The module's enemies and SF2e's creatures are close to each other (the module's are a little tougher, through shields and armor frames). It is the characters that sit well above both from about 8th level.

## Method

**The frame for damage.** The class audit's: four rounds, a same-level foe with moderate AC (14 + 1.5 x level, rounded down) and moderate saves, one primary target with two more adjacent, foes that never act, move or die. Levels 1, 5, 10, 15, 16 and 20.

**Module classes.** The audit's recorded numbers. Level 15, and every what-if in this report, come from reruns of the audit's simulators. Four of the six reproduce the audit's rows exactly (Vanguard, Adept, Sentinel, Soldier). The Engineer reproduces to within 8% and the Infiltrator to within 20%, because the exact settings behind those two rows were not recorded; where their reruns are used they are scaled to the audit's figures.

**Base SF2e classes.** A new simulator built from the system's own compendia (`sf2e.classes`, `class-features`, `feats`, `actions`, `spells`, `equipment`), read from the test world's pack files. It works out exact expected damage for each class's main routine:
- **Operative (Sniper):** Aim, Double Tap, Devastating Aim, Tactical Barrage, Kill Shot; an assassin rifle.
- **Soldier:** Area Fire or Auto-Fire with Primary Target, Brutal Barrage, Fan the Hammer, Overkill; a stellar cannon or machine gun.
- **Solarian:** Binaric Assault and a Strike; Plasma Ejection against a group; Supernova once a fight.
- **Mechanic (turret):** Coordinated Fire and a Strike, Explosive Shot.
- **Envoy:** Get 'Em! led by example, then a Strike.
- **Witchwarper (arcane spells):** Bombarding Emojis cast once and Sustained, a Thunderstrike or Lightning Bolt each round, cantrips when the slots run out.
- Assumptions that favor SF2e: weapons upgraded on the level each grade appears, an apex item at 17th, reloading ignored, the best routine chosen at each level.
- Not modeled: the Mystic and Technomancer separately, feats beyond those named, and what an Envoy adds to its allies.

**Fights at 20th.** A second new simulator with both sides acting. Characters deal the damage their class simulator measures, adjusted for each enemy's AC and saves (a table of 35 AC and save combinations per class). Enemies make Strikes with the multiple attack penalty, use one area power on a cooldown, and die. Damage to a character goes through Biotic Barrier, kinetic shield (with its collapse rule and its recharge) and Hit Points. A character at 0 Hit Points is out. 3,000 to 4,000 fights per row.
- Not modeled: healing, movement and range, cover, conditions, reactions, taking cover to restart a collapsed shield.
- Stunned, prone and off-guard from powers would help the module party further. Healing would help both parties.

**The simulators are scratch files, not in the repo.** Copies are in the sessions' shared notes folder under `power-level-review`.

## Part 1: against base Starfinder 2e

### 1.1 The assumed foe

The audit's simulators assume a foe; this compares it with the 754 creatures in the system's bestiary compendia (confirmed).

| Level | Assumed AC | Median real AC (creatures) | Assumed save | Real saves, low / middle / high | Assumed HP | Median real HP |
|---|---|---|---|---|---|---|
| 1 | 15 | 15 (52) | +7 | +4 / +7 / +9 | 20 | 20 |
| 5 | 21 | 21 (38) | +12 | +9 / +12 / +15 | 75 | 75 |
| 10 | 29 | 29 (15) | +19 | +17 / +19 / +22 | 175 | 180 |
| 13 | 33 | 33 (9) | +23 | +20 / +23 / +26 | 235 | 245 |
| 16 | 38 | 38 (5) | +28 | +25 / +28 / +30 | 295 | 300 |
| 19 | 42 | 43 (3) | +32 | +29 / +32 / +36 | 355 | 375 |
| 20 | 44 | 45 and 47 (2) | +33 | +32 / +34 / +38 | 375 | 375 and 440 |

- **The assumption holds.** AC, the middle save and HP match the published creature-building numbers and the real medians from 1st to 19th.
- **At 20th it is 1 to 3 AC low**, on a sample of two creatures (Oscriss, Dust Worm Augur).
- **A real creature has one weak save and one strong one**, 2 to 3 points either side of the assumed number. The simulators use the middle for everything.
- **Not in the assumption at all:** resistances and immunities. 12 of the 21 SF2e creatures of 17th level or higher have some.

What this does to the recorded class numbers (measured, one target):

| Change to the foe | Soldier | Vanguard | Adept | Engineer | Sentinel |
|---|---|---|---|---|---|
| As assumed, 20th | 196 | 224 | 245 | 226 | 146 |
| AC 1 higher | 171 | 216 | 245 | 226 | 146 |
| AC 3 higher | 130 | 204 | 245 | 226 | 146 |
| Its strong save (+3) | 196 | 192 | 194 | 178 | 119 |
| Its weak save (-3) | 196 | 265 | 294 | 272 | 181 |

- **Gun classes fall with AC**: the Soldier loses 13% for each point at 20th (11% at 15th to 16th). Against the two real level 20 creatures its recorded 196 is 130 to 171.
- **Power classes move with the save they hit**: about 20% down against a strong save, 20% up against a weak one. A class with several powers can usually pick, so the recorded numbers are fair or a little low for the Adept, Engineer and Sentinel.
- **None of this changes a ranking by more than one place**, and none of it closes the gap with SF2e below.

### 1.2 Damage a round

One target (measured). Module rows are the audit's; level 15 is from reruns.

| | 1 | 5 | 10 | 15 | 16 | 20 |
|---|---|---|---|---|---|---|
| **Module** | | | | | | |
| Vanguard (Nova Combo) | 22 | 50 | 90 | 153 | 146 | 224 |
| Adept | 11 | 35 | 101 | 151 | 171 | 245 |
| Engineer | 12 | 35 | 75 | 104 | 126 | 233 |
| Infiltrator (sniper) | 12 | 39 | 67 | 125 | 136 | 234 |
| Soldier (rifle) | 15 | 44 | 73 | 135 | 142 | 196 |
| Sentinel (powers) | 18 | 32 | 63 | 92 | 100 | 146 |
| **Base SF2e** | | | | | | |
| Operative (Sniper) | 16 | 37 | 39 | 65 | 65 | 96 |
| Solarian | 16 | 30 | 33 | 50 | 50 | 86 |
| Soldier | 9 | 21 | 32 | 51 | 55 | 74 |
| Witchwarper, 4 fights a day | 6 | 11 | 32 | 77 | 73 | 118 |
| Envoy | 11 | 23 | 22 | 38 | 38 | 37 |
| Mechanic (turret) | 6 | 20 | 18 | 37 | 37 | 33 |
| **Party of four** | | | | | | |
| Module: Soldier, Vanguard, Adept, Engineer | 60 | 164 | 339 | 543 | 585 | 898 |
| SF2e: Soldier, Operative, Solarian, Witchwarper | 47 | 99 | 136 | 243 | 243 | 374 |
| Module as a multiple of SF2e | 1.3 | 1.7 | 2.5 | 2.2 | 2.4 | 2.4 |

All three targets together (measured):

| | 1 | 5 | 10 | 15 | 16 | 20 |
|---|---|---|---|---|---|---|
| Vanguard (Nova Combo) | 22 | 68 | 141 | 223 | 208 | 455 |
| Adept | 15 | 57 | 155 | 239 | 267 | 386 |
| Engineer | 18 | 42 | 146 | 207 | 241 | 508 |
| Soldier (Frag Grenade and Carnage) | 14 | 41 | 79 | - | 170 | 257 |
| Sentinel (powers) | 23 | 37 | 83 | 119 | 131 | 232 |
| SF2e Witchwarper, 4 fights a day | 9 | 26 | 91 | 215 | 204 | 329 |
| SF2e Soldier | 17 | 37 | 73 | 118 | 118 | 178 |
| SF2e Solarian | 16 | 39 | 73 | 93 | 94 | 147 |
| SF2e Operative | 16 | 37 | 39 | 65 | 65 | 96 |
| Module party as a multiple of the SF2e party | - | - | 1.9 | - | 1.8 | 2.1 |

- **Level at 1st.** The best module class (Vanguard, 22) and the best SF2e class (Operative or Solarian, 16) are within a third of each other, and the weakest of each are level.
- **The gap opens between 4th and 10th.** Power dice double at 4th and triple at 8th, and the mastery chains and class DC gear arrive in the same levels. SF2e weapons gain their second die at 4th and nothing more until 12th.
- **From 10th the weakest module class matches or beats the best SF2e martial.** The Sentinel's 63 / 100 / 146 at 10th / 16th / 20th stands against the Operative's 39 / 65 / 96.
- **A module Soldier out-damages an SF2e Soldier by 2.3 to 2.6 times on one target** from 10th. They are the nearest like-for-like pair.
- **Dropping the apex item** takes the SF2e martials down a further 10 to 14% at 20th (Operative 86, Solarian 74, Soldier 71).

### 1.3 Cooldowns against spell slots

Module powers come back every fight. An SF2e caster's best spells do not. The Witchwarper's damage a round, by how many four-round fights it has in a day (measured):

| Fights a day | One target at 10 / 15 / 20 | Three targets at 10 / 15 / 20 |
|---|---|---|
| 1 | 56 / 100 / 143 | 157 / 277 / 400 |
| 2 | 48 / 92 / 135 | 136 / 257 / 376 |
| 3 | 39 / 84 / 126 | 110 / 236 / 353 |
| 4 (assumed elsewhere in this report) | 32 / 77 / 118 | 91 / 215 / 329 |
| 6 | 25 / 61 / 100 | 67 / 171 / 283 |
| 8 | 22 / 48 / 82 | 56 / 134 / 232 |
| Cantrips only | 13 / 19 / 28 | 23 / 36 / 50 |
| Module Adept, any number of fights | 101 / 151 / 245 | 155 / 239 / 386 |

- **Assumption used: four fights a day**, three or four being what the system's own guidance expects.
- **On one target the caster never gets close**: 58% of the Adept at 20th with a single fight in the day, 48% at four, 33% at eight.
- **Across three targets it does**: level with the Adept on a one-fight day, 85% at four fights, 60% at eight.
- **That three-target figure rests on one spell**, Bombarding Emojis, Sustained for a whole fight while all three foes stay inside a 10-foot burst. The Adept's figure rests on the same stillness.
- **Out of slots, a caster deals about a tenth of what an Adept does.** The module has no equivalent of running dry.
- **The module's own daily abilities** (Ascendant Form, Sentinel's Resolve) are not in any number here.

### 1.4 What a character can take

20th-level characters built in the test world from the module's classes, best armor at paragon grade, a Kinetic Shield with both Tier 4 mods (checked in Foundry):

| Class | HP | AC | Fortitude / Reflex / Will | Kinetic shield | Biotic Barrier | Class DC |
|---|---|---|---|---|---|---|
| Soldier | 332 | 47 | 35 / 34 / 30 | 100, recharging 30 | - | 42 |
| Vanguard | 288 | 45 | 33 / 32 / 31 | 100, recharging 30 | 50 | 44 |
| Sentinel | 288 | 47 (49 with Tech Armor) | 34 / 31 / 32 | 100, recharging 30 | - | 44 |
| Engineer | 248 | 46 | 31 / 33 / 34 | 100, recharging 30 | - | 46 |
| Infiltrator | 248 | 46 | 31 / 34 / 32 | 100, recharging 30 | - | 44 |
| Adept | 208 | 45 | 33 / 33 / 32 | 100, recharging 30 | 50 | 46 |

Base SF2e characters at 20th, worked out from the class tables and the system's armor (arithmetic, not built in Foundry): Soldier 348 HP and AC 47; Operative 248 and 44; Solarian 288 and 44; Witchwarper 238 and 42. None has a shield of this kind or a barrier.

**Hit Points are the same scale.** The module's classes give 6 to 10 a level, as SF2e's do.

**Armor gives more AC than SF2e armor** (confirmed):

| Armor, bonus plus Dexterity cap, before grade | Light | Medium | Heavy |
|---|---|---|---|
| Best in the module | 8 (Predator L) | 9 (Predator M) | 8 (Predator H, Kestrel) |
| Best in SF2e | 5 | 5 | 6 |
| Best at 1st level, module / SF2e | 6 / 5 | 6 / 5 | 5 / 6 |

- Module classes have lower armor proficiency than SF2e's (four of the six are still expert at 20th), which takes some of it back.
- Net, role for role at 20th: Adept 45 against the Witchwarper's 42; Infiltrator 46 against the Operative's 44; Vanguard 45 against the Solarian's 44; Soldier 47 against 47.
- At the levels where proficiency is the same for everyone (below 11th), the difference is the full 2 to 3 points once the better armor lines are worn.

**The kinetic shield is the largest difference at low levels** (confirmed prices and sizes; shares are arithmetic for a class with 8 HP a level):

| Level | Shield | As a share of the character's HP | Recharge a turn |
|---|---|---|---|
| 1 | 30 (150 credits) | 167% | 10 |
| 5 | 40 | 63% | 15 |
| 10 | 70 | 59% | 25 |
| 15 | 100 | 53% | 30 |
| 20 | 100 | 40% | 30 |

- At 1st level a same-level foe's Strike deals about 6. An 18-HP character drops to the third hit without a shield and to the eighth with one.
- The shield is full again at the start of every fight. Nothing in SF2e does that.
- **Biotic Barrier** adds 5 points per two levels for the Adept and Vanguard (50 at 20th). The Vanguard refills it with every Charge.
- **Combat frames** (20 to 200 armor points) have no price or level and appear only on enemies and vehicles, so they are not counted for characters.

**What the layers are worth at 20th** (measured, share of the party's HP lost in a fight; the four encounters are an 80 XP boss, an 80 XP group, 120 XP and 160 XP):

| Party and enemies | 80, boss | 80, group | 120 | 160 |
|---|---|---|---|---|
| SF2e party against SF2e creatures | 22% | 41% | 41% | 54% |
| The same, given a 100-point shield and 2 more AC | 10% | 15% | 19% | 31% |
| Module party against module-style enemies | 2% | 2% | 4% | 10% |
| The same, without shields or barriers | 12% | 16% | 21% | 31% |
| The same, with armor at SF2e's values (2 less AC) | 3% | 3% | 6% | 13% |
| The same, without either | 13% | 19% | 23% | 34% |

- **The shield and 2 AC halve the damage an SF2e party takes.**
- **The shield matters far more than the armor** at 20th.
- **Most of the module party's safety is its damage**: stripped of every layer it still loses only 13 to 34%, because the fight is over in two rounds.

## Part 2: level 20 fights inside the module

### 2.1 What the module has

210 stat blocks in `src/packs/me-npcs` and `src/packs/me-creatures`, levels 0 to 16 (confirmed). Not counted here, and missed when this was written: eight more in `src/packs/me-vehicles` (four Atlas Mechs at 9th, 13th, 16th and 19th, a Cerberus Gunship at 12th, and three party vehicles). By level: 87 at 1st to 5th, 68 at 6th to 10th, 21 at 11th to 12th, and eight above that. None at 17th to 20th.

The eight highest, against SF2e's creature-building numbers for their level:

| Enemy | Level | AC against moderate | HP against moderate | HP with shields, frames and barrier | Best attack against high | Hardest Strike against high |
|---|---|---|---|---|---|---|
| Saren Arterius | 13 | +1 | x1.06 | x1.36 | 0 | x1.36 |
| Thresher Maw | 13 | -1 | x1.19 | x1.19 | +1 | x1.28 |
| The Illusive Man | 14 | 0 | x0.94 | x1.22 | -6 | x1.19 |
| Shadow Broker | 14 | +1 | x1.25 | x1.64 | +2 | x1.56 |
| Geth Colossus | 14 | -2 | x0.84 | x1.90 | +1 | x1.12 |
| Praetorian | 14 | -2 | x0.84 | x1.94 | -1 | x1.00 |
| Banshee | 15 | -1 | x0.76 | x1.05 | +1 | x0.82 |
| Harvester | 16 | -2 | x0.86 | x1.54 | -2 | x0.97 |

All 210, in bands:

| Levels | Stat blocks | AC against moderate | HP against moderate | With layers | Saves, low / middle / high against moderate | Best attack against high | Hardest Strike against high |
|---|---|---|---|---|---|---|---|
| Up to 2 | 36 | -0.6 | x0.93 | x1.36 | -2.5 / -0.5 / +1.0 | -1.4 | x0.96 |
| 3 to 5 | 77 | +0.4 | x0.95 | x1.47 | -1.6 / -0.1 / +2.1 | -0.2 | x1.14 |
| 6 to 9 | 50 | +0.4 | x1.00 | x1.42 | -0.8 / +0.3 / +2.3 | +0.1 | x1.17 |
| 10 to 12 | 39 | 0.0 | x0.99 | x1.35 | -1.2 / +0.8 / +3.7 | +0.2 | x1.12 |
| 13 to 16 | 8 | -0.8 | x0.97 | x1.48 | -2.8 / -0.4 / +3.6 | -0.5 | x1.16 |

- **A module enemy is an SF2e creature of its level with moderate AC, moderate HP and a high attack**, plus 35 to 50% more to chew through in shields, frames and barriers, and Strikes about 15% harder than SF2e's high figure.
- **That pattern is the same from 3rd level to 16th.** It does not grow with the characters' damage.
- **Enemy powers use DC 13 + level + a third of the level** (39 at 20th, SF2e's moderate spell DC) and the same dice multiplier as the characters' (12d6 for a failed save against Warp at 20th).
- **The Banshee's 80-point barrier and the frames' 20 to 200 points are fixed numbers.** They do not grow with level.

### 2.2 The test enemies

The module has nothing to fight at 20th, so the enemies below were written for the simulator on the pattern above: SF2e's moderate AC, HP and saves for the level, a 100-point shield (recharging 30) and a frame, a high attack bonus, Strikes 15% over high, and one area power at the enemy rule's DC and dice. They are test numbers, not proposed content.

| Test enemy | AC | HP | Layers | Fortitude / Reflex / Will | Strike | Area power |
|---|---|---|---|---|---|---|
| Boss, level 20 | 44 | 375 | shield 100, frame 100 | 36 / 30 / 33 | +38 for 51 | Shockwave: 12d6, Reflex DC 39, every other round |
| Biotic boss, level 20 | 44 | 375 | barrier 100, shield 100 | 33 / 30 / 36 | +38 for 51, agile | Flare: 18d6, Reflex DC 39, full damage on a success |
| Boss, level 22 | 47 | 430 | shield 100, frame 200 | 39 / 33 / 36 | +41 for 55 | 12d6, DC 42 |
| Boss, level 24 | 50 | 500 | shield 100, frame 200 | 41 / 35 / 38 | +44 for 60 | 14d6, DC 45 |
| Troop, level 18 | 41 | 335 | shield 100 | 33 / 30 / 27 | +35 for 46 | 10d6, DC 37, every third round |
| Troop, level 16 | 38 | 295 | shield 70 | 30 / 28 / 25 | +32 for 43 | 10d6, DC 34, every third round |

One `ZZ` actor was built in the test world, a Banshee raised to level 20, to confirm that enemy powers scale as modeled. It was deleted afterwards. The rest exist only in the simulator.

SF2e creatures used for the other side, as printed in the Alien Core compendium: Oscriss (20), Dust Worm Augur (20), Paradox 17 (22), Abysium Dragon, Ancient (18). Each was given its Strikes and its main damaging ability (Pause Pulse, Implosion, Radiation Breath).

### 2.3 The fights

Each cell is rounds to win, share of the party's HP lost, and how often at least one character drops (measured). Every party won every fight unless a win rate is given. XP is SF2e's budget for four 20th-level characters: 40 low, 80 moderate, 120 severe, 160 extreme.

| Encounter | XP | Module: Soldier, Vanguard, Adept, Engineer | Module: Sentinel, Infiltrator, Adept, Vanguard | Base SF2e: Soldier, Operative, Solarian, Witchwarper |
|---|---|---|---|---|
| **Module-style enemies** | | | | |
| One boss, level 20 | 40 | 1.0 / 0% / 0% | 1.0 / 0% / 0% | 2.0 / 13% / 1% |
| One biotic boss, level 20 | 40 | 1.0 / 1% / 0% | 1.0 / 1% / 0% | 2.0 / 19% / 3% |
| One boss, level 22 | 80 | 1.6 / 2% / 0% | 1.6 / 2% / 0% | 3.1 / 30% / 21% |
| Four troops, level 18 | 80 | 1.9 / 2% / 0% | 2.0 / 2% / 0% | 3.0 / 34% / 15% |
| Eight troops, level 16 | 80 | 2.6 / 5% / 0% | 3.0 / 7% / 1% | 4.7 / 61% / 52% (wins 95%) |
| Boss, level 22, and two level 18 troops | 120 | 2.0 / 5% / 0% | 2.0 / 5% / 1% | 3.5 / 45% / 41% |
| Two bosses, level 22 | 160 | 2.2 / 9% / 3% | 2.4 / 10% / 4% | 5.0 / 75% / 89% (wins 81%) |
| One boss, level 24 | 160 | 2.0 / 7% / 2% | 2.0 / 7% / 2% | 4.4 / 56% / 72% (wins 98%) |
| **The module's own highest enemies, as printed** | | | | |
| One Harvester (16) | 10 | 1.0 / 0% / 0% | 1.0 / 0% / 0% | 1.3 / 2% / 0% |
| Four Harvesters and four Banshees | about 40 | 2.9 / 2% / 0% | 3.1 / 2% / 0% | 4.5 / 33% / 22% |
| **SF2e creatures** | | | | |
| One Oscriss (20) | 40 | 1.0 / 1% / 0% | 1.0 / 1% / 0% | 1.9 / 14% / 0% |
| One Dust Worm Augur (20) | 40 | 1.0 / 1% / 0% | 1.0 / 1% / 0% | 2.2 / 15% / 7% |
| One Paradox 17 (22) | 80 | 1.1 / 2% / 0% | 1.1 / 2% / 0% | 2.3 / 22% / 12% |
| Four Abysium Dragons (18) | 80 | 1.9 / 4% / 0% | 2.0 / 5% / 0% | 2.9 / 41% / 24% |
| Paradox 17 and two Abysium Dragons | 120 | 1.7 / 6% / 0% | 1.9 / 7% / 1% | 2.8 / 41% / 39% |
| Two Paradox 17 | 160 | 2.0 / 9% / 2% | 2.0 / 9% / 2% | 3.5 / 54% / 68% (wins 96%) |

- **A level 20 boss does not get a second turn.** The mixed party deals about 900 damage a round to one target; the boss has 575 with its layers.
- **Nothing in SF2e's budget threatens the module party.** Its worst result, two level 22 bosses, is easier for it than a single level 22 boss is for the SF2e party.
- **The Vanguard takes the most** (26% of its HP against two level 22 bosses, dropping in 4% of those fights), then the Engineer. The Soldier and Sentinel are barely scratched.
- **The two enemy sets rank the same.** For the SF2e party, module-style enemies are somewhat harder than SF2e creatures of the same budget (their layers add a round). For the module party there is no real difference.
- **The module's printed top end is not a fight at 20th.** Eight of them together cost the module party 2% of its HP.

### 2.4 Checked in Foundry, and simulated only

Checked in Foundry at 20th level, on characters and one enemy built in the test world and deleted afterwards:
- **Character sheets**: HP, AC, saves and class DC as in the table in 1.4. Paragon-grade module armor adds its grade bonus on top of the module's own higher base.
- **Power dice**: Warp 6d6 / 12d6 / 24d6 with 6d4 persistent; Slam 6d6 / 18d6 / 36d6; Throw 12d8 / 24d8; Overload 6d8 / 12d8 / 24d8; Incinerate 12d6 with 6d4 persistent; Flare 18d6 on a success or any failure; Biotic Explosion 7d6.
- **Powers end to end**: an enemy's saving throw against a 20th-level Adept's Warp and Throw and an Engineer's Overload rolled, and the engine applied 77, 104 (plus a 27-point Biotic Explosion) and 110 damage through the enemy's barrier into its HP.
- **Enemy powers**: Warp (NPC) on a level 20 enemy shows DC 39 and 6d6 / 12d6 / 24d6.
- **Cooldowns**: Engineer with Intelligence +6, tech powers 1 round; Adept with no amp, biotic powers 3 rounds; Biotic Charge 2 rounds.
- **Kinetic shield**: 100 points with the Tier 4 mod. A 40-point hit leaves 60. A 60-point hit on a full shield collapses it: 50 absorbed, shield at 0, 10 to HP.
- **Shield recharge in an encounter**: no recharge on the turn after a hit, then 30 a turn.
- **Biotic Barrier**: 50 points at 20th, and it absorbs before the shield (a 70-point hit left barrier 0, shield 80, HP untouched).

Simulated only:
- Every fight result. No fight was played out in Foundry.
- Every base SF2e number. No SF2e character was built in Foundry.
- The level 18 to 24 module-style enemies, apart from the dice and DC of their powers.
- Everything below 20th on survivability. The shield table in 1.4 is arithmetic.

## What could not be verified

- **Play.** These are expected-damage models. Nobody rolled initiative.
- **Healing, cover, movement, range, conditions and reactions** in fights. A melee Vanguard and a sniper are treated alike except for who gets attacked.
- **Where module enemies stop being a threat** was not known when the options below were written, because two-sided fights had only been simulated at 20th. The last section has them at 3rd to 20th: as built, a module party loses 1 to 8% of its HP to an 80 XP fight at every one of those levels, where an SF2e party loses 19 to 41%.
- **The SF2e baselines beyond the routines listed.** A specialist build may do better; the Mystic and Technomancer were not modeled; the Envoy's bonus to its allies was not credited.
- **The Engineer and Infiltrator reruns**, which match the audit's rows only to within 8% and 20% and were scaled to them.
- **Real level 20 SF2e creatures in number.** The compendium has two at 20th and two at 22nd.
- **Resistances and immunities** on either enemy set.
- **Ascendant Form, Apex Sentinel and Sentinel's Resolve**, still unmeasured (X4 in the class audit).

Seen in passing, not looked into: a 20th-level Warp that critically failed dealt its 77 damage to an enemy's Biotic Barrier at face value, though the power's text says Warp deals 1.5 times damage to barriers.

## Rebalancing options

Each row is the mixed module party at 20th against module-style enemies: rounds / share of HP lost / chance a character drops (measured). The first row is the target.

| | 80 XP, boss | 80 XP, group | 120 XP | 160 XP |
|---|---|---|---|---|
| **Target: SF2e party against SF2e creatures** | 2.3 / 22% / 13% | 2.9 / 41% / 26% | 2.8 / 41% / 39% | 3.6 / 54% / 68% |
| As built today | 1.6 / 2% / 0% | 1.9 / 2% / 0% | 2.0 / 4% / 0% | 2.2 / 10% / 3% |
| **A. Scale the enemies** | | | | |
| A1. HP and layers x2 | 2.7 / 7% / 1% | 2.9 / 6% / 1% | 3.2 / 12% / 4% | 4.2 / 28% / 29% |
| A2. HP and layers x2, damage x1.3 | 2.7 / 12% / 6% | 2.9 / 12% / 4% | 3.3 / 23% / 18% | 4.6 / 48% / 61% |
| A3. A2 with attack +2 and power DC +4 | 2.7 / 17% / 13% | 2.9 / 21% / 14% | 3.4 / 34% / 36% | 4.8 / 67% / 84% (wins 81%) |
| A4. HP x2.5, damage x1.3, attack +2, DC +4 | 3.2 / 22% / 21% | 3.4 / 29% / 24% | 4.3 / 46% / 55% | 5.9 / 87% / 95% (wins 46%) |
| **B. Lower the characters' damage** | | | | |
| B1. Power dice stop at x4 (from 12th) | 1.9 / 3% / 0% | 2.0 / 3% / 0% | 2.1 / 6% / 1% | 2.8 / 14% / 7% |
| B2. All damage x0.8 | 1.9 / 3% / 0% | 2.0 / 3% / 0% | 2.1 / 6% / 1% | 2.9 / 14% / 7% |
| B3. All damage x0.6 | 2.2 / 5% / 0% | 2.3 / 4% / 0% | 2.9 / 10% / 3% | 3.6 / 21% / 17% |
| B4. All damage x0.45 (SF2e's level) | 3.0 / 7% / 1% | 3.0 / 7% / 1% | 3.6 / 15% / 5% | 4.7 / 33% / 36% |
| B5. B4, no shields or barriers, armor at SF2e values | 3.0 / 30% / 25% | 3.1 / 38% / 21% | 3.9 / 53% / 58% | 5.5 / 83% / 95% (wins 63%) |
| **C. Trim the defenses only** | | | | |
| C1. Armor at SF2e values (2 less AC) | 1.6 / 3% / 0% | 1.9 / 3% / 0% | 2.0 / 6% / 1% | 2.2 / 13% / 6% |
| C2. Kinetic shield halved (50, recharging 15) | 1.6 / 4% / 0% | 1.9 / 5% / 0% | 2.0 / 8% / 1% | 2.2 / 16% / 5% |
| C3. No shields or barriers | 1.6 / 12% / 2% | 1.9 / 16% / 1% | 2.0 / 21% / 6% | 2.3 / 31% / 23% |
| **D. Some of each** | | | | |
| D1. Damage x0.8; enemy HP x1.5, damage x1.3 | 2.5 / 11% / 5% | 2.7 / 11% / 4% | 3.1 / 21% / 15% | 4.3 / 43% / 56% |
| D2. Power dice stop at x4; enemy HP x1.75, damage x1.3, attack +2, DC +4 | 2.9 / 18% / 15% | 3.0 / 22% / 15% | 3.6 / 37% / 40% | 5.1 / 73% / 85% (wins 72%) |

What slower power dice do to each class at 20th, one target (measured). The Soldier's guns and the Vanguard's Charge and Nova do not use the rule:

| Rule for power dice | Adept | Engineer | Sentinel | Infiltrator | Soldier | Vanguard | Party of four against SF2e's |
|---|---|---|---|---|---|---|---|
| As built: x(1 + level / 4), x6 at 20th | 245 | 233 | 146 | 234 | 196 | 224 | 2.4 times |
| x(1 + level / 5), x5 at 20th | 214 | 198 | 125 | 213 | 196 | 224 | 2.2 times |
| Stop at x4 | 183 | 162 | 103 | 190 | 196 | 224 | 2.0 times |
| Stop at x3 | 151 | 127 | 81 | 173 | 196 | 224 | 1.9 times |

**A. Scale the enemies and leave the characters alone.**
- From about 8th level, module enemies carry about twice the HP and layers they do now and deal about 30% more, with 2 more to hit (which only cancels the module's armor).
- A2 and A3 bracket the SF2e target at 20th: A2 is a little kind, A3 a little harsh at the top.
- The module needs enemies at 17th to 22nd whichever way this goes. They are new content, to be designed and approved separately.
- SF2e's own creatures stay too weak for a module party at the same level unless a GM applies the same scaling to them.
- No class changes, so nothing in the class audit is disturbed and none of the Vanguard's protected pieces are touched.
- The multipliers for levels below 20th are untested. By the damage ratio in 1.2 they would be about x1 to 4th, x1.5 at 5th to 7th (what enemies already have through their layers) and x2 from 8th.

**B. Bring the characters down toward SF2e.**
- Parity needs all damage at about 45% of today's and the shields and armor cut as well (B5). That is a rewrite of every class.
- The cheap lever, slower power dice, takes 13 to 45% off the Adept, Engineer and Sentinel and nothing off the Soldier or Vanguard, so it reorders the classes the audit just leveled and still leaves the party at 1.9 to 2.2 times SF2e.
- Reaching the Soldier and Vanguard means cutting weapon damage, the mastery bonuses, Biotic Charge or Nova. The last two are ruled out.

**C. Trim defenses only.** It does not fix anything by itself. Fights still end in two rounds. It matters once fights last longer, under A or D.

**D. A smaller step on each side.** D1 lands close to the target with a 20% cut to character damage and enemies at 1.5 times their HP. It carries the cost of both: every class is retouched and every enemy is retuned.

**Recommendation at the time: A, at A2's numbers, with A3's attack and DC bump kept in reserve.** (D was chosen instead; see the next section.) The classes were just balanced against each other, the gap with SF2e is in every class and at every level from 8th, and the module's enemies are its own to tune. It means accepting that a module character is worth about two SF2e characters of the same level from 8th up, and saying so in the GM guidance, so that anyone mixing in SF2e creatures knows to scale them.

Decisions asked for when this was written:
1. Which option, A, B, C, D or none. **Answered 2026-11-19: D.**
2. Under A or D: whether to measure the enemy multipliers below 20th before anything is written. **Done for D, at 3rd, 5th, 10th, 13th, 16th and 20th, in the next section.**
3. Whether to design level 17 to 22 enemies now. Still open. The design would come back for approval before any file is written.

## Option D, worked out

D was chosen on 2026-11-19. This section turns it into a design and measures it. Nothing here has been written into the module; it needs a go-ahead.

### What D became, and why

**D1 in the table above used a flat 20% cut to every class's damage as a stand-in. No single number in the module does that.**
- The power-dice rule is the only shared damage lever, and it reaches four classes of the six. The Soldier's guns and the Vanguard's Charge and Nova do not use it.
- Reaching those two means cutting weapons, the mastery bonuses, Charge or Nova, class by class. Two of those are ruled out, and the rest would undo the leveling the class audit just did.

**The fights at lower levels also showed the gap is mostly in what a character can take, not in how fast enemies fall.**
- At 5th an 80 XP boss lasts 2.2 rounds against either party. The module party loses 5% of its HP and the SF2e party 26%.
- The kinetic shield is the reason. Armor adds a little. Shield recharge during a fight adds nothing measurable (fights are too short).

**So the worked design takes its character-side step from the shield, and its enemy-side step is smaller than option A's.** A step on power dice is kept as an optional extra, measured below.

### The design

**Characters: the kinetic shield at half size and half recharge.** Prices and levels stay as they are (confirmed today's values; proposed values are the design).

| Item | Today | Proposed |
|---|---|---|
| Kinetic Shield (1st, 150 credits) | 30 points, recharging 10 | 15 points, recharging 5 |
| With Shield HP Mod, Tier 1 (3rd, 600 credits) | 40 | 20 |
| Tier 2 (6th, 2,500 credits) | 50 | 25 |
| Tier 3 (9th, 7,000 credits) | 70 | 35 |
| Tier 4 (12th, 16,000 credits) | 100 | 50 |
| Recharge with the regen mods, Tier 1 to 4 | 15 / 20 / 25 / 30 | 7 / 10 / 12 / 15 |
| Shield as a share of HP at 1 / 5 / 10 / 15 / 20 (arithmetic) | 167% / 63% / 59% / 53% / 40% | 83% / 31% / 30% / 26% / 20% |

- Five files in `src/packs/me-shields`: the shield and the four HP mods. The regen mods multiply the base, so they need no edit.
- Characters already in a world carry their own copies. A migration step, or a note telling GMs to re-add the shield, is part of the work.
- Nothing else on a character changes. No class feature, power, weapon or armor is touched, so every number in `class-audit.md` stands.

**Enemies: one rule for every module stat block of 3rd level or higher** (174 of the 210).

| Enemy's level | Strikes | Power DC | HP, shield, frame and barrier |
|---|---|---|---|
| Up to 2nd | unchanged | unchanged | unchanged |
| 3rd to 7th (100 stat blocks) | +2 to hit, damage x1.25 | +2 | unchanged |
| 8th to 15th (73) | +2 to hit, damage x1.25 | +2 | x1.25 |
| 16th and up (1 today) | +2 to hit, damage x1.25 | +2 | x1.5 |

- Enemy powers keep their dice. Their DC becomes 15 + level + a third of the level.
- Examples: the Banshee (15) goes from 210 HP and an 80-point barrier to 263 and 100. The Harvester (16) goes from 255 HP and a 200-point frame to 383 and 300, and its Strike from +30 for 36 to +32 for 45.
- Done by a script over `src/packs/me-npcs` and `src/packs/me-creatures`, in the manner of `scripts/rescale-npc.py`, so the same rule builds any new enemy.
- Enemies below 3rd level are left alone because 1st and 2nd level were not measured.

### What it does (measured)

Each cell is rounds to win / share of the party's HP lost / chance at least one character drops. Party: Soldier, Vanguard, Adept, Engineer unless noted. The target is an SF2e party against typical SF2e creatures of the same budget. 4,000 fights a cell.

| | 80 XP, boss | 80 XP, group | 120 XP | 160 XP |
|---|---|---|---|---|
| **5th level** | | | | |
| **Target** | 2.2 / 26% / 23% | 2.0 / 27% / 3% | 3.1 / 45% / 51% | 4.2 / 75% / 87% (wins 72%) |
| As built | 2.2 / 5% / 2% | 2.0 / 1% / 0% | 3.0 / 8% / 5% | 4.1 / 24% / 30% |
| Shield change only | 2.2 / 9% / 5% | 2.0 / 4% / 0% | 3.0 / 17% / 12% | 4.3 / 41% / 46% |
| Enemy rule only | 2.2 / 11% / 13% | 2.0 / 2% / 0% | 3.1 / 19% / 25% | 4.5 / 51% / 70% (wins 90%) |
| D: both | 2.2 / 17% / 20% | 2.0 / 7% / 1% | 3.1 / 29% / 38% | 4.6 / 69% / 83% (wins 73%) |
| D, second party | 2.4 / 19% / 21% | 2.1 / 7% / 2% | 3.3 / 31% / 40% | 4.9 / 72% / 85% (wins 68%) |
| **10th level** | | | | |
| **Target** | 2.8 / 27% / 19% | 2.7 / 38% / 12% | 3.1 / 46% / 45% | 4.3 / 71% / 84% (wins 82%) |
| As built | 2.0 / 4% / 1% | 2.0 / 2% / 0% | 2.4 / 8% / 4% | 3.2 / 21% / 20% |
| Shield change only | 2.0 / 8% / 3% | 2.0 / 7% / 1% | 2.4 / 16% / 8% | 3.2 / 33% / 31% |
| Enemy rule only | 2.3 / 13% / 13% | 2.2 / 8% / 3% | 3.1 / 24% / 28% | 4.3 / 56% / 76% (wins 88%) |
| D: both | 2.3 / 19% / 20% | 2.2 / 17% / 7% | 3.1 / 36% / 43% | 4.4 / 73% / 86% (wins 72%) |
| D, second party | 2.4 / 20% / 21% | 2.6 / 18% / 10% | 3.4 / 39% / 47% | 4.7 / 76% / 88% (wins 66%) |
| **13th level** | | | | |
| **Target** | 2.3 / 19% / 6% | 2.8 / 37% / 9% | 3.0 / 40% / 27% | 3.6 / 51% / 53% (wins 98%) |
| As built | 1.9 / 1% / 0% | 2.0 / 1% / 0% | 2.4 / 4% / 1% | 3.0 / 8% / 4% |
| Shield change only | 1.9 / 4% / 0% | 2.0 / 4% / 0% | 2.4 / 9% / 2% | 3.0 / 18% / 9% |
| Enemy rule only | 2.1 / 6% / 3% | 2.5 / 4% / 1% | 3.0 / 13% / 9% | 3.6 / 27% / 34% |
| D: both | 2.1 / 11% / 5% | 2.5 / 12% / 3% | 3.0 / 24% / 19% | 3.8 / 44% / 53% (wins 97%) |
| D, second party | 2.2 / 11% / 6% | 2.9 / 12% / 5% | 3.3 / 26% / 24% | 4.2 / 47% / 58% (wins 96%) |
| **16th level** | | | | |
| **Target** | 2.5 / 20% / 5% | 2.9 / 38% / 9% | 2.9 / 39% / 25% | 3.7 / 52% / 56% (wins 98%) |
| As built | 1.7 / 2% / 0% | 2.1 / 2% / 0% | 2.2 / 5% / 0% | 2.7 / 10% / 3% |
| Shield change only | 1.7 / 4% / 0% | 2.1 / 7% / 1% | 2.2 / 10% / 2% | 2.7 / 18% / 7% |
| Enemy rule only | 2.1 / 9% / 4% | 2.6 / 10% / 3% | 3.1 / 19% / 14% | 3.9 / 37% / 48% |
| D: both | 2.2 / 14% / 7% | 2.6 / 18% / 7% | 3.1 / 29% / 25% | 4.0 / 51% / 64% (wins 95%) |
| D, second party | 2.2 / 14% / 8% | 2.9 / 19% / 10% | 3.3 / 31% / 28% | 4.4 / 54% / 66% (wins 94%) |
| **20th level** | | | | |
| **Target** | 2.2 / 17% / 4% | 2.6 / 35% / 8% | 2.6 / 34% / 19% | 3.3 / 42% / 45% |
| As built | 1.6 / 2% / 0% | 1.9 / 2% / 0% | 2.0 / 5% / 0% | 2.2 / 10% / 3% |
| Shield change only | 1.5 / 4% / 0% | 1.9 / 5% / 0% | 2.0 / 8% / 1% | 2.2 / 16% / 5% |
| Enemy rule only | 2.1 / 9% / 4% | 2.1 / 10% / 3% | 2.6 / 17% / 12% | 3.4 / 33% / 44% |
| D: both | 2.1 / 13% / 6% | 2.1 / 17% / 6% | 2.6 / 25% / 20% | 3.5 / 44% / 56% (wins 98%) |
| D, second party | 2.1 / 13% / 7% | 2.6 / 20% / 10% | 3.0 / 29% / 25% | 3.8 / 47% / 58% (wins 98%) |

The second party is Sentinel, Infiltrator, Adept, Vanguard. Every party won every fight unless a win rate is given.

- **D lands on the target for the hardest fights and stays on the kind side below that.** The 160 XP fight costs 44 to 73% of the party's HP against a target of 42 to 75%. The 80 XP boss costs 11 to 19% against 17 to 27%. The 120 XP fight costs 24 to 36% against 34 to 46%.
- **Groups stay easier than the target**: 7 to 18% lost against 27 to 38%. The module's classes clear a group quickly with area powers, and the rule does not try to cancel that.
- **Each half does about half.** At 20th the 160 XP fight costs 10% as built, 16% with the shield change alone, 33% with the enemy rule alone and 44% with both.
- **Fights still end a little sooner than the target**: 2.1 to 2.3 rounds for a boss against 2.2 to 2.8, closest at 5th and 20th.
- **3rd level fits too**: an 80 XP boss takes 3.2 rounds and 32% under D, against a target of 3.0 and 41%.
- **The model has no healing**, so the 160 XP column is harsher than play would be, for every row alike.

### Pieces that can be changed without redoing the rest (measured)

**The shield size is a dial.** A shield at three quarters of today's size with enemy Strike damage at x1.4 gives the same fights as half size with x1.25 (160 XP at 10th: 72% lost against 73%; at 16th: 50% against 51%).

**An optional step on power dice.** It barely moves the fights, so it is not in the design. It is here because D was described as a cut to character damage. One target, damage a round:

| Rule for power dice | Adept 13 / 16 / 20 | Engineer | Infiltrator | Sentinel | Soldier | Vanguard | Party against SF2e's, 13 / 16 / 20 |
|---|---|---|---|---|---|---|---|
| As built, x(1 + level / 4) | 134 / 171 / 245 | 106 / 126 / 233 | 102 / 136 / 234 | 83 / 100 / 146 | 125 / 142 / 196 | 127 / 146 / 224 | 2.4 / 2.4 / 2.4 |
| The same, stopping at x5 | 134 / 171 / 214 | 106 / 126 / 198 | 102 / 136 / 213 | 83 / 100 / 125 | unchanged | unchanged | 2.4 / 2.4 / 2.2 |
| x(1 + level / 5) | 109 / 146 / 214 | 81 / 103 / 198 | 92 / 125 / 213 | 66 / 82 / 125 | unchanged | unchanged | 2.1 / 2.2 / 2.2 |

- **Stopping at x5** changes 20th level only. It pulls the top five classes into a band of 196 to 224 and leaves the Sentinel further behind (125). With it, the 20th-level 160 XP fight under D costs 49% instead of 44%.
- **x(1 + level / 5)** also bites at 4th, 8th to 9th, 12th to 14th and 16th to 19th. At 13th the Engineer falls from 85% of the Soldier's damage to 65%, so it reopens the class audit.
- Either one means editing the rule in `scripts/me-powers.js` and the 30 power and passive texts that spell the steps out.

**Armor was measured and left alone.** Taking 2 AC off the module's better armor lines does the same job as giving enemies +2 to hit, and the second touches no player gear (14 armor items otherwise).

### Stock SF2e creatures under D (measured)

D retunes the module's own enemies. A creature dragged in from SF2e's bestiaries is still too weak for a module party after the shield change:

| D characters against | 80 XP, boss, at 5 / 10 / 16 / 20 | 160 XP at 5 / 10 / 16 / 20 |
|---|---|---|
| **Target** | 26% / 27% / 20% / 17% lost | 75% / 71% / 52% / 42% lost |
| SF2e creatures as printed | 5% / 4% / 3% / 3% | 18% / 14% / 10% / 10% |
| The same with HP x2 and damage x1.5 | 21% / 17% / 13% / 12% | 74% / 62% / 44% / 39% |
| Creatures two levels higher than the budget says | 23% / 13% / 8% / 7% | 82% / 45% / 30% / 23% |
| Creatures three levels higher | 46% / 19% / 13% / - | 87% / 70% / 49% / - |

- **GM guidance that follows: double a stock SF2e creature's HP and add half again to its damage**, from 5th level up. That holds at every level measured.
- **Or count it as lower level when budgeting**: two levels lower at 5th to 9th, three from 10th. This runs out at the top, where no higher-level creatures exist.

### What this does not settle

- **Everything here is simulated.** Nothing was checked in Foundry for this section, because none of it exists there yet.
- **Characters below 20th are arithmetic**: the 20th-level sheets read in Foundry, walked back by proficiency, attribute boosts, armor grade and shield tier. Base SF2e characters likewise.
- **The target is typical creatures**, built from the medians of the system's bestiaries at each level (moderate AC, HP just over moderate, high attack, damage about 0.9 of high). It is a little kinder than the four real level 18 to 22 creatures behind the target row in the options table (2.2 rounds and 17% for the 80 XP boss at 20th, against 2.3 and 22%).
- **The Vanguard takes the most under D**: in the 160 XP fight it loses 68 to 89% of its HP and drops in 40 to 74% of fights, against 31 to 69% and 7 to 48% for the others. Part of that is the model, which sends melee enemies at melee characters twice as often and has no healing. It is something to watch in play, not something this design changes.
- **1st and 2nd level were not measured.** The halved shield is still 83% of a 1st-level character's HP.
- **The module still has no enemies at 17th to 22nd.** They would be built on the rule above.

Decisions needed now:
1. A go-ahead for D as designed (the halved shield and the enemy rule), or a different setting of the shield dial.
2. The power-dice step: none (as designed), stop at x5, or x(1 + level / 5).
3. Whether to design level 17 to 22 enemies on the new rule. The design would come back for approval before any file is written.

## Power curves, level by level

Added 2026-11-19 on request: every class at every level from 1st to 20th, not only the levels the audit recorded.

**How these were made.**
- The audit's class simulators, run at all twenty levels with the builds and settings the audit used, against the audit's foe (same level, moderate AC and saves, never acts or dies, four rounds).
- At the levels the audit recorded (1, 3, 5, 7, 10, 13, 16, 19, 20) the numbers are the audit's. The levels between are the reruns, scaled by the ratio between rerun and audit at the recorded levels on either side. All of it is measured, none of it checked in Foundry.
- Because of that scaling, 15th level here differs by a few points from the 15th-level column in 1.2 (Engineer 112 against 104, Infiltrator 119 against 125).
- Each class is one build with one feat order. A different build bends its curve differently.
- Run-to-run noise is about 2%, so a figure here can differ by a few points from the same figure elsewhere in this report (the Infiltrator with dice stopped at x5 is 208 here and 213 in the D section).

### One target

Damage a round (measured). The last column is Soldier, Vanguard, Adept, Engineer against SF2e's Soldier, Operative, Solarian, Witchwarper.

| Level | Vanguard | Adept | Engineer | Infiltrator | Soldier | Sentinel | SF2e Operative | SF2e Solarian | SF2e Soldier | SF2e Witchwarper | Party of four against SF2e's |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 22 | 11 | 12 | 12 | 15 | 18 | 16 | 16 | 9 | 6 | x1.3 |
| 2 | 22 | 15 | 15 | 14 | 15 | 18 | 17 | 16 | 9 | 5 | x1.4 |
| 3 | 26 | 16 | 18 | 21 | 22 | 19 | 17 | 17 | 9 | 8 | x1.6 |
| 4 | 34 | 34 | 35 | 27 | 25 | 27 | 25 | 22 | 17 | 8 | x1.8 |
| 5 | 50 | 35 | 35 | 39 | 44 | 32 | 37 | 30 | 21 | 11 | x1.7 |
| 6 | 50 | 40 | 35 | 37 | 43 | 30 | 33 | 26 | 19 | 11 | x1.9 |
| 7 | 66 | 54 | 49 | 43 | 51 | 38 | 39 | 30 | 24 | 19 | x2.0 |
| 8 | 65 | 86 | 72 | 53 | 54 | 57 | 34 | 26 | 22 | 20 | x2.7 |
| 9 | 69 | 79 | 67 | 60 | 64 | 53 | 34 | 27 | 22 | 29 | x2.5 |
| 10 | 90 | 101 | 75 | 67 | 73 | 63 | 39 | 33 | 32 | 32 | x2.5 |
| 11 | 88 | 93 | 69 | 69 | 70 | 58 | 43 | 33 | 31 | 42 | x2.1 |
| 12 | 100 | 119 | 94 | 77 | 96 | 78 | 49 | 36 | 38 | 44 | x2.5 |
| 13 | 127 | 133 | 106 | 102 | 125 | 83 | 64 | 50 | 38 | 57 | x2.4 |
| 14 | 134 | 122 | 95 | 97 | 114 | 82 | 57 | 44 | 40 | 55 | x2.4 |
| 15 | 155 | 151 | 112 | 119 | 135 | 92 | 65 | 50 | 51 | 77 | x2.3 |
| 16 | 146 | 171 | 126 | 136 | 142 | 100 | 65 | 50 | 55 | 73 | x2.4 |
| 17 | 157 | 170 | 126 | 136 | 143 | 100 | 91 | 60 | 58 | 92 | x2.0 |
| 18 | 153 | 178 | 126 | 123 | 134 | 100 | 83 | 55 | 56 | 94 | x2.1 |
| 19 | 188 | 195 | 138 | 134 | 150 | 111 | 96 | 83 | 74 | 107 | x1.9 |
| 20 | 224 | 245 | 233 | 234 | 196 | 146 | 96 | 86 | 74 | 118 | x2.4 |

The same numbers as a share of a same-level enemy's Hit Points (SF2e's moderate HP for the level) dealt each round. This is the fairest way to read a curve, because the enemy grows too.

| Level | Enemy HP | Vanguard | Adept | Engineer | Infiltrator | Soldier | Sentinel | SF2e Operative | SF2e Solarian | SF2e Soldier | SF2e Witchwarper | Module party | SF2e party |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 20 | 110% | 55% | 60% | 60% | 75% | 90% | 78% | 82% | 45% | 29% | 300% | 234% |
| 2 | 30 | 73% | 50% | 50% | 47% | 49% | 58% | 57% | 55% | 30% | 18% | 222% | 160% |
| 3 | 45 | 58% | 36% | 40% | 47% | 49% | 42% | 38% | 38% | 20% | 19% | 182% | 114% |
| 4 | 60 | 57% | 57% | 58% | 45% | 42% | 45% | 42% | 37% | 28% | 13% | 214% | 120% |
| 5 | 75 | 67% | 47% | 47% | 52% | 59% | 43% | 49% | 40% | 28% | 15% | 219% | 131% |
| 6 | 95 | 53% | 42% | 37% | 39% | 45% | 32% | 35% | 27% | 20% | 11% | 177% | 94% |
| 7 | 115 | 57% | 47% | 43% | 38% | 45% | 33% | 34% | 26% | 21% | 17% | 192% | 98% |
| 8 | 135 | 48% | 64% | 53% | 39% | 40% | 42% | 26% | 19% | 16% | 15% | 205% | 76% |
| 9 | 155 | 45% | 51% | 43% | 38% | 41% | 34% | 22% | 17% | 14% | 19% | 180% | 72% |
| 10 | 175 | 51% | 58% | 43% | 38% | 42% | 36% | 22% | 19% | 19% | 19% | 194% | 78% |
| 11 | 195 | 45% | 48% | 36% | 35% | 36% | 30% | 22% | 17% | 16% | 22% | 164% | 77% |
| 12 | 215 | 47% | 55% | 44% | 36% | 45% | 36% | 23% | 17% | 17% | 20% | 190% | 78% |
| 13 | 235 | 54% | 57% | 45% | 43% | 53% | 35% | 27% | 21% | 16% | 24% | 209% | 89% |
| 14 | 255 | 53% | 48% | 37% | 38% | 45% | 32% | 22% | 17% | 16% | 22% | 182% | 77% |
| 15 | 275 | 56% | 55% | 41% | 43% | 49% | 34% | 24% | 18% | 19% | 28% | 201% | 88% |
| 16 | 295 | 49% | 58% | 43% | 46% | 48% | 34% | 22% | 17% | 19% | 25% | 198% | 82% |
| 17 | 315 | 50% | 54% | 40% | 43% | 45% | 32% | 29% | 19% | 18% | 29% | 189% | 95% |
| 18 | 335 | 46% | 53% | 38% | 37% | 40% | 30% | 25% | 16% | 17% | 28% | 176% | 86% |
| 19 | 355 | 53% | 55% | 39% | 38% | 42% | 31% | 27% | 23% | 21% | 30% | 189% | 102% |
| 20 | 375 | 60% | 65% | 62% | 62% | 52% | 39% | 26% | 23% | 20% | 31% | 239% | 100% |

- **A module class holds its place against the enemy at every level.** From 3rd to 19th each one deals a steady share of a same-level enemy's HP each round: Vanguard 45 to 67%, Adept 36 to 64%, Soldier 36 to 59%, Engineer 36 to 58%, Infiltrator 35 to 52%, Sentinel 30 to 45%.
- **A base SF2e class starts level with them and falls away.** The Operative deals 78% at 1st, 49% at 5th and 22 to 29% from 8th on. From 8th no SF2e class is above 30%.
- **So the gap is not a slow drift. It opens between 4th and 8th and then stays.** A module party of four deals 164 to 219% of an enemy's HP a round from 3rd to 19th. An SF2e party deals 114 to 131% at 3rd to 5th and 72 to 102% from 8th.
- **The party multiple peaks at 8th (2.7 times)**, sits at 2.1 to 2.5 through 16th, dips to 1.9 to 2.1 at 17th to 19th when SF2e characters get their apex items and top spell slots, and returns to 2.4 at 20th.

**The curves are staircases, and some steps go down.**
- **Power classes step at 4th, 8th, 12th, 16th and 20th**, when the power dice multiply. The Adept goes 16 to 34 at 4th, 54 to 86 at 8th, 93 to 119 at 12th, 151 to 171 at 16th and 195 to 245 at 20th.
- **Between steps they lose ground, and at 9th, 11th and 14th they deal less than the level before** (Adept 86 to 79, 101 to 93, 133 to 122). The enemy's AC and saves rise every level; the dice do not.
- **Gun classes step with weapon grades and proficiency**: the Soldier goes 25 to 44 at 5th and 70 to 125 across 11th to 13th, and slips at 14th (125 to 114) and 18th (143 to 134).
- **The Vanguard's is the smoothest curve**, because Charge and Nova grow with the barrier a little every other level.

**20th level is a jump of its own.** From 19th to 20th the enemy's HP grows 6%. The classes grow:

| | Engineer | Infiltrator | Sentinel | Soldier | Adept | Vanguard |
|---|---|---|---|---|---|---|
| One target, 19th to 20th | 138 to 233 (+69%) | 134 to 234 (+75%) | 111 to 146 (+32%) | 150 to 196 (+31%) | 195 to 245 (+26%) | 188 to 224 (+19%) |
| The same if power dice stopped at x5 | 138 to 197 (+43%) | 134 to 208 (+55%) | 111 to 124 (+12%) | unchanged | 195 to 214 (+10%) | unchanged |

- The sixth dice step and the capstone feats land together. Across three targets the Engineer goes from 268 to 508 and the Vanguard from 295 to 455.
- Stopping the dice at x5 (the optional step in the D section) takes about a third off that jump for the power classes. The Engineer's and Infiltrator's capstones still carry them up by half.

**Who leads when.**
- **The Vanguard leads from 1st to 7th** (tied with the Adept and Engineer at 4th) and again at 14th and 15th. At 1st it deals 22, twice the Adept's 11.
- **The Adept leads from 8th to 13th and from 16th to 20th.**
- **The Sentinel is last from 6th on**, at 30 to 45% of an enemy's HP a round. It is the class built to take hits (see below).
- **The Engineer is the lowest of the other five on one target from 14th to 17th** (the Infiltrator at 18th and 19th), and with the Adept the highest across three.
- **The five damage classes stay within about 1.6 times of each other from 2nd level.** They are closest at 20th (1.25 times).

### Three targets

Damage a round across all three (measured). The Soldier column is the rifle build, which does not spread; the audit's grenade build has 79, 170 and 257 at 10th, 16th and 20th.

| Level | Vanguard | Adept | Engineer | Infiltrator | Soldier (rifle) | Sentinel | SF2e Witchwarper | SF2e Soldier | SF2e Solarian |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 22 | 15 | 18 | 12 | 15 | 23 | 9 | 17 | 16 |
| 2 | 29 | 27 | 20 | 14 | 15 | 21 | 10 | 17 | 16 |
| 3 | 35 | 29 | 24 | 21 | 22 | 23 | 16 | 17 | 17 |
| 4 | 45 | 55 | 43 | 27 | 25 | 30 | 16 | 33 | 34 |
| 5 | 68 | 57 | 42 | 39 | 44 | 37 | 26 | 37 | 39 |
| 6 | 66 | 65 | 45 | 37 | 43 | 44 | 26 | 34 | 44 |
| 7 | 91 | 86 | 78 | 43 | 51 | 57 | 52 | 43 | 47 |
| 8 | 96 | 135 | 141 | 53 | 54 | 80 | 55 | 41 | 53 |
| 9 | 101 | 123 | 130 | 60 | 64 | 73 | 80 | 40 | 59 |
| 10 | 141 | 155 | 146 | 67 | 73 | 83 | 91 | 73 | 73 |
| 11 | 137 | 142 | 130 | 69 | 70 | 76 | 119 | 68 | 72 |
| 12 | 149 | 180 | 165 | 77 | 96 | 101 | 124 | 83 | 81 |
| 13 | 185 | 202 | 180 | 102 | 125 | 109 | 162 | 83 | 88 |
| 14 | 187 | 184 | 160 | 97 | 114 | 106 | 154 | 96 | 88 |
| 15 | 225 | 238 | 190 | 119 | 135 | 119 | 215 | 118 | 93 |
| 16 | 208 | 267 | 241 | 136 | 142 | 131 | 204 | 118 | 94 |
| 17 | 223 | 267 | 241 | 136 | 143 | 132 | 257 | 126 | 118 |
| 18 | 220 | 277 | 244 | 123 | 134 | 132 | 260 | 124 | 124 |
| 19 | 295 | 305 | 268 | 134 | 150 | 145 | 300 | 170 | 131 |
| 20 | 455 | 386 | 508 | 234 | 196 | 232 | 329 | 178 | 147 |

- **The Adept, Engineer and Vanguard pull away from 8th**, when area powers triple. The Engineer overtakes the Adept at 8th and again at 20th.
- **The SF2e Witchwarper is the one base class that keeps up here**: within 10% of the Adept at 15th and from 17th to 19th, at four fights a day, and behind again at 20th (329 against 386).

### What a character can take

How many Strikes from a typical same-level SF2e creature (high attack, 0.9 of high damage) it takes to drop a character from full (arithmetic). Module cells are today / with option D's halved shield. The shield and barrier are counted as plain extra Hit Points: no recharge and no collapse rule.

| Level | Vanguard | Adept | Engineer, Infiltrator | Soldier | Sentinel | SF2e Soldier | SF2e Solarian | SF2e Operative | SF2e Witchwarper |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 14 / 10 | 15 / 11 | 15 / 10 | 14 / 10 | 17 / 11 | 7 | 5 | 5 | 5 |
| 3 | 15 / 12 | 13 / 10 | 14 / 10 | 15 / 12 | 18 / 14 | 7 | 5 | 4 | 4 |
| 5 | 16 / 13 | 13 / 11 | 14 / 11 | 15 / 13 | 19 / 16 | 8 | 6 | 5 | 5 |
| 8 | 13 / 11 | 10 / 8 | 12 / 10 | 12 / 11 | 17 / 14 | 9 | 7 | 4 | 5 |
| 10 | 12 / 11 | 10 / 8 | 12 / 9 | 12 / 10 | 18 / 15 | 8 | 7 | 5 | 4 |
| 13 | 18 / 15 | 15 / 12 | 16 / 13 | 18 / 15 | 23 / 19 | 12 | 9 | 6 | 6 |
| 16 | 14 / 12 | 12 / 10 | 13 / 11 | 13 / 11 | 20 / 17 | 9 | 8 | 6 | 5 |
| 20 | 12 / 11 | 10 / 9 | 11 / 9 | 16 / 14 | 22 / 19 | 13 | 7 | 6 | 5 |

What that is made of today, as HP + shield + barrier, and AC:

| Level | Vanguard | Adept | Engineer, Infiltrator | Soldier | Sentinel |
|---|---|---|---|---|---|
| 1 | 19 + 30 + 5, AC 18 | 15 + 30 + 5, AC 19 | 17 + 30, AC 19 | 22 + 30, AC 18 | 19 + 30, AC 20 |
| 5 | 68 + 40 + 15, AC 26 | 48 + 40 + 15, AC 26 | 58 + 40, AC 27 | 79 + 40, AC 26 | 68 + 40, AC 28 |
| 10 | 138 + 70 + 25, AC 31 | 98 + 70 + 25, AC 31 | 118 + 70, AC 32 | 160 + 70, AC 31 | 138 + 70, AC 33 |
| 16 | 232 + 100 + 40, AC 40 | 168 + 100 + 40, AC 40 | 200 + 100, AC 41 | 251 + 100, AC 40 | 232 + 100, AC 42 |
| 20 | 288 + 100 + 50, AC 45 | 208 + 100 + 50, AC 45 | 248 + 100, AC 46 | 332 + 100, AC 47 | 288 + 100, AC 49 |

- **A module character takes two to three times as many Strikes to drop as its SF2e counterpart**: Infiltrator 14 / 12 / 11 at 5th / 10th / 20th against the Operative's 5 / 5 / 6. Only the two Soldiers are close at the top (16 against 13).
- **The edge is largest at 1st to 5th**, where the shield is worth more than the character's own HP. That is why the shield change in option D does most of its work at low level.
- **Halved shields still leave an edge**: 8 to 15 Strikes against 4 to 9 for every SF2e class but the Soldier, because the armor's extra AC remains.
- **The Sentinel is the outlier it is meant to be**: 17 to 23 Strikes at every level.
- **Durability also runs in steps.** It dips at 8th to 10th and jumps at 13th, when armor expertise, the next armor grade and the Tier 4 shield mod arrive within two levels.

### The x(1 + level / 5) rule, level by level

The stronger of the two optional power-dice steps in the D section, at the levels where it changes anything (one target, as built to changed). The Soldier and Vanguard are not affected.

| Level | Adept | Engineer | Infiltrator | Sentinel | Party of four against SF2e's |
|---|---|---|---|---|---|
| 4 | 34 to 21 | 35 to 20 | 27 to 25 | 27 to 19 | x1.8 to x1.4 |
| 8 | 86 to 63 | 72 to 50 | 53 to 46 | 57 to 41 | x2.7 to x2.3 |
| 9 | 79 to 58 | 67 to 47 | 60 to 53 | 53 to 38 | x2.5 to x2.1 |
| 12 | 119 to 98 | 94 to 72 | 77 to 73 | 78 to 60 | x2.5 to x2.2 |
| 13 | 133 to 109 | 106 to 81 | 102 to 92 | 83 to 66 | x2.4 to x2.1 |
| 14 | 122 to 101 | 95 to 73 | 97 to 84 | 82 to 65 | x2.4 to x2.1 |
| 16 | 171 to 145 | 126 to 101 | 136 to 125 | 100 to 82 | x2.4 to x2.2 |
| 17 | 170 to 144 | 126 to 103 | 136 to 125 | 100 to 82 | x2.0 to x1.8 |
| 18 | 178 to 151 | 126 to 103 | 123 to 117 | 100 to 82 | x2.1 to x1.9 |
| 19 | 195 to 166 | 138 to 111 | 134 to 125 | 111 to 92 | x1.9 to x1.7 |
| 20 | 245 to 214 | 233 to 197 | 234 to 209 | 146 to 124 | x2.4 to x2.2 |

- It removes the 4th-level step altogether (the Adept deals 21 at 4th instead of 34) and moves the others to 5th, 10th, 15th and 20th.
- It lowers the party multiple by 0.2 to 0.4 at the levels it touches and leaves the staircase in place.

### What the curves say about the options

- **The gap is flat from 8th when measured against the enemy.** That fits an enemy rule that steps once at 8th, as option D's does, more than one that keeps growing.
- **20th level is the one place the characters jump and the enemies do not.** D's second step (HP and layers x1.5 from 16th) covers it for the enemies a 20th-level party meets. Stopping the dice at x5 would soften it from the other side.
- **Nothing here argues for changing a class.** The five damage classes track each other closely, and the dips are a level or two long.

## Options: every class on the Sentinel's line

Asked 2026-11-19: options for balancing the classes along the same curve, and at the same damage, as the Sentinel. Nothing here is written into the module. It is a set of options with measured effects, for a decision.

**The line.** The Sentinel deals 18 a round at 1st level, 32 at 5th, 63 at 10th, 100 at 16th and 146 at 20th on one target: 30 to 45% of a same-level enemy's Hit Points each round. From 5th to 20th the other classes average this far above it (measured):

| | Adept | Vanguard | Soldier | Engineer | Infiltrator |
|---|---|---|---|---|---|
| Damage as a multiple of the Sentinel's, 5th to 20th | x1.57 | x1.52 | x1.32 | x1.26 | x1.21 |
| Lowest and highest level | x1.09 to x1.76 | x1.14 to x1.74 | x0.96 to x1.51 | x1.09 to x1.60 | x0.94 to x1.60 |

At 1st to 3rd the Sentinel already matches or beats every class but the Vanguard, so nothing below 4th needs cutting.

**How this was measured.** Each class simulator was rerun at all twenty levels with one feature at a time switched off or scaled down, then with sets of them, and tied to the audit's rows as in the section above. None of it is checked in Foundry, because none of it exists.

### Where each class's lead comes from

The class's average multiple of the Sentinel from 5th to 20th, with one thing removed (measured):

| Class, as built | With this removed | Multiple of the Sentinel |
|---|---|---|
| **Adept, x1.57** | Biotic Explosion | x1.22 |
| | The +1 / +2 to power DCs from the Adept Mastery chain | x1.39 |
| | The free power after a Biotic Explosion (Improved Adept Mastery, 7th) | x1.39 |
| | The mastery's shorter cooldowns | x1.53 |
| **Vanguard, x1.52** | Half of Biotic Charge's dice | x1.38 |
| | Half of Nova's dice | x1.35 |
| | Both | x1.21 |
| **Soldier, x1.32** | The +2 / +4 / +6 damage from the Soldier Mastery chain | x1.14 |
| | The extra Strike from Adrenaline Rush | x1.21 |
| | The extra actions from the Adrenaline Rush reactions | x1.06 |
| **Engineer, x1.26** | The +1 / +2 to power DCs from the Engineer Mastery chain | x1.10 |
| | The mastery's cooldown cuts | x1.11 |
| | Apex Engineer's free power (20th only: 233 becomes 168) | x1.23 |
| **Infiltrator, x1.21** | Half of Tactical Cloak's dice | x1.04 |
| | Apex Infiltrator's automatic critical (20th only: 234 becomes 184) | x1.19 |

- **No class has one switch that does it.** The lead is the mastery chain plus the class's signature, and both have to give.
- **The drone and turret add nothing to the Engineer's number** in this frame. Its powers fill every action.
- **Most of the 20th-level jump is two features**: Apex Engineer's free power and Apex Infiltrator's automatic critical.

### Option S1: on the line

Each class within about 10% of the Sentinel from 5th to 20th (measured):

| Class | What changes | Multiple of the Sentinel, average (lowest to highest) | One target at 10 / 16 / 20 | Three targets at 10 / 16 / 20 |
|---|---|---|---|---|
| Sentinel | nothing | x1.00 | 63 / 100 / 146 | 83 / 131 / 232 |
| Adept | Biotic Explosion at half its dice; no free power after one; no DC bonus from the mastery chain; Biotic Resonance adds no damage | x1.06 (x0.98 to x1.16) | 67 / 102 / 157 | 99 / 150 / 233 |
| Engineer | No DC bonus from the mastery chain; Apex Engineer loses its free power and its extra die | x1.07 (x0.91 to x1.19) | 69 / 103 / 134 | 133 / 196 / 358 |
| Infiltrator | Tactical Cloak at half its dice; Apex Infiltrator loses the automatic critical | x1.02 (x0.84 to x1.14) | 55 / 115 / 149 | as one target |
| Soldier | The Soldier Mastery chain adds no damage; Adrenaline Rush gives no extra Strike | x1.05 (x0.74 to x1.18) | 58 / 113 / 156 | as one target |
| Vanguard | Biotic Charge and Nova at half their dice; no Weapon Synergy dice from Vanguard Strike; no void die from the mastery | x1.11 (x0.88 to x1.39) | 68 / 101 / 136 | 97 / 135 / 263 |

Every level, one target:

| Level | Vanguard | Adept | Engineer | Infiltrator | Soldier | Sentinel | Party of four against SF2e's, today | With S1 |
|---|---|---|---|---|---|---|---|---|
| 1 | 20 | 9 | 12 | 10 | 12 | 18 | x1.3 | x1.1 |
| 2 | 20 | 12 | 14 | 12 | 11 | 17 | x1.5 | x1.2 |
| 3 | 23 | 13 | 17 | 20 | 19 | 19 | x1.6 | x1.4 |
| 4 | 30 | 30 | 32 | 24 | 21 | 27 | x1.8 | x1.6 |
| 5 | 43 | 32 | 33 | 36 | 37 | 32 | x1.7 | x1.5 |
| 6 | 42 | 35 | 33 | 33 | 36 | 30 | x1.9 | x1.6 |
| 7 | 52 | 44 | 45 | 40 | 39 | 38 | x2.0 | x1.6 |
| 8 | 50 | 63 | 66 | 47 | 42 | 57 | x2.7 | x2.2 |
| 9 | 53 | 57 | 60 | 54 | 51 | 52 | x2.5 | x2.0 |
| 10 | 68 | 67 | 69 | 55 | 58 | 63 | x2.5 | x1.9 |
| 11 | 68 | 61 | 63 | 61 | 56 | 57 | x2.2 | x1.7 |
| 12 | 76 | 80 | 85 | 67 | 77 | 78 | x2.4 | x1.9 |
| 13 | 96 | 84 | 87 | 90 | 98 | 83 | x2.3 | x1.8 |
| 14 | 88 | 80 | 84 | 85 | 88 | 82 | x2.4 | x1.7 |
| 15 | 105 | 92 | 95 | 102 | 107 | 91 | x2.3 | x1.6 |
| 16 | 101 | 102 | 103 | 115 | 113 | 100 | x2.4 | x1.7 |
| 17 | 104 | 102 | 103 | 115 | 113 | 100 | x2.0 | x1.4 |
| 18 | 99 | 108 | 102 | 107 | 108 | 99 | x2.0 | x1.4 |
| 19 | 124 | 121 | 116 | 118 | 123 | 111 | x1.9 | x1.3 |
| 20 | 136 | 157 | 134 | 149 | 156 | 146 | x2.4 | x1.6 |

- **The Vanguard cannot be brought all the way down with the pieces that are open.** It stays 30 to 40% above the Sentinel at 5th to 7th and is level from 8th. Closing the rest means Biotic Melee or the Rush reset, which are ruled out.
- **The Engineer stays 1.5 times the Sentinel across three targets.** Its area powers are untouched here.
- **Gun classes cannot follow the Sentinel's steps exactly.** Their damage steps with weapon grades (5th, 12th to 13th, 19th), the Sentinel's with power dice (4th, 8th, 12th, 16th, 20th). The Soldier swings between x0.74 and x1.18.
- **Against base SF2e**: a party of four is 1.6 to 1.9 times an SF2e party at 10th to 16th (2.3 to 2.5 today) and 1.6 times at 20th (2.4 today).

### Option S2: a fifth above the line

The Sentinel pays for its damage with the best defenses in the module (below). S2 leaves the other classes about 20% ahead of it, with one or two changes each (measured):

| Class | What changes | Multiple of the Sentinel, average (lowest to highest) | One target at 10 / 16 / 20 |
|---|---|---|---|
| Adept | No free power after a Biotic Explosion; no DC bonus from the mastery chain | x1.22 (x1.03 to x1.33) | 82 / 121 / 178 |
| Engineer | Apex Engineer loses its free power | x1.23 (x1.06 to x1.30) | 76 / 126 / 168 |
| Infiltrator | Apex Infiltrator loses the automatic critical | x1.18 (x0.92 to x1.37) | 67 / 135 / 180 |
| Soldier | Adrenaline Rush gives no extra Strike | x1.22 (x0.89 to x1.39) | 68 / 131 / 174 |
| Vanguard | Biotic Charge and Nova at two thirds of their dice; no Weapon Synergy dice from Vanguard Strike | x1.23 (x0.95 to x1.49) | 75 / 112 / 156 |

Every level, one target:

| Level | Vanguard | Adept | Engineer | Infiltrator | Soldier | Sentinel | Party of four against SF2e's, today | With S2 |
|---|---|---|---|---|---|---|---|---|
| 1 | 21 | 10 | 12 | 12 | 17 | 18 | x1.3 | x1.3 |
| 2 | 20 | 14 | 15 | 13 | 16 | 17 | x1.5 | x1.4 |
| 3 | 23 | 15 | 18 | 22 | 22 | 19 | x1.6 | x1.5 |
| 4 | 31 | 32 | 33 | 29 | 25 | 27 | x1.8 | x1.7 |
| 5 | 45 | 33 | 34 | 40 | 42 | 32 | x1.7 | x1.6 |
| 6 | 45 | 37 | 35 | 37 | 39 | 30 | x1.9 | x1.8 |
| 7 | 57 | 47 | 49 | 43 | 48 | 38 | x2.0 | x1.8 |
| 8 | 55 | 70 | 72 | 53 | 51 | 57 | x2.7 | x2.4 |
| 9 | 60 | 63 | 67 | 59 | 59 | 52 | x2.5 | x2.2 |
| 10 | 75 | 82 | 76 | 67 | 68 | 63 | x2.5 | x2.2 |
| 11 | 76 | 76 | 71 | 69 | 65 | 57 | x2.2 | x1.9 |
| 12 | 85 | 95 | 94 | 84 | 88 | 78 | x2.4 | x2.2 |
| 13 | 106 | 98 | 106 | 102 | 115 | 83 | x2.3 | x2.0 |
| 14 | 98 | 93 | 95 | 101 | 104 | 82 | x2.4 | x2.0 |
| 15 | 116 | 109 | 112 | 122 | 124 | 91 | x2.3 | x1.9 |
| 16 | 112 | 121 | 126 | 135 | 131 | 100 | x2.4 | x2.0 |
| 17 | 122 | 121 | 124 | 138 | 130 | 100 | x2.0 | x1.6 |
| 18 | 114 | 126 | 127 | 122 | 123 | 99 | x2.0 | x1.7 |
| 19 | 137 | 141 | 138 | 134 | 138 | 111 | x1.9 | x1.5 |
| 20 | 156 | 178 | 168 | 180 | 174 | 146 | x2.4 | x1.8 |

- **The Engineer and Infiltrator only change at 20th.** They are already about a fifth above the Sentinel below that.
- **Against base SF2e**: 2.0 to 2.2 times at 10th to 16th, 1.8 times at 20th.

### What either one does to the fights, and to option D

Rounds to win / share of the party's HP lost / chance a character drops, for Soldier, Vanguard, Adept, Engineer (measured). "Strike rule" is option D's +2 to hit, Strike damage x1.25 and power DC +2 for enemies. "HP step" is D's x1.25 from 8th and x1.5 from 16th.

| | 80 XP, boss | 80 XP, group | 120 XP | 160 XP |
|---|---|---|---|---|
| **10th level** | | | | |
| **Target** | 2.8 / 27% / 18% | 2.7 / 37% / 11% | 3.1 / 46% / 43% | 4.3 / 70% / 84% (wins 84%) |
| D as designed, no class changes | 2.3 / 20% / 20% | 2.2 / 17% / 8% | 3.1 / 36% / 44% | 4.4 / 72% / 86% (wins 73%) |
| S1, half shield, Strike rule, no HP step | 2.4 / 20% / 22% | 2.2 / 18% / 8% | 3.2 / 37% / 46% | 4.5 / 75% / 88% (wins 68%) |
| S1 with all of D | 3.0 / 27% / 31% | 2.9 / 24% / 16% | 3.9 / 49% / 61% | 5.5 / 91% / 97% (wins 33%) |
| S2, half shield, Strike rule, no HP step | 2.1 / 17% / 17% | 2.0 / 15% / 5% | 2.9 / 31% / 36% | 3.9 / 64% / 79% (wins 82%) |
| S2 with all of D | 2.6 / 23% / 25% | 2.5 / 20% / 10% | 3.4 / 41% / 50% | 4.9 / 81% / 92% (wins 57%) |
| S1, half shield, stock SF2e creatures | 1.8 / 5% / 0% | 2.0 / 7% / 0% | 2.1 / 11% / 2% | 2.6 / 20% / 10% |
| **16th level** | | | | |
| **Target** | 2.5 / 20% / 5% | 2.9 / 37% / 9% | 3.0 / 39% / 24% | 3.7 / 51% / 55% (wins 98%) |
| D as designed, no class changes | 2.2 / 14% / 8% | 2.6 / 18% / 8% | 3.1 / 29% / 25% | 4.0 / 50% / 63% (wins 96%) |
| S1, half shield, Strike rule, no HP step | 2.1 / 12% / 6% | 2.9 / 21% / 11% | 3.1 / 29% / 26% | 3.7 / 46% / 55% (wins 98%) |
| S1 with all of D | 3.0 / 21% / 15% | 3.3 / 28% / 19% | 4.2 / 44% / 48% | 5.7 / 79% / 89% (wins 65%) |
| S2, half shield, Strike rule, no HP step | 2.0 / 10% / 4% | 2.4 / 17% / 7% | 2.7 / 25% / 20% | 3.2 / 38% / 43% |
| S2 with all of D | 2.6 / 17% / 11% | 3.0 / 23% / 12% | 3.6 / 36% / 34% | 4.8 / 65% / 80% (wins 86%) |
| S1, half shield, stock SF2e creatures | 1.7 / 4% / 0% | 2.1 / 9% / 0% | 2.2 / 11% / 1% | 2.6 / 15% / 3% |
| **20th level** | | | | |
| **Target** | 2.2 / 17% / 4% | 2.6 / 35% / 7% | 2.6 / 33% / 18% | 3.3 / 42% / 45% |
| D as designed, no class changes | 2.1 / 13% / 7% | 2.1 / 16% / 6% | 2.6 / 25% / 20% | 3.5 / 44% / 54% (wins 98%) |
| S1, half shield, Strike rule, no HP step | 2.1 / 13% / 8% | 2.2 / 17% / 6% | 2.8 / 27% / 23% | 3.7 / 46% / 58% (wins 98%) |
| S1 with all of D | 3.1 / 22% / 18% | 3.2 / 29% / 21% | 4.1 / 43% / 50% | 5.6 / 80% / 92% (wins 66%) |
| S2, half shield, Strike rule, no HP step | 2.0 / 11% / 5% | 2.0 / 14% / 3% | 2.3 / 22% / 15% | 3.2 / 38% / 47% |
| S2 with all of D | 2.8 / 19% / 14% | 3.0 / 25% / 14% | 3.4 / 35% / 36% | 4.8 / 67% / 82% (wins 85%) |
| S1, half shield, stock SF2e creatures | 1.8 / 4% / 0% | 2.0 / 12% / 0% | 2.1 / 12% / 1% | 2.4 / 16% / 4% |

- **S1 does the job of D's enemy HP step.** With the classes on the Sentinel's line, the halved shield and the Strike rule give the same fights as D as designed, and enemies keep the Hit Points SF2e's tables give them.
- **S1 or S2 stacked on all of D is too much.** At the three levels shown, the 160 XP fight is won 33 to 66% of the time under S1 and 57 to 86% under S2.
- **S2 without the HP step runs a little kind** (38 to 64% lost at 160 XP against a target of 42 to 70%). A half step would close it.
- **Stock SF2e creatures are still easy even at S1.** A module party at the Sentinel's damage still out-damages an SF2e party by half again or more, and keeps its armor and half its shield. A 160 XP fight costs it 12 to 21% from 5th to 20th.
- **Class changes on their own change little**: without the shield change and the Strike rule, an 80 XP fight still costs 2 to 6% under S1.

### The catch

- **At equal damage the Sentinel is the strongest class in the module.** It takes 17 to 23 Strikes to drop at every level, against 10 to 18 for the others (previous section). Today it pays for that with the lowest damage. S1 removes the price. S2 keeps it.
- **S1 rewrites the centre of every class**: three mastery chains lose their damage, and Biotic Explosion, Tactical Cloak, Biotic Charge and Nova are halved. Every row of `class-audit.md` would be redone. S2 touches one or two things a class and leaves the signatures alone, apart from the Vanguard's dice.
- **The Vanguard is the one class these options cannot settle** inside the limits set for it. Under S1 it leads at 5th to 7th and trails at 20th (136 against 146), because Apex Vanguard's second Nova is its only capstone left at full strength.
- **Raising the Sentinel instead** would level the classes with one class changed, but it widens the gap with base SF2e, which is the opposite of what option D is for. It was not measured.
- **Everything here is one build per class.** A class cut on its main line may have a second build that the cuts miss; the audit's other builds were not rerun.

### Recommendation

**S2, with the halved shield and the enemy Strike rule from D, and without D's enemy HP step.**
- It brings the five classes into a band of about 1.2 times the Sentinel, where today they span 1.2 to 1.6.
- It takes the party from 2.4 times an SF2e party to about 2 (1.8 at 20th) and trims the 20th-level jump: the Engineer's from +69% to +22%, the Infiltrator's from +75% to +34%.
- Enemies keep SF2e's Hit Points, so the enemy rule is one line: +2 to hit, Strike damage x1.25, power DC +2.
- The Sentinel keeps its trade, and no signature feature is halved except the Vanguard's dice.

S1 is the option to take if the goal is the smallest possible gap with SF2e and you accept the Sentinel becoming the best class, or want its defenses looked at next.

Decisions needed:
1. S1, S2 or neither.
2. If either: drop option D's enemy HP step, as measured here, and keep its shield change and Strike rule.
3. The Vanguard: accept that it sits above the line at 5th to 7th under S1, or reopen Biotic Melee or the Rush reset.
4. Under S1: whether the Sentinel's defenses should be looked at.

## The tiered design: damage by role

Chosen 2026-11-19: option S2, then tiered by role instead of flat, then with the stronger of the two Infiltrator lifts. This section is the design. It was built on 2026-11-19 after the go-ahead; "What was built" below says what went in, where it differs from the design, and what was checked.

### The roles

A class earns damage by being fragile, by taking risks or by being narrow. One target, as a multiple of the Sentinel's damage from 5th to 20th (measured):

| Class | Role | Today | Target | Design lands at (lowest to highest level) | One target at 10 / 16 / 20 | Three targets at 10 / 16 / 20 |
|---|---|---|---|---|---|---|
| Infiltrator | Heaviest on one target; nothing on a group | x1.22 | about x1.4 | x1.40 (x1.14 to x1.62) | 80 / 162 / 216 | as one target |
| Vanguard | Heavy up close, on one target and the group around it | x1.52 | x1.3 to x1.4 | x1.39 (x1.06 to x1.57) | 82 / 136 / 178 | 115 / 175 / 318 |
| Soldier | Steady middle; tough and needs no cooldowns | x1.32 | about x1.2 | x1.23 (x0.88 to x1.40) | 66 / 131 / 186 | as one target |
| Adept | Middle on one target; heavy across a group | x1.56 | about x1.2 | x1.22 (x1.03 to x1.33) | 82 / 121 / 178 | 129 / 190 / 279 |
| Engineer | Middle on one target; heaviest across a group | x1.25 | x1.1 to x1.2 | x1.22 (x1.06 to x1.30) | 76 / 126 / 168 | 147 / 241 / 448 |
| Sentinel | The line; best defenses | x1.00 | x1.0 | unchanged | 63 / 100 / 146 | 83 / 131 / 232 |

### The changes, class by class

| Class | Change | Where |
|---|---|---|
| Infiltrator | Tactical Cloak's precision dice go from 2d6 to 3d6 for each step of the power-dice rule (3d6 at 1st, 9d6 at 8th, 18d6 at 20th). Assassination Protocol still adds one more die a step, so it now starts the cloak from 4d6 | `me-tech-powers/tactical-cloak-feat.json` and `tactical-cloak-effect.json`; the text of `me-class-progressions/infiltrator-assassination-protocol.json` |
| | Improved Infiltrator Mastery adds 4d6 to cloaked Strikes, where today it is 2d6. Still not multiplied by level | `me-combat-passives/infiltrator-mastery-improved.json` |
| | Apex Infiltrator no longer turns the first cloaked hit of a turn into a critical. It keeps Hunter's Mark as a free action and Phantom Protocol on every kill | `me-class-progressions/infiltrator-apex-infiltrator.json` and its automation |
| Vanguard | Nova deals 2d6 plus 1d6 for every 10 HP in the barrier, where today it is every 5. Biotic Charge, Biotic Melee, Vanguard Rush, Vanguard Strike and Apex Vanguard are untouched | `me-biotic-powers/nova-feat.json`; `novaDice` in `scripts/me-powers.js` |
| Soldier | Each step of the Soldier Mastery chain adds +1 damage to Strikes, where today it is +2 (so +1 / +2 / +3 at 1st / 7th / 13th). Adrenaline Rush is untouched | The three `me-combat-passives/soldier-mastery*.json` |
| Adept | The Adept Mastery chain no longer adds to power DCs (+1, then +2 at 13th, today) | `me-combat-passives/adept-mastery.json` and `adept-mastery-superior.json` |
| | Improved and Superior Adept Mastery no longer give a free power after a Biotic Explosion. Biotic Explosion itself, the shorter cooldowns and Biotic Resonance are untouched | `adept-mastery-improved.json`, `adept-mastery-superior.json`, and the reminder on the Biotic Explosion card |
| Engineer | Apex Engineer no longer makes the first tech power of each round free. It keeps +1d6 on tech powers and +2 on Strikes | `me-class-progressions/engineer-apex-engineer.json` |
| Sentinel | Nothing | |

- **Thirteen pack files and three places in the engine**, plus the texts that repeat these numbers and the five class rows in `class-audit.md`.
- **Two things asked about earlier fall away**: Adrenaline Rush stays a free action, and Vanguard Strike keeps its Weapon Synergy dice.
- **Enemy Vanguards use the same Nova rule**, so their Nova halves too.

### Every level

One target, with all three targets in brackets (measured):

| Level | Infiltrator | Vanguard | Soldier | Adept | Engineer | Sentinel | Party of four against SF2e's, today | With the design |
|---|---|---|---|---|---|---|---|---|
| 1 | 13 | 22 | 14 | 10 (14) | 12 (18) | 18 (23) | x1.3 | x1.2 |
| 2 | 15 | 22 (27) | 14 | 14 (25) | 15 (20) | 17 (21) | x1.5 | x1.4 |
| 3 | 24 | 25 (31) | 22 | 15 (26) | 18 (24) | 19 (23) | x1.6 | x1.6 |
| 4 | 32 | 32 (41) | 25 | 32 (51) | 33 (43) | 27 (30) | x1.8 | x1.7 |
| 5 | 44 | 47 (60) | 42 | 33 (53) | 34 (42) | 32 (37) | x1.7 | x1.6 |
| 6 | 40 | 47 (59) | 39 | 37 (58) | 35 (45) | 30 (44) | x1.9 | x1.8 |
| 7 | 52 | 60 (75) | 47 | 47 (75) | 49 (77) | 38 (57) | x2.0 | x1.8 |
| 8 | 65 | 60 (82) | 50 | 70 (111) | 72 (141) | 57 (79) | x2.7 | x2.5 |
| 9 | 68 | 65 (87) | 58 | 63 (99) | 67 (131) | 52 (73) | x2.5 | x2.3 |
| 10 | 80 | 82 (115) | 66 | 82 (129) | 76 (147) | 63 (83) | x2.5 | x2.3 |
| 11 | 80 | 82 (115) | 65 | 76 (118) | 71 (130) | 57 (75) | x2.2 | x2.0 |
| 12 | 99 | 92 (125) | 90 | 95 (148) | 94 (167) | 78 (101) | x2.4 | x2.2 |
| 13 | 119 | 119 (157) | 116 | 98 (151) | 106 (182) | 83 (109) | x2.3 | x2.1 |
| 14 | 114 | 123 (158) | 104 | 93 (143) | 95 (159) | 82 (106) | x2.4 | x2.1 |
| 15 | 137 | 141 (184) | 124 | 109 (169) | 112 (190) | 91 (119) | x2.3 | x2.0 |
| 16 | 162 | 136 (175) | 131 | 121 (190) | 126 (241) | 100 (131) | x2.4 | x2.1 |
| 17 | 162 | 145 (187) | 131 | 121 (190) | 124 (242) | 100 (131) | x2.0 | x1.7 |
| 18 | 143 | 141 (183) | 127 | 126 (197) | 127 (245) | 99 (131) | x2.0 | x1.8 |
| 19 | 156 | 168 (233) | 139 | 141 (220) | 138 (266) | 111 (144) | x1.9 | x1.6 |
| 20 | 216 | 178 (318) | 186 | 178 (279) | 168 (448) | 146 (232) | x2.4 | x1.9 |

- **The Vanguard leads on one target at 5th to 7th.** From 12th the Infiltrator and Vanguard share the lead, and the Infiltrator is clearly ahead at 16th, 17th and 20th.
- **From 8th to 11th the tiers are not visible.** The Infiltrator, Vanguard, Adept and Engineer are within about 20% of each other, and the Adept and Engineer nose ahead at 8th when their dice triple. The Soldier trails all four until its weapon steps at 12th and 13th.
- **The Engineer and Adept lead across a group at every level from 8th.**
- **20th level stops being a cliff.** From 19th to 20th the classes gain 6 to 38%, where today it is 19 to 75%. The Sentinel's own step is 32%.
- **Against base SF2e**, a party of four is 2.0 to 2.3 times an SF2e party at 10th to 16th (2.3 to 2.5 today) and 1.9 times at 20th (2.4 today).

### What goes with it: the shield and the enemies

Option D's shield change stays as designed: the kinetic shield at half size and half recharge. The enemy rule shrinks, because the classes now deal less:

| Enemy's level | Strikes | Power DC | HP, shield, frame and barrier |
|---|---|---|---|
| Up to 2nd | unchanged | unchanged | unchanged |
| 3rd to 7th | +2 to hit, damage x1.25 | +2 | unchanged |
| 8th to 15th | +2 to hit, damage x1.25 | +2 | x1.1 (was x1.25 in D) |
| 16th and up | +2 to hit, damage x1.25 | +2 | x1.25 (was x1.5 in D) |

Rounds to win / share of the party's HP lost / chance a character drops, for Soldier, Vanguard, Adept, Engineer (measured, 3,000 fights a cell):

| | 80 XP, boss | 80 XP, group | 120 XP | 160 XP |
|---|---|---|---|---|
| **5th level** | | | | |
| **Target** | 2.2 / 26% / 22% | 2.0 / 27% / 3% | 3.2 / 46% / 50% | 4.2 / 75% / 86% (wins 73%) |
| D as designed, no class changes | 2.2 / 17% / 20% | 2.0 / 7% / 1% | 3.1 / 29% / 38% | 4.6 / 69% / 83% (wins 74%) |
| Tiered, half shield, Strike rule, no HP step | 2.4 / 18% / 22% | 2.1 / 8% / 2% | 3.2 / 32% / 41% | 4.8 / 72% / 85% (wins 69%) |
| Tiered, with the half HP step (the design) | 2.4 / 18% / 22% | 2.1 / 8% / 2% | 3.2 / 31% / 39% | 4.8 / 72% / 85% (wins 67%) |
| **10th level** | | | | |
| **Target** | 2.8 / 27% / 18% | 2.7 / 38% / 11% | 3.1 / 46% / 43% | 4.3 / 71% / 83% (wins 82%) |
| D as designed, no class changes | 2.3 / 19% / 19% | 2.2 / 17% / 8% | 3.1 / 37% / 45% | 4.4 / 73% / 87% (wins 71%) |
| Tiered, half shield, Strike rule, no HP step | 2.1 / 17% / 16% | 2.0 / 15% / 5% | 2.8 / 31% / 35% | 3.9 / 62% / 77% (wins 87%) |
| Tiered, with the half HP step (the design) | 2.2 / 18% / 17% | 2.1 / 16% / 6% | 3.0 / 34% / 41% | 4.3 / 70% / 84% (wins 75%) |
| Tiered, with all of D's HP step | 2.6 / 22% / 24% | 2.4 / 19% / 10% | 3.4 / 40% / 48% | 4.8 / 80% / 91% (wins 58%) |
| **13th level** | | | | |
| **Target** | 2.3 / 19% / 6% | 2.8 / 37% / 9% | 3.0 / 40% / 27% | 3.6 / 51% / 53% (wins 98%) |
| D as designed, no class changes | 2.1 / 11% / 7% | 2.5 / 12% / 3% | 3.0 / 24% / 19% | 3.7 / 43% / 51% (wins 97%) |
| Tiered, half shield, Strike rule, no HP step | 2.0 / 10% / 4% | 2.2 / 10% / 2% | 2.8 / 21% / 16% | 3.3 / 37% / 43% |
| Tiered, with the half HP step (the design) | 2.0 / 10% / 5% | 2.4 / 11% / 3% | 3.0 / 24% / 19% | 3.7 / 42% / 50% (wins 98%) |
| Tiered, with all of D's HP step | 2.2 / 13% / 8% | 2.8 / 14% / 5% | 3.2 / 27% / 24% | 4.2 / 50% / 61% (wins 94%) |
| **16th level** | | | | |
| **Target** | 2.5 / 21% / 5% | 2.9 / 38% / 10% | 3.0 / 40% / 25% | 3.7 / 51% / 54% |
| D as designed, no class changes | 2.2 / 13% / 7% | 2.6 / 18% / 8% | 3.1 / 29% / 25% | 4.0 / 51% / 64% (wins 95%) |
| Tiered, half shield, Strike rule, no HP step | 1.9 / 9% / 4% | 2.3 / 16% / 6% | 2.5 / 23% / 18% | 3.1 / 36% / 41% |
| Tiered, with the half HP step (the design) | 2.1 / 12% / 6% | 2.6 / 18% / 8% | 3.0 / 28% / 23% | 3.8 / 48% / 59% (wins 97%) |
| Tiered, with all of D's HP step | 2.5 / 16% / 10% | 2.9 / 21% / 11% | 3.4 / 34% / 31% | 4.6 / 61% / 75% (wins 89%) |
| **20th level** | | | | |
| **Target** | 2.2 / 17% / 4% | 2.6 / 35% / 8% | 2.6 / 34% / 18% | 3.2 / 42% / 43% |
| D as designed, no class changes | 2.1 / 13% / 7% | 2.1 / 16% / 6% | 2.6 / 24% / 18% | 3.5 / 44% / 56% (wins 98%) |
| Tiered, half shield, Strike rule, no HP step | 2.0 / 10% / 5% | 2.0 / 13% / 3% | 2.2 / 20% / 15% | 3.0 / 36% / 43% |
| Tiered, with the half HP step (the design) | 2.1 / 14% / 8% | 2.3 / 18% / 7% | 2.9 / 27% / 23% | 3.8 / 48% / 62% (wins 98%) |
| Tiered, with all of D's HP step | 2.6 / 18% / 13% | 2.8 / 23% / 12% | 3.3 / 34% / 33% | 4.6 / 63% / 79% (wins 88%) |

- **The design gives the same fights as D did, with half the enemy HP step.** The 160 XP fight costs 42 to 72% of the party's HP against a target of 42 to 75%.
- **Without any HP step it runs kind from 10th up** (36 to 62% at 160 XP). With all of D's step it runs harsh.
- **The second party** (Sentinel, Infiltrator, Adept, Vanguard) was run without the HP step and with a x1.25 step from 12th; it came out within 2 points of the first in both.
- **Stock SF2e creatures are still easy**: a 160 XP fight costs 10 to 19%. The guidance from the D section stands (double their HP, half again to their damage).

### What the other builds do

The cuts are measured on each class's main build. The audit's other builds under the same rules, as an average multiple of the Sentinel from 5th to 20th (measured; figures below 10th lean on the main build's scaling):

| Build | Today | Under the design | In its tier? |
|---|---|---|---|
| Soldier with a shotgun | x1.56 | x1.49 | No: above the Soldier's x1.2. It pays with range |
| Soldier, other rifle builds (passives, ammo, concussive, rush) | not rerun | x1.01 to x1.11 | A little under |
| Engineer, Tech Mastery build | not rerun | x1.36 | Above the Engineer's x1.2 |
| Engineer, other builds (powers, drone and turret) | not rerun | x1.14 to x1.23 | Yes |
| Adept, Biotic Mastery build | not rerun | x1.13 | A little under |
| Vanguard, Juggernaut | x1.40 | x1.30 | Yes |
| Vanguard, Shotgunner | x1.39 | x1.29 | Yes |
| Vanguard, Brawler | x1.11 | x0.98 | No: it drops to the Sentinel's level. Left as it is, by decision |

- **Two builds sit above their tier**: the shotgun Soldier and the Tech Mastery Engineer. Neither is caused by this design; both are there today.
- **The Brawler Vanguard was already the weak Vanguard build** and the Nova change takes a little more from it. It is left alone.

### What was built

Built 2026-11-19, after the go-ahead. The changes are in the working tree, not committed.

**As designed:**
- The class changes in the table above: thirteen feature files in `src/packs`, Nova's dice in `scripts/me-powers.js`, and the removal of Apex Infiltrator's critical-hit marker and the free-power reminder on the Biotic Explosion card.
- The kinetic shield at half size: 15 points recharging 5, and 20 / 25 / 35 / 50 with the four HP mods.
- The enemy rule, applied by a new script, `scripts/apply-enemy-rule.mjs`, to 215 stat blocks. It marks each stat block it has done, so it is safe to run again; run it on any new NPC before building the packs.
- The packs are rebuilt, the engine tests pass, and the conversion document (Markdown, HTML and PDF) is regenerated from the packs.

**Where the build differs from the design, and why:**
- **Enemy shields are halved too.** A stat block's shield is a copy of the compendium item, so it takes the new values like a player's. The points each enemy's shield lost went into its Hit Points, so every enemy is as hard to drop as the design intended. The fights were rerun this way at 3rd, 5th, 10th, 16th and 20th and came out within 2 points of the tables above.
- **The enemy HP step is all in Hit Points.** Combat frames and shields keep their compendium sizes; the 10% or 25% is added to HP so that HP plus layers is that much higher.
- **Recharge with the regen mods is 8 / 10 / 13 / 15**, not 7 / 10 / 12 / 15: the engine rounds to the nearest point.
- **Enemy power DCs use one formula with the +2 built in from 3rd level**, written with `floor()` only, so the 79 places that share it stay copies of the compendium powers. Fixed save DCs on enemy abilities of 3rd level and up went up 2 as well.
- **An enemy's Tactical Cloak uses the same effect as a player's**, so it is 3d6 a step for enemies too.
- **Five hostile vehicles got the enemy rule** (the four Atlas Mechs and the Cerberus Gunship). The Kodiak, Mako and Hammerhead were left alone as party vehicles. Companions and other allied stat blocks in the NPC pack got the rule like everything else there.
- **Characters already in a world are updated once**, when a GM first loads the world with this version: old-valued shield items take the new values, temp HP is capped, and the twelve changed features take their text and rules from the compendium. A dialog lists what changed. NPCs already in a world are left alone and need re-importing.

**A correction to this report.** Part 2 says the module's highest enemy is level 16 and that it has 210 stat blocks. That count missed the vehicles pack, which has eight more: the Atlas Mech Mk.III is level 16 and the Mk.IV is level 19. So one enemy above 16th did exist. The findings do not change (one level 19 mech does not make 17th to 22nd a covered range), but the statement was wrong.

**Checked in Foundry** (test world, new build installed; test actors deleted afterwards, chat log left at 3152):
- A 20th-level character with the cloak effect, Improved Infiltrator Mastery and Assassination Protocol rolls 28d6 precision on a cloaked Strike (18 + 6 + 4), with no adjustment to its degree of success from Apex Infiltrator.
- The Soldier Mastery chain adds +3 to Strike damage at 13th. The Adept Mastery chain adds nothing to the class DC and still cuts cooldowns.
- Nova's dice from the engine: 3d6 at 14 barrier HP, 7d6 at 50, 8d6 at 65.
- An imported Cerberus Dragoon (level 6) has 125 HP, a 25-point shield, Strikes at +19 for 3d8+11 and 3d10+15, and its Lash at DC 23. The DC formula gives 15 at 2nd level (no +2) and 19 at 3rd.
- The one-time update: a character given old shield values and an old Soldier Mastery came back with 15 + 35 shield, temp HP capped at 50 with no shield-collapse message, +1 damage, and the dialog listing it. A 30-point hit on the 50-point shield collapsed it (threshold 25).
- Two faults in the update were found and fixed this way: lowering temp HP was being read as damage, and the dialog call did not exist in Foundry v14.

**Not checked:**
- No fight was played. The class numbers and fight results are still simulation.
- The other eleven changed features and the 214 other stat blocks were not opened one by one in Foundry; the tests read the main values from the packs.
- The test world's own characters (five Vanguards) had their Nova feat refreshed by the one-time update. A copy of the world's data from before is in the sessions' shared notes folder (`power-level-review/world-backup-2026-11-19`).

**New things the build turned up:**
- **Improved Adept Mastery was left an empty step.** With the free power gone it granted only what Adept Mastery already gives. Filled on 2026-11-20 with a knockdown: see "Improved Adept Mastery: the knockdown" at the end.
- **The generator scripts in `scripts/` (`generate-*.mjs`) no longer match the packs** and were not updated. They were already out of step before this change. The packs are the source.
- **`migrateActorItems` in `scripts/shield-system.js` calls `DialogV2.alert`, which does not exist in Foundry v14.** It only runs when that older repair finds something to fix. Not touched.

### What this does not settle

- **The class numbers and the fights are simulated.** What was checked in Foundry is listed under "What was built".
- **The Infiltrator's figures are firmer than they were.** With Improved Infiltrator Mastery's 2d6 and Assassination Protocol's extra dice switched on in the simulator, as the module has them, it matches the audit's row at 1st, 5th, 16th, 19th and 20th and runs about 12% high at 10th and 13th. The Infiltrator figures in the S1 and S2 tables of the previous section were measured before that correction.
- **The stronger lift came out a little smaller on re-measuring.** It was offered as x1.43 with a lead from 8th. Measured properly it is x1.40, level with the pack at 8th to 11th and sharing the lead from 12th. Taking the mastery's dice to 6d6 instead of 4d6 would give x1.47 and a lead from 10th.
- **The enemy HP step of x1.1 is small enough to be fiddly.** Dropping it and keeping only x1.25 from 16th would be simpler; that exact rule was not run.
- **1st and 2nd level, healing, and fights played at the table** are still unmeasured, as in the D section.
- **The module still has no enemies at 17th to 22nd.**

Decided: tiered by role; the stronger Infiltrator lift; the Brawler Vanguard left alone; build it (done).

Decisions needed:
1. Whether to commit the build.
2. What Improved Adept Mastery should give in place of the free power. Decided and built 2026-11-20: the knockdown.
3. Whether the shotgun Soldier and the Tech Mastery Engineer are looked at next.
4. Whether to design level 17 to 22 enemies on the new rule. That design would come back for approval before any file is written.

## Stock SF2e classes: searched builds, and the module's shield and guns

Added 2026-11-20. Two follow-up questions from the user: how base Starfinder 2e classes fare when given the module's kinetic shield and guns, and whether the SF2e baselines in this review used the classes' best feats. They did not. This section replaces those baselines with searched builds. Everything here is **measured** (simulation); nothing was tried in Foundry and nothing in the module was changed.

### What the first pass missed

The first pass gave each class one main routine. Reading every class feat in the system's compendium (**confirmed**) turned up these, which the searched builds now use:

- **Operative (Sniper):** reaction shots at no attack penalty (Hair Trigger from 6th, Kill Steal from 2nd), Grazing Shot (12th), Burst Fire (16th), Infinite Aim (20th), and the Sniper's 9th-level exploit, which forgives the first missed shot and reloads a sniper weapon for free once a turn.
- **Soldier:** Punishing Salvo (4th), Overwatch reaction shots at suppressed enemies (8th, twice a round from 18th), Bullet Typhoon (20th).
- **Envoy:** That'll Show 'Em (12th) and Tag Team (10th), both reaction Strikes at no penalty.
- **Mechanic:** Energy Expulsion (10th), which adds a blast around the turret to every turret shot; Auto Target (8th); the Pinpoint Shot mod kept up all day from 13th; mines at 1st to 4th.
- **Solarian:** Constellation Vortex (6th) for the third action, Cosmic Alignment (20th).
- **Witchwarper:** unchanged. Its spells were already the best damage spells of each rank, and its feats add almost no damage.

### Damage on one target

Average damage a round against a same-level enemy, four rounds.

| Level | 1 | 3 | 5 | 7 | 10 | 13 | 16 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| **Module, as built** | | | | | | | | | |
| Infiltrator | 13 | 24 | 44 | 52 | 80 | 119 | 162 | 156 | 216 |
| Vanguard | 22 | 25 | 47 | 60 | 82 | 119 | 136 | 168 | 178 |
| Soldier | 14 | 22 | 42 | 47 | 66 | 116 | 131 | 139 | 186 |
| Adept | 10 | 15 | 33 | 47 | 82 | 98 | 121 | 141 | 178 |
| Engineer | 12 | 18 | 34 | 49 | 76 | 106 | 126 | 138 | 168 |
| Sentinel | 18 | 19 | 32 | 38 | 63 | 83 | 100 | 111 | 146 |
| **SF2e, first pass** | | | | | | | | | |
| Operative | 16 | 17 | 37 | 39 | 39 | 64 | 65 | 96 | 96 |
| Soldier | 9 | 9 | 21 | 24 | 32 | 38 | 55 | 74 | 74 |
| Envoy | 11 | 11 | 23 | 24 | 22 | 34 | 38 | 41 | 37 |
| Mechanic | 6 | 8 | 20 | 21 | 18 | 32 | 37 | 40 | 33 |
| Solarian | 16 | 17 | 30 | 30 | 33 | 50 | 50 | 83 | 86 |
| Witchwarper | 6 | 8 | 11 | 19 | 32 | 57 | 73 | 107 | 118 |
| **SF2e, searched, own guns** | | | | | | | | | |
| Operative | 16 | 21 | 46 | 56 | 66 | 111 | 121 | 165 | 165 |
| Soldier | 9 | 9 | 26 | 29 | 39 | 46 | 69 | 97 | 107 |
| Envoy | 11 | 11 | 23 | 24 | 26 | 56 | 65 | 68 | 60 |
| Mechanic | 7 | 9 | 20 | 22 | 45 | 90 | 95 | 117 | 119 |
| Solarian | 16 | 17 | 30 | 34 | 38 | 55 | 53 | 86 | 108 |
| **SF2e, searched, module guns** | | | | | | | | | |
| Operative | 24 | 37 | 50 | 67 | 83 | 156 | 165 | 209 | 213 |
| Soldier | 16 | 19 | 27 | 29 | 48 | 53 | 88 | 108 | 121 |
| Envoy | 20 | 22 | 30 | 32 | 37 | 89 | 97 | 97 | 87 |
| Mechanic | 16 | 18 | 29 | 32 | 51 | 93 | 99 | 118 | 119 |

- **The searched Operative reaches the module's damage tiers with its own rifle** from 13th, and the Mechanic reaches the Sentinel's line from 13th.
- **With the module's guns the Operative is the highest single-target damage in the game at 18 of the 20 levels.** It is behind the best module class only at 8th (63 against 72) and 20th (213 against 216), and ahead by 24% to 44% at 11th to 13th and 17th to 19th. The module's sniper rifles roll about twice the dice of Starfinder's, and the Sniper's free reload removes their drawback.
- **The Soldier, Envoy and Solarian stay under the Sentinel's line** at most levels, whatever they carry.
- **The module party's lead over an SF2e party is smaller than this review said.** After the rebalance it was given as 2.0 to 2.3 times at 10th to 16th and 1.9 times at 20th. Against searched builds it is 1.6 to 1.75 times and 1.4 times (**arithmetic**, party of Soldier, Operative, Solarian and Witchwarper).

How much rests on each assumption (searched Operative, module guns, same levels):

| Variant | 1 | 3 | 5 | 7 | 10 | 13 | 16 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| As above | 24 | 37 | 50 | 67 | 83 | 156 | 165 | 209 | 213 |
| No reaction shots | 24 | 32 | 42 | 47 | 60 | 115 | 126 | 165 | 165 |
| Common guns only | 24 | 37 | 50 | 67 | 71 | 111 | 125 | 165 | 166 |
| Rifles and sniper rifles only | 16 | 24 | 46 | 56 | 82 | 156 | 165 | 209 | 213 |

- With common guns only, the Operative from 13th is exactly where its own rifle puts it: the uncommon Widow and Black Widow are what lift it.
- The low-level lead comes from shotguns, which need the target within 15 to 20 feet.
- The Mechanic's figure needs its target within 10 to 15 feet of the turret. Without the blast it is 26 / 51 / 58 / 63 / 59 at 10th / 13th / 16th / 19th / 20th.

### The fights

A lone boss two levels up; each cell is rounds to win / party HP lost / chance someone drops. The SF2e party is Soldier, Operative, Solarian and Witchwarper.

| Party and enemies | 5th | 10th | 13th | 16th | 20th |
|---|---|---|---|---|---|
| Target as used in this review: first-pass SF2e party, SF2e enemies | 2.2 / 25% / 21% | 2.8 / 27% / 18% | 2.3 / 19% / 6% | 2.5 / 21% / 5% | 2.1 / 17% / 4% |
| Searched SF2e party, SF2e enemies | 2.1 / 23% / 17% | 2.1 / 21% / 11% | 2.0 / 16% / 3% | 2.0 / 16% / 3% | 2.0 / 13% / 1% |
| Module party, module enemies, as built | 2.3 / 18% / 21% | 2.2 / 18% / 19% | 2.0 / 10% / 5% | 2.1 / 12% / 6% | 2.1 / 14% / 7% |
| Searched SF2e party, own gear, module enemies | 3.7 / 64% / 87% | 4.1 / 66% / 86% | 3.4 / 45% / 57% | 3.5 / 46% / 59% | 3.0 / 37% / 49% |
| The same with shields and module guns | 3.3 / 45% / 73% | 3.4 / 44% / 66% | 2.8 / 27% / 32% | 3.0 / 30% / 36% | 2.7 / 26% / 32% |
| Infiltrator, Vanguard, Operative, SF2e Soldier | 2.2 / 19% / 23% | 2.5 / 22% / 25% | 2.1 / 12% / 7% | 2.1 / 14% / 7% | 2.1 / 14% / 7% |
| Soldier, Adept, Operative, Solarian | 2.4 / 28% / 49% | 2.6 / 29% / 45% | 2.1 / 16% / 17% | 2.4 / 21% / 22% | 2.2 / 20% / 20% |

- **The rebalance still lands on target.** Against the searched SF2e party's own experience the module party as built is level in ordinary fights. In the hardest fight (two bosses) it is somewhat harder at 10th, 16th and 20th: 70% / 46% / 47% of HP lost against 56% / 42% / 33%.
- **An all-SF2e party is still short against the module's enemies,** even with shields and module guns: its other three members do not keep up with the Operative, and it has no barriers or resistances.
- **Mixed parties work from 13th.** Two module classes with an Operative and an SF2e Soldier match the module party there. At 5th and 10th the weaker mix drops someone in 45% to 49% of boss fights.

### What this rests on

- **Reaction rates.** Reactions an acting enemy sets off are assumed to fire in three rounds out of four, as the module's own simulators assume; those needing an ally's hit in half; those needing an ally's critical hit in three out of ten.
- **The search is not exhaustive.** The Operative's feats are chosen greedily; the other classes use an allocation chosen by hand from the feats listed above.
- **Not modeled:** off-guard set-ups such as Hampering Shot, critical specialization effects, two-pistol and melee Operatives, the melee Soldier, the drone Mechanic, archetypes, ancestry feats, the Envoy's bonuses to its allies, and the Mystic and Technomancer.
- **Readings of the rules that matter:** Burst Fire is taken to leave the second shot of Double Tap at its normal penalty; an unwieldy cannon is taken to need Fan the Hammer for a second area attack under Bullet Typhoon; Energy Expulsion's blast is taken to include the turret's target when it stands in the area.
- **Own guns still ignore reloading,** as in the first pass; the module's guns count it.
- **The fight simulator scales each class's first-pass offense** by the searched figure, so how the new routines respond to a boss's higher AC is approximate.

Scripts: `sf2e-opt.cjs`, `megun-fight4.cjs` (with `sf2e-megun.cjs` and `megun-fight.cjs` for the first-pass version of the same question). They are not in the repo.

## Improved Adept Mastery: the knockdown

Added 2026-11-20. The user chose the knockdown from three sized options (the others were a barrier refill and longer priming) and it is built. Nothing is committed.

> **Improved Adept Mastery (7th).** All biotic powers have their action cost reduced by 1 (minimum 1 action) and you keep Adept Mastery's shorter cooldowns. Each of your other enemies that fails its Reflex save against your Biotic Explosion is knocked Prone. The detonated creature rolls no save and is not knocked down.

### Why this one

- It suits the controller role and does nothing against a lone boss.
- It adds no damage of the Adept's own: its powers use saves, so a Prone enemy does not raise its numbers and its tier holds.
- **Measured** (fight simulator, Prone counted as one lost action): in mixed fights at 10th to 20th the party loses 1 to 3 points less of its HP and the chance of anyone dropping falls 2 to 6 points; no change against a lone boss. Allies' +2 to hit a creature that stays down is not counted, so the party's Strike damage would rise a little more than that.
- An Adept sets off 0.65 to 0.98 explosions a round against same-level enemies and 0.5 to 0.76 against bosses (**measured**).

### What was built

- `src/packs/me-combat-passives/adept-mastery-improved.json`: the new text. The feature carries no rule elements; the engine reads its slug.
- `scripts/me-powers.js`: a failure or critical failure against the explosion's burst save adds Prone when the Adept has `me-adept-mastery-improved`, and the Biotic Explosion card says so. Biotic Cascade's no-save target is not knocked down, since it rolls no save.
- `scripts/shield-system.js`: the one-time character update is now version 2. Each changed feature records the version that changed it, so a world already at version 1 refreshes only Improved Adept Mastery. The first try compared each feature's text with the compendium and refreshed the Vanguards' Nova again, because a power's text on a character is rewritten for its level.
- `tests/power-engine.test.mjs`: six new checks. All tests pass.
- The conversion document (Markdown, HTML, PDF) regenerated from the packs.

### Checked in Foundry (**confirmed**, test world, v14 build 369)

- A 12th-level Adept primed an enemy with Warp and detonated it with Throw. Of two enemies in the burst, the one that critically failed its Reflex save took double damage (34 from a roll of 17) and was Prone; the one that critically succeeded took nothing and stood. An enemy 15 feet away was not asked to roll. The detonated enemy was not knocked down.
- The same Adept with the feature removed: the enemy that critically failed took 40 and stayed standing, and the card promised no knockdown.
- The one-time update, run on a world at version 1 with a stale copy of the feature: only that feature was refreshed, the Vanguards' Nova feats were not touched, and the dialog named the one character.
- The world was left as found: 18 actors, 3152 chat messages, no `ZZ` actors, no test scene, no combat. Its `balanceVersion` is now 2. Foundry was not running beforehand; it was started for the check and stopped afterwards.

**Not checked:** a plain failure (as opposed to a critical one) was only run in the unit tests; no fight was played.

**Seen in passing, not changed:** the engine remembers which creatures one use of a power has already caught in an explosion for 30 seconds of real time, keyed by the power. An Adept who primes and detonates the same creature twice with the same detonator inside 30 seconds gets no second explosion. In play that needs two full prime-and-detonate cycles in half a minute, so it is unlikely, but scripted tests will meet it.
