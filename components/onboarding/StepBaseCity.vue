<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Where are you based?</h2>
    <p class="text-gray-600">We'll find date spots in your city.</p>

    <div class="relative">
      <input
        v-model="searchInput"
        @input="onInput"
        type="text"
        placeholder="Search for your city..."
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
      />

      <ul
        v-if="autocomplete.suggestions.value.length > 0"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
      >
        <li
          v-for="suggestion in autocomplete.suggestions.value"
          :key="suggestion.placeId"
          @click="selectCity(suggestion)"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer"
        >
          <div class="font-medium">{{ suggestion.mainText }}</div>
          <div class="text-sm text-gray-500">{{ suggestion.secondaryText }}</div>
        </li>
      </ul>
    </div>

    <div v-if="selectedCity" class="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <div>
        <div class="font-medium">{{ selectedCity.mainText }}</div>
        <div class="text-sm text-gray-500">{{ selectedCity.secondaryText }}</div>
      </div>
      <CoverageIndicator v-if="coverage" :level="coverage.level" />
      <span v-if="checkingCoverage" class="text-sm text-gray-400">Checking coverage...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AutocompleteSuggestion } from '~/server/services/google-places'
import type { CoverageResult } from '~/types'

const emit = defineEmits<{
  'city-selected': [city: { placeId: string; name: string; lat: number; lng: number }]
}>()

const autocomplete = useGoogleAutocomplete()
const searchInput = ref('')
const selectedCity = ref<AutocompleteSuggestion | null>(null)
const coverage = ref<CoverageResult | null>(null)
const checkingCoverage = ref(false)

function onInput() {
  autocomplete.search(searchInput.value, { types: ['(cities)'] })
}

async function selectCity(suggestion: AutocompleteSuggestion) {
  selectedCity.value = suggestion
  autocomplete.clear()
  searchInput.value = suggestion.mainText

  checkingCoverage.value = true
  try {
    const details = await $fetch<{ lat: number; lng: number }>(`/api/places/${suggestion.placeId}`)

    const coverageResult = await $fetch<CoverageResult>('/api/city-coverage', {
      params: { lat: details.lat, lng: details.lng },
    })
    coverage.value = coverageResult

    emit('city-selected', {
      placeId: suggestion.placeId,
      name: suggestion.mainText,
      lat: details.lat,
      lng: details.lng,
    })
  } finally {
    checkingCoverage.value = false
  }
}
</script>
