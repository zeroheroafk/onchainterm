import { NextResponse } from "next/server"

interface BinanceLiq {
  symbol: string
  price: string
  origQty: string
  executedQty: string
  averagePrice: string
  side: "BUY" | "SELL"
  time: number
}

interface Liquidation {
  symbol: string
  side: "long" | "short"
  amount: number
  price: number
  exchange: string
  timestamp: number
}

// Top futures symbols to query — Binance requires a symbol param
const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT",
  "BNBUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "SUIUSDT",
]

export async function GET() {
  try {
    // Fetch liquidations from multiple symbols in parallel
    const results = await Promise.allSettled(
      SYMBOLS.map(async (symbol) => {
        const res = await fetch(
          `https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${symbol}&limit=5`,
          { next: { revalidate: 15 } }
        )
        if (!res.ok) return []
        const data: BinanceLiq[] = await res.json()
        if (!Array.isArray(data)) return []
        return data.map((d): Liquidation => {
          const price = parseFloat(d.averagePrice) || parseFloat(d.price)
          const qty = parseFloat(d.executedQty) || parseFloat(d.origQty)
          return {
            // Clean symbol: BTCUSDT -> BTC
            symbol: d.symbol.replace(/USDT$|BUSD$/, ""),
            // SELL = long was liquidated, BUY = short was liquidated
            side: d.side === "SELL" ? "long" : "short",
            amount: price * qty,
            price,
            exchange: "Binance",
            timestamp: d.time,
          }
        })
      })
    )

    const liquidations: Liquidation[] = results
      .filter((r): r is PromiseFulfilledResult<Liquidation[]> => r.status === "fulfilled")
      .flatMap(r => r.value)
      .filter(l => l.amount > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)

    if (liquidations.length === 0) {
      return NextResponse.json({
        liquidations: [],
        estimated: true,
        message: "No recent liquidations found — markets may be calm",
      })
    }

    return NextResponse.json({ liquidations, estimated: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch liquidation data"
    return NextResponse.json({
      liquidations: [],
      estimated: true,
      message,
    })
  }
}
