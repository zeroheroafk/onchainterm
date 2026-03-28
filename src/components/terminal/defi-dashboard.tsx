"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { TableSkeleton } from "@/components/terminal/widget-skeleton"

interface DefiProtocol {
  name: string
  tvl: number
  change1d: number | null
  change7d: number | null
  category: string
  chains: string[]
  logo: string | null
}

function formatTvl(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toLocaleString()}`
}

function ChangeCell({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  const color = value >= 0 ? "text-positive" : "text-negative"
  const sign = value >= 0 ? "+" : ""
  return <span className={`${color} num`}>{sign}{value.toFixed(1)}%</span>
}

export function DefiDashboard() {
  const [protocols, setProtocols] = useState<DefiProtocol[]>([])
  const [globalTvl, setGlobalTvl] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/defi")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProtocols(data.protocols)
      setGlobalTvl(data.globalTvl)
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

  if (loading) return <TableSkeleton rows={6} />
  if (error && protocols.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
      <span className="text-red-400">{error}</span>
      <button onClick={fetchData} className="text-primary hover:underline">Retry</button>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">DeFi Dashboard</span>
          <span className="badge badge-positive">LIVE</span>
        </div>
        <button onClick={fetchData} className="rounded-md p-1 text-muted-foreground/40 hover:text-primary hover:bg-secondary/50 transition-colors">
          <RefreshCw className="size-3" />
        </button>
      </div>

      {/* Global TVL */}
      {globalTvl > 0 && (
        <div className="px-3 py-2 border-b border-border bg-secondary/10 shrink-0">
          <div className="text-[9px] uppercase text-muted-foreground font-medium">Total Value Locked (All Chains)</div>
          <div className="text-lg font-bold text-foreground text-gradient num">{formatTvl(globalTvl)}</div>
        </div>
      )}

      {/* Protocol list */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-[1]">
            <tr className="border-b border-border/20">
              <th className="py-1.5 px-2 text-left text-[9px] font-medium text-muted-foreground/70 uppercase">#</th>
              <th className="py-1.5 px-2 text-left text-[9px] font-medium text-muted-foreground/70 uppercase">Protocol</th>
              <th className="py-1.5 px-2 text-right text-[9px] font-medium text-muted-foreground/70 uppercase">TVL</th>
              <th className="py-1.5 px-2 text-right text-[9px] font-medium text-muted-foreground/70 uppercase">1D</th>
              <th className="py-1.5 px-2 text-right text-[9px] font-medium text-muted-foreground/70 uppercase hidden lg:table-cell">7D</th>
            </tr>
          </thead>
          <tbody>
            {protocols.map((p, i) => (
              <tr key={p.name} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                <td className="py-1.5 px-2 text-muted-foreground">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    {p.logo && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.logo} alt="" className="size-4 rounded-full shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-foreground truncate">{p.name}</div>
                      <div className="text-[9px] text-muted-foreground">{p.category}</div>
                    </div>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right num text-foreground">{formatTvl(p.tvl)}</td>
                <td className="py-1.5 px-2 text-right text-[10px]"><ChangeCell value={p.change1d} /></td>
                <td className="py-1.5 px-2 text-right text-[10px] hidden lg:table-cell"><ChangeCell value={p.change7d} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border/20 px-3 py-1 shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground">DeFiLlama · {protocols.length} protocols</span>
      </div>
    </div>
  )
}
