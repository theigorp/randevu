<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Places you love</h2>
    <p class="text-gray-600">Add places you already enjoy — we'll find similar spots.</p>

    <div class="relative">
      <input
        v-model="searchInput"
        @input="onInput"
        type="text"
        placeholder="Search for a place..."
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
      />

      <ul
        v-if="autocomplete.suggestions.value.length > 0"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
      >
        <li
          v-for="suggestion in autocomplete.suggestions.value"
          :key="suggestion.placeId"
          @click="addPlace(suggestion)"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer"
        >
          <div class="font-medium">{{ suggestion.mainText }}</div>
          <div class="text-sm text-gray-500">{{ suggestion.secondaryText }}</div>
        </li>
      </ul>
    </div>

    <div class="space-y-2">
      <div
        v-for="place in prefsStore.seedPlaces"
        :key="place.id"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      >
        <div>
          <div class="font-medium text-sm">{{ place.name }}</div>
          <div class="text-xs text-gray-500">{{ place.category }}</div>
        </div>
        <button
          @click="prefsStore.removeSeedPlace(place.id)"
          class="text-gray-400 hover:text-red-500"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AutocompleteSuggestion } from '~/server/services/google-places'

const prefsStore = usePreferencesStore()
const autocomplete = useGoogleAutocomplete()
const searchInput = ref('')

function onInput() {
  const prefs = prefsStore.preferences
  autocomplete.search(searchInput.value, {
    lat: prefs?.baseCityLat,
    lng: prefs?.baseCityLng,
  })
}

async function addPlace(suggestion: AutocompleteSuggestion) {
  autocomplete.clear()
  searchInput.value = ''

  const details = await $fetch<{ lat: number; lng: number; category: string }>(
    `/api/places/${suggestion.placeId}`,
  )

  await prefsStore.addSeedPlace({
    googlePlaceId: suggestion.placeId,
    name: suggestion.mainText,
    category: details.category,
    lat: details.lat,
    lng: details.lng,
  })
}
</script>
