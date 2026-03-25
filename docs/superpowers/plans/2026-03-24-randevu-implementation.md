# Randevu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a date recommendation app that suggests places based on user preferences, powered by Google Places API with a Zillow-style map + list interface.

**Architecture:** Full-stack Nuxt 3 with Vue 3 + TypeScript frontend, Prisma ORM + PostgreSQL backend, Leaflet maps, and a similarity-based recommendation engine. Server-side rendering with API routes handling business logic. Redis caching in production, in-memory for development.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, Pinia, Prisma, PostgreSQL, Leaflet + OpenStreetMap, Google Places API (New), Resend, Redis, Tailwind CSS, Vitest

---

## File Structure

```
randevu/
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── tailwind.config.ts
├── .env.example
├── CLAUDE.md
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── server/
│   ├── middleware/
│   │   └── 01.session.ts              # Session hydration middleware
│   ├── utils/
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   ├── session.ts                  # Session helpers (get/set/destroy)
│   │   ├── cache.ts                    # Cache service (Redis / in-memory)
│   │   ├── require-auth.ts             # Auth guard helper
│   │   └── google-places-client.ts     # Low-level HTTP client for Google Places API
│   ├── services/
│   │   ├── google-places.ts            # High-level Places service (search, details, autocomplete)
│   │   ├── tag-derivation.ts           # Derive tags from Google Places data
│   │   ├── recommendation.ts           # Recommendation engine (filter + rank)
│   │   └── magic-link.ts              # Magic link token generation & verification
│   └── api/
│       ├── auth/
│       │   ├── magic-link.post.ts
│       │   ├── magic-link/
│       │   │   └── verify.get.ts
│       │   ├── google.get.ts
│       │   ├── google/
│       │   │   └── callback.get.ts
│       │   ├── github.get.ts
│       │   ├── github/
│       │   │   └── callback.get.ts
│       │   ├── logout.post.ts
│       │   └── me.get.ts
│       ├── preferences.get.ts
│       ├── preferences.put.ts
│       ├── seed-places.get.ts
│       ├── seed-places.post.ts
│       ├── seed-places/
│       │   └── [id].delete.ts
│       ├── preferred-areas.get.ts
│       ├── preferred-areas.put.ts
│       ├── recommendations.get.ts
│       ├── places/
│       │   └── [googlePlaceId].get.ts
│       ├── saved-places.get.ts
│       ├── saved-places.post.ts
│       ├── saved-places/
│       │   └── [googlePlaceId].delete.ts
│       ├── city-coverage.get.ts
│       └── neighborhoods.get.ts
├── types/
│   ├── index.ts                        # Shared TypeScript types
│   └── google-places.ts               # Google Places API response types
├── stores/
│   ├── auth.ts
│   ├── preferences.ts
│   ├── recommendations.ts
│   ├── favorites.ts
│   └── map.ts
├── composables/
│   ├── useGoogleAutocomplete.ts
│   └── useMapBounds.ts
├── components/
│   ├── layout/
│   │   └── NavBar.vue
│   ├── onboarding/
│   │   ├── OnboardingWizard.vue
│   │   ├── StepBaseCity.vue
│   │   ├── StepSeedPlaces.vue
│   │   ├── StepDietaryPrefs.vue
│   │   └── StepPreferredAreas.vue
│   ├── map/
│   │   └── MapContainer.vue
│   ├── places/
│   │   ├── PlaceCard.vue
│   │   ├── PlaceList.vue
│   │   └── DetailDrawer.vue
│   ├── favorites/
│   │   └── HeartButton.vue
│   └── ui/
│       ├── CoverageIndicator.vue
│       ├── ThreeStateToggle.vue
│       └── NeighborhoodChip.vue
├── pages/
│   ├── index.vue                       # Main recommendations view
│   ├── favorites.vue                   # Favorites page
│   └── onboarding.vue                  # Onboarding wizard page
├── layouts/
│   └── default.vue
├── app.vue
└── tests/
    ├── server/
    │   ├── services/
    │   │   ├── google-places.test.ts
    │   │   ├── tag-derivation.test.ts
    │   │   └── recommendation.test.ts
    │   ├── utils/
    │   │   └── cache.test.ts
    │   └── api/
    │       ├── preferences.test.ts
    │       ├── recommendations.test.ts
    │       └── saved-places.test.ts
    └── components/
        ├── onboarding/
        │   └── OnboardingWizard.test.ts
        └── places/
            └── PlaceCard.test.ts
```

---

## Phase A: Backend Core

### Task 1: Project Foundation & Configuration

**Files:**
- Create: `nuxt.config.ts`, `package.json`, `vitest.config.ts`, `tailwind.config.ts`, `.env.example`, `CLAUDE.md`, `app.vue`, `layouts/default.vue`

- [ ] **Step 1: Initialize Nuxt 3 project**

Run:
```bash
npx nuxi@latest init . --force --packageManager npm
```

- [ ] **Step 2: Install core dependencies**

Run:
```bash
npm install @prisma/client pinia @pinia/nuxt leaflet resend ioredis
npm install -D prisma @nuxtjs/tailwindcss @types/leaflet vitest @nuxt/test-utils @vue/test-utils happy-dom tailwindcss
```

- [ ] **Step 3: Configure nuxt.config.ts**

```typescript
// nuxt.config.ts
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
  },
})
```

- [ ] **Step 4: Create Tailwind config**

```typescript
// tailwind.config.ts
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
```

- [ ] **Step 5: Create Vitest config**

```typescript
// vitest.config.ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environmentMatchGlobs: [
      ['tests/server/**', 'node'],
      ['tests/components/**', 'nuxt'],
    ],
  },
})
```

- [ ] **Step 6: Create .env.example**

```bash
# .env.example
# Google Places API
NUXT_GOOGLE_PLACES_API_KEY=

# Resend (magic link emails)
NUXT_RESEND_API_KEY=
NUXT_RESEND_FROM_EMAIL=noreply@randevu.app

# Magic link
NUXT_MAGIC_LINK_SECRET=generate-a-random-32-char-string

# Google OAuth
NUXT_GOOGLE_OAUTH_CLIENT_ID=
NUXT_GOOGLE_OAUTH_CLIENT_SECRET=

# GitHub OAuth
NUXT_GITHUB_OAUTH_CLIENT_ID=
NUXT_GITHUB_OAUTH_CLIENT_SECRET=

# Redis (leave empty for in-memory in dev)
NUXT_REDIS_URL=

# Session
NUXT_SESSION_SECRET=generate-a-random-32-char-string

# App
NUXT_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/randevu
```

- [ ] **Step 7: Create app.vue and default layout**

```vue
<!-- app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

```vue
<!-- layouts/default.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <slot />
  </div>
</template>
```

- [ ] **Step 8: Create CLAUDE.md**

```markdown
# Randevu

Date recommendation app — Nuxt 3 full-stack with Google Places API.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npx vitest` — run all tests
- `npx vitest run tests/server` — run server tests only
- `npx vitest run tests/components` — run component tests only
- `npx prisma migrate dev` — run database migrations
- `npx prisma generate` — regenerate Prisma client
- `npx prisma studio` — open Prisma Studio

## Architecture
- `server/utils/` — auto-imported server utilities (Prisma, cache, session)
- `server/services/` — business logic (Google Places, recommendations, auth)
- `server/api/` — API route handlers (file-based routing: `name.method.ts`)
- `stores/` — Pinia stores (auto-imported)
- `composables/` — Vue composables (auto-imported)
- `components/` — Vue components (auto-imported)
- `types/` — shared TypeScript types

## Conventions
- API routes use Nuxt file-based routing: `server/api/foo.get.ts` → `GET /api/foo`
- Server utils in `server/utils/` are auto-imported in server context
- Use `createError` from h3 for API errors
- Tests live in `tests/` mirroring the source structure
- Prisma schema in `prisma/schema.prisma`
```

- [ ] **Step 9: Verify project starts**

Run: `npx nuxi prepare && npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: initialize Nuxt 3 project with TypeScript, Tailwind, Vitest, Pinia"
```

---

### Task 2: Database Schema & Prisma Setup

**Files:**
- Create: `prisma/schema.prisma`, `server/utils/prisma.ts`

- [ ] **Step 1: Initialize Prisma**

Run:
```bash
npx prisma init
```

This creates `prisma/schema.prisma` and updates `.env`. Edit the schema:

- [ ] **Step 2: Write the Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AuthProvider {
  magic_link
  google
  github
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  email         String?  @unique
  authProvider  AuthProvider @map("auth_provider")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  preferences    UserPreference?
  seedPlaces     UserSeedPlace[]
  preferredAreas UserPreferredArea[]
  savedPlaces    UserSavedPlace[]
  sessions       Session[]

  @@map("users")
}

model UserPreference {
  id              String  @id @default(uuid()) @db.Uuid
  userId          String  @unique @map("user_id") @db.Uuid
  baseCityPlaceId String  @map("base_city_place_id")
  baseCityName    String  @map("base_city_name")
  baseCityLat     Float   @map("base_city_lat")
  baseCityLng     Float   @map("base_city_lng")
  dietaryPreferences Json? @default("{}") @map("dietary_preferences")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}

model UserSeedPlace {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  googlePlaceId String   @map("google_place_id")
  name          String
  category      String
  lat           Float
  lng           Float
  addedAt       DateTime @default(now()) @map("added_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, googlePlaceId])
  @@map("user_seed_places")
}

model UserPreferredArea {
  id               String @id @default(uuid()) @db.Uuid
  userId           String @map("user_id") @db.Uuid
  neighborhoodName String @map("neighborhood_name")
  bounds           Json

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, neighborhoodName])
  @@map("user_preferred_areas")
}

model UserSavedPlace {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  googlePlaceId String   @map("google_place_id")
  name          String
  category      String
  savedAt       DateTime @default(now()) @map("saved_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, googlePlaceId])
  @@map("user_saved_places")
}

model CachedPlace {
  googlePlaceId   String   @id @map("google_place_id")
  name            String
  category        String
  types           String[]
  lat             Float
  lng             Float
  rating          Float    @default(0)
  priceLevel      Int      @default(0) @map("price_level")
  tags            String[]
  photoReferences String[] @map("photo_references")
  openingHours    Json?    @map("opening_hours")
  website         String?
  phone           String?
  address         String?
  editorialSummary String? @map("editorial_summary")
  fetchedAt       DateTime @default(now()) @map("fetched_at")
  cityPlaceId     String   @map("city_place_id")

  @@map("cached_places")
}

model Session {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model MagicLinkToken {
  id        String   @id @default(uuid()) @db.Uuid
  email     String
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("magic_link_tokens")
}
```

- [ ] **Step 3: Create Prisma client singleton**

```typescript
// server/utils/prisma.ts
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

declare global {
  var __prisma: PrismaClient | undefined
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  // Reuse client in dev to avoid too many connections
  if (!global.__prisma) {
    global.__prisma = new PrismaClient()
  }
  prisma = global.__prisma
}

export { prisma }
```

- [ ] **Step 4: Run initial migration**

Run:
```bash
npx prisma migrate dev --name init
```
Expected: Migration created and applied successfully. Prisma Client generated.

- [ ] **Step 5: Verify Prisma client generation**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client`

- [ ] **Step 6: Commit**

```bash
git add prisma/ server/utils/prisma.ts
git commit -m "feat: add Prisma schema with all data models and initial migration"
```

---

### Task 3: Shared TypeScript Types

**Files:**
- Create: `types/index.ts`, `types/google-places.ts`

- [ ] **Step 1: Create Google Places API response types**

```typescript
// types/google-places.ts

/** Google Places API (New) response types */

export interface GooglePlaceResult {
  id: string
  displayName: { text: string; languageCode: string }
  types: string[]
  location: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  priceLevel?: GooglePriceLevel
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  regularOpeningHours?: GoogleOpeningHours
  photos?: GooglePhoto[]
  editorialSummary?: { text: string; languageCode: string }
  servesVegetarianFood?: boolean
  servesBeer?: boolean
  servesWine?: boolean
  servesCocktails?: boolean
  servesBreakfast?: boolean
  servesBrunch?: boolean
  servesLunch?: boolean
  servesDinner?: boolean
  dineIn?: boolean
  delivery?: boolean
  takeout?: boolean
  outdoorSeating?: boolean
  goodForChildren?: boolean
  goodForGroups?: boolean
  goodForWatchingSports?: boolean
  liveMusic?: boolean
  servesVeganFood?: boolean  // Note: may not exist in API, derived from types/reviews
  servesCoffee?: boolean
}

export type GooglePriceLevel =
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE'

export interface GoogleOpeningHours {
  openNow?: boolean
  periods?: Array<{
    open: { day: number; hour: number; minute: number }
    close?: { day: number; hour: number; minute: number }
  }>
  weekdayDescriptions?: string[]
}

export interface GooglePhoto {
  name: string // e.g. "places/PLACE_ID/photos/PHOTO_REF"
  widthPx: number
  heightPx: number
  authorAttributions?: Array<{
    displayName: string
    uri: string
    photoUri: string
  }>
}

export interface GoogleNearbySearchRequest {
  includedTypes?: string[]
  excludedTypes?: string[]
  maxResultCount?: number
  locationRestriction: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number // meters
    }
  }
}

export interface GoogleTextSearchRequest {
  textQuery: string
  includedType?: string
  locationBias?: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number
    }
  }
  maxResultCount?: number
}

export interface GoogleAutocompleteRequest {
  input: string
  includedPrimaryTypes?: string[]
  locationBias?: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number
    }
  }
}

export interface GoogleAutocompleteSuggestion {
  placePrediction?: {
    placeId: string
    text: { text: string }
    structuredFormat: {
      mainText: { text: string }
      secondaryText: { text: string }
    }
    types: string[]
  }
}
```

- [ ] **Step 2: Create shared application types**

```typescript
// types/index.ts

export type PlaceCategory = 'food_drink' | 'outdoors' | 'activities' | 'chill_spots'

export interface Place {
  googlePlaceId: string
  name: string
  category: PlaceCategory
  types: string[]
  lat: number
  lng: number
  rating: number
  priceLevel: number
  tags: string[]
  photoUrl: string | null
  openingHours: OpeningHours | null
  website: string | null
  phone: string | null
  address: string | null
  recommendationReason: string
  similarityScore: number
}

export interface OpeningHours {
  openNow?: boolean
  weekdayDescriptions?: string[]
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface UserPreferences {
  baseCityPlaceId: string
  baseCityName: string
  baseCityLat: number
  baseCityLng: number
  dietaryPreferences: Record<string, DietaryPreference>
}

export type DietaryPreference = 'must' | 'neutral' | 'dealbreaker'

export interface SeedPlace {
  id: string
  googlePlaceId: string
  name: string
  category: string
  lat: number
  lng: number
}

export interface PreferredArea {
  neighborhoodName: string
  bounds: MapBounds
}

export interface CoverageResult {
  level: 'great' | 'good' | 'limited'
  count: number
}

export interface Neighborhood {
  name: string
  bounds: MapBounds
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** Pin color mapping by category */
export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  food_drink: '#E91E63',
  outdoors: '#4CAF50',
  activities: '#2196F3',
  chill_spots: '#9C27B0',
}

/** Google type → our category mapping */
export const GOOGLE_TYPE_TO_CATEGORY: Record<string, PlaceCategory> = {
  // Food & Drink
  restaurant: 'food_drink',
  cafe: 'food_drink',
  bar: 'food_drink',
  bakery: 'food_drink',
  meal_delivery: 'food_drink',
  meal_takeaway: 'food_drink',
  food: 'food_drink',
  coffee_shop: 'food_drink',
  ice_cream_shop: 'food_drink',
  // Outdoors
  park: 'outdoors',
  campground: 'outdoors',
  hiking_area: 'outdoors',
  national_park: 'outdoors',
  garden: 'outdoors',
  marina: 'outdoors',
  dog_park: 'outdoors',
  // Activities
  museum: 'activities',
  art_gallery: 'activities',
  movie_theater: 'activities',
  bowling_alley: 'activities',
  amusement_park: 'activities',
  aquarium: 'activities',
  zoo: 'activities',
  night_club: 'activities',
  // Chill Spots
  book_store: 'chill_spots',
  library: 'chill_spots',
  spa: 'chill_spots',
  tourist_attraction: 'chill_spots',
}

/** Dietary preference tag keys */
export const DIETARY_TAGS = [
  { key: 'vegan', label: 'Vegan options' },
  { key: 'vegetarian', label: 'Vegetarian options' },
  { key: 'cocktails', label: 'Cocktails' },
  { key: 'wine', label: 'Wine selection' },
  { key: 'meat', label: 'Meat-focused' },
  { key: 'coffee', label: 'Good coffee' },
  { key: 'craft_beer', label: 'Craft beer' },
  { key: 'gluten_free', label: 'Gluten-free' },
  { key: 'halal', label: 'Halal' },
] as const
```

- [ ] **Step 3: Commit**

```bash
git add types/
git commit -m "feat: add shared TypeScript types for Places, preferences, and Google API"
```

---

### Task 4: Google Places API Client

**Files:**
- Create: `server/utils/google-places-client.ts`, `server/services/google-places.ts`, `tests/server/services/google-places.test.ts`

- [ ] **Step 1: Write the failing test for the Google Places service**

```typescript
// tests/server/services/google-places.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the service functions by mocking the low-level client
vi.mock('~/server/utils/google-places-client', () => ({
  googlePlacesRequest: vi.fn(),
  getPhotoUrl: vi.fn(),
}))

import { searchNearby, getPlaceDetails, autocomplete } from '~/server/services/google-places'
import { googlePlacesRequest, getPhotoUrl } from '~/server/utils/google-places-client'

const mockedRequest = vi.mocked(googlePlacesRequest)
const mockedPhotoUrl = vi.mocked(getPhotoUrl)

describe('google-places service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchNearby', () => {
    it('returns mapped places from Google API response', async () => {
      mockedRequest.mockResolvedValueOnce({
        places: [
          {
            id: 'place_123',
            displayName: { text: 'Test Cafe', languageCode: 'en' },
            types: ['cafe', 'food'],
            location: { latitude: 40.7128, longitude: -74.006 },
            rating: 4.5,
            priceLevel: 'PRICE_LEVEL_MODERATE',
            photos: [{ name: 'places/place_123/photos/abc', widthPx: 400, heightPx: 300 }],
          },
        ],
      })
      mockedPhotoUrl.mockReturnValue('https://places.googleapis.com/v1/places/place_123/photos/abc/media?maxWidthPx=400&key=test')

      const results = await searchNearby({
        lat: 40.7128,
        lng: -74.006,
        radius: 5000,
        types: ['cafe'],
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        googlePlaceId: 'place_123',
        name: 'Test Cafe',
        lat: 40.7128,
        lng: -74.006,
        rating: 4.5,
      })
    })

    it('returns empty array when no places found', async () => {
      mockedRequest.mockResolvedValueOnce({ places: [] })
      const results = await searchNearby({ lat: 0, lng: 0, radius: 1000 })
      expect(results).toEqual([])
    })
  })

  describe('getPlaceDetails', () => {
    it('returns full place details', async () => {
      mockedRequest.mockResolvedValueOnce({
        id: 'place_456',
        displayName: { text: 'Fancy Restaurant', languageCode: 'en' },
        types: ['restaurant'],
        location: { latitude: 40.71, longitude: -74.01 },
        rating: 4.8,
        priceLevel: 'PRICE_LEVEL_EXPENSIVE',
        formattedAddress: '123 Main St',
        websiteUri: 'https://fancy.com',
        nationalPhoneNumber: '555-1234',
        regularOpeningHours: {
          openNow: true,
          weekdayDescriptions: ['Mon: 9AM-10PM'],
        },
        servesWine: true,
        servesCocktails: true,
        outdoorSeating: true,
        photos: [],
      })

      const result = await getPlaceDetails('place_456')

      expect(result).toMatchObject({
        googlePlaceId: 'place_456',
        name: 'Fancy Restaurant',
        website: 'https://fancy.com',
        phone: '555-1234',
      })
    })
  })

  describe('autocomplete', () => {
    it('returns suggestions', async () => {
      mockedRequest.mockResolvedValueOnce({
        suggestions: [
          {
            placePrediction: {
              placeId: 'place_789',
              text: { text: 'Nice Coffee Shop' },
              structuredFormat: {
                mainText: { text: 'Nice Coffee Shop' },
                secondaryText: { text: 'Brooklyn, NY' },
              },
              types: ['cafe'],
            },
          },
        ],
      })

      const results = await autocomplete({ input: 'Nice Coffee', types: ['cafe'] })

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        placeId: 'place_789',
        mainText: 'Nice Coffee Shop',
        secondaryText: 'Brooklyn, NY',
      })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/services/google-places.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create the low-level Google Places HTTP client**

```typescript
// server/utils/google-places-client.ts

const GOOGLE_PLACES_BASE = 'https://places.googleapis.com/v1'

function getApiKey(): string {
  const config = useRuntimeConfig()
  return config.googlePlacesApiKey
}

export async function googlePlacesRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
    fieldMask?: string[]
  } = {},
): Promise<T> {
  const { method = 'POST', body, fieldMask } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': getApiKey(),
  }
  if (fieldMask?.length) {
    headers['X-Goog-FieldMask'] = fieldMask.join(',')
  }

  const url = `${GOOGLE_PLACES_BASE}${path}`
  const response = await $fetch<T>(url, {
    method,
    headers,
    body: method === 'POST' ? body : undefined,
  })

  return response
}

