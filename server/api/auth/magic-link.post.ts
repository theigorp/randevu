import { defineEventHandler, readBody, createError } from 'h3'
import { Resend } from 'resend'
import { createMagicLinkToken } from '~/server/services/magic-link'

export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email required' })
  }

  const config = useRuntimeConfig()
  const token = await createMagicLinkToken(email)
  const verifyUrl = `${config.baseUrl}/api/auth/magic-link/verify?token=${token}`

  const resend = new Resend(config.resendApiKey)
  await resend.emails.send({
    from: config.resendFromEmail,
    to: email.toLowerCase(),
    subject: 'Your randevu login link',
    html: `
      <h2>Log in to randevu</h2>
      <p>Click the link below to log in. This link expires in 15 minutes.</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#E91E63;color:white;text-decoration:none;border-radius:6px;">Log in to randevu</a>
      <p style="color:#666;font-size:12px;margin-top:16px;">If you didn't request this, you can safely ignore this email.</p>
    `,
  })

  return { success: true }
})
