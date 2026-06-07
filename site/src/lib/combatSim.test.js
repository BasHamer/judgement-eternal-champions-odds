import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  JUDGEMENT_DIE_FACES,
  averageDamage,
  buildAttackSequence,
  calculateDicePoolSize,
  canMeetManeuverRequirements,
  chooseBestDiceForDamage,
  chooseBestManeuverEvOutcome,
  choosePureDamageOutcome,
  cumulativeProbabilities,
  damageCompositionAtBucket,
  enumerateAllDiceChoices,
  hitsToTier,
  hitSymbolsForDamageTier,
  isManeuverEvActive,
  maneuverSymbolCredit,
  meetsManeuverSymbolRequirements,
  resolveAttackDamageWithManeuverEv,
  resolveDamage,
  resolveSimulationScope,
  rollDicePool,
  runComparisonSimulation,
  runManeuverSimulation,
  runMonteCarloSimulation,
  summarizeChosenDice,
  weaponDamageForTier,
} from './combatSim.js'

const sabre = { type: 'MEL', glance: 1, solid: 2, crit: 4 }
const bow = { type: 'RNG', glance: 1, solid: 2, crit: 4 }

const abhothas = {
  stats: { mov: 3, agi: 5, mel: 6, mag: 7, rng: null, res: 0 },
}

const algarath = {
  stats: { mov: null, agi: 3, mel: 8, mag: null, rng: null, res: 0 },
}

const skoll = {
  stats: { mov: 3, agi: 5, mel: 6, mag: null, rng: null, res: 1 },
}

function poolParams(overrides = {}) {
  return {
    attacker: abhothas,
    target: algarath,
    weapon: sabre,
    charge: false,
    secondBasicAttack: false,
    thirdBasicAttack: false,
    dualWieldAttack: false,
    miscDiceModifier: 0,
    simulationScope: 'combined',
    cover: false,
    ...overrides,
  }
}

describe('Judgement die', () => {
  it('D1: has six faces with correct hit distribution', () => {
    expect(JUDGEMENT_DIE_FACES).toHaveLength(6)
    expect(JUDGEMENT_DIE_FACES.filter(d => d.hits === 3)).toHaveLength(1)
    expect(JUDGEMENT_DIE_FACES.filter(d => d.hits === 1)).toHaveLength(2)
    expect(JUDGEMENT_DIE_FACES.filter(d => d.maneuver === 1)).toHaveLength(1)
    expect(JUDGEMENT_DIE_FACES.filter(d => d.hits === 0 && d.maneuver === 0)).toHaveLength(2)
  })
})

describe('hitsToTier', () => {
  it('D2: maps hit counts to damage tiers', () => {
    expect(hitsToTier(0)).toBe('none')
    expect(hitsToTier(1)).toBe('glance')
    expect(hitsToTier(2)).toBe('solid')
    expect(hitsToTier(3)).toBe('crit')
    expect(hitsToTier(5)).toBe('crit')
  })
})

describe('chooseBestDiceForDamage', () => {
  it('D3: selects highest-hit dice up to three', () => {
    const rolls = [
      { hits: 0, maneuver: 0 },
      { hits: 1, maneuver: 0 },
      { hits: 3, maneuver: 0 },
      { hits: 1, maneuver: 0 },
    ]
    const chosen = chooseBestDiceForDamage(rolls)
    expect(chosen).toHaveLength(3)
    expect(chosen.reduce((s, d) => s + d.hits, 0)).toBe(5)
  })
})

describe('resolveDamage', () => {
  it('D4: applies weapon tier and RES', () => {
    const critOnly = [{ hits: 3, maneuver: 0 }]
    expect(resolveDamage(critOnly, sabre, 0)).toBe(4)
    expect(resolveDamage(critOnly, sabre, 1)).toBe(3)
    expect(resolveDamage([{ hits: 0, maneuver: 0 }], sabre, 0)).toBe(0)
  })

  it('D5: armour piercing reduces effective RES', () => {
    const critOnly = [{ hits: 3, maneuver: 0 }]
    expect(resolveDamage(critOnly, sabre, 2, { armourPiercing: 1 })).toBe(3)
    expect(resolveDamage(critOnly, sabre, 2, { armourPiercing: 2 })).toBe(4)
  })

  it('D6: manoeuvre path counts each J as one hit for damage tier', () => {
    const twoJ = [{ hits: 3, maneuver: 0 }, { hits: 3, maneuver: 0 }, { hits: 0, maneuver: 0 }]
    expect(hitSymbolsForDamageTier(twoJ, true)).toBe(2)
    expect(resolveDamage(twoJ, sabre, 0, {}, { maneuverPath: true })).toBe(2)
    expect(resolveDamage(twoJ, sabre, 0)).toBe(4)
  })
})

