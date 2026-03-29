"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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

function useWidgetSize(ref: React.RefObject<HTMLElement | null>) {
  const [compact, setCompact] = useState(false)
  const [tiny, setTiny] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setCompact(w < 280)
      setTiny(w < 180)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return { compact, tiny }
}

function fmtGwei(v: number, compact: boolean) {
  if (compact) return Math.round(v).toString()
  return v % 1 === 0 ? v.toString() : v.toFixed(1)
}

function fmtEth(gwei: number, compact: boolean) {
  const eth = (gwei * 21000) / 1e9
  if (compact) return eth.toFixed(4)
  return eth.toFixed(6)
}

export function GasTracker() {
  const [gasData, setGasData] = useState<GasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { markUpdated, formatLastUpdated } = useLastUpdated()
  const containerRef = useRef<HTMLDivElement>(null)
  const { compact, tiny } = useWidgetSize(containerRef)

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
    const interval = setInterval(fetchGas, 15_000)
    return () => clearInterval(interval)
  }, [fetchGas])

  if (loading && !gasData) {
    return <CardsSkeleton count={3} />
  }

  if (error && !gasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
        <div className="text-muted-foreground/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    <div ref={containerRef} className="h-full flex flex-col p-2 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Fuel className="size-3" />
          <span className="text-[9px] font-bold uppercase tracking-wider">ETH Gas</span>
          {!compact && formatLastUpdated() && <span className="text-[8px] text-muted-foreground/50">{formatLastUpdated()}</span>}
        </div>
        <button
          onClick={fetchGas}
          className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
          title="Refresh"
        >
          <RefreshCw className="size-3" />
        </button>
      </div>

      {gasData && (
        <>
          {/* Gas tiers — responsive layout */}
          {tiny ? (
            /* Ultra compact: single column rows */
            <div className="space-y-1 text-[10px]">
              {[
                { label: "Slow", gwei: gasData.low, color: "text-positive", icon: Clock },
                { label: "Avg", gwei: gasData.average, color: "text-amber-400", icon: Zap },
                { label: "Fast", gwei: gasData.high, color: "text-negative", icon: Rocket },
              ].map(({ label, gwei, color, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between px-1">
                  <span className={`flex items-center gap-1 ${color}`}>
                    <Icon className="size-2.5" />
                    {label}
                  </span>
                  <span className="num font-bold text-foreground">{fmtGwei(gwei, true)} <span className="text-muted-foreground font-normal">gwei</span></span>
                </div>
              ))}
            </div>
          ) : (
            /* Normal: 3-column grid */
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Slow", gwei: gasData.low, color: "text-positive", icon: Clock },
                { label: "Standard", gwei: gasData.average, color: "text-amber-400", icon: Zap },
                { label: "Fast", gwei: gasData.high, color: "text-negative", icon: Rocket },
              ].map(({ label, gwei, color, icon: Icon }) => (
                <div key={label} className="border border-border/30 bg-secondary/10 p-1.5 text-center">
                  <div className={`text-[8px] uppercase tracking-wider font-medium ${color} mb-0.5 flex items-center justify-center gap-0.5`}>
                    <Icon className="size-2.5" /> {compact ? label.slice(0, 4) : label}
                  </div>
                  <div className={`${compact ? "text-sm" : "text-base"} font-bold text-foreground num`}>{fmtGwei(gwei, compact)}</div>
                  <div className="text-[8px] text-muted-foreground">Gwei</div>
                </div>
              ))}
            </div>
          )}

          {/* Base fee & network status */}
          <div className="space-y-0.5 text-[10px]">
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground">Base Fee</span>
              <span className="num text-foreground">{compact ? Math.round(gasData.baseFee) : gasData.baseFee.toFixed(2)} Gwei</span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground">Network</span>
              <span className={`font-medium ${getGasColor(gasData.average)}`}>
                {getGasLabel(gasData.average)}
              </span>
            </div>
            {!compact && (
              <div className="flex items-center justify-between px-1">
                <span className="text-muted-foreground">Last Block</span>
                <span className="num text-foreground">#{gasData.lastBlock.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Estimated costs — hidden when tiny */}
          {!tiny && (
            <div className="border-t border-border pt-1.5 space-y-0.5 text-[10px]">
              <div className="text-muted-foreground font-medium uppercase tracking-wider text-[8px] mb-0.5 px-1">Est. Cost (21k gas)</div>
              {[
                { label: "Slow", gwei: gasData.low },
                { label: compact ? "Avg" : "Standard", gwei: gasData.average },
                { label: "Fast", gwei: gasData.high },
              ].map(({ label, gwei }) => (
                <div key={label} className="flex items-center justify-between px-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="num text-foreground">{fmtEth(gwei, compact)} ETH</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
