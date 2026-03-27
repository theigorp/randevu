import { defineEventHandler, getQuery, createError, sendRedirect } from 'h3'
import { createSession } from '~/server/utils/session'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { code } = getQuery(event) as { code?: string }
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Authorization code required' })
  }

  const config = useRuntimeConfig()
  const redirectUri = `${config.baseUrl}/api/auth/google/callback`

  // Exchange code for tokens
  const tokenResponse = await $fetch<{
    access_token: string
    id_token: string
  }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: {
      code,
      client_id: config.googleOAuthClientId,
      client_secret: config.googleOAuthClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    },
  })

  // Get user info
  const userInfo = await $fetch<{
    sub: string
    email: string
    name: string
  }>('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
  })

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: userInfo.email } })
  if (!user) {
    user = await prisma.user.create({
      data: { email: userInfo.email, authProvider: 'google' },
    })
  }

  await createSession(event, user.id)
  return sendRedirect(event, '/')
})
