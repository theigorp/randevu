import { defineEventHandler, getQuery, createError } from 'h3'
import { getCache } from '~/server/utils/cache'
import { searchNearby } from '~/server/services/google-places'

export default defineEventHandler(async (event) => {
  const { lat, lng } = getQuery(event) as {
    placeId?: string
    lat?: string
    lng?: string
  }

  if (!lat || !lng) {
    throw createError({ statusCode: 400, statusMessage: 'lat and lng are required' })
  }

  const cache = getCache()
  const cacheKey = `city-coverage:${lat}:${lng}`
  const cached = await cache.get<{ level: string; count: number }>(cacheKey)
  if (cached) return cached

  // Sample search across common types
  const types = ['restaurant', 'cafe', 'park']
  const uniquePlaceIds = new Set<string>()

  for (const type of types) {
    const results = await searchNearby({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: 10000,
      types: [type],
      maxResults: 20,
    })
    for (const r of results) {
      uniquePlaceIds.add(r.googlePlaceId)
    }
  }

  const count = uniquePlaceIds.size
  let level: 'great' | 'good' | 'limited'
  if (count >= 40) level = 'great'
  else if (count >= 15) level = 'good'
  else level = 'limited'

  const result = { level, count }
  await cache.set(cacheKey, result, 86400) // Cache for 24h
  return result
})