export function getPhotoUrl(photoName: string, maxWidthPx: number = 400): string {
  return `${GOOGLE_PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${getApiKey()}`
}
```

- [ ] **Step 4: Create the high-level Google Places service**

```typescript
// server/services/google-places.ts
import type { GooglePlaceResult, GooglePriceLevel } from '~/types/google-places'
import type { PlaceCategory } from '~/types'
import { GOOGLE_TYPE_TO_CATEGORY } from '~/types'
import { googlePlacesRequest, getPhotoUrl } from '~/server/utils/google-places-client'

// Field masks for different query types
const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.types',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.photos',
].join(',')

const DETAIL_FIELDS = [
  'id',
  'displayName',
  'types',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'formattedAddress',
  'nationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours',
  'photos',
  'editorialSummary',
  'servesVegetarianFood',
  'servesBeer',
  'servesWine',
  'servesCocktails',
  'servesCoffee',
  'dineIn',
  'delivery',
  'takeout',
  'outdoorSeating',
].join(',')

const AUTOCOMPLETE_FIELDS = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.text',
  'suggestions.placePrediction.structuredFormat',
  'suggestions.placePrediction.types',
].join(',')

export interface SearchNearbyParams {
  lat: number
  lng: number
  radius: number
  types?: string[]
  maxResults?: number
}

export interface PlaceBasic {
  googlePlaceId: string
  name: string
  types: string[]
  category: PlaceCategory
  lat: number
  lng: number
  rating: number
  priceLevel: number
  photoUrl: string | null
}

export interface PlaceDetailed extends PlaceBasic {
  address: string | null
  phone: string | null
  website: string | null
  openingHours: { openNow?: boolean; weekdayDescriptions?: string[] } | null
  editorialSummary: string | null
  servesVegetarianFood: boolean
  servesBeer: boolean
  servesWine: boolean
  servesCocktails: boolean
  servesCoffee: boolean
  dineIn: boolean
  delivery: boolean
  takeout: boolean
  outdoorSeating: boolean
  photoReferences: string[]
}

export interface AutocompleteSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
  types: string[]
}

function mapPriceLevel(level?: GooglePriceLevel): number {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  }
  return level ? (map[level] ?? 0) : 0
}

function categorizePlace(types: string[]): PlaceCategory {
  for (const type of types) {
    if (GOOGLE_TYPE_TO_CATEGORY[type]) {
      return GOOGLE_TYPE_TO_CATEGORY[type]
    }
  }
  return 'chill_spots' // default
}

function mapBasicPlace(place: GooglePlaceResult): PlaceBasic {
  const photoUrl = place.photos?.[0]
    ? getPhotoUrl(place.photos[0].name)
    : null

  return {
    googlePlaceId: place.id,
    name: place.displayName.text,
    types: place.types,
    category: categorizePlace(place.types),
    lat: place.location.latitude,
    lng: place.location.longitude,
    rating: place.rating ?? 0,
    priceLevel: mapPriceLevel(place.priceLevel),
    photoUrl,
  }
}

function mapDetailedPlace(place: GooglePlaceResult): PlaceDetailed {
  const basic = mapBasicPlace(place)
  return {
    ...basic,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    openingHours: place.regularOpeningHours
      ? {
          openNow: place.regularOpeningHours.openNow,
          weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions,
        }
      : null,
    editorialSummary: place.editorialSummary?.text ?? null,
    servesVegetarianFood: place.servesVegetarianFood ?? false,
    servesBeer: place.servesBeer ?? false,
    servesWine: place.servesWine ?? false,
    servesCocktails: place.servesCocktails ?? false,
    servesCoffee: place.servesCoffee ?? false,
    dineIn: place.dineIn ?? false,
    delivery: place.delivery ?? false,
    takeout: place.takeout ?? false,
    outdoorSeating: place.outdoorSeating ?? false,
    photoReferences: (place.photos ?? []).map((p) => p.name),
  }
}

export async function searchNearby(params: SearchNearbyParams): Promise<PlaceBasic[]> {
  const { lat, lng, radius, types, maxResults = 20 } = params

  const body: Record<string, unknown> = {
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    },
    maxResultCount: maxResults,
  }
  if (types?.length) {
    body.includedTypes = types
  }

  const data = await googlePlacesRequest<{ places: GooglePlaceResult[] }>(
    '/places:searchNearby',
    { body, fieldMask: SEARCH_FIELDS.split(',') },
  )

  return (data.places ?? []).map(mapBasicPlace)
}

export async function textSearch(query: string, options?: {
  lat?: number
  lng?: number
  radius?: number
  type?: string
  maxResults?: number
}): Promise<PlaceBasic[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: options?.maxResults ?? 20,
  }
  if (options?.type) {
    body.includedType = options.type
  }
  if (options?.lat != null && options?.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: options.lat, longitude: options.lng },
        radius: options.radius ?? 10000,
      },
    }
  }

  const data = await googlePlacesRequest<{ places: GooglePlaceResult[] }>(
    '/places:searchText',
    { body, fieldMask: SEARCH_FIELDS.split(',') },
  )

  return (data.places ?? []).map(mapBasicPlace)
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailed> {
  const data = await googlePlacesRequest<GooglePlaceResult>(
    `/places/${placeId}`,
    { method: 'GET', fieldMask: DETAIL_FIELDS.split(',') },
  )

  return mapDetailedPlace(data)
}

export async function autocomplete(params: {
  input: string
  types?: string[]
  lat?: number
  lng?: number
  radius?: number
}): Promise<AutocompleteSuggestion[]> {
  const body: Record<string, unknown> = {
    input: params.input,
  }
  if (params.types?.length) {
    body.includedPrimaryTypes = params.types
  }
  if (params.lat != null && params.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: params.lat, longitude: params.lng },
        radius: params.radius ?? 50000,
      },
    }
  }

  const data = await googlePlacesRequest<{
    suggestions: Array<{
      placePrediction?: {
        placeId: string
        text: { text: string }
        structuredFormat: {
          mainText: { text: string }
          secondaryText: { text: string }
        }
        types: string[]
      }
    }>
  }>('/places:autocomplete', { body, fieldMask: AUTOCOMPLETE_FIELDS.split(',') })

  return (data.suggestions ?? [])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction!.placeId,
      mainText: s.placePrediction!.structuredFormat.mainText.text,
      secondaryText: s.placePrediction!.structuredFormat.secondaryText.text,
      types: s.placePrediction!.types,
    }))
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/server/services/google-places.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/utils/google-places-client.ts server/services/google-places.ts tests/server/services/google-places.test.ts
git commit -m "feat: add Google Places API client and service with tests"
```

---

### Task 5: Tag Derivation Service

**Files:**
- Create: `server/services/tag-derivation.ts`, `tests/server/services/tag-derivation.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/server/services/tag-derivation.test.ts
import { describe, it, expect } from 'vitest'
import { deriveTags } from '~/server/services/tag-derivation'
import type { PlaceDetailed } from '~/server/services/google-places'

function makePlaceData(overrides: Partial<PlaceDetailed> = {}): PlaceDetailed {
  return {
    googlePlaceId: 'test',
    name: 'Test Place',
    types: ['restaurant'],
    category: 'food_drink',
    lat: 0,
    lng: 0,
    rating: 4.0,
    priceLevel: 2,
    photoUrl: null,
    address: null,
    phone: null,
    website: null,
    openingHours: null,
    editorialSummary: null,
    servesVegetarianFood: false,
    servesBeer: false,
    servesWine: false,
    servesCocktails: false,
    servesCoffee: false,
    dineIn: false,
    delivery: false,
    takeout: false,
    outdoorSeating: false,
    photoReferences: [],
    ...overrides,
  }
}

