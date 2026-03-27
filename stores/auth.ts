import { defineStore } from 'pinia'

interface AuthUser {
  id: string
  email: string | null
  authProvider: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)

  async function fetchUser() {
    loading.value = true
    try {
      const data = await $fetch<AuthUser | null>('/api/auth/me')
      user.value = data
      if (data) {
        await mergeGuestData()
      }
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  async function sendMagicLink(email: string) {
    await $fetch('/api/auth/magic-link', {
      method: 'POST',
      body: { email },
    })
  }

  async function mergeGuestData() {
    // Check if there's guest data to merge
    const prefs = localStorage.getItem('randevu_preferences')
    const seeds = localStorage.getItem('randevu_seed_places')
    const areas = localStorage.getItem('randevu_preferred_areas')
    const saved = localStorage.getItem('randevu_saved_places')

    if (!prefs && !seeds && !areas && !saved) return

    try {
      await $fetch('/api/auth/merge-guest', {
        method: 'POST',
        body: {
          preferences: prefs ? JSON.parse(prefs) : undefined,
          seedPlaces: seeds ? JSON.parse(seeds) : undefined,
          preferredAreas: areas ? JSON.parse(areas) : undefined,
          savedPlaces: saved ? JSON.parse(saved) : undefined,
        },
      })

      // Clear localStorage after successful merge
      localStorage.removeItem('randevu_preferences')
      localStorage.removeItem('randevu_seed_places')
      localStorage.removeItem('randevu_preferred_areas')
      localStorage.removeItem('randevu_saved_places')
    } catch {
      // Merge failed — guest data remains in localStorage for retry
    }
  }

  return { user, loading, isAuthenticated, fetchUser, logout, sendMagicLink }
})
