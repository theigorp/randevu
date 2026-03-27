import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.ts',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#E91E63',
          green: '#4CAF50',
          blue: '#2196F3',
          purple: '#9C27B0',
        },
        pin: {
          food: '#E91E63',     // Pink — Food & Drink
          outdoors: '#4CAF50', // Green — Outdoors
          activities: '#2196F3', // Blue — Activities
          chill: '#9C27B0',    // Purple — Chill Spots
        },
      },
    },
  },
  plugins: [],
} satisfies Config
