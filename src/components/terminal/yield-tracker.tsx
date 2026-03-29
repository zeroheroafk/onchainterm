"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Sprout, RefreshCw } from "lucide-react"
import { TableSkeleton } from "@/components/terminal/widget-skeleton"
import { useLastUpdated } from "@/hooks/useLastUpdated"
import { formatLargeNumber } from "@/lib/constants"

interface Pool {
  pool: string
  project: string
  chain: string
  symbol: string
  tvl: number
  apy: number
  apyBase: number
  apyReward: number
  stablecoin: boolean
}

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: "text-blue-400",
  Solana: "text-purple-400",
  BSC: "text-yellow-400",
  Arbitrum: "text-sky-400",
  Polygon: "text-violet-400",
  Avalanche: "text-red-400",
  Base: "text-blue-300",
  Optimism: "text-rose-400",
}

const FILTER_TABS = ["All", "Stables", "High TVL"] as const

export function YieldTracker() {
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTER_TABS)[number]>("All")
  const { markUpdated, formatLastUpdated } = useLastUpdated()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/yield")
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setPools(json.pools || [])
      markUpdated()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [markUpdated])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filtered = useMemo(() => {
    switch (filter) {
      case "Stables":
        return pools.filter((p) => p.stablecoin)
      case "High TVL":
        return pools.filter((p) => p.tvl > 10_000_000).sort((a, b) => b.tvl - a.tvl)
      default:
        return pools
    }
  }, [pools, filter])

  if (loading && pools.length === 0) return <TableSkeleton rows={8} />

  if (error && pools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
        <span className="text-red-400">{error}</span>
        <button onClick={fetchData} className="text-primary hover:underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sprout className="size-3.5 text-positive" />
          <span className="text-xs font-bold text-foreground">Yield Farming</span>
          <span className="flex items-center gap-1 text-[10px] text-positive">
            <span className="size-1.5 rounded-full bg-positive animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {formatLastUpdated() && (
            <span className="text-[8px] text-muted-foreground/50">{formatLastUpdated()}</span>
          )}
          <button onClick={fetchData} className="p-0.5 text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border shrink-0">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors widget-tab ${
              filter === tab
                ? "text-primary font-bold widget-tab-active"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {tab}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {filtered.length} pool{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-[1]">
            <tr className="border-b border-border">
              <th className="py-1.5 px-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Pool</th>
              <th className="py-1.5 px-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Protocol</th>
              <th className="py-1.5 px-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Chain</th>
              <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">APY</th>
              <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground hidden xl:table-cell">TVL</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pool) => (
              <tr
                key={pool.pool}
                className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-foreground truncate max-w-[120px]">{pool.symbol}</span>
                    {pool.stablecoin && (
                      <span className="text-[8px] text-amber-400 border border-amber-400/30 px-1 rounded">$</span>
                    )}
                  </div>
                </td>
                <td className="py-1.5 px-2 text-muted-foreground truncate max-w-[100px]">
                  {pool.project}
                </td>
                <td className={`py-1.5 px-2 hidden lg:table-cell text-[10px] font-medium ${CHAIN_COLORS[pool.chain] || "text-muted-foreground"}`}>
                  {pool.chain}
                </td>
                <td className="py-1.5 px-2 text-right">
                  <span className="num font-bold text-positive">{pool.apy.toFixed(2)}%</span>
                  {pool.apyReward > 0 && (
                    <div className="text-[9px] text-muted-foreground num">
                      {pool.apyBase.toFixed(1)}% + {pool.apyReward.toFixed(1)}%
                    </div>
                  )}
                </td>
                <td className="py-1.5 px-2 text-right num text-muted-foreground hidden xl:table-cell">
                  ${formatLargeNumber(pool.tvl)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                  No pools found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-1 shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground/40">DeFiLlama</span>
      </div>
    </div>
  )
}
