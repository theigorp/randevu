# Randevu — Product Design Spec

A date recommendation app that suggests places based on user preferences, powered by Google Places API with a Zillow-style map + list interface.

## Architecture

**Full-stack Nuxt 3** — single deployable handling SSR pages, API routes (`server/api/`), and frontend.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vue 3 + TypeScript, Pinia | SPA/SSR, state management |
| Backend | Nuxt server routes | API endpoints, business logic |
| Database | PostgreSQL + Prisma ORM | Persistence, type-safe queries |
| Map | Leaflet + OpenStreetMap tiles | Interactive map with pins (zero-cost, sufficient for MVP) |
| External | Google Places API (New) | Place search, details, photos, autocomplete |
| Cache | Redis (production) / in-memory (dev) | Places API response cache, sessions |
| Email | Resend | Magic link delivery |

## Authentication

Three auth methods, no passwords:

- **Magic link** — user enters email, receives login link via Resend
- **Google OAuth** — social login
- **GitHub OAuth** — social login
- **Guest mode** — full experience, data stored in localStorage, no account required

### Session Management
- Server-side sessions stored in Redis (production) or in-memory (dev)
- Session ID stored in an `httpOnly`, `secure`, `sameSite=lax` cookie
- Session lifetime: 30 days, refreshed on each request
- Guest users: no server session, all state in localStorage
- Auth implementation: custom Nuxt server middleware using `h3` session utilities. Magic link requires custom implementation; Google/GitHub OAuth uses standard OAuth2 PKCE flow.

### Guest-to-Account Merge
When a guest creates an account, the client sends its localStorage data alongside the signup request. Merge rules:
- **Seed places**: union of guest + existing account places (deduplicate by `google_place_id`)
- **Dietary preferences**: if the authenticated account already has preferences, keep them; otherwise adopt guest preferences
- **Preferred areas**: union, deduplicate by `neighborhood_name`
- **Saved places (favorites)**: union, deduplicate by `google_place_id`
- Merge happens synchronously during the signup/login API response
- No orphaned guest `users` row is created — guest data lives only in localStorage until account creation

## Onboarding Wizard

A 4-step wizard shown on first visit. Re-accessible from the preferences/settings page. Only Step 1 is required; others can be skipped.

### Step 1: Base City
- Google Places Autocomplete input for city search (restricted to `(cities)` type)
- Coverage quality indicator shown per result:
  - **Great** (green): 200+ places found in a sample Nearby Search
  - **Good** (amber): 50–199 places
  - **Limited** (red): fewer than 50 places
- Coverage check: on city selection, fire a Google Places Nearby Search for a few common types (restaurant, cafe, park) within a 10km radius of the city center. Count unique results. Thresholds are subject to calibration.

### Step 2: Seed Places
- Google Places Autocomplete input to search for specific places
- User adds places they already know and enjoy (cafés, restaurants, parks, bars, etc.)
- Each added place shows name, category, and neighborhood with a remove button
- These seed places feed the similarity-based recommendation engine

### Step 3: Food & Drink Preferences
- List of dietary/drink preferences with three-state toggles:
  - **Must-have** (green) — prioritize places with this attribute
  - **No preference** (gray) — neutral, does not affect scoring
  - **Deal-breaker** (red) — exclude places with this attribute
- Preferences include: vegan options, cocktails, wine selection, meat-focused, good coffee, craft beer, gluten-free, halal, and others

### Step 4: Preferred Areas
- Neighborhood chips populated using Google Places Autocomplete restricted to the selected city, searching for type `sublocality` and `neighborhood`
- On city selection, the app pre-fetches a set of well-known neighborhoods by querying Google Places Text Search for "[city name] neighborhoods" and parsing the `sublocality` components from the results
- Users can also type to search for additional neighborhoods not in the pre-fetched list
- Multi-select — user taps neighborhoods they prefer
- Affects geographic scoring in recommendations

## Place Categories

Four top-level categories with pin colors:

| Category | Pin Color | Sub-types |
|----------|-----------|-----------|
| Food & Drink | Pink | restaurants, cafés, bars, bakeries, food markets |
| Outdoors | Green | parks, forests, walking/hiking paths, gardens, waterfronts |
| Activities | Blue | museums, galleries, cinemas, bowling, mini-golf, escape rooms |
| Chill Spots | Purple | bookshops, scenic viewpoints, rooftop terraces |

