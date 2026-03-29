import { NextResponse } from "next/server"

const COINS = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano", "dogecoin", "chainlink", "avalanche-2", "polkadot"]
const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "LINK", "AVAX", "DOT"]

export async function GET() {
  try {
    // Fetch 30-day daily prices for each coin from CoinGecko
    const results = await Promise.all(
      COINS.map(async (id) => {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`,
          { next: { revalidate: 3600 } }
        )
        if (!res.ok) return null
        const data = await res.json()
        // prices is [[timestamp, price], ...]
        return (data.prices as [number, number][])?.map(([, p]) => p) || null
      })
    )

    // Build price arrays, ensure all have same length
    const minLen = Math.min(...results.map((r) => r?.length ?? 0))
    if (minLen < 5) {
      return NextResponse.json({ error: "Not enough price data" }, { status: 502 })
    }

    const prices = results.map((r) => (r ? r.slice(0, minLen) : []))

    // Calculate returns (percentage changes) for better correlation
    const returns = prices.map((p) => {
      const r: number[] = []
      for (let i = 1; i < p.length; i++) {
        r.push(p[i] / p[i - 1] - 1)
      }
      return r
    })

    // Pearson correlation
    function pearson(xs: number[], ys: number[]): number {
      const n = xs.length
      if (n === 0) return 0
      const meanX = xs.reduce((a, b) => a + b, 0) / n
      const meanY = ys.reduce((a, b) => a + b, 0) / n
      let num = 0, denomX = 0, denomY = 0
      for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX
        const dy = ys[i] - meanY
        num += dx * dy
        denomX += dx * dx
        denomY += dy * dy
      }
      const denom = Math.sqrt(denomX * denomY)
      return denom === 0 ? 0 : num / denom
    }

    // Build matrix
    const matrix: Record<string, Record<string, number>> = {}
    for (let i = 0; i < SYMBOLS.length; i++) {
      matrix[SYMBOLS[i]] = {}
      for (let j = 0; j < SYMBOLS.length; j++) {
        if (i === j) {
          matrix[SYMBOLS[i]][SYMBOLS[j]] = 1
        } else {
          matrix[SYMBOLS[i]][SYMBOLS[j]] = pearson(returns[i], returns[j])
        }
      }
    }

    return NextResponse.json({ matrix, symbols: SYMBOLS, dataPoints: minLen - 1 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to calculate correlations"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
