import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=1h,24h,7d",
      { next: { revalidate: 60 } }
    )

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)

    const coins = await res.json()

    const heatmapData = coins.map((coin: {
      id: string
      symbol: string
      name: string
      current_price: number
      market_cap: number
      price_change_percentage_24h: number
      price_change_percentage_1h_in_currency: number | null
      price_change_percentage_7d_in_currency: number | null
    }) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      marketCap: coin.market_cap,
      change1h: coin.price_change_percentage_1h_in_currency ?? 0,
      change24h: coin.price_change_percentage_24h ?? 0,
      change7d: coin.price_change_percentage_7d_in_currency ?? 0,
    }))

    return NextResponse.json({ coins: heatmapData })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch heatmap data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
