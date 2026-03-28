"use client"

import { useState, useEffect, useCallback } from "react"
import { Percent, RefreshCw, Info } from "lucide-react"
import { TableSkeleton } from "@/components/terminal/widget-skeleton"
import { useLastUpdated } from "@/hooks/useLastUpdated"

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
  const [showTooltip, setShowTooltip] = useState(false)
  const [search, setSearch] = useState("")
  const { markUpdated, formatLastUpdated } = useLastUpdated()

  const fetchFunding = useCallback(async () => {
    try {
      const res = await fetch("/api/funding")
      if (!res.ok) throw new Error("Failed to fetch funding rates")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      markUpdated()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [markUpdated])

  useEffect(() => {
    fetchFunding()
    const interval = setInterval(fetchFunding, 60_000)
    return () => clearInterval(interval)
  }, [fetchFunding])

  // Tick every 30s to keep countdowns visually up-to-date between data refreshes
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return <TableSkeleton rows={8} />
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

  const filtered = data?.filter(d => d.symbol.toLowerCase().includes(search.toLowerCase())) || []

  const positiveCount = filtered.filter((d) => d.fundingRate > 0).length
  const negativeCount = filtered.filter((d) => d.fundingRate < 0).length

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Percent className="size-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Funding Rates</span>
          <span className="badge badge-positive flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-current animate-pulse" />
            LIVE
          </span>
          {formatLastUpdated() && <span className="text-[8px] text-muted-foreground/40">{formatLastUpdated()}</span>}
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
                  <span className="text-negative font-medium">Positive</span>: Longs pay shorts (bearish bias).
                </p>
                <p>
                  <span className="text-positive font-medium">Negative</span>: Shorts pay longs (bullish bias).
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

      {/* Search */}
      <div className="shrink-0 px-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter..."
          className="bg-secondary/50 border border-border px-1.5 py-0.5 text-[9px] text-foreground w-20 outline-none focus:border-primary/40 font-mono"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-[10px] px-1">
        <span className="badge badge-negative">
          {positiveCount} Positive
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="badge badge-positive">
          {negativeCount} Negative
        </span>
      </div>

      {/* Table */}
      {data && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-1 px-1 py-1 text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider border-b border-border sticky top-0 bg-card">
            <span>Symbol</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Mark Price</span>
            <span className="text-right">Next</span>
          </div>

          {/* Table rows */}
          {filtered.map((item) => {
            const rate = item.fundingRate
            const rateColor =
              rate > 0.1 ? "text-negative font-bold" :
              rate > 0.05 ? "text-negative" :
              rate > 0 ? "text-negative/70" :
              rate < -0.1 ? "text-positive font-bold" :
              rate < -0.05 ? "text-positive" :
              rate < 0 ? "text-positive/70" :
              "text-muted-foreground"
            const prefix = rate > 0 ? "+" : ""
            return (
              <div
                key={item.symbol}
                className="grid grid-cols-4 gap-1 px-1 py-1.5 text-[10px] border-b border-border/30 hover:bg-secondary/30 transition-colors duration-100"
              >
                <span className="font-mono font-medium text-foreground">{item.symbol}</span>
                <span className={`text-right num font-medium ${rateColor}`}>
                  {prefix}{item.fundingRate.toFixed(4)}%
                </span>
                <span className="text-right num text-muted-foreground">
                  ${formatPrice(item.markPrice)}
                </span>
                <span className="text-right num text-muted-foreground">
                  {formatCountdown(item.nextFundingTime)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground/40">
          Binance Futures{formatLastUpdated() ? ` · Updated ${formatLastUpdated()}` : ""}
        </span>
      </div>
    </div>
  )
}
