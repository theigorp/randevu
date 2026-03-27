import { defineEventHandler } from 'h3'
import { getSessionUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  // Hydrate user on every request — available via event.context.user
  const user = await getSessionUser(event)
  event.context.user = user
})
