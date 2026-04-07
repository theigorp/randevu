<template>
  <div ref="mapEl" class="w-full h-full" />
</template>

<script setup lang="ts">
import type { Place, PlaceCategory } from '~/types'
import { CATEGORY_COLORS } from '~/types'

const props = defineProps<{
  places: Place[]
  center: { lat: number; lng: number }
  zoom: number
  selectedPlaceId: string | null
}>()

const emit = defineEmits<{
  'bounds-changed': [bounds: { north: number; south: number; east: number; west: number }]
  'pin-click': [googlePlaceId: string]
  'update:center': [center: { lat: number; lng: number }]
  'update:zoom': [zoom: number]
}>()

const mapEl = ref<HTMLElement | null>(null)
let map: any = null
let markers: any[] = []
let L: any = null

onMounted(async () => {
  // Dynamic import for SSR compatibility
  L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  if (!mapEl.value) return

  map = L.map(mapEl.value).setView([props.center.lat, props.center.lng], props.zoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  map.on('moveend', () => {
    const bounds = map.getBounds()
    emit('bounds-changed', {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    })
    const center = map.getCenter()
    emit('update:center', { lat: center.lat, lng: center.lng })
    emit('update:zoom', map.getZoom())
  })

  updateMarkers()
})

function createPinIcon(category: PlaceCategory, isSelected: boolean) {
  const color = CATEGORY_COLORS[category]
  const size = isSelected ? 16 : 10
  const opacity = isSelected ? 1 : 0.85

  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);opacity:${opacity};transition:all 0.2s;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function updateMarkers() {
  if (!map || !L) return

  // Remove existing markers
  markers.forEach((m) => m.remove())
  markers = []

  for (const place of props.places) {
    const isSelected = place.googlePlaceId === props.selectedPlaceId
    const marker = L.marker([place.lat, place.lng], {
      icon: createPinIcon(place.category, isSelected),
    })
      .addTo(map)
      .on('click', () => emit('pin-click', place.googlePlaceId))

    markers.push(marker)
  }
}

// Watch for place changes
watch(() => props.places, updateMarkers, { deep: true })
watch(() => props.selectedPlaceId, updateMarkers)

// Watch for center/zoom changes from parent
watch(() => props.center, (newCenter) => {
  if (!map) return
  const cur = map.getCenter()
  if (Math.abs(cur.lat - newCenter.lat) < 1e-6 && Math.abs(cur.lng - newCenter.lng) < 1e-6) return
  map.setView([newCenter.lat, newCenter.lng], map.getZoom())
})

// Pan to selected place
function panTo(lat: number, lng: number) {
  if (map) map.panTo([lat, lng])
}

defineExpose({ panTo })
</script>

<style>
.custom-pin {
  background: transparent !important;
  border: none !important;
}
</style>
