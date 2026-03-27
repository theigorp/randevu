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
