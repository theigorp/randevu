import type { MapBounds } from '~/types'

export function useMapBounds() {
  const mapStore = useMapStore()
  const recsStore = useRecommendationsStore()

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function onBoundsChanged(bounds: MapBounds) {
    mapStore.updateBounds(bounds)

    // Debounce recommendation fetching on map pan/zoom
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      recsStore.fetchRecommendations(bounds)
    }, 300)
  }

  return { onBoundsChanged }
}