describe('calculateDicePoolSize', () => {
  it('P1: stat greater than AGI adds dice', () => {
    expect(calculateDicePoolSize(poolParams({
      attacker: { stats: { mag: 7, agi: 5, mel: 6 } },
      weapon: { type: 'MAG' },
      target: { stats: { agi: 3, res: 0 } },
    }))).toBe(4)
  })

  it('P2: stat equal to or below AGI yields one die', () => {
    expect(calculateDicePoolSize(poolParams({
      attacker: { stats: { mel: 5, agi: 5 } },
      target: { stats: { agi: 5, res: 0 } },
    }))).toBe(1)
  })

  it('P3: charge adds two dice for melee first attack', () => {
    expect(calculateDicePoolSize(poolParams({ charge: true }))).toBe(5)
  })

  it('P4: dual wield penalty subtracts one die and never receives charge', () => {
    expect(calculateDicePoolSize(poolParams({ dualWieldPenalty: true }))).toBe(2)
    expect(calculateDicePoolSize(poolParams({ charge: true, dualWieldPenalty: true }))).toBe(2)
    const sequence = buildAttackSequence({ dualWieldAttack: true })
    const dualStep = sequence.find(step => step.kind === 'dualWield')
    expect(calculateDicePoolSize({
      ...poolParams({ charge: true }),
      chargeEligible: dualStep.chargeEligible,
      dualWieldPenalty: dualStep.dualWieldPenalty,
    })).toBe(2)
  })

  it('P4b: second basic attack uses full dice pool', () => {
    const sequence = buildAttackSequence({ secondBasicAttack: true })
    expect(sequence[0].label).toBe('1st basic')
    expect(sequence[1].label).toBe('2nd basic')
    expect(sequence[1].dualWieldPenalty).toBe(false)
    expect(calculateDicePoolSize({
      ...poolParams(),
      chargeEligible: sequence[1].chargeEligible,
      dualWieldPenalty: sequence[1].dualWieldPenalty,
    })).toBe(3)
  })

  it('P4c: buildAttackSequence adds dual wield after each basic when enabled', () => {
    expect(buildAttackSequence({})).toHaveLength(1)
    expect(buildAttackSequence({ dualWieldAttack: true })).toHaveLength(2)
    expect(buildAttackSequence({ secondBasicAttack: true, dualWieldAttack: true })).toHaveLength(4)
    expect(buildAttackSequence({
      secondBasicAttack: true,
      thirdBasicAttack: true,
      dualWieldAttack: true,
    })).toHaveLength(6)
  })

  it('P5: cover penalizes by attack type', () => {
    expect(calculateDicePoolSize(poolParams({ cover: true }))).toBe(2)
    expect(calculateDicePoolSize(poolParams({
      weapon: bow,
      attacker: { stats: { rng: 7, agi: 5 } },
      target: { stats: { agi: 3, res: 0 } },
      cover: true,
    }))).toBe(2)
  })

  it('P6: pool never drops below one', () => {
    expect(calculateDicePoolSize(poolParams({
      dualWieldPenalty: true,
      cover: true,
      miscDiceModifier: -5,
      attacker: { stats: { mel: 3, agi: 5 } },
      target: { stats: { agi: 10, res: 0 } },
    }))).toBe(1)
  })

  it('P7: misc dice modifier adjusts pool', () => {
    expect(calculateDicePoolSize(poolParams({ miscDiceModifier: 2 }))).toBe(5)
    expect(calculateDicePoolSize(poolParams({ miscDiceModifier: -1 }))).toBe(2)
  })

  it('P8: +1 MEL modifier adds a die when above AGI', () => {
    expect(calculateDicePoolSize(poolParams({
      modifiers: { melBonus: 1 },
    }))).toBe(4)
  })
})

describe('cumulativeProbabilities', () => {
  it('C1: returns P(damage >= d) for each outcome', () => {
    const probs = { 0: 0.2, 2: 0.5, 4: 0.3 }
    expect(cumulativeProbabilities(probs)).toEqual({ 0: 1, 2: 0.8, 4: 0.3 })
  })
})

