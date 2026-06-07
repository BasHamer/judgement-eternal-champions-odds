# Rules Min Context

## Overview

Distill the full Judgement rulebook text into a minimal, LLM-optimized combat context document for building an odds simulator. This SOP runs after `pdf-extractor` has produced `docs/rules-full.md`.

## Parameters

- **source_file** (optional, default: "docs/rules-full.md"): Full extracted rulebook markdown
- **output_file** (optional, default: "docs/rules-min-context.md"): Distilled output path

## Steps

### 1. Read Source

Read the full extracted rulebook from `source_file`.

**Constraints:**

- You MUST read the entire source file or search systematically for combat-relevant sections
- You MUST NOT invent rules not present in the source

### 2. Extract Combat-Relevant Rules

Distill content needed for an odds/combat simulator.

**Retain:**

- Attack resolution (hit rolls, crit/solid/glance thresholds)
- Damage application and health/soul mechanics
- Combat stats (MEL, MAG, RNG, AGI, RES, MOV) definitions
- Weapon profiles and reach
- Activation economy (AP), combat manoeuvres
- Conditions that affect dice/combat
- Relevant errata/FAQs if present in source

**Omit:**

- Lore, fluff, art captions
- Non-combat campaign rules
- Duplicate examples
- Table-of-contents noise

**Constraints:**

- You MUST preserve exact mechanical terminology from the source
- You SHOULD organize by topic with clear headings
- You MUST use markdown tables where definitions or thresholds are tabular

### 3. Write Output

Write `output_file` with YAML frontmatter and structured sections.

**Output format:**

```markdown
---
purpose: odds-simulator-context
source: docs/rules-full.md
generated_at: <ISO8601>
sections: [combat, dice, stats, weapons, conditions, activation]
---

# Judgement Combat Rules (Minimal Context)

## Dice Resolution
...

## Stat Definitions
| Stat | Meaning |
...

## Attack Pipeline
1. ...
```

**Constraints:**

- You MUST include accurate `generated_at` timestamp
- You MUST write the complete file to `output_file`
- You MUST keep the document self-contained for an LLM building a combat simulator

## Examples

```
/source_file: docs/rules-full.md
/output_file: docs/rules-min-context.md
```

## Troubleshooting

- If source is missing, run `dotnet run --project tools/pdf-extractor` first
- If extraction quality is poor on specific pages, cross-reference adjacent pages in source
