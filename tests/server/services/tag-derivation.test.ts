import { describe, it, expect } from 'vitest'
import { deriveTags } from '~/server/services/tag-derivation'
import type { PlaceDetailed } from '~/server/services/google-places'

function makePlaceData(overrides: Partial<PlaceDetailed> = {}): PlaceDetailed {
  return {
    googlePlaceId: 'test',
    name: 'Test Place',
    types: ['restaurant'],
    category: 'food_drink',
    lat: 0,
    lng: 0,
    rating: 4.0,
    priceLevel: 2,
    photoUrl: null,
    address: null,
    phone: null,
    website: null,
    openingHours: null,
    editorialSummary: null,
    servesVegetarianFood: false,
    servesBeer: false,
    servesWine: false,
    servesCocktails: false,
    servesCoffee: false,
    dineIn: false,
    delivery: false,
    takeout: false,
    outdoorSeating: false,
    photoReferences: [],
    ...overrides,
  }
}

describe('deriveTags', () => {
  it('derives tags from Google types', () => {
    const tags = deriveTags(makePlaceData({ types: ['bar', 'restaurant'] }))
    expect(tags).toContain('Bar')
    expect(tags).toContain('Restaurant')
  })

  it('derives tags from serves_* fields', () => {
    const tags = deriveTags(makePlaceData({
      servesWine: true,
      servesCocktails: true,
      servesBeer: true,
      servesVegetarianFood: true,
    }))
    expect(tags).toContain('Wine')
    expect(tags).toContain('Cocktails')
    expect(tags).toContain('Beer')
    expect(tags).toContain('Vegetarian')
  })

  it('derives tags from dineIn/delivery/takeout', () => {
    const tags = deriveTags(makePlaceData({
      dineIn: true,
      delivery: true,
      takeout: true,
    }))
    expect(tags).toContain('Dine-in')
    expect(tags).toContain('Delivery')
    expect(tags).toContain('Takeaway')
  })

  it('derives outdoor seating tag', () => {
    const tags = deriveTags(makePlaceData({ outdoorSeating: true }))
    expect(tags).toContain('Outdoor seating')
  })

  it('derives vibe tags from editorial summary', () => {
    const tags = deriveTags(makePlaceData({
      editorialSummary: 'A romantic and cozy spot with a rustic vibe',
    }))
    expect(tags).toContain('Romantic')
    expect(tags).toContain('Cozy')
  })

  it('derives price tag from priceLevel', () => {
    expect(deriveTags(makePlaceData({ priceLevel: 1 }))).toContain('Budget-friendly')
    expect(deriveTags(makePlaceData({ priceLevel: 2 }))).toContain('Mid-range')
    expect(deriveTags(makePlaceData({ priceLevel: 3 }))).toContain('Upscale')
    expect(deriveTags(makePlaceData({ priceLevel: 4 }))).toContain('Fine dining')
  })

  it('returns empty array for minimal place data', () => {
    const tags = deriveTags(makePlaceData({ types: [], priceLevel: 0 }))
    expect(tags).toEqual([])
  })
})
