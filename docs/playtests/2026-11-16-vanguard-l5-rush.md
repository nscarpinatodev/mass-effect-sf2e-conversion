# Playtest: level 5 Vanguard, Vanguard Rush with a bio-amp (20 runs)

> **Superseded.** These runs used the old Rush: 2 actions, Nova only on a failed save. After this test, Rush became a 1-action flourish. It now always fires Nova, a failed save resets Charge's and Nova's cooldowns (one of them can be used again that turn), and a critical failure refills half the barrier after the Nova.

**Date:** 2026-11-16 · **World:** SF2e System Test (sf2e 1.7.0, Foundry v14), with packs from commit `021a56f` · **Automation:** Automate Vanguard Powers on

## Setup

- **Vanguard L5:** Str key (+4), Cha +0, class DC 21. Class feats: Biotic Charge (1st), Nova (2nd), **Vanguard Rush** (4th, in place of Improved Charge).
- **Amp:** **Unity Bio-Amp I** (Recharge −1, Power 1). That puts Nova and Rush on a 3-round cooldown. The Biotic Barrier is 15 + 5 = **20 HP**, so Nova is **6d6 + 1** force. Charge's own cooldown is 2 rounds without Improved Charge.
- **Vanguard Rush** (2 actions): Biotic Charge (4d6 bludgeoning, basic Reflex). If the target *fails* its save, Nova follows as a free action. Charge, Nova and Rush all start their cooldowns either way.
- **Squad and positions:** the same as the [Charge-then-Nova playtest](2026-11-16-vanguard-l5-charge-nova.md), reset before every run. Runs 1–10 Rush the **Eclipse Enforcer** (Reflex +11). Runs 11–20 Rush the near **Eclipse Trooper** (Reflex +10).

## Results

### Did Nova go off?

| | Rush target's Reflex | Nova fired | Expected* |
|---|---|---|---|
| Runs 1–10, Enforcer | +11 | **4 of 10** (runs 1, 3, 6, 7) | 45% |
| Runs 11–20, Trooper | +10 | **3 of 10** (runs 12, 14, 18) | 50% |
| All 20 | | **7 of 20 (35%)** | 47% |

\*The chance the target fails a basic Reflex save against DC 21.

Charge damage averaged 10.0 against the Enforcer and 9.5 against the Trooper (4d6, expected 10.5).

### The seven Novas

Each cell gives the Fortitude result, then the damage, then shields before → after. Collapsed shields are in bold.

| Run | Nova total (6d6+1) | Enforcer | Heavy | E. Vanguard | Engineer | Trooper | Collapsed / downed |
|---|---|---|---|---|---|---|---|
| 1 | 32 | S 16 | CF 64, **30→0** | F 32, **40→0** | S 16, **30→0** | CF 64, **dead** | 4 / 1 |
| 3 | 23 | S 11 | S 11 | S 11 | F 23, **30→0** | S 11 | 1 / 0 |
| 6 | 23 | CS 0 | S 11 | S 11 | CS 0 | F 23, **30→0** | 1 / 0 |
| 7 | 26 | F 26, **50→0** with the Charge | F 26, **30→0** | F 26, **40→0** | F 26, **30→0** | F 26, **30→0** | 5 / 0 |
| 12 | 22 | F 22 | S 11 | F 22, **40→0** | S 11 | F 22, **30→0** with the Charge | 2 / 0 |
| 14 | 17 | S 8 | S 8 | S 8 | S 8 | F 17, **30→0** with the Charge | 1 / 0 |
| 18 | 18 | S 9 | S 9 | F 18 | CF 36, **30→0** | F 18, **30→0** with the Charge | 2 / 0 |

The Nova rolls averaged 23.0 (6d6 + 1 is 22 on average). That's **16 shields collapsed in 7 Novas (2.3 per Nova)**, and 1 creature killed.

## Analysis

1. **Rush is a coin flip that costs Nova either way.** Nova fired 35% of the time here, and the math says about 47% against these Reflex saves. When it doesn't fire, the Vanguard has spent 2 actions on a Charge worth about 10 damage, *and Nova goes on its 3-round cooldown without detonating*. The barrier is still full, but it can't be spent.

2. **Rush is strictly worse than using the two powers separately.** Vanguard Mastery (1st level) cuts Charge to 1 action, so Charge and then Nova also costs 2 actions, and Nova always detonates. Rush saves no action. It only adds the chance of losing Nova, and a third cooldown. Until Vanguard Strike (14th), which always fires, there's no reason to use it.

3. **Choosing a weak-Reflex target doesn't help against Eclipse.** The level 2 Trooper has Reflex +10, about the same as the level 5 Enforcer's +11. The idea from the last playtest, Rushing the soft target, doesn't work against this faction.

4. **When Nova does fire, the amp makes it strong.** 6d6 + 1 off a 20-HP barrier collapsed 2.3 shields per Nova, against about 1.9 for the 5d6 Nova without an amp. In run 7, every target failed and all five shields went down, including the Enforcer's 50.

5. **The Rush text contradicts itself.** It says Nova follows if the target *fails*, then also that a *critical success* stops Nova, which implies a plain success doesn't. The automation follows the first rule: Nova needs a failure.

## Options (not decided)

Separate Charge and Nova already cost 2 actions, so Rush has to give something those two don't. Fixing only the trigger would still leave it no better than the two powers used separately.

- **Make Rush cheaper:** Charge and Nova for 1 action.
- **Make Rush stronger:** Nova fires unless the target critically succeeds, and the barrier refills fully before it.
- **Bring back the combo's saving:** Charge keeps its 2-action cost under Vanguard Mastery, so Charge then Nova costs 3 actions and Rush saves one.
- **Separately:** a Rush that doesn't trigger Nova shouldn't start Nova's cooldown.
