import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const redirectUri = `${config.baseUrl}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: config.googleOAuthClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  })

  return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})
