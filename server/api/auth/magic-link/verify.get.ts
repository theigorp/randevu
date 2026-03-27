import { defineEventHandler, getQuery, createError, sendRedirect } from 'h3'
import { verifyMagicLinkToken } from '~/server/services/magic-link'
import { createSession } from '~/server/utils/session'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event) as { token?: string }

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token required' })
  }

  const email = await verifyMagicLinkToken(token)
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired token' })
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: { email, authProvider: 'magic_link' },
    })
  }

  await createSession(event, user.id)
  return sendRedirect(event, '/')
})
