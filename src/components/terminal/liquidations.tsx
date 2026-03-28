"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, Zap } from "lucide-react"
import { FeedSkeleton } from "@/components/terminal/widget-skeleton"

interface Liquidation {
  symbol: string
  side: "long" | "short"
  amount: number
  price: number
  exchange: string
  timestamp: number
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function formatAmount(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export function LiquidationsFeed() {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estimated, setEstimated] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null)
  const seenLiqRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/liquidations")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // On initial load, mark all items as already seen for animation purposes
      if (isInitialLoadRef.current) {
        data.liquidations.forEach((liq: Liquidation, i: number) =>
          seenLiqRef.current.add(`${liq.symbol}-${liq.timestamp}-${i}`)
        )
        isInitialLoadRef.current = false
      }

      setLiquidations(data.liquidations)
      setEstimated(data.estimated ?? false)
      setUnavailableMessage(data.message ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return <FeedSkeleton rows={5} />
  if (error && liquidations.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
      <span className="text-red-400">{error}</span>
      <button onClick={fetchData} className="text-primary hover:underline">Retry</button>
    </div>
  )

  const hasRealData = liquidations.length > 0 && !estimated
  const totalLongs = liquidations.filter(l => l.side === "long").reduce((s, l) => s + l.amount, 0)
  const totalShorts = liquidations.filter(l => l.side === "short").reduce((s, l) => s + l.amount, 0)
  const longPct = totalLongs + totalShorts > 0 ? (totalLongs / (totalLongs + totalShorts)) * 100 : 50

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="size-3.5 text-amber-400/70" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">Liquidations</span>
        </div>
        <button onClick={fetchData} className="rounded-md p-1 text-muted-foreground/40 hover:text-primary hover:bg-secondary/50 transition-colors">
          <RefreshCw className="size-3" />
        </button>
      </div>

      {hasRealData && (
        <>
          {/* Long/Short ratio bar */}
          <div className="px-3 py-2 border-b border-border/20 shrink-0">
            <div className="flex items-center justify-between text-[9px] mb-1">
              <span className="text-positive font-medium">Longs {formatAmount(totalLongs)}</span>
              <span className="text-negative font-medium">Shorts {formatAmount(totalShorts)}</span>
            </div>
            <div className="h-2 rounded-full bg-negative overflow-hidden">
              <div
                className="h-full bg-positive rounded-full transition-all progress-fill"
                style={{ width: `${longPct}%` }}
              />
            </div>
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-auto min-h-0">
            <div className="divide-y divide-border/20">
              {liquidations.map((liq, i) => {
                const liqKey = `${liq.symbol}-${liq.timestamp}-${i}`
                const isNew = !seenLiqRef.current.has(liqKey)
                return (
                <div key={liqKey} className={`px-3 py-1.5 hover:bg-secondary/30 transition-colors ${isNew ? "animate-slide-in" : ""}`} onAnimationEnd={() => seenLiqRef.current.add(liqKey)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-[9px] uppercase px-1.5 py-0.5 rounded ${
                        liq.side === "long"
                          ? "bg-positive/15 text-positive"
                          : "bg-negative/15 text-negative"
                      }`}>
                        {liq.side === "long" ? "LONG" : "SHORT"}
                      </span>
                      <span className="text-xs font-bold text-foreground">{liq.symbol}</span>
                    </div>
                    <span className={`text-xs font-bold num ${
                      liq.amount >= 500000 ? "text-amber-400" : "text-foreground"
                    }`}>
                      {formatAmount(liq.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-[9px] text-muted-foreground">
                    <span>{liq.exchange} @ ${liq.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span className="text-muted-foreground/40">{timeAgo(liq.timestamp)}</span>
                  </div>
                </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border/20 px-3 py-1 shrink-0 text-center">
            <span className="text-[8px] text-muted-foreground">
              CoinGlass · {liquidations.length} events
            </span>
          </div>
        </>
      )}

      {!hasRealData && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <Zap className="size-5 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {unavailableMessage ?? "Live liquidation data unavailable"}
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              CoinGlass API may be down or rate-limited
            </p>
          </div>
          <button
            onClick={fetchData}
            className="text-[10px] text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
