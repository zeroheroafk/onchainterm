import { NextResponse } from "next/server"

export async function GET() {
  try {
    const [protocolsRes, globalRes] = await Promise.all([
      fetch("https://api.llama.fi/protocols", { next: { revalidate: 120 } }),
      fetch("https://api.llama.fi/v2/historicalChainTvl", { next: { revalidate: 120 } }),
    ])

    if (!protocolsRes.ok) throw new Error(`DeFiLlama protocols error: ${protocolsRes.status}`)

    const protocols = await protocolsRes.json()

    // Get top 15 by TVL
    const sorted = protocols
      .filter((p: { tvl: number; name: string }) => p.tvl > 0 && p.name)
      .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
      .slice(0, 15)
      .map((p: { name: string; tvl: number; change_1d: number; change_7d: number; category: string; chains: string[]; logo: string }) => ({
        name: p.name,
        tvl: p.tvl,
        change1d: p.change_1d ?? null,
        change7d: p.change_7d ?? null,
        category: p.category || "Unknown",
        chains: (p.chains || []).slice(0, 5),
        logo: p.logo || null,
      }))

    // Global TVL
    let globalTvl = 0
    if (globalRes.ok) {
      const globalData = await globalRes.json()
      if (Array.isArray(globalData) && globalData.length > 0) {
        globalTvl = globalData[globalData.length - 1].tvl
      }
    }

    return NextResponse.json({ protocols: sorted, globalTvl })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch DeFi data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