describe('resolveSimulationScope', () => {
  it('S1: single attack scopes return expected steps', () => {
    const sequence = buildAttackSequence({ secondBasicAttack: true, dualWieldAttack: true })
    expect(resolveSimulationScope('second', sequence)).toHaveLength(1)
    expect(resolveSimulationScope('dualWield', sequence)).toHaveLength(2)
    expect(resolveSimulationScope('dualWield', sequence).every(s => s.kind === 'dualWield')).toBe(true)
  })
})

describe('runMonteCarloSimulation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('M1: distribution counts sum to iteration count', () => {
    const result = runMonteCarloSimulation(poolParams(), 1000)
    const total = Object.values(result.distribution).reduce((a, b) => a + b, 0)
    expect(total).toBe(1000)
    expect(result.poolSize).toBe(3)
  })

  it('M2: seeded all-J rolls produce crit damage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const result = runMonteCarloSimulation(poolParams({
      attacker: abhothas,
      target: skoll,
      simulationScope: 'first',
    }), 100)
    expect(rollDicePool(1)).toEqual([{ hits: 3, maneuver: 0 }])
    expect(result.distribution[3]).toBe(100)
    expect(averageDamage(result.distribution)).toBe(3)
  })

  it('M3: compound attacks sum damage across sequence', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const result = runMonteCarloSimulation(poolParams({
      attacker: abhothas,
      target: skoll,
      secondBasicAttack: true,
      simulationScope: 'combined',
    }), 50)
    expect(result.attackCount).toBe(2)
    expect(result.attackPools).toEqual([1, 1])
    expect(result.distribution[6]).toBe(50)
    expect(result.sumManeuverAt[6] ?? 0).toBe(0)
    expect(result.composition[6]).toEqual({ attackPct: 100, maneuverPct: 0 })
  })
})

