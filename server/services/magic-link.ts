import { randomBytes } from 'node:crypto'
import { prisma } from '~/server/utils/prisma'

const TOKEN_EXPIRY = 15 * 60 * 1000 // 15 minutes

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createMagicLinkToken(email: string): Promise<string> {
  const token = generateToken()

  await prisma.magicLinkToken.create({
    data: {
      email: email.toLowerCase(),
      token,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY),
    },
  })

  return token
}

export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const record = await prisma.magicLinkToken.findUnique({ where: { token } })

  if (!record) return null
  if (record.usedAt) return null
  if (record.expiresAt < new Date()) return null

  // Mark as used
  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })

  return record.email
}
