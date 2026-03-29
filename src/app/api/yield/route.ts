import { NextResponse } from "next/server"

interface DefiLlamaPool {
  chain: string
  project: string
  symbol: string
  tvlUsd: number
  apy: number | null
  apyBase: number | null
  apyReward: number | null
  pool: string
  stablecoin: boolean
}

export async function GET() {
  try {
    const res = await fetch("https://yields.llama.fi/pools", {
      next: { revalidate: 300 },
    })

    if (!res.ok) throw new Error(`DeFiLlama API error: ${res.status}`)

    const json = await res.json()
    const pools: DefiLlamaPool[] = json.data || []

    // Filter: must have APY, TVL > $100k
    const valid = pools.filter(
      (p) =>
        p.apy !== null &&
        p.apy > 0 &&
        p.apy < 10000 &&
        p.tvlUsd > 100_000
    )

    // Get top 35 by APY (general)
    const topByApy = [...valid]
      .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
      .slice(0, 35)

    // Get top 20 stablecoin pools by TVL (ensures stables are always present)
    const topStables = [...valid]
      .filter((p) => p.stablecoin)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, 20)

    // Merge and deduplicate
    const seen = new Set<string>()
    const merged: DefiLlamaPool[] = []
    for (const p of [...topByApy, ...topStables]) {
      if (!seen.has(p.pool)) {
        seen.add(p.pool)
        merged.push(p)
      }
    }

    const result = merged.map((p) => ({
      pool: p.pool,
      project: p.project,
      chain: p.chain,
      symbol: p.symbol,
      tvl: p.tvlUsd,
      apy: p.apy ?? 0,
      apyBase: p.apyBase ?? 0,
      apyReward: p.apyReward ?? 0,
      stablecoin: p.stablecoin,
    }))

    return NextResponse.json({ pools: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch yield data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
