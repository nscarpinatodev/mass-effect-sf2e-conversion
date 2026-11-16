# Playtest: level 5 Vanguard, Biotic Charge then Nova (10 runs)

**Date:** 2026-11-16 · **World:** SF2e System Test (sf2e 1.7.0, Foundry v14) · **Automation:** Automate Vanguard Powers on, Nova saves held 0.5 s behind the pulse

## Setup

- **Vanguard L5:** Str key (+4), Cha +0, class DC 21, 82 HP. Feats: Biotic Charge, Nova, Improved Charge. Biotic Barrier 15 HP (5 × half level, rounded up), so Nova is 5d6.
- **Charge** (2 actions): 4d6 bludgeoning, basic Reflex. **Nova** (1 action): 5d6 force, basic Fortitude, 10-foot emanation.
- **Squad (reset before every run):**

| Creature | Level | HP | Shields | Fort | Position |
|---|---|---|---|---|---|
| Eclipse Enforcer (Charge target) | 5 | 90 | 50 | +14 (Reflex +11) | 2500, 1700 |
| Eclipse Heavy | 4 | 70 | 30 | +13 | 2600, 1600 |
| Eclipse Vanguard | 4 | 55 | 40 | +10 | 2300, 1900 |
| Eclipse Engineer | 3 | 40 | 30 | +8 | 2500, 1800 |
| Eclipse Trooper | 2 | 30 | 30 | +7 | 2500, 1600 |
| Eclipse Trooper (far) | 2 | 30 | 30 | +7 | 2800, 1900, outside the area |

The Vanguard starts 35 feet west of the Enforcer, charges it, lands beside it, then uses Nova.

A first batch of ten runs was thrown out: back-to-back Novas reused the first detonation's damage roll for 30 seconds (see Bug found below). These are the ten runs after the fix.

## Results

Each Nova cell gives the save result, then damage, then shields before → after, then HP lost. CS = critical success, S = success, F = failure, CF = critical failure.

| Run | Charge vs Enforcer | Nova roll (5d6) | Enforcer | Heavy | E. Vanguard | Engineer | Trooper |
|---|---|---|---|---|---|---|---|
| 1 | S, 8 | 17 | F 17, 42→25 | S 8, 30→22 | S 8, 40→32 | F 17, 30→0, −2 HP | F 17, 30→0, −2 HP |
| 2 | F, 18, prone | 20 | F 20, 32→12 | S 10, 30→20 | F 20, 40→20 | F 20, 30→0, −5 HP | CS 0 |
| 3 | S, 7 | 11 | S 5, 43→38 | S 5, 30→25 | F 11, 40→29 | F 11, 30→19 | F 11, 30→19 |
| 4 | S, 5 | 16 | S 8, 45→37 | F 16, 30→0, −1 HP | S 8, 40→32 | F 16, 30→0, −1 HP | F 16, 30→0, −1 HP |
| 5 | S, 7 | 14 | S 7, 43→36 | S 7, 30→23 | F 14, 40→26 | F 14, 30→16 | CF 28, 30→0, −13 HP, prone |
| 6 | S, 6 | 21 | F 21, 44→23 | F 21, 30→0, −6 HP | F 21, 40→0, −1 HP | F 21, 30→0, −6 HP | S 10, 30→20 |
| 7 | S, 6 | 28 | S 14, 44→30 | S 14, 30→16 | S 14, 40→26 | CF 56, 30→0, −40 HP, **down** | F 28, 30→0, −13 HP |
| 8 | S, 5 | 17 | CS 0 | S 8, 30→22 | F 17, 40→23 | F 17, 30→0, −2 HP | F 17, 30→0, −2 HP |
| 9 | F, 13, prone | 20 | S 10, 37→27 | F 20, 30→0, −5 HP | S 10, 40→30 | F 20, 30→0, −5 HP | F 20, 30→0, −5 HP |
| 10 | S, 5 | 19 | S 9, 45→36 | S 9, 30→21 | S 9, 40→31 | F 19, 30→0, −4 HP | F 19, 30→0, −4 HP |

The far Trooper was never in Nova's area.

### Totals

| | |
|---|---|
| Charge | 8 successes, 2 failures; 8.0 damage on average (expected 10.5); Enforcer HP never touched |
| Nova roll | 18.3 on average (expected 17.5) |
| Nova saves | 2 CS, 19 S, 27 F, 2 CF (58% failed) |
| Nova damage dealt | 73.8 per use across five targets, but only 11.8 reached HP |
| Shields | 19 collapsed in 10 Novas (1.9 per use), 91 shield points stripped per use |
| Creatures downed | 1 (Engineer, critical failure on the highest roll) |

### By target

| Target | Fort | CS / S / F / CF | Avg damage | HP lost (10 runs) | Shields collapsed |
|---|---|---|---|---|---|
| Enforcer | +14 | 1 / 6 / 3 / 0 | 11.1 | 0 | 0 |
| Heavy | +13 | 0 / 7 / 3 / 0 | 11.8 | 12 | 3 |
| Eclipse Vanguard | +10 | 0 / 5 / 5 / 0 | 13.2 | 1 | 1 |
| Engineer | +8 | 0 / 0 / 9 / 1 | 21.1 | 65 | 8 |
| Trooper | +7 | 1 / 1 / 7 / 1 | 16.6 | 40 | 7 |

## Analysis

1. **At 5th level the combo strips shields; it doesn't kill.** Nova dealt about 74 damage per use, but 84% of it went into shields. It downed one creature in ten runs. What it reliably did was collapse about two shields per use. A collapsed shield stays down until its owner takes cover, so the payoff is the team's next attacks hitting HP.

2. **The overload threshold explains the numbers.** A shield collapses when a single hit deals more than half its maximum. When it does, the shield absorbs only that half and the rest reaches HP. Against 30-shield troops the threshold is 15, and a failed save against an average Nova (17.5) clears it. So a failure nearly always collapsed the shield but leaked only 1–6 HP. A 50-shield Enforcer (threshold 25) needs a critical failure, or a failure on a roll of 26+, and that never happened.

3. **Saves split by target.** Low-level, low-Fortitude troops (Engineer +8, Trooper +7) failed 80–100% of the time. The Heavy (+13) and Enforcer (+14) succeeded 70% of the time. Against DC 21, a Fortitude save of +13 or +14 succeeds on a 7–8.

4. **Charge into the toughest target does little damage.** Four d6 against the Enforcer's Reflex +11 averaged 8 here (10.5 expected), all absorbed by its 50 shields. Charge's value in this combo is closing 35 feet and refilling the barrier, which was already full in these runs. Against a 30-shield trooper, a failed save (4d6, average 14) would collapse its shield about a third of the time (16+ on 4d6).

5. **Nova ran slightly hot.** The average roll was 18.3 against 17.5 expected. 58% of saves failed, where the five saves against DC 21 predict 48% (65% for +7 down to 30% for +14). That's within the noise of 50 saves.

## Bug found

The automation keeps an area power's damage roll for 30 seconds so every creature in the area takes the same roll. Two Novas from the same item within 30 seconds reused the first Nova's roll: the first batch showed 22, 22, 22, then 27 five times, then 21 twice. Nova now keys its shared roll to each detonation (`novaAt`), so every detonation rolls its own damage. A regression test covers it. Other area powers still use the 30-second window.
