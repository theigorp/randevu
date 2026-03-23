# Randevu — Product Design Spec

A date recommendation app that suggests places based on user preferences, powered by Google Places API with a Zillow-style map + list interface.

## Architecture

**Full-stack Nuxt 3** — single deployable handling SSR pages, API routes (`server/api/`), and frontend.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vue 3 + TypeScript, Pinia | SPA/SSR, state management |
| Backend | Nuxt server routes | API endpoints, business logic |
| Database | PostgreSQL + Prisma ORM | Persistence, type-safe queries |
| Map | Leaflet or Mapbox | Interactive map with pins |
| External | Google Places API | Place search, details, photos, autocomplete |
| Cache | Redis (optional, in-memory for MVP) | Places API response cache, sessions |

## Authentication

Three auth methods, no passwords:

- **Magic link** — user enters email, receives login link
- **Google OAuth** — social login
- **GitHub OAuth** — social login
- **Guest mode** — full experience, data stored in localStorage, no account required. Guest users get a database row with `auth_provider: "guest"` and no email. If they later create an account, the guest record is merged.

## Onboarding Wizard

A 4-step wizard shown on first visit. Re-accessible from the preferences/settings page. Only Step 1 is required; others can be skipped.

### Step 1: Base City
- Google Places Autocomplete input for city search
- Coverage quality indicator shown per result: **Great** (green), **Good** (amber), **Limited** (red)
- Coverage derived from Google Places data density for the area

### Step 2: Favorite Places
- Google Places Autocomplete input to search for specific places
- User adds places they already know and enjoy (cafés, restaurants, parks, bars, etc.)
- Each added place shows name, category, and neighborhood with a remove button
- These favorites seed the similarity-based recommendation engine

### Step 3: Food & Drink Preferences
- List of dietary/drink preferences with three-state toggles:
  - **Must-have** (green) — prioritize places with this attribute
  - **No preference** (gray) — neutral, does not affect scoring
  - **Deal-breaker** (red) — exclude places with this attribute
- Preferences include: vegan options, cocktails, wine selection, meat-focused, good coffee, craft beer, gluten-free, halal, and others

### Step 4: Preferred Areas
- Neighborhood chips auto-populated from the selected base city (via Google geocoding)
- Multi-select — user taps neighborhoods they prefer
- Affects geographic scoring in recommendations

## Place Categories

Four top-level categories covering broad date venue types:

- **Food & Drink** — restaurants, cafés, bars, bakeries, food markets
- **Outdoors** — parks, forests, walking/hiking paths, gardens, waterfronts
- **Activities** — museums, galleries, cinemas, bowling, mini-golf, escape rooms
- **Chill spots** — bookshops, scenic viewpoints, rooftop terraces

## Desktop UI — Main Recommendations View

Zillow-style split layout:

### Map Panel (Left, 55%)
- Interactive map (Leaflet or Mapbox) centered on the user's base city
- Color-coded pins by category:
  - Pink — cafés
  - Green — outdoors
  - Amber — restaurants
  - Purple — bars
  - Blue — activities
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
- **Tags** — dietary, vibe, and feature tags (e.g., "Vegan options", "Romantic", "Outdoor seating")
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
| email | string? | Null for guests |
| auth_provider | enum | magic_link, google, github, guest |
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

### user_favorite_places (1:many with users)
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
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| neighborhood_name | string | |
| bounds | JSON | Bounding box coordinates |
| selected | boolean | |

### user_saved_places (1:many with users)
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
| category | string | |
| types | string[] | Google place types |
| lat | float | |
| lng | float | |
| rating | float | Google rating |
| price_level | int | 0–4 |
| tags | string[] | Derived from Google data |
| photo_references | string[] | Google photo references |
| opening_hours | JSON | |
| website | string? | |
| phone | string? | |
| fetched_at | datetime | For cache invalidation (7-day TTL) |
| city_place_id | string | FK — which city this belongs to |

## Recommendation Engine

Two-phase hybrid approach running server-side.

### Phase 1: Filter
Hard constraints that narrow the candidate set:
1. **Geographic filter** — only places within the visible map bounds (desktop) or preferred neighborhoods (mobile)
2. **Category filter** — if user has active category filters in the UI
3. **Deal-breaker filter** — exclude places matching any deal-breaker preference
4. **Must-have flag** — tag places matching must-have preferences for a ranking bonus

### Phase 2: Rank by Similarity
Score remaining places against the user's favorite places:

| Factor | Weight | Description |
|--------|--------|-------------|
| Category similarity | 30% | Same type as a favorited place |
| Tag overlap | 25% | Shared tags with favorited places |
| Rating proximity | 15% | Similar rating level to user's favorites |
| Price level match | 15% | Matches demonstrated price comfort zone |
| Geographic proximity | 15% | Closer to preferred neighborhoods |

Must-have preferences add a bonus multiplier to the final score.

### "Why Recommended" Generation
Each place gets a human-readable explanation based on its top-scoring factors:
- "Similar vibe to [favorite place]" — tag overlap dominant
- "Matches your [cuisine] preference" — category similarity dominant
- "In your preferred [neighborhood] area" — location dominant
- Reasons can combine for richer explanations

### Performance
- Recommendations computed on-demand per request (not pre-computed)
- `cached_places` table avoids hitting Google Places API on every request
- Results paginated at 20 places per page
- Similarity scores cached per user for 15 minutes to handle rapid map panning

## Tech Stack Summary

| Concern | Choice |
|---------|--------|
| Framework | Nuxt 3 |
| Language | TypeScript (frontend + backend) |
| UI Framework | Vue 3 |
| State Management | Pinia |
| Database | PostgreSQL |
| ORM | Prisma |
| Map | Leaflet or Mapbox |
| Places Data | Google Places API (New) |
| Auth | nuxt-auth-utils or custom (magic link + OAuth) |
| Email | Resend or similar (for magic links) |
| Cache | Redis (production) / in-memory (dev) |
| Deployment | Single Nuxt server (Node.js runtime) |
