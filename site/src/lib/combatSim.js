/** @typedef {{ hits: number, maneuver: number }} DieFace */

/** @typedef {{
 *   melBonus?: number,
 *   magBonus?: number,
 *   rngBonus?: number,
 *   agiBonus?: number,
 *   resBonus?: number,
 *   armourPiercing?: number,
 *   damageBonus?: number,
 *   extraDice?: number,
 * }} SimModifiers */

/** @typedef {{
 *   kind: 'basic' | 'dualWield',
 *   index: number,
 *   chargeEligible: boolean,
 *   dualWieldPenalty: boolean,
 *   label: string,
 * }} AttackStep */

/** @typedef {{
 *   expectedValue?: number,
 *   minManeuvers?: number,
 *   minJudgements?: number,
 *   requireMinDamage?: boolean,
 *   oncePerTurn?: boolean,
 * }} ManeuverEvConfig */

/** @typedef {{
 *   weaponDamage: number,
 *   expectedValue: number,
 *   total: number,
 *   usedManeuverPath: boolean,
 * }} AttackDamageOutcome */

/** @type {DieFace[]} */
export const JUDGEMENT_DIE_FACES = [
  { hits: 3, maneuver: 0 },
  { hits: 1, maneuver: 0 },
  { hits: 1, maneuver: 0 },
  { hits: 0, maneuver: 1 },
  { hits: 0, maneuver: 0 },
  { hits: 0, maneuver: 0 },
]

export const EMPTY_MODIFIERS = {
  melBonus: 0,
  magBonus: 0,
  rngBonus: 0,
  agiBonus: 0,
  resBonus: 0,
  armourPiercing: 0,
  damageBonus: 0,
  extraDice: 0,
}

/**
 * @param {SimModifiers | null | undefined} modifiers
 * @returns {SimModifiers}
 */
export function normalizeModifiers(modifiers) {
  return { ...EMPTY_MODIFIERS, ...modifiers }
}

/**
 * @param {Record<string, number|null>} stats
 * @param {SimModifiers} modifiers
 * @returns {Record<string, number|null>}
 */
export function applyStatModifiers(stats, modifiers) {
  return {
    ...stats,
    mel: (stats.mel ?? 0) + modifiers.melBonus,
    mag: (stats.mag ?? 0) + modifiers.magBonus,
    rng: (stats.rng ?? 0) + modifiers.rngBonus,
    agi: (stats.agi ?? 0) + modifiers.agiBonus,
    res: (stats.res ?? 0) + modifiers.resBonus,
  }
}

/**
 * @returns {DieFace}
 */
export function rollSingleDie() {
  const index = Math.floor(Math.random() * JUDGEMENT_DIE_FACES.length)
  return JUDGEMENT_DIE_FACES[index]
}

/**
 * @param {number} poolSize
 * @returns {DieFace[]}
 */
export function rollDicePool(poolSize) {
  const rolls = []
  for (let i = 0; i < poolSize; i++) {
    rolls.push(rollSingleDie())
  }
  return rolls
}

/**
 * @param {DieFace[]} rolls
 * @param {number} chooseCount
 * @returns {DieFace[][]}
 */
export function enumerateDiceChoices(rolls, chooseCount) {
  const k = Math.min(chooseCount, rolls.length)
  if (k <= 0) return []

  /** @param {number} start @param {number} left @param {DieFace[]} picked */
  function build(start, left, picked) {
    if (left === 0) return [picked]
    /** @type {DieFace[][]} */
    const results = []
    for (let i = start; i <= rolls.length - left; i++) {
      results.push(...build(i + 1, left - 1, [...picked, rolls[i]]))
    }
    return results
  }

  return build(0, k, [])
}

/**
 * How many dice to consider selecting from a pool (rules: all dice if pool ≤ 3, else 1–3).
 * @param {number} poolSize
 * @returns {number[]}
 */
export function enumerationChoiceCounts(poolSize) {
  if (poolSize <= 0) return []
  if (poolSize <= 3) return [poolSize]
  return [1, 2, 3]
}