describe('deriveTags', () => {
  it('derives tags from Google types', () => {
    const tags = deriveTags(makePlaceData({ types: ['bar', 'restaurant'] }))
    expect(tags).toContain('Bar')
    expect(tags).toContain('Restaurant')
  })

  it('derives tags from serves_* fields', () => {
    const tags = deriveTags(makePlaceData({
      servesWine: true,
      servesCocktails: true,
      servesBeer: true,
      servesVegetarianFood: true,
    }))
    expect(tags).toContain('Wine')
    expect(tags).toContain('Cocktails')
    expect(tags).toContain('Beer')
    expect(tags).toContain('Vegetarian')
  })

  it('derives tags from dineIn/delivery/takeout', () => {
    const tags = deriveTags(makePlaceData({
      dineIn: true,
      delivery: true,
      takeout: true,
    }))
    expect(tags).toContain('Dine-in')
    expect(tags).toContain('Delivery')
    expect(tags).toContain('Takeaway')
  })

  it('derives outdoor seating tag', () => {
    const tags = deriveTags(makePlaceData({ outdoorSeating: true }))
    expect(tags).toContain('Outdoor seating')
  })

  it('derives vibe tags from editorial summary', () => {
    const tags = deriveTags(makePlaceData({
      editorialSummary: 'A romantic and cozy spot with a rustic vibe',
    }))
    expect(tags).toContain('Romantic')
    expect(tags).toContain('Cozy')
  })

  it('derives price tag from priceLevel', () => {
    expect(deriveTags(makePlaceData({ priceLevel: 1 }))).toContain('Budget-friendly')
    expect(deriveTags(makePlaceData({ priceLevel: 2 }))).toContain('Mid-range')
    expect(deriveTags(makePlaceData({ priceLevel: 3 }))).toContain('Upscale')
    expect(deriveTags(makePlaceData({ priceLevel: 4 }))).toContain('Fine dining')
  })

  it('returns empty array for minimal place data', () => {
    const tags = deriveTags(makePlaceData({ types: [], priceLevel: 0 }))
    expect(tags).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/services/tag-derivation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement tag derivation**

```typescript
// server/services/tag-derivation.ts
import type { PlaceDetailed } from '~/server/services/google-places'

/** Maps Google place types to human-readable tags */
const TYPE_TAG_MAP: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  bakery: 'Bakery',
  meal_takeaway: 'Takeaway',
  coffee_shop: 'Coffee',
  ice_cream_shop: 'Ice cream',
  park: 'Park',
  museum: 'Museum',
  art_gallery: 'Gallery',
  movie_theater: 'Cinema',
  bowling_alley: 'Bowling',
  night_club: 'Nightclub',
  book_store: 'Books',
  spa: 'Spa',
  library: 'Library',
}

/** Vibe keywords to extract from editorial summaries */
const VIBE_KEYWORDS: Record<string, string> = {
  romantic: 'Romantic',
  cozy: 'Cozy',
  trendy: 'Trendy',
  lively: 'Lively',
  quiet: 'Quiet',
  rustic: 'Rustic',
  modern: 'Modern',
  casual: 'Casual',
  elegant: 'Elegant',
  hidden: 'Hidden gem',
  rooftop: 'Rooftop',
  waterfront: 'Waterfront',
  'family-friendly': 'Family-friendly',
  'pet-friendly': 'Pet-friendly',
}

/** Price level to tag */
const PRICE_TAGS: Record<number, string> = {
  1: 'Budget-friendly',
  2: 'Mid-range',
  3: 'Upscale',
  4: 'Fine dining',
}

export function deriveTags(place: PlaceDetailed): string[] {
  const tags: string[] = []

  // 1. From Google types
  for (const type of place.types) {
    if (TYPE_TAG_MAP[type]) {
      tags.push(TYPE_TAG_MAP[type])
    }
  }

  // 2. From serves_* fields
  if (place.servesVegetarianFood) tags.push('Vegetarian')
  if (place.servesBeer) tags.push('Beer')
  if (place.servesWine) tags.push('Wine')
  if (place.servesCocktails) tags.push('Cocktails')
  if (place.servesCoffee) tags.push('Coffee')

  // 3. From dineIn/delivery/takeout
  if (place.dineIn) tags.push('Dine-in')
  if (place.delivery) tags.push('Delivery')
  if (place.takeout) tags.push('Takeaway')

  // 4. From outdoorSeating
  if (place.outdoorSeating) tags.push('Outdoor seating')

  // 5. From editorial summary — keyword extraction
  if (place.editorialSummary) {
    const lower = place.editorialSummary.toLowerCase()
    for (const [keyword, tag] of Object.entries(VIBE_KEYWORDS)) {
      if (lower.includes(keyword)) {
        tags.push(tag)
      }
    }
  }

  // 6. From price level
  if (PRICE_TAGS[place.priceLevel]) {
    tags.push(PRICE_TAGS[place.priceLevel])
  }

  // Deduplicate (e.g., "Takeaway" from both type and takeout field)
  return [...new Set(tags)]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/server/services/tag-derivation.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/tag-derivation.ts tests/server/services/tag-derivation.test.ts
git commit -m "feat: add tag derivation service with tests"
```

---

### Task 6: Cache Service

**Files:**
- Create: `server/utils/cache.ts`, `tests/server/utils/cache.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/server/utils/cache.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock ioredis to avoid real Redis connections in tests
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    })),
  }
})

// Override runtime config to use in-memory cache for tests
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ redisUrl: '' }),
}))

import { createCache } from '~/server/utils/cache'

describe('cache (in-memory)', () => {
  let cache: ReturnType<typeof createCache>

  beforeEach(() => {
    cache = createCache()
  })

  it('returns null for cache miss', async () => {
    const result = await cache.get('nonexistent')
    expect(result).toBeNull()
  })

  it('stores and retrieves a value', async () => {
    await cache.set('key1', { foo: 'bar' }, 300)
    const result = await cache.get('key1')
    expect(result).toEqual({ foo: 'bar' })
  })

  it('deletes a value', async () => {
    await cache.set('key2', 'value', 300)
    await cache.del('key2')
    const result = await cache.get('key2')
    expect(result).toBeNull()
  })

  it('expires values after TTL', async () => {
    vi.useFakeTimers()
    await cache.set('key3', 'value', 1) // 1 second TTL
    vi.advanceTimersByTime(2000)
    const result = await cache.get('key3')
    expect(result).toBeNull()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/utils/cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement cache service**

```typescript
// server/utils/cache.ts

interface CacheEntry {
  value: string
  expiresAt: number
}

interface CacheInterface {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}

function createInMemoryCache(): CacheInterface {
  const store = new Map<string, CacheEntry>()

  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const entry = store.get(key)
      if (!entry) return null
      if (Date.now() > entry.expiresAt) {
        store.delete(key)
        return null
      }
      return JSON.parse(entry.value) as T
    },

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      store.set(key, {
        value: JSON.stringify(value),
        expiresAt: Date.now() + ttlSeconds * 1000,
      })
    },

    async del(key: string): Promise<void> {
      store.delete(key)
    },
  }
}

function createRedisCache(redisUrl: string): CacheInterface {
  // Lazy import to avoid loading ioredis when not needed
  let redis: any = null

  function getRedis() {
    if (!redis) {
      const Redis = require('ioredis').default || require('ioredis')
      redis = new Redis(redisUrl)
    }
    return redis
  }

  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const data = await getRedis().get(key)
      if (!data) return null
      return JSON.parse(data) as T
    },

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds)
    },

    async del(key: string): Promise<void> {
      await getRedis().del(key)
    },
  }
}

// Singleton cache instance
let _cache: CacheInterface | null = null

export function createCache(): CacheInterface {
  return createInMemoryCache()
}

export function getCache(): CacheInterface {
  if (!_cache) {
    const config = useRuntimeConfig()
    _cache = config.redisUrl
      ? createRedisCache(config.redisUrl)
      : createInMemoryCache()
  }
  return _cache
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/server/utils/cache.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/cache.ts tests/server/utils/cache.test.ts
git commit -m "feat: add cache service with Redis and in-memory backends"
```

---

## Phase B: Backend Features

### Task 7: Authentication System

**Files:**
- Create: `server/utils/session.ts`, `server/utils/require-auth.ts`, `server/middleware/01.session.ts`, `server/services/magic-link.ts`, `server/api/auth/magic-link.post.ts`, `server/api/auth/magic-link/verify.get.ts`, `server/api/auth/google.get.ts`, `server/api/auth/google/callback.get.ts`, `server/api/auth/github.get.ts`, `server/api/auth/github/callback.get.ts`, `server/api/auth/logout.post.ts`, `server/api/auth/me.get.ts`

- [ ] **Step 1: Create session utilities**

```typescript
// server/utils/session.ts
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
```

- [ ] **Step 2: Create auth guard helper**

```typescript
// server/utils/require-auth.ts
import { H3Event, createError } from 'h3'
import { getSessionUser } from '~/server/utils/session'

export async function requireAuth(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}
```

- [ ] **Step 3: Create session hydration middleware**

```typescript
// server/middleware/01.session.ts
import { defineEventHandler } from 'h3'
import { getSessionUser } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  // Hydrate user on every request — available via event.context.user
  const user = await getSessionUser(event)
  event.context.user = user
})
```

- [ ] **Step 4: Create magic link service**

```typescript
// server/services/magic-link.ts
import { randomBytes, createHmac } from 'node:crypto'
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
```

- [ ] **Step 5: Create auth API routes — magic link send**

```typescript
// server/api/auth/magic-link.post.ts
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
```

- [ ] **Step 6: Create auth API routes — magic link verify**

```typescript
// server/api/auth/magic-link/verify.get.ts
import { defineEventHandler, getQuery, createError, sendRedirect } from 'h3'
import { verifyMagicLinkToken } from '~/server/services/magic-link'
import { createSession } from '~/server/utils/session'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event) as { token?: string }

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token required' })
  }

  const email = await verifyMagicLinkToken(token)
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired token' })
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: { email, authProvider: 'magic_link' },
    })
  }

  await createSession(event, user.id)
  return sendRedirect(event, '/')
})
```

- [ ] **Step 7: Create auth API routes — Google OAuth**

```typescript
// server/api/auth/google.get.ts
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
```

```typescript
// server/api/auth/google/callback.get.ts
import { defineEventHandler, getQuery, createError, sendRedirect } from 'h3'
import { createSession } from '~/server/utils/session'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { code } = getQuery(event) as { code?: string }
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Authorization code required' })
  }

  const config = useRuntimeConfig()
  const redirectUri = `${config.baseUrl}/api/auth/google/callback`

  // Exchange code for tokens
  const tokenResponse = await $fetch<{
    access_token: string
    id_token: string
  }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: {
      code,
      client_id: config.googleOAuthClientId,
      client_secret: config.googleOAuthClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    },
  })

  // Get user info
  const userInfo = await $fetch<{
    sub: string
    email: string
    name: string
  }>('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
  })

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: userInfo.email } })
  if (!user) {
    user = await prisma.user.create({
      data: { email: userInfo.email, authProvider: 'google' },
    })
  }

  await createSession(event, user.id)
  return sendRedirect(event, '/')
})
```

- [ ] **Step 8: Create auth API routes — GitHub OAuth**

```typescript
// server/api/auth/github.get.ts
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
```

```typescript
// server/api/auth/github/callback.get.ts
import { defineEventHandler, getQuery, createError, sendRedirect } from 'h3'
import { createSession } from '~/server/utils/session'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { code } = getQuery(event) as { code?: string }
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Authorization code required' })
  }

  const config = useRuntimeConfig()

  // Exchange code for access token
  const tokenResponse = await $fetch<{ access_token: string }>(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: {
        client_id: config.githubOAuthClientId,
        client_secret: config.githubOAuthClientSecret,
        code,
      },
    },
  )

  // Get user email
  const emails = await $fetch<Array<{ email: string; primary: boolean; verified: boolean }>>(
    'https://api.github.com/user/emails',
    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } },
  )

  const primaryEmail = emails.find((e) => e.primary && e.verified)?.email
  if (!primaryEmail) {
    throw createError({ statusCode: 400, statusMessage: 'No verified email found on GitHub account' })
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: primaryEmail } })
  if (!user) {
    user = await prisma.user.create({
      data: { email: primaryEmail, authProvider: 'github' },
    })
  }

  await createSession(event, user.id)
  return sendRedirect(event, '/')
})
```

- [ ] **Step 9: Create auth API routes — logout and me**

```typescript
// server/api/auth/logout.post.ts
import { defineEventHandler } from 'h3'
import { destroySession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  await destroySession(event)
  return { success: true }
})
```

```typescript
// server/api/auth/me.get.ts
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
```

- [ ] **Step 10: Commit**

```bash
git add server/utils/session.ts server/utils/require-auth.ts server/middleware/01.session.ts server/services/magic-link.ts server/api/auth/
git commit -m "feat: add authentication system with magic link, Google and GitHub OAuth"
```

---

### Task 8: Preferences & User Data API

**Files:**
- Create: `server/api/preferences.get.ts`, `server/api/preferences.put.ts`, `server/api/seed-places.get.ts`, `server/api/seed-places.post.ts`, `server/api/seed-places/[id].delete.ts`, `server/api/preferred-areas.get.ts`, `server/api/preferred-areas.put.ts`, `tests/server/api/preferences.test.ts`

- [ ] **Step 1: Write failing test for preferences API**

```typescript
// tests/server/api/preferences.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// We'll test the handler logic by importing and calling with mock events.
// For full integration tests, use @nuxt/test-utils setup() in a separate file.
// Here we unit-test the core Prisma interactions.

import { prisma } from '~/server/utils/prisma'

describe('preferences API (unit)', () => {
  // These tests require a real or test database.
  // For CI, use a test database. For local dev, ensure DATABASE_URL points to a test db.

  let userId: string

  beforeEach(async () => {
    // Clean up and create a test user
    await prisma.userPreference.deleteMany()
    await prisma.userSeedPlace.deleteMany()
    await prisma.userPreferredArea.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()

    const user = await prisma.user.create({
      data: { email: 'test@example.com', authProvider: 'magic_link' },
    })
    userId = user.id
  })

  it('creates and reads preferences', async () => {
    await prisma.userPreference.create({
      data: {
        userId,
        baseCityPlaceId: 'ChIJOwg_06VPwokRYv534QaPC8g',
        baseCityName: 'New York',
        baseCityLat: 40.7128,
        baseCityLng: -74.006,
        dietaryPreferences: { vegan: 'must', cocktails: 'neutral' },
      },
    })

    const pref = await prisma.userPreference.findUnique({ where: { userId } })
    expect(pref).toBeTruthy()
    expect(pref!.baseCityName).toBe('New York')
    expect(pref!.dietaryPreferences).toEqual({ vegan: 'must', cocktails: 'neutral' })
  })

  it('creates and lists seed places', async () => {
    await prisma.userSeedPlace.create({
      data: {
        userId,
        googlePlaceId: 'place_abc',
        name: 'Cool Cafe',
        category: 'food_drink',
        lat: 40.71,
        lng: -74.01,
      },
    })

    const places = await prisma.userSeedPlace.findMany({ where: { userId } })
    expect(places).toHaveLength(1)
    expect(places[0].name).toBe('Cool Cafe')
  })

  it('replaces preferred areas', async () => {
    await prisma.userPreferredArea.createMany({
      data: [
        { userId, neighborhoodName: 'Brooklyn', bounds: { north: 40.7, south: 40.6, east: -73.9, west: -74.0 } },
        { userId, neighborhoodName: 'Manhattan', bounds: { north: 40.8, south: 40.7, east: -73.9, west: -74.0 } },
      ],
    })

    const areas = await prisma.userPreferredArea.findMany({ where: { userId } })
    expect(areas).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/api/preferences.test.ts`
Expected: FAIL (or PASS if Prisma is already set up — the test is really a smoke test for the schema).

- [ ] **Step 3: Create preferences API routes**

```typescript
// server/api/preferences.get.ts
import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const [preferences, seedPlaces, preferredAreas] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId: user.id } }),
    prisma.userSeedPlace.findMany({ where: { userId: user.id }, orderBy: { addedAt: 'desc' } }),
    prisma.userPreferredArea.findMany({ where: { userId: user.id } }),
  ])

  return {
    preferences: preferences
      ? {
          baseCityPlaceId: preferences.baseCityPlaceId,
          baseCityName: preferences.baseCityName,
          baseCityLat: preferences.baseCityLat,
          baseCityLng: preferences.baseCityLng,
          dietaryPreferences: preferences.dietaryPreferences,
        }
      : null,
    seedPlaces: seedPlaces.map((sp) => ({
      id: sp.id,
      googlePlaceId: sp.googlePlaceId,
      name: sp.name,
      category: sp.category,
      lat: sp.lat,
      lng: sp.lng,
    })),
    preferredAreas: preferredAreas.map((a) => ({
      neighborhoodName: a.neighborhoodName,
      bounds: a.bounds,
    })),
  }
})
```

```typescript
// server/api/preferences.put.ts
import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{
    baseCityPlaceId: string
    baseCityName: string
    baseCityLat: number
    baseCityLng: number
    dietaryPreferences?: Record<string, string>
  }>(event)

  const preferences = await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      baseCityPlaceId: body.baseCityPlaceId,
      baseCityName: body.baseCityName,
      baseCityLat: body.baseCityLat,
      baseCityLng: body.baseCityLng,
      dietaryPreferences: body.dietaryPreferences ?? {},
    },
    update: {
      baseCityPlaceId: body.baseCityPlaceId,
      baseCityName: body.baseCityName,
      baseCityLat: body.baseCityLat,
      baseCityLng: body.baseCityLng,
      dietaryPreferences: body.dietaryPreferences ?? {},
    },
  })

  return { success: true, preferences }
})
```

- [ ] **Step 4: Create seed places API routes**

```typescript
// server/api/seed-places.get.ts
import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const places = await prisma.userSeedPlace.findMany({
    where: { userId: user.id },
    orderBy: { addedAt: 'desc' },
  })

  return places.map((p) => ({
    id: p.id,
    googlePlaceId: p.googlePlaceId,
    name: p.name,
    category: p.category,
    lat: p.lat,
    lng: p.lng,
  }))
})
```

```typescript
// server/api/seed-places.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{
    googlePlaceId: string
    name: string
    category: string
    lat: number
    lng: number
  }>(event)

  if (!body.googlePlaceId || !body.name) {
    throw createError({ statusCode: 400, statusMessage: 'googlePlaceId and name are required' })
  }

  const place = await prisma.userSeedPlace.upsert({
    where: {
      userId_googlePlaceId: { userId: user.id, googlePlaceId: body.googlePlaceId },
    },
    create: {
      userId: user.id,
      googlePlaceId: body.googlePlaceId,
      name: body.name,
      category: body.category,
      lat: body.lat,
      lng: body.lng,
    },
    update: {},
  })

  return { id: place.id, googlePlaceId: place.googlePlaceId, name: place.name }
})
```

```typescript
// server/api/seed-places/[id].delete.ts
import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID required' })
  }

  const place = await prisma.userSeedPlace.findFirst({
    where: { id, userId: user.id },
  })

  if (!place) {
    throw createError({ statusCode: 404, statusMessage: 'Seed place not found' })
  }

  await prisma.userSeedPlace.delete({ where: { id } })
  return { success: true }
})
```

- [ ] **Step 5: Create preferred areas API routes**

```typescript
// server/api/preferred-areas.get.ts
import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const areas = await prisma.userPreferredArea.findMany({
    where: { userId: user.id },
  })

  return areas.map((a) => ({
    neighborhoodName: a.neighborhoodName,
    bounds: a.bounds,
  }))
})
```

```typescript
// server/api/preferred-areas.put.ts
import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { areas } = await readBody<{
    areas: Array<{ name: string; bounds: { north: number; south: number; east: number; west: number } }>
  }>(event)

  // Replace all preferred areas atomically
  await prisma.$transaction([
    prisma.userPreferredArea.deleteMany({ where: { userId: user.id } }),
    prisma.userPreferredArea.createMany({
      data: (areas ?? []).map((a) => ({
        userId: user.id,
        neighborhoodName: a.name,
        bounds: a.bounds,
      })),
    }),
  ])

  return { success: true }
})
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/server/api/preferences.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/api/preferences.get.ts server/api/preferences.put.ts server/api/seed-places.get.ts server/api/seed-places.post.ts server/api/seed-places/ server/api/preferred-areas.get.ts server/api/preferred-areas.put.ts tests/server/api/preferences.test.ts
git commit -m "feat: add preferences, seed places, and preferred areas API routes"
```

---

### Task 9: Recommendation Engine

**Files:**
- Create: `server/services/recommendation.ts`, `tests/server/services/recommendation.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/server/services/recommendation.test.ts
import { describe, it, expect } from 'vitest'
import {
  filterPlaces,
  rankPlaces,
  generateRecommendationReason,
} from '~/server/services/recommendation'
import type { PlaceCategory, DietaryPreference, MapBounds } from '~/types'

