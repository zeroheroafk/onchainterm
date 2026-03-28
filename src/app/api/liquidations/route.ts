import { NextResponse } from "next/server"

// CoinGlass public endpoint for recent liquidations
// This scrapes the publicly available data
const COINGLASS_URL = "https://open-api.coinglass.com/public/v2/liquidation/info"

export async function GET() {
  try {
    // Use CoinGlass public liquidation data
    const res = await fetch(
      "https://open-api.coinglass.com/public/v2/liquidation_history?time_type=1&symbol=all",
      { next: { revalidate: 30 } }
    )

    // CoinGlass public API may be restricted, fallback to CoinGecko market data
    // to estimate liquidation activity from price volatility
    if (!res.ok) {
      // Fallback: use CoinGecko to get volatile coins and estimate liquidation activity
      return await getFallbackLiquidations()
    }

    const data = await res.json()
    if (data.code !== "0" || !data.data) {
      return await getFallbackLiquidations()
    }

    return NextResponse.json({ liquidations: data.data })
  } catch {
    return await getFallbackLiquidations()
  }
}

// Fallback: return empty data with a clear message instead of fabricated events
function getFallbackLiquidations() {
  return NextResponse.json({
    liquidations: [],
    estimated: true,
    message: "Live liquidation data unavailable",
  })
}