/**
 * @param {DieFace[]} rolls
 * @returns {DieFace[][]}
 */
export function enumerateAllDiceChoices(rolls) {
  /** @type {DieFace[][]} */
  const choices = []
  for (const k of enumerationChoiceCounts(rolls.length)) {
    choices.push(...enumerateDiceChoices(rolls, k))
  }
  return choices
}

/**
 * Manoeuvre-symbol credit on chosen dice for cost checks. M = 1, J = 2, strike hit
 * symbols = 1 each (same dice still contribute those hits to attack damage).
 * @param {DieFace[]} chosen
 * @returns {number}
 */
export function maneuverSymbolCredit(chosen) {
  const summary = summarizeChosenDice(chosen)
  const strikeHitSymbols = chosen.reduce(
    (acc, die) => acc + (die.hits >= 3 ? 0 : die.hits),
    0,
  )
  return summary.maneuvers + summary.judgements * 2 + strikeHitSymbols
}

/**
 * @param {DieFace[]} chosen
 * @param {ManeuverEvConfig} config
 * @returns {boolean}
 */
export function meetsManeuverEvSymbolRequirements(chosen, config) {
  const normalized = normalizeManeuverEvConfig(config)
  const summary = summarizeChosenDice(chosen)
  if (normalized.minManeuvers > 0 && maneuverSymbolCredit(chosen) < normalized.minManeuvers) {
    return false
  }
  if (normalized.minJudgements > 0 && summary.judgements < normalized.minJudgements) {
    return false
  }
  return normalized.minManeuvers > 0 || normalized.minJudgements > 0
}

/**
 * @param {DieFace[]} chosen
 * @param {{ minManeuvers?: number, minJudgements?: number }} requirements
 * @returns {boolean}
 */
export function meetsManeuverSymbolRequirements(chosen, requirements) {
  const summary = summarizeChosenDice(chosen)
  const minManeuvers = requirements.minManeuvers ?? 0
  const minJudgements = requirements.minJudgements ?? 0
  if (minManeuvers > 0 && maneuverSymbolCredit(chosen) < minManeuvers) return false
  if (minJudgements > 0 && summary.judgements < minJudgements) return false
  return minManeuvers > 0 || minJudgements > 0
}

/**
 * @param {DieFace[]} chosen
 * @returns {{ hits: number, maneuvers: number, judgements: number }}
 */
export function summarizeChosenDice(chosen) {
  return chosen.reduce(
    (acc, die) => ({
      hits: acc.hits + die.hits,
      maneuvers: acc.maneuvers + die.maneuver,
      judgements: acc.judgements + (die.hits >= 3 ? 1 : 0),
    }),
    { hits: 0, maneuvers: 0, judgements: 0 },
  )
}

/**
 * Pick up to 3 dice that maximize hit symbols (damage-only optimization).
 * @param {DieFace[]} rolls
 * @returns {DieFace[]}
 */
export function chooseBestDiceForDamage(rolls) {
  const choices = enumerateAllDiceChoices(rolls)
  if (choices.length === 0) return []

  let best = choices[0]
  let bestHits = -1
  for (const choice of choices) {
    const hits = summarizeChosenDice(choice).hits
    if (hits > bestHits) {
      bestHits = hits
      best = choice
    }
  }
  return best
}

export const EMPTY_MANEUVER_EV = {
  expectedValue: 0,
  minManeuvers: 0,
  minJudgements: 0,
  requireMinDamage: true,
  oncePerTurn: true,
}

/**
 * @param {ManeuverEvConfig | null | undefined} config
 * @returns {ManeuverEvConfig}
 */
export function normalizeManeuverEvConfig(config) {
  return { ...EMPTY_MANEUVER_EV, ...config }
}

/**
 * @param {ManeuverEvConfig} config
 * @returns {boolean}
 */
export function isManeuverEvActive(config) {
  const normalized = normalizeManeuverEvConfig(config)
  return normalized.expectedValue > 0
    && (normalized.minManeuvers > 0 || normalized.minJudgements > 0)
}

