<template>
  <button
    @click="$emit('toggle')"
    class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
    :class="selected
      ? 'bg-brand-pink text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
  >
    {{ name }}
  </button>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  selected: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
