"use client"

import { useRef, useMemo, useEffect } from "react"
import { Grid3x3, Info } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"

const TRACKED_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "LINK", "AVAX", "DOT"]
const MIN_DATA_POINTS = 4
const MAX_DATA_POINTS = 24

type PriceSnapshot = Record<string, number>

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n === 0) return 0
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let denomX = 0
  let denomY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    num += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }
  const denom = Math.sqrt(denomX * denomY)
  if (denom === 0) return 0
  return num / denom
}

function correlationColor(r: number): string {
  // Interpolate: -1 = dark red, 0 = neutral/zinc, +1 = dark green
  const clamped = Math.max(-1, Math.min(1, r))
  if (clamped >= 0) {
    // 0 -> rgb(39,39,42) (zinc-800), 1 -> rgb(22,101,52) (green-800)
    const t = clamped
    const red = Math.round(39 + (22 - 39) * t)
    const green = Math.round(39 + (101 - 39) * t)
    const blue = Math.round(42 + (52 - 42) * t)
    return `rgb(${red},${green},${blue})`
  } else {
    // 0 -> rgb(39,39,42) (zinc-800), -1 -> rgb(153,27,27) (red-800)
    const t = -clamped
    const red = Math.round(39 + (153 - 39) * t)
    const green = Math.round(39 + (27 - 39) * t)
    const blue = Math.round(42 + (27 - 42) * t)
    return `rgb(${red},${green},${blue})`
  }
}

export function CorrelationMatrix() {
  const { data, lastUpdated } = useMarketData()
  const historyRef = useRef<PriceSnapshot[]>([])
  const lastTimestampRef = useRef<string | null>(null)

  // Record a new snapshot whenever data updates
  useEffect(() => {
    if (!data.length || !lastUpdated) return
    const ts = lastUpdated.toISOString()
    if (ts === lastTimestampRef.current) return
    lastTimestampRef.current = ts

    const snapshot: PriceSnapshot = {}
    for (const coin of data) {
      const sym = coin.symbol.toUpperCase()
      if (TRACKED_SYMBOLS.includes(sym)) {
        snapshot[sym] = coin.current_price
      }
    }
    if (Object.keys(snapshot).length === 0) return

    historyRef.current = [...historyRef.current, snapshot].slice(-MAX_DATA_POINTS)
  }, [data, lastUpdated])

  const history = historyRef.current
  const pointCount = history.length

  const matrix = useMemo(() => {
    if (pointCount < MIN_DATA_POINTS) return null

    const result: Record<string, Record<string, number>> = {}
    for (const a of TRACKED_SYMBOLS) {
      result[a] = {}
      for (const b of TRACKED_SYMBOLS) {
        if (a === b) {
          result[a][b] = 1
          continue
        }
        const pricesA: number[] = []
        const pricesB: number[] = []
        for (const snap of history) {
          if (snap[a] !== undefined && snap[b] !== undefined) {
            pricesA.push(snap[a])
            pricesB.push(snap[b])
          }
        }
        result[a][b] = pricesA.length >= MIN_DATA_POINTS ? pearson(pricesA, pricesB) : 0
      }
    }
    return result
  }, [pointCount, history])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Grid3x3 className="size-3 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Correlation Matrix
          </span>
        </div>
        <div className="relative group">
          <Info className="size-3 text-muted-foreground cursor-help" />
          <div className="absolute right-0 top-5 z-50 hidden group-hover:block w-52 p-2 rounded bg-popover border border-border shadow-lg text-[9px] text-muted-foreground leading-relaxed">
            Pearson correlation of price movements between assets. +1 means prices move together, -1 means they move opposite, 0 means no relationship. Based on last {pointCount} data points.
          </div>
        </div>
      </div>

      {/* Matrix or fallback */}
      <div className="flex-1 overflow-auto min-h-0 p-2">
        {!matrix ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-1">
            <Grid3x3 className="size-5 opacity-40" />
            <span>Collecting data... ({pointCount}/{MAX_DATA_POINTS} points)</span>
            <span className="text-[9px] opacity-60">Need at least {MIN_DATA_POINTS} snapshots</span>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="border-collapse w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background p-0 w-8" />
                  {TRACKED_SYMBOLS.map((sym) => (
                    <th
                      key={sym}
                      className="text-[8px] font-bold text-muted-foreground px-0.5 py-1 text-center"
                      style={{ minWidth: "32px" }}
                    >
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRACKED_SYMBOLS.map((rowSym) => (
                  <tr key={rowSym}>
                    <td className="sticky left-0 z-10 bg-background text-[8px] font-bold text-muted-foreground pr-1 py-0.5 text-right whitespace-nowrap">
                      {rowSym}
                    </td>
                    {TRACKED_SYMBOLS.map((colSym) => {
                      const r = matrix[rowSym][colSym]
                      const isDiagonal = rowSym === colSym
                      return (
                        <td
                          key={colSym}
                          className="text-center text-[9px] font-mono px-0.5 py-0.5"
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
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-border px-3 py-1 shrink-0 flex items-center justify-center gap-1.5">
        <span className="text-[8px] text-red-400">-1</span>
        <div className="flex gap-0">
          {[-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div
              key={v}
              className="w-3 h-2 first:rounded-l-sm last:rounded-r-sm"
              style={{ backgroundColor: correlationColor(v) }}
            />
          ))}
        </div>
        <span className="text-[8px] text-green-400">+1</span>
      </div>
    </div>
  )
}