describe('maneuver expected value', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('EV1: inactive when expected value is zero', () => {
    expect(isManeuverEvActive({ expectedValue: 0, minManeuvers: 1 })).toBe(false)
    const rolls = [{ hits: 0, maneuver: 1 }]
    expect(chooseBestManeuverEvOutcome(rolls, sabre, 0, {}, {
      expectedValue: 0,
      minManeuvers: 1,
    })).toBeNull()
  })

  it('EV2: chooses manoeuvre path when EV plus weapon damage beats pure damage', () => {
    const rolls = [
      { hits: 1, maneuver: 0 },
      { hits: 0, maneuver: 1 },
      { hits: 0, maneuver: 0 },
    ]
    const pure = choosePureDamageOutcome(rolls, sabre, 1, {})
    expect(pure.total).toBe(0)

    const outcome = resolveAttackDamageWithManeuverEv(rolls, sabre, 1, {}, {
      expectedValue: 3,
      minManeuvers: 1,
      requireMinDamage: false,
    })
    expect(outcome.usedManeuverPath).toBe(true)
    expect(outcome.weaponDamage).toBe(0)
    expect(outcome.expectedValue).toBe(3)
    expect(outcome.total).toBe(3)
  })

  it('EV3: stays with pure damage when manoeuvre plus EV does not exceed pure', () => {
    const rolls = [{ hits: 1, maneuver: 0 }, { hits: 0, maneuver: 1 }]
    const beating = resolveAttackDamageWithManeuverEv(rolls, sabre, 0, {}, {
      expectedValue: 1,
      minManeuvers: 1,
      requireMinDamage: true,
    })
    expect(beating.usedManeuverPath).toBe(true)
    expect(beating.total).toBe(2)

    const notBeating = resolveAttackDamageWithManeuverEv(rolls, sabre, 0, {}, {
      expectedValue: 0,
      minManeuvers: 1,
    })
    expect(notBeating.usedManeuverPath).toBe(false)
    expect(notBeating.total).toBe(1)
  })

  it('EV4: expected value is not reduced by RES', () => {
    const rolls = [
      { hits: 1, maneuver: 0 },
      { hits: 0, maneuver: 1 },
    ]
    const outcome = resolveAttackDamageWithManeuverEv(rolls, sabre, 5, {}, {
      expectedValue: 4,
      minManeuvers: 1,
      requireMinDamage: false,
    })
    expect(outcome.usedManeuverPath).toBe(true)
    expect(outcome.weaponDamage).toBe(0)
    expect(outcome.total).toBe(4)
  })

  it('EV5: accepts judgement symbol requirement instead of manoeuvres', () => {
    const rolls = [{ hits: 3, maneuver: 0 }]
    const outcome = resolveAttackDamageWithManeuverEv(rolls, sabre, 0, {}, {
      expectedValue: 5,
      minManeuvers: 0,
      minJudgements: 1,
      requireMinDamage: true,
    })
    expect(outcome.usedManeuverPath).toBe(true)
    expect(outcome.weaponDamage).toBe(1)
    expect(outcome.total).toBe(6)
  })

  it('EV6: once per turn limits EV to first qualifying attack', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = runMonteCarloSimulation(poolParams({
      attacker: abhothas,
      target: { stats: { mov: 3, agi: 5, mel: 6, mag: null, rng: null, res: 0 } },
      secondBasicAttack: true,
      simulationScope: 'combined',
      maneuverEv: {
        expectedValue: 4,
        minManeuvers: 0,
        minJudgements: 1,
        requireMinDamage: true,
        oncePerTurn: true,
      },
    }), 10)

    expect(result.distribution[9]).toBe(10)
    expect(result.composition[9].maneuverPct).toBeGreaterThan(0)
    expect(result.composition[9].attackPct).toBeGreaterThan(0)
  })

  it('EV7: tracks attack and manoeuvre composition at each total', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(3 / 6)
      .mockReturnValueOnce(5 / 6)
      .mockReturnValueOnce(5 / 6)

    const result = runMonteCarloSimulation(poolParams({
      attacker: abhothas,
      target: algarath,
      simulationScope: 'first',
      maneuverEv: {
        expectedValue: 3,
        minManeuvers: 1,
        requireMinDamage: false,
        oncePerTurn: false,
      },
    }), 1)

    expect(result.distribution[3]).toBe(1)
    expect(result.sumWeaponAt[3]).toBe(0)
    expect(result.sumManeuverAt[3]).toBe(3)
    expect(result.composition[3]).toEqual({ attackPct: 0, maneuverPct: 100 })
  })

  it('EV8: armour splits composition — weapon past RES plus manoeuvre EV', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(1 / 6)
      .mockReturnValueOnce(2 / 6)
      .mockReturnValueOnce(3 / 6)

    const result = runMonteCarloSimulation(poolParams({
      attacker: abhothas,
      target: { stats: { agi: 3, res: 1 } },
      simulationScope: 'first',
      maneuverEv: {
        expectedValue: 4,
        minManeuvers: 1,
        requireMinDamage: true,
        oncePerTurn: false,
      },
    }), 1)

    expect(result.distribution[5]).toBe(1)
    expect(result.sumWeaponAt[5]).toBe(1)
    expect(result.sumManeuverAt[5]).toBe(4)
    expect(result.composition[5]).toEqual({ attackPct: 20, maneuverPct: 80 })
  })

  it('EV9: J dice count toward manoeuvre cost while still contributing hit damage', () => {
    const rolls = [
      { hits: 3, maneuver: 0 },
      { hits: 3, maneuver: 0 },
      { hits: 0, maneuver: 0 },
    ]
    const summary = summarizeChosenDice(rolls)
    expect(maneuverSymbolCredit(rolls)).toBe(4)
    expect(meetsManeuverSymbolRequirements(rolls, { minManeuvers: 2 })).toBe(true)

    const outcome = resolveAttackDamageWithManeuverEv(rolls, sabre, 0, {}, {
      expectedValue: 4,
      minManeuvers: 2,
      requireMinDamage: true,
    })
    expect(outcome.usedManeuverPath).toBe(true)
    expect(outcome.weaponDamage).toBe(2)
    expect(outcome.total).toBe(6)
  })

  it('EV10: two judgements and a blank beats pure damage when manoeuvre EV is set', () => {
    const rolls = [
      { hits: 3, maneuver: 0 },
      { hits: 3, maneuver: 0 },
      { hits: 0, maneuver: 0 },
    ]
    const outcome = resolveAttackDamageWithManeuverEv(rolls, sabre, 0, {}, {
      expectedValue: 4,
      minManeuvers: 2,
      requireMinDamage: true,
    })
    expect(outcome.total).toBe(6)
    expect(outcome.weaponDamage).toBe(2)
    expect(outcome.expectedValue).toBe(4)
  })

  it('EV11: two judgements on manoeuvre path are solid before RES', () => {
    const rolls = [
      { hits: 3, maneuver: 0 },
      { hits: 3, maneuver: 0 },
      { hits: 0, maneuver: 0 },
    ]
    expect(resolveDamage(rolls, sabre, 0, {}, { maneuverPath: true })).toBe(2)
    const outcome = resolveAttackDamageWithManeuverEv(rolls, sabre, 1, {}, {
      expectedValue: 4,
      minManeuvers: 2,
      requireMinDamage: true,
    })
    expect(outcome.total).toBe(5)
    expect(outcome.weaponDamage).toBe(1)
    expect(outcome.expectedValue).toBe(4)
  })

  it('EV12: solid blow plus one manoeuvre symbol meets cost 2 for total 6', () => {
    const rolls = [
      { hits: 1, maneuver: 0 },
      { hits: 1, maneuver: 0 },
      { hits: 0, maneuver: 1 },
    ]
    expect(maneuverSymbolCredit(rolls)).toBe(3)

    const outcome = resolveAttackDamageWithManeuverEv(rolls, sabre, 0, {}, {
      expectedValue: 4,
      minManeuvers: 2,
      requireMinDamage: true,
    })
    expect(outcome.usedManeuverPath).toBe(true)
    expect(outcome.weaponDamage).toBe(2)
    expect(outcome.total).toBe(6)
  })

  it('EV13: two judgements plus manoeuvre face totals 6 (solid + EV)', () => {
    const rolls = [
      { hits: 3, maneuver: 0 },
      { hits: 3, maneuver: 0 },
      { hits: 0, maneuver: 1 },
    ]
    expect(maneuverSymbolCredit(rolls)).toBe(5)

    const outcome = resolveAttackDamageWithManeuverEv(rolls, sabre, 0, {}, {
      expectedValue: 4,
      minManeuvers: 2,
      minJudgements: 0,
      requireMinDamage: true,
    })
    expect(outcome.usedManeuverPath).toBe(true)
    expect(outcome.weaponDamage).toBe(2)
    expect(outcome.expectedValue).toBe(4)
    expect(outcome.total).toBe(6)
  })
})

