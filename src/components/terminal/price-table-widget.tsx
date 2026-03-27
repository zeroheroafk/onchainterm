"use client"

import { useState, useMemo } from "react"
import { useCryptoPrices } from "@/hooks/useCryptoPrices"
import { formatPrice, formatLargeNumber, formatPercentage } from "@/lib/constants"
import type { CoinMarketData } from "@/types/market"

interface PriceTableWidgetProps {
  onSelectSymbol: (symbol: string) => void
}

type SortKey = "rank" | "price" | "1h" | "24h" | "7d" | "mcap" | "vol"
type SortDir = "asc" | "desc"

function PercentCell({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">N/A</span>
  }
  const color = value >= 0 ? "text-green-400" : "text-red-400"
  return <span className={color}>{formatPercentage(value)}</span>
}

function MiniSparkline({ prices, change }: { prices: number[]; change: number }) {
  if (!prices || prices.length < 2) return null

  // Downsample to ~30 points for performance
  const step = Math.max(1, Math.floor(prices.length / 30))
  const sampled = prices.filter((_, i) => i % step === 0)

  const min = Math.min(...sampled)
  const max = Math.max(...sampled)
  const range = max - min || 1
  const w = 60
  const h = 20

  const points = sampled.map((p, i) => {
    const x = (i / (sampled.length - 1)) * w
    const y = h - ((p - min) / range) * h
    return `${x},${y}`
  }).join(" ")

  const color = change >= 0 ? "#16c784" : "#ea3943"

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PriceTableWidget({ onSelectSymbol }: PriceTableWidgetProps) {
  const { data, isLoading, error } = useCryptoPrices()
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir(key === "rank" ? "asc" : "desc")
    }
  }

  const sorted = useMemo(() => {
    if (!data.length) return data
    const arr = [...data]
    const dir = sortDir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      const getValue = (coin: CoinMarketData) => {
        switch (sortKey) {
          case "rank": return coin.market_cap_rank
          case "price": return coin.current_price
          case "1h": return coin.price_change_percentage_1h_in_currency ?? 0
          case "24h": return coin.price_change_percentage_24h
          case "7d": return coin.price_change_percentage_7d_in_currency ?? 0
          case "mcap": return coin.market_cap
          case "vol": return coin.total_volume
        }
      }
      return (getValue(a) - getValue(b)) * dir
    })
    return arr
  }, [data, sortKey, sortDir])

  const handleClick = (coin: CoinMarketData) => {
    setSelectedId(coin.id)
    onSelectSymbol(coin.id)
  }

  const SortHeader = ({ label, sortKeyVal, className = "" }: { label: string; sortKeyVal: SortKey; className?: string }) => (
    <th
      className={`py-1.5 px-2 text-right text-[10px] uppercase tracking-wider cursor-pointer hover:text-primary transition-colors ${
        sortKey === sortKeyVal ? "text-primary" : "text-muted-foreground"
      } ${className}`}
      onClick={() => handleSort(sortKeyVal)}
    >
      {label} {sortKey === sortKeyVal ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
    </th>
  )

  if (isLoading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Loading market data...
      </div>
    )
  }

  if (error && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-xs p-4">
        {error}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card z-[1]">
          <tr className="border-b border-border">
            <SortHeader label="#" sortKeyVal="rank" className="!text-left w-8" />
            <th className="py-1.5 px-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Asset</th>
            <SortHeader label="Price" sortKeyVal="price" />
            <SortHeader label="1H" sortKeyVal="1h" />
            <SortHeader label="24H" sortKeyVal="24h" />
            <SortHeader label="7D" sortKeyVal="7d" className="hidden xl:table-cell" />
            <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground hidden 2xl:table-cell">7D Chart</th>
            <SortHeader label="MCap" sortKeyVal="mcap" className="hidden lg:table-cell" />
            <SortHeader label="Vol 24H" sortKeyVal="vol" className="hidden xl:table-cell" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((coin) => (
            <tr
              key={coin.id}
              onClick={() => handleClick(coin)}
              className={`border-b border-border/50 cursor-pointer transition-colors ${
                selectedId === coin.id
                  ? "bg-primary/10"
                  : "hover:bg-secondary/50"
              }`}
            >
              <td className="py-1.5 px-2 text-muted-foreground">{coin.market_cap_rank}</td>
              <td className="py-1.5 px-2">
                <div className="flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coin.image} alt="" className="size-4 shrink-0 rounded-full" />
                  <span className="font-bold text-foreground">{coin.symbol.toUpperCase()}</span>
                  <span className="text-muted-foreground text-[10px] hidden xl:inline truncate max-w-[80px]">{coin.name}</span>
                </div>
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-amber-400">
                {formatPrice(coin.current_price)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono">
                <PercentCell value={coin.price_change_percentage_1h_in_currency} />
              </td>
              <td className="py-1.5 px-2 text-right font-mono">
                <PercentCell value={coin.price_change_percentage_24h} />
              </td>
              <td className="py-1.5 px-2 text-right font-mono hidden xl:table-cell">
                <PercentCell value={coin.price_change_percentage_7d_in_currency} />
              </td>
              <td className="py-1.5 px-2 text-right hidden 2xl:table-cell">
                <MiniSparkline
                  prices={coin.sparkline_in_7d?.price || []}
                  change={coin.price_change_percentage_7d_in_currency ?? 0}
                />
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-muted-foreground hidden lg:table-cell">
                {formatLargeNumber(coin.market_cap)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-muted-foreground hidden xl:table-cell">
                {formatLargeNumber(coin.total_volume)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
