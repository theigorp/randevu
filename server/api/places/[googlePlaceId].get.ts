import { defineEventHandler, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { getPlaceDetails } from '~/server/services/google-places'
import { deriveTags } from '~/server/services/tag-derivation'
import { getPhotoUrl } from '~/server/utils/google-places-client'

const CACHE_TTL = 7 * 24 * 60 * 60 // 7 days

export default defineEventHandler(async (event) => {
  const placeId = getRouterParam(event, 'googlePlaceId')
  if (!placeId) {
    throw createError({ statusCode: 400, statusMessage: 'Place ID required' })
  }

  // Check cached_places first
  const cached = await prisma.cachedPlace.findUnique({
    where: { googlePlaceId: placeId },
  })

  const isStale = cached && (Date.now() - cached.fetchedAt.getTime()) > CACHE_TTL * 1000

  if (cached && !isStale) {
    return {
      googlePlaceId: cached.googlePlaceId,
      name: cached.name,
      category: cached.category,
      types: cached.types,
      lat: cached.lat,
      lng: cached.lng,
      rating: cached.rating,
      priceLevel: cached.priceLevel,
      tags: cached.tags,
      photoUrl: cached.photoReferences[0] ? getPhotoUrl(cached.photoReferences[0]) : null,
      openingHours: cached.openingHours,
      website: cached.website,
      phone: cached.phone,
      address: cached.address,
      recommendationReason: '',
      similarityScore: 0,
    }
  }

  // Fetch from Google Places API
  const details = await getPlaceDetails(placeId)
  const tags = deriveTags(details)

  // Upsert into cache
  await prisma.cachedPlace.upsert({
    where: { googlePlaceId: placeId },
    create: {
      googlePlaceId: placeId,
      name: details.name,
      category: details.category,
      types: details.types,
      lat: details.lat,
      lng: details.lng,
      rating: details.rating,
      priceLevel: details.priceLevel,
      tags,
      photoReferences: details.photoReferences,
      openingHours: details.openingHours ?? undefined,
      website: details.website,
      phone: details.phone,
      address: details.address,
      editorialSummary: details.editorialSummary,
      cityPlaceId: '',
      fetchedAt: new Date(),
    },
    update: {
      name: details.name,
      category: details.category,
      types: details.types,
      lat: details.lat,
      lng: details.lng,
      rating: details.rating,
      priceLevel: details.priceLevel,
      tags,
      photoReferences: details.photoReferences,
      openingHours: details.openingHours ?? undefined,
      website: details.website,
      phone: details.phone,
      address: details.address,
      editorialSummary: details.editorialSummary,
      fetchedAt: new Date(),
    },
  })

  return {
    googlePlaceId: placeId,
    name: details.name,
    category: details.category,
    types: details.types,
    lat: details.lat,
    lng: details.lng,
    rating: details.rating,
    priceLevel: details.priceLevel,
    tags,
    photoUrl: details.photoReferences[0] ? getPhotoUrl(details.photoReferences[0]) : null,
    openingHours: details.openingHours,
    website: details.website,
    phone: details.phone,
    address: details.address,
    recommendationReason: '',
    similarityScore: 0,
  }
})
