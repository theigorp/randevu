import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { filterPlaces, rankPlaces } from '~/server/services/recommendation'
import type { PlaceCategory, DietaryPreference, MapBounds } from '~/types'

const PAGE_SIZE = 20

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

  // Fetch candidate places from cache
  const allCached = await prisma.cachedPlace.findMany()
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
  const places = pageItems.map((p) => ({
    googlePlaceId: p.googlePlaceId,
    name: p.name,
    category: p.category,
    types: p.types,
    lat: p.lat,
    lng: p.lng,
    rating: p.rating,
    priceLevel: p.priceLevel,
    tags: p.tags,
    photoUrl: null as string | null,
    openingHours: null,
    website: null,
    phone: null,
    address: null,
    recommendationReason: p.recommendationReason,
    similarityScore: p.similarityScore,
  }))

  return { places, total, page, pageSize: PAGE_SIZE }
})
