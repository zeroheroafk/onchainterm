import { NextResponse } from "next/server"

// In-memory cache (2 min TTL, stale data served for 10 min as fallback)
const cache = new Map<string, { data: PriceResult; ts: number }>()
const CACHE_TTL = 2 * 60 * 1000
const STALE_TTL = 10 * 60 * 1000

type PriceResult = {
  prices: Record<string, { usd: number; usd_24h_change: number | null }>
}

/**
 * Fetch prices from CoinGecko free API.
 * Returns parsed price map or null on failure.
 */
async function fetchFromCoinGecko(
  idList: string[]
): Promise<Record<string, { usd: number; usd_24h_change: number | null }> | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idList.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }
    )

    if (!res.ok) {
      console.error(`CoinGecko responded with ${res.status}`)
      return null
    }

    const data = await res.json()
    if (!data || typeof data !== "object") return null

    const prices: Record<string, { usd: number; usd_24h_change: number | null }> = {}
    for (const id of idList) {
      if (data[id] && typeof data[id].usd === "number") {
        prices[id] = {
          usd: data[id].usd,
          usd_24h_change: typeof data[id].usd_24h_change === "number" ? data[id].usd_24h_change : null,
        }
      }
    }
    return Object.keys(prices).length > 0 ? prices : null
  } catch (err) {
    console.error("CoinGecko fetch error:", err)
    return null
  }
}

/**
 * Fallback: CoinCap API v2 (free, no key required).
 * CoinCap uses its own IDs which happen to match CoinGecko for most major coins.
 * We fetch individually because CoinCap doesn't support bulk by the same slug format.
 */
async function fetchFromCoinCap(
  idList: string[]
): Promise<Record<string, { usd: number; usd_24h_change: number | null }> | null> {
  try {
    const prices: Record<string, { usd: number; usd_24h_change: number | null }> = {}

    // CoinCap supports fetching multiple assets; we use the /assets endpoint with ids param
    const res = await fetch(
      `https://api.coincap.io/v2/assets?ids=${idList.join(",")}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }
    )

    if (!res.ok) {
      console.error(`CoinCap responded with ${res.status}`)
      return null
    }

    const json = await res.json()
    if (!json?.data || !Array.isArray(json.data)) return null

    for (const asset of json.data) {
      const id = asset.id
      const usd = parseFloat(asset.priceUsd)
      const change = parseFloat(asset.changePercent24Hr)
      if (id && !isNaN(usd)) {
        prices[id] = {
          usd,
          usd_24h_change: !isNaN(change) ? change : null,
        }
      }
    }
    return Object.keys(prices).length > 0 ? prices : null
  } catch (err) {
    console.error("CoinCap fetch error:", err)
    return null
  }
}

function evictOldCacheEntries() {
  if (cache.size > 100) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)
    for (let i = 0; i < 30; i++) cache.delete(oldest[i][0])
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get("ids")?.trim()

  if (!ids) {
    return NextResponse.json({ prices: {} })
  }

  const validIdPattern = /^[a-z0-9-]+$/
  const idList = ids.split(",").map(s => s.trim()).filter(s => s && validIdPattern.test(s)).slice(0, 50)

  if (idList.length === 0) {
    return NextResponse.json({ error: "No valid coin IDs provided" }, { status: 400 })
  }

  const cacheKey = idList.sort().join(",")
  const cached = cache.get(cacheKey)
  const now = Date.now()

  // Return fresh cached data
  if (cached && now - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  // Try CoinGecko first, then CoinCap as fallback
  let prices = await fetchFromCoinGecko(idList)

  if (!prices) {
    prices = await fetchFromCoinCap(idList)
  }

  if (prices) {
    const result: PriceResult = { prices }
    cache.set(cacheKey, { data: result, ts: now })
    evictOldCacheEntries()
    return NextResponse.json(result)
  }

  // All APIs failed -- serve stale cache if available
  if (cached && now - cached.ts < STALE_TTL) {
    return NextResponse.json({
      ...cached.data,
      _stale: true,
    })
  }

  // Nothing worked and no stale cache
  return NextResponse.json(
    { prices: {}, error: "Unable to fetch prices from upstream APIs" },
    { status: 502 }
  )
}
