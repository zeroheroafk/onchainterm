"use client"

import { useState, useEffect, useCallback } from "react"
import { Percent, RefreshCw, Info } from "lucide-react"

interface FundingItem {
  symbol: string
  fundingRate: number
  markPrice: number
  nextFundingTime: number
}

function formatCountdown(targetMs: number): string {
  const diff = targetMs - Date.now()
  if (diff <= 0) return "Now"
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toPrecision(4)
}

export function FundingRates() {
  const [data, setData] = useState<FundingItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [, setTick] = useState(0)

  const fetchFunding = useCallback(async () => {
    try {
      const res = await fetch("/api/funding")
      if (!res.ok) throw new Error("Failed to fetch funding rates")
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
    fetchFunding()
    const interval = setInterval(fetchFunding, 60_000)
    return () => clearInterval(interval)
  }, [fetchFunding])

  // Tick every 30s to keep countdowns visually up-to-date between data refreshes
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Loading funding rates...
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
        <span className="text-red-400">{error}</span>
        <button onClick={fetchFunding} className="text-primary hover:underline">
          Retry
        </button>
      </div>
    )
  }

  const positiveCount = data?.filter((d) => d.fundingRate > 0).length ?? 0
  const negativeCount = data?.filter((d) => d.fundingRate < 0).length ?? 0

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Percent className="size-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Funding Rates</span>
          <span className="flex items-center gap-1 rounded bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold text-green-400">
            <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
              title="What are funding rates?"
            >
              <Info className="size-3" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded border border-border bg-card p-2 text-[10px] text-muted-foreground shadow-lg">
                <p className="font-medium text-foreground mb-1">Funding Rates</p>
                <p>
                  Funding rates are periodic payments between long and short traders in perpetual futures.
                </p>
                <p className="mt-1">
                  <span className="text-red-400 font-medium">Positive</span>: Longs pay shorts (bearish bias).
                </p>
                <p>
                  <span className="text-green-400 font-medium">Negative</span>: Shorts pay longs (bullish bias).
                </p>
              </div>
            )}
          </div>
          <button
            onClick={fetchFunding}
            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-[10px] px-1">
        <span className="text-red-400 font-medium">
          {positiveCount} Positive
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-green-400 font-medium">
          {negativeCount} Negative
        </span>
      </div>

      {/* Table */}
      {data && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-1 px-1 py-1 text-[9px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border sticky top-0 bg-card">
            <span>Symbol</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Mark Price</span>
            <span className="text-right">Next</span>
          </div>

          {/* Table rows */}
          {data.map((item) => {
            const isPositive = item.fundingRate > 0
            const rateColor = isPositive ? "text-red-400" : "text-green-400"
            const prefix = isPositive ? "+" : ""
            return (
              <div
                key={item.symbol}
                className="grid grid-cols-4 gap-1 px-1 py-1.5 text-[10px] border-b border-border/30 hover:bg-secondary/30 transition-colors"
              >
                <span className="font-mono font-medium text-foreground">{item.symbol}</span>
                <span className={`text-right font-mono font-medium ${rateColor}`}>
                  {prefix}{item.fundingRate.toFixed(4)}%
                </span>
                <span className="text-right font-mono text-muted-foreground">
                  ${formatPrice(item.markPrice)}
                </span>
                <span className="text-right font-mono text-muted-foreground">
                  {formatCountdown(item.nextFundingTime)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground">
          Binance Futures · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  )
}
