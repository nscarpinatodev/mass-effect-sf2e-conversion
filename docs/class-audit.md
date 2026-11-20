# Class audit

A working map of what is wrong or missing in each of the six classes, with options for fixing it. Started 2026-11-18 from a scripted sweep of `src/packs` plus the simulations run that day. Nothing here is decided unless it says so.

Status words: **confirmed** means checked against the source files; **measured** means a simulation number; **suspected** means it needs a closer look.

How these classes compare with base Starfinder 2e classes, and how 20th-level fights go against level 20 enemies, is in `power-level-review.md` (2026-11-19).

## Problems that cut across classes

### X1. Powers did not scale with level (fixed 2026-11-18)

Only Biotic Charge and Nova grew with level. Every other power rolled the same dice at 1st and at 20th, while the NPC versions of the same powers were already multiplied by level. Decided: player powers use the NPC rule. Done in the engine, the power text, the tests and the docs. Not yet installed or played in Foundry.

**The rule.** All of a power's dice are multiplied by 1 + a quarter of the caster's level, rounded down: doubled at 4th, tripled at 8th, x4 at 12th, x5 at 16th, x6 at 20th. It covers damage, the bonus against synthetics, persistent damage, healing dice, Energy Drain's damage and dice named in a power's result note (Throw's wall damage, Singularity's crush). Player and NPC versions share one piece of code in `scripts/me-powers.js`.

| Power | On a failed save at 1st | 8th | 20th |
|---|---|---|---|
| Warp, Incinerate, Shockwave, Cryo Blast, Neural Shock, Lash | 2d6 | 6d6 | 12d6 |
| Overload, Throw, Reave | 2d8 | 6d8 | 12d8 |
| Slam | 3d6 | 9d6 | 18d6 |
| Flare (was 6d6) | 3d6 | 9d6 | 18d6 |
| Frag Grenade, Sticky Grenade (were 4d6) | 2d6 | 6d6 | 12d6 |

Rebased so the multiplier lands on sensible numbers:
- **Flare**: 6d6 down to 3d6 at 1st.
- **Frag Grenade and Sticky Grenade**: 2d6 / 4d6 / 6d6 down to the standard 1d6 / 2d6 / 4d6. They are weaker than before at 1st-3rd, equal at 4th-7th, stronger from 8th.
- **System Override (12th)**: 8d6 on a failure when gained, 10d6 at 16th, 12d6 at 20th (was 3d6).
- **Omni-Grenade (16th)**: 5d6 fire + 5d6 electricity when gained, 6d6 + 6d6 at 20th (was 4d6 + 4d6).
- **Network Shutdown (18th)**: 10d6 when gained, 12d6 at 20th (was 4d6).
- **Warp Field (12th)**: 4d4 a round when gained, 5d4 at 16th, 6d4 at 20th (was 1d4).

Not scaled: Biotic Charge and Nova (their own formulas), grenade items, Energy Drain's shield amounts, and flat bonuses from gear and feats.

Also fixed on the way: Incinerate was not marked as a tech power in the engine, so Power Amplifiers and Tech Mastery did not add to it; and the NPC Energy Drain's damage was printed as scaling but did not scale.

Expected damage a round from powers alone, one target, an Adept with standard amps (arithmetic, not a simulation): 1 / 3 / 8 / 12 / 45 / 64 / 77 / 125 / 156 at levels 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20, against 1 / 3 / 5 / 6 / 21 / 25 / 25 / 41 / 44 before.

