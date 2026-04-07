<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Food & drink preferences</h2>
    <p class="text-gray-600">Tap to cycle: no preference -> must-have -> deal-breaker</p>

    <div class="grid grid-cols-2 gap-3">
      <ThreeStateToggle
        v-for="tag in DIETARY_TAGS"
        :key="tag.key"
        :label="tag.label"
        :model-value="preferences[tag.key] ?? 'neutral'"
        @update:model-value="(val) => updatePref(tag.key, val)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ThreeStateToggle from '../ui/ThreeStateToggle.vue'
import { DIETARY_TAGS, type DietaryPreference } from '~/types'

const prefsStore = usePreferencesStore()

const preferences = ref<Record<string, DietaryPreference>>(
  (prefsStore.preferences?.dietaryPreferences as Record<string, DietaryPreference>) ?? {},
)

function updatePref(key: string, value: DietaryPreference) {
  preferences.value = { ...preferences.value, [key]: value }
}

defineExpose({ preferences })
</script>
