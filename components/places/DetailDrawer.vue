<template>
  <div
    class="absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[70%] bg-white shadow-xl z-10 overflow-y-auto"
    @click.stop
  >
    <!-- Hero photo -->
    <div class="relative h-56 bg-gray-200">
      <img
        v-if="placeDetails?.photoUrl || place.photoUrl"
        :src="placeDetails?.photoUrl || place.photoUrl"
        :alt="place.name"
        class="w-full h-full object-cover"
      />
      <div class="absolute top-3 right-3 flex gap-2">
        <HeartButton
          :google-place-id="place.googlePlaceId"
          :name="place.name"
          :category="place.category"
          class="bg-white/80 backdrop-blur rounded-full p-2"
        />
        <button
          @click="$emit('close')"
          class="bg-white/80 backdrop-blur rounded-full p-2 text-gray-600 hover:text-gray-900"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div class="p-5 space-y-5">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">{{ place.name }}</h2>
        <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <span
            class="w-2 h-2 rounded-full"
            :style="{ backgroundColor: categoryColor }"
          />
          <span>{{ categoryLabel }}</span>
          <span v-if="place.rating">· {{ place.rating.toFixed(1) }}</span>
          <span v-if="place.priceLevel">· {{ priceLabel }}</span>
        </div>
      </div>

      <div
        v-if="place.recommendationReason"
        class="p-4 bg-green-50 rounded-lg border border-green-100"
      >
        <div class="text-sm font-medium text-green-800">Why we recommend this</div>
        <div class="text-sm text-green-700 mt-1">{{ place.recommendationReason }}</div>
      </div>

      <div v-if="displayTags.length > 0" class="flex flex-wrap gap-2">
        <span
          v-for="tag in displayTags"
          :key="tag"
          class="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
        >
          {{ tag }}
        </span>
      </div>

      <div class="space-y-3 text-sm">
        <div v-if="placeDetails?.openingHours" class="flex items-start gap-3">
          <svg class="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span :class="placeDetails.openingHours.openNow ? 'text-green-600' : 'text-red-600'">
              {{ placeDetails.openingHours.openNow ? 'Open now' : 'Closed' }}
            </span>
            <div v-if="placeDetails.openingHours.weekdayDescriptions" class="text-gray-500 mt-1">
              <div v-for="line in placeDetails.openingHours.weekdayDescriptions" :key="line">
                {{ line }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="placeDetails?.address" class="flex items-center gap-3">
          <svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-gray-600">{{ placeDetails.address }}</span>
        </div>

        <div v-if="placeDetails?.phone" class="flex items-center gap-3">
          <svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span class="text-gray-600">{{ placeDetails.phone }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-3 pt-2">
        <a
          :href="directionsUrl"
          target="_blank"
          class="flex items-center justify-center gap-2 px-4 py-3 bg-brand-pink text-white rounded-lg hover:bg-pink-600 font-medium"
        >
          Get Directions
        </a>
        <div class="flex gap-3">
          <a
            v-if="placeDetails?.website"
            :href="placeDetails.website"
            target="_blank"
            class="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            Visit Website
          </a>
          <a
            :href="googleMapsUrl"
            target="_blank"
            class="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            See on Google Maps
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Place } from '~/types'
import { CATEGORY_COLORS } from '~/types'

const props = defineProps<{
  place: Place
}>()

defineEmits<{
  close: []
}>()

const placeDetails = ref<Place | null>(null)

onMounted(async () => {
  try {
    placeDetails.value = await $fetch<Place>(`/api/places/${props.place.googlePlaceId}`)
  } catch {
    placeDetails.value = props.place
  }
})

watch(() => props.place.googlePlaceId, async (newId) => {
  try {
    placeDetails.value = await $fetch<Place>(`/api/places/${newId}`)
  } catch {
    placeDetails.value = props.place
  }
})

const categoryColor = computed(() => CATEGORY_COLORS[props.place.category])
const categoryLabel = computed(() => ({
  food_drink: 'Food & Drink',
  outdoors: 'Outdoors',
  activities: 'Activities',
  chill_spots: 'Chill Spots',
}[props.place.category]))

const priceLabel = computed(() => '$'.repeat(props.place.priceLevel || 1))
const displayTags = computed(() => placeDetails.value?.tags ?? props.place.tags ?? [])

const directionsUrl = computed(() =>
  `https://www.google.com/maps/dir/?api=1&destination=${props.place.lat},${props.place.lng}`,
)

const googleMapsUrl = computed(() =>
  `https://www.google.com/maps/place/?q=place_id:${props.place.googlePlaceId}`,
)
</script>
