/** @typedef {{ hits: number, maneuver: number }} DieFace */

/** @type {DieFace[]} */
export const JUDGEMENT_DIE_FACES = [
  { hits: 3, maneuver: 0 },
  { hits: 1, maneuver: 0 },
  { hits: 1, maneuver: 0 },
  { hits: 0, maneuver: 1 },
  { hits: 0, maneuver: 0 },
  { hits: 0, maneuver: 0 },
]

/**
 * @param {number} poolSize
 * @returns {DieFace[]}
 */
export function rollDicePool(poolSize) {
  const rolls = []
  for (let i = 0; i < poolSize; i++) {
    const index = Math.floor(Math.random() * JUDGEMENT_DIE_FACES.length)
    rolls.push(JUDGEMENT_DIE_FACES[index])
  }
  return rolls
}

/**
 * Pick up to 3 dice that maximize hit symbols (damage-only optimization).
 * @param {DieFace[]} rolls
 * @returns {DieFace[]}
 */
export function chooseBestDiceForDamage(rolls) {
  const sorted = [...rolls].sort((a, b) => b.hits - a.hits)
  return sorted.slice(0, Math.min(3, sorted.length))
}

/**
 * @param {number} hitCount
 * @returns {'none' | 'glance' | 'solid' | 'crit'}
 */
export function hitsToTier(hitCount) {
  if (hitCount <= 0) return 'none'
  if (hitCount === 1) return 'glance'
  if (hitCount === 2) return 'solid'
  return 'crit'
}

/**
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {'none' | 'glance' | 'solid' | 'crit'} tier
 * @returns {number}
 */
export function weaponDamageForTier(weapon, tier) {
  switch (tier) {
    case 'glance': return weapon.glance
    case 'solid': return weapon.solid
    case 'crit': return weapon.crit
    default: return 0
  }
}

/**
 * @param {DieFace[]} chosen
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @returns {number}
 */
export function resolveDamage(chosen, weapon, targetRes) {
  const hitCount = chosen.reduce((sum, die) => sum + die.hits, 0)
  const tier = hitsToTier(hitCount)
  const raw = weaponDamageForTier(weapon, tier)
  return Math.max(0, raw - targetRes)
}

/**
 * @param {object} params
 * @param {{ stats: Record<string, number|null> }} params.attacker
 * @param {{ stats: Record<string, number|null> }} params.target
 * @param {{ type: string }} params.weapon
 * @param {boolean} params.charge
 * @param {boolean} params.followUpAttack
 * @param {boolean} params.cover
 * @returns {number}
 */
export function calculateDicePoolSize({
  attacker,
  target,
  weapon,
  charge,
  followUpAttack,
  cover,
}) {
  const statKey = weapon.type.toLowerCase()
  const attackStat = attacker.stats[statKey] ?? 0
  const targetAgi = target.stats.agi ?? 0

  let pool = attackStat <= targetAgi ? 1 : attackStat - targetAgi

  if (weapon.type === 'MEL' && charge && !followUpAttack) {
    pool += 2
  }

  if (followUpAttack) {
    pool -= 1
  }

  if (cover) {
    if (weapon.type === 'RNG') pool -= 2
    else if (weapon.type === 'MEL' || weapon.type === 'MAG') pool -= 1
  }

  return Math.max(1, pool)
}

/**
 * @param {object} params
 * @param {number} [params.iterations=1000]
 * @returns {{ poolSize: number, distribution: Record<number, number>, probabilities: Record<number, number> }}
 */
export function runMonteCarloSimulation(params, iterations = 1000) {
  const poolSize = calculateDicePoolSize(params)
  /** @type {Record<number, number>} */
  const distribution = {}

  for (let i = 0; i < iterations; i++) {
    const rolls = rollDicePool(poolSize)
    const chosen = chooseBestDiceForDamage(rolls)
    const damage = resolveDamage(chosen, params.weapon, params.target.stats.res ?? 0)
    distribution[damage] = (distribution[damage] ?? 0) + 1
  }

  /** @type {Record<number, number>} */
  const probabilities = {}
  for (const [damage, count] of Object.entries(distribution)) {
    probabilities[Number(damage)] = count / iterations
  }

  return { poolSize, distribution, probabilities }
}

/**
 * @param {Record<number, number>} distribution
 * @returns {number}
 */
export function averageDamage(distribution) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  return Object.entries(distribution).reduce(
    (sum, [damage, count]) => sum + Number(damage) * count,
    0,
  ) / total
}
