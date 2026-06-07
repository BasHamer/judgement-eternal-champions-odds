<script setup>
import { computed, ref, watch } from 'vue'
import combatantData from '../data/combatants.json'
import artefactData from '../data/artefacts.json'
import {
  averageDamage,
  buildAttackSequence,
  calculateDicePoolSize,
  mergeComparisonDistributions,
  modifiersFromArtefact,
  resolveSimulationScope,
  runComparisonSimulation,
  runManeuverSimulation,
  runMonteCarloSimulation,
} from '../lib/combatSim.js'

const SIM_ITERATIONS = 1000

const STAT_LABELS = [
  { key: 'mov', label: 'MOV' },
  { key: 'agi', label: 'AGI' },
  { key: 'mel', label: 'MEL' },
  { key: 'mag', label: 'MAG' },
  { key: 'rng', label: 'RNG' },
  { key: 'res', label: 'RES' },
]

const COMPARISON_COLORS = ['primary', 'success', 'warning']

const combatants = combatantData.combatants
const artefacts = artefactData.artefacts
const compareCandidates = artefacts.filter(a => a.hasSimEffects)

const attackerId = ref(combatants[0]?.id ?? '')
const targetId = ref(combatants.find(c => c.id !== combatants[0]?.id)?.id ?? '')
const weaponName = ref('')
const charge = ref(false)
const secondBasicAttack = ref(false)
const thirdBasicAttack = ref(false)
const dualWieldAttack = ref(false)
const miscDiceModifier = ref(0)
const simulationScope = ref('combined')
const tryAgainReroll = ref(false)
const cover = ref(false)
const equippedArtefactId = ref(null)
const comparisonMode = ref(false)
const compareArtefactBId = ref('vorpal-blade')
const compareArtefactCId = ref('armour-shredder')
const minManeuvers = ref(0)
const minJudgements = ref(0)
const maneuverAttackIndex = ref(0)

/** @type {import('vue').Ref<Record<string, number | string | null>>} */
const attackerStats = ref({})
/** @type {import('vue').Ref<Record<string, number | string | null>>} */
const targetStats = ref({})

const attackerBase = computed(() => combatants.find(c => c.id === attackerId.value))
const targetBase = computed(() => combatants.find(c => c.id === targetId.value))
const attackerIsHero = computed(() => attackerBase.value?.kind === 'hero')
const attackerHasDualWield = computed(() => Boolean(attackerBase.value?.dualWield))

function cloneStatsForEdit(stats) {
  return Object.fromEntries(
    STAT_LABELS.map(({ key }) => [key, stats?.[key] ?? '']),
  )
}

function statsForSim(edited) {
  /** @type {Record<string, number|null>} */
  const result = {}
  for (const { key } of STAT_LABELS) {
    const raw = edited[key]
    if (raw === '' || raw == null) {
      result[key] = key === 'res' ? 0 : null
    } else {
      result[key] = Number(raw)
    }
  }
  return result
}

function buildCombatant(base, editedStats) {
  if (!base) return null
  return { ...base, stats: statsForSim(editedStats) }
}

watch(attackerBase, (next) => {
  attackerStats.value = cloneStatsForEdit(next?.stats)
}, { immediate: true })

watch(targetBase, (next) => {
  targetStats.value = cloneStatsForEdit(next?.stats)
}, { immediate: true })

const attacker = computed(() => buildCombatant(attackerBase.value, attackerStats.value))
const target = computed(() => buildCombatant(targetBase.value, targetStats.value))

const attackerWeapons = computed(() => attackerBase.value?.weapons ?? [])

watch(attackerBase, (next) => {
  if (!next?.weapons.length) {
    weaponName.value = ''
    return
  }
  if (!next.weapons.some(w => w.name === weaponName.value)) {
    weaponName.value = next.weapons[0].name
  }
}, { immediate: true })

