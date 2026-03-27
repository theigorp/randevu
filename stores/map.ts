import { defineStore } from 'pinia'
import type { MapBounds } from '~/types'

export const useMapStore = defineStore('map', () => {
  const bounds = ref<MapBounds | null>(null)
  const center = ref<{ lat: number; lng: number }>({ lat: 40.7128, lng: -74.006 })
  const zoom = ref(13)

  function updateBounds(newBounds: MapBounds) {
    bounds.value = newBounds
  }

  function setCenter(lat: number, lng: number) {
    center.value = { lat, lng }
  }

  function setZoom(level: number) {
    zoom.value = level
  }

  function panTo(lat: number, lng: number) {
    center.value = { lat, lng }
  }

  return { bounds, center, zoom, updateBounds, setCenter, setZoom, panTo }
})
