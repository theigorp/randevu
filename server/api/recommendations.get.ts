import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { searchNearby } from '~/server/services/google-places'
import { filterPlaces, rankPlaces } from '~/server/services/recommendation'
import { getCache } from '~/server/utils/cache'
import { getPhotoUrl } from '~/server/utils/google-places-client'
import { GOOGLE_TYPE_TO_CATEGORY } from '~/types'
import type { PlaceCategory, DietaryPreference, MapBounds } from '~/types'

const PAGE_SIZE = 20
const DISCOVERY_CACHE_TTL = 300 // 5 minutes — avoid re-searching same area
const MIN_CACHED_FOR_BOUNDS = 5 // trigger discovery if fewer cached results in view

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    north?: string
    south?: string
    east?: string
    west?: string
    categories?: string
    page?: string
    // Guest mode params
    seedPlaceIds?: string
    dietaryPrefs?: string
    areaNames?: string
  }

  const user = event.context.user
  const page = Math.max(1, parseInt(query.page ?? '1', 10))

  // Parse bounds
  const bounds: MapBounds | undefined =
    query.north && query.south && query.east && query.west
      ? {
          north: parseFloat(query.north),
          south: parseFloat(query.south),
          east: parseFloat(query.east),
          west: parseFloat(query.west),
        }
      : undefined

  const categories = query.categories
    ? (query.categories.split(',') as PlaceCategory[])
    : undefined

  // Get user data (authenticated) or parse from query (guest)
  let seedPlaces: Array<{ googlePlaceId: string; name: string; category: PlaceCategory; types: string[]; lat: number; lng: number; rating: number; priceLevel: number; tags: string[] }> = []
  let dietaryPreferences: Record<string, DietaryPreference> = {}

  if (user) {
    const [userSeeds, userPrefs] = await Promise.all([
      prisma.userSeedPlace.findMany({ where: { userId: user.id } }),
      prisma.userPreference.findUnique({ where: { userId: user.id } }),
    ])

    // Look up cached place data for seed places to get tags
    const seedCached = await prisma.cachedPlace.findMany({
      where: { googlePlaceId: { in: userSeeds.map((s) => s.googlePlaceId) } },
    })
    const seedMap = new Map(seedCached.map((c) => [c.googlePlaceId, c]))

    seedPlaces = userSeeds.map((s) => {
      const cached = seedMap.get(s.googlePlaceId)
      return {
        googlePlaceId: s.googlePlaceId,
        name: s.name,
        category: (s.category as PlaceCategory) || 'food_drink',
        types: cached?.types ?? [],
        lat: s.lat,
        lng: s.lng,
        rating: cached?.rating ?? 4.0,
        priceLevel: cached?.priceLevel ?? 2,
        tags: cached?.tags ?? [],
      }
    })

    dietaryPreferences = (userPrefs?.dietaryPreferences as Record<string, DietaryPreference>) ?? {}
  } else if (query.dietaryPrefs) {
    try {
      dietaryPreferences = JSON.parse(query.dietaryPrefs)
    } catch { /* ignore */ }
  }

  // Discover new places from Google if we don't have enough cached for this area
  if (bounds) {
    await discoverPlacesForBounds(bounds, categories)
  }

  // Fetch candidate places from cache
  const allCached = await prisma.cachedPlace.findMany()
  const photoRefMap = new Map(allCached.map((c) => [c.googlePlaceId, c.photoReferences]))
  const candidates = allCached.map((c) => ({
    googlePlaceId: c.googlePlaceId,
    name: c.name,
    category: c.category as PlaceCategory,
    types: c.types,
    lat: c.lat,
    lng: c.lng,
    rating: c.rating,
    priceLevel: c.priceLevel,
    tags: c.tags,
  }))

  // Phase 1: Filter
  const filtered = filterPlaces(candidates, {
    bounds,
    categories,
    dietaryPreferences,
  })

  // Phase 2: Rank
  const ranked = rankPlaces(filtered, seedPlaces, dietaryPreferences)

  // Paginate
  const total = ranked.length
  const start = (page - 1) * PAGE_SIZE
  const pageItems = ranked.slice(start, start + PAGE_SIZE)

  // Attach photo URLs
  const places = pageItems.map((p) => {
    const refs = photoRefMap.get(p.googlePlaceId) ?? []
    return {
      googlePlaceId: p.googlePlaceId,
      name: p.name,
      category: p.category,
      types: p.types,
      lat: p.lat,
      lng: p.lng,
      rating: p.rating,
      priceLevel: p.priceLevel,
      tags: p.tags,
      photoUrl: refs[0] ? getPhotoUrl(refs[0]) : null,
      openingHours: null,
      website: null,
      phone: null,
      address: null,
      recommendationReason: p.recommendationReason,
      similarityScore: p.similarityScore,
    }
  })

  return { places, total, page, pageSize: PAGE_SIZE }
})

/** Search Google for nearby places and cache them if we have too few for the current view */
async function discoverPlacesForBounds(bounds: MapBounds, categories?: PlaceCategory[]) {
  const centerLat = (bounds.north + bounds.south) / 2
  const centerLng = (bounds.east + bounds.west) / 2

  // Round to ~500m grid to create a stable cache key
  const gridLat = (Math.round(centerLat * 200) / 200).toFixed(3)
  const gridLng = (Math.round(centerLng * 200) / 200).toFixed(3)
  const cacheKey = `discovery:${gridLat}:${gridLng}`

  const cache = getCache()
  const already = await cache.get(cacheKey)
  if (already) return

  // Check how many cached places exist in bounds
  const cachedCount = await prisma.cachedPlace.count({
    where: {
      lat: { gte: bounds.south, lte: bounds.north },
      lng: { gte: bounds.west, lte: bounds.east },
    },
  })

  if (cachedCount >= MIN_CACHED_FOR_BOUNDS) {
    await cache.set(cacheKey, true, DISCOVERY_CACHE_TTL)
    return
  }

  // Calculate radius from bounds (approximate)
  const latDist = (bounds.north - bounds.south) * 111_000 // meters per degree
  const lngDist = (bounds.east - bounds.west) * 111_000 * Math.cos(centerLat * Math.PI / 180)
  const radius = Math.min(Math.max(Math.max(latDist, lngDist) / 2, 500), 50_000)

  // Search for relevant place types
  const typeGroups = categories?.length
    ? categories.map((c) => getGoogleTypesForCategory(c))
    : [['restaurant', 'cafe', 'bar'], ['park', 'museum', 'art_gallery']]

  const searchPromises = typeGroups.map((types) =>
    searchNearby({ lat: centerLat, lng: centerLng, radius, types, maxResults: 20 })
      .catch(() => [])
  )

  const results = (await Promise.all(searchPromises)).flat()

  if (results.length === 0) {
    await cache.set(cacheKey, true, DISCOVERY_CACHE_TTL)
    return
  }

  // Batch upsert into cached_places
  const upserts = results.map((place) =>
    prisma.cachedPlace.upsert({
      where: { googlePlaceId: place.googlePlaceId },
      create: {
        googlePlaceId: place.googlePlaceId,
        name: place.name,
        category: place.category,
        types: place.types,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        priceLevel: place.priceLevel,
        tags: [],
        photoReferences: place.photoReferences,
        cityPlaceId: '',
        fetchedAt: new Date(),
      },
      update: {},
    })
  )

  await Promise.all(upserts)
  await cache.set(cacheKey, true, DISCOVERY_CACHE_TTL)
}

function getGoogleTypesForCategory(category: PlaceCategory): string[] {
  return Object.entries(GOOGLE_TYPE_TO_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([type]) => type)
}
