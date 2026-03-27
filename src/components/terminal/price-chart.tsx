"use client"

import { useState, useEffect, useCallback } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const TIMEFRAMES = [
  { label: "24H", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
] as const

interface ChartDataPoint {
  time: number
  price: number
}

interface PriceChartProps {
  symbol: string
}

export function PriceChart({ symbol }: PriceChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<number>(7)

  const fetchChart = useCallback(async () => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=${timeframe}`
      )
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const json = await res.json()
      const points: ChartDataPoint[] = (json.prices as [number, number][]).map(([t, p]) => ({
        time: t,
        price: p,
      }))
      setData(points)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart")
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  useEffect(() => {
    fetchChart()
  }, [fetchChart])

  const formatTime = (time: number) => {
    const d = new Date(time)
    if (timeframe <= 1) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (timeframe <= 30) return d.toLocaleDateString([], { month: "short", day: "numeric" })
    return d.toLocaleDateString([], { month: "short", year: "2-digit" })
  }

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return `$${price.toFixed(6)}`
  }

  return (
    <div className="flex h-full flex-col">
      {/* Timeframe selector */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
        <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">
          {symbol.toUpperCase()}
        </span>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.days}
            onClick={() => setTimeframe(tf.days)}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              timeframe === tf.days
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Loading chart...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400 text-xs">
            {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={formatPrice}
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={70}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "var(--foreground)",
                }}
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value) => [formatPrice(Number(value)), "Price"]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="var(--primary)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "var(--primary)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
