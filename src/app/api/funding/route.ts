import { NextResponse } from "next/server"

interface BinancePremiumIndex {
  symbol: string
  markPrice: string
  lastFundingRate: string
  nextFundingTime: number
  interestRate: string
  time: number
}

export async function GET() {
  try {
    const res = await fetch("https://fapi.binance.com/fapi/v1/premiumIndex", {
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      throw new Error(`Binance API returned ${res.status}`)
    }

    const data: BinancePremiumIndex[] = await res.json()

    // Filter to USDT pairs only, sort by absolute funding rate, take top 20
    const usdtPairs = data
      .filter((item) => item.symbol.endsWith("USDT"))
      .map((item) => ({
        symbol: item.symbol.replace(/USDT$/, ""),
        fundingRate: parseFloat(item.lastFundingRate) * 100,
        markPrice: parseFloat(item.markPrice),
        nextFundingTime: item.nextFundingTime,
      }))
      .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
      .slice(0, 20)

    return NextResponse.json(usdtPairs)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch funding rates"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
