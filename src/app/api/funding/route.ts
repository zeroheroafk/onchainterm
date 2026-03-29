import { NextResponse } from "next/server"
import { fetchWithTimeout, fetchWithFallback } from "@/lib/api-utils"

interface FundingItem {
  symbol: string
  fundingRate: number
  markPrice: number
  nextFundingTime: number
}

// Top perpetual symbols to query on OKX
const OKX_INSTRUMENTS = [
  "BTC-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT-SWAP", "DOGE-USDT-SWAP",
  "XRP-USDT-SWAP", "BNB-USDT-SWAP", "ADA-USDT-SWAP", "AVAX-USDT-SWAP",
  "LINK-USDT-SWAP", "SUI-USDT-SWAP", "DOT-USDT-SWAP", "MATIC-USDT-SWAP",
  "NEAR-USDT-SWAP", "ARB-USDT-SWAP", "OP-USDT-SWAP", "APT-USDT-SWAP",
  "LTC-USDT-SWAP", "UNI-USDT-SWAP", "ATOM-USDT-SWAP", "FIL-USDT-SWAP",
]

async function fetchFromBinance(): Promise<FundingItem[]> {
  const res = await fetchWithTimeout("https://fapi.binance.com/fapi/v1/premiumIndex", {
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Binance ${res.status}`)
  const data: {
    symbol: string
    markPrice: string
    lastFundingRate: string
    nextFundingTime: number
  }[] = await res.json()

  return data
    .filter((item) => item.symbol.endsWith("USDT"))
    .map((item) => {
      const fundingRate = parseFloat(item.lastFundingRate) * 100
      const markPrice = parseFloat(item.markPrice)
      if (isNaN(fundingRate) || isNaN(markPrice)) return null
      return {
        symbol: item.symbol.replace(/USDT$/, ""),
        fundingRate,
        markPrice,
        nextFundingTime: item.nextFundingTime,
      }
    })
    .filter((item): item is FundingItem => item !== null)
    .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
    .slice(0, 20)
}

async function fetchFromOKX(): Promise<FundingItem[]> {
  // OKX requires individual instrument queries for funding rate, but we can
  // batch the ticker data and funding rate calls
  const [tickerRes, ...fundingResults] = await Promise.all([
    fetchWithTimeout("https://www.okx.com/api/v5/market/tickers?instType=SWAP", {
      next: { revalidate: 60 },
    }),
    ...OKX_INSTRUMENTS.map((instId) =>
      fetchWithTimeout(`https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`, {
        next: { revalidate: 60 },
      }).catch(() => null)
    ),
  ])

  if (!tickerRes.ok) throw new Error(`OKX tickers ${tickerRes.status}`)
  const tickerData = await tickerRes.json()
  const tickers: { instId: string; last: string }[] = tickerData?.data || []

  // Build a price map
  const priceMap = new Map<string, number>()
  for (const t of tickers) {
    priceMap.set(t.instId, parseFloat(t.last))
  }

  const items: FundingItem[] = []

  for (let i = 0; i < OKX_INSTRUMENTS.length; i++) {
    const res = fundingResults[i]
    if (!res || !("ok" in res) || !res.ok) continue
    try {
      const json = await res.json()
      const d = json?.data?.[0]
      if (!d) continue
      const fundingRate = parseFloat(d.fundingRate) * 100
      const nextFundingTime = parseInt(d.nextFundingTime, 10)
      const instId = OKX_INSTRUMENTS[i]
      const markPrice = priceMap.get(instId) || 0

      if (isNaN(fundingRate)) continue

      items.push({
        symbol: instId.replace("-USDT-SWAP", ""),
        fundingRate,
        markPrice,
        nextFundingTime,
      })
    } catch {
      // skip
    }
  }

  return items.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
}

export async function GET() {
  try {
    const { data, source } = await fetchWithFallback<FundingItem[]>([
      { name: "Binance", fetch: fetchFromBinance },
      { name: "OKX", fetch: fetchFromOKX },
    ])

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Unable to fetch funding rates from any source" },
        { status: 502 }
      )
    }

    return NextResponse.json({ data, source })
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch funding rates from any source" },
      { status: 502 }
    )
  }
}
