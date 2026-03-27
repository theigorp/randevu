import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    authProvider: user.authProvider,
  }
})
