<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Saved Places</h1>

    <div v-if="favoritesStore.loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-24 bg-gray-200 rounded-lg animate-pulse" />
    </div>

    <div v-else-if="favoritesStore.savedPlaces.length === 0" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      <p class="text-lg font-medium text-gray-600 mt-4">No saved places yet</p>
      <p class="text-sm text-gray-400 mt-1">Heart a place to save it here.</p>
      <NuxtLink
        to="/"
        class="inline-block mt-6 px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-pink-600"
      >
        Explore places
      </NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="place in favoritesStore.savedPlaces"
        :key="place.googlePlaceId"
        class="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100"
      >
        <div>
          <h3 class="font-semibold text-gray-900">{{ place.name }}</h3>
          <span class="text-sm text-gray-500">{{ formatCategory(place.category) }}</span>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="`/?place=${place.googlePlaceId}`"
            class="text-sm text-brand-pink hover:underline"
          >
            View
          </NuxtLink>
          <HeartButton
            :google-place-id="place.googlePlaceId"
            :name="place.name"
            :category="place.category"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const favoritesStore = useFavoritesStore()

onMounted(() => {
  favoritesStore.fetchSavedPlaces()
})

function formatCategory(cat: string): string {
  return {
    food_drink: 'Food & Drink',
    outdoors: 'Outdoors',
    activities: 'Activities',
    chill_spots: 'Chill Spots',
  }[cat] ?? cat
}
</script>
