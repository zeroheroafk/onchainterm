"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { RefreshCw } from "lucide-react"
import { ChartSkeleton } from "@/components/terminal/widget-skeleton"

interface HeatmapCoin {
  id: string
  symbol: string
  name: string
  price: number
  marketCap: number
  change1h: number
  change24h: number
  change7d: number
}

type TimeFrame = "1h" | "24h" | "7d"

function getChangeValue(coin: HeatmapCoin, tf: TimeFrame): number {
  switch (tf) {
    case "1h": return coin.change1h
    case "24h": return coin.change24h
    case "7d": return coin.change7d
  }
}

function getColor(change: number): string {
  if (change <= -10) return "bg-red-700"
  if (change <= -5) return "bg-red-600"
  if (change <= -2) return "bg-red-500/80"
  if (change <= -0.5) return "bg-red-500/50"
  if (change < 0.5) return "bg-zinc-700"
  if (change < 2) return "bg-green-500/50"
  if (change < 5) return "bg-green-500/80"
  if (change < 10) return "bg-green-600"
  return "bg-green-700"
}

function getTextColor(change: number): string {
  if (Math.abs(change) < 0.5) return "text-muted-foreground"
  return "text-white"
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  return `$${price.toFixed(4)}`
}

const CATEGORIES: Record<string, string[]> = {
  "all": [],
  "L1": ["bitcoin", "ethereum", "solana", "cardano", "avalanche-2", "polkadot", "near", "sui", "aptos", "toncoin"],
  "L2": ["matic-network", "arbitrum", "optimism", "starknet", "mantle"],
  "DeFi": ["uniswap", "aave", "lido-dao", "maker", "chainlink", "the-graph", "compound-governance-token"],
  "Meme": ["dogecoin", "shiba-inu", "pepe", "bonk", "floki", "dogwifcoin"],
  "AI": ["fetch-ai", "render-token", "ocean-protocol", "singularitynet"],
}

export function Heatmap({ onSelectSymbol }: { onSelectSymbol?: (id: string) => void }) {
  const [coins, setCoins] = useState<HeatmapCoin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<TimeFrame>("24h")
  const [filter, setFilter] = useState<string>("all")

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/heatmap")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCoins(data.coins)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filteredCoins = useMemo(() => {
    if (filter === "all") return coins
    return coins.filter(c => CATEGORIES[filter]?.includes(c.id))
  }, [coins, filter])

  // Calculate relative sizes based on market cap (sqrt for better visual distribution)
  const sizedCoins = useMemo(() => {
    if (!filteredCoins.length) return []
    const maxMcap = Math.max(...filteredCoins.map(c => c.marketCap), 1)
    return filteredCoins.map(c => ({
      ...c,
      relativeSize: Math.sqrt(c.marketCap / maxMcap),
    }))
  }, [filteredCoins])

  if (loading) return <ChartSkeleton />
  if (error && coins.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
      <span className="text-red-400">{error}</span>
      <button onClick={fetchData} className="text-primary hover:underline">Retry</button>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Market Heatmap</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["1h", "24h", "7d"] as TimeFrame[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                timeframe === tf
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
          <button onClick={fetchData} className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors ml-1">
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/50 shrink-0">
        {Object.keys(CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-1.5 py-0.5 text-[9px] font-mono uppercase transition-colors ${
              filter === cat
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex-1 overflow-auto min-h-0 p-1.5">
        {sizedCoins.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No coins in this category
          </div>
        ) : (
        <div className="flex flex-wrap gap-1 h-full content-start">
          {sizedCoins.map((coin) => {
            const change = getChangeValue(coin, timeframe)
            const sign = change >= 0 ? "+" : ""
            // Min size 60px, scale up based on relative market cap
            const minWidth = 48
            const maxExtra = 80
            const width = minWidth + coin.relativeSize * maxExtra

            return (
              <div
                key={coin.id}
                className={`group relative rounded-sm p-1.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 hover:z-10 hover:brightness-110 ${getColor(change)} ${getTextColor(change)}`}
                onClick={() => onSelectSymbol?.(coin.id)}
                style={{ width: `${width}px`, height: `${width * 0.7}px`, minHeight: "40px" }}
              >
                <span className="text-[10px] font-bold leading-tight">{coin.symbol}</span>
                <span className="text-[9px] font-mono leading-tight">{sign}{change.toFixed(1)}%</span>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center text-[9px] rounded-sm">
                  <span className="text-foreground font-bold">{coin.symbol}</span>
                  <span className="text-foreground/80">{formatPrice(coin.price)}</span>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-border px-3 py-1 shrink-0 flex items-center justify-center gap-1">
        <span className="text-[8px] text-red-400">-10%</span>
        <div className="flex gap-0.5">
          {["bg-red-700", "bg-red-600", "bg-red-500/80", "bg-red-500/50", "bg-zinc-700", "bg-green-500/50", "bg-green-500/80", "bg-green-600", "bg-green-700"].map((c, i) => (
            <div key={i} className={`w-3 h-2 rounded-sm ${c}`} />
          ))}
        </div>
        <span className="text-[8px] text-green-400">+10%</span>
      </div>
    </div>
  )
}
