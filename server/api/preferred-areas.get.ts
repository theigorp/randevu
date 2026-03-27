import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const areas = await prisma.userPreferredArea.findMany({
    where: { userId: user.id },
  })

  return areas.map((a) => ({
    neighborhoodName: a.neighborhoodName,
    bounds: a.bounds,
  }))
})
