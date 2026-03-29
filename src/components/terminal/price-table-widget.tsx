"use client"

import { useState, useMemo, useRef, useEffect, useCallback, useId } from "react"
import { Download } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"
import { formatPrice, formatLargeNumber, formatPercentage } from "@/lib/constants"
import { TableSkeleton } from "@/components/terminal/widget-skeleton"
import { useCoinContextMenu } from "@/components/terminal/coin-context-menu"
import { CoinTooltip } from "@/components/terminal/coin-tooltip"
import { useLastUpdated } from "@/hooks/useLastUpdated"
import { useToast } from "@/lib/toast-context"
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
  const color = value >= 0 ? "text-positive" : "text-negative"
  return <span className={`${color} num`}>{formatPercentage(value)}</span>
}

function MiniSparkline({ prices, change }: { prices: number[]; change: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; price: number } | null>(null)
  const sparkId = useId()

  if (!prices || prices.length < 2) return <span className="text-muted-foreground text-[10px]">—</span>

  const step = Math.max(1, Math.floor(prices.length / 30))
  const sampled = prices.filter((_, i) => i % step === 0)

  const min = Math.min(...sampled)
  const max = Math.max(...sampled)
  const range = max - min || 1
  const w = 60
  const h = 20

  const points = sampled.map((p, i) => {
    const x = (i / (sampled.length - 1)) * w
    const y = h - ((p - min) / range) * (h - 2) - 1
    return { x, y, price: p }
  })

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(" ")
  const areaPoints = `0,${h} ${polyPoints} ${w},${h}`
  const color = change >= 0 ? "#2dd4a0" : "#f87171"
  const gradId = `sparkGrad${change >= 0 ? "Up" : "Down"}${sparkId.replace(/:/g, "")}`

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    // Find closest point
    let closest = points[0]
    let minDist = Infinity
    for (const p of points) {
      const dist = Math.abs(p.x - mouseX)
      if (dist < minDist) { minDist = dist; closest = p }
    }
    setHover(closest)
  }

  return (
    <svg
      width={w}
      height={h}
      className="shrink-0 cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={polyPoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {hover && (
        <>
          <line x1={hover.x} y1={0} x2={hover.x} y2={h} stroke={color} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
          <circle cx={hover.x} cy={hover.y} r="2" fill={color} stroke="var(--card)" strokeWidth="1" />
          <rect x={Math.min(hover.x - 18, w - 36)} y={hover.y < 10 ? hover.y + 4 : hover.y - 14} width="36" height="12" rx="2" fill="var(--card)" stroke={color} strokeWidth="0.5" opacity="0.9" />
          <text x={Math.min(hover.x - 18, w - 36) + 18} y={hover.y < 10 ? hover.y + 13 : hover.y - 5} textAnchor="middle" fill={color} fontSize="7" fontFamily="var(--font-mono)">
            ${hover.price < 1 ? hover.price.toFixed(4) : hover.price < 100 ? hover.price.toFixed(2) : hover.price.toFixed(0)}
          </text>
        </>
      )}
    </svg>
  )
}

