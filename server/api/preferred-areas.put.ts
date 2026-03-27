import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { areas } = await readBody<{
    areas: Array<{ name: string; bounds: { north: number; south: number; east: number; west: number } }>
  }>(event)

  // Replace all preferred areas atomically
  await prisma.$transaction([
    prisma.userPreferredArea.deleteMany({ where: { userId: user.id } }),
    prisma.userPreferredArea.createMany({
      data: (areas ?? []).map((a) => ({
        userId: user.id,
        neighborhoodName: a.name,
        bounds: a.bounds,
      })),
    }),
  ])

  return { success: true }
})
