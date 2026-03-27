<template>
  <button
    @click="cycle"
    class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
    :class="stateClass"
  >
    <span class="text-sm font-medium">{{ label }}</span>
    <span class="text-xs" :class="stateTextClass">{{ stateLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import type { DietaryPreference } from '~/types'

const props = defineProps<{
  label: string
  modelValue: DietaryPreference
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DietaryPreference]
}>()

const stateOrder: DietaryPreference[] = ['neutral', 'must', 'dealbreaker']

function cycle() {
  const currentIndex = stateOrder.indexOf(props.modelValue)
  const next = stateOrder[(currentIndex + 1) % stateOrder.length]
  emit('update:modelValue', next)
}

const stateClass = computed(() => ({
  must: 'border-green-400 bg-green-50',
  neutral: 'border-gray-200 bg-white',
  dealbreaker: 'border-red-400 bg-red-50',
}[props.modelValue]))

const stateTextClass = computed(() => ({
  must: 'text-green-600',
  neutral: 'text-gray-400',
  dealbreaker: 'text-red-600',
}[props.modelValue]))

const stateLabel = computed(() => ({
  must: 'Must-have',
  neutral: 'No preference',
  dealbreaker: 'Deal-breaker',
}[props.modelValue]))
</script>
