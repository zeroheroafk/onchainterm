import { NextResponse } from "next/server"

const CRYPTOCOMPARE_URL = "https://min-api.cryptocompare.com/data/v2/news/"

interface CCNewsItem {
  title: string
  url: string
  source: string
  published_on: number
  categories: string
  body: string
}

export async function GET() {
  try {
    const res = await fetch(
      `${CRYPTOCOMPARE_URL}?lang=EN&limit=30`,
      { next: { revalidate: 30 } }
    )

    if (!res.ok) {
      throw new Error(`CryptoCompare API error: ${res.status}`)
    }

    const data = await res.json()

    if (!data.Data || !Array.isArray(data.Data)) {
      throw new Error("Invalid response from CryptoCompare")
    }

    const news = data.Data.map((item: CCNewsItem) => ({
      title: item.title,
      url: item.url,
      source: item.source,
      published_at: new Date(item.published_on * 1000).toISOString(),
      currencies: extractCurrencies(item.categories),
    }))

    return NextResponse.json({ news })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch news"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function extractCurrencies(categories: string): string[] {
  if (!categories) return []
  const cryptoTags = ["BTC", "ETH", "SOL", "XRP", "BNB", "ADA", "DOGE", "DOT", "AVAX", "MATIC", "LINK", "UNI", "ATOM", "LTC", "NEAR", "APT", "ARB", "OP", "SUI", "TRX"]
  return categories
    .split("|")
    .map(c => c.trim().toUpperCase())
    .filter(c => cryptoTags.includes(c))
}
