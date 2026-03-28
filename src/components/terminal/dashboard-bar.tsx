"use client"

import { useState, useEffect } from "react"
import { Activity, BarChart3, Shield } from "lucide-react"

interface GlobalStats {
  totalMarketCap: number
  totalVolume: number
  btcDominance: number
  marketCapChange24h: number
}

export function DashboardBar() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [fearGreed, setFearGreed] = useState<{ value: number; classification: string } | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/global")
        const json = await res.json()
        const d = json.data
        setStats({
          totalMarketCap: d.total_market_cap?.usd ?? 0,
          totalVolume: d.total_volume?.usd ?? 0,
          btcDominance: d.market_cap_percentage?.btc ?? 0,
          marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? 0,
        })
      } catch {}
    }

    async function fetchFearGreed() {
      try {
        const res = await fetch("https://api.alternative.me/fng/?limit=1")
        const json = await res.json()
        if (json.data?.[0]) {
          setFearGreed({
            value: parseInt(json.data[0].value),
            classification: json.data[0].value_classification,
          })
        }
      } catch {}
    }

    fetchStats()
    fetchFearGreed()
    const id = setInterval(() => { fetchStats(); fetchFearGreed() }, 120_000)
    return () => clearInterval(id)
  }, [])

  const formatCompact = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    return `$${n.toFixed(0)}`
  }

  const fgColor = (v: number) => {
    if (v <= 25) return "text-red-400"
    if (v <= 45) return "text-orange-400"
    if (v <= 55) return "text-yellow-400"
    if (v <= 75) return "text-green-400"
    return "text-emerald-400"
  }

  if (!stats) return null

  return (
    <div className="flex items-center justify-center gap-5 border-b border-border/30 bg-secondary/5 px-4 py-1 text-[9px] font-mono shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1">
        <BarChart3 className="size-2.5 text-muted-foreground" />
        <span className="text-muted-foreground/60">MCap</span>
        <span className="text-foreground/90 font-semibold">{formatCompact(stats.totalMarketCap)}</span>
        <span className={stats.marketCapChange24h >= 0 ? "text-green-400" : "text-red-400"}>
          {stats.marketCapChange24h >= 0 ? "+" : ""}{stats.marketCapChange24h.toFixed(1)}%
        </span>
      </div>

      <span className="text-border/40 hidden sm:inline">|</span>

      <div className="hidden sm:flex items-center gap-1">
        <Activity className="size-2.5 text-muted-foreground" />
        <span className="text-muted-foreground/60">Vol</span>
        <span className="text-foreground/90 font-semibold">{formatCompact(stats.totalVolume)}</span>
      </div>

      <span className="text-border/40">|</span>

      <div className="flex items-center gap-1">
        <span className="text-muted-foreground/60">BTC.D</span>
        <span className="text-amber-400 font-bold">{stats.btcDominance.toFixed(1)}%</span>
      </div>

      {fearGreed && (
        <>
          <span className="text-border/40 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1">
            <Shield className="size-2.5 text-muted-foreground" />
            <span className="text-muted-foreground/60">F&G</span>
            <span className={`font-bold ${fgColor(fearGreed.value)}`}>{fearGreed.value}</span>
            <span className={`${fgColor(fearGreed.value)} opacity-70`}>{fearGreed.classification}</span>
          </div>
        </>
      )}
    </div>
  )
}