/**
 * Best dice choice that meets manoeuvre/J requirements and maximizes weapon damage + EV.
 * EV is flat (not reduced by RES); weapon damage is resolved normally.
 * @param {DieFace[]} rolls
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @param {SimModifiers} modifiers
 * @param {ManeuverEvConfig} config
 * @returns {AttackDamageOutcome | null}
 */
export function chooseBestManeuverEvOutcome(rolls, weapon, targetRes, modifiers, config) {
  const normalized = normalizeManeuverEvConfig(config)
  if (!isManeuverEvActive(normalized)) return null

  const minWeaponDamage = normalized.requireMinDamage ? 1 : 0
  const choices = enumerateAllDiceChoices(rolls)

  /** @type {AttackDamageOutcome | null} */
  let best = null

  for (const choice of choices) {
    const weaponDamage = resolveDamage(choice, weapon, targetRes, modifiers, { maneuverPath: true })
    if (weaponDamage < minWeaponDamage) continue
    if (!meetsManeuverEvSymbolRequirements(choice, normalized)) continue

    const total = weaponDamage + normalized.expectedValue
    if (!best || total > best.total || (total === best.total && weaponDamage > best.weaponDamage)) {
      best = {
        weaponDamage,
        expectedValue: normalized.expectedValue,
        total,
        usedManeuverPath: true,
      }
    }
  }

  return best
}

/**
 * @param {DieFace[]} rolls
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @param {SimModifiers} modifiers
 * @returns {AttackDamageOutcome}
 */
export function choosePureDamageOutcome(rolls, weapon, targetRes, modifiers) {
  const chosen = chooseBestDiceForDamage(rolls)
  const weaponDamage = resolveDamage(chosen, weapon, targetRes, modifiers)
  return {
    weaponDamage,
    expectedValue: 0,
    total: weaponDamage,
    usedManeuverPath: false,
  }
}

/**
 * Pick pure damage unless manoeuvre+EV strictly beats it (ties stay pure).
 * @param {DieFace[]} rolls
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @param {SimModifiers} modifiers
 * @param {ManeuverEvConfig} config
 * @param {boolean} [canUseManeuverEv=true]
 * @returns {AttackDamageOutcome}
 */
export function resolveAttackDamageWithManeuverEv(
  rolls,
  weapon,
  targetRes,
  modifiers,
  config,
  canUseManeuverEv = true,
) {
  const pure = choosePureDamageOutcome(rolls, weapon, targetRes, modifiers)
  if (!canUseManeuverEv || !isManeuverEvActive(config)) {
    return pure
  }

  const maneuver = chooseBestManeuverEvOutcome(rolls, weapon, targetRes, modifiers, config)
  if (!maneuver || maneuver.total <= pure.total) {
    return pure
  }

  return maneuver
}

/**
 * @param {DieFace[]} rolls
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @param {SimModifiers} modifiers
 * @returns {number}
 */
export function maxDamageFromRolls(rolls, weapon, targetRes, modifiers) {
  const chosen = chooseBestDiceForDamage(rolls)
  return resolveDamage(chosen, weapon, targetRes, modifiers)
}

/**
 * @param {DieFace[]} rolls
 * @param {boolean} reroll
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @param {SimModifiers} modifiers
 * @returns {DieFace[]}
 */
export function applyOptionalRerollForDamage(rolls, reroll, weapon, targetRes, modifiers) {
  if (!reroll || rolls.length === 0) return rolls

  let bestRolls = rolls
  let bestDamage = maxDamageFromRolls(rolls, weapon, targetRes, modifiers)

  for (let i = 0; i < rolls.length; i++) {
    const candidate = [...rolls]
    candidate[i] = rollSingleDie()
    const damage = maxDamageFromRolls(candidate, weapon, targetRes, modifiers)
    if (damage > bestDamage) {
      bestDamage = damage
      bestRolls = candidate
    }
  }

  return bestRolls
}

/**
 * @param {DieFace[]} rolls
 * @param {boolean} reroll
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @param {SimModifiers} modifiers
 * @param {{ minDamage?: number, minManeuvers?: number, minJudgements?: number }} requirements
 * @returns {DieFace[]}
 */