watch(attackerBase, (next) => {
  if (!next?.dualWield) dualWieldAttack.value = false
}, { immediate: true })

watch(thirdBasicAttack, (enabled) => {
  if (enabled) secondBasicAttack.value = true
})

watch(secondBasicAttack, (enabled) => {
  if (!enabled) thirdBasicAttack.value = false
})

watch([secondBasicAttack, thirdBasicAttack], () => {
  if (maneuverAttackIndex.value > 0 && !secondBasicAttack.value) {
    maneuverAttackIndex.value = 0
  }
  if (maneuverAttackIndex.value > 1 && !thirdBasicAttack.value) {
    maneuverAttackIndex.value = Math.min(maneuverAttackIndex.value, secondBasicAttack.value ? 1 : 0)
  }
})

watch(simulationScope, (scope) => {
  if (scope === 'combined') tryAgainReroll.value = false
})

const selectedWeapon = computed(() =>
  attackerWeapons.value.find(w => w.name === weaponName.value) ?? null,
)

const equippedArtefact = computed(() =>
  artefacts.find(a => a.id === equippedArtefactId.value) ?? null,
)

const equippedModifiers = computed(() =>
  equippedArtefact.value ? modifiersFromArtefact(equippedArtefact.value) : {},
)

const simParams = computed(() => {
  if (!attacker.value || !target.value || !selectedWeapon.value) return null
  return {
    attacker: attacker.value,
    target: target.value,
    weapon: selectedWeapon.value,
    charge: charge.value,
    secondBasicAttack: secondBasicAttack.value,
    thirdBasicAttack: thirdBasicAttack.value,
    dualWieldAttack: dualWieldAttack.value,
    miscDiceModifier: Number(miscDiceModifier.value) || 0,
    simulationScope: simulationScope.value,
    tryAgainReroll: tryAgainReroll.value,
    cover: cover.value,
    modifiers: equippedModifiers.value,
  }
})

const fullAttackSequence = computed(() =>
  simParams.value ? buildAttackSequence(simParams.value) : [],
)

const effectiveAttackSequence = computed(() =>
  simParams.value
    ? resolveSimulationScope(simulationScope.value, fullAttackSequence.value)
    : [],
)

const canUseReroll = computed(() =>
  simulationScope.value !== 'combined' && effectiveAttackSequence.value.length === 1,
)

const simulationScopeOptions = computed(() => {
  const options = [
    { value: 'combined', title: 'Combined (sum all selected attacks)' },
    { value: 'first', title: '1st basic attack only' },
  ]
  if (attackerIsHero.value) {
    options.push({ value: 'second', title: '2nd basic attack only' })
    options.push({ value: 'third', title: '3rd basic attack only' })
  }
  if (attackerHasDualWield.value) {
    options.push({ value: 'dualWield', title: 'All Dual Wield attacks only (−1 die each)' })
  }
  return options
})

const attackOptions = computed(() => {
  const options = [{ value: 0, title: '1st basic attack' }]
  if (attackerIsHero.value) {
    options.push({ value: 1, title: '2nd basic attack' })
    options.push({ value: 2, title: '3rd basic attack' })
  }
  return options
})

const attackPoolLabels = computed(() =>
  effectiveAttackSequence.value.map(step => ({
    label: step.label,
    pool: calculateDicePoolSize({
      ...simParams.value,
      chargeEligible: step.chargeEligible,
      dualWieldPenalty: step.dualWieldPenalty,
    }),
  })),
)

const comparisonBaseParams = computed(() => {
  if (!simParams.value) return null
  const { modifiers: _ignored, ...rest } = simParams.value
  return rest
})

