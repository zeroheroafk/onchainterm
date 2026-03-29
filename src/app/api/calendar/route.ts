import { NextResponse } from "next/server"

interface Raise {
  date: number // unix timestamp
  name: string
  round?: string
  amount?: number
  chains?: string[]
  sector?: string
  category?: string
  leadInvestors?: string[]
  otherInvestors?: string[]
}

export async function GET() {
  try {
    const res = await fetch("https://api.llama.fi/raises", {
      next: { revalidate: 1800 },
    })

    if (!res.ok) throw new Error(`DeFiLlama raises API error: ${res.status}`)

    const json = await res.json()
    const raises: Raise[] = json.raises || []

    if (!Array.isArray(raises) || raises.length === 0) {
      return NextResponse.json({ events: [], source: "DeFiLlama" })
    }

    // Sort by date descending (most recent first), take last 40
    const sorted = raises
      .filter((r) => r.date && r.name)
      .sort((a, b) => b.date - a.date)
      .slice(0, 40)

    const events = sorted.map((r) => {
      const dateStr = new Date(r.date * 1000).toISOString().split("T")[0]
      // DeFiLlama amounts are in millions
      const amt = r.amount || 0
      const amountStr = amt >= 1000
        ? `$${(amt / 1000).toFixed(1)}B`
        : amt >= 1
        ? `$${amt % 1 === 0 ? amt.toFixed(0) : amt.toFixed(1)}M`
        : amt > 0
        ? `$${(amt * 1000).toFixed(0)}K`
        : ""

      return {
        title: amountStr
          ? `${r.name} raises ${amountStr}${r.round ? ` (${r.round})` : ""}`
          : `${r.name}${r.round ? ` — ${r.round}` : ""}`,
        date: dateStr,
        coin: r.name,
        symbol: "",
        category: r.round || r.category || "Fundraise",
        chain: r.chains?.[0] || "",
        amount: r.amount || 0,
        investors: r.leadInvestors?.slice(0, 3).join(", ") || "",
      }
    })

    return NextResponse.json({ events, source: "DeFiLlama" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch events"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
