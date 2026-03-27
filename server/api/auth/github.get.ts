import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const redirectUri = `${config.baseUrl}/api/auth/github/callback`

  const params = new URLSearchParams({
    client_id: config.githubOAuthClientId,
    redirect_uri: redirectUri,
    scope: 'user:email',
  })

  return sendRedirect(event, `https://github.com/login/oauth/authorize?${params}`)
})
