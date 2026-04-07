<template>
  <div class="max-w-lg mx-auto py-8 px-4">
    <!-- Progress indicator -->
    <div class="flex items-center gap-2 mb-8">
      <div
        v-for="s in 4"
        :key="s"
        class="h-1.5 flex-1 rounded-full transition-colors"
        :class="s <= step ? 'bg-brand-pink' : 'bg-gray-200'"
      />
    </div>

    <!-- Steps -->
    <StepBaseCity v-if="step === 1" @city-selected="onCitySelected" />
    <StepSeedPlaces v-else-if="step === 2" />
    <StepDietaryPrefs v-else-if="step === 3" ref="dietaryRef" />
    <StepPreferredAreas v-else-if="step === 4" ref="areasRef" />

    <!-- Navigation -->
    <div class="flex justify-between mt-8">
      <button
        v-if="step > 1"
        @click="step--"
        class="px-4 py-2 text-gray-600 hover:text-gray-900"
      >
        Back
      </button>
      <div v-else />

      <div class="flex gap-2">
        <button
          v-if="step > 1 && step < 4"
          @click="skip"
          class="px-4 py-2 text-gray-400 hover:text-gray-600"
        >
          Skip
        </button>

        <button
          @click="next"
          :disabled="step === 1 && !citySelected"
          class="px-6 py-2 bg-brand-pink text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ step === 4 ? 'Finish' : 'Next' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StepBaseCity from './StepBaseCity.vue'
import StepSeedPlaces from './StepSeedPlaces.vue'
import StepDietaryPrefs from './StepDietaryPrefs.vue'
import StepPreferredAreas from './StepPreferredAreas.vue'
const step = ref(1)
const citySelected = ref(false)
const dietaryRef = ref<{ preferences: Record<string, string> } | null>(null)
const areasRef = ref<{ selectedAreas: Array<{ name: string; bounds: any }> } | null>(null)

const prefsStore = usePreferencesStore()

function onCitySelected(city: { placeId: string; name: string; lat: number; lng: number }) {
  citySelected.value = true
  prefsStore.savePreferences({
    baseCityPlaceId: city.placeId,
    baseCityName: city.name,
    baseCityLat: city.lat,
    baseCityLng: city.lng,
    dietaryPreferences: prefsStore.preferences?.dietaryPreferences ?? {},
  })
}

async function next() {
  if (step.value === 3 && dietaryRef.value) {
    await prefsStore.savePreferences({
      ...prefsStore.preferences!,
      dietaryPreferences: dietaryRef.value.preferences,
    })
  }

  if (step.value === 4) {
    if (areasRef.value) {
      await prefsStore.savePreferredAreas(
        areasRef.value.selectedAreas.map((a) => ({
          neighborhoodName: a.name,
          bounds: a.bounds,
        })),
      )
    }
    await navigateTo('/')
    return
  }

  step.value++
}

function skip() {
  step.value++
}
</script>
