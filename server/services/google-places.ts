import type { GooglePlaceResult, GooglePriceLevel } from '~/types/google-places'
import type { PlaceCategory } from '~/types'
import { GOOGLE_TYPE_TO_CATEGORY } from '~/types'
import { googlePlacesRequest, getPhotoUrl } from '~/server/utils/google-places-client'

// Field masks for different query types
const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.types',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.photos',
].join(',')

const DETAIL_FIELDS = [
  'id',
  'displayName',
  'types',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'formattedAddress',
  'nationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours',
  'photos',
  'editorialSummary',
  'servesVegetarianFood',
  'servesBeer',
  'servesWine',
  'servesCocktails',
  'servesCoffee',
  'dineIn',
  'delivery',
  'takeout',
  'outdoorSeating',
].join(',')

const AUTOCOMPLETE_FIELDS = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.text',
  'suggestions.placePrediction.structuredFormat',
  'suggestions.placePrediction.types',
].join(',')

export interface SearchNearbyParams {
  lat: number
  lng: number
  radius: number
  types?: string[]
  maxResults?: number
}

export interface PlaceBasic {
  googlePlaceId: string
  name: string
  types: string[]
  category: PlaceCategory
  lat: number
  lng: number
  rating: number
  priceLevel: number
  photoUrl: string | null
  photoReferences: string[]
}

export interface PlaceDetailed extends PlaceBasic {
  address: string | null
  phone: string | null
  website: string | null
  openingHours: { openNow?: boolean; weekdayDescriptions?: string[] } | null
  editorialSummary: string | null
  servesVegetarianFood: boolean
  servesBeer: boolean
  servesWine: boolean
  servesCocktails: boolean
  servesCoffee: boolean
  dineIn: boolean
  delivery: boolean
  takeout: boolean
  outdoorSeating: boolean
  photoReferences: string[]
}

export interface AutocompleteSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
  types: string[]
}

function mapPriceLevel(level?: GooglePriceLevel): number {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  }
  return level ? (map[level] ?? 0) : 0
}

function categorizePlace(types: string[]): PlaceCategory {
  for (const type of types) {
    if (GOOGLE_TYPE_TO_CATEGORY[type]) {
      return GOOGLE_TYPE_TO_CATEGORY[type]
    }
  }
  return 'chill_spots' // default
}

function mapBasicPlace(place: GooglePlaceResult): PlaceBasic {
  const photoUrl = place.photos?.[0]
    ? getPhotoUrl(place.photos[0].name)
    : null

  return {
    googlePlaceId: place.id,
    name: place.displayName.text,
    types: place.types,
    category: categorizePlace(place.types),
    lat: place.location.latitude,
    lng: place.location.longitude,
    rating: place.rating ?? 0,
    priceLevel: mapPriceLevel(place.priceLevel),
    photoUrl,
    photoReferences: (place.photos ?? []).map((p) => p.name),
  }
}

function mapDetailedPlace(place: GooglePlaceResult): PlaceDetailed {
  const basic = mapBasicPlace(place)
  return {
    ...basic,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    openingHours: place.regularOpeningHours
      ? {
          openNow: place.regularOpeningHours.openNow,
          weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions,
        }
      : null,
    editorialSummary: place.editorialSummary?.text ?? null,
    servesVegetarianFood: place.servesVegetarianFood ?? false,
    servesBeer: place.servesBeer ?? false,
    servesWine: place.servesWine ?? false,
    servesCocktails: place.servesCocktails ?? false,
    servesCoffee: place.servesCoffee ?? false,
    dineIn: place.dineIn ?? false,
    delivery: place.delivery ?? false,
    takeout: place.takeout ?? false,
    outdoorSeating: place.outdoorSeating ?? false,
    photoReferences: (place.photos ?? []).map((p) => p.name),
  }
}

export async function searchNearby(params: SearchNearbyParams): Promise<PlaceBasic[]> {
  const { lat, lng, radius, types, maxResults = 20 } = params

  const body: Record<string, unknown> = {
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    },
    maxResultCount: maxResults,
  }
  if (types?.length) {
    body.includedTypes = types
  }

  const data = await googlePlacesRequest<{ places: GooglePlaceResult[] }>(
    '/places:searchNearby',
    { body, fieldMask: SEARCH_FIELDS.split(',') },
  )

  return (data.places ?? []).map(mapBasicPlace)
}

export async function textSearch(query: string, options?: {
  lat?: number
  lng?: number
  radius?: number
  type?: string
  maxResults?: number
}): Promise<PlaceBasic[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: options?.maxResults ?? 20,
  }
  if (options?.type) {
    body.includedType = options.type
  }
  if (options?.lat != null && options?.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: options.lat, longitude: options.lng },
        radius: options.radius ?? 10000,
      },
    }
  }

  const data = await googlePlacesRequest<{ places: GooglePlaceResult[] }>(
    '/places:searchText',
    { body, fieldMask: SEARCH_FIELDS.split(',') },
  )

  return (data.places ?? []).map(mapBasicPlace)
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailed> {
  const data = await googlePlacesRequest<GooglePlaceResult>(
    `/places/${placeId}`,
    { method: 'GET', fieldMask: DETAIL_FIELDS.split(',') },
  )

  return mapDetailedPlace(data)
}

export async function autocomplete(params: {
  input: string
  types?: string[]
  lat?: number
  lng?: number
  radius?: number
}): Promise<AutocompleteSuggestion[]> {
  const body: Record<string, unknown> = {
    input: params.input,
  }
  if (params.types?.length) {
    body.includedPrimaryTypes = params.types
  }
  if (params.lat != null && params.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: params.lat, longitude: params.lng },
        radius: params.radius ?? 50000,
      },
    }
  }

  const data = await googlePlacesRequest<{
    suggestions: Array<{
      placePrediction?: {
        placeId: string
        text: { text: string }
        structuredFormat: {
          mainText: { text: string }
          secondaryText: { text: string }
        }
        types: string[]
      }
    }>
  }>('/places:autocomplete', { body, fieldMask: AUTOCOMPLETE_FIELDS.split(',') })

  return (data.suggestions ?? [])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction!.placeId,
      mainText: s.placePrediction!.structuredFormat.mainText.text,
      secondaryText: s.placePrediction!.structuredFormat.secondaryText.text,
      types: s.placePrediction!.types,
    }))
}