describe('canMeetManeuverRequirements', () => {
  it('MV1: detects damage plus manoeuvre symbols on chosen dice', () => {
    const rolls = [
      { hits: 1, maneuver: 0 },
      { hits: 0, maneuver: 1 },
      { hits: 0, maneuver: 1 },
    ]
    expect(canMeetManeuverRequirements(rolls, sabre, 0, {}, {
      minDamage: 1,
      minManeuvers: 2,
      minJudgements: 0,
    })).toBe(true)
  })

  it('MV2: fails when damage requirement is not met', () => {
    const rolls = [
      { hits: 0, maneuver: 1 },
      { hits: 0, maneuver: 1 },
      { hits: 0, maneuver: 0 },
    ]
    expect(canMeetManeuverRequirements(rolls, sabre, 0, {}, {
      minDamage: 1,
      minManeuvers: 2,
      minJudgements: 0,
    })).toBe(false)
  })
})

describe('runManeuverSimulation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('MV3: seeded roll succeeds when J plus two manoeuvres are available', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(3 / 6)
      .mockReturnValueOnce(3 / 6)

    const result = runManeuverSimulation(poolParams({
      attacker: abhothas,
      target: algarath,
    }), { minDamage: 1, minManeuvers: 2, minJudgements: 0 }, 1)

    expect(result.probability).toBe(1)
  })
})

describe('runComparisonSimulation', () => {
  it('CMP1: returns one result per scenario', () => {
    const results = runComparisonSimulation(poolParams(), [
      { id: 'base', label: 'Base', modifiers: {} },
      { id: 'mel', label: '+1 MEL', modifiers: { melBonus: 1 } },
      { id: 'ap', label: 'AP(1)', modifiers: { armourPiercing: 1 } },
    ], 100)
    expect(results).toHaveLength(3)
    expect(results[1].poolSize).toBeGreaterThan(results[0].poolSize)
  })

  it('CMP2: armour piercing applies once per attack in combined simulations', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const results = runComparisonSimulation(poolParams({
      attacker: abhothas,
      target: skoll,
      secondBasicAttack: true,
      dualWieldAttack: true,
    }), [
      { id: 'base', label: 'Base', modifiers: {} },
      { id: 'ap', label: 'AP(1)', modifiers: { armourPiercing: 1 } },
    ], 1)

    expect(results[0].attackCount).toBe(4)
    const baseMax = Math.max(...Object.keys(results[0].distribution).map(Number))
    const apMax = Math.max(...Object.keys(results[1].distribution).map(Number))
    expect(apMax - baseMax).toBe(results[0].attackCount)
  })
})
