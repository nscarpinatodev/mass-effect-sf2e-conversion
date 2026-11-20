# Power level review

Written 2026-11-19. Two questions: are this module's characters stronger, weaker or level with base Starfinder 2e characters of the same level, and is a 20th-level party balanced against level 20 Mass Effect enemies? Nothing in the module was changed for this review. The options at the end are for a decision.

Status words, as in `class-audit.md`: **confirmed** means read from the source files or the system's compendia; **checked in Foundry** means seen working in the test world (Foundry v14, SF2e 1.7.0, module 2.2.0-rc.6); **measured** means a simulation number; **arithmetic** means worked out by hand from confirmed numbers.

## Verdicts

**Against base SF2e: stronger, and by a wide margin from the middle levels.**
- Damage is about level at 1st, about 1.7 times a base SF2e party's at 5th, and 2.2 to 2.5 times from 10th to 20th on one target (1.8 to 2.1 times across three targets).
- Characters are also harder to kill at every level: a kinetic shield that comes back every fight, a Biotic Barrier for two classes, and armor that gives 1 to 3 more AC than SF2e armor.
- The only base SF2e build that comes near is a spellcaster spending its top spell slots on a group that stands still: level with the Adept across three targets on a one-fight day, 85% of it at four fights a day, 48% of it on one target.

**A 20th-level party against level 20 Mass Effect enemies: not balanced, and the enemies do not exist yet.**
- The module's highest enemy is level 16 (one Harvester). There is nothing at 17th to 20th.
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

210 stat blocks in `src/packs/me-npcs` and `src/packs/me-creatures`, levels 0 to 16 (confirmed). By level: 87 at 1st to 5th, 68 at 6th to 10th, 21 at 11th to 12th, and eight above that. None at 17th to 20th.

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
- **Whether module enemies stop being a threat at 8th level, as the damage ratio suggests.** Two-sided fights were only simulated at 20th.
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

**Recommendation: A, at A2's numbers, with A3's attack and DC bump kept in reserve.** The classes were just balanced against each other, the gap with SF2e is in every class and at every level from 8th, and the module's enemies are its own to tune. It means accepting that a module character is worth about two SF2e characters of the same level from 8th up, and saying so in the GM guidance, so that anyone mixing in SF2e creatures knows to scale them.

Decisions needed:
1. Which option, A, B, C, D or none.
2. Under A or D: whether to measure the enemy multipliers at 5th, 10th and 15th before anything is written (the fight simulator would need each class's damage table at those levels).
3. Whether to design level 17 to 22 enemies now. The design would come back for approval before any file is written.
