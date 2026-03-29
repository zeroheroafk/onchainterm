import { NextResponse } from "next/server"
import { createCache, fetchWithTimeout } from "@/lib/api-utils"

const CACHE_TTL = 2 * 60 * 1000
const STALE_TTL = 10 * 60 * 1000
const priceCache = createCache<PriceResult>(CACHE_TTL)

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
    const res = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idList.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: { Accept: "application/json" },
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
    const res = await fetchWithTimeout(
      `https://api.coincap.io/v2/assets?ids=${idList.join(",")}`,
      {
        headers: { Accept: "application/json" },
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

  // Return fresh cached data
  const cached = priceCache.get(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  // Try CoinGecko first, then CoinCap as fallback
  let prices = await fetchFromCoinGecko(idList)

  if (!prices) {
    prices = await fetchFromCoinCap(idList)
  }

  if (prices) {
    const result: PriceResult = { prices }
    priceCache.set(cacheKey, result)
    return NextResponse.json(result)
  }

  // All APIs failed -- serve stale cache if available
  const stale = priceCache.getStale(cacheKey, STALE_TTL)
  if (stale) {
    return NextResponse.json({
      ...stale,
      _stale: true,
    })
  }

  // Nothing worked and no stale cache
  return NextResponse.json(
    { prices: {}, error: "Unable to fetch prices from upstream APIs" },
    { status: 502 }
  )
}
