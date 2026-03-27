import { defineEventHandler, getQuery, createError, sendRedirect } from 'h3'
import { createSession } from '~/server/utils/session'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { code } = getQuery(event) as { code?: string }
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Authorization code required' })
  }

  const config = useRuntimeConfig()

  // Exchange code for access token
  const tokenResponse = await $fetch<{ access_token: string }>(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: {
        client_id: config.githubOAuthClientId,
        client_secret: config.githubOAuthClientSecret,
        code,
      },
    },
  )

  // Get user email
  const emails = await $fetch<Array<{ email: string; primary: boolean; verified: boolean }>>(
    'https://api.github.com/user/emails',
    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } },
  )

  const primaryEmail = emails.find((e) => e.primary && e.verified)?.email
  if (!primaryEmail) {
    throw createError({ statusCode: 400, statusMessage: 'No verified email found on GitHub account' })
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: primaryEmail } })
  if (!user) {
    user = await prisma.user.create({
      data: { email: primaryEmail, authProvider: 'github' },
    })
  }

  await createSession(event, user.id)
  return sendRedirect(event, '/')
})
