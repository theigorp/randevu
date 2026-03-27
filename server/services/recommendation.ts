import type { PlaceCategory, DietaryPreference, MapBounds } from '~/types'

interface PlaceData {
  googlePlaceId: string
  name: string
  category: PlaceCategory
  types: string[]
  lat: number
  lng: number
  rating: number
  priceLevel: number
  tags: string[]
}

interface FilterOptions {
  bounds?: MapBounds
  categories?: PlaceCategory[]
  dietaryPreferences?: Record<string, DietaryPreference>
}

interface ScoredPlace extends PlaceData {
  similarityScore: number
  recommendationReason: string
}

interface ScoreFactors {
  tagOverlap?: number
  categorySimilarity?: number
  ratingProximity?: number
  priceLevelMatch?: number
  geographicProximity?: number
}

// Tag key -> tags that indicate presence of this attribute
const DIETARY_TAG_MAP: Record<string, string[]> = {
  vegan: ['Vegan'],
  vegetarian: ['Vegetarian'],
  cocktails: ['Cocktails'],
  wine: ['Wine'],
  meat: ['Meat-focused'],
  coffee: ['Coffee', 'Café'],
  craft_beer: ['Beer', 'Craft beer'],
  gluten_free: ['Gluten-free'],
  halal: ['Halal'],
}

/** Phase 1: Filter candidates by hard constraints */
export function filterPlaces(places: PlaceData[], options: FilterOptions): PlaceData[] {
  let result = [...places]

  // Geographic filter
  if (options.bounds) {
    const { north, south, east, west } = options.bounds
    result = result.filter(
      (p) => p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east,
    )
  }

  // Category filter
  if (options.categories?.length) {
    result = result.filter((p) => options.categories!.includes(p.category))
  }

  // Deal-breaker filter
  if (options.dietaryPreferences) {
    const dealbreakers = Object.entries(options.dietaryPreferences)
      .filter(([, v]) => v === 'dealbreaker')
      .flatMap(([key]) => DIETARY_TAG_MAP[key] ?? [])

    if (dealbreakers.length > 0) {
      result = result.filter(
        (p) => !p.tags.some((tag) => dealbreakers.includes(tag)),
      )
    }
  }

  return result
}

/** Phase 2: Rank candidates by similarity to seed places */
export function rankPlaces(
  candidates: PlaceData[],
  seedPlaces: PlaceData[],
  dietaryPreferences: Record<string, DietaryPreference>,
): ScoredPlace[] {
  // Must-have tags for bonus (needed in both paths)
  const mustHaveTags = Object.entries(dietaryPreferences)
    .filter(([, v]) => v === 'must')
    .flatMap(([key]) => DIETARY_TAG_MAP[key] ?? [])

  // Fallback: no seeds -> sort by rating with must-have bonus
  if (seedPlaces.length === 0) {
    return candidates
      .map((p) => {
        let score = p.rating / 5
        if (mustHaveTags.length > 0 && mustHaveTags.some((t) => p.tags.includes(t))) {
          score *= 1.2
        }
        score = Math.min(1, Math.max(0, score))
        return {
          ...p,
          similarityScore: score,
          recommendationReason: generateRecommendationReason(p, [], {}),
        }
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
  }

  // Build aggregate seed profile
  const seedCategories = new Set(seedPlaces.map((s) => s.category))
  const seedTags = new Set(seedPlaces.flatMap((s) => s.tags))
  const avgSeedRating = seedPlaces.reduce((sum, s) => sum + s.rating, 0) / seedPlaces.length
  const avgSeedPrice = seedPlaces.reduce((sum, s) => sum + s.priceLevel, 0) / seedPlaces.length
  const seedCenter = {
    lat: seedPlaces.reduce((sum, s) => sum + s.lat, 0) / seedPlaces.length,
    lng: seedPlaces.reduce((sum, s) => sum + s.lng, 0) / seedPlaces.length,
  }

  const scored = candidates.map((place) => {
    // Category similarity (30%)
    const categorySimilarity = seedCategories.has(place.category) ? 1 : 0

    // Tag overlap (25%)
    const placeTagSet = new Set(place.tags)
    const commonTags = [...seedTags].filter((t) => placeTagSet.has(t))
    const tagOverlap = seedTags.size > 0 ? commonTags.length / seedTags.size : 0

    // Rating proximity (15%) — closer to avg seed rating = higher score
    const ratingDiff = Math.abs(place.rating - avgSeedRating)
    const ratingProximity = Math.max(0, 1 - ratingDiff / 5)

    // Price level match (15%)
    const priceDiff = Math.abs(place.priceLevel - avgSeedPrice)
    const priceLevelMatch = Math.max(0, 1 - priceDiff / 4)

    // Geographic proximity (15%) — simple distance-based
    const dist = haversineDistance(place.lat, place.lng, seedCenter.lat, seedCenter.lng)
    const geographicProximity = Math.max(0, 1 - dist / 20) // 20km max

    let score =
      categorySimilarity * 0.3 +
      tagOverlap * 0.25 +
      ratingProximity * 0.15 +
      priceLevelMatch * 0.15 +
      geographicProximity * 0.15

    // Must-have bonus
    if (mustHaveTags.length > 0) {
      const hasMusts = mustHaveTags.some((t) => placeTagSet.has(t))
      if (hasMusts) score *= 1.2
    }

    // Clamp to 0-1
    score = Math.min(1, Math.max(0, score))

    const factors: ScoreFactors = { tagOverlap, categorySimilarity, ratingProximity, priceLevelMatch, geographicProximity }

    return {
      ...place,
      similarityScore: score,
      recommendationReason: generateRecommendationReason(place, seedPlaces, factors),
    }
  })

  return scored.sort((a, b) => b.similarityScore - a.similarityScore)
}

/** Generate a human-readable explanation */
export function generateRecommendationReason(
  place: PlaceData,
  seedPlaces: PlaceData[],
  factors: ScoreFactors,
): string {
  if (seedPlaces.length === 0) {
    const categoryLabel = {
      food_drink: 'Food & Drink',
      outdoors: 'Outdoors',
      activities: 'Activities',
      chill_spots: 'Chill Spots',
    }[place.category]
    return `Top rated in ${categoryLabel}`
  }

  const reasons: string[] = []

  // Find most similar seed place by tag overlap
  if ((factors.tagOverlap ?? 0) > 0.2) {
    const bestSeed = seedPlaces.reduce((best, seed) => {
      const overlap = seed.tags.filter((t) => place.tags.includes(t)).length
      const bestOverlap = best.tags.filter((t) => place.tags.includes(t)).length
      return overlap > bestOverlap ? seed : best
    }, seedPlaces[0])
    reasons.push(`Similar vibe to ${bestSeed.name}`)
  }

  if ((factors.categorySimilarity ?? 0) > 0 && reasons.length === 0) {
    reasons.push(`Matches your ${place.category.replace('_', ' ')} taste`)
  }

  if ((factors.geographicProximity ?? 0) > 0.7) {
    reasons.push('In your preferred area')
  }

  return reasons.length > 0 ? reasons.join(' · ') : `Recommended in ${place.category.replace('_', ' ')}`
}

/** Simple haversine distance in km */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
