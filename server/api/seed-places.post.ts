import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{
    googlePlaceId: string
    name: string
    category: string
    lat: number
    lng: number
  }>(event)

  if (!body.googlePlaceId || !body.name) {
    throw createError({ statusCode: 400, statusMessage: 'googlePlaceId and name are required' })
  }

  const place = await prisma.userSeedPlace.upsert({
    where: {
      userId_googlePlaceId: { userId: user.id, googlePlaceId: body.googlePlaceId },
    },
    create: {
      userId: user.id,
      googlePlaceId: body.googlePlaceId,
      name: body.name,
      category: body.category,
      lat: body.lat,
      lng: body.lng,
    },
    update: {},
  })

  return { id: place.id, googlePlaceId: place.googlePlaceId, name: place.name }
})