export function applyOptionalRerollForManeuvers(
  rolls,
  reroll,
  weapon,
  targetRes,
  modifiers,
  requirements,
) {
  if (!reroll || rolls.length === 0) return rolls

  let bestRolls = rolls
  let best = canMeetManeuverRequirements(rolls, weapon, targetRes, modifiers, requirements)

  for (let i = 0; i < rolls.length; i++) {
    const candidate = [...rolls]
    candidate[i] = rollSingleDie()
    const success = canMeetManeuverRequirements(
      candidate,
      weapon,
      targetRes,
      modifiers,
      requirements,
    )
    if (success && !best) {
      best = true
      bestRolls = candidate
    }
  }

  return bestRolls
}

/**
 * @param {DieFace[]} rolls
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @param {SimModifiers} modifiers
 * @param {{ minDamage?: number, minManeuvers?: number, minJudgements?: number }} requirements
 * @returns {boolean}
 */
export function canMeetManeuverRequirements(
  rolls,
  weapon,
  targetRes,
  modifiers,
  requirements,
) {
  const minDamage = requirements.minDamage ?? 1
  const choices = enumerateAllDiceChoices(rolls)

  for (const choice of choices) {
    const damage = resolveDamage(choice, weapon, targetRes, modifiers, { maneuverPath: true })
    if (
      damage >= minDamage
      && meetsManeuverSymbolRequirements(choice, requirements)
    ) {
      return true
    }
  }

  return false
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
 * Hit symbols used for glance/solid/crit tier. On the manoeuvre+EV path each J
 * contributes 1 hit (solid for JJ) while still paying manoeuvre/J symbol cost.
 * @param {DieFace[]} chosen
 * @param {boolean} [maneuverPath=false]
 * @returns {number}
 */
export function hitSymbolsForDamageTier(chosen, maneuverPath = false) {
  if (!maneuverPath) {
    return summarizeChosenDice(chosen).hits
  }
  return chosen.reduce(
    (acc, die) => acc + (die.hits >= 3 ? 1 : die.hits),
    0,
  )
}

/**
 * @param {DieFace[]} chosen
 * @param {{ glance: number, solid: number, crit: number }} weapon
 * @param {number} targetRes
 * @param {SimModifiers} [modifiers]
 * @param {{ maneuverPath?: boolean }} [options]
 * @returns {number}
 */
export function resolveDamage(
  chosen,
  weapon,
  targetRes,
  modifiers = EMPTY_MODIFIERS,
  options = {},
) {
  const hitCount = hitSymbolsForDamageTier(chosen, options.maneuverPath ?? false)
  const tier = hitsToTier(hitCount)
  const raw = weaponDamageForTier(weapon, tier)
  const effectiveRes = Math.max(0, targetRes - (modifiers.armourPiercing ?? 0))
  const base = Math.max(0, raw - effectiveRes)
  return base + (modifiers.damageBonus ?? 0)
}

/**
 * @param {object} params
 * @param {boolean} [params.chargeEligible]
 * @param {boolean} [params.dualWieldPenalty]
 * @param {number} [params.miscDiceModifier]
 * @returns {number}
 */
export function calculateDicePoolSize({
  attacker,
  target,
  weapon,
  charge,
  chargeEligible = true,
  dualWieldPenalty = false,
  miscDiceModifier = 0,
  cover,
  modifiers = EMPTY_MODIFIERS,
}) {
  const adjustedAttacker = applyStatModifiers(attacker.stats, normalizeModifiers(modifiers))
  const statKey = weapon.type.toLowerCase()
  const attackStat = adjustedAttacker[statKey] ?? 0
  const targetAgi = target.stats.agi ?? 0

  let pool = attackStat <= targetAgi ? 1 : attackStat - targetAgi

  if (weapon.type === 'MEL' && charge && chargeEligible && !dualWieldPenalty) {
    pool += 2
  }

  if (dualWieldPenalty) {
    pool -= 1
  }

  if (cover) {
    if (weapon.type === 'RNG') pool -= 2
    else if (weapon.type === 'MEL' || weapon.type === 'MAG') pool -= 1
  }

  pool += modifiers.extraDice ?? 0
  pool += miscDiceModifier ?? 0

  return Math.max(1, pool)
}

/**
 * @param {object} params
 * @param {boolean} [params.secondBasicAttack]
 * @param {boolean} [params.thirdBasicAttack]
 * @param {boolean} [params.dualWieldAttack]
 * @returns {AttackStep[]}
 */
export function buildAttackSequence({
  secondBasicAttack = false,
  thirdBasicAttack = false,
  dualWieldAttack = false,
}) {
  /** @type {AttackStep[]} */
  const sequence = []

  /** @param {number} index @param {boolean} chargeEligible @param {string} label */
  function addBasicAttack(index, chargeEligible, label) {
    sequence.push({
      kind: 'basic',
      index,
      chargeEligible,
      dualWieldPenalty: false,
      label,
    })
    if (dualWieldAttack) {
      sequence.push({
        kind: 'dualWield',
        index,
        chargeEligible: false,
        dualWieldPenalty: true,
        label: `Dual Wield (${label})`,
      })
    }
  }

  addBasicAttack(0, true, '1st basic')
  if (secondBasicAttack) addBasicAttack(1, false, '2nd basic')
  if (thirdBasicAttack) addBasicAttack(2, false, '3rd basic')

  return sequence
}

/**
 * @param {'combined' | 'first' | 'second' | 'third' | 'dualWield'} simulationScope
 * @param {AttackStep[]} attackSequence
 * @returns {AttackStep[]}
 */
export function resolveSimulationScope(simulationScope, attackSequence) {
  if (simulationScope === 'combined') return attackSequence

  const pick = (labelMatch) => attackSequence.find(step =>
    simulationScope === 'dualWield'
      ? step.kind === 'dualWield'
      : step.kind === 'basic' && step.index === labelMatch,
  )

  if (simulationScope === 'first') {
    return attackSequence.filter(step => step.kind === 'basic' && step.index === 0).slice(0, 1)
  }
  if (simulationScope === 'second') {
    const step = pick(1)
    return step ? [step] : []
  }
  if (simulationScope === 'third') {
    const step = pick(2)
    return step ? [step] : []
  }
  if (simulationScope === 'dualWield') {
    return attackSequence.filter(s => s.kind === 'dualWield')
  }

  return attackSequence
}

/**
 * @param {object} params
 * @param {AttackStep} attackStep
 * @returns {number}
 */
export function rollSingleAttackDamage(params, attackStep, maneuverEvConfig = EMPTY_MANEUVER_EV, canUseManeuverEv = true) {
  const modifiers = normalizeModifiers(params.modifiers)
  const poolSize = calculateDicePoolSize({
    ...params,
    chargeEligible: attackStep.chargeEligible,
    dualWieldPenalty: attackStep.dualWieldPenalty,
    modifiers,
  })
  const rolls = rollDicePool(poolSize)
  return resolveAttackDamageWithManeuverEv(
    rolls,
    params.weapon,
    params.target.stats.res ?? 0,
    modifiers,
    maneuverEvConfig,
    canUseManeuverEv,
  )
}

/**
 * @param {object} params
 * @param {number} [iterations=1000]
 */
export function runMonteCarloSimulation(params, iterations = 1000) {
  const modifiers = normalizeModifiers(params.modifiers)
  const maneuverEvConfig = normalizeManeuverEvConfig(params.maneuverEv)
  const fullSequence = buildAttackSequence(params)
  const attackSequence = resolveSimulationScope(params.simulationScope ?? 'combined', fullSequence)
  const poolSize = attackSequence.length
    ? calculateDicePoolSize({
      ...params,
      chargeEligible: attackSequence[0].chargeEligible,
      dualWieldPenalty: attackSequence[0].dualWieldPenalty,
      modifiers,
    })
    : 0
  /** @type {Record<number, number>} */
  const distribution = {}
  /** @type {Record<number, number>} */
  const sumWeaponAt = {}
  /** @type {Record<number, number>} */
  const sumManeuverAt = {}

  for (let i = 0; i < iterations; i++) {
    let totalWeapon = 0
    let totalManeuver = 0
    let usedEvThisTurn = false
    for (const attackStep of attackSequence) {
      const oncePerTurn = maneuverEvConfig.oncePerTurn
      const canUseManeuverEv = !oncePerTurn || !usedEvThisTurn
      const outcome = rollSingleAttackDamage(
        { ...params, modifiers },
        attackStep,
        maneuverEvConfig,
        canUseManeuverEv,
      )
      if (outcome.usedManeuverPath) {
        usedEvThisTurn = true
      }
      totalWeapon += outcome.weaponDamage
      totalManeuver += outcome.expectedValue
    }
    const totalDamage = totalWeapon + totalManeuver
    distribution[totalDamage] = (distribution[totalDamage] ?? 0) + 1
    sumWeaponAt[totalDamage] = (sumWeaponAt[totalDamage] ?? 0) + totalWeapon
    sumManeuverAt[totalDamage] = (sumManeuverAt[totalDamage] ?? 0) + totalManeuver
  }

  return finalizeSimulationResult({
    poolSize,
    attackSequence,
    params: { ...params, modifiers },
    distribution,
    sumWeaponAt,
    sumManeuverAt,
    iterations,
  })
}

/**
 * @param {object} params
 * @param {Array<{ id: string, label: string, modifiers: SimModifiers }>} scenarios
 * @param {number} [iterations=1000]
 */
export function runComparisonSimulation(params, scenarios, iterations = 1000) {
  return scenarios.map(scenario => ({
    id: scenario.id,
    label: scenario.label,
    ...runMonteCarloSimulation({ ...params, modifiers: scenario.modifiers }, iterations),
  }))
}

/**
 * @param {object} params
 * @param {{ minDamage?: number, minManeuvers?: number, minJudgements?: number, attackIndex?: number }} requirements
 * @param {number} [iterations=1000]
 */
export function runManeuverSimulation(params, requirements, iterations = 1000) {
  const modifiers = normalizeModifiers(params.modifiers)
  const fullSequence = buildAttackSequence(params)
  const attackIndex = requirements.attackIndex ?? 0
  const attackStep = fullSequence.find(step =>
    step.kind === 'basic' && step.index === attackIndex,
  ) ?? fullSequence.find(step => step.kind === 'dualWield')
    ?? fullSequence[0]

  if (!attackStep) {
    return {
      poolSize: 0,
      attackIndex,
      iterations,
      successes: 0,
      probability: 0,
      requirements: {
        minDamage: requirements.minDamage ?? 1,
        minManeuvers: requirements.minManeuvers ?? 0,
        minJudgements: requirements.minJudgements ?? 0,
      },
    }
  }

  const poolSize = calculateDicePoolSize({
    ...params,
    chargeEligible: attackStep.chargeEligible,
    dualWieldPenalty: attackStep.dualWieldPenalty,
    modifiers,
  })
  let successes = 0
  const maneuverRequirements = {
    minDamage: requirements.minDamage ?? 1,
    minManeuvers: requirements.minManeuvers ?? 0,
    minJudgements: requirements.minJudgements ?? 0,
  }

  for (let i = 0; i < iterations; i++) {
    const rolls = rollDicePool(poolSize)
    if (canMeetManeuverRequirements(
      rolls,
      params.weapon,
      params.target.stats.res ?? 0,
      modifiers,
      maneuverRequirements,
    )) {
      successes++
    }
  }

  return {
    poolSize,
    attackIndex,
    attackStep: attackStep.label,
    iterations,
    successes,
    probability: successes / iterations,
    requirements: maneuverRequirements,
  }
}

/**
 * @param {object} input
 * @returns {object}
 */
/**
 * @param {number} count
 * @param {number} totalDamage
 * @param {number} sumWeapon
 * @param {number} sumManeuver
 * @returns {{ attackPct: number, maneuverPct: number }}
 */
export function damageCompositionAtBucket(count, totalDamage, sumWeapon, sumManeuver) {
  const damagePoints = count * totalDamage
  if (count <= 0 || damagePoints <= 0) {
    return { attackPct: 100, maneuverPct: 0 }
  }
  return {
    attackPct: (sumWeapon / damagePoints) * 100,
    maneuverPct: (sumManeuver / damagePoints) * 100,
  }
}

function finalizeSimulationResult({
  poolSize,
  attackSequence,
  params,
  distribution,
  sumWeaponAt = {},
  sumManeuverAt = {},
  iterations,
}) {
  /** @type {Record<number, number>} */
  const probabilities = {}
  /** @type {Record<number, { attackPct: number, maneuverPct: number }>} */
  const composition = {}

  for (const [damage, count] of Object.entries(distribution)) {
    const d = Number(damage)
    probabilities[d] = count / iterations
    composition[d] = damageCompositionAtBucket(
      count,
      d,
      sumWeaponAt[d] ?? 0,
      sumManeuverAt[d] ?? 0,
    )
  }

  return {
    poolSize,
    attackCount: attackSequence.length,
    attackPools: attackSequence.map(step =>
      calculateDicePoolSize({
        ...params,
        chargeEligible: step.chargeEligible,
        dualWieldPenalty: step.dualWieldPenalty,
      }),
    ),
    attackLabels: attackSequence.map(step => step.label),
    distribution,
    sumWeaponAt,
    sumManeuverAt,
    composition,
    probabilities,
    cumulativeProbabilities: cumulativeProbabilities(probabilities),
  }
}

/**
 * @param {Record<number, number>} probabilities
 * @returns {Record<number, number>}
 */
export function cumulativeProbabilities(probabilities) {
  const damages = Object.keys(probabilities).map(Number).sort((a, b) => a - b)
  /** @type {Record<number, number>} */
  const cumulative = {}
  let running = 0
  for (let i = damages.length - 1; i >= 0; i--) {
    running += probabilities[damages[i]] ?? 0
    cumulative[damages[i]] = running
  }
  return cumulative
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

/**
 * @param {Array<{ distribution: Record<number, number>, probabilities: Record<number, number>, cumulativeProbabilities: Record<number, number> }>} results
 */
export function mergeComparisonDistributions(results) {
  const damageValues = new Set()
  for (const result of results) {
    for (const damage of Object.keys(result.distribution)) {
      damageValues.add(Number(damage))
    }
  }

  return [...damageValues].sort((a, b) => a - b).map(damage => ({
    damage,
    series: results.map(result => {
      const count = result.distribution[damage] ?? 0
      const comp = result.composition?.[damage]
        ?? damageCompositionAtBucket(
          count,
          damage,
          result.sumWeaponAt?.[damage] ?? 0,
          result.sumManeuverAt?.[damage] ?? 0,
        )
      return {
        count,
        attackPct: comp.attackPct,
        maneuverPct: comp.maneuverPct,
        probability: result.probabilities[damage] ?? 0,
        cumulative: result.cumulativeProbabilities[damage] ?? 0,
      }
    }),
  }))
}

/**
 * @param {{ effects: SimModifiers }} artefact
 * @returns {SimModifiers}
 */
export function modifiersFromArtefact(artefact) {
  if (!artefact?.effects) return { ...EMPTY_MODIFIERS }
  return normalizeModifiers({
    melBonus: artefact.effects.melBonus,
    magBonus: artefact.effects.magBonus,
    rngBonus: artefact.effects.rngBonus,
    agiBonus: artefact.effects.agiBonus,
    resBonus: artefact.effects.resBonus,
    armourPiercing: artefact.effects.armourPiercing,
    damageBonus: artefact.effects.damageBonus,
    extraDice: artefact.effects.extraDice,
  })
}

/**
 * @param {AttackStep[]} attackSequence
 * @returns {boolean}
 */
export function isSingleAttackSimulation(attackSequence) {
  return attackSequence.length === 1
}
