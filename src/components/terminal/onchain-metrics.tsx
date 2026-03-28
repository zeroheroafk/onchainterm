"use client"

import { useState, useEffect, useCallback } from "react"
import { Activity, Cpu, Users, Clock, BarChart3, Layers, RefreshCw } from "lucide-react"
import { CardsSkeleton } from "@/components/terminal/widget-skeleton"

interface OnchainData {
  hashRate: number
  difficulty: number
  transactionsPerDay: number
  activeAddresses: number
  avgBlockTime: number
  mempoolSize: number
}

function formatHashRate(rate: number): string {
  if (rate >= 1e6) return `${(rate / 1e6).toFixed(2)} EH/s`
  if (rate >= 1e3) return `${(rate / 1e3).toFixed(2)} PH/s`
  return `${rate.toFixed(2)} TH/s`
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDifficulty(d: number): string {
  if (d >= 1e12) return `${(d / 1e12).toFixed(2)}T`
  if (d >= 1e9) return `${(d / 1e9).toFixed(2)}B`
  if (d >= 1e6) return `${(d / 1e6).toFixed(2)}M`
  return d.toLocaleString()
}

const METRICS_CONFIG = [
  {
    key: "hashRate" as const,
    label: "Hash Rate",
    icon: Cpu,
    color: "text-cyan-400",
    borderColor: "border-cyan-400/20",
    format: (v: number) => formatHashRate(v),
  },
  {
    key: "activeAddresses" as const,
    label: "Active Addresses",
    icon: Users,
    color: "text-green-400",
    borderColor: "border-green-400/20",
    format: (v: number) => formatCompact(v),
  },
  {
    key: "transactionsPerDay" as const,
    label: "Daily Transactions",
    icon: BarChart3,
    color: "text-amber-400",
    borderColor: "border-amber-400/20",
    format: (v: number) => formatCompact(v),
  },
  {
    key: "avgBlockTime" as const,
    label: "Avg Block Time",
    icon: Clock,
    color: "text-purple-400",
    borderColor: "border-purple-400/20",
    format: (v: number) => `${v.toFixed(2)} min`,
  },
  {
    key: "difficulty" as const,
    label: "Difficulty",
    icon: Activity,
    color: "text-rose-400",
    borderColor: "border-rose-400/20",
    format: (v: number) => formatDifficulty(v),
  },
  {
    key: "mempoolSize" as const,
    label: "Mempool Size",
    icon: Layers,
    color: "text-blue-400",
    borderColor: "border-blue-400/20",
    format: (v: number) => formatCompact(v),
  },
]

export function OnchainMetrics() {
  const [data, setData] = useState<OnchainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/onchain")
      if (!res.ok) throw new Error("Failed to fetch on-chain data")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300_000) // refresh every 5 min
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading && !data) {
    return <CardsSkeleton count={6} />
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
        <span className="text-red-400">{error}</span>
        <button onClick={fetchData} className="text-primary hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="size-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            On-Chain Metrics
          </span>
        </div>
        <button
          onClick={fetchData}
          className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Metrics Grid */}
      {data && (
        <div className="grid grid-cols-2 gap-2">
          {METRICS_CONFIG.map(({ key, label, icon: Icon, color, borderColor, format }, i) => (
            <div
              key={key}
              className={`rounded-lg border ${borderColor} bg-secondary/20 p-2.5 hover-lift animate-fade-in`}
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`size-3 ${color}`} />
                <span className="text-[9px] uppercase text-muted-foreground font-medium">
                  {label}
                </span>
              </div>
              <div className="text-sm font-bold text-foreground font-mono">
                {format(data[key])}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground">
          Blockchain.info {lastUpdated ? `· Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  )
}
