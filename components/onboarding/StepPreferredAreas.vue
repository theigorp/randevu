<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Preferred areas</h2>
    <p class="text-gray-600">Pick neighborhoods you like exploring.</p>

    <div class="relative">
      <input
        v-model="searchInput"
        @input="onInput"
        type="text"
        placeholder="Search for a neighborhood..."
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
      />

      <ul
        v-if="autocomplete.suggestions.value.length > 0"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
      >
        <li
          v-for="suggestion in autocomplete.suggestions.value"
          :key="suggestion.placeId"
          @click="addArea(suggestion)"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer"
        >
          {{ suggestion.mainText }}
        </li>
      </ul>
    </div>

    <div class="flex flex-wrap gap-2">
      <NeighborhoodChip
        v-for="area in allAreas"
        :key="area.name"
        :name="area.name"
        :selected="selectedNames.has(area.name)"
        @toggle="toggleArea(area)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import NeighborhoodChip from '../ui/NeighborhoodChip.vue'
import type { AutocompleteSuggestion } from '~/server/services/google-places'
import type { MapBounds } from '~/types'

const prefsStore = usePreferencesStore()
const autocomplete = useGoogleAutocomplete()
const searchInput = ref('')

interface AreaItem {
  name: string
  bounds: MapBounds
}

const fetchedAreas = ref<AreaItem[]>([])
const selectedAreas = ref<AreaItem[]>([...prefsStore.preferredAreas.map((a) => ({
  name: a.neighborhoodName,
  bounds: a.bounds as MapBounds,
}))])

const selectedNames = computed(() => new Set(selectedAreas.value.map((a) => a.name)))
const allAreas = computed(() => {
  const seen = new Set<string>()
  const result: AreaItem[] = []
  for (const a of [...selectedAreas.value, ...fetchedAreas.value]) {
    if (!seen.has(a.name)) {
      seen.add(a.name)
      result.push(a)
    }
  }
  return result
})

function onInput() {
  const prefs = prefsStore.preferences
  autocomplete.search(searchInput.value, {
    types: ['sublocality', 'neighborhood'],
    lat: prefs?.baseCityLat,
    lng: prefs?.baseCityLng,
  })
}

function addArea(suggestion: AutocompleteSuggestion) {
  autocomplete.clear()
  searchInput.value = ''

  const area: AreaItem = {
    name: suggestion.mainText,
    bounds: { north: 0, south: 0, east: 0, west: 0 },
  }
  if (!selectedNames.value.has(area.name)) {
    selectedAreas.value.push(area)
  }
}

function toggleArea(area: AreaItem) {
  if (selectedNames.value.has(area.name)) {
    selectedAreas.value = selectedAreas.value.filter((a) => a.name !== area.name)
  } else {
    selectedAreas.value.push(area)
  }
}

onMounted(async () => {
  const prefs = prefsStore.preferences
  if (prefs?.baseCityName) {
    try {
      const data = await $fetch<{ neighborhoods: AreaItem[] }>('/api/neighborhoods', {
        params: {
          cityName: prefs.baseCityName,
          lat: prefs.baseCityLat,
          lng: prefs.baseCityLng,
        },
      })
      fetchedAreas.value = data.neighborhoods
    } catch { /* ignore */ }
  }
})

defineExpose({ selectedAreas })
</script>
