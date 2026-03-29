import { NextResponse } from "next/server"

// In-memory cache for search results (5 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query || query.length < 1) {
    return NextResponse.json({ coins: [] })
  }

  const cacheKey = query.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) throw new Error("CoinGecko search failed")

    const data = await res.json()
    const coins = (data.coins || []).slice(0, 30).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      thumb: c.thumb,
      market_cap_rank: c.market_cap_rank,
    }))

    const result = { coins }
    cache.set(cacheKey, { data: result, ts: Date.now() })

    // Keep cache size manageable
    if (cache.size > 200) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)
      for (let i = 0; i < 50; i++) cache.delete(oldest[i][0])
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json(
        { coins: [], error: "Request timed out" },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { coins: [], error: "Failed to fetch search results" },
      { status: 500 }
    )
  }
}
