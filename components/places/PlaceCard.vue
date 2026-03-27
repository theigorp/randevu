<template>
  <div
    @click="$emit('select', place.googlePlaceId)"
    class="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
  >
    <div class="relative h-40 bg-gray-200">
      <img
        v-if="place.photoUrl"
        :src="place.photoUrl"
        :alt="place.name"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
        No photo
      </div>
      <HeartButton
        class="absolute top-2 right-2"
        :google-place-id="place.googlePlaceId"
        :name="place.name"
        :category="place.category"
      />
    </div>

    <div class="p-3">
      <h3 class="font-semibold text-gray-900 truncate">{{ place.name }}</h3>

      <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
        <span
          class="w-2 h-2 rounded-full"
          :style="{ backgroundColor: categoryColor }"
        />
        <span>{{ categoryLabel }}</span>
        <span v-if="place.rating">· {{ place.rating.toFixed(1) }}</span>
        <span v-if="place.priceLevel">· {{ priceLabel }}</span>
      </div>

      <div
        v-if="place.recommendationReason"
        class="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700"
      >
        {{ place.recommendationReason }}
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
  select: [googlePlaceId: string]
}>()

const categoryColor = computed(() => CATEGORY_COLORS[props.place.category])

const categoryLabel = computed(() => ({
  food_drink: 'Food & Drink',
  outdoors: 'Outdoors',
  activities: 'Activities',
  chill_spots: 'Chill Spots',
}[props.place.category]))

const priceLabel = computed(() => '$'.repeat(props.place.priceLevel || 1))
</script>