interface CachedPlaceInput {
  googlePlaceId: string
  name: string
  category: PlaceCategory
  types: string[]
  lat: number
  lng: number
  rating: number
  priceLevel: number
  tags: string[]
}

function makePlace(overrides: Partial<CachedPlaceInput> = {}): CachedPlaceInput {
  return {
    googlePlaceId: `place_${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Place',
    category: 'food_drink',
    types: ['restaurant'],
    lat: 40.7128,
    lng: -74.006,
    rating: 4.0,
    priceLevel: 2,
    tags: ['Restaurant', 'Mid-range'],
    ...overrides,
  }
}

describe('recommendation engine', () => {
  describe('filterPlaces', () => {
    const places = [
      makePlace({ googlePlaceId: 'a', category: 'food_drink', lat: 40.71, lng: -74.01, tags: ['Vegan', 'Restaurant'] }),
      makePlace({ googlePlaceId: 'b', category: 'outdoors', lat: 40.72, lng: -74.00, tags: ['Park'] }),
      makePlace({ googlePlaceId: 'c', category: 'food_drink', lat: 40.80, lng: -73.95, tags: ['Bar', 'Cocktails'] }),
      makePlace({ googlePlaceId: 'd', category: 'activities', lat: 40.71, lng: -74.01, tags: ['Museum'] }),
    ]

    it('filters by map bounds', () => {
      const bounds: MapBounds = { north: 40.73, south: 40.70, east: -73.99, west: -74.02 }
      const filtered = filterPlaces(places, { bounds })
      expect(filtered.map((p) => p.googlePlaceId)).toEqual(['a', 'b', 'd'])
    })

    it('filters by category', () => {
      const filtered = filterPlaces(places, { categories: ['food_drink'] })
      expect(filtered.map((p) => p.googlePlaceId)).toEqual(['a', 'c'])
    })

    it('excludes deal-breaker tags', () => {
      const dietary: Record<string, DietaryPreference> = { cocktails: 'dealbreaker' }
      const filtered = filterPlaces(places, { dietaryPreferences: dietary })
      expect(filtered.map((p) => p.googlePlaceId)).not.toContain('c')
    })

    it('combines multiple filters', () => {
      const bounds: MapBounds = { north: 40.73, south: 40.70, east: -73.99, west: -74.02 }
      const filtered = filterPlaces(places, { bounds, categories: ['food_drink'] })
      expect(filtered.map((p) => p.googlePlaceId)).toEqual(['a'])
    })
  })

  describe('rankPlaces', () => {
    it('ranks by similarity to seed places', () => {
      const candidates = [
        makePlace({ googlePlaceId: 'x', category: 'food_drink', tags: ['Café', 'Cozy'], rating: 4.0, priceLevel: 2 }),
        makePlace({ googlePlaceId: 'y', category: 'food_drink', tags: ['Café', 'Cozy', 'Vegetarian'], rating: 4.5, priceLevel: 2 }),
        makePlace({ googlePlaceId: 'z', category: 'outdoors', tags: ['Park'], rating: 4.2, priceLevel: 0 }),
      ]

      const seedPlaces = [
        makePlace({ category: 'food_drink', tags: ['Café', 'Cozy', 'Vegetarian'], rating: 4.3, priceLevel: 2 }),
      ]

      const ranked = rankPlaces(candidates, seedPlaces, {})
      // 'y' should rank highest due to most tag overlap with seed
      expect(ranked[0].googlePlaceId).toBe('y')
    })

    it('applies must-have bonus', () => {
      const candidates = [
        makePlace({ googlePlaceId: 'a', tags: ['Restaurant'], rating: 4.0 }),
        makePlace({ googlePlaceId: 'b', tags: ['Vegan', 'Restaurant'], rating: 3.8 }),
      ]

      const dietary: Record<string, DietaryPreference> = { vegan: 'must' }
      const ranked = rankPlaces(candidates, [], dietary)
      // 'b' should get a must-have bonus
      expect(ranked[0].googlePlaceId).toBe('b')
    })

    it('falls back to rating sort when no seed places', () => {
      const candidates = [
        makePlace({ googlePlaceId: 'a', rating: 3.5 }),
        makePlace({ googlePlaceId: 'b', rating: 4.8 }),
        makePlace({ googlePlaceId: 'c', rating: 4.2 }),
      ]

      const ranked = rankPlaces(candidates, [], {})
      expect(ranked[0].googlePlaceId).toBe('b')
      expect(ranked[1].googlePlaceId).toBe('c')
    })
  })

  describe('generateRecommendationReason', () => {
    it('generates seed-based reason', () => {
      const reason = generateRecommendationReason(
        makePlace({ tags: ['Café', 'Cozy'] }),
        [makePlace({ name: 'My Fav Cafe', tags: ['Café', 'Cozy', 'Vegetarian'] })],
        { tagOverlap: 0.5, categorySimilarity: 0.3 },
      )
      expect(reason).toContain('My Fav Cafe')
    })

    it('generates fallback reason when no seeds', () => {
      const reason = generateRecommendationReason(
        makePlace({ category: 'food_drink', rating: 4.5 }),
        [],
        {},
      )
      expect(reason).toContain('Top rated')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/services/recommendation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the recommendation engine**

```typescript
// server/services/recommendation.ts
import type { PlaceCategory, DietaryPreference, MapBounds } from '~/types'

interface PlaceData {
  googlePlaceId: string
  name: string
  category: PlaceCategory
  types: string[]
  lat: number
  lng: number
  rating: number
  priceLevel: number
  tags: string[]
}

interface FilterOptions {
  bounds?: MapBounds
  categories?: PlaceCategory[]
  dietaryPreferences?: Record<string, DietaryPreference>
}

interface ScoredPlace extends PlaceData {
  similarityScore: number
  recommendationReason: string
}

interface ScoreFactors {
  tagOverlap?: number
  categorySimilarity?: number
  ratingProximity?: number
  priceLevelMatch?: number
  geographicProximity?: number
}

// Tag key → tags that indicate presence of this attribute
const DIETARY_TAG_MAP: Record<string, string[]> = {
  vegan: ['Vegan'],
  vegetarian: ['Vegetarian'],
  cocktails: ['Cocktails'],
  wine: ['Wine'],
  meat: ['Meat-focused'],
  coffee: ['Coffee', 'Café'],
  craft_beer: ['Beer', 'Craft beer'],
  gluten_free: ['Gluten-free'],
  halal: ['Halal'],
}

/** Phase 1: Filter candidates by hard constraints */
export function filterPlaces(places: PlaceData[], options: FilterOptions): PlaceData[] {
  let result = [...places]

  // Geographic filter
  if (options.bounds) {
    const { north, south, east, west } = options.bounds
    result = result.filter(
      (p) => p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east,
    )
  }

  // Category filter
  if (options.categories?.length) {
    result = result.filter((p) => options.categories!.includes(p.category))
  }

  // Deal-breaker filter
  if (options.dietaryPreferences) {
    const dealbreakers = Object.entries(options.dietaryPreferences)
      .filter(([, v]) => v === 'dealbreaker')
      .flatMap(([key]) => DIETARY_TAG_MAP[key] ?? [])

    if (dealbreakers.length > 0) {
      result = result.filter(
        (p) => !p.tags.some((tag) => dealbreakers.includes(tag)),
      )
    }
  }

  return result
}

/** Phase 2: Rank candidates by similarity to seed places */
export function rankPlaces(
  candidates: PlaceData[],
  seedPlaces: PlaceData[],
  dietaryPreferences: Record<string, DietaryPreference>,
): ScoredPlace[] {
  // Fallback: no seeds → sort by rating
  if (seedPlaces.length === 0) {
    return candidates
      .map((p) => ({
        ...p,
        similarityScore: p.rating / 5,
        recommendationReason: generateRecommendationReason(p, [], {}),
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
  }

  // Build aggregate seed profile
  const seedCategories = new Set(seedPlaces.map((s) => s.category))
  const seedTags = new Set(seedPlaces.flatMap((s) => s.tags))
  const avgSeedRating = seedPlaces.reduce((sum, s) => sum + s.rating, 0) / seedPlaces.length
  const avgSeedPrice = seedPlaces.reduce((sum, s) => sum + s.priceLevel, 0) / seedPlaces.length
  const seedCenter = {
    lat: seedPlaces.reduce((sum, s) => sum + s.lat, 0) / seedPlaces.length,
    lng: seedPlaces.reduce((sum, s) => sum + s.lng, 0) / seedPlaces.length,
  }

  // Must-have tags for bonus
  const mustHaveTags = Object.entries(dietaryPreferences)
    .filter(([, v]) => v === 'must')
    .flatMap(([key]) => DIETARY_TAG_MAP[key] ?? [])

  const scored = candidates.map((place) => {
    // Category similarity (30%)
    const categorySimilarity = seedCategories.has(place.category) ? 1 : 0

    // Tag overlap (25%)
    const placeTagSet = new Set(place.tags)
    const commonTags = [...seedTags].filter((t) => placeTagSet.has(t))
    const tagOverlap = seedTags.size > 0 ? commonTags.length / seedTags.size : 0

    // Rating proximity (15%) — closer to avg seed rating = higher score
    const ratingDiff = Math.abs(place.rating - avgSeedRating)
    const ratingProximity = Math.max(0, 1 - ratingDiff / 5)

    // Price level match (15%)
    const priceDiff = Math.abs(place.priceLevel - avgSeedPrice)
    const priceLevelMatch = Math.max(0, 1 - priceDiff / 4)

    // Geographic proximity (15%) — simple distance-based
    const dist = haversineDistance(place.lat, place.lng, seedCenter.lat, seedCenter.lng)
    const geographicProximity = Math.max(0, 1 - dist / 20) // 20km max

    let score =
      categorySimilarity * 0.3 +
      tagOverlap * 0.25 +
      ratingProximity * 0.15 +
      priceLevelMatch * 0.15 +
      geographicProximity * 0.15

    // Must-have bonus
    if (mustHaveTags.length > 0) {
      const hasMusts = mustHaveTags.some((t) => placeTagSet.has(t))
      if (hasMusts) score *= 1.2
    }

    // Clamp to 0-1
    score = Math.min(1, Math.max(0, score))

    const factors: ScoreFactors = { tagOverlap, categorySimilarity, ratingProximity, priceLevelMatch, geographicProximity }

    return {
      ...place,
      similarityScore: score,
      recommendationReason: generateRecommendationReason(place, seedPlaces, factors),
    }
  })

  return scored.sort((a, b) => b.similarityScore - a.similarityScore)
}

/** Generate a human-readable explanation */
export function generateRecommendationReason(
  place: PlaceData,
  seedPlaces: PlaceData[],
  factors: ScoreFactors,
): string {
  if (seedPlaces.length === 0) {
    const categoryLabel = {
      food_drink: 'Food & Drink',
      outdoors: 'Outdoors',
      activities: 'Activities',
      chill_spots: 'Chill Spots',
    }[place.category]
    return `Top rated in ${categoryLabel}`
  }

  const reasons: string[] = []

  // Find most similar seed place by tag overlap
  if ((factors.tagOverlap ?? 0) > 0.2) {
    const bestSeed = seedPlaces.reduce((best, seed) => {
      const overlap = seed.tags.filter((t) => place.tags.includes(t)).length
      const bestOverlap = best.tags.filter((t) => place.tags.includes(t)).length
      return overlap > bestOverlap ? seed : best
    }, seedPlaces[0])
    reasons.push(`Similar vibe to ${bestSeed.name}`)
  }

  if ((factors.categorySimilarity ?? 0) > 0 && reasons.length === 0) {
    reasons.push(`Matches your ${place.category.replace('_', ' ')} taste`)
  }

  if ((factors.geographicProximity ?? 0) > 0.7) {
    reasons.push('In your preferred area')
  }

  return reasons.length > 0 ? reasons.join(' · ') : `Recommended in ${place.category.replace('_', ' ')}`
}

/** Simple haversine distance in km */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/server/services/recommendation.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/recommendation.ts tests/server/services/recommendation.test.ts
git commit -m "feat: add recommendation engine with filter, rank, and reason generation"
```

---

### Task 10: Recommendations, Places & Discovery API

**Files:**
- Create: `server/api/recommendations.get.ts`, `server/api/places/[googlePlaceId].get.ts`, `server/api/city-coverage.get.ts`, `server/api/neighborhoods.get.ts`

- [ ] **Step 1: Create recommendations API route**

```typescript
// server/api/recommendations.get.ts
import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { getCache } from '~/server/utils/cache'
import { filterPlaces, rankPlaces } from '~/server/services/recommendation'
import type { PlaceCategory, DietaryPreference, MapBounds } from '~/types'

const PAGE_SIZE = 20
const CACHE_TTL = 900 // 15 minutes

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    north?: string
    south?: string
    east?: string
    west?: string
    categories?: string
    page?: string
    // Guest mode params
    seedPlaceIds?: string
    dietaryPrefs?: string
    areaNames?: string
  }

  const user = event.context.user
  const page = Math.max(1, parseInt(query.page ?? '1', 10))

  // Parse bounds
  const bounds: MapBounds | undefined =
    query.north && query.south && query.east && query.west
      ? {
          north: parseFloat(query.north),
          south: parseFloat(query.south),
          east: parseFloat(query.east),
          west: parseFloat(query.west),
        }
      : undefined

  const categories = query.categories
    ? (query.categories.split(',') as PlaceCategory[])
    : undefined

  // Get user data (authenticated) or parse from query (guest)
  let seedPlaces: Array<{ googlePlaceId: string; name: string; category: PlaceCategory; types: string[]; lat: number; lng: number; rating: number; priceLevel: number; tags: string[] }> = []
  let dietaryPreferences: Record<string, DietaryPreference> = {}

  if (user) {
    const [userSeeds, userPrefs] = await Promise.all([
      prisma.userSeedPlace.findMany({ where: { userId: user.id } }),
      prisma.userPreference.findUnique({ where: { userId: user.id } }),
    ])

    // Look up cached place data for seed places to get tags
    const seedCached = await prisma.cachedPlace.findMany({
      where: { googlePlaceId: { in: userSeeds.map((s) => s.googlePlaceId) } },
    })
    const seedMap = new Map(seedCached.map((c) => [c.googlePlaceId, c]))

    seedPlaces = userSeeds.map((s) => {
      const cached = seedMap.get(s.googlePlaceId)
      return {
        googlePlaceId: s.googlePlaceId,
        name: s.name,
        category: (s.category as PlaceCategory) || 'food_drink',
        types: cached?.types ?? [],
        lat: s.lat,
        lng: s.lng,
        rating: cached?.rating ?? 4.0,
        priceLevel: cached?.priceLevel ?? 2,
        tags: cached?.tags ?? [],
      }
    })

    dietaryPreferences = (userPrefs?.dietaryPreferences as Record<string, DietaryPreference>) ?? {}
  } else if (query.dietaryPrefs) {
    try {
      dietaryPreferences = JSON.parse(query.dietaryPrefs)
    } catch { /* ignore */ }
  }

  // Fetch candidate places from cache
  const allCached = await prisma.cachedPlace.findMany()
  const candidates = allCached.map((c) => ({
    googlePlaceId: c.googlePlaceId,
    name: c.name,
    category: c.category as PlaceCategory,
    types: c.types,
    lat: c.lat,
    lng: c.lng,
    rating: c.rating,
    priceLevel: c.priceLevel,
    tags: c.tags,
  }))

  // Phase 1: Filter
  const filtered = filterPlaces(candidates, {
    bounds,
    categories,
    dietaryPreferences,
  })

  // Phase 2: Rank
  const ranked = rankPlaces(filtered, seedPlaces, dietaryPreferences)

  // Paginate
  const total = ranked.length
  const start = (page - 1) * PAGE_SIZE
  const pageItems = ranked.slice(start, start + PAGE_SIZE)

  // Attach photo URLs
  const places = pageItems.map((p) => ({
    googlePlaceId: p.googlePlaceId,
    name: p.name,
    category: p.category,
    types: p.types,
    lat: p.lat,
    lng: p.lng,
    rating: p.rating,
    priceLevel: p.priceLevel,
    tags: p.tags,
    photoUrl: null as string | null, // Will be populated from cached_places
    openingHours: null,
    website: null,
    phone: null,
    address: null,
    recommendationReason: p.recommendationReason,
    similarityScore: p.similarityScore,
  }))

  return { places, total, page, pageSize: PAGE_SIZE }
})
```

- [ ] **Step 2: Create place details API route**

```typescript
// server/api/places/[googlePlaceId].get.ts
import { defineEventHandler, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { getCache } from '~/server/utils/cache'
import { getPlaceDetails } from '~/server/services/google-places'
import { deriveTags } from '~/server/services/tag-derivation'
import { getPhotoUrl } from '~/server/utils/google-places-client'

const CACHE_TTL = 7 * 24 * 60 * 60 // 7 days

export default defineEventHandler(async (event) => {
  const placeId = getRouterParam(event, 'googlePlaceId')
  if (!placeId) {
    throw createError({ statusCode: 400, statusMessage: 'Place ID required' })
  }

  // Check cached_places first
  const cached = await prisma.cachedPlace.findUnique({
    where: { googlePlaceId: placeId },
  })

  const isStale = cached && (Date.now() - cached.fetchedAt.getTime()) > CACHE_TTL * 1000

  if (cached && !isStale) {
    return {
      googlePlaceId: cached.googlePlaceId,
      name: cached.name,
      category: cached.category,
      types: cached.types,
      lat: cached.lat,
      lng: cached.lng,
      rating: cached.rating,
      priceLevel: cached.priceLevel,
      tags: cached.tags,
      photoUrl: cached.photoReferences[0] ? getPhotoUrl(cached.photoReferences[0]) : null,
      openingHours: cached.openingHours,
      website: cached.website,
      phone: cached.phone,
      address: cached.address,
      recommendationReason: '',
      similarityScore: 0,
    }
  }

  // Fetch from Google Places API
  const details = await getPlaceDetails(placeId)
  const tags = deriveTags(details)

  // Upsert into cache
  await prisma.cachedPlace.upsert({
    where: { googlePlaceId: placeId },
    create: {
      googlePlaceId: placeId,
      name: details.name,
      category: details.category,
      types: details.types,
      lat: details.lat,
      lng: details.lng,
      rating: details.rating,
      priceLevel: details.priceLevel,
      tags,
      photoReferences: details.photoReferences,
      openingHours: details.openingHours ?? undefined,
      website: details.website,
      phone: details.phone,
      address: details.address,
      editorialSummary: details.editorialSummary,
      cityPlaceId: '', // Will be set when we know the city context
      fetchedAt: new Date(),
    },
    update: {
      name: details.name,
      category: details.category,
      types: details.types,
      lat: details.lat,
      lng: details.lng,
      rating: details.rating,
      priceLevel: details.priceLevel,
      tags,
      photoReferences: details.photoReferences,
      openingHours: details.openingHours ?? undefined,
      website: details.website,
      phone: details.phone,
      address: details.address,
      editorialSummary: details.editorialSummary,
      fetchedAt: new Date(),
    },
  })

  return {
    googlePlaceId: placeId,
    name: details.name,
    category: details.category,
    types: details.types,
    lat: details.lat,
    lng: details.lng,
    rating: details.rating,
    priceLevel: details.priceLevel,
    tags,
    photoUrl: details.photoReferences[0] ? getPhotoUrl(details.photoReferences[0]) : null,
    openingHours: details.openingHours,
    website: details.website,
    phone: details.phone,
    address: details.address,
    recommendationReason: '',
    similarityScore: 0,
  }
})
```

- [ ] **Step 3: Create city coverage API route**

```typescript
// server/api/city-coverage.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { getCache } from '~/server/utils/cache'
import { searchNearby } from '~/server/services/google-places'

export default defineEventHandler(async (event) => {
  const { placeId, lat, lng } = getQuery(event) as {
    placeId?: string
    lat?: string
    lng?: string
  }

  if (!lat || !lng) {
    throw createError({ statusCode: 400, statusMessage: 'lat and lng are required' })
  }

  const cache = getCache()
  const cacheKey = `city-coverage:${lat}:${lng}`
  const cached = await cache.get<{ level: string; count: number }>(cacheKey)
  if (cached) return cached

  // Sample search across common types
  const types = ['restaurant', 'cafe', 'park']
  const uniquePlaceIds = new Set<string>()

  for (const type of types) {
    const results = await searchNearby({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: 10000,
      types: [type],
      maxResults: 20,
    })
    for (const r of results) {
      uniquePlaceIds.add(r.googlePlaceId)
    }
  }

  const count = uniquePlaceIds.size
  let level: 'great' | 'good' | 'limited'
  if (count >= 200) level = 'great'
  else if (count >= 50) level = 'good'
  else level = 'limited'

  // Note: With maxResults=20 per type and 3 types, max is 60 unique.
  // Adjust thresholds for sample: great >= 40, good >= 15, limited < 15
  if (count >= 40) level = 'great'
  else if (count >= 15) level = 'good'
  else level = 'limited'

  const result = { level, count }
  await cache.set(cacheKey, result, 86400) // Cache for 24h
  return result
})
```

- [ ] **Step 4: Create neighborhoods API route**

```typescript
// server/api/neighborhoods.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { getCache } from '~/server/utils/cache'
import { textSearch } from '~/server/services/google-places'

export default defineEventHandler(async (event) => {
  const { cityPlaceId, cityName, lat, lng } = getQuery(event) as {
    cityPlaceId?: string
    cityName?: string
    lat?: string
    lng?: string
  }

  if (!cityName) {
    throw createError({ statusCode: 400, statusMessage: 'cityName is required' })
  }

  const cache = getCache()
  const cacheKey = `neighborhoods:${cityName}`
  const cached = await cache.get<{ neighborhoods: Array<{ name: string }> }>(cacheKey)
  if (cached) return cached

  // Search for neighborhoods in the city
  const results = await textSearch(`${cityName} neighborhoods`, {
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined,
    radius: 30000,
    maxResults: 20,
  })

  const neighborhoods = results.map((r) => ({
    name: r.name,
    bounds: {
      // Approximate bounds around the neighborhood center
      north: r.lat + 0.01,
      south: r.lat - 0.01,
      east: r.lng + 0.01,
      west: r.lng - 0.01,
    },
  }))

  const result = { neighborhoods }
  await cache.set(cacheKey, result, 86400)
  return result
})
```

- [ ] **Step 5: Commit**

```bash
git add server/api/recommendations.get.ts server/api/places/ server/api/city-coverage.get.ts server/api/neighborhoods.get.ts
git commit -m "feat: add recommendations, place details, city coverage, and neighborhoods API routes"
```

---

### Task 11: Favorites API

**Files:**
- Create: `server/api/saved-places.get.ts`, `server/api/saved-places.post.ts`, `server/api/saved-places/[googlePlaceId].delete.ts`, `tests/server/api/saved-places.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/server/api/saved-places.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '~/server/utils/prisma'

describe('saved places (unit)', () => {
  let userId: string

  beforeEach(async () => {
    await prisma.userSavedPlace.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()

    const user = await prisma.user.create({
      data: { email: 'test@example.com', authProvider: 'magic_link' },
    })
    userId = user.id
  })

  it('saves and retrieves a place', async () => {
    await prisma.userSavedPlace.create({
      data: {
        userId,
        googlePlaceId: 'place_fav1',
        name: 'Favorite Spot',
        category: 'food_drink',
      },
    })

    const saved = await prisma.userSavedPlace.findMany({ where: { userId } })
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Favorite Spot')
  })

  it('prevents duplicate saves', async () => {
    await prisma.userSavedPlace.create({
      data: { userId, googlePlaceId: 'place_dup', name: 'Dupe', category: 'food_drink' },
    })

    await expect(
      prisma.userSavedPlace.create({
        data: { userId, googlePlaceId: 'place_dup', name: 'Dupe', category: 'food_drink' },
      }),
    ).rejects.toThrow()
  })

  it('deletes a saved place', async () => {
    await prisma.userSavedPlace.create({
      data: { userId, googlePlaceId: 'place_del', name: 'Delete Me', category: 'food_drink' },
    })

    await prisma.userSavedPlace.deleteMany({
      where: { userId, googlePlaceId: 'place_del' },
    })

    const saved = await prisma.userSavedPlace.findMany({ where: { userId } })
    expect(saved).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/api/saved-places.test.ts`
Expected: FAIL or PASS (depends on Prisma setup).

- [ ] **Step 3: Create saved places API routes**

```typescript
// server/api/saved-places.get.ts
import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const saved = await prisma.userSavedPlace.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: 'desc' },
  })

  return saved.map((s) => ({
    googlePlaceId: s.googlePlaceId,
    name: s.name,
    category: s.category,
    savedAt: s.savedAt,
  }))
})
```

```typescript
// server/api/saved-places.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{
    googlePlaceId: string
    name: string
    category: string
  }>(event)

  if (!body.googlePlaceId || !body.name) {
    throw createError({ statusCode: 400, statusMessage: 'googlePlaceId and name are required' })
  }

  const saved = await prisma.userSavedPlace.upsert({
    where: {
      userId_googlePlaceId: { userId: user.id, googlePlaceId: body.googlePlaceId },
    },
    create: {
      userId: user.id,
      googlePlaceId: body.googlePlaceId,
      name: body.name,
      category: body.category,
    },
    update: {},
  })

  return { googlePlaceId: saved.googlePlaceId, name: saved.name }
})
```

```typescript
// server/api/saved-places/[googlePlaceId].delete.ts
import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const googlePlaceId = getRouterParam(event, 'googlePlaceId')

  if (!googlePlaceId) {
    throw createError({ statusCode: 400, statusMessage: 'Place ID required' })
  }

  await prisma.userSavedPlace.deleteMany({
    where: { userId: user.id, googlePlaceId },
  })

  return { success: true }
})
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/server/api/saved-places.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/saved-places.get.ts server/api/saved-places.post.ts server/api/saved-places/ tests/server/api/saved-places.test.ts
git commit -m "feat: add saved places (favorites) API routes with tests"
```

---

## Phase C: Frontend

### Task 12: Pinia Stores

**Files:**
- Create: `stores/auth.ts`, `stores/preferences.ts`, `stores/recommendations.ts`, `stores/favorites.ts`, `stores/map.ts`

- [ ] **Step 1: Create auth store**

```typescript
// stores/auth.ts
import { defineStore } from 'pinia'

