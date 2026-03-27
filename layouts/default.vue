<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <NavBar
      @toggle-filters="filtersOpen = !filtersOpen"
      @open-preferences="navigateTo('/onboarding')"
      @open-login="loginOpen = true"
    />
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const filtersOpen = ref(false)
const loginOpen = ref(false)

// Initialize auth on app load
const authStore = useAuthStore()
const prefsStore = usePreferencesStore()

onMounted(async () => {
  await authStore.fetchUser()
  if (authStore.isAuthenticated) {
    await prefsStore.fetchPreferences()
  } else {
    prefsStore.loadFromLocalStorage()
  }
})
</script>
