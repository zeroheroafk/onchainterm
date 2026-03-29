/**
 * Standardized data fetching utilities for API routes.
 * Provides reusable patterns for timeout, retry, fallback, caching, and rate limiting.
 */

// ── fetchWithTimeout ──────────────────────────────────────────────────────────

export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs = 8000
): Promise<Response> {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  })
}

// ── fetchWithRetry ────────────────────────────────────────────────────────────

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 2,
  backoffMs = 1000
): Promise<Response> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options)
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt)))
    }
  }
  throw lastError ?? new Error("fetchWithRetry failed")
}

// ── fetchWithFallback ─────────────────────────────────────────────────────────

export interface FallbackSource<T = unknown> {
  name: string
  url?: string
  options?: RequestInit
  fetch?: () => Promise<T>
  transform?: (data: unknown) => T
}

export async function fetchWithFallback<T>(
  sources: FallbackSource<T>[]
): Promise<{ data: T; source: string }> {
  for (const src of sources) {
    try {
      let data: T
      if (src.fetch) {
        data = await src.fetch()
      } else if (src.url) {
        const res = await fetchWithTimeout(src.url, src.options)
        if (!res.ok) throw new Error(`${src.name}: HTTP ${res.status}`)
        const raw = await res.json()
        data = src.transform ? src.transform(raw) : (raw as T)
      } else {
        throw new Error(`${src.name}: no url or fetch function provided`)
      }
      return { data, source: src.name }
    } catch {
      // try next source
    }
  }
  throw new Error("All fallback sources failed")
}

// ── createCache ───────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T
  ts: number
}

export function createCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>()

  function get(key: string): T | undefined {
    const entry = store.get(key)
    if (!entry) return undefined
    if (Date.now() - entry.ts > ttlMs) return undefined
    return entry.value
  }

  function set(key: string, value: T): void {
    store.set(key, { value, ts: Date.now() })
    // Evict old entries if map grows large
    if (store.size > 200) {
      const entries = [...store.entries()].sort((a, b) => a[1].ts - b[1].ts)
      for (let i = 0; i < 50; i++) store.delete(entries[i][0])
    }
  }

  function getStale(key: string, staleTtlMs: number): T | undefined {
    const entry = store.get(key)
    if (!entry) return undefined
    if (Date.now() - entry.ts > staleTtlMs) return undefined
    return entry.value
  }

  return { get, set, getStale }
}

// ── rateLimiter ───────────────────────────────────────────────────────────────

export function rateLimiter(maxPerWindow: number, windowMs: number) {
  const timestamps: number[] = []

  function pruneOld() {
    const cutoff = Date.now() - windowMs
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift()
    }
  }

  function canProceed(): boolean {
    pruneOld()
    if (timestamps.length < maxPerWindow) {
      timestamps.push(Date.now())
      return true
    }
    return false
  }

  function waitTime(): number {
    pruneOld()
    if (timestamps.length < maxPerWindow) return 0
    return timestamps[0] + windowMs - Date.now()
  }

  return { canProceed, waitTime }
}
