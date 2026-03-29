import { NextResponse } from "next/server"

// Binance spot symbols (USDT pairs)
const PAIRS = [
  { symbol: "BTCUSDT", label: "BTC" },
  { symbol: "ETHUSDT", label: "ETH" },
  { symbol: "SOLUSDT", label: "SOL" },
  { symbol: "BNBUSDT", label: "BNB" },
  { symbol: "XRPUSDT", label: "XRP" },
  { symbol: "ADAUSDT", label: "ADA" },
  { symbol: "DOGEUSDT", label: "DOGE" },
  { symbol: "LINKUSDT", label: "LINK" },
  { symbol: "AVAXUSDT", label: "AVAX" },
  { symbol: "DOTUSDT", label: "DOT" },
]

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

async function fetchFromBinance() {
  // Fetch 30 daily candles for each pair
  const results = await Promise.all(
    PAIRS.map(async ({ symbol }) => {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=31`,
        { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) throw new Error(`Binance ${res.status}`)
      const data: [number, string, string, string, string][] = await res.json()
      // Extract close prices [timestamp, open, high, low, close, ...]
      return data.map((candle) => parseFloat(candle[4]))
    })
  )
  return results
}

async function fetchFromOKX() {
  const okxSymbols = PAIRS.map(p => p.label + "-USDT")
  const results = await Promise.all(
    okxSymbols.map(async (instId) => {
      const res = await fetch(
        `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=1D&limit=31`,
        { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) throw new Error(`OKX ${res.status}`)
      const json = await res.json()
      const candles = json.data || []
      // OKX returns [ts, o, h, l, c, vol, ...] in reverse chronological
      return candles.map((c: string[]) => parseFloat(c[4])).reverse()
    })
  )
  return results
}

export async function GET() {
  const sources = [
    { name: "Binance", fn: fetchFromBinance },
    { name: "OKX", fn: fetchFromOKX },
  ]

  for (const source of sources) {
    try {
      const prices = await source.fn()

      // Calculate daily returns
      const minLen = Math.min(...prices.map((p) => p.length))
      if (minLen < 5) continue

      const returns = prices.map((p) => {
        const trimmed = p.slice(0, minLen)
        const r: number[] = []
        for (let i = 1; i < trimmed.length; i++) {
          r.push(trimmed[i] / trimmed[i - 1] - 1)
        }
        return r
      })

      const symbols = PAIRS.map((p) => p.label)
      const matrix: Record<string, Record<string, number>> = {}

      for (let i = 0; i < symbols.length; i++) {
        matrix[symbols[i]] = {}
        for (let j = 0; j < symbols.length; j++) {
          matrix[symbols[i]][symbols[j]] =
            i === j ? 1 : pearson(returns[i], returns[j])
        }
      }

      return NextResponse.json({
        matrix,
        symbols,
        dataPoints: minLen - 1,
        source: source.name,
      })
    } catch {
      // try next source
    }
  }

  return NextResponse.json(
    { error: "Unable to fetch price data from any source" },
    { status: 502 }
  )
}
