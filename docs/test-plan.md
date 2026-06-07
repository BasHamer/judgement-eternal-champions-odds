# Test Plan — Judgement Odds Calculator

## Scope

| Area | What is tested |
|------|----------------|
| Data pipeline | Hero/monster markdown → `combatants.json` |
| Combat engine | Dice faces, pool size, hit tiers, damage, Monte Carlo |
| Site build | Vite production build succeeds |
| Deployed site | GitHub Pages loads simulator UI |

## Automated tests

Run from `site/`:

```bash
npm test
```

### Unit tests (`site/src/lib/combatSim.test.js`)

| ID | Case | Expected |
|----|------|----------|
| D1 | Die has 6 faces | 1×J, 2×Strike, 1×Manoeuvre, 2×Blank |
| D2 | Hit tier mapping | 0→none, 1→glance, 2→solid, 3+→crit |
| D3 | Best 3 dice selection | Prefer J (3 hits) over strikes/blanks |
| D4 | Damage resolution | Crit 4 − RES 1 = 3; no hits = 0 |
| P1 | Base pool (stat > AGI) | 7 MAG vs AGI 3 → 4 dice |
| P2 | Base pool (stat ≤ AGI) | 5 MEL vs AGI 5 → 1 die |
| P3 | Charge (MEL, first attack) | +2 dice |
| P4 | Follow-up attack | −1 die; charge bonus suppressed |
| P5 | Cover | −2 RNG; −1 MEL/MAG |
| P6 | Minimum pool | Never below 1 |
| M1 | Monte Carlo totals | 1000 iterations sum to 1000 |
| M2 | Seeded rolls (all J) | Pool 1, all crit damage |

### Data parser (`site/scripts/parse-combatants.test.mjs`)

| ID | Case | Expected |
|----|------|----------|
| C1 | Parse heroes + monsters | 68 combatants (60 heroes, 8 monsters) |
| C2 | Sample hero weapons | Abhothas has Sabre with crit/solid/glance |
| C3 | Sample monster stats | Al'garath MEL 8, RES 0 |

## Manual verification checklist

- [ ] `dotnet build JudgementOdds.slnx` passes
- [ ] `npm run build` in `site/` passes
- [ ] Attacker/target dropdowns list heroes and monsters
- [ ] Changing attacker updates weapon list
- [ ] Charge disabled for non-MEL weapons and when follow-up checked
- [ ] Dice pool updates when toggling charge / follow-up / cover
- [ ] Damage distribution table sums to 1000 (100%)
- [ ] Live site: https://bashamer.github.io/judgement-eternal-champions-odds/

## Regression commands (full suite)

```bash
dotnet build JudgementOdds.slnx
cd site && npm test && npm run build
```

## Last verification (2026-06-07)

| Check | Result |
|-------|--------|
| `dotnet build JudgementOdds.slnx` | Pass |
| `npm test` (16 tests) | Pass |
| `npm run build` | Pass |
| UI: attacker/target/weapon selectors | Pass |
| UI: charge toggles pool 3 → 5 (Abhothas Sabre vs Al'garath) | Pass |
| UI: distribution table present | Pass |
| Live site loads simulator | Pass — https://bashamer.github.io/judgement-eternal-champions-odds/ |