const comparisonScenarios = computed(() => {
  const artefactB = compareCandidates.find(a => a.id === compareArtefactBId.value)
  const artefactC = compareCandidates.find(a => a.id === compareArtefactCId.value)
  return [
    { id: 'base', label: 'No artefact', modifiers: {} },
    {
      id: artefactB?.id ?? 'compare-b',
      label: artefactB?.name ?? 'Compare B',
      modifiers: artefactB ? modifiersFromArtefact(artefactB) : {},
    },
    {
      id: artefactC?.id ?? 'compare-c',
      label: artefactC?.name ?? 'Compare C',
      modifiers: artefactC ? modifiersFromArtefact(artefactC) : {},
    },
  ]
})

const comparisonResults = computed(() => {
  if (!comparisonMode.value || !comparisonBaseParams.value) return []
  return runComparisonSimulation(comparisonBaseParams.value, comparisonScenarios.value, SIM_ITERATIONS)
})

const comparisonSummary = computed(() =>
  comparisonResults.value.map((result, index) => {
    const meanTotal = averageDamage(result.distribution)
    const attackCount = result.attackCount || 1
    return {
      id: result.id,
      label: comparisonScenarios.value[index]?.label ?? result.label,
      color: COMPARISON_COLORS[index],
      meanTotal,
      averagePerAttack: meanTotal / attackCount,
    }
  }),
)

const simulation = computed(() => {
  if (!simParams.value) {
    return {
      distribution: {},
      probabilities: {},
      cumulativeProbabilities: {},
      average: 0,
      attackCount: 0,
      attackPools: [],
    }
  }
  if (comparisonMode.value) {
    const primary = comparisonResults.value[0]
    return primary
      ? { ...primary, average: averageDamage(primary.distribution) }
      : {
        distribution: {},
        probabilities: {},
        cumulativeProbabilities: {},
        average: 0,
        attackCount: 0,
        attackPools: [],
      }
  }
  const result = runMonteCarloSimulation(simParams.value, SIM_ITERATIONS)
  return { ...result, average: averageDamage(result.distribution) }
})

const chartRows = computed(() => {
  if (comparisonMode.value && comparisonResults.value.length) {
    return mergeComparisonDistributions(comparisonResults.value).map(row => ({
      damage: row.damage,
      series: row.series.map((entry, index) => ({
        ...entry,
        label: comparisonScenarios.value[index]?.label ?? `Series ${index + 1}`,
        color: COMPARISON_COLORS[index],
      })),
    }))
  }

  return Object.entries(simulation.value.distribution)
    .map(([damage, count]) => ({
      damage: Number(damage),
      series: [{
        count: Number(count),
        probability: simulation.value.probabilities[Number(damage)] ?? 0,
        cumulative: simulation.value.cumulativeProbabilities[Number(damage)] ?? 0,
        label: 'Damage',
        color: 'primary',
      }],
    }))
    .sort((a, b) => a.damage - b.damage)
})

const maxBarCount = computed(() => {
  let max = 1
  for (const row of chartRows.value) {
    for (const entry of row.series) {
      max = Math.max(max, entry.count)
    }
  }
  return max
})

const maneuverResult = computed(() => {
  if (!simParams.value) {
    return { probability: 0, poolSize: 0, requirements: { minDamage: 1, minManeuvers: 0, minJudgements: 0 } }
  }
  return runManeuverSimulation(simParams.value, {
    minDamage: 1,
    minManeuvers: minManeuvers.value,
    minJudgements: minJudgements.value,
    attackIndex: maneuverAttackIndex.value,
  }, SIM_ITERATIONS)
})

const combatantLabel = (c) => `${c.name} (${c.kind})`

function resetAttackerStats() {
  attackerStats.value = cloneStatsForEdit(attackerBase.value?.stats)
}

function resetTargetStats() {
  targetStats.value = cloneStatsForEdit(targetBase.value?.stats)
}
</script>

