import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const saved = await prisma.userSavedPlace.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: 'desc' },
  })

  return saved.map((s) => ({
    googlePlaceId: s.googlePlaceId,
    name: s.name,
    category: s.category,
    savedAt: s.savedAt,
  }))
})
