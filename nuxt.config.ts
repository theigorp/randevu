// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],

  runtimeConfig: {
    // Server-only keys
    googlePlacesApiKey: '',
    resendApiKey: '',
    resendFromEmail: 'noreply@randevu.app',
    magicLinkSecret: '',
    googleOAuthClientId: '',
    googleOAuthClientSecret: '',
    githubOAuthClientId: '',
    githubOAuthClientSecret: '',
    redisUrl: '',
    sessionSecret: '',
    baseUrl: 'http://localhost:3000',
    // Public keys (exposed to client)
    public: {
      appName: 'randevu',
    },
  },

  typescript: {
    strict: true,
  },

  nitro: {
    experimental: {
      asyncContext: true,
    },
    externals: {
      inline: ['generated/prisma'],
    },
  },

  alias: {
    'generated/prisma': './generated/prisma/client.ts',
  },
})
