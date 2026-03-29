import { NextResponse } from "next/server"

interface CoinGeckoMarket {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number | null
}

export async function GET() {
  try {
    // Fetch top 250 coins by market cap — gives us a good pool to find real movers
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false",
      { next: { revalidate: 120 } }
    )

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`)
    }

    const data: CoinGeckoMarket[] = await res.json()

    if (!Array.isArray(data)) {
      throw new Error("Invalid response from CoinGecko")
    }

    // Filter out coins without valid price change data
    const valid = data.filter(
      (c) =>
        c.price_change_percentage_24h !== null &&
        c.price_change_percentage_24h !== undefined &&
        c.current_price > 0
    )

    // Sort by 24h change — descending for gainers, ascending for losers
    const sorted = [...valid].sort(
      (a, b) => b.price_change_percentage_24h! - a.price_change_percentage_24h!
    )

    const gainers = sorted.slice(0, 15).map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      current_price: c.current_price,
      price_change_percentage_24h: c.price_change_percentage_24h!,
    }))

    const losers = sorted
      .slice(-15)
      .reverse()
      .map((c) => ({
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        current_price: c.current_price,
        price_change_percentage_24h: c.price_change_percentage_24h!,
      }))

    return NextResponse.json({ gainers, losers })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch top movers"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