interface AuthUser {
  id: string
  email: string | null
  authProvider: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)

  async function fetchUser() {
    loading.value = true
    try {
      const data = await $fetch<AuthUser | null>('/api/auth/me')
      user.value = data
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  async function sendMagicLink(email: string) {
    await $fetch('/api/auth/magic-link', {
      method: 'POST',
      body: { email },
    })
  }

  return { user, loading, isAuthenticated, fetchUser, logout, sendMagicLink }
})
```

- [ ] **Step 2: Create preferences store**

```typescript
// stores/preferences.ts
import { defineStore } from 'pinia'
import type { UserPreferences, SeedPlace, PreferredArea, DietaryPreference } from '~/types'

export const usePreferencesStore = defineStore('preferences', () => {
  const preferences = ref<UserPreferences | null>(null)
  const seedPlaces = ref<SeedPlace[]>([])
  const preferredAreas = ref<PreferredArea[]>([])
  const loading = ref(false)
  const onboardingComplete = ref(false)

  async function fetchPreferences() {
    loading.value = true
    try {
      const data = await $fetch<{
        preferences: UserPreferences | null
        seedPlaces: SeedPlace[]
        preferredAreas: PreferredArea[]
      }>('/api/preferences')

      preferences.value = data.preferences
      seedPlaces.value = data.seedPlaces
      preferredAreas.value = data.preferredAreas
      onboardingComplete.value = !!data.preferences?.baseCityPlaceId
    } catch {
      // Guest mode — load from localStorage
      loadFromLocalStorage()
    } finally {
      loading.value = false
    }
  }

  async function savePreferences(prefs: UserPreferences) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      await $fetch('/api/preferences', { method: 'PUT', body: prefs })
    } else {
      localStorage.setItem('randevu_preferences', JSON.stringify(prefs))
    }
    preferences.value = prefs
    onboardingComplete.value = true
  }

  async function addSeedPlace(place: Omit<SeedPlace, 'id'>) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      const result = await $fetch<{ id: string }>('/api/seed-places', {
        method: 'POST',
        body: place,
      })
      seedPlaces.value.push({ ...place, id: result.id })
    } else {
      const id = crypto.randomUUID()
      seedPlaces.value.push({ ...place, id })
      localStorage.setItem('randevu_seed_places', JSON.stringify(seedPlaces.value))
    }
  }

  async function removeSeedPlace(id: string) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      await $fetch(`/api/seed-places/${id}`, { method: 'DELETE' })
    }
    seedPlaces.value = seedPlaces.value.filter((p) => p.id !== id)
    localStorage.setItem('randevu_seed_places', JSON.stringify(seedPlaces.value))
  }

  async function savePreferredAreas(areas: PreferredArea[]) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      await $fetch('/api/preferred-areas', {
        method: 'PUT',
        body: { areas: areas.map((a) => ({ name: a.neighborhoodName, bounds: a.bounds })) },
      })
    } else {
      localStorage.setItem('randevu_preferred_areas', JSON.stringify(areas))
    }
    preferredAreas.value = areas
  }

  function loadFromLocalStorage() {
    try {
      const prefs = localStorage.getItem('randevu_preferences')
      if (prefs) preferences.value = JSON.parse(prefs)
      const seeds = localStorage.getItem('randevu_seed_places')
      if (seeds) seedPlaces.value = JSON.parse(seeds)
      const areas = localStorage.getItem('randevu_preferred_areas')
      if (areas) preferredAreas.value = JSON.parse(areas)
      onboardingComplete.value = !!preferences.value?.baseCityPlaceId
    } catch { /* ignore */ }
  }

  return {
    preferences,
    seedPlaces,
    preferredAreas,
    loading,
    onboardingComplete,
    fetchPreferences,
    savePreferences,
    addSeedPlace,
    removeSeedPlace,
    savePreferredAreas,
    loadFromLocalStorage,
  }
})
```

- [ ] **Step 3: Create recommendations store**

```typescript
// stores/recommendations.ts
import { defineStore } from 'pinia'
import type { Place, MapBounds, PlaceCategory } from '~/types'

export const useRecommendationsStore = defineStore('recommendations', () => {
  const places = ref<Place[]>([])
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const selectedPlaceId = ref<string | null>(null)
  const activeCategories = ref<PlaceCategory[]>([])

  const selectedPlace = computed(() =>
    places.value.find((p) => p.googlePlaceId === selectedPlaceId.value) ?? null,
  )

  async function fetchRecommendations(bounds: MapBounds, pageNum: number = 1) {
    loading.value = true
    try {
      const params: Record<string, string> = {
        north: String(bounds.north),
        south: String(bounds.south),
        east: String(bounds.east),
        west: String(bounds.west),
        page: String(pageNum),
      }

      if (activeCategories.value.length > 0) {
        params.categories = activeCategories.value.join(',')
      }

      // For guest mode, include preferences in query
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) {
        const prefsStore = usePreferencesStore()
        if (prefsStore.seedPlaces.length > 0) {
          params.seedPlaceIds = prefsStore.seedPlaces.map((s) => s.googlePlaceId).join(',')
        }
        if (prefsStore.preferences?.dietaryPreferences) {
          params.dietaryPrefs = JSON.stringify(prefsStore.preferences.dietaryPreferences)
        }
      }

      const data = await $fetch<{ places: Place[]; total: number; page: number }>('/api/recommendations', {
        params,
      })

      places.value = data.places
      total.value = data.total
      page.value = data.page
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
    } finally {
      loading.value = false
    }
  }

  function selectPlace(placeId: string | null) {
    selectedPlaceId.value = placeId
  }

  function setCategories(cats: PlaceCategory[]) {
    activeCategories.value = cats
  }

  return {
    places,
    total,
    page,
    loading,
    selectedPlaceId,
    selectedPlace,
    activeCategories,
    fetchRecommendations,
    selectPlace,
    setCategories,
  }
})
```

- [ ] **Step 4: Create favorites store**

```typescript
// stores/favorites.ts
import { defineStore } from 'pinia'

