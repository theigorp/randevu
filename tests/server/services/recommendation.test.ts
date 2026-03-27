import { describe, it, expect } from 'vitest'
import {
  filterPlaces,
  rankPlaces,
  generateRecommendationReason,
} from '~/server/services/recommendation'
import type { PlaceCategory, DietaryPreference, MapBounds } from '~/types'

interface CachedPlaceInput {
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

function makePlace(overrides: Partial<CachedPlaceInput> = {}): CachedPlaceInput {
  return {
    googlePlaceId: `place_${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Place',
    category: 'food_drink',
    types: ['restaurant'],
    lat: 40.7128,
    lng: -74.006,
    rating: 4.0,
    priceLevel: 2,
    tags: ['Restaurant', 'Mid-range'],
    ...overrides,
  }
}

describe('recommendation engine', () => {
  describe('filterPlaces', () => {
    const places = [
      makePlace({ googlePlaceId: 'a', category: 'food_drink', lat: 40.71, lng: -74.01, tags: ['Vegan', 'Restaurant'] }),
      makePlace({ googlePlaceId: 'b', category: 'outdoors', lat: 40.72, lng: -74.00, tags: ['Park'] }),
      makePlace({ googlePlaceId: 'c', category: 'food_drink', lat: 40.80, lng: -73.95, tags: ['Bar', 'Cocktails'] }),
      makePlace({ googlePlaceId: 'd', category: 'activities', lat: 40.71, lng: -74.01, tags: ['Museum'] }),
    ]

    it('filters by map bounds', () => {
      const bounds: MapBounds = { north: 40.73, south: 40.70, east: -73.99, west: -74.02 }
      const filtered = filterPlaces(places, { bounds })
      expect(filtered.map((p) => p.googlePlaceId)).toEqual(['a', 'b', 'd'])
    })

    it('filters by category', () => {
      const filtered = filterPlaces(places, { categories: ['food_drink'] })
      expect(filtered.map((p) => p.googlePlaceId)).toEqual(['a', 'c'])
    })

    it('excludes deal-breaker tags', () => {
      const dietary: Record<string, DietaryPreference> = { cocktails: 'dealbreaker' }
      const filtered = filterPlaces(places, { dietaryPreferences: dietary })
      expect(filtered.map((p) => p.googlePlaceId)).not.toContain('c')
    })

    it('combines multiple filters', () => {
      const bounds: MapBounds = { north: 40.73, south: 40.70, east: -73.99, west: -74.02 }
      const filtered = filterPlaces(places, { bounds, categories: ['food_drink'] })
      expect(filtered.map((p) => p.googlePlaceId)).toEqual(['a'])
    })
  })

  describe('rankPlaces', () => {
    it('ranks by similarity to seed places', () => {
      const candidates = [
        makePlace({ googlePlaceId: 'x', category: 'food_drink', tags: ['Café', 'Cozy'], rating: 4.0, priceLevel: 2 }),
        makePlace({ googlePlaceId: 'y', category: 'food_drink', tags: ['Café', 'Cozy', 'Vegetarian'], rating: 4.5, priceLevel: 2 }),
        makePlace({ googlePlaceId: 'z', category: 'outdoors', tags: ['Park'], rating: 4.2, priceLevel: 0 }),
      ]

      const seedPlaces = [
        makePlace({ category: 'food_drink', tags: ['Café', 'Cozy', 'Vegetarian'], rating: 4.3, priceLevel: 2 }),
      ]

      const ranked = rankPlaces(candidates, seedPlaces, {})
      // 'y' should rank highest due to most tag overlap with seed
      expect(ranked[0].googlePlaceId).toBe('y')
    })

    it('applies must-have bonus', () => {
      const candidates = [
        makePlace({ googlePlaceId: 'a', tags: ['Restaurant'], rating: 4.0 }),
        makePlace({ googlePlaceId: 'b', tags: ['Vegan', 'Restaurant'], rating: 3.8 }),
      ]

      const dietary: Record<string, DietaryPreference> = { vegan: 'must' }
      const ranked = rankPlaces(candidates, [], dietary)
      // 'b' should get a must-have bonus
      expect(ranked[0].googlePlaceId).toBe('b')
    })

    it('falls back to rating sort when no seed places', () => {
      const candidates = [
        makePlace({ googlePlaceId: 'a', rating: 3.5 }),
        makePlace({ googlePlaceId: 'b', rating: 4.8 }),
        makePlace({ googlePlaceId: 'c', rating: 4.2 }),
      ]

      const ranked = rankPlaces(candidates, [], {})
      expect(ranked[0].googlePlaceId).toBe('b')
      expect(ranked[1].googlePlaceId).toBe('c')
    })
  })

  describe('generateRecommendationReason', () => {
    it('generates seed-based reason', () => {
      const reason = generateRecommendationReason(
        makePlace({ tags: ['Café', 'Cozy'] }),
        [makePlace({ name: 'My Fav Cafe', tags: ['Café', 'Cozy', 'Vegetarian'] })],
        { tagOverlap: 0.5, categorySimilarity: 0.3 },
      )
      expect(reason).toContain('My Fav Cafe')
    })

    it('generates fallback reason when no seeds', () => {
      const reason = generateRecommendationReason(
        makePlace({ category: 'food_drink', rating: 4.5 }),
        [],
        {},
      )
      expect(reason).toContain('Top rated')
    })
  })
})
