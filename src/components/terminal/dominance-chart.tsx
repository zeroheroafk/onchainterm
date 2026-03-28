"use client"

import { useState, useEffect, useCallback } from "react"
import { PieChart, RefreshCw } from "lucide-react"
import { ChartSkeleton } from "@/components/terminal/widget-skeleton"

interface DominanceData {
  btc_dominance: number
  eth_dominance: number
  others: number
  total_market_cap: number
  total_volume: number
  active_cryptocurrencies: number
}

function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

export function DominanceChart() {
  const [data, setData] = useState<DominanceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dominance")
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 120_000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return <ChartSkeleton />
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground p-4">
        <span className="text-xs">{error || "No data"}</span>
        <button onClick={fetchData} className="text-[10px] text-primary hover:underline">Retry</button>
      </div>
    )
  }

  const segments = [
    { label: "BTC", value: data.btc_dominance, color: "#f7931a" },
    { label: "ETH", value: data.eth_dominance, color: "#627eea" },
    { label: "Others", value: data.others, color: "#6b7280" },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <PieChart className="size-3 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            BTC Dominance
          </h2>
        </div>
        <button
          onClick={fetchData}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Refresh"
        >
          <RefreshCw className="size-3" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Stacked bar chart */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Market Dominance
          </div>
          <svg width="100%" height="32" className="rounded overflow-hidden">
            {(() => {
              let offset = 0
              return segments.map((seg, i) => {
                const x = offset
                offset += seg.value
                return (
                  <g key={seg.label}>
                    <rect
                      x={`${x}%`}
                      y="0"
                      width={`${seg.value}%`}
                      height="32"
                      fill={seg.color}
                      opacity={0.85}
                      className="transition-opacity duration-150 hover:opacity-80 cursor-pointer"
                    />
                    {seg.value > 8 && (
                      <text
                        x={`${x + seg.value / 2}%`}
                        y="16"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="animate-fade-in"
                        style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'backwards' }}
                      >
                        {seg.label} {seg.value.toFixed(1)}%
                      </text>
                    )}
                  </g>
                )
              })
            })()}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5 hover-3d">
              <div
                className="size-2 rounded-sm"
                style={{ backgroundColor: seg.color, opacity: 0.85 }}
              />
              <span className="text-[10px] num text-foreground/80">
                {seg.label}: {seg.value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-border bg-secondary/30 px-2.5 py-2">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
              Total Market Cap
            </div>
            <div className="text-sm font-bold num text-foreground">
              {formatLargeNumber(data.total_market_cap)}
            </div>
          </div>
          <div className="rounded border border-border bg-secondary/30 px-2.5 py-2">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
              24h Volume
            </div>
            <div className="text-sm font-bold num text-foreground">
              {formatLargeNumber(data.total_volume)}
            </div>
          </div>
        </div>

        <div className="rounded border border-border bg-secondary/30 px-2.5 py-2">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Active Cryptocurrencies
          </div>
          <div className="text-sm font-bold num text-foreground">
            {data.active_cryptocurrencies.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