interface SavedPlace {
  googlePlaceId: string
  name: string
  category: string
  savedAt?: string
}

export const useFavoritesStore = defineStore('favorites', () => {
  const savedPlaces = ref<SavedPlace[]>([])
  const loading = ref(false)

  const savedPlaceIds = computed(() => new Set(savedPlaces.value.map((p) => p.googlePlaceId)))

  function isSaved(googlePlaceId: string): boolean {
    return savedPlaceIds.value.has(googlePlaceId)
  }

  async function fetchSavedPlaces() {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      loading.value = true
      try {
        savedPlaces.value = await $fetch<SavedPlace[]>('/api/saved-places')
      } catch {
        savedPlaces.value = []
      } finally {
        loading.value = false
      }
    } else {
      // Guest: load from localStorage
      try {
        const data = localStorage.getItem('randevu_saved_places')
        savedPlaces.value = data ? JSON.parse(data) : []
      } catch {
        savedPlaces.value = []
      }
    }
  }

  async function toggleSave(place: { googlePlaceId: string; name: string; category: string }) {
    const authStore = useAuthStore()
    if (isSaved(place.googlePlaceId)) {
      // Remove
      if (authStore.isAuthenticated) {
        await $fetch(`/api/saved-places/${place.googlePlaceId}`, { method: 'DELETE' })
      }
      savedPlaces.value = savedPlaces.value.filter((p) => p.googlePlaceId !== place.googlePlaceId)
    } else {
      // Add
      if (authStore.isAuthenticated) {
        await $fetch('/api/saved-places', { method: 'POST', body: place })
      }
      savedPlaces.value.push({ ...place, savedAt: new Date().toISOString() })
    }

    if (!authStore.isAuthenticated) {
      localStorage.setItem('randevu_saved_places', JSON.stringify(savedPlaces.value))
    }
  }

  return { savedPlaces, loading, savedPlaceIds, isSaved, fetchSavedPlaces, toggleSave }
})
```

- [ ] **Step 5: Create map store**

```typescript
// stores/map.ts
import { defineStore } from 'pinia'
import type { MapBounds } from '~/types'

export const useMapStore = defineStore('map', () => {
  const bounds = ref<MapBounds | null>(null)
  const center = ref<{ lat: number; lng: number }>({ lat: 40.7128, lng: -74.006 })
  const zoom = ref(13)

  function updateBounds(newBounds: MapBounds) {
    bounds.value = newBounds
  }

  function setCenter(lat: number, lng: number) {
    center.value = { lat, lng }
  }

  function setZoom(level: number) {
    zoom.value = level
  }

  function panTo(lat: number, lng: number) {
    center.value = { lat, lng }
  }

  return { bounds, center, zoom, updateBounds, setCenter, setZoom, panTo }
})
```

- [ ] **Step 6: Commit**

```bash
git add stores/
git commit -m "feat: add Pinia stores for auth, preferences, recommendations, favorites, and map"
```

---

### Task 13: App Layout & Navigation

**Files:**
- Create: `components/layout/NavBar.vue`
- Modify: `layouts/default.vue`, `app.vue`

- [ ] **Step 1: Create NavBar component**

```vue
<!-- components/layout/NavBar.vue -->
<template>
  <nav class="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
    <!-- Left: Logo -->
    <NuxtLink to="/" class="text-xl font-bold text-brand-pink tracking-tight">
      randevu
    </NuxtLink>

    <!-- Center: City display -->
    <div v-if="prefsStore.preferences" class="hidden md:flex items-center gap-2 text-sm text-gray-600">
      <span>{{ prefsStore.preferences.baseCityName }}</span>
      <CoverageIndicator v-if="coverageLevel" :level="coverageLevel" />
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2">
      <button
        @click="$emit('toggle-filters')"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Filters"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </button>

      <NuxtLink
        to="/favorites"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Favorites"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </NuxtLink>

      <button
        @click="$emit('open-preferences')"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Preferences"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <!-- Auth button -->
      <template v-if="authStore.isAuthenticated">
        <button
          @click="authStore.logout()"
          class="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          Log out
        </button>
      </template>
      <template v-else>
        <button
          @click="$emit('open-login')"
          class="text-sm text-white bg-brand-pink hover:bg-pink-600 px-3 py-1.5 rounded-lg"
        >
          Log in
        </button>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineEmits<{
  'toggle-filters': []
  'open-preferences': []
  'open-login': []
}>()

const authStore = useAuthStore()
const prefsStore = usePreferencesStore()
const coverageLevel = ref<string | null>(null)
</script>
```

- [ ] **Step 2: Create CoverageIndicator component**

```vue
<!-- components/ui/CoverageIndicator.vue -->
<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
    :class="colorClass"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  level: 'great' | 'good' | 'limited'
}>()

const colorClass = computed(() => ({
  great: 'bg-green-100 text-green-800',
  good: 'bg-amber-100 text-amber-800',
  limited: 'bg-red-100 text-red-800',
}[props.level]))

const label = computed(() => ({
  great: 'Great coverage',
  good: 'Good coverage',
  limited: 'Limited coverage',
}[props.level]))
</script>
```

- [ ] **Step 3: Update default layout**

```vue
<!-- layouts/default.vue -->
<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <NavBar
      @toggle-filters="filtersOpen = !filtersOpen"
      @open-preferences="navigateTo('/onboarding')"
      @open-login="loginOpen = true"
    />
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const filtersOpen = ref(false)
const loginOpen = ref(false)

// Initialize auth on app load
const authStore = useAuthStore()
const prefsStore = usePreferencesStore()

onMounted(async () => {
  await authStore.fetchUser()
  if (authStore.isAuthenticated) {
    await prefsStore.fetchPreferences()
  } else {
    prefsStore.loadFromLocalStorage()
  }
})
</script>
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/NavBar.vue components/ui/CoverageIndicator.vue layouts/default.vue app.vue
git commit -m "feat: add app layout with navigation bar and coverage indicator"
```

---

### Task 14: Onboarding Wizard

**Files:**
- Create: `pages/onboarding.vue`, `components/onboarding/OnboardingWizard.vue`, `components/onboarding/StepBaseCity.vue`, `components/onboarding/StepSeedPlaces.vue`, `components/onboarding/StepDietaryPrefs.vue`, `components/onboarding/StepPreferredAreas.vue`, `components/ui/ThreeStateToggle.vue`, `components/ui/NeighborhoodChip.vue`, `composables/useGoogleAutocomplete.ts`

- [ ] **Step 1: Create Google Autocomplete composable**

```typescript
// composables/useGoogleAutocomplete.ts
import type { AutocompleteSuggestion } from '~/server/services/google-places'

export function useGoogleAutocomplete() {
  const query = ref('')
  const suggestions = ref<AutocompleteSuggestion[]>([])
  const loading = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  async function search(input: string, options?: {
    types?: string[]
    lat?: number
    lng?: number
  }) {
    query.value = input

    if (debounceTimer) clearTimeout(debounceTimer)
    if (input.length < 2) {
      suggestions.value = []
      return
    }

    debounceTimer = setTimeout(async () => {
      loading.value = true
      try {
        const params: Record<string, string> = { input }
        if (options?.types) params.types = options.types.join(',')
        if (options?.lat) params.lat = String(options.lat)
        if (options?.lng) params.lng = String(options.lng)

        // Call our backend proxy (to keep API key server-side)
        suggestions.value = await $fetch<AutocompleteSuggestion[]>('/api/autocomplete', {
          params,
        })
      } catch {
        suggestions.value = []
      } finally {
        loading.value = false
      }
    }, 300) // 300ms debounce per spec
  }

  function clear() {
    query.value = ''
    suggestions.value = []
  }

  return { query, suggestions, loading, search, clear }
}
```

**Note:** This composable calls `/api/autocomplete` — we need to add this proxy route. Add it now:

```typescript
// server/api/autocomplete.get.ts
import { defineEventHandler, getQuery } from 'h3'
import { autocomplete } from '~/server/services/google-places'

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    input: string
    types?: string
    lat?: string
    lng?: string
  }

  if (!query.input) return []

  return autocomplete({
    input: query.input,
    types: query.types?.split(','),
    lat: query.lat ? parseFloat(query.lat) : undefined,
    lng: query.lng ? parseFloat(query.lng) : undefined,
  })
})
```

- [ ] **Step 2: Create ThreeStateToggle component**

```vue
<!-- components/ui/ThreeStateToggle.vue -->
<template>
  <button
    @click="cycle"
    class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
    :class="stateClass"
  >
    <span class="text-sm font-medium">{{ label }}</span>
    <span class="text-xs" :class="stateTextClass">{{ stateLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import type { DietaryPreference } from '~/types'

const props = defineProps<{
  label: string
  modelValue: DietaryPreference
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DietaryPreference]
}>()

const stateOrder: DietaryPreference[] = ['neutral', 'must', 'dealbreaker']

function cycle() {
  const currentIndex = stateOrder.indexOf(props.modelValue)
  const next = stateOrder[(currentIndex + 1) % stateOrder.length]
  emit('update:modelValue', next)
}

const stateClass = computed(() => ({
  must: 'border-green-400 bg-green-50',
  neutral: 'border-gray-200 bg-white',
  dealbreaker: 'border-red-400 bg-red-50',
}[props.modelValue]))

const stateTextClass = computed(() => ({
  must: 'text-green-600',
  neutral: 'text-gray-400',
  dealbreaker: 'text-red-600',
}[props.modelValue]))

const stateLabel = computed(() => ({
  must: 'Must-have',
  neutral: 'No preference',
  dealbreaker: 'Deal-breaker',
}[props.modelValue]))
</script>
```

- [ ] **Step 3: Create NeighborhoodChip component**

```vue
<!-- components/ui/NeighborhoodChip.vue -->
<template>
  <button
    @click="$emit('toggle')"
    class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
    :class="selected
      ? 'bg-brand-pink text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
  >
    {{ name }}
  </button>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  selected: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
```

- [ ] **Step 4: Create onboarding step components**

```vue
<!-- components/onboarding/StepBaseCity.vue -->
<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Where are you based?</h2>
    <p class="text-gray-600">We'll find date spots in your city.</p>

    <div class="relative">
      <input
        v-model="searchInput"
        @input="onInput"
        type="text"
        placeholder="Search for your city..."
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
      />

      <!-- Suggestions dropdown -->
      <ul
        v-if="autocomplete.suggestions.value.length > 0"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
      >
        <li
          v-for="suggestion in autocomplete.suggestions.value"
          :key="suggestion.placeId"
          @click="selectCity(suggestion)"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer"
        >
          <div class="font-medium">{{ suggestion.mainText }}</div>
          <div class="text-sm text-gray-500">{{ suggestion.secondaryText }}</div>
        </li>
      </ul>
    </div>

    <!-- Selected city with coverage -->
    <div v-if="selectedCity" class="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <div>
        <div class="font-medium">{{ selectedCity.mainText }}</div>
        <div class="text-sm text-gray-500">{{ selectedCity.secondaryText }}</div>
      </div>
      <CoverageIndicator v-if="coverage" :level="coverage.level" />
      <span v-if="checkingCoverage" class="text-sm text-gray-400">Checking coverage...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AutocompleteSuggestion } from '~/server/services/google-places'
import type { CoverageResult } from '~/types'

const emit = defineEmits<{
  'city-selected': [city: { placeId: string; name: string; lat: number; lng: number }]
}>()

const autocomplete = useGoogleAutocomplete()
const searchInput = ref('')
const selectedCity = ref<AutocompleteSuggestion | null>(null)
const coverage = ref<CoverageResult | null>(null)
const checkingCoverage = ref(false)

function onInput() {
  autocomplete.search(searchInput.value, { types: ['(cities)'] })
}

async function selectCity(suggestion: AutocompleteSuggestion) {
  selectedCity.value = suggestion
  autocomplete.clear()
  searchInput.value = suggestion.mainText

  // Get place details for lat/lng
  checkingCoverage.value = true
  try {
    const details = await $fetch<{ lat: number; lng: number }>(`/api/places/${suggestion.placeId}`)

    // Check coverage
    const coverageResult = await $fetch<CoverageResult>('/api/city-coverage', {
      params: { lat: details.lat, lng: details.lng },
    })
    coverage.value = coverageResult

    emit('city-selected', {
      placeId: suggestion.placeId,
      name: suggestion.mainText,
      lat: details.lat,
      lng: details.lng,
    })
  } finally {
    checkingCoverage.value = false
  }
}
</script>
```

```vue
<!-- components/onboarding/StepSeedPlaces.vue -->
<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Places you love</h2>
    <p class="text-gray-600">Add places you already enjoy — we'll find similar spots.</p>

    <div class="relative">
      <input
        v-model="searchInput"
        @input="onInput"
        type="text"
        placeholder="Search for a place..."
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
      />

      <ul
        v-if="autocomplete.suggestions.value.length > 0"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
      >
        <li
          v-for="suggestion in autocomplete.suggestions.value"
          :key="suggestion.placeId"
          @click="addPlace(suggestion)"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer"
        >
          <div class="font-medium">{{ suggestion.mainText }}</div>
          <div class="text-sm text-gray-500">{{ suggestion.secondaryText }}</div>
        </li>
      </ul>
    </div>

    <!-- Added places -->
    <div class="space-y-2">
      <div
        v-for="place in prefsStore.seedPlaces"
        :key="place.id"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      >
        <div>
          <div class="font-medium text-sm">{{ place.name }}</div>
          <div class="text-xs text-gray-500">{{ place.category }}</div>
        </div>
        <button
          @click="prefsStore.removeSeedPlace(place.id)"
          class="text-gray-400 hover:text-red-500"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AutocompleteSuggestion } from '~/server/services/google-places'

const prefsStore = usePreferencesStore()
const autocomplete = useGoogleAutocomplete()
const searchInput = ref('')

function onInput() {
  const prefs = prefsStore.preferences
  autocomplete.search(searchInput.value, {
    lat: prefs?.baseCityLat,
    lng: prefs?.baseCityLng,
  })
}

async function addPlace(suggestion: AutocompleteSuggestion) {
  autocomplete.clear()
  searchInput.value = ''

  const details = await $fetch<{ lat: number; lng: number; category: string }>(
    `/api/places/${suggestion.placeId}`,
  )

  await prefsStore.addSeedPlace({
    googlePlaceId: suggestion.placeId,
    name: suggestion.mainText,
    category: details.category,
    lat: details.lat,
    lng: details.lng,
  })
}
</script>
```

```vue
<!-- components/onboarding/StepDietaryPrefs.vue -->
<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Food & drink preferences</h2>
    <p class="text-gray-600">Tap to cycle: no preference → must-have → deal-breaker</p>

    <div class="grid grid-cols-2 gap-3">
      <ThreeStateToggle
        v-for="tag in DIETARY_TAGS"
        :key="tag.key"
        :label="tag.label"
        :model-value="preferences[tag.key] ?? 'neutral'"
        @update:model-value="(val) => updatePref(tag.key, val)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DIETARY_TAGS, type DietaryPreference } from '~/types'

const prefsStore = usePreferencesStore()

const preferences = ref<Record<string, DietaryPreference>>(
  (prefsStore.preferences?.dietaryPreferences as Record<string, DietaryPreference>) ?? {},
)

function updatePref(key: string, value: DietaryPreference) {
  preferences.value = { ...preferences.value, [key]: value }
}

