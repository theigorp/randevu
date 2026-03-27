<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
    :class="colorClass"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  level: 'great' | 'good' | 'limited'
}>()

const colorClass = computed(() => ({
  great: 'bg-green-100 text-green-800',
  good: 'bg-amber-100 text-amber-800',
  limited: 'bg-red-100 text-red-800',
}[props.level]))

const label = computed(() => ({
  great: 'Great coverage',
  good: 'Good coverage',
  limited: 'Limited coverage',
}[props.level]))
</script>
