import { NextResponse } from "next/server"

interface CoinGeckoEvent {
  title?: string
  description?: string
  date?: { date?: string }
  coin?: { id?: string; name?: string; symbol?: string }
  category?: { name?: string }
}

interface CalendarEvent {
  title: string
  date: string
  coin: string
  symbol: string
  category: string
}

export async function GET() {
  try {
    // CoinGecko events endpoint (free)
    const res = await fetch(
      "https://api.coingecko.com/api/v3/events?type=Event&upcoming_events_only=true",
      { next: { revalidate: 1800 } }
    )

    if (res.ok) {
      const json = await res.json()
      const events: CalendarEvent[] = (json.data || [])
        .filter((e: CoinGeckoEvent) => e.title && e.date?.date)
        .slice(0, 30)
        .map((e: CoinGeckoEvent) => ({
          title: e.title || "Unknown Event",
          date: e.date?.date || "",
          coin: e.coin?.name || "",
          symbol: e.coin?.symbol?.toUpperCase() || "",
          category: e.category?.name || "Event",
        }))

      if (events.length > 0) {
        return NextResponse.json({ events, source: "CoinGecko" })
      }
    }

    // Fallback: generate calendar from known upcoming events data
    // Use CoinGecko's coins list to get upcoming events via status_updates
    const fallbackEvents = await fetchFallbackEvents()
    return NextResponse.json({ events: fallbackEvents, source: "aggregated" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch events"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function fetchFallbackEvents(): Promise<CalendarEvent[]> {
  // Try CoinGecko global data for any scheduled events
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false",
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const coins: { id: string; symbol: string; name: string }[] = await res.json()
    if (!Array.isArray(coins)) return []

    // Check status updates for top coins (limited to avoid rate limits)
    const topCoins = coins.slice(0, 10)
    const events: CalendarEvent[] = []

    const results = await Promise.allSettled(
      topCoins.map(async (coin) => {
        const statusRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin.id}/status_updates`,
          { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) }
        )
        if (!statusRes.ok) return []
        const statusJson = await statusRes.json()
        return (statusJson.status_updates || []).slice(0, 3).map(
          (u: { title?: string; created_at?: string; category?: string }) => ({
            title: u.title || "Update",
            date: u.created_at?.split("T")[0] || "",
            coin: coin.name,
            symbol: coin.symbol.toUpperCase(),
            category: u.category || "Update",
          })
        )
      })
    )

    for (const r of results) {
      if (r.status === "fulfilled") events.push(...r.value)
    }

    return events
      .filter((e) => e.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30)
  } catch {
    return []
  }
}