<template>
  <v-container max-width="960">
    <v-card title="Attack Damage Simulator">
      <v-card-subtitle>
        Monte Carlo simulation ({{ SIM_ITERATIONS }} rolls) — combined basic attack damage
      </v-card-subtitle>

      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="attackerId"
              :items="combatants"
              item-title="name"
              item-value="id"
              label="Attacker"
              clearable
              auto-select-first
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.kind" />
              </template>
              <template #selection="{ item }">
                {{ combatantLabel(item.raw) }}
              </template>
            </v-autocomplete>
          </v-col>

          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="targetId"
              :items="combatants"
              item-title="name"
              item-value="id"
              label="Target"
              clearable
              auto-select-first
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.kind" />
              </template>
              <template #selection="{ item }">
                {{ combatantLabel(item.raw) }}
              </template>
            </v-autocomplete>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="outlined" density="compact">
              <v-card-title class="d-flex align-center text-subtitle-1">
                Attacker profile
                <v-spacer />
                <v-btn size="x-small" variant="text" @click="resetAttackerStats">
                  Reset
                </v-btn>
              </v-card-title>
              <v-card-text v-if="attackerBase">
                <p class="text-body-2 mb-2">
                  {{ attackerBase.name }} · {{ attackerBase.kind }}
                </p>
                <v-row dense>
                  <v-col
                    v-for="stat in STAT_LABELS"
                    :key="`att-${stat.key}`"
                    cols="4"
                  >
                    <v-text-field
                      v-model="attackerStats[stat.key]"
                      :label="stat.label"
                      type="number"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="outlined" density="compact">
              <v-card-title class="d-flex align-center text-subtitle-1">
                Target profile
                <v-spacer />
                <v-btn size="x-small" variant="text" @click="resetTargetStats">
                  Reset
                </v-btn>
              </v-card-title>
              <v-card-text v-if="targetBase">
                <p class="text-body-2 mb-2">
                  {{ targetBase.name }} · {{ targetBase.kind }}
                </p>
                <v-row dense>
                  <v-col
                    v-for="stat in STAT_LABELS"
                    :key="`tgt-${stat.key}`"
                    cols="4"
                  >
                    <v-text-field
                      v-model="targetStats[stat.key]"
                      :label="stat.label"
                      type="number"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="weaponName"
              :items="attackerWeapons"
              item-title="name"
              item-value="name"
              label="Weapon"
              :disabled="!attackerWeapons.length"
              auto-select-first
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="equippedArtefactId"
              :items="artefacts"
              item-title="name"
              item-value="id"
              label="Equipped offensive artefact (optional)"
              clearable
            />
          </v-col>

          <v-col cols="12">
            <v-checkbox
              v-model="charge"
              label="Charge (+2 dice, 1st basic attack only)"
              hide-details
              :disabled="selectedWeapon?.type !== 'MEL' || simulationScope !== 'combined' && simulationScope !== 'first'"
            />
            <template v-if="attackerIsHero">
              <v-checkbox
                v-model="secondBasicAttack"
                label="Second basic attack (no charge bonus)"
                hide-details
                :disabled="simulationScope !== 'combined'"
              />
              <v-checkbox
                v-model="thirdBasicAttack"
                label="Third basic attack (no charge bonus)"
                hide-details
                :disabled="simulationScope !== 'combined' || !secondBasicAttack"
              />
            </template>
            <v-checkbox
              v-if="attackerHasDualWield"
              v-model="dualWieldAttack"
              :label="`Dual Wield after each basic (−1 die, 0 AP)${attackerBase?.dualWieldName ? ` — ${attackerBase.dualWieldName}` : ''}`"
              hide-details
              :disabled="simulationScope !== 'combined'"
            />
            <v-checkbox
              v-model="cover"
              label="Cover (−2 RNG / −1 MEL or MAG)"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="miscDiceModifier"
              label="Misc. dice modifier (+/−)"
              type="number"
              hint="Outnumber, mounted, gang up, etc."
              persistent-hint
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-select
              v-model="simulationScope"
              :items="simulationScopeOptions"
              item-title="title"
              item-value="value"
              label="Simulation scope"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-checkbox
              v-model="tryAgainReroll"
              label="Try Again (reroll any one die, optimal)"
              hide-details
              :disabled="!canUseReroll"
            />
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <div v-if="selectedWeapon && target">
          <p>
            <strong>Attacks simulated:</strong> {{ simulation.attackCount }}
            <span v-if="attackPoolLabels.length">
              —
              <span
                v-for="(entry, index) in attackPoolLabels"
                :key="entry.label"
              >
                {{ entry.label }}: {{ entry.pool }} dice<span v-if="index < attackPoolLabels.length - 1"> · </span>
              </span>
            </span>
          </p>
          <p>
            <strong>Weapon:</strong>
            {{ selectedWeapon.name }} ({{ selectedWeapon.type }}) —
            Glance {{ selectedWeapon.glance }} /
            Solid {{ selectedWeapon.solid }} /
            Crit {{ selectedWeapon.crit }}
          </p>
          <p v-if="equippedArtefact">
            <strong>Artefact:</strong> {{ equippedArtefact.name }}
          </p>
          <template v-if="comparisonMode && comparisonSummary.length">
            <p class="mb-2"><strong>Comparison damage</strong></p>
            <div class="comparison-summary">
              <div
                v-for="entry in comparisonSummary"
                :key="entry.id"
                class="comparison-summary__row"
              >
                <span
                  class="comparison-legend__swatch"
                  :class="`comparison-legend__swatch--${entry.color}`"
                />
                <span class="comparison-summary__label">{{ entry.label }}</span>
                <span class="comparison-summary__stats">
                  mean {{ entry.meanTotal.toFixed(2) }}
                  · avg {{ entry.averagePerAttack.toFixed(2) }}/attack
                </span>
              </div>
            </div>
          </template>
          <template v-else>
            <p><strong>Mean total damage:</strong> {{ simulation.average.toFixed(2) }}</p>
            <p v-if="simulation.attackCount > 1">
              <strong>Average per attack:</strong>
              {{ (simulation.average / simulation.attackCount).toFixed(2) }}
            </p>
          </template>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mt-4" title="Damage distribution">
      <v-card-text>
        <v-switch
          v-model="comparisonMode"
          label="Comparison mode (3 bars per damage total)"
          hide-details
          class="mb-2"
        />

        <v-row v-if="comparisonMode" dense class="mb-4">
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="compareArtefactBId"
              :items="compareCandidates"
              item-title="name"
              item-value="id"
              label="Compare: +die / stat artefact"
              clearable
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="compareArtefactCId"
              :items="compareCandidates"
              item-title="name"
              item-value="id"
              label="Compare: armour piercing / other"
              clearable
            />
          </v-col>
        </v-row>

        <div v-if="comparisonMode && comparisonSummary.length" class="comparison-legend mb-3">
          <div
            v-for="entry in comparisonSummary"
            :key="entry.id"
            class="comparison-legend__item comparison-legend__item--stacked"
          >
            <span
              class="comparison-legend__swatch"
              :class="`comparison-legend__swatch--${entry.color}`"
            />
            <span>
              <span class="comparison-legend__label">{{ entry.label }}</span>
              <span class="comparison-legend__stats text-medium-emphasis">
                mean {{ entry.meanTotal.toFixed(2) }} ·
                avg {{ entry.averagePerAttack.toFixed(2) }}/attack
              </span>
            </span>
          </div>
        </div>

        <div v-if="chartRows.length" class="damage-chart">
          <div
            v-for="row in chartRows"
            :key="row.damage"
            class="damage-chart__row"
          >
            <span class="damage-chart__label">{{ row.damage }}</span>
            <div
              class="damage-chart__bar-group"
              :class="{ 'damage-chart__bar-group--compare': comparisonMode }"
            >
              <v-tooltip
                v-for="(entry, index) in row.series"
                :key="`${row.damage}-${index}`"
                location="top"
              >
                <template #activator="{ props }">
                  <div
                    v-bind="props"
                    class="damage-chart__bar-wrap"
                  >
                    <div
                      class="damage-chart__bar"
                      :class="comparisonMode ? `damage-chart__bar--${entry.color}` : ''"
                      :style="{ width: `${(entry.count / maxBarCount) * 100}%` }"
                    />
                  </div>
                </template>
                <span>
                  {{ entry.label }} — {{ row.damage }}+ damage:
                  {{ (entry.cumulative * 100).toFixed(1) }}%
                </span>
              </v-tooltip>
            </div>
            <span class="damage-chart__pct">
              <template v-if="!comparisonMode">
                {{ (row.series[0].probability * 100).toFixed(1) }}%
              </template>
            </span>
          </div>
        </div>
        <p v-else class="text-medium-emphasis">
          Select an attacker, target, and weapon to see results.
        </p>
      </v-card-text>
    </v-card>

    <v-card class="mt-4" title="Combat manoeuvres">
      <v-card-subtitle>
        Odds of dealing ≥1 damage past RES while meeting symbol requirements on the chosen attack
      </v-card-subtitle>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="4">
            <v-select
              v-model="maneuverAttackIndex"
              :items="attackOptions"
              item-title="title"
              item-value="value"
              label="Attack to evaluate"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="4">
            <v-text-field
              v-model.number="minManeuvers"
              label="Minimum manoeuvre symbols"
              type="number"
              min="0"
              max="3"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="4">
            <v-text-field
              v-model.number="minJudgements"
              label="Minimum judgement (J) symbols"
              type="number"
              min="0"
              max="3"
              hide-details
            />
          </v-col>
        </v-row>

        <p class="mt-4 mb-0">
          <strong>Success chance:</strong>
          {{ (maneuverResult.probability * 100).toFixed(1) }}%
          <span class="text-medium-emphasis">
            ({{ maneuverResult.successes }} / {{ SIM_ITERATIONS }} rolls,
            {{ maneuverResult.poolSize }} dice on selected attack)
          </span>
        </p>
        <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
          Requires at least 1 damage after RES, plus
          {{ minManeuvers }} manoeuvre and
          {{ minJudgements }} judgement symbol(s) among the 3 chosen dice.
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.damage-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.damage-chart__row {
  display: grid;
  grid-template-columns: 2rem 1fr 3.5rem;
  align-items: center;
  gap: 8px;
}

