---
purpose: odds-simulator-context
source: docs/rules-full.md
generated_at: 2026-06-07T15:45:00Z
sections: [stats, dice, attack_pipeline, damage, weapons, combat_manoeuvres, parting_blow, conditions, activation]
---

# Judgement Combat Rules (Minimal Context)

Distilled from Judgement: Eternal Champions Rulebook v2.6 for odds/combat simulation.

## Stat Definitions

| Stat | Name | Role in Combat |
|------|------|----------------|
| MOV | Movement | Hexes a model can move per Advance; used by Monsters for Hunter advances |
| AGI | Agility | Target stat used in attack dice calculation; caps and penalties from conditions apply |
| MEL | Melee | Attacker stat for melee (MEL) attacks |
| MAG | Magic | Attacker stat for magic (MAG) attacks |
| RNG | Ranged | Attacker stat for ranged (RNG) attacks |
| RES | Resilience | Reduces damage taken: `Final Damage = Attack Damage - RES` (minimum 0 implied by examples) |
| AP | Action Points | Spent to perform actions during activation; attacks cost 1+ AP as listed on weapon/ability |

## Attack Types

Three attack types: **Melee (MEL)**, **Ranged (RNG)**, **Magic (MAG)**.

### MEL Attack Requirements

- Attacker has line-of-sight to target
- Attacker is engaging an enemy within reach of the melee weapon
- MEL attacks with Reach > 1 only use extended reach during the owning model's activation; otherwise Reach(1)

### RNG / MAG Attack Requirements

- Attacker has line-of-sight to target
- Target is within weapon/ability reach
- Attacker is **not** engaged by an enemy model

### Attack Cost

Each attack costs **1 AP or more** (1AP, 2AP, 3AP on card). AP must be paid before the attack executes.

## Attack Pipeline (6 Steps)

Follow in exact order:

1. **Declare Attack** — choose enemy target in LOS and weapon reach
2. **Determine Attack Dice Pool** — base calculation + modifiers (see below)
3. **Roll Attack Dice** — roll full pool; optional re-rolls (Try Again, etc.)
4. **Choose Dice** — select **exactly 3 dice** from the pool to resolve (regardless of pool size)
5. **Mark Damage and Hero Death** — apply damage before manoeuvres; resolve death triggers
6. **Perform Combat Manoeuvres** — purchase manoeuvres with manoeuvre symbols on the 3 chosen dice

**Order rule:** Basic Attack damage is always applied **before** any Combat Manoeuvre.

## Attack Dice Pool Calculation

### Base Calculation

Compare attacker stat (MEL, MAG, or RNG per attack type) vs target **AGI**:

- **+1 die** for each attack point the attacker has **greater than** target AGI
- If attacker stat is **equal to or lower than** target AGI: start with **1 die**

Example: 7 MAG vs 3 AGI → 4 base dice.

### Minimum Pool Size

After all modifiers, if result is **0 or less**, use **1 die**. Attack dice pool can never go below 1.

### Modifier Order

Apply in order (positive first, negative second within each category):

**Melee modifiers:**
- Charge: +2 dice if you Charged
- Ganging Up: +1 die per other friendly model engaging the target
- Distracted: -1 die per other enemy engaging the attacker (not vs Monsters)
- Positive/negative abilities affecting attacker
- Terrain modifiers

**Ranged modifiers:**
- Aiming Bonus: +1 die to RNG attacks for activation (claimed at start; cannot Advance, melee attack, or Effigy Recall that activation)
- Firing Into Melee: -1 die per model (other than attacker) engaging or engaged with target
- Positive/negative abilities, terrain

**Magic modifiers:**
- Firing Into Melee: -1 die per model (other than attacker) engaging or engaged with target
- Positive/negative abilities, terrain

**Stand Your Ground:** Target receiving a Charge may spend 1 Fate for -1 dice penalty to the attacker.

## Dice Faces and Hit Resolution

From the 3 selected dice, count **Hit** symbols:

| Hit Level | Typical naming | Used for |
|-----------|----------------|----------|
| Glance | Glancing Blow | Lowest damage tier on weapon profile |
| Solid | Solid Blow | Middle damage tier |
| Crit | Critical Blow | Highest damage tier |

- Damage amounts per tier are **weapon-specific** (Glance / Solid / Crit values on model card)
- If no Hit symbols among the 3 chosen dice: **no damage** dealt
- Bonus damage sources require **at least one Hit**
- **Manoeuvre** symbols on chosen dice purchase Combat Manoeuvres (cost varies by manoeuvre)
- A die can be Hit, Manoeuvre, Hit/Manoeuvre, or Miss (blank)

