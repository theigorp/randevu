import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{
    googlePlaceId: string
    name: string
    category: string
  }>(event)

  if (!body.googlePlaceId || !body.name) {
    throw createError({ statusCode: 400, statusMessage: 'googlePlaceId and name are required' })
  }

  const saved = await prisma.userSavedPlace.upsert({
    where: {
      userId_googlePlaceId: { userId: user.id, googlePlaceId: body.googlePlaceId },
    },
    create: {
      userId: user.id,
      googlePlaceId: body.googlePlaceId,
      name: body.name,
      category: body.category,
    },
    update: {},
  })

  return { googlePlaceId: saved.googlePlaceId, name: saved.name }
})
