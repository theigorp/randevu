import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{
    baseCityPlaceId: string
    baseCityName: string
    baseCityLat: number
    baseCityLng: number
    dietaryPreferences?: Record<string, string>
  }>(event)

  const preferences = await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      baseCityPlaceId: body.baseCityPlaceId,
      baseCityName: body.baseCityName,
      baseCityLat: body.baseCityLat,
      baseCityLng: body.baseCityLng,
      dietaryPreferences: body.dietaryPreferences ?? {},
    },
    update: {
      baseCityPlaceId: body.baseCityPlaceId,
      baseCityName: body.baseCityName,
      baseCityLat: body.baseCityLat,
      baseCityLng: body.baseCityLng,
      dietaryPreferences: body.dietaryPreferences ?? {},
    },
  })

  return { success: true, preferences }
})
