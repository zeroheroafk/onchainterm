"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { ChartSkeleton } from "@/components/terminal/widget-skeleton"

interface FearGreedEntry {
  value: number
  classification: string
  timestamp: number
}

function getColor(value: number): string {
  if (value <= 20) return "#ea3943" // Extreme Fear
  if (value <= 40) return "#ea8c00" // Fear
  if (value <= 60) return "#f5d100" // Neutral
  if (value <= 80) return "#16c784" // Greed
  return "#00b57c" // Extreme Greed
}

function getGaugeRotation(value: number): number {
  // Map 0-100 to -90 to 90 degrees
  return (value / 100) * 180 - 90
}

export function FearGreedIndex() {
  const [entries, setEntries] = useState<FearGreedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/fear-greed")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEntries(data.entries)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300_000) // 5 min
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return <ChartSkeleton />
  if (error && entries.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
      <span className="text-red-400">{error}</span>
      <button onClick={fetchData} className="text-primary hover:underline">Retry</button>
    </div>
  )

  const current = entries[0]
  if (!current) return null

  const color = getColor(current.value)
  const rotation = getGaugeRotation(current.value)

  return (
    <div className="h-full flex flex-col p-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">Fear & Greed Index</span>
        <button onClick={fetchData} className="rounded-md p-1 text-muted-foreground/40 hover:text-primary hover:bg-secondary/50 transition-colors">
          <RefreshCw className="size-3" />
        </button>
      </div>

      {/* Gauge */}
      <div className="flex flex-col items-center gap-2 flex-1 justify-center">
        <div className="relative w-40 h-20 overflow-hidden">
          {/* Semicircle background */}
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" opacity="0.5" />
            {/* Colored arc segments */}
            <path d="M 10 100 A 90 90 0 0 1 46 28" fill="none" stroke="#ea3943" strokeWidth="16" strokeLinecap="round" />
            <path d="M 46 28 A 90 90 0 0 1 100 10" fill="none" stroke="#ea8c00" strokeWidth="16" />
            <path d="M 100 10 A 90 90 0 0 1 154 28" fill="none" stroke="#f5d100" strokeWidth="16" />
            <path d="M 154 28 A 90 90 0 0 1 190 100" fill="none" stroke="#16c784" strokeWidth="16" strokeLinecap="round" />
            {/* Needle */}
            <g transform={`rotate(${rotation} 100 100)`} style={{ transition: 'transform 1s ease-out', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
              <line x1="100" y1="100" x2="100" y2="25" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="100" cy="100" r="4" fill={color} />
              <circle cx="100" cy="100" r="2" fill="white" opacity="0.3" />
            </g>
          </svg>
        </div>

        {/* Value */}
        <div className="text-center">
          <div className="text-3xl font-bold num animate-fade-in" style={{ color, textShadow: `0 0 20px ${color}33` }}>{current.value}</div>
          <div className={`text-[11px] font-semibold inline-block rounded-full px-3 py-0.5 ${
            current.classification === "Extreme Fear" ? "bg-red-500/12 text-red-400 ring-1 ring-red-500/20" :
            current.classification === "Fear" ? "bg-orange-500/12 text-orange-400 ring-1 ring-orange-500/20" :
            current.classification === "Neutral" ? "bg-yellow-500/12 text-yellow-400 ring-1 ring-yellow-500/20" :
            current.classification === "Greed" ? "bg-green-500/12 text-green-400 ring-1 ring-green-500/20" :
            current.classification === "Extreme Greed" ? "bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20" :
            ""
          }`}>{current.classification}</div>
        </div>
      </div>

      {/* History (last 7 days) */}
      <div className="shrink-0 space-y-1">
        <div className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground/50">Last 7 Days</div>
        <div className="flex items-center gap-1">
          {entries.slice(0, 7).reverse().map((entry, i) => (
            <div key={i} className="flex-1 text-center">
              <div
                className="h-6 rounded flex items-center justify-center text-[8px] font-bold text-white/90"
                style={{ backgroundColor: getColor(entry.value) }}
              >
                {entry.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground/40">Alternative.me · Updates every ~8h</span>
      </div>
    </div>
  )
}