export function PriceTableWidget({ onSelectSymbol }: PriceTableWidgetProps) {
  const { data, isLoading, error } = useMarketData()
  const { showMenu } = useCoinContextMenu()
  const { toast } = useToast()
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down">>({})
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({})
  const [pendingFlashes, setPendingFlashes] = useState<Record<string, "up" | "down">>({})
  const tableRef = useRef<HTMLDivElement>(null)
  const { markUpdated, formatLastUpdated } = useLastUpdated()

  // Mark updated when data changes
  useEffect(() => {
    if (data.length > 0) markUpdated()
  }, [data, markUpdated])

  // Detect price changes during render and trigger flash animations
  if (data.length > 0) {
    const newFlashes: Record<string, "up" | "down"> = {}
    const updatedPrices: Record<string, number> = { ...prevPrices }
    let pricesChanged = false
    for (const coin of data) {
      const prev = prevPrices[coin.id]
      if (prev !== undefined && coin.current_price !== prev) {
        newFlashes[coin.id] = coin.current_price > prev ? "up" : "down"
      }
      if (updatedPrices[coin.id] !== coin.current_price) {
        updatedPrices[coin.id] = coin.current_price
        pricesChanged = true
      }
    }
    if (pricesChanged) {
      setPrevPrices(updatedPrices)
    }
    if (Object.keys(newFlashes).length > 0) {
      setPendingFlashes(newFlashes)
      setFlashMap(f => ({ ...f, ...newFlashes }))
    }
  }

  // Clear flashes after animation duration
  useEffect(() => {
    if (Object.keys(pendingFlashes).length === 0) return
    const flashes = pendingFlashes
    const timeout = setTimeout(() => {
      setFlashMap(f => {
        const next = { ...f }
        for (const id of Object.keys(flashes)) delete next[id]
        return next
      })
    }, 600)
    return () => clearTimeout(timeout)
  }, [pendingFlashes])

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, sorted.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case "Enter":
        if (selectedIndex >= 0 && selectedIndex < sorted.length) {
          const coin = sorted[selectedIndex]
          setSelectedId(coin.id)
          onSelectSymbol(coin.id)
        }
        break
      case "Escape":
        setSelectedIndex(-1)
        break
    }
  }, [sorted, selectedIndex, onSelectSymbol])

  useEffect(() => {
    if (selectedIndex >= 0) {
      const row = tableRef.current?.querySelector(`[data-row-index="${selectedIndex}"]`)
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedIndex])

  const renderSortHeader = (label: string, sortKeyVal: SortKey, className = "") => (
    <th
      key={sortKeyVal}
      className={`py-1 px-1.5 text-right text-[9px] uppercase tracking-wider cursor-pointer hover:text-primary transition-colors font-medium ${
        sortKey === sortKeyVal ? "text-primary" : "text-muted-foreground/70"
      } ${className}`}
      onClick={() => handleSort(sortKeyVal)}
    >
      {label} {sortKey === sortKeyVal ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
    </th>
  )

  const exportCSV = useCallback(() => {
    const header = "Rank,Symbol,Name,Price,24h Change,Market Cap,Volume"
    const rows = sorted.map((coin, i) =>
      `${i + 1},${coin.symbol.toUpperCase()},${coin.name},${coin.current_price},${coin.price_change_percentage_24h?.toFixed(2)}%,${coin.market_cap},${coin.total_volume}`
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `market-data-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast("Exported to CSV", "success")
  }, [sorted, toast])

  if (isLoading && data.length === 0) {
    return (
      <div className="p-2">
        <TableSkeleton rows={8} />
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
    <div ref={tableRef} tabIndex={0} onKeyDown={handleKeyDown} className="h-full overflow-auto focus:outline-none">
      {formatLastUpdated() && (
        <div className="flex items-center justify-end gap-2 px-1.5 pt-0.5">
          <span className="text-[8px] text-muted-foreground/40">Updated {formatLastUpdated()}</span>
          {sorted.length > 0 && (
            <button onClick={exportCSV} className="text-muted-foreground hover:text-primary transition-colors" title="Export CSV">
              <Download className="size-3" />
            </button>
          )}
        </div>
      )}
      <table className="w-full text-xs sticky-col-first">
        <thead className="sticky top-0 z-[1]">
          <tr className="border-b border-border/50">
            {renderSortHeader("#", "rank", "!text-left w-8")}
            <th className="py-1 px-1.5 text-left text-[9px] uppercase tracking-wider text-muted-foreground/70 font-medium">Asset</th>
            {renderSortHeader("Price", "price")}
            {renderSortHeader("1H", "1h")}
            {renderSortHeader("24H", "24h")}
            {renderSortHeader("7D", "7d", "hidden xl:table-cell")}
            <th className="py-1 px-1.5 text-right text-[9px] uppercase tracking-wider text-muted-foreground/70 font-medium hidden 2xl:table-cell">7D Chart</th>
            {renderSortHeader("MCap", "mcap", "hidden lg:table-cell")}
            {renderSortHeader("Vol 24H", "vol", "hidden xl:table-cell")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((coin, i) => (
            <tr
              key={coin.id}
              data-row-index={i}
              onClick={() => { setSelectedIndex(i); handleClick(coin) }}
              onContextMenu={(e) => showMenu(e, coin.id, coin.symbol)}
              className={`border-b border-border/20 cursor-pointer transition-colors duration-100 ${
                selectedIndex === i
                  ? "bg-primary/15 ring-1 ring-primary/30"
                  : selectedId === coin.id
                    ? "bg-primary/10"
                    : "hover:bg-secondary/40"
              } ${flashMap[coin.id] === "up" ? "flash-up" : flashMap[coin.id] === "down" ? "flash-down" : ""}`}
            >
              <td className="py-1 px-1.5 text-muted-foreground/60 num text-[10px]">
                <span className="inline-flex items-center gap-1">
                  {selectedIndex === i && <span className="text-primary font-bold">&gt;</span>}
                  {coin.market_cap_rank}
                </span>
              </td>
              <td className="py-1 px-1.5">
                <CoinTooltip coinId={coin.id}>
                  <div className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coin.image} alt="" className="size-4 shrink-0 coin-avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <span className="font-semibold text-foreground/95">{coin.symbol.toUpperCase()}</span>
                    <span className="text-muted-foreground/50 text-[10px] hidden xl:inline truncate max-w-[80px]">{coin.name}</span>
                  </div>
                </CoinTooltip>
              </td>
              <td className="py-1 px-1.5 text-right num text-foreground">
                {formatPrice(coin.current_price)}
              </td>
              <td className="py-1 px-1.5 text-right">
                <PercentCell value={coin.price_change_percentage_1h_in_currency} />
              </td>
              <td className="py-1 px-1.5 text-right">
                <PercentCell value={coin.price_change_percentage_24h} />
              </td>
              <td className="py-1 px-1.5 text-right hidden xl:table-cell">
                <PercentCell value={coin.price_change_percentage_7d_in_currency} />
              </td>
              <td className="py-1 px-1.5 text-right hidden 2xl:table-cell">
                <MiniSparkline
                  prices={coin.sparkline_in_7d?.price || []}
                  change={coin.price_change_percentage_7d_in_currency ?? 0}
                />
              </td>
              <td className="py-1 px-1.5 text-right num text-muted-foreground hidden lg:table-cell">
                {formatLargeNumber(coin.market_cap)}
              </td>
              <td className="py-1 px-1.5 text-right num text-muted-foreground hidden xl:table-cell">
                {formatLargeNumber(coin.total_volume)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