.damage-chart__label {
  font-variant-numeric: tabular-nums;
  text-align: right;
  font-size: 0.875rem;
}

.damage-chart__bar-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}

.damage-chart__bar-group--compare {
  grid-template-columns: repeat(3, 1fr);
}

.damage-chart__bar-wrap {
  height: 20px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 2px;
  cursor: default;
  overflow: hidden;
}

.damage-chart__bar {
  height: 100%;
  min-width: 2px;
  background: rgb(var(--v-theme-primary));
  border-radius: 2px;
  transition: width 0.15s ease;
}

.damage-chart__bar--primary { background: rgb(var(--v-theme-primary)); }
.damage-chart__bar--success { background: rgb(var(--v-theme-success)); }
.damage-chart__bar--warning { background: rgb(var(--v-theme-warning)); }

.damage-chart__pct {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.comparison-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.comparison-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.comparison-legend__item--stacked {
  align-items: flex-start;
}

.comparison-legend__label {
  display: block;
}

.comparison-legend__stats {
  display: block;
  font-size: 0.8125rem;
}

.comparison-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comparison-summary__row {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: baseline;
  gap: 8px;
  font-size: 0.875rem;
}

.comparison-summary__label {
  font-weight: 500;
}

.comparison-summary__stats {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.comparison-legend__swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.comparison-legend__swatch--primary { background: rgb(var(--v-theme-primary)); }
.comparison-legend__swatch--success { background: rgb(var(--v-theme-success)); }
.comparison-legend__swatch--warning { background: rgb(var(--v-theme-warning)); }
</style>
