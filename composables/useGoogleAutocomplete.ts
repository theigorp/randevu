import type { AutocompleteSuggestion } from '~/server/services/google-places'

export function useGoogleAutocomplete() {
  const query = ref('')
  const suggestions = ref<AutocompleteSuggestion[]>([])
  const loading = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  async function search(input: string, options?: {
    types?: string[]
    lat?: number
    lng?: number
  }) {
    query.value = input

    if (debounceTimer) clearTimeout(debounceTimer)
    if (input.length < 2) {
      suggestions.value = []
      return
    }

    debounceTimer = setTimeout(async () => {
      loading.value = true
      try {
        const params: Record<string, string> = { input }
        if (options?.types) params.types = options.types.join(',')
        if (options?.lat) params.lat = String(options.lat)
        if (options?.lng) params.lng = String(options.lng)

        suggestions.value = await $fetch<AutocompleteSuggestion[]>('/api/autocomplete', {
          params,
        })
      } catch {
        suggestions.value = []
      } finally {
        loading.value = false
      }
    }, 300)
  }

  function clear() {
    query.value = ''
    suggestions.value = []
  }

  return { query, suggestions, loading, search, clear }
}
