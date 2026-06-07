<script setup>
import { computed, ref, watch } from 'vue'
import combatantData from '../data/combatants.json'
import {
  averageDamage,
  calculateDicePoolSize,
  runMonteCarloSimulation,
} from '../lib/combatSim.js'

const SIM_ITERATIONS = 1000

const combatants = combatantData.combatants

const attackerId = ref(combatants[0]?.id ?? '')
const targetId = ref(combatants.find(c => c.id !== combatants[0]?.id)?.id ?? '')
const weaponName = ref('')
const charge = ref(false)
const followUpAttack = ref(false)
const cover = ref(false)

const attacker = computed(() => combatants.find(c => c.id === attackerId.value))
const target = computed(() => combatants.find(c => c.id === targetId.value))

const attackerWeapons = computed(() => attacker.value?.weapons ?? [])

watch(attacker, (next) => {
  if (!next?.weapons.length) {
    weaponName.value = ''
    return
  }
  if (!next.weapons.some(w => w.name === weaponName.value)) {
    weaponName.value = next.weapons[0].name
  }
}, { immediate: true })

const selectedWeapon = computed(() =>
  attackerWeapons.value.find(w => w.name === weaponName.value) ?? null,
)

const simParams = computed(() => {
  if (!attacker.value || !target.value || !selectedWeapon.value) return null
  return {
    attacker: attacker.value,
    target: target.value,
    weapon: selectedWeapon.value,
    charge: charge.value,
    followUpAttack: followUpAttack.value,
    cover: cover.value,
  }
})

const poolSize = computed(() =>
  simParams.value ? calculateDicePoolSize(simParams.value) : 0,
)

const simulation = computed(() => {
  if (!simParams.value) {
    return { distribution: {}, probabilities: {}, average: 0 }
  }
  const result = runMonteCarloSimulation(simParams.value, SIM_ITERATIONS)
  return {
    ...result,
    average: averageDamage(result.distribution),
  }
})

const distributionRows = computed(() => {
  const rows = Object.entries(simulation.value.distribution)
    .map(([damage, count]) => ({
      damage: Number(damage),
      count: Number(count),
      probability: simulation.value.probabilities[Number(damage)] ?? 0,
    }))
    .sort((a, b) => a.damage - b.damage)
  return rows
})

const combatantLabel = (c) => `${c.name} (${c.kind})`
</script>

<template>
  <v-container max-width="900">
    <v-card title="Attack Damage Simulator">
      <v-card-subtitle>
        Monte Carlo simulation ({{ SIM_ITERATIONS }} rolls) — single basic attack
      </v-card-subtitle>

      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="attackerId"
              :items="combatants"
              item-title="name"
              item-value="id"
              label="Attacker"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.kind" />
              </template>
              <template #selection="{ item }">
                {{ combatantLabel(item.raw) }}
              </template>
            </v-select>
          </v-col>

          <v-col cols="12" md="6">
            <v-select
              v-model="targetId"
              :items="combatants"
              item-title="name"
              item-value="id"
              label="Target"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.kind" />
              </template>
              <template #selection="{ item }">
                {{ combatantLabel(item.raw) }}
              </template>
            </v-select>
          </v-col>

          <v-col cols="12">
            <v-select
              v-model="weaponName"
              :items="attackerWeapons"
              item-title="name"
              item-value="name"
              label="Weapon"
              :disabled="!attackerWeapons.length"
            />
          </v-col>

          <v-col cols="12">
            <v-checkbox
              v-model="charge"
              label="Charge (+2 dice, melee first attack only)"
              hide-details
              :disabled="selectedWeapon?.type !== 'MEL' || followUpAttack"
            />
            <v-checkbox
              v-model="followUpAttack"
              label="Follow-up attack (Dual Wield, -1 die)"
              hide-details
            />
            <v-checkbox
              v-model="cover"
              label="Cover (-2 RNG / -1 MEL or MAG)"
              hide-details
            />
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <div v-if="selectedWeapon && target">
          <p><strong>Attack dice pool:</strong> {{ poolSize }}</p>
          <p><strong>Weapon:</strong> {{ selectedWeapon.name }} ({{ selectedWeapon.type }}) — Glance {{ selectedWeapon.glance }} / Solid {{ selectedWeapon.solid }} / Crit {{ selectedWeapon.crit }}</p>
          <p><strong>Target RES:</strong> {{ target.stats.res ?? 0 }}</p>
          <p><strong>Mean damage:</strong> {{ simulation.average.toFixed(2) }}</p>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mt-4" title="Damage distribution">
      <v-table density="compact">
        <thead>
          <tr>
            <th>Damage</th>
            <th>Count</th>
            <th>Probability</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in distributionRows" :key="row.damage">
            <td>{{ row.damage }}</td>
            <td>{{ row.count }}</td>
            <td>{{ (row.probability * 100).toFixed(1) }}%</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
