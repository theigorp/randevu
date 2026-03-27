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
