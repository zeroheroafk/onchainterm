import { NextResponse } from "next/server"

interface Liquidation {
  symbol: string
  side: "long" | "short"
  amount: number
  price: number
  exchange: string
  timestamp: number
}

// Top futures symbols
const BINANCE_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT",
  "BNBUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "SUIUSDT",
]

const OKX_INSTRUMENTS = [
  "BTC-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT-SWAP", "DOGE-USDT-SWAP",
  "XRP-USDT-SWAP", "BNB-USDT-SWAP", "ADA-USDT-SWAP", "AVAX-USDT-SWAP",
  "LINK-USDT-SWAP", "SUI-USDT-SWAP",
]

async function fetchFromBinance(): Promise<Liquidation[]> {
  const results = await Promise.allSettled(
    BINANCE_SYMBOLS.map(async (symbol) => {
      const res = await fetch(
        `https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${symbol}&limit=5`,
        { next: { revalidate: 15 }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []
      return data.map((d: { symbol: string; averagePrice: string; price: string; executedQty: string; origQty: string; side: string; time: number }): Liquidation => {
        const price = parseFloat(d.averagePrice) || parseFloat(d.price)
        const qty = parseFloat(d.executedQty) || parseFloat(d.origQty)
        return {
          symbol: d.symbol.replace(/USDT$|BUSD$/, ""),
          side: d.side === "SELL" ? "long" : "short",
          amount: price * qty,
          price,
          exchange: "Binance",
          timestamp: d.time,
        }
      })
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<Liquidation[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((l) => l.amount > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50)
}

async function fetchFromOKX(): Promise<Liquidation[]> {
  const results = await Promise.allSettled(
    OKX_INSTRUMENTS.map(async (instId) => {
      const res = await fetch(
        `https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&instId=${instId}&state=filled&limit=5`,
        { next: { revalidate: 15 }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) return []
      const json = await res.json()
      const orders = json?.data?.[0]?.details || []
      return orders.map(
        (d: { bkPx: string; sz: string; side: string; ts: string }): Liquidation => {
          const price = parseFloat(d.bkPx)
          const qty = parseFloat(d.sz)
          return {
            symbol: instId.replace("-USDT-SWAP", ""),
            // OKX: side=long means long was liquidated, side=short means short
            side: d.side === "long" ? "long" : "short",
            amount: price * qty,
            price,
            exchange: "OKX",
            timestamp: parseInt(d.ts, 10),
          }
        }
      )
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<Liquidation[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((l) => l.amount > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50)
}

export async function GET() {
  const sources = [
    { name: "Binance", fn: fetchFromBinance },
    { name: "OKX", fn: fetchFromOKX },
  ]

  for (const source of sources) {
    try {
      const liquidations = await source.fn()
      if (liquidations.length > 0) {
        return NextResponse.json({ liquidations, estimated: false })
      }
    } catch {
      // try next source
    }
  }

  // If all sources return empty (not errored), that's fine — markets may be calm
  return NextResponse.json({
    liquidations: [],
    estimated: true,
    message: "No recent liquidations found — markets may be calm",
  })
}
