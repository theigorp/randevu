<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      <span class="text-sm text-gray-600">{{ total }} places found</span>
      <div class="hidden md:flex gap-1">
        <button
          @click="viewMode = 'grid'"
          class="p-1.5 rounded"
          :class="viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          @click="viewMode = 'list'"
          class="p-1.5 rounded"
          :class="viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <!-- Mobile horizontal cards -->
      <div class="md:hidden flex flex-col gap-3">
        <div
          v-for="place in places"
          :key="place.googlePlaceId"
          @click="$emit('select', place.googlePlaceId)"
          class="flex bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 cursor-pointer"
        >
          <div class="w-24 h-24 shrink-0 bg-gray-200">
            <img
              v-if="place.photoUrl"
              :src="place.photoUrl"
              :alt="place.name"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 p-3 min-w-0">
            <h3 class="font-semibold text-gray-900 truncate text-sm">{{ place.name }}</h3>
            <div class="text-xs text-gray-500 mt-0.5">
              {{ place.rating?.toFixed(1) }} · {{ '$'.repeat(place.priceLevel || 1) }}
            </div>
            <div
              v-if="place.recommendationReason"
              class="mt-1 text-xs text-green-700 truncate"
            >
              {{ place.recommendationReason }}
            </div>
          </div>
          <HeartButton
            class="self-center pr-3"
            :google-place-id="place.googlePlaceId"
            :name="place.name"
            :category="place.category"
          />
        </div>
      </div>

      <!-- Desktop grid/list -->
      <div class="hidden md:block">
        <div
          :class="viewMode === 'grid'
            ? 'grid grid-cols-2 gap-4'
            : 'flex flex-col gap-3'"
        >
          <PlaceCard
            v-for="place in places"
            :key="place.googlePlaceId"
            :place="place"
            @select="$emit('select', $event)"
          />
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-2 gap-4 mt-4">
        <div v-for="i in 4" :key="i" class="bg-gray-200 rounded-lg h-48 animate-pulse" />
      </div>

      <!-- Empty state -->
      <div v-if="!loading && places.length === 0" class="text-center py-12 text-gray-500">
        <p class="text-lg font-medium">No places found</p>
        <p class="mt-1 text-sm">Try zooming out or adjusting your filters.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PlaceCard from './PlaceCard.vue';
import HeartButton from '../favorites/HeartButton.vue';
import type { Place } from '~/types'

defineProps<{
  places: Place[]
  total: number
  loading: boolean
}>()

defineEmits<{
  select: [googlePlaceId: string]
}>()

const viewMode = ref<'grid' | 'list'>('grid')
</script>
