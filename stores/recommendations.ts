import { defineStore } from 'pinia'
import type { Place, MapBounds, PlaceCategory } from '~/types'

export const useRecommendationsStore = defineStore('recommendations', () => {
  const places = ref<Place[]>([])
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const selectedPlaceId = ref<string | null>(null)
  const activeCategories = ref<PlaceCategory[]>([])

  const selectedPlace = computed(() =>
    places.value.find((p) => p.googlePlaceId === selectedPlaceId.value) ?? null,
  )

  async function fetchRecommendations(bounds: MapBounds, pageNum: number = 1) {
    loading.value = true
    try {
      const params: Record<string, string> = {
        north: String(bounds.north),
        south: String(bounds.south),
        east: String(bounds.east),
        west: String(bounds.west),
        page: String(pageNum),
      }

      if (activeCategories.value.length > 0) {
        params.categories = activeCategories.value.join(',')
      }

      // For guest mode, include preferences in query
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) {
        const prefsStore = usePreferencesStore()
        if (prefsStore.seedPlaces.length > 0) {
          params.seedPlaceIds = prefsStore.seedPlaces.map((s) => s.googlePlaceId).join(',')
        }
        if (prefsStore.preferences?.dietaryPreferences) {
          params.dietaryPrefs = JSON.stringify(prefsStore.preferences.dietaryPreferences)
        }
      }

      const data = await $fetch<{ places: Place[]; total: number; page: number }>('/api/recommendations', {
        params,
      })

      places.value = data.places
      total.value = data.total
      page.value = data.page
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
    } finally {
      loading.value = false
    }
  }

  function selectPlace(placeId: string | null) {
    selectedPlaceId.value = placeId
  }

  function setCategories(cats: PlaceCategory[]) {
    activeCategories.value = cats
  }

  return {
    places,
    total,
    page,
    loading,
    selectedPlaceId,
    selectedPlace,
    activeCategories,
    fetchRecommendations,
    selectPlace,
    setCategories,
  }
})
