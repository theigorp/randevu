import { defineEventHandler, getQuery, createError } from 'h3'
import { getCache } from '~/server/utils/cache'
import { textSearch } from '~/server/services/google-places'

export default defineEventHandler(async (event) => {
  const { cityName, lat, lng } = getQuery(event) as {
    cityPlaceId?: string
    cityName?: string
    lat?: string
    lng?: string
  }

  if (!cityName) {
    throw createError({ statusCode: 400, statusMessage: 'cityName is required' })
  }

  const cache = getCache()
  const cacheKey = `neighborhoods:${cityName}`
  const cached = await cache.get<{ neighborhoods: Array<{ name: string }> }>(cacheKey)
  if (cached) return cached

  // Search for neighborhoods in the city
  const results = await textSearch(`${cityName} neighborhoods`, {
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined,
    radius: 30000,
    maxResults: 20,
  })

  const neighborhoods = results.map((r) => ({
    name: r.name,
    bounds: {
      // Approximate bounds around the neighborhood center
      north: r.lat + 0.01,
      south: r.lat - 0.01,
      east: r.lng + 0.01,
      west: r.lng - 0.01,
    },
  }))

  const result = { neighborhoods }
  await cache.set(cacheKey, result, 86400)
  return result
})
