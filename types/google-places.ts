/** Google Places API (New) response types */

export interface GooglePlaceResult {
  id: string
  displayName: { text: string; languageCode: string }
  types: string[]
  location: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  priceLevel?: GooglePriceLevel
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  regularOpeningHours?: GoogleOpeningHours
  photos?: GooglePhoto[]
  editorialSummary?: { text: string; languageCode: string }
  servesVegetarianFood?: boolean
  servesBeer?: boolean
  servesWine?: boolean
  servesCocktails?: boolean
  servesBreakfast?: boolean
  servesBrunch?: boolean
  servesLunch?: boolean
  servesDinner?: boolean
  dineIn?: boolean
  delivery?: boolean
  takeout?: boolean
  outdoorSeating?: boolean
  goodForChildren?: boolean
  goodForGroups?: boolean
  goodForWatchingSports?: boolean
  liveMusic?: boolean
  servesVeganFood?: boolean
  servesCoffee?: boolean
}

export type GooglePriceLevel =
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE'

export interface GoogleOpeningHours {
  openNow?: boolean
  periods?: Array<{
    open: { day: number; hour: number; minute: number }
    close?: { day: number; hour: number; minute: number }
  }>
  weekdayDescriptions?: string[]
}

export interface GooglePhoto {
  name: string // e.g. "places/PLACE_ID/photos/PHOTO_REF"
  widthPx: number
  heightPx: number
  authorAttributions?: Array<{
    displayName: string
    uri: string
    photoUri: string
  }>
}

export interface GoogleNearbySearchRequest {
  includedTypes?: string[]
  excludedTypes?: string[]
  maxResultCount?: number
  locationRestriction: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number // meters
    }
  }
}

export interface GoogleTextSearchRequest {
  textQuery: string
  includedType?: string
  locationBias?: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number
    }
  }
  maxResultCount?: number
}

export interface GoogleAutocompleteRequest {
  input: string
  includedPrimaryTypes?: string[]
  locationBias?: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number
    }
  }
}

export interface GoogleAutocompleteSuggestion {
  placePrediction?: {
    placeId: string
    text: { text: string }
    structuredFormat: {
      mainText: { text: string }
      secondaryText: { text: string }
    }
    types: string[]
  }
}
