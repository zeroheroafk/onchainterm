import { NextResponse } from "next/server"

// In-memory cache (2 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 2 * 60 * 1000

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
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idList.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 120 } }
    )

    if (!res.ok) throw new Error("CoinGecko price fetch failed")

    const data = await res.json()
    // data is { bitcoin: { usd: 12345, usd_24h_change: 1.5 }, ... }
    const prices: Record<string, { usd: number; usd_24h_change: number | null }> = {}
    for (const id of idList) {
      if (data[id]) {
        prices[id] = {
          usd: data[id].usd ?? 0,
          usd_24h_change: data[id].usd_24h_change ?? null,
        }
      }
    }

    const result = { prices }
    cache.set(cacheKey, { data: result, ts: Date.now() })

    if (cache.size > 100) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)
      for (let i = 0; i < 30; i++) cache.delete(oldest[i][0])
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ prices: {} }, { status: 500 })
  }
}
