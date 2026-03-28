"use client"

import { useState, useEffect, useCallback } from "react"
import { Fuel, RefreshCw, Clock, Zap, Rocket } from "lucide-react"
import { CardsSkeleton } from "@/components/terminal/widget-skeleton"
import { useLastUpdated } from "@/hooks/useLastUpdated"

interface GasData {
  low: number
  average: number
  high: number
  baseFee: number
  lastBlock: number
}

function getGasColor(gwei: number) {
  if (gwei <= 15) return "text-positive"
  if (gwei <= 40) return "text-amber-400"
  return "text-negative"
}

function getGasLabel(gwei: number) {
  if (gwei <= 10) return "Very Low"
  if (gwei <= 20) return "Low"
  if (gwei <= 40) return "Normal"
  if (gwei <= 80) return "High"
  return "Very High"
}

export function GasTracker() {
  const [gasData, setGasData] = useState<GasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { markUpdated, formatLastUpdated } = useLastUpdated()

  const fetchGas = useCallback(async () => {
    try {
      const res = await fetch("/api/gas")
      if (!res.ok) throw new Error("Failed to fetch gas data")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGasData(data)
      markUpdated()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [markUpdated])

  useEffect(() => {
    fetchGas()
    const interval = setInterval(fetchGas, 15_000) // refresh every 15s
    return () => clearInterval(interval)
  }, [fetchGas])

  if (loading && !gasData) {
    return <CardsSkeleton count={3} />
  }

  if (error && !gasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div className="text-muted-foreground/20">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-foreground/70 font-medium mb-1">Unable to fetch gas data</p>
          <p className="text-[9px] text-muted-foreground/50 max-w-[180px]">Etherscan API may be temporarily unavailable</p>
        </div>
        <button onClick={fetchGas} className="text-[10px] text-primary/70 hover:text-primary transition-colors uppercase tracking-wider font-medium">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Fuel className="size-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">ETH Gas · Live</span>
          {formatLastUpdated() && <span className="text-[8px] text-muted-foreground/50">{formatLastUpdated()}</span>}
        </div>
        <button
          onClick={fetchGas}
          className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          title="Refresh"
        >
          <RefreshCw className="size-3" />
        </button>
      </div>

      {gasData && (
        <>
          {/* Gas tiers */}
          <div className="grid grid-cols-3 gap-2">
            <div className="hover-3d rounded-lg border border-border/30 bg-secondary/10 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider font-medium text-positive mb-1 flex items-center justify-center gap-1"><Clock className="size-3" /> Slow</div>
              <div className="text-lg font-bold text-foreground num">{gasData.low}</div>
              <div className="text-[9px] text-muted-foreground">Gwei</div>
            </div>
            <div className="hover-3d rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-amber-400 font-medium mb-1 flex items-center justify-center gap-1"><Zap className="size-3" /> Standard</div>
              <div className="text-lg font-bold text-foreground num">{gasData.average}</div>
              <div className="text-[9px] text-muted-foreground">Gwei</div>
            </div>
            <div className="hover-3d rounded-lg border border-border/30 bg-secondary/10 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider font-medium text-negative mb-1 flex items-center justify-center gap-1"><Rocket className="size-3" /> Fast</div>
              <div className="text-lg font-bold text-foreground num">{gasData.high}</div>
              <div className="text-[9px] text-muted-foreground">Gwei</div>
            </div>
          </div>

          {/* Base fee & network status */}
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground">Base Fee</span>
              <span className="num text-foreground">{gasData.baseFee.toFixed(2)} Gwei</span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground">Network</span>
              <span className={`font-medium ${getGasColor(gasData.average)}`}>
                {getGasLabel(gasData.average)}
              </span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground">Last Block</span>
              <span className="num text-foreground">#{gasData.lastBlock.toLocaleString()}</span>
            </div>
          </div>

          {/* Estimated costs */}
          <div className="border-t border-border pt-2 space-y-1 text-[10px]">
            <div className="text-muted-foreground font-medium uppercase tracking-wider mb-1">Est. Transaction Cost (21k gas)</div>
            {[
              { label: "Slow", gwei: gasData.low },
              { label: "Standard", gwei: gasData.average },
              { label: "Fast", gwei: gasData.high },
            ].map(({ label, gwei }) => {
              const ethCost = (gwei * 21000) / 1e9
              return (
                <div key={label} className="flex items-center justify-between px-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="num text-foreground">{ethCost.toFixed(6)} ETH</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-auto shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground/40">
          Etherscan Gas Oracle{formatLastUpdated() ? ` · Updated ${formatLastUpdated()}` : ""}
        </span>
      </div>
    </div>
  )
}