Still open from this work:
- **Damage doubles at 4th level** and then waits until 8th. Steps, not a slope.
- **Flare still deals full damage on a successful save** and half on a critical success, in a 15-foot burst. At 3d6 it is the best damaging power at every level.
- **Slam's 3d6 base with Stunned 1 and prone** is 18d6 on a failure at 20th.
- **Bonus dice from feats do not scale**: Biotic Resonance +1d6, Apex Engineer +1d6, Hybrid Core +1d6, Superior Sentinel Mastery +1d4, Superior Engineer Mastery +1d6, and Warp Upgrade's 2d4 persistent damage.
- **Tech Armor detonates when one hit deals 20 or more damage**, a fixed number that nearly every hit clears from the middle levels.
- **Class DC bonuses are worth more now** that the dice behind them grow (see the Adept).
- **Several NPC power entries print plain dice for parts the engine scales** (Throw's wall damage, the Sticky Grenade's persistent damage, the Combat Drone's explosion).
- **The Soldier and Infiltrator simulations predate this.** They used a 4d6 Frag Grenade and an unscaled Incinerate.

### X6. Gear adds class DC early (confirmed 2026-11-18)

Power Magnifier I (3rd) gives +1 item bonus to class DC; Power Magnifier II, the Tech Integrator and the Biotic Feedback Generator (all 7th) give +2. Bio-amps reach +1 at 10th and +2 at 13th. The Adept numbers above were run with the amp's bonus only; with this gear the Adept gains a point or two at 3rd-5th and about 8 a round at 7th-10th (45 at 7th, 82 at 10th). Nothing in the base system gives an item bonus to a save DC, so every power class sits 2 above a normal caster from 7th.

### X7. The simulators counted every cooldown one round too long (found 2026-11-19)

The engine puts a cooldown of N rounds on the sheet as an effect that ends at the start of the character's turn N rounds later. A power used in round 1 with a 2-round cooldown is back in round 3. A 1-round cooldown only stops a second use in the same turn. Checked in Foundry (SF2e) with 1-round and 2-round effects in an encounter. Every simulator had the power back one round later than that. So every number recorded for a class that uses powers is too low, and "minimum 1 round" means every turn.

Damage a round to one target at levels 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20, rerun with the engine's counting:

| Class (build) | As first recorded | With the engine's counting |
|---|---|---|
| Vanguard (Nova Combo; 22 / 26 / 50 / 66 / 90 / 127 / 146 / 188 / 224 once Heavy Impact's off-guard and gear are counted) | 22 / 24 / 48 / 54 / 73 / 105 / 120 / 150 / 183 | 22 / 25 / 49 / 57 / 80 / 118 / 134 / 173 / 213 |
| Adept | 11 / 13 / 27 / 37 / 76 / 109 / 130 / 172 / 216 | 11 / 15 / 33 / 45 / 94 / 133 / 160 / 220 / 276 |
| Engineer | 12 / 15 / 30 / 41 / 62 / 96 / 108 / 118 / 210 | 12 / 18 / 35 / 49 / 75 / 106 / 126 / 138 / 233 |
| Sentinel (powers, Tech Armor raised in round 1) | 17 / 19 / 29 / 33 / 55 / 74 / 100 / 110 / 144 | 18 / 19 / 32 / 38 / 63 / 83 / 100 / 111 / 146 |
| Soldier (assault rifle, class features only, Frag Grenade not yet rescaled) | 16 / 23 / 34 / 45 / 50 / 72 / 87 / 83 / 89 | 17 / 23 / 32 / 45 / 47 / 76 / 87 / 87 / 91 |

Three targets, engine's counting: Vanguard 125 / 176 / 195 / 279 / 444 at 10 / 13 / 16 / 19 / 20; Adept 141 / 201 / 244 / 356 / 450; Engineer 146 / 199 / 241 / 264 / 508.

What follows from it:
- **The class sections below still carry the first-recorded numbers**, except the Infiltrator's.
- **"Never below 2" on the Adept's and Engineer's mastery cuts means every other turn**, not every third.
- **These reach a 1-round cooldown, which is every turn**: tech powers with the Tech Mastery chain from 10th (7 less Intelligence 5 less 2); any Intelligence-keyed character's tech powers at 20th (7 less 6); biotic powers with a Recharge 3 amp, on sale from 15th (first recorded here as 19th; see the Adept); Biotic Charge with Improved Charge.
- **The Adept's lead at 19th-20th is wider than recorded**: 220 / 276 against the Vanguard's 173 / 213.

All six classes on the same footing (2026-11-19: engine counting, feat slots paid, gear, each class's best build found). One target at 10 / 13 / 16 / 19 / 20:

| Class | As built today | With a 2-round floor on every cooldown but Biotic Charge |
|---|---|---|
| Vanguard (Nova Combo) | 90 / 127 / 146 / 188 / 224 | 90 / 127 / 146 / 175 / 204 |
| Adept | 94 / 133 / 160 / 220 / 276 | 94 / 133 / 160 / 172 / 216 |
| Engineer | 75 / 106 / 126 / 138 / 233 | 75 / 106 / 126 / 138 / 222 |
| Infiltrator (sniper, rebuilt) | 67 / 102 / 136 / 134 / 234 | 67 / 102 / 136 / 133 / 171 |
| Soldier (rifle, rebuilt) | 73 / 125 / 142 / 150 / 196 | 73 / 125 / 142 / 150 / 161 |
| Sentinel (powers) | 63 / 83 / 100 / 111 / 146 | 63 / 83 / 102 / 112 / 144 |

The builds that depend on the Tech Mastery chain's cut, as built and with that cut stopped at 2 rounds (as the class masteries' cuts are):

| Build | As built | Tech Mastery never below 2 |
|---|---|---|
| Infiltrator, every-turn cloak, one target at 10 / 13 / 16 / 19 | 71 / 99 / 162 / 156 | 56 / 79 / 121 / 118 |
| Infiltrator, four tech powers and no cloak, three targets at 13 / 16 / 19 | 185 / 298 / 325 | 153 / 211 / 230 |
| Engineer, Tech Mastery build, three targets at 10 / 13 / 16 / 19 | 140 / 181 / 243 / 321 | 131 / 181 / 226 / 284 |

Decided and built 2026-11-19: **the Tech Mastery chain's cut stops at 2 rounds.** A tech cooldown is 7 rounds less the attribute (minimum 1); Tech Mastery and the class masteries together take rounds off that, never below 2. Only Intelligence 6 (or Charisma 6 with Sentinel Mastery) brings a tech cooldown to 1 round. Checked in Foundry (SF2e) with Intelligence 2 to 6 and each tier of the chain: Master Tech Mastery gives 3 / 2 / 2 / 2 / 1 rounds, and the cooldown effect's text says why. The right-hand column of the table above is now what is built.
- It removes every-turn tech powers from 10th to 19th, which is where the Infiltrator's no-cloak build out-damaged the Engineer across three targets.
- Master Tech Mastery's cut does nothing for a character with Intelligence 5 or more: Improved Tech Mastery already brings that character to 2 rounds.
- Intelligence 6 at 20th and a Recharge 3 amp (from 15th) still reach 1 round, and the Adept was the outlier there (220 / 276). Addressed 2026-11-19 under the Adept: with a 1-round biotic cooldown, only the first biotic power each turn gets it (195 / 245).

Not taken:
- **A 2-round floor on every cooldown but Biotic Charge** (the second column of the six-class table). It also evens out 19th-20th, lowers the Vanguard's Nova Combo by 7-9% there, and leaves a Recharge 3 amp and Master Tech Mastery's cut with nothing to do.
- **Make the engine count as the simulators did** (one more round on everything). Biotic Charge would then be back every third turn.

### X2. 26 class feats belonged to no class (fixed 2026-11-18)

These class feats had no class trait, so no class's feat list offered them. Decided: assign them by kind. Done in the source, packs and docs.

| Feats | Classes |
|---|---|
| Biotic powers: Dark Channel, Dominate, Flare, Lash, Lift, Reave, Slam, Stasis, Unity, Improved Unity, Superior Unity | Adept, Sentinel, Vanguard |
| Tech powers: AI Hacking, Damping, Decoy, Defense Drone, Defense Matrix, Energy Drain, Geth Shield Boost, Neural Shock | Engineer, Infiltrator, Sentinel |
| Ammo: Armor-Piercing, Phasic, Shredder and Warp Rounds | Soldier, Infiltrator, Vanguard |
| Fortification, Improved Fortification, Master Fortification | Soldier, Sentinel |

This unblocked System Override (Engineer), the Sentinel's 12th–20th line, and the Infiltrator's named signature abilities. Cross-class access is left to the multiclass dedications in `docs/TODO.md`.

Still open from this work:
- **Flare was a 1st-level power that dealt 6d6 in a 15-foot burst.** Cut to 3d6 with the X1 fix; what remains open is listed there.
- **Improved Unity (5th) and Superior Unity (9th) sit at levels with no class feat slot.** They can only be taken at 6th and 10th.
- **Fortification's cooldown is 7 rounds less Constitution**, long for a Sentinel keyed on Charisma or Intelligence.
- **The Sentinel now has 25 feats to choose from at 1st level**, the Vanguard 23, the Infiltrator 22.

### X3. Little or no choice at high levels (confirmed)

New feats printed at each class feat level:

| Class | 1 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Soldier | 13 | 3 | 6 | 4 | 6 | 2 | 1 | 2 | 1 | 1 | 1 |
| Engineer | 16 | 1 | 2 | 1 | 4 | 2 | 2 | 2 | 1 | 1 | 1 |
| Adept | 17 | 1 | 2 | 1 | 3 | 3 | 1 | 1 | 1 | 1 | 1 |
| Vanguard | 23 | 1 | 5 | 3 | 5 | 2 | 1 | 1 | 1 | 2 | 1 |
| Infiltrator | 21 | 2 | 4 | 1 | 6 | 2 | 1 | 1 | 1 | 1 | 1 |
| Sentinel | 25 | 3 | 2 | 3 | 3 | 4 | 2 | 1 | 1 | 1 | 1 |

Counted after the X2 fix. The choice is all at 1st level: nearly every power is a 1st-level feat. Most of the entries at 2nd, 4th and 6th for the Engineer, Adept and Sentinel are the passive chains made into class feats on 2026-11-18. Before that those classes had nothing of their own at those levels.

Options: write a second feat at each thin level per class, or accept that high levels are a fixed track.

### X4. Free-action capstones (confirmed text, not measured)

- Ascendant Form (Adept, 20th): once a day, for a minute, every biotic power is a free action.
- Apex Engineer (20th): the first tech power each round is a free action.
- Apex Sentinel (20th): Adrenaline Rush and Fortification as free actions, neither of which a Sentinel can take.

The Vanguard's Apex was simulated and kept. These three have never been measured.

### X5. Much is tracked by hand (confirmed count)

Class feats with no rule element and no automation note: Soldier 17, Engineer 15, Infiltrator 14, Adept 13, Sentinel 13, Vanguard 12. Some of these are fine (pure text), but nobody has gone through them.

## Soldier

Measured 2026-11-19 with a new simulator: feat slots paid for, cooldowns counted as the engine counts them (X7), the best gun for each level. Damage a round to one target at levels 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20:

| Build, as built | Assault rifle | Shotgun |
|---|---|---|
| No feats at all | 8 / 14 / 23 / 26 / 28 / 45 / 49 / 49 / 41 | |
| Weapon Mastery and Combat Training chains, Adrenaline Rush, Cryo Rounds, Legendary Combat | 11 / 19 / 33 / 40 / 54 / 82 / 113 / 117 / 112 | 21 / 28 / 39 / 47 / 60 / 100 / 135 / 134 / 126 |
| Cryo Rounds, the Adrenaline Rush chain, Weapon Mastery, then the ammo feats (the best found) | 15 / 23 / 40 / 53 / 79 / 135 / 154 / 163 / 203 | 30 / 33 / 46 / 64 / 87 / 166 / 184 / 187 / 223 |
| The same, never taking damage | 15 / 23 / 40 / 47 / 56 / 96 / 109 / 114 / 131 | |
| Concussive Shot chain with Weapon Mastery | 8 / 16 / 26 / 36 / 47 / 74 / 84 / 88 / 85 | |

The best build is level with the Vanguard and the rebuilt Infiltrator on one target (see X7), and ahead of both at 13th-16th. The earlier "89 at 20th" was class features alone. The Adrenaline Rush reactions are assumed to fire in three rounds out of four that they are ready. Not modelled: automatic and burst fire, heavy weapons, Fortification. Not played. The simulator is a scratch file, not in the repo.

Failings found (confirmed unless marked; fixed by the build below unless listed as still open):
- **Adrenaline Rush does nothing before 7th.** It costs an action to gain one. The free Strike that makes it worth using comes from Improved Soldier Mastery.
- **Concussive Shot is never worth its two actions** (measured: the simulator, choosing by expected damage, never uses it), for a chain of three feats. Its cooldown runs on Strength, on a class that shoots with Dexterity.
- **Improved and Master Adrenaline Rush are separate reactions with separate cooldowns**, so from 10th one or the other fires every round. Master's "Quickened 2" is not a condition the system has. The best build leans on being hit: 79 against 56 a round at 10th, 163 against 114 at 19th.
- **Three attack bonuses do nothing beside Weapon Mastery**: Soldier Mastery's +1 against off-guard targets, Combat Training's +1 and Legendary Combat's +2 are circumstance bonuses, as Weapon Mastery's +1 / +2 is.
- **Ammo Master, Devastating Rounds and War Machine have no rules.** The extra dice are added by hand. War Machine's text says its +2 dice replace Devastating Rounds' +2.
- **No feat at 12th or 16th.**
- **Suppressing Fire (8th) needs Master Combat Training, also 8th.**
- **Heavy Weapon Training grants a proficiency the class already has** (the heavy weapons are martial, bar the Cain) and refers to Power Cells, which do not exist.
- **Battlefield Commander (14th)** spends two actions to give allies +1 on their next attack.
- **Nothing is tracked.** No cooldown for Adrenaline Rush, Concussive Shot, Fortification or Frag Grenade; no extra action; the Adrenaline Rush effects last through the following turn; the Master Fortification effect gives a fixed 12, though the text says 12 or the character's level.
- **Cryo Rounds (1st) makes anything it wounds off-guard through its next turn**, by hand. It is worth a third more damage at 1st level (15 against 11 with a rifle, 30 against 21 with a shotgun) and is open to the Infiltrator and Vanguard too.

Built 2026-11-19 and checked in Foundry (SF2e). Not played in a real fight.

| Build, as rebuilt | One target at 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20 |
|---|---|
| Rifle: Cryo Rounds, the Adrenaline Rush chain, Weapon Mastery, the ammo feats | 15 / 25 / 44 / 53 / 73 / 125 / 142 / 150 / 196 |
| Rifle: the Concussive Shot chain with Weapon Mastery and Adrenaline Rush | 15 / 25 / 45 / 52 / 69 / 118 / 143 / 160 / 201 |
| Rifle: Weapon Mastery, Combat Training, Marksman, Legendary Combat | 11 / 19 / 33 / 40 / 53 / 82 / 120 / 139 / 175 |
| Rifle: Frag Grenade and Carnage, across three targets | 14 / 24 / 41 / 55 / 79 / 128 / 170 / 175 / 257 |
| Shotgun: Cryo Rounds, the Adrenaline Rush chain, Weapon Mastery, the ammo feats | 30 / 35 / 51 / 64 / 80 / 153 / 171 / 173 / 215 |

What was built:
- **Adrenaline Rush (2nd) is a free action**: one extra action that turn to Strike, Stride or reload, and the Speed. Improved Soldier Mastery's free Strike is gone, since the feat gives it.
- **Improved Soldier Mastery (7th)** takes 1 round off the Soldier's own cooldowns, never below 2.
- **Improved and Master Adrenaline Rush are one reaction with one cooldown.** Improved: one extra action and +1 to attacks on the next turn. Master: two extra actions and +2, on any damage.
- **Concussive Shot costs 1 action**, its dice follow the power-scaling rule (1d8 / 2d8 / 3d8 before the multiplier), and its cooldown runs on the higher of Constitution and Strength.
- **Legendary Combat's attack bonus is +3**, one better than Master Weapon Mastery.
- **Carnage (12th, new)**: two actions for a Strike and a 10-foot burst, 8d6 fire on a failed Reflex save when gained, 12d6 at 20th.
- **Marksman (16th, new, requires Adrenaline Rush)**: a multiple attack penalty of -4 / -8 on a turn with Adrenaline Rush's extra actions.
- **Small fixes**: Suppressing Fire requires Improved Combat Training; Heavy Weapon Training grants advanced heavy weapons and no longer mentions Power Cells; Battlefield Commander costs 1 action; War Machine's text is plain; the Master Fortification effect gives 12 or the character's level.
- **Automation.** Cooldowns are tracked for Adrenaline Rush, its reaction, Concussive Shot, Fortification, the Frag Grenade and Carnage. Using Adrenaline Rush or Fortification puts the effect on; the Adrenaline Rush effects give the extra action and come off when the turn ends. Concussive Shot adds its dice to the next Strike, knocks the target prone on a hit and pushes it on a critical hit. Ammo Master and Devastating Rounds add their dice by rule. War Machine keeps two ammo effects.

Found while checking:
- **Cryo Rounds' Chilled effect carried no off-guard**, lasted an invalid length of time, and was only ever put on targets that had a shield, barrier or armor frame. It now makes the target off-guard until the shooter's next turn starts, on any target whose HP the shot reaches. The same gap had kept Incendiary Rounds' fire on a critical hit off unshielded targets.
- **The one-ammo-at-a-time rule deleted War Machine's second ammo power.**

Failings still open:
- **The best build still leans on being hit**: the reaction is the Soldier's largest single feat line. Unmeasured, because simulated foes do not attack.
- **Soldier Mastery's +1 against off-guard targets and Combat Training's +1 still do nothing beside Weapon Mastery.**
- **Master Adrenaline Rush's second extra action is text**: the system has one Quickened condition.
- **Tactical Reload, Suppressing Fire, Battlefield Commander and Superior Soldier Mastery's stun are applied by hand.**
- **Chilled, and the fire from Incendiary Rounds, go on whenever HP drops after the last damage roll came from a shooter with that ammo.** Damage from another source applied in between would be read as the shot.
- **Rolling a Concussive Shot's damage twice counts as two Strikes.**
- **Improved Soldier Mastery's shorter cooldowns do not show in four-round fights.**
- **Automatic fire, burst fire and heavy weapons are not measured.**
- ~~**The Pathfinder (pf2e) packs are unchecked.**~~ Closed 2026-11-19: the module is Starfinder 2e only, and the Pathfinder packs are no longer built.

Loopholes:
- **Cryo Rounds is the strongest 1st-level feat in the module**: a third more damage at 1st level, and now applied without anyone having to remember it. The Infiltrator and Vanguard can take it too.
- **Flat damage stacks from five sources**: Soldier Mastery +6, Combat Training +4 and Legendary Combat +2 (all untyped), Weapon Mastery +6 (circumstance) and weapon specialization +6.
- **A shotgun Soldier with Cryo Rounds deals 30 a round at 1st level**, against 22 for the Vanguard.
- **Ammo dice do not grow with level, and should not**: multiplied as powers are, the best build reaches 473 a round at 20th.

## Infiltrator

Measured 2026-11-19 with a new simulator: feat slots paid for, powers scaled (X1), cooldowns counted as the engine counts them (X7). Damage a round at levels 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20:

| Build, as built | One target | Three targets |
|---|---|---|
| Sniper: Tactical Cloak, the Weapon Mastery chain, Cryo Rounds, then the cloak feats | 10 / 17 / 28 / 41 / 60 / 81 / 92 / 92 / 124 | the same |
| Sniper with the Tech Mastery chain for a faster cloak | 10 / 15 / 22 / 28 / 44 / 58 / 77 / 80 / 108 | the same |
| No cloak, no powers: Weapon Mastery and Combat Training | 9 / 16 / 24 / 31 / 45 / 74 / 80 / 80 / 73 | the same |
| No cloak: Incinerate, Neural Shock, Energy Drain, Sticky Grenade, the Tech Mastery chain, Incinerate Upgrade | 10 / 15 / 25 / 32 / 84 / 100 / 117 / 128 / 160 | 10 / 15 / 25 / 32 / 84 / 180 / 287 / 317 / 402 |

From 10th level the sniper is below every power class's build (see the table under X7): 81 at 13th against 83 to 133, 92 at 19th against 111 to 220. Not played. The simulator is a scratch file, not in the repo; a foe drops when the Infiltrator has dealt half its HP, which is what sets off the feats that need a kill.

Failings found (confirmed unless marked; fixed by the build below unless listed as still open):
- **The cloak is worth about a quarter more damage than not having it**, for an action each use and five feats (measured: 60 against 45 at 10th, 92 against 80 at 16th).
- **The cloak's dice do not grow.** 2d6 at 1st, 4d6 from 7th, 5d6 from 12th with Assassination Protocol. The X1 rule did not reach it, because it is a bonus on the Strike and not a save.
- **From 10th level the best Infiltrator never cloaks**: four tech powers and the Tech Mastery chain out-damage the sniper on one target and deal two to three times as much across three.
- **Tactical Cloak is a 1st-level feat**, though the class text calls it core and always available.
- **Ghost Protocol (10th) does exactly what Tactical Cloak Upgrade (8th) already does**, and Assassination Protocol requires it.
- **Almost nothing is automated.** Using the cloak does not put its effect on, and nothing takes it off after the Strike. Assassination Protocol's dice, Death From Above's dice, Apex Infiltrator's critical hit and Hunter's Mark have no rules at all. A cloaked attacker's target is not made off-guard.
- **Infiltrator Mastery's +2 to Stealth while cloaked does nothing**: Infiltrator Training already gives +2 of the same kind.
- **Superior Infiltrator Mastery's resistance 5 lasts only until the Infiltrator shoots**, and its +2 DC against off-guard targets is tracked by hand.
- **No feat at 14th.**
- **Hunter's Mark is +2 damage** for an action, +4 at 20th.

Built 2026-11-19 and checked in Foundry (SF2e). Not played in a real fight.

| Build, as rebuilt | One target at 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20 |
|---|---|
| Sniper: Weapon Mastery, Cryo Rounds, Incinerate, then the cloak feats | 12 / 22 / 39 / 48 / 67 / 102 / 136 / 134 / 234 |
| Sniper with Hunter's Mark and Overwatch | 12 / 18 / 36 / 49 / 78 / 110 / 151 / 148 / 256 |
| Sniper with the Tech Mastery chain for an every-turn cloak (before the chain's cut was stopped at 2 rounds, X7) | 12 / 17 / 32 / 38 / 71 / 100 / 162 / 157 / 215 |

What was built:
- **Tactical Cloak is a 1st-level class feature**, no longer a feat pick.
- **Its dice follow the power-scaling rule**: 2d6 at 1st, 4d6 at 4th, 6d6 at 8th, 8d6 at 12th, 10d6 at 16th, 12d6 at 20th. Improved Infiltrator Mastery's extra 2d6 does not grow.
- **Assassination Protocol (12th)** makes the base 3d6 before the multiplier: 12d6 at 12th, 18d6 at 20th.
- **Ghost Protocol (10th)** has a new effect: a Stride as part of cloaking, and concealment until the next turn after a Strike ends the cloak.
- **Overwatch (14th, new, requires Hunter's Mark)**: one action for a reaction Strike against the Marked target when it moves, attacks or uses a power, with no multiple attack penalty.
- **Hunter's Mark** is +2 at 1st and grows on the same steps to +12 at 20th. A free new mark when the Marked target drops. Apex Infiltrator's "+4" became "Hunter's Mark as a free action".
- **Infiltrator Mastery** takes 1 round off tech cooldowns, never below 2, and gives +4 to Stealth while cloaked.
- **Superior Infiltrator Mastery**: its resistance 5 lasts to the next turn after a Strike ends the cloak, and tech powers used while cloaked have +2 DC.
- **Automation.** Using the cloak puts its effect on and starts its cooldown. The effect makes the target off-guard and adds the dice. It comes off after the Strike (the second with the Upgrade): when a miss is rolled, or when a hit's damage is rolled. Assassination Protocol, Death From Above, Apex Infiltrator's critical hit (once a turn) and Hunter's Mark are rules now. Sending Phantom Protocol or Assassination Protocol to chat brings the cloak back.

Found while checking:
- **The cloak's dice had never been added to a damage roll.** Its rule named precision as a damage type, which the system rejects; it is a category. Improved Infiltrator Mastery's rule had the same fault. The "as built" rows above are what the text promised, not what the sheet rolled.
- **The cloak effect lasted to the end of the next turn**, not its start.

Failings still open:
- **Being Undetected is played by hand.** Nothing hides the token.
- **A cloak brought back by a kill needs the player to send the feat to chat**, and the once-a-minute and once-an-encounter limits are theirs to track.
- **Overwatch's reaction, Ghost Protocol's Stride and Apex Infiltrator's free Mark are text only.**
- **Rolling a hit's damage twice counts as two Strikes** against the cloak.
- **Improved Infiltrator Mastery's 2d6 and Death From Above's 2d6 do not grow** (see X1's open list).
- **The shorter cooldown, the concealment and the resistance are unmeasured**: fights are four rounds and foes never attack.
- **The no-cloak tech build is untouched** (10 / 15 / 25 / 32 / 84 / 100 / 117 / 128 / 160 on one target, 180 to 402 across three from 13th). It is a cooldown question (X7).
- **Three NPCs carry their own Tactical Cloak text with a fixed 2d6.** Kasumi Goto uses the shared one, which now scales (6d6 at her level).
- ~~**The Pathfinder (pf2e) packs are unchecked.**~~ Closed 2026-11-19: the module is Starfinder 2e only, and the Pathfinder packs are no longer built.

Loopholes:
- **Apex Infiltrator at 20th**: Intelligence 6 makes the cloak's cooldown 1 round, so the automatic critical hit on 20d6 of precision comes every turn (134 at 19th, 234 at 20th). Level with the Engineer's 233 and the Vanguard's 213, so left alone (X4).
- ~~**The Tech Mastery chain makes the cloak every-turn from 10th**: 162 / 157 at 16th / 19th against 136 / 134 without it.~~ Closed 2026-11-19 (X7): the chain's cut stops at 2 rounds, and that build measures 56 / 79 / 121 / 118 at 10 / 13 / 16 / 19, below the plain sniper.

## Vanguard

Measured 2026-11-19 on the same footing as the other five: engine cooldown counting (X7), gear for class DC (X6), Heavy Impact's off-guard, today's shotguns with their grade dice. Damage a round at levels 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20:

| Build | One target | Three targets |
|---|---|---|
| Nova Combo (Doshko, Rush) | 22 / 26 / 50 / 66 / 90 / 127 / 146 / 188 / 224 | 22 / 35 / 68 / 91 / 141 / 185 / 208 / 295 / 455 |
| Juggernaut (Doshko, Charge first) | 22 / 26 / 46 / 65 / 84 / 110 / 138 / 170 / 208 | 22 / 35 / 63 / 87 / 112 / 145 / 181 / 248 / 439 |
| Shotgunner | 21 / 28 / 44 / 57 / 85 / 112 / 146 / 175 / 193 | 21 / 38 / 62 / 82 / 132 / 165 / 202 / 248 / 282 |
| Brawler (Biotic Attack) | 13 / 18 / 37 / 49 / 66 / 89 / 111 / 149 / 160 | 13 / 28 / 55 / 74 / 108 / 139 / 165 / 243 / 262 |
| Nova Combo with Cryo Rounds in place of Heavy Impact | 22 / 25 / 50 / 69 / 92 / 126 / 143 / 181 / 211 | |
| Nova Combo with the Combat Training chain | 21 / 26 / 50 / 63 / 86 / 118 / 137 / 180 / 189 | |
| Nova Combo with the Biotic Mastery chain | 22 / 26 / 50 / 61 / 84 / 115 / 131 / 176 / 186 | |
| Shotgunner with Cryo Rounds and Weapon Mastery | 21 / 29 / 44 / 59 / 85 / 127 / 161 / 180 / 191 | |

The Nova Combo leads every class on one target from 7th to 16th, in melee. Played in Foundry at 5th only. The numbers recorded earlier (183 at 20th) left out Heavy Impact's off-guard and gear.

Findings:
- **Nothing that became available since beats the Nova Combo as built**: not Cryo Rounds, Combat Training, Biotic Mastery or Weapon Mastery (Shotguns). Weapon Mastery and Cryo Rounds bring the Shotgunner level with it at 13th-16th.
- **Ammo powers work on melee Strikes** (confirmed): their rules add the dice to every Strike, though the text says they modify ammunition. On a Doshko, Cryo Rounds was worth about what Heavy Impact is. **Fixed 2026-11-19: ammo powers apply to ranged Strikes only.** The ammo effects' dice and damage-type changes, and Ammo Master's and Devastating Rounds' dice, carry an `item:ranged` condition, and the shield system ignores the attacker's ammo when the last damage roll was a melee Strike (no Chilled, no burning, no changed shield, barrier or armor damage). Checked in Foundry (SF2e) with Cryo Rounds, Ammo Master and Devastating Rounds on one character: a rifle rolls 3d8 + 3d4 cold and leaves the target Chilled, a Doshko rolls 1d12 and does not; Disruptor Rounds leave the Doshko's damage piercing; an NPC's ranged attack gets the die and its melee attack does not. With this, the Cryo Rounds build above measures 58 / 81 / 112 / 127 at 7 / 10 / 13 / 16. Cryo Rounds' text also said off-guard lasts until the end of the target's next turn; it lasts until the start of the shooter's, and now says so.
- **One feat choice at 12th, 14th and 16th** (X3).
- **The Brawler can reach Apex Vanguard**: the earlier note that it could not was the simulated build's feat order, not a rule.

Loopholes:
- **Anything that raises the class DC multiplies damage**, because a failed save resets Vanguard Rush. Gear now gives +1 at 3rd and +2 at 7th (X6), ahead of the amps.

Decided: Biotic Melee, the Rush reset and Apex's second Nova all stay as built.

Options: more feats at 12th-16th; implants (see `docs/design/biotic-amps-and-implants.md`).

## Engineer

Built 2026-11-18 and checked in Foundry (SF2e): a drone and turret that scale and act on their own as tokens, Tech Training, the shorter cooldown, tracked tech cooldowns and a scaled Tech Field. Not played in a real fight.

Damage a round at levels 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20, simulated:

| | One target | Three targets |
|---|---|---|
| Before (best play: never deploy the drone or turret) | 6 / 9 / 17 / 26 / 58 / 78 / 103 / 112 / 205 | 6 / 9 / 23 / 41 / 105 / 139 / 213 / 233 / 429 |
| As built | 12 / 15 / 30 / 41 / 62 / 96 / 108 / 118 / 210 | 18 / 21 / 42 / 56 / 109 / 158 / 199 / 218 / 426 |
| ...of which drone and turret | 0 / 3 / 12 / 14 / 24 / 32 / 46 / 51 / 61 | |

Simulated build: Overload plus Incinerate and Cryo Blast from Tech Training, then Combat Drone, Sentry Turret, Neural Shock, Incinerate Upgrade, Combat Drone Upgrade, Energy Drain, Drone Commander, Omni-Grenade; gear for +1 class DC at 3rd and +2 at 7th. Before the change, deploying both cost four actions for almost nothing and lowered damage at every level from 3rd to 19th. The simulator is a scratch file, not in the repo; its four-round fights undervalue a drone and turret that last a minute, and its foes never attack, so the pets' AC and HP are untested.

What was built:
- **Combat Drone and Sentry Turret scale from the Engineer.** Attack is class DC - 10. Damage dice multiply by level as powers do (drone 1d6, turret 1d8+2). Drone: AC class DC - 3, HP 15 + 5 x level. Turret: AC class DC - 4, HP 22 + 8 x level. Saves and Perception are class DC - 12.
- **They act on their own.** The drone makes one Strike each turn without costing an action (two with Combat Drone Upgrade); before, each Strike cost one. The turret already fired for free.
- **Using either power puts a token beside the Engineer**, from new Combat Drone and Sentry Turret actors in the creatures pack. Each Engineer gets one actor of each kind, owned by their player and refreshed on every use. Deploying again replaces the token; Drone Commander keeps two.
- **Tech Training (1st, class feature).** Two extra 1st-level tech powers.
- **Engineer Mastery** takes 1 round off tech cooldowns, never below 2.
- **Every tech power a character uses puts a cooldown effect on the sheet**: 7 rounds less Intelligence, less Tech Mastery, less Engineer Mastery. Improved Engineer Mastery's one-round cut is applied automatically, once a round.
- **Tech Field (12th)** deals 4d4 a round, 5d4 at 16th, 6d4 at 20th (was 1d4).

Failings still open:
- **Apex Engineer (20th) nearly doubles damage**: 118 a round at 19th, 210 at 20th, 144 without its free power. With it the Engineer is level with the Adept (216) and Vanguard (183) at 20th, so it was left alone (X4).
- **Behind the Adept and Vanguard from 13th to 19th** by 10-30% on one target (96 / 108 / 118 against the Adept's 110 / 130 / 172).
- **Network Shutdown (18th) affects only synthetics**, and Overload Upgrade and Overload Network only matter against kinetic shields.
- **The NPC Combat Drone still has its fixed 1st-level numbers** (20 HP, AC 15, +4 for 1d6).
- **The drone's and turret's one-minute duration is not tracked**, and their tokens are not added to the encounter.
- **Tech Training does not stop the same power being picked twice.**
- **The drone and turret tokens use the powers' icons**; there is no art for them.

Loopholes:
- **The Tech Mastery chain is worth 15-25%**: its 2-round cut puts every tech power on a 1-round cooldown from 10th. Three area powers on 1-round cooldowns give 226 / 284 / 473 across three targets at 16th / 19th / 20th. Since 2026-11-19 the chain's cut stops at 2 rounds (X7): 131 / 181 / 226 / 284 across three targets at 10th / 13th / 16th / 19th, down from 140 / 181 / 243 / 321.
- **Two drones with Drone Commander** now both attack on their own; simulated in the numbers above from 14th.

## Adept

Built 2026-11-18 and checked in Foundry (SF2e): Biotic Explosion, Biotic Training, the shorter cooldown and the Dark Matter change. Not played in a real fight.

Damage a round at levels 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20, simulated:

| | One target | Three targets |
|---|---|---|
| Before (powers scaled, nothing else) | 6 / 7 / 15 / 18 / 54 / 86 / 102 / 164 / 205 | 6 / 7 / 21 / 24 / 77 / 118 / 141 / 210 / 263 |
| As built | 11 / 13 / 27 / 37 / 76 / 109 / 130 / 172 / 216 | 15 / 24 / 47 / 56 / 113 / 164 / 198 / 263 / 331 |
| Vanguard Nova Combo, for reference | 22 / 24 / 48 / 54 / 73 / 105 / 120 / 150 / 183 | 153 / 170 / 229 / 360 at 13 / 16 / 19 / 20 |

Simulated build: Warp, Throw, Shockwave, Slam, Reave, Biotic Resonance, Lash, Singularity, Biotic Cascade, Dark Matter; standard amps; spare actions fire a pistol. The simulator favors the Adept (foes never die, three always stand within 10 feet, it never moves) and is a scratch file, not in the repo.

Measured again 2026-11-19: engine cooldown counting (X7), gear for class DC (X6), and the amp chosen for damage instead of assumed. Damage a round at levels 1 / 3 / 5 / 7 / 10 / 13 / 15 / 16 / 18 / 19 / 20:

| | One target | Three targets |
|---|---|---|
| As built, Recharge 3 amp from 15th | 11 / 16 / 35 / 54 / 101 / 133 / 170 / 193 / 200 / 220 / 277 | 15 / 29 / 57 / 85 / 155 / 201 / 278 / 311 / 322 / 356 / 451 |
| As built, Savant I kept to 18th (what was recorded before) | 11 / 16 / 35 / 54 / 101 / 133 / 143 / 159 / 159 / 220 / 277 | 15 / 29 / 57 / 85 / 155 / 201 / 218 / 243 / 243 / 356 / 451 |
| Option A: powers other than Charge, Nova and Vanguard Rush never below 2 rounds | 11 / 16 / 35 / 54 / 101 / 133 / 142 / 159 / 159 / 172 / 217 | 15 / 29 / 57 / 85 / 154 / 201 / 218 / 243 / 243 / 263 / 332 |
| Option B: with Recharge 3, only the first power each turn cools down in 1 round | 11 / 16 / 35 / 54 / 101 / 133 / 151 / 171 / 177 / 195 / 245 | 15 / 29 / 57 / 85 / 155 / 201 / 239 / 267 / 275 / 304 / 386 |
| Vanguard Nova Combo, for reference | 22 / 26 / 50 / 66 / 90 / 127 / - / 146 / - / 188 / 224 | 22 / 35 / 68 / 91 / 141 / 185 / - / 208 / - / 295 / 455 |

Findings:
- **Every-turn biotic powers start at 15th, not 19th.** A Recharge 3 amp is on sale at 15th (Gemini III, 65,000 credits). The simulators had the Adept and Vanguard wearing a Savant I (Recharge 2) until 19th. With a Gemini III the Adept deals 170 / 193 / 200 at 15th / 16th / 18th against 143 / 159 / 159, 19-26% more.
- **An amp's Power costs an Adept only its damage bonus.** Gear already gives +2 class DC from 7th and the two do not stack, so a Recharge 3 amp with no Power gives up 3 damage a power and nothing else.
- **With 1-round cooldowns the Adept uses its three best powers every turn** (3.9 powers a round against 3.5) instead of alternating with the weaker four. That, not more explosions, is the gain.
- **The Vanguard gains almost nothing from Recharge 3 before 19th**: 147 against 145 at 16th for the Nova Combo, and the Shotgunner loses by giving up Power.
- **The gear correction also raises the Adept at 3rd-10th**: 16 / 35 / 54 / 101 against the 15 / 33 / 45 / 94 recorded in X7.

Decided and built 2026-11-19: **option B.** When a biotic power's cooldown comes to 1 round (a Recharge 3 amp), only the first biotic power used each turn gets it; any others that turn take 2 rounds. Nova is not counted and keeps its own 1-round cooldown; Biotic Charge keeps its fixed one. The engine marks the 1-round cooldown effect, and that mark is gone when the character's next turn starts. The cooldown effect says which case applied. The four Recharge 3 amps, the 17 biotic power feats and the amp table in the docs say so; every amp's note now says cooldowns are tracked for all biotics, which had been true since 2026-11-18.

Checked in Foundry (SF2e) with a 16th-level Adept wearing a Gemini III, over three rounds of an encounter: Warp 1 round, then Slam and Throw 2 rounds each; Warp refused again the same turn; next turn Warp is back and Slam and Throw are not; Reave then takes the 1 round and Warp 2; Slam and Throw are back in round 3. Not played in a real fight.

Open with it:
- **The simulator gives the 1-round cooldown to whichever power is used first**, usually the primer. A player who orders powers with care may get a little more than the row above.
- **The Adept still leads the Vanguard on one target** by 17% at 16th, 4% at 19th and 9% at 20th.
- **Outside an encounter** the mark lasts until six seconds of world time pass.

The options as they were put:
- **A.** Biotic powers other than Biotic Charge, Nova and Vanguard Rush never cool down in less than 2 rounds. The Adept stays within 9% of the Vanguard on one target from 13th to 20th. The Vanguard and Sentinel do not change. Recharge 3 then does nothing for an Adept: Gemini III and Prodigy II have no buyer but a Vanguard, and the Adept's last amp upgrade is the Savant I at 13th.
- **B.** A Recharge 3 amp brings only the first biotic power used each turn down to 1 round; the rest take 2. Recharge 3 stays worth 6-13% to an Adept. The Adept leads the Vanguard on one target by 17% at 16th, 4% at 19th and 9% at 20th. Needs the engine to know which power was first in a turn.
- **Leave it.** The Adept leads the Vanguard on one target by 32% at 16th, 17% at 19th and 24% at 20th.
- Dropping the free power after an explosion (Improved Adept Mastery) lowers 10th-16th as well (90 / 116 / 141), where the Adept is not out of line.

What was built:
- **Biotic Explosion (1st, class feature).** A failed save against Warp, Reave, Dark Channel, Singularity, Pull, Lift, Stasis, Lash or a Lift Grenade primes a creature until the end of the caster's next turn; anyone's powers prime. An Adept who damages a Primed creature with Throw, Shockwave, Slam, Warp, Reave, Flare or Cluster Grenade detonates it: 2d6 force with no save, +1d6 at 4th and every 4 levels, and a basic Reflex save for the Adept's other enemies within 10 feet. Not multiplied by level, no power-damage bonuses, once per creature per power use. Automated.
- **Biotic Training (1st, class feature).** Two extra 1st-level biotic powers, picked from a prompt when the class is added.
- **Adept Mastery** takes 1 round off biotic cooldowns, never below 2.
- **Every biotic power a character uses now puts a cooldown effect on the sheet**; before, only Charge and Nova were tracked.
- **Dark Matter (18th)** lost its +2 class DC. The stack is now +4: the masteries +2 and a top bio-amp +2.

Failings still open:
- **Dark Matter is thin** for an 18th-level feat that Ascendant Form requires: Frightened 2 on a critical failure and 5 points of void resistance ignored.
- **6 hit points a level**, the lowest, on a class whose barrier is its defense.
- **Nothing of its own at 2nd, 4th or 6th** beyond the shared passive chains.
- **Below the Soldier on one target before 10th** (11 against 16 at 1st, 37 against 45 at 7th). It makes that up across several targets and with control.
- ~~**15-18% above the Vanguard on one target at 19th-20th.**~~ Re-measured and addressed 2026-11-19 (above): 4% and 9% above it now, 17% at 16th.
- **Biotic Training does not stop the same power being picked twice.**
- **Only Adepts detonate.** Vanguards and Sentinels prime. Letting Charge and Nova detonate is unmeasured.
- **Cooldown effects cover the powers whose slug starts me-biotic-.** The Lift Grenade feat and every tech power are still tracked by hand.

Loopholes:
- **Ascendant Form** (X4): a minute of free-action powers, with every one able to prime or detonate. Not measured.

Testing note: in SF2e a character nobody owns counts as "opposition", so a test Adept's burst finds no enemies until its alliance is set to the party's.

## Sentinel

Measured 2026-11-18, as built after the X1 fix. Damage a round at levels 1 / 3 / 5 / 7 / 10 / 13 / 16 / 19 / 20:

| Build | One target | Three targets |
|---|---|---|
| Powers (Warp, Overload, Throw, Cryo Blast, Slam, Neural Shock, Hybrid Core, Reave), Intelligence key | 18 / 22 / 29 / 35 / 58 / 78 / 106 / 116 / 157 | 24 / 27 / 35 / 48 / 80 / 106 / 138 / 150 / 200 |
| The same with Charisma as key | 18 / 22 / 29 / 35 / 53 / 70 / 106 / 116 / 147 | 24 / 27 / 35 / 48 / 66 / 86 / 123 / 134 / 169 |
| Defense (Tech Armor, the Fortification chain, Adaptive Defense, Battle Hardened, Sentinel's Resolve) | 16 / 14 / 23 / 24 / 28 / 41 / 60 / 66 / 85 | 22 / 19 / 29 / 31 / 33 / 41 / 60 / 66 / 87 |
| Gun only | 16 / 19 / 24 / 26 / 23 / 35 / 39 / 40 / 34 | |

The powers build sits between the Soldier and the Adept and needs no help. The defense build deals about half as much. Not played. The simulator is a scratch file, not in the repo.

What the defenses are worth, as damage taken from one same-level foe making two Strikes (arithmetic; foe numbers approximate):
- **Tech Armor's +2 AC** cuts damage taken by about 20% at every level, while it lasts.
- **From 7th level an ordinary hit deals 20 or more**, so Tech Armor detonates on the first hit that lands and then waits out its cooldown.
- **Fortification** cuts damage to about half on the one round in four or five it is up, for two actions. Its resistance stops growing at 10th (12), against hits of 24 at 10th and 46 at 20th.

Dead or overlapping text found (confirmed; fixed by the build below unless listed as still open):
- **Improved Sentinel Mastery's +2 AC is a circumstance bonus, like Tech Armor's**, so with Tech Armor up it does nothing. Fortification's +1 / +2 AC and Sentinel's Resolve's +4 are circumstance bonuses too.
- **Superior Sentinel Mastery raises "Tech Armor's damage reduction" by 2.** Tech Armor has none.
- **Adaptive Defense (12th) lets Tech Armor and Fortification be active together.** Nothing stops that without it. The feat does nothing, and Battle Hardened, Sentinel's Resolve and Apex Sentinel all sit behind it.
- **A Charisma Sentinel's tech powers cool down on Intelligence**: six or seven rounds.

Built 2026-11-18 and checked in Foundry (SF2e). Not played in a real fight.

- **Tech Armor is a 1st-level class feature**, no longer a feat pick. Using it puts its effect on the Sentinel.
- **Its detonation threshold is 17 + 3 x level** (20 at 1st, 77 at 20th): from 5th level a critical hit sets it off and an ordinary hit does not.
- **Improved Sentinel Mastery (7th)** gives resistance 3 to all damage while Tech Armor is up, doubled on a turn with both a biotic and a tech power. It replaces the AC bonus that did not stack. **Superior (13th)** raises it to 5 (10 doubled). Estimated damage taken with Tech Armor up: about 70% of undefended, about 60% on a two-power turn (it was about 80%).
- **Adaptive Defense (12th)**: Fortification costs 1 action, and a detonated Tech Armor reforms at the start of the next turn.
- **Battle Hardened (16th)** requires Adaptive Defense or Hybrid Core, so the 16th-20th feats no longer need Fortification.
- **Apex Sentinel (20th)**: Tech Armor and Fortification as free actions, once a round each.
- **Sentinel Mastery**: tech cooldowns use the higher of Intelligence and Charisma.
- **Fortification** (also the Soldier's): Master Fortification's resistance is 12 or the character's level, whichever is higher; the cooldown uses the higher of Constitution and the key attribute.

Failings still open:
- **Detonation, Adaptive Defense's reform and Fortification are applied by hand.** Only raising Tech Armor and its resistance are automated.
- **Fortification's +1 / +2 AC and Sentinel's Resolve's +4 are still circumstance bonuses**, so only the largest counts alongside Tech Armor's +2.
- **Fortification's first two tiers still stop at resistance 5 and 8.**
- **The defense build deals about half the damage of the powers build.** Left as the class's intended trade.
- **No simulator has foes that attack**, so every defensive number here is an estimate.

Loopholes:
- **Battle Hardened**: immune to stunned and confused, and +2 to all saves that stacks with everything.
- **Sentinel's Resolve**: resistance 20 to all damage for a minute, once a day (twice with Apex Sentinel).
- **Both mastery chains are open to it**: +6 biotic and +6 tech power damage for six feats.

## Suggested order

1. ~~X2, the unassigned feats.~~ Done 2026-11-18.
2. ~~X1, power scaling.~~ Done 2026-11-18: the NPC rule, for everyone.
3. ~~Adept (Biotic Explosion).~~ Done 2026-11-18.
4. ~~Engineer (drones).~~ Done 2026-11-18.
5. ~~Sentinel.~~ Done 2026-11-18.
6. ~~Infiltrator.~~ Done 2026-11-19.
7. ~~Soldier.~~ Done 2026-11-19.
8. ~~Vanguard, and the cooldown floor (X7).~~ Done 2026-11-19: the Vanguard holds as built; Tech Mastery's cut stops at 2 rounds; ammo powers are ranged only.

9. ~~The Adept at 15th-20th.~~ Done 2026-11-19: with Recharge 3, only the first biotic power each turn cools down in 1 round.

Still open: feat choice at 12th-16th (X3); the items each class lists as still open.