Each place is assigned to exactly one top-level category based on its primary Google Places `type`. The pin color follows the category.

## Desktop UI — Main Recommendations View

Zillow-style split layout:

### Map Panel (Left, 55%)
- Interactive Leaflet map with OpenStreetMap tiles, centered on the user's base city
- Color-coded pins by top-level category (see table above)
- Zoom/pan controls
- "Showing N places in view" counter at bottom-left
- Clicking a pin opens the detail drawer and highlights/enlarges the pin

### List Panel (Right, 45%)
- Grid/list view toggle
- Place cards showing:
  - Place photo (from Google Places)
  - Place name
  - Category/type
  - Google rating (stars)
  - Price level ($–$$$$)
  - "Why recommended" tag (green badge with explanation)
- List updates dynamically when the map is panned/zoomed — only places within the visible map bounds are shown
- Result count displayed at top

### Map-List Interaction
- **Linked**: clicking a pin opens the detail drawer; clicking a card pans the map to that pin
- **Map-driven filtering**: panning/zooming the map updates the list to show only places within the visible bounds

### Navigation Bar
- Logo ("randevu")
- Base city display with coverage quality badge
- Filters button
- Favorites button
- Preferences button (re-opens onboarding settings)
- User avatar / login button

## Detail Drawer

A right-side drawer (~30% viewport width) that slides over the list panel when a place is selected. The list panel remains partially visible (dimmed) behind it.

### Drawer Content
- **Hero photo** — from Google Places, with close (X) and favorite (heart) buttons overlaid
- **Title section** — place name, category + neighborhood, rating, review count, price level
- **"Why we recommend this"** — highlighted green box with human-readable explanation of the match
- **Tags** — feature tags derived from Google Places data (see Tag Derivation below)
- **Info rows** — opening hours, address, phone, distance from city center
- **CTA buttons**:
  - "Get Directions" (primary, pink)
  - "Visit Website" (secondary, if available)
  - "See on Google Maps" (secondary)

### Map Behavior When Drawer Opens
- The selected pin pulses/enlarges
- Other pins dim slightly
- Map remains interactive behind the drawer

## Mobile UI

No map on mobile — list-only experience.

### List View
- Horizontal place cards (thumbnail left, info right)
- Filter chips at top (city, category type, area)
- Result count
- Scrollable list

### Detail View
- Fullscreen overlay with X button to close
- Same content as desktop drawer: hero photo, title, recommendation reason, tags, info rows, CTAs

