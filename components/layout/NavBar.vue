<template>
  <nav class="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
    <!-- Left: Logo -->
    <NuxtLink to="/" class="text-xl font-bold text-brand-pink tracking-tight">
      randevu
    </NuxtLink>

    <!-- Center: City display -->
    <div v-if="prefsStore.preferences" class="hidden md:flex items-center gap-2 text-sm text-gray-600">
      <span>{{ prefsStore.preferences.baseCityName }}</span>
      <CoverageIndicator v-if="coverageLevel" :level="coverageLevel" />
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2">
      <button
        @click="$emit('toggle-filters')"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Filters"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </button>

      <NuxtLink
        to="/favorites"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Favorites"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </NuxtLink>

      <button
        @click="$emit('open-preferences')"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Preferences"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <!-- Auth button -->
      <template v-if="authStore.isAuthenticated">
        <button
          @click="authStore.logout()"
          class="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          Log out
        </button>
      </template>
      <template v-else>
        <button
          @click="$emit('open-login')"
          class="text-sm text-white bg-brand-pink hover:bg-pink-600 px-3 py-1.5 rounded-lg"
        >
          Log in
        </button>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineEmits<{
  'toggle-filters': []
  'open-preferences': []
  'open-login': []
}>()

const authStore = useAuthStore()
const prefsStore = usePreferencesStore()
const coverageLevel = ref<'great' | 'good' | 'limited' | null>(null)
</script>