// Expose for parent wizard to save
defineExpose({ preferences })
</script>
```

```vue
<!-- components/onboarding/StepPreferredAreas.vue -->
<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Preferred areas</h2>
    <p class="text-gray-600">Pick neighborhoods you like exploring.</p>

    <!-- Search input -->
    <div class="relative">
      <input
        v-model="searchInput"
        @input="onInput"
        type="text"
        placeholder="Search for a neighborhood..."
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
      />

      <ul
        v-if="autocomplete.suggestions.value.length > 0"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
      >
        <li
          v-for="suggestion in autocomplete.suggestions.value"
          :key="suggestion.placeId"
          @click="addArea(suggestion)"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer"
        >
          {{ suggestion.mainText }}
        </li>
      </ul>
    </div>

    <!-- Pre-fetched + selected neighborhoods -->
    <div class="flex flex-wrap gap-2">
      <NeighborhoodChip
        v-for="area in allAreas"
        :key="area.name"
        :name="area.name"
        :selected="selectedNames.has(area.name)"
        @toggle="toggleArea(area)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AutocompleteSuggestion } from '~/server/services/google-places'
import type { PreferredArea, MapBounds } from '~/types'

const prefsStore = usePreferencesStore()
const autocomplete = useGoogleAutocomplete()
const searchInput = ref('')

interface AreaItem {
  name: string
  bounds: MapBounds
}

const fetchedAreas = ref<AreaItem[]>([])
const selectedAreas = ref<AreaItem[]>([...prefsStore.preferredAreas.map((a) => ({
  name: a.neighborhoodName,
  bounds: a.bounds as MapBounds,
}))])

const selectedNames = computed(() => new Set(selectedAreas.value.map((a) => a.name)))
const allAreas = computed(() => {
  const seen = new Set<string>()
  const result: AreaItem[] = []
  for (const a of [...selectedAreas.value, ...fetchedAreas.value]) {
    if (!seen.has(a.name)) {
      seen.add(a.name)
      result.push(a)
    }
  }
  return result
})

function onInput() {
  const prefs = prefsStore.preferences
  autocomplete.search(searchInput.value, {
    types: ['sublocality', 'neighborhood'],
    lat: prefs?.baseCityLat,
    lng: prefs?.baseCityLng,
  })
}

function addArea(suggestion: AutocompleteSuggestion) {
  autocomplete.clear()
  searchInput.value = ''

  const area: AreaItem = {
    name: suggestion.mainText,
    bounds: { north: 0, south: 0, east: 0, west: 0 }, // Will be populated
  }
  if (!selectedNames.value.has(area.name)) {
    selectedAreas.value.push(area)
  }
}

function toggleArea(area: AreaItem) {
  if (selectedNames.value.has(area.name)) {
    selectedAreas.value = selectedAreas.value.filter((a) => a.name !== area.name)
  } else {
    selectedAreas.value.push(area)
  }
}

// Fetch neighborhoods for city on mount
onMounted(async () => {
  const prefs = prefsStore.preferences
  if (prefs?.baseCityName) {
    try {
      const data = await $fetch<{ neighborhoods: AreaItem[] }>('/api/neighborhoods', {
        params: {
          cityName: prefs.baseCityName,
          lat: prefs.baseCityLat,
          lng: prefs.baseCityLng,
        },
      })
      fetchedAreas.value = data.neighborhoods
    } catch { /* ignore */ }
  }
})

// Expose for parent
defineExpose({ selectedAreas })
</script>
```

- [ ] **Step 5: Create OnboardingWizard container**

```vue
<!-- components/onboarding/OnboardingWizard.vue -->
<template>
  <div class="max-w-lg mx-auto py-8 px-4">
    <!-- Progress indicator -->
    <div class="flex items-center gap-2 mb-8">
      <div
        v-for="s in 4"
        :key="s"
        class="h-1.5 flex-1 rounded-full transition-colors"
        :class="s <= step ? 'bg-brand-pink' : 'bg-gray-200'"
      />
    </div>

    <!-- Steps -->
    <StepBaseCity v-if="step === 1" @city-selected="onCitySelected" />
    <StepSeedPlaces v-else-if="step === 2" />
    <StepDietaryPrefs v-else-if="step === 3" ref="dietaryRef" />
    <StepPreferredAreas v-else-if="step === 4" ref="areasRef" />

    <!-- Navigation -->
    <div class="flex justify-between mt-8">
      <button
        v-if="step > 1"
        @click="step--"
        class="px-4 py-2 text-gray-600 hover:text-gray-900"
      >
        Back
      </button>
      <div v-else />

      <div class="flex gap-2">
        <button
          v-if="step > 1 && step < 4"
          @click="skip"
          class="px-4 py-2 text-gray-400 hover:text-gray-600"
        >
          Skip
        </button>

        <button
          @click="next"
          :disabled="step === 1 && !citySelected"
          class="px-6 py-2 bg-brand-pink text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ step === 4 ? 'Finish' : 'Next' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const step = ref(1)
const citySelected = ref(false)
const dietaryRef = ref<{ preferences: Record<string, string> } | null>(null)
const areasRef = ref<{ selectedAreas: Array<{ name: string; bounds: any }> } | null>(null)

const prefsStore = usePreferencesStore()

function onCitySelected(city: { placeId: string; name: string; lat: number; lng: number }) {
  citySelected.value = true
  prefsStore.savePreferences({
    baseCityPlaceId: city.placeId,
    baseCityName: city.name,
    baseCityLat: city.lat,
    baseCityLng: city.lng,
    dietaryPreferences: prefsStore.preferences?.dietaryPreferences ?? {},
  })
}

async function next() {
  if (step.value === 3 && dietaryRef.value) {
    // Save dietary preferences
    await prefsStore.savePreferences({
      ...prefsStore.preferences!,
      dietaryPreferences: dietaryRef.value.preferences,
    })
  }

  if (step.value === 4) {
    // Save preferred areas and finish
    if (areasRef.value) {
      await prefsStore.savePreferredAreas(
        areasRef.value.selectedAreas.map((a) => ({
          neighborhoodName: a.name,
          bounds: a.bounds,
        })),
      )
    }
    await navigateTo('/')
    return
  }

  step.value++
}

function skip() {
  step.value++
}
</script>
```

- [ ] **Step 6: Create onboarding page**

```vue
<!-- pages/onboarding.vue -->
<template>
  <OnboardingWizard />
</template>
```

- [ ] **Step 7: Commit**

```bash
git add pages/onboarding.vue components/onboarding/ components/ui/ThreeStateToggle.vue components/ui/NeighborhoodChip.vue composables/useGoogleAutocomplete.ts server/api/autocomplete.get.ts
git commit -m "feat: add onboarding wizard with city selection, seed places, dietary prefs, and areas"
```

---

### Task 15: Map + List View (Desktop)

**Files:**
- Create: `pages/index.vue`, `components/map/MapContainer.vue`, `components/places/PlaceCard.vue`, `components/places/PlaceList.vue`, `components/favorites/HeartButton.vue`, `composables/useMapBounds.ts`

- [ ] **Step 1: Create HeartButton component**

```vue
<!-- components/favorites/HeartButton.vue -->
<template>
  <button
    @click.stop="onClick"
    class="transition-colors"
    :class="saved ? 'text-red-500' : 'text-gray-300 hover:text-red-300'"
  >
    <svg class="w-6 h-6" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  googlePlaceId: string
  name: string
  category: string
}>()

const favoritesStore = useFavoritesStore()
const saved = computed(() => favoritesStore.isSaved(props.googlePlaceId))

function onClick() {
  favoritesStore.toggleSave({
    googlePlaceId: props.googlePlaceId,
    name: props.name,
    category: props.category,
  })
}
</script>
```

- [ ] **Step 2: Create PlaceCard component**

```vue
<!-- components/places/PlaceCard.vue -->
<template>
  <div
    @click="$emit('select', place.googlePlaceId)"
    class="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
  >
    <!-- Photo -->
    <div class="relative h-40 bg-gray-200">
      <img
        v-if="place.photoUrl"
        :src="place.photoUrl"
        :alt="place.name"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
        No photo
      </div>
      <HeartButton
        class="absolute top-2 right-2"
        :google-place-id="place.googlePlaceId"
        :name="place.name"
        :category="place.category"
      />
    </div>

    <!-- Info -->
    <div class="p-3">
      <h3 class="font-semibold text-gray-900 truncate">{{ place.name }}</h3>

      <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
        <span
          class="w-2 h-2 rounded-full"
          :style="{ backgroundColor: categoryColor }"
        />
        <span>{{ categoryLabel }}</span>
        <span v-if="place.rating">· ★ {{ place.rating.toFixed(1) }}</span>
        <span v-if="place.priceLevel">· {{ priceLabel }}</span>
      </div>

      <!-- Why recommended badge -->
      <div
        v-if="place.recommendationReason"
        class="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700"
      >
        {{ place.recommendationReason }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Place } from '~/types'
import { CATEGORY_COLORS } from '~/types'

const props = defineProps<{
  place: Place
}>()

defineEmits<{
  select: [googlePlaceId: string]
}>()

const categoryColor = computed(() => CATEGORY_COLORS[props.place.category])

const categoryLabel = computed(() => ({
  food_drink: 'Food & Drink',
  outdoors: 'Outdoors',
  activities: 'Activities',
  chill_spots: 'Chill Spots',
}[props.place.category]))

const priceLabel = computed(() => '$'.repeat(props.place.priceLevel || 1))
</script>
```

- [ ] **Step 3: Create PlaceList component**

```vue
<!-- components/places/PlaceList.vue -->
<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      <span class="text-sm text-gray-600">{{ total }} places found</span>
      <div class="flex gap-1">
        <button
          @click="viewMode = 'grid'"
          class="p-1.5 rounded"
          :class="viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          @click="viewMode = 'list'"
          class="p-1.5 rounded"
          :class="viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- List/Grid -->
    <div class="flex-1 overflow-y-auto p-4">
      <div
        :class="viewMode === 'grid'
          ? 'grid grid-cols-2 gap-4'
          : 'flex flex-col gap-3'"
      >
        <PlaceCard
          v-for="place in places"
          :key="place.googlePlaceId"
          :place="place"
          @select="$emit('select', $event)"
        />
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-2 gap-4 mt-4">
        <div v-for="i in 4" :key="i" class="bg-gray-200 rounded-lg h-48 animate-pulse" />
      </div>

      <!-- Empty state -->
      <div v-if="!loading && places.length === 0" class="text-center py-12 text-gray-500">
        <p class="text-lg font-medium">No places found</p>
        <p class="mt-1 text-sm">Try zooming out or adjusting your filters.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Place } from '~/types'

defineProps<{
  places: Place[]
  total: number
  loading: boolean
}>()

defineEmits<{
  select: [googlePlaceId: string]
}>()

const viewMode = ref<'grid' | 'list'>('grid')
</script>
```

- [ ] **Step 4: Create MapContainer component (client-only)**

```vue
<!-- components/map/MapContainer.vue -->
<template>
  <div ref="mapEl" class="w-full h-full" />
</template>

<script setup lang="ts">
import type { Place, PlaceCategory } from '~/types'
import { CATEGORY_COLORS } from '~/types'

const props = defineProps<{
  places: Place[]
  center: { lat: number; lng: number }
  zoom: number
  selectedPlaceId: string | null
}>()

const emit = defineEmits<{
  'bounds-changed': [bounds: { north: number; south: number; east: number; west: number }]
  'pin-click': [googlePlaceId: string]
  'update:center': [center: { lat: number; lng: number }]
  'update:zoom': [zoom: number]
}>()

const mapEl = ref<HTMLElement | null>(null)
let map: any = null
let markers: any[] = []

onMounted(async () => {
  // Dynamic import for SSR compatibility
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  if (!mapEl.value) return

  map = L.map(mapEl.value).setView([props.center.lat, props.center.lng], props.zoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  map.on('moveend', () => {
    const bounds = map.getBounds()
    emit('bounds-changed', {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    })
    const center = map.getCenter()
    emit('update:center', { lat: center.lat, lng: center.lng })
    emit('update:zoom', map.getZoom())
  })

  updateMarkers()
})

function createPinIcon(category: PlaceCategory, isSelected: boolean) {
  const L = require('leaflet')
  const color = CATEGORY_COLORS[category]
  const size = isSelected ? 16 : 10
  const opacity = isSelected ? 1 : 0.85

  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);opacity:${opacity};transition:all 0.2s;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function updateMarkers() {
  if (!map) return
  const L = require('leaflet')

  // Remove existing markers
  markers.forEach((m) => m.remove())
  markers = []

  for (const place of props.places) {
    const isSelected = place.googlePlaceId === props.selectedPlaceId
    const marker = L.marker([place.lat, place.lng], {
      icon: createPinIcon(place.category, isSelected),
    })
      .addTo(map)
      .on('click', () => emit('pin-click', place.googlePlaceId))

    markers.push(marker)
  }
}

// Watch for place changes
watch(() => props.places, updateMarkers, { deep: true })
watch(() => props.selectedPlaceId, updateMarkers)

// Watch for center/zoom changes from parent
watch(() => props.center, (newCenter) => {
  if (map) map.setView([newCenter.lat, newCenter.lng], map.getZoom())
})

// Pan to selected place
function panTo(lat: number, lng: number) {
  if (map) map.panTo([lat, lng])
}

defineExpose({ panTo })
</script>

<style>
.custom-pin {
  background: transparent !important;
  border: none !important;
}
</style>
```

- [ ] **Step 5: Create useMapBounds composable**

```typescript
// composables/useMapBounds.ts
import type { MapBounds } from '~/types'

export function useMapBounds() {
  const mapStore = useMapStore()
  const recsStore = useRecommendationsStore()

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function onBoundsChanged(bounds: MapBounds) {
    mapStore.updateBounds(bounds)

    // Debounce recommendation fetching on map pan/zoom
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      recsStore.fetchRecommendations(bounds)
    }, 300)
  }

  return { onBoundsChanged }
}
```

- [ ] **Step 6: Create main page (index.vue)**

```vue
<!-- pages/index.vue -->
<template>
  <div class="h-full flex">
    <!-- Redirect to onboarding if not set up -->
    <div v-if="!prefsStore.onboardingComplete && !prefsStore.loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Welcome to randevu</h2>
        <p class="text-gray-600 mb-6">Let's set up your preferences to find great date spots.</p>
        <NuxtLink
          to="/onboarding"
          class="px-6 py-3 bg-brand-pink text-white rounded-lg hover:bg-pink-600"
        >
          Get Started
        </NuxtLink>
      </div>
    </div>

    <template v-else-if="prefsStore.onboardingComplete">
      <!-- Map Panel (desktop only) -->
      <div class="hidden md:block w-[55%] relative">
        <ClientOnly>
          <MapContainer
            ref="mapRef"
            :places="recsStore.places"
            :center="mapStore.center"
            :zoom="mapStore.zoom"
            :selected-place-id="recsStore.selectedPlaceId"
            @bounds-changed="mapBounds.onBoundsChanged"
            @pin-click="onPinClick"
            @update:center="(c) => mapStore.setCenter(c.lat, c.lng)"
            @update:zoom="(z) => mapStore.setZoom(z)"
          />
        </ClientOnly>

        <!-- Place count overlay -->
        <div class="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-sm text-gray-600 shadow">
          Showing {{ recsStore.places.length }} places in view
        </div>
      </div>

      <!-- List Panel -->
      <div class="flex-1 border-l border-gray-200 relative">
        <PlaceList
          :places="recsStore.places"
          :total="recsStore.total"
          :loading="recsStore.loading"
          @select="onPlaceSelect"
        />

        <!-- Detail Drawer -->
        <DetailDrawer
          v-if="recsStore.selectedPlace"
          :place="recsStore.selectedPlace"
          @close="recsStore.selectPlace(null)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const prefsStore = usePreferencesStore()
const recsStore = useRecommendationsStore()
const mapStore = useMapStore()
const favoritesStore = useFavoritesStore()
const mapBounds = useMapBounds()
const mapRef = ref<{ panTo: (lat: number, lng: number) => void } | null>(null)

// Initialize map center from preferences
watch(
  () => prefsStore.preferences,
  (prefs) => {
    if (prefs) {
      mapStore.setCenter(prefs.baseCityLat, prefs.baseCityLng)
    }
  },
  { immediate: true },
)

// Fetch favorites on mount
onMounted(() => {
  favoritesStore.fetchSavedPlaces()
})

function onPinClick(googlePlaceId: string) {
  recsStore.selectPlace(googlePlaceId)
}

