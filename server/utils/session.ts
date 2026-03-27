import { H3Event, getCookie, setCookie, deleteCookie } from 'h3'
import { prisma } from '~/server/utils/prisma'

const SESSION_COOKIE = 'randevu_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export async function createSession(event: H3Event, userId: string): Promise<string> {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    },
  })

  setCookie(event, SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return session.id
}

export async function getSessionUser(event: H3Event) {
  const sessionId = getCookie(event, SESSION_COOKIE)
  if (!sessionId) return null

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
    }
    deleteCookie(event, SESSION_COOKIE)
    return null
  }

  // Refresh session expiry on each request
  await prisma.session.update({
    where: { id: sessionId },
    data: { expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) },
  })

  return session.user
}

export async function destroySession(event: H3Event): Promise<void> {
  const sessionId = getCookie(event, SESSION_COOKIE)
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
  }
  deleteCookie(event, SESSION_COOKIE)
}
