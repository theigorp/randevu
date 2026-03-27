import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{
    preferences?: {
      baseCityPlaceId: string
      baseCityName: string
      baseCityLat: number
      baseCityLng: number
      dietaryPreferences: Record<string, string>
    }
    seedPlaces?: Array<{ googlePlaceId: string; name: string; category: string; lat: number; lng: number }>
    preferredAreas?: Array<{ neighborhoodName: string; bounds: object }>
    savedPlaces?: Array<{ googlePlaceId: string; name: string; category: string }>
  }>(event)

  await prisma.$transaction(async (tx) => {
    // Preferences: keep existing if present, else adopt guest
    const existing = await tx.userPreference.findUnique({ where: { userId: user.id } })
    if (!existing && body.preferences) {
      await tx.userPreference.create({
        data: {
          userId: user.id,
          baseCityPlaceId: body.preferences.baseCityPlaceId,
          baseCityName: body.preferences.baseCityName,
          baseCityLat: body.preferences.baseCityLat,
          baseCityLng: body.preferences.baseCityLng,
          dietaryPreferences: body.preferences.dietaryPreferences,
        },
      })
    }

    // Seed places: union, deduplicate by googlePlaceId
    if (body.seedPlaces?.length) {
      for (const sp of body.seedPlaces) {
        await tx.userSeedPlace.upsert({
          where: { userId_googlePlaceId: { userId: user.id, googlePlaceId: sp.googlePlaceId } },
          create: { userId: user.id, ...sp },
          update: {},
        })
      }
    }

    // Preferred areas: union, deduplicate by neighborhoodName
    if (body.preferredAreas?.length) {
      for (const area of body.preferredAreas) {
        await tx.userPreferredArea.upsert({
          where: { userId_neighborhoodName: { userId: user.id, neighborhoodName: area.neighborhoodName } },
          create: { userId: user.id, neighborhoodName: area.neighborhoodName, bounds: area.bounds as any },
          update: {},
        })
      }
    }

    // Saved places: union, deduplicate by googlePlaceId
    if (body.savedPlaces?.length) {
      for (const sp of body.savedPlaces) {
        await tx.userSavedPlace.upsert({
          where: { userId_googlePlaceId: { userId: user.id, googlePlaceId: sp.googlePlaceId } },
          create: { userId: user.id, ...sp },
          update: {},
        })
      }
    }
  })

  return { success: true }
})
