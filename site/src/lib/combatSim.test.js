import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  JUDGEMENT_DIE_FACES,
  averageDamage,
  calculateDicePoolSize,
  chooseBestDiceForDamage,
  hitsToTier,
  resolveDamage,
  rollDicePool,
  runMonteCarloSimulation,
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
    followUpAttack: false,
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

  it('maps tiers to weapon profile values', () => {
    expect(weaponDamageForTier(sabre, 'glance')).toBe(1)
    expect(weaponDamageForTier(sabre, 'solid')).toBe(2)
    expect(weaponDamageForTier(sabre, 'crit')).toBe(4)
    expect(weaponDamageForTier(sabre, 'none')).toBe(0)
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

  it('P4: follow-up attack subtracts one die and suppresses charge', () => {
    expect(calculateDicePoolSize(poolParams({ followUpAttack: true }))).toBe(2)
    expect(calculateDicePoolSize(poolParams({ charge: true, followUpAttack: true }))).toBe(2)
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
      followUpAttack: true,
      cover: true,
      attacker: { stats: { mel: 3, agi: 5 } },
      target: { stats: { agi: 10, res: 0 } },
    }))).toBe(1)
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
    }), 100)
    expect(rollDicePool(1)).toEqual([{ hits: 3, maneuver: 0 }])
    expect(result.distribution[3]).toBe(100)
    expect(averageDamage(result.distribution)).toBe(3)
  })
})
