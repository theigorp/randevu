import { defineStore } from 'pinia'

interface SavedPlace {
  googlePlaceId: string
  name: string
  category: string
  savedAt?: string
}

export const useFavoritesStore = defineStore('favorites', () => {
  const savedPlaces = ref<SavedPlace[]>([])
  const loading = ref(false)

  const savedPlaceIds = computed(() => new Set(savedPlaces.value.map((p) => p.googlePlaceId)))

  function isSaved(googlePlaceId: string): boolean {
    return savedPlaceIds.value.has(googlePlaceId)
  }

  async function fetchSavedPlaces() {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      loading.value = true
      try {
        savedPlaces.value = await $fetch<SavedPlace[]>('/api/saved-places')
      } catch {
        savedPlaces.value = []
      } finally {
        loading.value = false
      }
    } else {
      // Guest: load from localStorage
      try {
        const data = localStorage.getItem('randevu_saved_places')
        savedPlaces.value = data ? JSON.parse(data) : []
      } catch {
        savedPlaces.value = []
      }
    }
  }

  async function toggleSave(place: { googlePlaceId: string; name: string; category: string }) {
    const authStore = useAuthStore()
    if (isSaved(place.googlePlaceId)) {
      // Remove
      if (authStore.isAuthenticated) {
        await $fetch(`/api/saved-places/${place.googlePlaceId}`, { method: 'DELETE' })
      }
      savedPlaces.value = savedPlaces.value.filter((p) => p.googlePlaceId !== place.googlePlaceId)
    } else {
      // Add
      if (authStore.isAuthenticated) {
        await $fetch('/api/saved-places', { method: 'POST', body: place })
      }
      savedPlaces.value.push({ ...place, savedAt: new Date().toISOString() })
    }

    if (!authStore.isAuthenticated) {
      localStorage.setItem('randevu_saved_places', JSON.stringify(savedPlaces.value))
    }
  }

  return { savedPlaces, loading, savedPlaceIds, isSaved, fetchSavedPlaces, toggleSave }
})
