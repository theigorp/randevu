export type PlaceCategory = 'food_drink' | 'outdoors' | 'activities' | 'chill_spots'

export interface Place {
  googlePlaceId: string
  name: string
  category: PlaceCategory
  types: string[]
  lat: number
  lng: number
  rating: number
  priceLevel: number
  tags: string[]
  photoUrl: string | null
  openingHours: OpeningHours | null
  website: string | null
  phone: string | null
  address: string | null
  recommendationReason: string
  similarityScore: number
}

export interface OpeningHours {
  openNow?: boolean
  weekdayDescriptions?: string[]
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface UserPreferences {
  baseCityPlaceId: string
  baseCityName: string
  baseCityLat: number
  baseCityLng: number
  dietaryPreferences: Record<string, DietaryPreference>
}

export type DietaryPreference = 'must' | 'neutral' | 'dealbreaker'

export interface SeedPlace {
  id: string
  googlePlaceId: string
  name: string
  category: string
  lat: number
  lng: number
}

export interface PreferredArea {
  neighborhoodName: string
  bounds: MapBounds
}

export interface CoverageResult {
  level: 'great' | 'good' | 'limited'
  count: number
}

export interface Neighborhood {
  name: string
  bounds: MapBounds
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** Pin color mapping by category */
export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  food_drink: '#E91E63',
  outdoors: '#4CAF50',
  activities: '#2196F3',
  chill_spots: '#9C27B0',
}

/** Google type -> our category mapping */
export const GOOGLE_TYPE_TO_CATEGORY: Record<string, PlaceCategory> = {
  // Food & Drink
  restaurant: 'food_drink',
  cafe: 'food_drink',
  bar: 'food_drink',
  bakery: 'food_drink',
  meal_delivery: 'food_drink',
  meal_takeaway: 'food_drink',
  food: 'food_drink',
  coffee_shop: 'food_drink',
  ice_cream_shop: 'food_drink',
  // Outdoors
  park: 'outdoors',
  campground: 'outdoors',
  hiking_area: 'outdoors',
  national_park: 'outdoors',
  garden: 'outdoors',
  marina: 'outdoors',
  dog_park: 'outdoors',
  // Activities
  museum: 'activities',
  art_gallery: 'activities',
  movie_theater: 'activities',
  bowling_alley: 'activities',
  amusement_park: 'activities',
  aquarium: 'activities',
  zoo: 'activities',
  night_club: 'activities',
  // Chill Spots
  book_store: 'chill_spots',
  library: 'chill_spots',
  spa: 'chill_spots',
  tourist_attraction: 'chill_spots',
}

/** Dietary preference tag keys */
export const DIETARY_TAGS = [
  { key: 'vegan', label: 'Vegan options' },
  { key: 'vegetarian', label: 'Vegetarian options' },
  { key: 'cocktails', label: 'Cocktails' },
  { key: 'wine', label: 'Wine selection' },
  { key: 'meat', label: 'Meat-focused' },
  { key: 'coffee', label: 'Good coffee' },
  { key: 'craft_beer', label: 'Craft beer' },
  { key: 'gluten_free', label: 'Gluten-free' },
  { key: 'halal', label: 'Halal' },
] as const
