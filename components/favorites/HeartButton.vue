<template>
  <button
    @click.stop="onClick"
    class="transition-colors"
    :class="saved ? 'text-red-500' : 'text-gray-400 hover:text-red-300'"
  >
    <svg class="w-6 h-6" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  googlePlaceId: string
  name: string
  category: string
}>()

const favoritesStore = useFavoritesStore()
const saved = computed(() => favoritesStore.isSaved(props.googlePlaceId))

function onClick() {
  favoritesStore.toggleSave({
    googlePlaceId: props.googlePlaceId,
    name: props.name,
    category: props.category,
  })
}
</script>
