import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const [preferences, seedPlaces, preferredAreas] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId: user.id } }),
    prisma.userSeedPlace.findMany({ where: { userId: user.id }, orderBy: { addedAt: 'desc' } }),
    prisma.userPreferredArea.findMany({ where: { userId: user.id } }),
  ])

  return {
    preferences: preferences
      ? {
          baseCityPlaceId: preferences.baseCityPlaceId,
          baseCityName: preferences.baseCityName,
          baseCityLat: preferences.baseCityLat,
          baseCityLng: preferences.baseCityLng,
          dietaryPreferences: preferences.dietaryPreferences,
        }
      : null,
    seedPlaces: seedPlaces.map((sp) => ({
      id: sp.id,
      googlePlaceId: sp.googlePlaceId,
      name: sp.name,
      category: sp.category,
      lat: sp.lat,
      lng: sp.lng,
    })),
    preferredAreas: preferredAreas.map((a) => ({
      neighborhoodName: a.neighborhoodName,
      bounds: a.bounds,
    })),
  }
})
