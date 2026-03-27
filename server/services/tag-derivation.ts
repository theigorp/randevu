import type { PlaceDetailed } from '~/server/services/google-places'

/** Maps Google place types to human-readable tags */
const TYPE_TAG_MAP: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  bakery: 'Bakery',
  meal_takeaway: 'Takeaway',
  coffee_shop: 'Coffee',
  ice_cream_shop: 'Ice cream',
  park: 'Park',
  museum: 'Museum',
  art_gallery: 'Gallery',
  movie_theater: 'Cinema',
  bowling_alley: 'Bowling',
  night_club: 'Nightclub',
  book_store: 'Books',
  spa: 'Spa',
  library: 'Library',
}

/** Vibe keywords to extract from editorial summaries */
const VIBE_KEYWORDS: Record<string, string> = {
  romantic: 'Romantic',
  cozy: 'Cozy',
  trendy: 'Trendy',
  lively: 'Lively',
  quiet: 'Quiet',
  rustic: 'Rustic',
  modern: 'Modern',
  casual: 'Casual',
  elegant: 'Elegant',
  hidden: 'Hidden gem',
  rooftop: 'Rooftop',
  waterfront: 'Waterfront',
  'family-friendly': 'Family-friendly',
  'pet-friendly': 'Pet-friendly',
}

/** Price level to tag */
const PRICE_TAGS: Record<number, string> = {
  1: 'Budget-friendly',
  2: 'Mid-range',
  3: 'Upscale',
  4: 'Fine dining',
}

export function deriveTags(place: PlaceDetailed): string[] {
  const tags: string[] = []

  // 1. From Google types
  for (const type of place.types) {
    if (TYPE_TAG_MAP[type]) {
      tags.push(TYPE_TAG_MAP[type])
    }
  }

  // 2. From serves_* fields
  if (place.servesVegetarianFood) tags.push('Vegetarian')
  if (place.servesBeer) tags.push('Beer')
  if (place.servesWine) tags.push('Wine')
  if (place.servesCocktails) tags.push('Cocktails')
  if (place.servesCoffee) tags.push('Coffee')

  // 3. From dineIn/delivery/takeout
  if (place.dineIn) tags.push('Dine-in')
  if (place.delivery) tags.push('Delivery')
  if (place.takeout) tags.push('Takeaway')

  // 4. From outdoorSeating
  if (place.outdoorSeating) tags.push('Outdoor seating')

  // 5. From editorial summary — keyword extraction
  if (place.editorialSummary) {
    const lower = place.editorialSummary.toLowerCase()
    for (const [keyword, tag] of Object.entries(VIBE_KEYWORDS)) {
      if (lower.includes(keyword)) {
        tags.push(tag)
      }
    }
  }

  // 6. From price level
  if (PRICE_TAGS[place.priceLevel]) {
    tags.push(PRICE_TAGS[place.priceLevel])
  }

  // Deduplicate (e.g., "Takeaway" from both type and takeout field)
  return [...new Set(tags)]
}
