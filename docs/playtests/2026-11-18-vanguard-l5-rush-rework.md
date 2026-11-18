# Playtest: level 5 Vanguard, reworked Vanguard Rush (20 three-round fights)

**Date:** 2026-11-18 · **World:** SF2e System Test (sf2e 1.7.0, Foundry v14) · **Automation:** Automate Vanguard Powers on

## Setup

- **Vanguard L5:** Str key, Cha +0, class DC 21. Class feats: Biotic Charge, Nova, **Vanguard Rush** (reworked). No Improved Charge.
- **Amp:** Unity Bio-Amp I. The barrier is 20 HP, Nova and Rush cool down for 3 rounds, and Charge for 2.
- **Reworked Rush:** 1 action, flourish. Charge, then Nova whatever the target rolls. A failed save resets Charge's and Nova's cooldowns, and the Vanguard may use one of the two again that turn. A critical failure also refills half the barrier after the Nova.
- **Encounter:** the Eclipse squad from the earlier playtests (Enforcer, Heavy, Eclipse Vanguard, Engineer, two Troopers), reset before each fight.
  - **Initiative:** all seven tokens are in the order. The Vanguard acts first, then each Eclipse turn passes, for three rounds. The enemies don't attack, but their shields follow the shield system's start-of-turn recharge rules.
- **Targeting:** the first Rush or Charge targets the Enforcer at the center of the group. Later ones target the enemy with the most others within 10 feet.
- **Only powers are counted:** Charge, Nova and Rush. Actions left over for Strikes aren't simulated.

### Three ways of playing

| Policy | Fights | What the Vanguard does each turn |
|---|---|---|
| **Chain** | 10 | Rush whenever Charge and Nova are both ready. After a reset, save it for next round's Rush, using the extra Charge or Nova only in round 3. |
| **Follow-up** | 5 | Rush, and always take the extra Charge or Nova after a reset: Nova after a critical failure if 2+ foes are within 10 feet, otherwise Charge. |
| **No Rush** | 5 | The pre-Rush way: Charge, then Nova (2 actions), whenever each is ready. |

## Results

| Policy | Damage per fight (HP + shields) | HP lost | Shields stripped | Shields down at end | Novas per fight | Rushes per fight | Downed |
|---|---|---|---|---|---|---|---|
| Chain | **160.6** | 32.6 | 128.0 | 2.7 | 1.5* | 1.6 | 1 in 10 |
| Follow-up | 142.4 | 17.4 | 125.0 | 2.2 | 1.4* | 1.4 | 0 in 5 |
| No Rush | 157.2 | 35.8 | 121.4 | 2.4 | 1.0 | — | 1 in 5 |

\*One chain fight and one follow-up fight have an incomplete log for their first Rush: its Nova finished after the 15-second wait and wasn't recorded. Their damage totals are complete, so these two Nova counts are about 0.1 low.

The 15 Rushes with recorded saves broke down as 7 failures (47%), 7 successes and 1 critical success.

Damage per fight was:

| Policy | Damage per fight |
|---|---|
| Chain | 185, 112, **294**, 75, 217, 140, 182, 111, 158, 132 |
| Follow-up | 216, 174, 57, 130, 135 |
| No Rush | 121, 149, 220, 196, 100 |

The 294 came from three failed saves in a row: Rush in rounds 1, 2 and 3. Every enemy's shield went down and they lost 114 HP.

### What a chain looks like

| Round | Failed save | Successful save |
|---|---|---|
| 1 | Rush: 6d6+1 Nova off the full 20-HP barrier. Charge and Nova reset. | Rush: 6d6+1 Nova. Charge goes on a 2-round cooldown, Nova on 3. |
| 2 | Rush again: the Charge refills half the barrier, so the Nova is 4d6+1. | Nothing: Charge and Nova are both cooling down. |
| 3 | Rush again if round 2 also failed; otherwise both are cooling down. | Charge only: refills the barrier to 10. |

## Analysis

1. **The reset works as intended: more combos.** Chain play got 1.6 Rushes and about 1.6 Novas per three-round fight, against 1 Nova for the no-Rush Vanguard. About half of Rushes reset, so the Vanguard Rushes back to back about half the time and three times in a row about a fifth of the time.

2. **Raw power damage is barely higher, because the repeat Novas are half strength.** After a Nova the barrier is empty, and the next Rush's Charge only refills half (10 of 20). The second Nova is 4d6+1 (about 15) instead of 6d6+1 (about 22). Chain play dealt 160.6 per fight against 157.2 for no Rush, and stripped slightly more shields (128 against 121). Fights with several failed saves (294, 217) are where Rush pulls ahead.

3. **Rush's real gain is actions.** Rush is 1 action where Charge then Nova is 2. In these fights a chain Vanguard had **2 actions left on every Rush turn** for Strikes, and the no-Rush Vanguard had 1. That's roughly one extra Strike per combo, about 10–15 expected damage at 5th level with a Doshko and Biotic Melee. That damage isn't in the table above. Counting it, Rush comes out clearly ahead.

4. **Taking the follow-up usually costs more than it gives.** The extra Charge (or Nova) puts that power back on its cooldown, which blocks next round's Rush. Follow-up play dealt the least damage (142 per fight, from only 5 fights). The best play is to bank the reset for next round's Rush and use the follow-up only in the last round of a fight.

5. **Shields recover between rounds.** With the enemies taking turns, a shield that isn't hit for a round recharges. Single big Novas collapse shields that come back if the Vanguard can't follow up next round. That favors the chain (a Rush every round on failures) over the no-Rush Vanguard's round-2 lull.

## Open questions

- ~~Should a failed save also refill some of the barrier, so a chained Nova isn't stuck at half strength?~~ **Decided after this test:** any failed save refills the barrier to half after the Nova, so the next Rush's Charge tops it back to full. In Foundry the second Rush detonated 20 barrier HP (6d6) instead of 10 (4d6). The numbers above predate this change.
- Should the follow-up stay, given that the best play is usually to skip it?

## Bug found and fixed during this test

The test world had **Auto-Delete Depleted Barriers** on. With it on, the barrier Nova emptied was deleted at the start of the Vanguard's next turn, and the next Rush was refused. Per the design decision that every biotic keeps one barrier for good, the setting is removed:
- An empty barrier always stays at 0 HP.
- Raising the barrier refreshes the existing effect.
- Charge or Rush on a biotic with no barrier raises an empty one, then refills it.
