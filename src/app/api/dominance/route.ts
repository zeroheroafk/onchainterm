import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/global",
      { next: { revalidate: 120 } }
    )

    if (!res.ok) throw new Error(`CoinGecko global API error: ${res.status}`)

    const json = await res.json()
    const d = json.data

    if (!d) throw new Error("Invalid response from CoinGecko")

    const btc_dominance = d.market_cap_percentage?.btc ?? 0
    const eth_dominance = d.market_cap_percentage?.eth ?? 0
    const others = Math.max(0, 100 - btc_dominance - eth_dominance)

    return NextResponse.json({
      btc_dominance: Math.round(btc_dominance * 100) / 100,
      eth_dominance: Math.round(eth_dominance * 100) / 100,
      others: Math.round(others * 100) / 100,
      total_market_cap: d.total_market_cap?.usd ?? 0,
      total_volume: d.total_volume?.usd ?? 0,
      active_cryptocurrencies: d.active_cryptocurrencies ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch dominance data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
