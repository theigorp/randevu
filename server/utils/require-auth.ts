import { H3Event, createError } from 'h3'
import { getSessionUser } from '~/server/utils/session'

export async function requireAuth(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}
