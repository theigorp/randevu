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
