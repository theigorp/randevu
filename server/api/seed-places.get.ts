import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const places = await prisma.userSeedPlace.findMany({
    where: { userId: user.id },
    orderBy: { addedAt: 'desc' },
  })

  return places.map((p) => ({
    id: p.id,
    googlePlaceId: p.googlePlaceId,
    name: p.name,
    category: p.category,
    lat: p.lat,
    lng: p.lng,
  }))
})
