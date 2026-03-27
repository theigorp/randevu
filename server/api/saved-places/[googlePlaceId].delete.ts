import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const googlePlaceId = getRouterParam(event, 'googlePlaceId')

  if (!googlePlaceId) {
    throw createError({ statusCode: 400, statusMessage: 'Place ID required' })
  }

  await prisma.userSavedPlace.deleteMany({
    where: { userId: user.id, googlePlaceId },
  })

  return { success: true }
})
