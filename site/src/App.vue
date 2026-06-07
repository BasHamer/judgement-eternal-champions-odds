<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <v-app>
    <v-main>
      <v-container>
        <v-card title="Judgement Odds Calculator">
          <v-card-text>
            Vue is working. Count: {{ count }}
          </v-card-text>
          <v-card-actions>
            <v-btn @click="count++">
              Increment
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>