function onPlaceSelect(googlePlaceId: string) {
  recsStore.selectPlace(googlePlaceId)
  // Pan map to selected place
  const place = recsStore.places.find((p) => p.googlePlaceId === googlePlaceId)
  if (place && mapRef.value) {
    mapRef.value.panTo(place.lat, place.lng)
  }
}
</script>
```

- [ ] **Step 7: Commit**

```bash
git add pages/index.vue components/map/MapContainer.vue components/places/PlaceCard.vue components/places/PlaceList.vue components/favorites/HeartButton.vue composables/useMapBounds.ts
git commit -m "feat: add main map + list view with place cards and pin interaction"
```

---

### Task 16: Detail Drawer

**Files:**
- Create: `components/places/DetailDrawer.vue`

- [ ] **Step 1: Create DetailDrawer component**

```vue
<!-- components/places/DetailDrawer.vue -->
<template>
  <div
    class="absolute inset-y-0 right-0 w-full md:w-[70%] bg-white shadow-xl z-10 overflow-y-auto"
    @click.stop
  >
    <!-- Hero photo -->
    <div class="relative h-56 bg-gray-200">
      <img
        v-if="placeDetails?.photoUrl || place.photoUrl"
        :src="placeDetails?.photoUrl || place.photoUrl"
        :alt="place.name"
        class="w-full h-full object-cover"
      />
      <div class="absolute top-3 right-3 flex gap-2">
        <HeartButton
          :google-place-id="place.googlePlaceId"
          :name="place.name"
          :category="place.category"
          class="bg-white/80 backdrop-blur rounded-full p-2"
        />
        <button
          @click="$emit('close')"
          class="bg-white/80 backdrop-blur rounded-full p-2 text-gray-600 hover:text-gray-900"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div class="p-5 space-y-5">
      <!-- Title section -->
      <div>
        <h2 class="text-2xl font-bold text-gray-900">{{ place.name }}</h2>
        <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <span
            class="w-2 h-2 rounded-full"
            :style="{ backgroundColor: categoryColor }"
          />
          <span>{{ categoryLabel }}</span>
          <span v-if="place.rating">· ★ {{ place.rating.toFixed(1) }}</span>
          <span v-if="place.priceLevel">· {{ priceLabel }}</span>
        </div>
      </div>

      <!-- Why we recommend this -->
      <div
        v-if="place.recommendationReason"
        class="p-4 bg-green-50 rounded-lg border border-green-100"
      >
        <div class="text-sm font-medium text-green-800">Why we recommend this</div>
        <div class="text-sm text-green-700 mt-1">{{ place.recommendationReason }}</div>
      </div>

      <!-- Tags -->
      <div v-if="displayTags.length > 0" class="flex flex-wrap gap-2">
        <span
          v-for="tag in displayTags"
          :key="tag"
          class="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
        >
          {{ tag }}
        </span>
      </div>

      <!-- Info rows -->
      <div class="space-y-3 text-sm">
        <div v-if="placeDetails?.openingHours" class="flex items-start gap-3">
          <svg class="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span :class="placeDetails.openingHours.openNow ? 'text-green-600' : 'text-red-600'">
              {{ placeDetails.openingHours.openNow ? 'Open now' : 'Closed' }}
            </span>
            <div v-if="placeDetails.openingHours.weekdayDescriptions" class="text-gray-500 mt-1">
              <div v-for="line in placeDetails.openingHours.weekdayDescriptions" :key="line">
                {{ line }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="placeDetails?.address" class="flex items-center gap-3">
          <svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-gray-600">{{ placeDetails.address }}</span>
        </div>

        <div v-if="placeDetails?.phone" class="flex items-center gap-3">
          <svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span class="text-gray-600">{{ placeDetails.phone }}</span>
        </div>
      </div>

      <!-- CTA Buttons -->
      <div class="flex flex-col gap-3 pt-2">
        <a
          :href="directionsUrl"
          target="_blank"
          class="flex items-center justify-center gap-2 px-4 py-3 bg-brand-pink text-white rounded-lg hover:bg-pink-600 font-medium"
        >
          Get Directions
        </a>
        <div class="flex gap-3">
          <a
            v-if="placeDetails?.website"
            :href="placeDetails.website"
            target="_blank"
            class="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            Visit Website
          </a>
          <a
            :href="googleMapsUrl"
            target="_blank"
            class="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            See on Google Maps
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Place } from '~/types'
import { CATEGORY_COLORS } from '~/types'

const props = defineProps<{
  place: Place
}>()

defineEmits<{
  close: []
}>()

// Fetch full details if needed
const placeDetails = ref<Place | null>(null)

onMounted(async () => {
  try {
    placeDetails.value = await $fetch<Place>(`/api/places/${props.place.googlePlaceId}`)
  } catch {
    placeDetails.value = props.place
  }
})

watch(() => props.place.googlePlaceId, async (newId) => {
  try {
    placeDetails.value = await $fetch<Place>(`/api/places/${newId}`)
  } catch {
    placeDetails.value = props.place
  }
})

const categoryColor = computed(() => CATEGORY_COLORS[props.place.category])
const categoryLabel = computed(() => ({
  food_drink: 'Food & Drink',
  outdoors: 'Outdoors',
  activities: 'Activities',
  chill_spots: 'Chill Spots',
}[props.place.category]))

const priceLabel = computed(() => '$'.repeat(props.place.priceLevel || 1))
const displayTags = computed(() => placeDetails.value?.tags ?? props.place.tags ?? [])

const directionsUrl = computed(() =>
  `https://www.google.com/maps/dir/?api=1&destination=${props.place.lat},${props.place.lng}`,
)

const googleMapsUrl = computed(() =>
  `https://www.google.com/maps/place/?q=place_id:${props.place.googlePlaceId}`,
)
</script>
```

- [ ] **Step 2: Commit**

```bash
git add components/places/DetailDrawer.vue
git commit -m "feat: add detail drawer with place info, tags, hours, and CTA buttons"
```

---

### Task 17: Mobile Responsive UI

**Files:**
- Modify: `pages/index.vue`, `components/places/PlaceCard.vue`, `components/places/DetailDrawer.vue`

- [ ] **Step 1: Update index.vue for mobile list-only view**

The existing `pages/index.vue` already hides the map on mobile (`hidden md:block`). Add mobile-specific filter chips and ensure the list takes full width on mobile.

Add filter chips to the top of the list on mobile:

In `pages/index.vue`, add above the `<PlaceList>` component inside the list panel:

```vue
<!-- Mobile filter chips (shown only on mobile, above list) -->
<div class="md:hidden px-4 py-2 border-b border-gray-200 flex gap-2 overflow-x-auto">
  <button
    v-for="cat in categoryOptions"
    :key="cat.value"
    @click="toggleCategory(cat.value)"
    class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
    :class="recsStore.activeCategories.includes(cat.value)
      ? 'bg-brand-pink text-white border-brand-pink'
      : 'bg-white text-gray-600 border-gray-200'"
  >
    {{ cat.label }}
  </button>
</div>
```

Add to the `<script setup>`:

```typescript
import type { PlaceCategory } from '~/types'

const categoryOptions = [
  { value: 'food_drink' as PlaceCategory, label: 'Food & Drink' },
  { value: 'outdoors' as PlaceCategory, label: 'Outdoors' },
  { value: 'activities' as PlaceCategory, label: 'Activities' },
  { value: 'chill_spots' as PlaceCategory, label: 'Chill Spots' },
]

function toggleCategory(cat: PlaceCategory) {
  const current = recsStore.activeCategories
  if (current.includes(cat)) {
    recsStore.setCategories(current.filter((c) => c !== cat))
  } else {
    recsStore.setCategories([...current, cat])
  }
  // Re-fetch with new filters
  if (mapStore.bounds) {
    recsStore.fetchRecommendations(mapStore.bounds)
  }
}
```

- [ ] **Step 2: Make DetailDrawer fullscreen on mobile**

Update the root div class in `DetailDrawer.vue`:

```vue
<div
  class="absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[70%] bg-white shadow-xl z-10 overflow-y-auto"
  @click.stop
>
```

This makes it fullscreen on mobile (`inset-0`) and right-aligned 70% width on desktop.

- [ ] **Step 3: Add horizontal card layout for mobile list**

In `PlaceList.vue`, add a mobile-specific card layout:

```vue
<!-- Mobile horizontal cards -->
<div class="md:hidden flex flex-col gap-3">
  <div
    v-for="place in places"
    :key="place.googlePlaceId"
    @click="$emit('select', place.googlePlaceId)"
    class="flex bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 cursor-pointer"
  >
    <div class="w-24 h-24 shrink-0 bg-gray-200">
      <img
        v-if="place.photoUrl"
        :src="place.photoUrl"
        :alt="place.name"
        class="w-full h-full object-cover"
      />
    </div>
    <div class="flex-1 p-3 min-w-0">
      <h3 class="font-semibold text-gray-900 truncate text-sm">{{ place.name }}</h3>
      <div class="text-xs text-gray-500 mt-0.5">
        ★ {{ place.rating?.toFixed(1) }} · {{ '$'.repeat(place.priceLevel || 1) }}
      </div>
      <div
        v-if="place.recommendationReason"
        class="mt-1 text-xs text-green-700 truncate"
      >
        {{ place.recommendationReason }}
      </div>
    </div>
    <HeartButton
      class="self-center pr-3"
      :google-place-id="place.googlePlaceId"
      :name="place.name"
      :category="place.category"
    />
  </div>
</div>

<!-- Desktop grid/list (unchanged, but add hidden md:block wrapper) -->
<div class="hidden md:block">
  <!-- existing grid/list markup -->
</div>
```

- [ ] **Step 4: Commit**

```bash
git add pages/index.vue components/places/PlaceList.vue components/places/DetailDrawer.vue
git commit -m "feat: add mobile responsive UI with filter chips, horizontal cards, and fullscreen drawer"
```

---

### Task 18: Favorites Page, Guest Mode & Polish

**Files:**
- Create: `pages/favorites.vue`
- Modify: various files for edge cases

- [ ] **Step 1: Create favorites page**

```vue
<!-- pages/favorites.vue -->
<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Saved Places</h1>

    <div v-if="favoritesStore.loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-24 bg-gray-200 rounded-lg animate-pulse" />
    </div>

    <div v-else-if="favoritesStore.savedPlaces.length === 0" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      <p class="text-lg font-medium text-gray-600 mt-4">No saved places yet</p>
      <p class="text-sm text-gray-400 mt-1">Heart a place to save it here.</p>
      <NuxtLink
        to="/"
        class="inline-block mt-6 px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-pink-600"
      >
        Explore places
      </NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="place in favoritesStore.savedPlaces"
        :key="place.googlePlaceId"
        class="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100"
      >
        <div>
          <h3 class="font-semibold text-gray-900">{{ place.name }}</h3>
          <span class="text-sm text-gray-500">{{ formatCategory(place.category) }}</span>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="`/?place=${place.googlePlaceId}`"
            class="text-sm text-brand-pink hover:underline"
          >
            View
          </NuxtLink>
          <HeartButton
            :google-place-id="place.googlePlaceId"
            :name="place.name"
            :category="place.category"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const favoritesStore = useFavoritesStore()

onMounted(() => {
  favoritesStore.fetchSavedPlaces()
})

function formatCategory(cat: string): string {
  return {
    food_drink: 'Food & Drink',
    outdoors: 'Outdoors',
    activities: 'Activities',
    chill_spots: 'Chill Spots',
  }[cat] ?? cat
}
</script>
```

- [ ] **Step 2: Ensure guest mode works with localStorage**

Guest mode is already implemented in the Pinia stores (`stores/preferences.ts`, `stores/favorites.ts`). Verify that:

1. The preferences store loads from localStorage when not authenticated
2. The favorites store loads from localStorage when not authenticated
3. The recommendations API accepts guest params in query string

No code changes needed if stores were implemented correctly. Run a manual test:

Run: `npm run dev`
Verify: Open the app without logging in. Complete onboarding. Check that preferences are saved in localStorage (DevTools → Application → Local Storage).

- [ ] **Step 3: Add guest-to-account merge endpoint**

```typescript
// server/api/auth/merge-guest.post.ts
import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/require-auth'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{
    preferences?: {
      baseCityPlaceId: string
      baseCityName: string
      baseCityLat: number
      baseCityLng: number
      dietaryPreferences: Record<string, string>
    }
    seedPlaces?: Array<{ googlePlaceId: string; name: string; category: string; lat: number; lng: number }>
    preferredAreas?: Array<{ neighborhoodName: string; bounds: object }>
    savedPlaces?: Array<{ googlePlaceId: string; name: string; category: string }>
  }>(event)

  await prisma.$transaction(async (tx) => {
    // Preferences: keep existing if present, else adopt guest
    const existing = await tx.userPreference.findUnique({ where: { userId: user.id } })
    if (!existing && body.preferences) {
      await tx.userPreference.create({
        data: {
          userId: user.id,
          baseCityPlaceId: body.preferences.baseCityPlaceId,
          baseCityName: body.preferences.baseCityName,
          baseCityLat: body.preferences.baseCityLat,
          baseCityLng: body.preferences.baseCityLng,
          dietaryPreferences: body.preferences.dietaryPreferences,
        },
      })
    }

    // Seed places: union, deduplicate by googlePlaceId
    if (body.seedPlaces?.length) {
      for (const sp of body.seedPlaces) {
        await tx.userSeedPlace.upsert({
          where: { userId_googlePlaceId: { userId: user.id, googlePlaceId: sp.googlePlaceId } },
          create: { userId: user.id, ...sp },
          update: {},
        })
      }
    }

    // Preferred areas: union, deduplicate by neighborhoodName
    if (body.preferredAreas?.length) {
      for (const area of body.preferredAreas) {
        await tx.userPreferredArea.upsert({
          where: { userId_neighborhoodName: { userId: user.id, neighborhoodName: area.neighborhoodName } },
          create: { userId: user.id, neighborhoodName: area.neighborhoodName, bounds: area.bounds as any },
          update: {},
        })
      }
    }

    // Saved places: union, deduplicate by googlePlaceId
    if (body.savedPlaces?.length) {
      for (const sp of body.savedPlaces) {
        await tx.userSavedPlace.upsert({
          where: { userId_googlePlaceId: { userId: user.id, googlePlaceId: sp.googlePlaceId } },
          create: { userId: user.id, ...sp },
          update: {},
        })
      }
    }
  })

  return { success: true }
})
```

Add the merge call to the auth store after successful login. In `stores/auth.ts`, add after `fetchUser()`:

```typescript
async function mergeGuestData() {
  // Check if there's guest data to merge
  const prefs = localStorage.getItem('randevu_preferences')
  const seeds = localStorage.getItem('randevu_seed_places')
  const areas = localStorage.getItem('randevu_preferred_areas')
  const saved = localStorage.getItem('randevu_saved_places')

  if (!prefs && !seeds && !areas && !saved) return

  try {
    await $fetch('/api/auth/merge-guest', {
      method: 'POST',
      body: {
        preferences: prefs ? JSON.parse(prefs) : undefined,
        seedPlaces: seeds ? JSON.parse(seeds) : undefined,
        preferredAreas: areas ? JSON.parse(areas) : undefined,
        savedPlaces: saved ? JSON.parse(saved) : undefined,
      },
    })

    // Clear localStorage after successful merge
    localStorage.removeItem('randevu_preferences')
    localStorage.removeItem('randevu_seed_places')
    localStorage.removeItem('randevu_preferred_areas')
    localStorage.removeItem('randevu_saved_places')
  } catch {
    // Merge failed — guest data remains in localStorage for retry
  }
}
```

Call `mergeGuestData()` after successful `fetchUser()` when a user is found.

- [ ] **Step 4: Commit**

```bash
git add pages/favorites.vue server/api/auth/merge-guest.post.ts stores/auth.ts
git commit -m "feat: add favorites page, guest-to-account merge, and localStorage guest mode"
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 6: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: address any remaining test failures and type errors"
```

---

## Post-Implementation Checklist

After all tasks are complete, verify:

- [ ] `npm run build` succeeds
- [ ] `npx vitest run` — all tests pass
- [ ] Dev server starts: `npm run dev`
- [ ] Onboarding wizard works end-to-end
- [ ] Map loads with OpenStreetMap tiles
- [ ] Place cards render with data
- [ ] Detail drawer opens/closes
- [ ] Favorites save/unsave works
- [ ] Mobile layout shows list-only view
- [ ] Guest mode works without logging in
