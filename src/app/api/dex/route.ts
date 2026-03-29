import { NextResponse } from "next/server"

interface DexToken {
  name: string
  symbol: string
  chain: string
  priceUsd: string | null
  priceChange24h: number | null
  volume24h: number | null
  liquidity: number | null
  pairAddress: string | null
  url: string
  tokenAddress: string
  icon: string | null
}

interface BoostToken {
  tokenAddress: string
  chainId: string
  icon?: string
  name?: string
  symbol?: string
  description?: string
  url?: string
  amount?: number
}

interface ProfileToken {
  tokenAddress: string
  chainId: string
  icon?: string
  name?: string
  symbol?: string
  description?: string
  url?: string
}

function normalizeChain(chainId: string): string {
  const map: Record<string, string> = {
    ethereum: "ethereum",
    solana: "solana",
    bsc: "bsc",
    arbitrum: "arbitrum",
    polygon: "polygon",
    avalanche: "avalanche",
    base: "base",
    optimism: "optimism",
  }
  return map[chainId.toLowerCase()] || chainId.toLowerCase()
}

export async function GET() {
  try {
    const [boostsRes, profilesRes] = await Promise.all([
      fetch("https://api.dexscreener.com/token-boosts/latest/v1", {
        next: { revalidate: 60 },
      }),
      fetch("https://api.dexscreener.com/token-profiles/latest/v1", {
        next: { revalidate: 60 },
      }),
    ])

    if (!boostsRes.ok) throw new Error(`DexScreener boosts error: ${boostsRes.status}`)
    if (!profilesRes.ok) throw new Error(`DexScreener profiles error: ${profilesRes.status}`)

    const boosts: BoostToken[] = await boostsRes.json()
    const profiles: ProfileToken[] = await profilesRes.json()

    // Build a map of unique tokens from boosts (higher priority) then profiles
    const tokenMap = new Map<string, DexToken>()

    for (const t of boosts) {
      const key = `${t.chainId}:${t.tokenAddress}`
      if (!tokenMap.has(key)) {
        tokenMap.set(key, {
          name: t.name || t.symbol || "Unknown",
          symbol: t.symbol || "???",
          chain: normalizeChain(t.chainId),
          priceUsd: null,
          priceChange24h: null,
          volume24h: null,
          liquidity: null,
          pairAddress: null,
          url: t.url || `https://dexscreener.com/${t.chainId}/${t.tokenAddress}`,
          tokenAddress: t.tokenAddress,
          icon: t.icon || null,
        })
      }
    }

    for (const t of profiles) {
      const key = `${t.chainId}:${t.tokenAddress}`
      if (!tokenMap.has(key)) {
        tokenMap.set(key, {
          name: t.name || t.symbol || "Unknown",
          symbol: t.symbol || "???",
          chain: normalizeChain(t.chainId),
          priceUsd: null,
          priceChange24h: null,
          volume24h: null,
          liquidity: null,
          pairAddress: null,
          url: t.url || `https://dexscreener.com/${t.chainId}/${t.tokenAddress}`,
          tokenAddress: t.tokenAddress,
          icon: t.icon || null,
        })
      }
    }

    // Take the first 20 unique tokens and fetch pair data for them
    const tokens = Array.from(tokenMap.values()).slice(0, 20)

    // Batch fetch pair data from DexScreener (up to 30 addresses per call per chain)
    const chainGroups = new Map<string, DexToken[]>()
    for (const token of tokens) {
      const group = chainGroups.get(token.chain) || []
      group.push(token)
      chainGroups.set(token.chain, group)
    }

    const pairFetches = Array.from(chainGroups.entries()).map(
      async ([, groupTokens]) => {
        // DexScreener supports batch lookup by token addresses (comma-separated)
        const addresses = groupTokens.map((t) => t.tokenAddress).join(",")
        try {
          const res = await fetch(
            `https://api.dexscreener.com/tokens/v1/${addresses}`,
            { next: { revalidate: 60 } }
          )
          if (!res.ok) return
          const pairs = await res.json()
          if (!Array.isArray(pairs)) return

          // For each token, find the best pair (highest liquidity)
          for (const token of groupTokens) {
            const tokenPairs = pairs.filter(
              (p: { baseToken?: { address?: string } }) =>
                p.baseToken?.address?.toLowerCase() === token.tokenAddress.toLowerCase()
            )
            if (tokenPairs.length > 0) {
              // Pick pair with highest liquidity
              const best = tokenPairs.sort(
                (a: { liquidity?: { usd?: number } }, b: { liquidity?: { usd?: number } }) =>
                  (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
              )[0]
              token.priceUsd = best.priceUsd || null
              token.priceChange24h = best.priceChange?.h24 ?? null
              token.volume24h = best.volume?.h24 ?? null
              token.liquidity = best.liquidity?.usd ?? null
              token.pairAddress = best.pairAddress || null
              if (best.url) token.url = best.url
              // Fill in name/symbol from pair data if missing
              if ((!token.name || token.name === "Unknown") && best.baseToken?.name) {
                token.name = best.baseToken.name
              }
              if ((!token.symbol || token.symbol === "???") && best.baseToken?.symbol) {
                token.symbol = best.baseToken.symbol
              }
              if (!token.icon && best.info?.imageUrl) {
                token.icon = best.info.imageUrl
              }
            }
          }
        } catch {
          // Silently skip failed pair lookups
        }
      }
    )

    await Promise.all(pairFetches)

    // Filter out tokens that still have no symbol or price
    const enriched = tokens.filter(t => t.symbol !== "???" && t.priceUsd !== null)

    return NextResponse.json({ tokens: enriched })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch DEX data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
