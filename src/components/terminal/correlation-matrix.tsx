"use client"

import { useState, useEffect, useCallback } from "react"
import { Grid3x3, Info, RefreshCw } from "lucide-react"
import { ChartSkeleton } from "@/components/terminal/widget-skeleton"

function correlationColor(r: number): string {
  const clamped = Math.max(-1, Math.min(1, r))
  if (clamped >= 0) {
    const t = clamped
    return `rgba(45, 212, 160, ${(t * 0.35).toFixed(2)})`
  } else {
    const t = -clamped
    return `rgba(248, 113, 113, ${(t * 0.35).toFixed(2)})`
  }
}

interface CorrelationData {
  matrix: Record<string, Record<string, number>>
  symbols: string[]
  dataPoints: number
}

export function CorrelationMatrix() {
  const [data, setData] = useState<CorrelationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/correlation")
      if (!res.ok) throw new Error("Failed to fetch correlation data")
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
    const interval = setInterval(fetchData, 3600_000) // refresh hourly
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Grid3x3 className="size-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
            Correlation Matrix
          </span>
          {data && (
            <span className="text-[8px] text-muted-foreground/50">30d</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="relative group">
            <Info className="size-3 text-muted-foreground cursor-help" />
            <div className="absolute right-0 top-5 z-50 hidden group-hover:block w-52 p-2 rounded bg-popover border border-border shadow-lg text-[9px] text-muted-foreground leading-relaxed">
              Pearson correlation of 30-day daily returns between assets. +1 means prices move together, -1 means opposite, 0 means no relationship.{data ? ` Based on ${data.dataPoints} data points.` : ""}
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>

      {/* Matrix or fallback */}
      <div className="flex-1 overflow-auto min-h-0 p-2">
        {loading && !data ? (
          <ChartSkeleton />
        ) : error && !data ? (
          <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
            <span className="text-red-400">{error}</span>
            <button onClick={fetchData} className="text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : data ? (
          <div className="overflow-auto">
            <table className="border-collapse w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background p-0 w-8" />
                  {data.symbols.map((sym) => (
                    <th
                      key={sym}
                      className="text-[8px] font-semibold text-muted-foreground/70 px-0.5 py-1 text-center"
                      style={{ minWidth: "32px" }}
                    >
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.symbols.map((rowSym) => (
                  <tr key={rowSym}>
                    <td className="sticky left-0 z-10 bg-background text-[8px] font-semibold text-muted-foreground/70 pr-1 py-0.5 text-right whitespace-nowrap">
                      {rowSym}
                    </td>
                    {data.symbols.map((colSym) => {
                      const r = data.matrix[rowSym][colSym]
                      const isDiagonal = rowSym === colSym
                      return (
                        <td
                          key={colSym}
                          className="text-center text-[9px] num px-0.5 py-0.5 hover:ring-1 hover:ring-primary/50 transition-all duration-100"
                          style={{
                            backgroundColor: isDiagonal ? "rgb(39,39,42)" : correlationColor(r),
                            minWidth: "32px",
                          }}
                          title={`${rowSym}/${colSym}: ${r.toFixed(4)}`}
                        >
                          <span className={`${isDiagonal ? "text-muted-foreground" : "text-white"}`}>
                            {r.toFixed(2)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Legend */}
      <div className="border-t border-border px-3 py-1 shrink-0 flex items-center justify-center gap-1.5">
        <span className="text-[8px] text-negative">-1</span>
        <div className="h-2 flex-1 rounded" style={{ background: 'linear-gradient(to right, #ef4444, #f59e0b, #eab308, #22c55e, #3b82f6)' }} />
        <span className="text-[8px] text-positive">+1</span>
      </div>
    </div>
  )
}