### Mobile Geographic Scope
When no preferred neighborhoods are selected, the mobile recommendation engine uses the entire base city bounding box (derived from Google Geocoding's `viewport` bounds for the city). This may produce a large result set, so results are sorted by recommendation score and paginated.

## Favorites

Simple flat list of saved places. No collections or categories.

- Heart icon on place cards and in detail drawer/overlay to toggle save
- Dedicated favorites page accessible from nav bar
- Persisted in database for authenticated users, localStorage for guests

## Data Model

### users
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | string? | Null for guests (guests only exist in localStorage, not in DB) |
| auth_provider | enum | magic_link, google, github |
| created_at | datetime | |
| updated_at | datetime | |

### user_preferences (1:1 with users)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| base_city | string | Google place_id |
| base_city_name | string | Display name |
| base_city_lat | float | Latitude |
| base_city_lng | float | Longitude |
| dietary_preferences | JSON | `{ vegan: "must"\|"neutral"\|"dealbreaker", ... }` |

### user_seed_places (1:many with users)
Places the user added during onboarding as known favorites — these are recommendation engine inputs.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| google_place_id | string | Google place reference |
| name | string | Cached display name |
| category | string | Place type |
| lat | float | Latitude |
| lng | float | Longitude |
| added_at | datetime | |

### user_preferred_areas (1:many with users)
Rows only exist for selected neighborhoods — absence means not selected.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| neighborhood_name | string | |
| bounds | JSON | Bounding box coordinates |

### user_saved_places (1:many with users)
User-facing bookmarks — places the user hearted from recommendations.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| google_place_id | string | Google place reference |
| name | string | Cached display name |
| category | string | Place type |
| saved_at | datetime | |

### cached_places (shared)
| Field | Type | Notes |
|-------|------|-------|
| google_place_id | string | Primary key |
| name | string | |
| category | string | Top-level category (Food & Drink, Outdoors, Activities, Chill Spots) |
| types | string[] | Google place types |
| lat | float | |
| lng | float | |
| rating | float | Google rating |
| price_level | int | 0–4 |
| tags | string[] | Derived tags (see Tag Derivation) |
| photo_references | string[] | Google photo references |
| opening_hours | JSON | |
| website | string? | |
| phone | string? | |
| fetched_at | datetime | For cache invalidation (7-day TTL) |
| city_place_id | string | FK — which city this belongs to |

## Tag Derivation

Tags displayed on place cards and in the detail drawer are derived from Google Places data using a mapping pipeline:

1. **From Google `types`**: direct mapping (e.g., `meal_takeaway` → "Takeaway", `bar` → "Bar", `cafe` → "Coffee")
2. **From Google `serves_*` fields** (Places API New): `servesVegetarianFood` → "Vegetarian", `servesBeer` → "Beer", `servesWine` → "Wine", `servesCocktails` → "Cocktails"
3. **From Google `dineIn`, `delivery`, `takeout`**: mapped to corresponding tags
4. **From Google `outdoorSeating`**: → "Outdoor seating"
5. **From Google `editorialSummary`**: keyword extraction for vibe tags (e.g., contains "romantic" → "Romantic", contains "cozy" → "Cozy"). Simple keyword match, not NLP.
6. **From `priceLevel`**: mapped to a human-readable tag ("Budget-friendly", "Mid-range", "Upscale", "Fine dining")

Tags are computed and stored in `cached_places.tags` when a place is first fetched and refreshed on cache expiry.

## Recommendation Engine

Two-phase hybrid approach running server-side.

### Phase 1: Filter
Hard constraints that narrow the candidate set:
1. **Geographic filter** — places within the visible map bounds (desktop) or preferred neighborhoods / full city bounds (mobile)
2. **Category filter** — if user has active category filters in the UI
3. **Deal-breaker filter** — exclude places matching any deal-breaker preference tag
4. **Must-have flag** — tag places matching must-have preferences for a ranking bonus

### Phase 2: Rank by Similarity
Score remaining places against the user's seed places:

| Factor | Weight | Description |
|--------|--------|-------------|
| Category similarity | 30% | Same type as a seed place |
| Tag overlap | 25% | Shared tags with seed places |
| Rating proximity | 15% | Similar rating level to user's seed places |
| Price level match | 15% | Matches demonstrated price comfort zone |
| Geographic proximity | 15% | Closer to preferred neighborhoods |

Must-have preferences add a bonus multiplier to the final score.

If the user has no seed places (skipped Step 2), Phase 2 falls back to sorting by: Google rating (descending), then distance from city center (ascending). The "why recommended" explanation becomes "Top rated in [category]" or "Popular in [neighborhood]".

### "Why Recommended" Generation
Each place gets a human-readable explanation based on its top-scoring factors:
- "Similar vibe to [seed place]" — tag overlap dominant
- "Matches your [cuisine] preference" — category similarity dominant
- "In your preferred [neighborhood] area" — location dominant
- Reasons can combine for richer explanations

### Performance
- Recommendations computed on-demand per request (not pre-computed)
- `cached_places` table avoids hitting Google Places API on every request
- Results paginated at 20 places per page
- Similarity scores cached per user for 15 minutes to handle rapid map panning

## API Routes

All routes are under `/api/`. Authentication is enforced via Nuxt server middleware that reads the session cookie. Guest endpoints (marked with `*`) do not require auth — the client sends preferences in the request body.

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/magic-link` | Send magic link email. Body: `{ email }`. Returns `{ success }`. |
| GET | `/api/auth/magic-link/verify?token=` | Verify magic link token, create session. Redirects to app. |
| GET | `/api/auth/google` | Initiate Google OAuth flow. |
| GET | `/api/auth/google/callback` | Google OAuth callback, create session. |
| GET | `/api/auth/github` | Initiate GitHub OAuth flow. |
| GET | `/api/auth/github/callback` | GitHub OAuth callback, create session. |
| POST | `/api/auth/logout` | Destroy session. |
| GET | `/api/auth/me` | Return current user or `null`. |

### Onboarding / Preferences
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/preferences` | Get current user's preferences (all tables). |
| PUT | `/api/preferences` | Upsert preferences. Body: `{ baseCity, dietaryPreferences }`. |
| GET | `/api/seed-places` | List user's seed places. |
| POST | `/api/seed-places` | Add a seed place. Body: `{ googlePlaceId, name, category, lat, lng }`. |
| DELETE | `/api/seed-places/:id` | Remove a seed place. |
| GET | `/api/preferred-areas` | List user's preferred areas. |
| PUT | `/api/preferred-areas` | Replace all preferred areas. Body: `{ areas: [{ name, bounds }] }`. |

### Recommendations
| Method | Route | Description |
|--------|-------|-------------|
| GET* | `/api/recommendations` | Get recommendations. Query: `{ bounds, categories?, page? }`. For guests, also accepts `seedPlaceIds`, `dietaryPrefs`, `areaNames` in query. Returns `{ places: Place[], total, page }`. |
| GET* | `/api/places/:googlePlaceId` | Get full place details (from cache or Google). Returns `Place` with all fields. |

### Favorites
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/saved-places` | List user's saved places. |
| POST | `/api/saved-places` | Save a place. Body: `{ googlePlaceId, name, category }`. |
| DELETE | `/api/saved-places/:googlePlaceId` | Unsave a place. |

### Utilities
| Method | Route | Description |
|--------|-------|-------------|
| GET* | `/api/city-coverage?placeId=` | Check coverage quality for a city. Returns `{ level: "great"\|"good"\|"limited", count }`. |
| GET* | `/api/neighborhoods?cityPlaceId=` | Get neighborhoods for a city. Returns `{ neighborhoods: [{ name, bounds }] }`. |

### Shared Response Types

```typescript
interface Place {
  googlePlaceId: string
  name: string
  category: "food_drink" | "outdoors" | "activities" | "chill_spots"
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
  recommendationReason: string  // human-readable "why recommended"
  similarityScore: number       // 0–1, used for sorting
}
```

## Google Places API Cost Controls

- **Cache-first**: all place data served from `cached_places` when available (7-day TTL)
- **Rate limiting**: max 60 Google API requests per user per hour (enforced server-side)
- **Daily budget cap**: configurable max daily spend; when reached, app serves only cached data and shows a "limited results" banner
- **Batch fetching**: when populating a new city, fetch places in bulk via Nearby Search (up to 60 results per query) rather than individual lookups
- **Autocomplete debounce**: 300ms debounce on all autocomplete inputs to avoid excessive calls

## Edge Cases and Error States

| Scenario | Behavior |
|----------|----------|
| Zero recommendations | Show friendly empty state: "No places found in this area matching your preferences. Try zooming out or adjusting your filters." |
| Google Places API down/quota exhausted | Serve only cached data. Show banner: "Showing cached results. Some places may be outdated." |
| Base city has "Limited" coverage | Show warning after city selection: "We have limited data for this city. Results may be sparse." Allow user to proceed. |
| Map fails to load | Show list-only view (same as mobile) with a "Map unavailable" notice |
| Loading states | Skeleton cards in list panel, pulsing pins on map while recommendations load |
| Empty favorites | Show: "No saved places yet. Heart a place to save it here." |
| Onboarding skipped (only city set) | Recommendations fall back to top-rated places in the city, no similarity scoring |

## Tech Stack Summary

| Concern | Choice |
|---------|--------|
| Framework | Nuxt 3 |
| Language | TypeScript (frontend + backend) |
| UI Framework | Vue 3 |
| State Management | Pinia |
| Database | PostgreSQL |
| ORM | Prisma |
| Map | Leaflet + OpenStreetMap tiles |
| Places Data | Google Places API (New) |
| Auth | Custom Nuxt server middleware (h3 sessions) |
| Email | Resend (magic links) |
| Cache | Redis (production) / in-memory (dev) |
| Deployment | Single Nuxt server (Node.js runtime) |
