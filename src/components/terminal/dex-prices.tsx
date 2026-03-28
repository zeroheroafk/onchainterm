"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { ArrowUpRight, Zap } from "lucide-react"
import { formatPrice, formatLargeNumber } from "@/lib/constants"
import { TableSkeleton } from "@/components/terminal/widget-skeleton"

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

const CHAIN_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ethereum: { bg: "bg-blue-500/20", text: "text-blue-400", label: "ETH" },
  solana: { bg: "bg-purple-500/20", text: "text-purple-400", label: "SOL" },
  bsc: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "BSC" },
  arbitrum: { bg: "bg-sky-500/20", text: "text-sky-400", label: "ARB" },
  polygon: { bg: "bg-violet-500/20", text: "text-violet-400", label: "POLY" },
  avalanche: { bg: "bg-red-500/20", text: "text-red-400", label: "AVAX" },
  base: { bg: "bg-blue-600/20", text: "text-blue-300", label: "BASE" },
  optimism: { bg: "bg-rose-500/20", text: "text-rose-400", label: "OP" },
}

const FILTER_TABS = ["All", "Ethereum", "Solana", "BSC"] as const

function ChainBadge({ chain }: { chain: string }) {
  const style = CHAIN_COLORS[chain] || { bg: "bg-zinc-500/20", text: "text-zinc-400", label: chain.slice(0, 4).toUpperCase() }
  return (
    <span className={`${style.bg} ${style.text} text-[9px] font-bold px-1.5 py-0.5 rounded uppercase`}>
      {style.label}
    </span>
  )
}

function PriceChange({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">--</span>
  }
  const color = value >= 0 ? "text-green-400" : "text-red-400"
  const sign = value >= 0 ? "+" : ""
  return <span className={color}>{sign}{value.toFixed(2)}%</span>
}

export function DexPrices() {
  const [tokens, setTokens] = useState<DexToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<(typeof FILTER_TABS)[number]>("All")

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dex")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTokens(data.tokens || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch DEX data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filtered = useMemo(() => {
    if (activeFilter === "All") return tokens
    return tokens.filter(
      (t) => t.chain.toLowerCase() === activeFilter.toLowerCase()
    )
  }, [tokens, activeFilter])

  if (isLoading && tokens.length === 0) {
    return <TableSkeleton rows={6} />
  }

  if (error && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-xs p-4">
        {error}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="size-3.5 text-amber-400" />
          <span className="text-xs font-bold text-foreground">DEX Prices</span>
          <span className="flex items-center gap-1 text-[10px] text-green-400">
            <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {filtered.length} token{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Chain filter tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border shrink-0">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              activeFilter === tab
                ? "bg-primary/20 text-primary font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table key={activeFilter} className="w-full text-xs tab-content">
          <thead className="sticky top-0 bg-card z-[1]">
            <tr className="border-b border-border">
              <th className="py-1.5 px-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Token</th>
              <th className="py-1.5 px-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Chain</th>
              <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">Price</th>
              <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">24H</th>
              <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Volume</th>
              <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Liquidity</th>
              <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground w-6" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((token, i) => (
              <tr
                key={`${token.chain}-${token.tokenAddress}-${i}`}
                onClick={() => window.open(token.url, "_blank", "noopener,noreferrer")}
                className="border-b border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors duration-100"
              >
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    {token.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={token.icon} alt="" className="size-4 shrink-0 rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                    )}
                    <span className="font-bold text-foreground">{token.symbol}</span>
                    <span className="text-muted-foreground text-[10px] hidden xl:inline truncate max-w-[80px]">
                      {token.name}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <ChainBadge chain={token.chain} />
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-amber-400">
                  {token.priceUsd
                    ? formatPrice(parseFloat(token.priceUsd))
                    : "--"}
                </td>
                <td className="py-1.5 px-2 text-right font-mono">
                  <PriceChange value={token.priceChange24h} />
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-muted-foreground hidden lg:table-cell">
                  {token.volume24h ? formatLargeNumber(token.volume24h) : "--"}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-muted-foreground hidden xl:table-cell">
                  {token.liquidity ? formatLargeNumber(token.liquidity) : "--"}
                </td>
                <td className="py-1.5 px-2 text-right">
                  <ArrowUpRight className="size-3 text-muted-foreground" />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                  No tokens found for this chain
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
