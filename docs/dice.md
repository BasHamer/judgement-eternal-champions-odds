---
purpose: odds-simulator-dice
source: Judgement Eternal Champions Rulebook v2.6
---

# Judgement Combat Die

Each Judgement combat die has **6 sides**:

| Face | Count | Symbol | Effect when selected |
|------|-------|--------|---------------------|
| Judgement | 1 | J | 3 hit symbols (Critical tier when used in a 3-die set) |
| Strike | 2 | Single hit | 1 hit symbol each (Glancing tier alone) |
| Manoeuvre | 1 | M | 1 manoeuvre symbol (no hit unless Hit/Manoeuvre hybrid on other dice) |
| Blank | 2 | — | No effect |

## Pool and selection

1. Roll a pool of combat dice (size from attack stat vs target AGI, plus modifiers).
2. The attacker selects **up to 3 dice** from the pool (all dice if the pool is smaller than 3).
3. Count **hit symbols** across the chosen dice:
   - **1 hit** → Glancing Blow → weapon Glance damage
   - **2 hits** → Solid Blow → weapon Solid damage
   - **3+ hits** → Critical Blow → weapon Crit damage
   - **0 hits** → no damage

For damage odds, the attacker chooses dice to maximize hits (manoeuvre faces are ignored unless simulating manoeuvres).

## Damage

```
Final Damage = max(0, Weapon Tier Damage - Target RES)
```

## Die face distribution (simulation)

```
[J, Strike, Strike, Manoeuvre, Blank, Blank]
```

Probability per roll: J 1/6, Strike 2/6, Manoeuvre 1/6, Blank 2/6.
