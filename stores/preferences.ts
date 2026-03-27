import { defineStore } from 'pinia'
import type { UserPreferences, SeedPlace, PreferredArea } from '~/types'

export const usePreferencesStore = defineStore('preferences', () => {
  const preferences = ref<UserPreferences | null>(null)
  const seedPlaces = ref<SeedPlace[]>([])
  const preferredAreas = ref<PreferredArea[]>([])
  const loading = ref(false)
  const onboardingComplete = ref(false)

  async function fetchPreferences() {
    loading.value = true
    try {
      const data = await $fetch<{
        preferences: UserPreferences | null
        seedPlaces: SeedPlace[]
        preferredAreas: PreferredArea[]
      }>('/api/preferences')

      preferences.value = data.preferences
      seedPlaces.value = data.seedPlaces
      preferredAreas.value = data.preferredAreas
      onboardingComplete.value = !!data.preferences?.baseCityPlaceId
    } catch {
      // Guest mode — load from localStorage
      loadFromLocalStorage()
    } finally {
      loading.value = false
    }
  }

  async function savePreferences(prefs: UserPreferences) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      await $fetch('/api/preferences', { method: 'PUT', body: prefs })
    } else {
      localStorage.setItem('randevu_preferences', JSON.stringify(prefs))
    }
    preferences.value = prefs
    onboardingComplete.value = true
  }

  async function addSeedPlace(place: Omit<SeedPlace, 'id'>) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      const result = await $fetch<{ id: string }>('/api/seed-places', {
        method: 'POST',
        body: place,
      })
      seedPlaces.value.push({ ...place, id: result.id })
    } else {
      const id = crypto.randomUUID()
      seedPlaces.value.push({ ...place, id })
      localStorage.setItem('randevu_seed_places', JSON.stringify(seedPlaces.value))
    }
  }

  async function removeSeedPlace(id: string) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      await $fetch(`/api/seed-places/${id}`, { method: 'DELETE' })
    }
    seedPlaces.value = seedPlaces.value.filter((p) => p.id !== id)
    localStorage.setItem('randevu_seed_places', JSON.stringify(seedPlaces.value))
  }

  async function savePreferredAreas(areas: PreferredArea[]) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      await $fetch('/api/preferred-areas', {
        method: 'PUT',
        body: { areas: areas.map((a) => ({ name: a.neighborhoodName, bounds: a.bounds })) },
      })
    } else {
      localStorage.setItem('randevu_preferred_areas', JSON.stringify(areas))
    }
    preferredAreas.value = areas
  }

  function loadFromLocalStorage() {
    try {
      const prefs = localStorage.getItem('randevu_preferences')
      if (prefs) preferences.value = JSON.parse(prefs)
      const seeds = localStorage.getItem('randevu_seed_places')
      if (seeds) seedPlaces.value = JSON.parse(seeds)
      const areas = localStorage.getItem('randevu_preferred_areas')
      if (areas) preferredAreas.value = JSON.parse(areas)
      onboardingComplete.value = !!preferences.value?.baseCityPlaceId
    } catch { /* ignore */ }
  }

  return {
    preferences,
    seedPlaces,
    preferredAreas,
    loading,
    onboardingComplete,
    fetchPreferences,
    savePreferences,
    addSeedPlace,
    removeSeedPlace,
    savePreferredAreas,
    loadFromLocalStorage,
  }
})
