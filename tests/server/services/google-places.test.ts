import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the service functions by mocking the low-level client
vi.mock('~/server/utils/google-places-client', () => ({
  googlePlacesRequest: vi.fn(),
  getPhotoUrl: vi.fn(),
}))

import { searchNearby, getPlaceDetails, autocomplete } from '~/server/services/google-places'
import { googlePlacesRequest, getPhotoUrl } from '~/server/utils/google-places-client'

const mockedRequest = vi.mocked(googlePlacesRequest)
const mockedPhotoUrl = vi.mocked(getPhotoUrl)

describe('google-places service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchNearby', () => {
    it('returns mapped places from Google API response', async () => {
      mockedRequest.mockResolvedValueOnce({
        places: [
          {
            id: 'place_123',
            displayName: { text: 'Test Cafe', languageCode: 'en' },
            types: ['cafe', 'food'],
            location: { latitude: 40.7128, longitude: -74.006 },
            rating: 4.5,
            priceLevel: 'PRICE_LEVEL_MODERATE',
            photos: [{ name: 'places/place_123/photos/abc', widthPx: 400, heightPx: 300 }],
          },
        ],
      })
      mockedPhotoUrl.mockReturnValue('https://places.googleapis.com/v1/places/place_123/photos/abc/media?maxWidthPx=400&key=test')

      const results = await searchNearby({
        lat: 40.7128,
        lng: -74.006,
        radius: 5000,
        types: ['cafe'],
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        googlePlaceId: 'place_123',
        name: 'Test Cafe',
        lat: 40.7128,
        lng: -74.006,
        rating: 4.5,
      })
    })

    it('returns empty array when no places found', async () => {
      mockedRequest.mockResolvedValueOnce({ places: [] })
      const results = await searchNearby({ lat: 0, lng: 0, radius: 1000 })
      expect(results).toEqual([])
    })
  })

  describe('getPlaceDetails', () => {
    it('returns full place details', async () => {
      mockedRequest.mockResolvedValueOnce({
        id: 'place_456',
        displayName: { text: 'Fancy Restaurant', languageCode: 'en' },
        types: ['restaurant'],
        location: { latitude: 40.71, longitude: -74.01 },
        rating: 4.8,
        priceLevel: 'PRICE_LEVEL_EXPENSIVE',
        formattedAddress: '123 Main St',
        websiteUri: 'https://fancy.com',
        nationalPhoneNumber: '555-1234',
        regularOpeningHours: {
          openNow: true,
          weekdayDescriptions: ['Mon: 9AM-10PM'],
        },
        servesWine: true,
        servesCocktails: true,
        outdoorSeating: true,
        photos: [],
      })

      const result = await getPlaceDetails('place_456')

      expect(result).toMatchObject({
        googlePlaceId: 'place_456',
        name: 'Fancy Restaurant',
        website: 'https://fancy.com',
        phone: '555-1234',
      })
    })
  })

  describe('autocomplete', () => {
    it('returns suggestions', async () => {
      mockedRequest.mockResolvedValueOnce({
        suggestions: [
          {
            placePrediction: {
              placeId: 'place_789',
              text: { text: 'Nice Coffee Shop' },
              structuredFormat: {
                mainText: { text: 'Nice Coffee Shop' },
                secondaryText: { text: 'Brooklyn, NY' },
              },
              types: ['cafe'],
            },
          },
        ],
      })

      const results = await autocomplete({ input: 'Nice Coffee', types: ['cafe'] })

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        placeId: 'place_789',
        mainText: 'Nice Coffee Shop',
        secondaryText: 'Brooklyn, NY',
      })
    })
  })
})
