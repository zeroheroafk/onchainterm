"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react"

interface GlobalData {
  total_market_cap: { usd: number }
  total_volume: { usd: number }
  market_cap_percentage: { btc: number; eth: number }
  market_cap_change_percentage_24h_usd: number
  active_cryptocurrencies: number
}

function formatLarge(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

export function MarketOverview() {
  const [data, setData] = useState<GlobalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGlobal() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/global")
        if (!res.ok) throw new Error("Failed to fetch")
        const json = await res.json()
        setData(json.data)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchGlobal()
    const interval = setInterval(fetchGlobal, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Loading global data...
      </div>
    )
  }

  const change24h = data.market_cap_change_percentage_24h_usd
  const isPositive = change24h >= 0

  return (
    <div className="h-full overflow-auto p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Total Market Cap */}
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <BarChart3 className="size-3" />
            <span className="text-[10px] uppercase tracking-wider">Total Market Cap</span>
          </div>
          <p className="text-sm font-bold text-foreground">{formatLarge(data.total_market_cap.usd)}</p>
          <p className={`text-[10px] font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{change24h.toFixed(2)}% (24h)
          </p>
        </div>

        {/* 24h Volume */}
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Activity className="size-3" />
            <span className="text-[10px] uppercase tracking-wider">24h Volume</span>
          </div>
          <p className="text-sm font-bold text-foreground">{formatLarge(data.total_volume.usd)}</p>
        </div>

        {/* BTC Dominance */}
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp className="size-3" />
            <span className="text-[10px] uppercase tracking-wider">BTC Dominance</span>
          </div>
          <p className="text-sm font-bold text-foreground">{data.market_cap_percentage.btc.toFixed(1)}%</p>
          <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${data.market_cap_percentage.btc}%` }} />
          </div>
        </div>

        {/* ETH Dominance */}
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingDown className="size-3" />
            <span className="text-[10px] uppercase tracking-wider">ETH Dominance</span>
          </div>
          <p className="text-sm font-bold text-foreground">{data.market_cap_percentage.eth.toFixed(1)}%</p>
          <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-blue-400" style={{ width: `${data.market_cap_percentage.eth}%` }} />
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-muted-foreground">
        {data.active_cryptocurrencies.toLocaleString()} active cryptocurrencies
      </div>
    </div>
  )
}
