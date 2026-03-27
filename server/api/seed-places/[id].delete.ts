import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID required' })
  }

  const place = await prisma.userSeedPlace.findFirst({
    where: { id, userId: user.id },
  })

  if (!place) {
    throw createError({ statusCode: 404, statusMessage: 'Seed place not found' })
  }

  await prisma.userSeedPlace.delete({ where: { id } })
  return { success: true }
})