### Re-rolls

- Attacker may re-roll dice (e.g. Try Again: 1 Fate)
- A die re-rolled once **cannot** be re-rolled again
- Active player re-roll options first, then non-active forced re-rolls on unre-rolled dice

## Damage Application

```
Final Damage = Attack Damage (from best Hit tier achieved) - Target RES
```

Example: Crit inflicts 4 damage, RES 1 → 3 damage marked on health track.

### Health and Death

- Heroes have base health; max health increases on level-up with immediate heal equal to the increase
- Health reduced to 0: death triggers, resurrection next Communion Phase at Effigy with penalties (-5 from max health, -1 AP first activation after)
- Monsters spawn/respawn at full health per card rules

## Weapon Profiles

Each Basic Attack lists:

- **Name**, **Type** (MEL/RNG/MAG)
- **Reach** (hexes)
- **Cost** (AP)
- **Glance / Solid / Crit** damage values

Dual Wield and 0AP attacks have special manoeuvre restrictions.

## Combat Manoeuvres

- Purchased with manoeuvre symbols on the 3 selected attack dice
- **One manoeuvre per Basic Attack** (unless card states otherwise)
- Damage resolved before manoeuvre movement/effects
- **Push (x):** generic manoeuvre; move target and/or attacker in straight line; max 3 pushes from dice; 0AP attacks cannot apply Push
- Model-specific manoeuvres listed on cards with symbol cost (e.g. Viper Strike requires 2 manoeuvre symbols)
- Duplicate manoeuvre effects on same target do not stack; new replaces old
- **Dual Wield** cannot Push on second attack; Charge +2 dice only on first attack of Charge

### Parting Blow

When a model **disengages** (Advance or Effigy Recall out of enemy melee reach):

- Engaged enemy may make **Interrupt** melee Basic Attack before movement completes
- Uses standard dice calculation **+ 1 die** (Parting Blow advantage)
- Minimum **3 dice** in Parting Blow pool after all modifiers
- Parting Blow: damage only, **no Combat Manoeuvres**
- If 3 hits rolled on Parting Blow: disengaging model suffers **knock down** (stays in hex, cannot complete disengage move as intended)

Push/Place movement does **not** trigger Parting Blow.

## Conditions (Combat-Relevant)

Conditions last until end of target's **next activation** (or removed via Cleanse / Stand Up). Only **different** conditions stack; duplicates replace.

| Condition | Combat Effect |
|-----------|---------------|
| Burn | 3 True Damage at end of current or next activation; cannot Heal |
| Poison | -1 MEL/RNG/MAG; -1 AGI; Basic Attack damage reduced by 1 |
| Freeze | AGI capped at 3; MOV capped at 2; -1 Soul Harvest; Dash cannot increase MOV |
| Pin | Cannot Advance or Charge |
| Stun | -1 AP; cannot deliver Parting Blows |
| Knock Down | -3 AGI (min 1); cannot attack, Parting Blow, or engage; cannot Advance or spend AP until Cleanse/Stand Up; no Distracted/Ganging Up contribution; height 1 |
| Fear | Cannot use Active Abilities or artefact actives; cannot target applier; cannot Soul Harvest; Undead/Monsters immune |
| Curse | Cannot harvest Souls; cannot contest Shrines; cannot Assist/Hinder Soul Harvest; no Soul Binding while cursed |

Condition-applied deaths: applier gets kill credit.

## Activation Economy

- Heroes activate in Activation Phase with AP per activation
- Active Abilities: typically once per activation unless stated
- Innate Abilities: always on, no AP unless stated
- Try Again: 1 Fate to re-roll attack dice
- Cleanse: 1 Fate during Activation Phase to remove a condition

## Key Rules for Simulator

1. Always use **3 chosen dice** from pool for resolution
2. Attack stat minus target AGI drives base dice; floor of 1 die after modifiers
3. RES subtracts from damage after hit tier determined
4. MEL requires engagement; RNG/MAG require not engaged
5. Weapon damage tiers are per-weapon, not universal
6. Manoeuvre symbols compete with hit symbols on the same 3 dice
7. Charge (+2 melee dice) and Stand Your Ground (-1) are common fight modifiers
8. Ganging Up / Distracted / Firing Into Melee adjust dice count before roll

## Out of Scope for This Document

- Campaign, drafting, Effigy capture win conditions
- Full terrain/LOS geometry (Stealth, Forest, elevation)
- Monster Hunter/Respawn communion rules
- Magical Artefacts and Fate economy detail
- Complete ability text (use `docs/heroes.md`, `docs/monsters.md`, `docs/summons.md` for profiles)
