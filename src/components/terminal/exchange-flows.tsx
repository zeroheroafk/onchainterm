"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { CardsSkeleton } from "@/components/terminal/widget-skeleton"

interface ExchangeFlow {
  name: string
  balanceEth: number
  inflow24h: number
  outflow24h: number
  netFlow: number
}

function formatEth(n: number): string {
  if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(1)}K`
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)}K`
  return n.toFixed(1)
}

function formatBalance(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}

export function ExchangeFlows() {
  const [exchanges, setExchanges] = useState<ExchangeFlow[]>([])
  const [totalNet, setTotalNet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/exchange-flows")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExchanges(data.exchanges)
      setTotalNet(data.totalNetFlow)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 120_000) // 2 min
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return <CardsSkeleton count={4} />
  if (error && exchanges.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
      <span className="text-red-400">{error}</span>
      <button onClick={fetchData} className="text-primary hover:underline">Retry</button>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exchange Flows (ETH)</span>
        <button onClick={fetchData} className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors">
          <RefreshCw className="size-3" />
        </button>
      </div>

      {/* Net flow summary */}
      <div className={`px-3 py-2 border-b shrink-0 ${totalNet > 0 ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20"}`}>
        <div className="text-[9px] uppercase text-muted-foreground font-medium">Total Net Flow (24h)</div>
        <div className={`text-lg font-bold font-mono ${totalNet > 0 ? "text-red-400" : "text-green-400"}`}>
          {totalNet > 0 ? "+" : ""}{formatEth(totalNet)} ETH
        </div>
        <div className="text-[9px] text-muted-foreground mt-0.5">
          {totalNet > 0
            ? "Net inflow → Bearish signal (selling pressure)"
            : "Net outflow → Bullish signal (accumulation)"
          }
        </div>
      </div>

      {/* Exchange list */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="divide-y divide-border/50">
          {exchanges.map((ex) => (
            <div key={ex.name} className="px-3 py-2.5 hover:bg-secondary/30 transition-colors duration-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground">{ex.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{formatBalance(ex.balanceEth)} ETH</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] animate-fade-in">
                <div className="flex items-center gap-1">
                  <ArrowDownToLine className="size-3 text-red-400" />
                  <div>
                    <div className="text-muted-foreground">Inflow</div>
                    <div className="font-mono text-red-400">{formatEth(ex.inflow24h)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpFromLine className="size-3 text-green-400" />
                  <div>
                    <div className="text-muted-foreground">Outflow</div>
                    <div className="font-mono text-green-400">{formatEth(ex.outflow24h)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Net</div>
                  <div className={`font-mono font-medium ${ex.netFlow > 0 ? "text-red-400" : "text-green-400"}`}>
                    {ex.netFlow > 0 ? "+" : ""}{formatEth(ex.netFlow)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-3 py-1 shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground">Etherscan · Inflow = bearish, Outflow = bullish</span>
      </div>
    </div>
  )
}
