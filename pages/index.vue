<template>
  <div class="h-full flex">
    <!-- Redirect to onboarding if not set up -->
    <div v-if="!prefsStore.onboardingComplete && !prefsStore.loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Welcome to randevu</h2>
        <p class="text-gray-600 mb-6">Let's set up your preferences to find great date spots.</p>
        <NuxtLink
          to="/onboarding"
          class="px-6 py-3 bg-brand-pink text-white rounded-lg hover:bg-pink-600"
        >
          Get Started
        </NuxtLink>
      </div>
    </div>

    <template v-else-if="prefsStore.onboardingComplete">
      <!-- Map Panel (desktop only) -->
      <div class="hidden md:block w-[55%] relative">
        <ClientOnly>
          <MapContainer
            ref="mapRef"
            :places="recsStore.places"
            :center="mapStore.center"
            :zoom="mapStore.zoom"
            :selected-place-id="recsStore.selectedPlaceId"
            @bounds-changed="mapBounds.onBoundsChanged"
            @pin-click="onPinClick"
            @update:center="(c) => mapStore.setCenter(c.lat, c.lng)"
            @update:zoom="(z) => mapStore.setZoom(z)"
          />
        </ClientOnly>

        <div class="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-sm text-gray-600 shadow">
          Showing {{ recsStore.places.length }} places in view
        </div>
      </div>

      <!-- List Panel -->
      <div class="flex-1 border-l border-gray-200 relative">
        <!-- Mobile filter chips -->
        <div class="md:hidden px-4 py-2 border-b border-gray-200 flex gap-2 overflow-x-auto">
          <button
            v-for="cat in categoryOptions"
            :key="cat.value"
            @click="toggleCategory(cat.value)"
            class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
            :class="recsStore.activeCategories.includes(cat.value)
              ? 'bg-brand-pink text-white border-brand-pink'
              : 'bg-white text-gray-600 border-gray-200'"
          >
            {{ cat.label }}
          </button>
        </div>

        <PlaceList
          :places="recsStore.places"
          :total="recsStore.total"
          :loading="recsStore.loading"
          @select="onPlaceSelect"
        />

        <DetailDrawer
          v-if="recsStore.selectedPlace"
          :place="recsStore.selectedPlace"
          @close="recsStore.selectPlace(null)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PlaceCategory } from '~/types'

const prefsStore = usePreferencesStore()
const recsStore = useRecommendationsStore()
const mapStore = useMapStore()
const favoritesStore = useFavoritesStore()
const mapBounds = useMapBounds()
const mapRef = ref<{ panTo: (lat: number, lng: number) => void } | null>(null)

const categoryOptions = [
  { value: 'food_drink' as PlaceCategory, label: 'Food & Drink' },
  { value: 'outdoors' as PlaceCategory, label: 'Outdoors' },
  { value: 'activities' as PlaceCategory, label: 'Activities' },
  { value: 'chill_spots' as PlaceCategory, label: 'Chill Spots' },
]

// Initialize map center from preferences
watch(
  () => prefsStore.preferences,
  (prefs) => {
    if (prefs) {
      mapStore.setCenter(prefs.baseCityLat, prefs.baseCityLng)
    }
  },
  { immediate: true },
)

onMounted(() => {
  favoritesStore.fetchSavedPlaces()
})

function onPinClick(googlePlaceId: string) {
  recsStore.selectPlace(googlePlaceId)
}

function onPlaceSelect(googlePlaceId: string) {
  recsStore.selectPlace(googlePlaceId)
  const place = recsStore.places.find((p) => p.googlePlaceId === googlePlaceId)
  if (place && mapRef.value) {
    mapRef.value.panTo(place.lat, place.lng)
  }
}

function toggleCategory(cat: PlaceCategory) {
  const current = recsStore.activeCategories
  if (current.includes(cat)) {
    recsStore.setCategories(current.filter((c) => c !== cat))
  } else {
    recsStore.setCategories([...current, cat])
  }
  if (mapStore.bounds) {
    recsStore.fetchRecommendations(mapStore.bounds)
  }
}
</script>
