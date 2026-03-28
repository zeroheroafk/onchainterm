import { NextResponse } from "next/server"

interface NftListItem {
  id: string
  name: string
  symbol: string
}

interface NftDetail {
  id: string
  name: string
  symbol: string
  floor_price: { native_currency: number; usd: number }
  market_cap: { native_currency: number; usd: number }
  volume_24h: { native_currency: number; usd: number }
  floor_price_24h_percentage_change: {
    native_currency: number
    usd: number
  }
}

interface CachedData {
  data: ReturnType<typeof formatNft>[]
  timestamp: number
}

let cache: CachedData | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function formatNft(nft: NftDetail) {
  return {
    id: nft.id,
    name: nft.name,
    symbol: nft.symbol,
    floorPrice: {
      native: nft.floor_price?.native_currency ?? 0,
      usd: nft.floor_price?.usd ?? 0,
    },
    marketCap: nft.market_cap?.usd ?? 0,
    volume24h: nft.volume_24h?.usd ?? 0,
    floorChange24h: nft.floor_price_24h_percentage_change?.usd ?? null,
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ collections: cache.data })
    }

    const listRes = await fetch(
      "https://api.coingecko.com/api/v3/nfts/list?order=market_cap_usd_desc&per_page=20",
      { next: { revalidate: 300 } }
    )

    if (!listRes.ok) {
      throw new Error(`CoinGecko NFT list error: ${listRes.status}`)
    }

    const list: NftListItem[] = await listRes.json()
    const ids = list.slice(0, 20).map((item) => item.id)

    // Fetch details for each NFT collection (with concurrency limit)
    const batchSize = 5
    const details: NftDetail[] = []

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async (id) => {
          try {
            const res = await fetch(
              `https://api.coingecko.com/api/v3/nfts/${id}`,
              { next: { revalidate: 300 } }
            )
            if (!res.ok) return null
            return (await res.json()) as NftDetail
          } catch {
            return null
          }
        })
      )
      details.push(...(results.filter(Boolean) as NftDetail[]))
    }

    const collections = details.map(formatNft)

    // Update in-memory cache
    cache = { data: collections, timestamp: Date.now() }

    return NextResponse.json({ collections })
  } catch (err) {
    // Return stale cache if available
    if (cache) {
      return NextResponse.json({ collections: cache.data, stale: true })
    }
    const message =
      err instanceof Error ? err.message : "Failed to fetch NFT data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
