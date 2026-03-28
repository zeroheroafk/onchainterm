"use client"

import { useState, useMemo, useCallback } from "react"
import { Filter, Download, ChevronUp, ChevronDown } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"
import { formatPrice, formatPercentage } from "@/lib/constants"
import type { CoinMarketData } from "@/types/market"

type SortKey = "market_cap_rank" | "name" | "current_price" | "price_change_percentage_24h" | "price_change_percentage_7d_in_currency" | "market_cap" | "total_volume"
type SortDir = "asc" | "desc"

type MarketCapFilter = "all" | ">10B" | "1B-10B" | "100M-1B" | "<100M"
type ChangeFilter = "all" | ">10%" | ">5%" | "0-5%" | "<0%" | "<-5%" | "<-10%"
type VolumeFilter = "all" | ">1B" | ">100M" | ">10M"

const MARKET_CAP_OPTIONS: { value: MarketCapFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: ">10B", label: ">$10B" },
  { value: "1B-10B", label: "$1B-$10B" },
  { value: "100M-1B", label: "$100M-$1B" },
  { value: "<100M", label: "<$100M" },
]

const CHANGE_OPTIONS: { value: ChangeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: ">10%", label: ">10%" },
  { value: ">5%", label: ">5%" },
  { value: "0-5%", label: "0% to 5%" },
  { value: "<0%", label: "<0%" },
  { value: "<-5%", label: "<-5%" },
  { value: "<-10%", label: "<-10%" },
]

const VOLUME_OPTIONS: { value: VolumeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: ">1B", label: ">$1B" },
  { value: ">100M", label: ">$100M" },
  { value: ">10M", label: ">$10M" },
]

function matchMarketCap(coin: CoinMarketData, filter: MarketCapFilter): boolean {
  const mc = coin.market_cap
  switch (filter) {
    case "all": return true
    case ">10B": return mc > 10_000_000_000
    case "1B-10B": return mc >= 1_000_000_000 && mc <= 10_000_000_000
    case "100M-1B": return mc >= 100_000_000 && mc < 1_000_000_000
    case "<100M": return mc < 100_000_000
    default: return false
  }
}

function matchChange(coin: CoinMarketData, filter: ChangeFilter): boolean {
  const pct = coin.price_change_percentage_24h
  switch (filter) {
    case "all": return true
    case ">10%": return pct > 10
    case ">5%": return pct > 5
    case "0-5%": return pct >= 0 && pct <= 5
    case "<0%": return pct < 0
    case "<-5%": return pct < -5
    case "<-10%": return pct < -10
    default: return false
  }
}

function matchVolume(coin: CoinMarketData, filter: VolumeFilter): boolean {
  const vol = coin.total_volume
  switch (filter) {
    case "all": return true
    case ">1B": return vol > 1_000_000_000
    case ">100M": return vol > 100_000_000
    case ">10M": return vol > 10_000_000
    default: return false
  }
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function getSortValue(coin: CoinMarketData, key: SortKey): number | string {
  switch (key) {
    case "name": return coin.name.toLowerCase()
    case "market_cap_rank": return coin.market_cap_rank
    case "current_price": return coin.current_price
    case "price_change_percentage_24h": return coin.price_change_percentage_24h ?? 0
    case "price_change_percentage_7d_in_currency": return coin.price_change_percentage_7d_in_currency ?? 0
    case "market_cap": return coin.market_cap
    case "total_volume": return coin.total_volume
  }
}

export function TokenScreenerWidget({ onSelectSymbol }: { onSelectSymbol?: (id: string) => void }) {
  const { data: marketData } = useMarketData()

  const [mcFilter, setMcFilter] = useState<MarketCapFilter>("all")
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>("all")
  const [volFilter, setVolFilter] = useState<VolumeFilter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("market_cap_rank")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === "asc" ? "desc" : "asc")
        return key
      }
      setSortDir(key === "name" ? "asc" : "asc")
      return key
    })
  }, [])

  const filtered = useMemo(() => {
    let coins = marketData.filter(c =>
      matchMarketCap(c, mcFilter) &&
      matchChange(c, changeFilter) &&
      matchVolume(c, volFilter)
    )

    coins.sort((a, b) => {
      const aVal = getSortValue(a, sortKey)
      const bVal = getSortValue(b, sortKey)
      const cmp = typeof aVal === "string" && typeof bVal === "string"
        ? aVal.localeCompare(bVal)
        : (aVal as number) - (bVal as number)
      return sortDir === "asc" ? cmp : -cmp
    })

    return coins
  }, [marketData, mcFilter, changeFilter, volFilter, sortKey, sortDir])

  const exportCSV = useCallback(() => {
    const header = "Rank,Name,Symbol,Price,24h%,7d%,Market Cap,Volume"
    const rows = filtered.map(c =>
      [
        c.market_cap_rank,
        `"${c.name}"`,
        c.symbol.toUpperCase(),
        c.current_price,
        (c.price_change_percentage_24h ?? 0).toFixed(2),
        (c.price_change_percentage_7d_in_currency ?? 0).toFixed(2),
        c.market_cap,
        c.total_volume,
      ].join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "token-screener.csv"
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered])

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null
    return sortDir === "asc"
      ? <ChevronUp className="size-3 inline-block ml-0.5" />
      : <ChevronDown className="size-3 inline-block ml-0.5" />
  }

  const selectClass = "rounded border border-border/40 bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40 text-foreground"

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Token Screener</span>
          <span className="text-[9px] text-muted-foreground">{filtered.length} matches</span>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          title="Export CSV"
        >
          <Download className="size-3" />
          <span>CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/40 shrink-0">
        <label className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground uppercase">MCap</span>
          <select value={mcFilter} onChange={e => setMcFilter(e.target.value as MarketCapFilter)} className={selectClass}>
            {MARKET_CAP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground uppercase">24h</span>
          <select value={changeFilter} onChange={e => setChangeFilter(e.target.value as ChangeFilter)} className={selectClass}>
            {CHANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground uppercase">Vol</span>
          <select value={volFilter} onChange={e => setVolFilter(e.target.value as VolumeFilter)} className={selectClass}>
            {VOLUME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort("market_cap_rank")}>
                #<SortIcon column="market_cap_rank" />
              </th>
              <th className="px-2 py-1.5 text-left font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort("name")}>
                Name<SortIcon column="name" />
              </th>
              <th className="px-2 py-1.5 text-right font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort("current_price")}>
                Price<SortIcon column="current_price" />
              </th>
              <th className="px-2 py-1.5 text-right font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort("price_change_percentage_24h")}>
                24h%<SortIcon column="price_change_percentage_24h" />
              </th>
              <th className="px-2 py-1.5 text-right font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort("price_change_percentage_7d_in_currency")}>
                7d%<SortIcon column="price_change_percentage_7d_in_currency" />
              </th>
              <th className="px-2 py-1.5 text-right font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort("market_cap")}>
                MCap<SortIcon column="market_cap" />
              </th>
              <th className="px-2 py-1.5 text-right font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort("total_volume")}>
                Volume<SortIcon column="total_volume" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No tokens match current filters.
                </td>
              </tr>
            ) : (
              filtered.map(coin => {
                const pct24 = coin.price_change_percentage_24h ?? 0
                const pct7d = coin.price_change_percentage_7d_in_currency ?? 0
                return (
                  <tr
                    key={coin.id}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => onSelectSymbol?.(coin.id)}
                  >
                    <td className="px-2 py-1.5 text-muted-foreground">{coin.market_cap_rank}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coin.image} alt="" className="size-4 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <span className="font-bold text-foreground">{coin.symbol.toUpperCase()}</span>
                        <span className="text-muted-foreground hidden sm:inline">{coin.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right num text-foreground">{formatPrice(coin.current_price)}</td>
                    <td className={`px-2 py-1.5 text-right num ${pct24 >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatPercentage(coin.price_change_percentage_24h)}
                    </td>
                    <td className={`px-2 py-1.5 text-right num ${pct7d >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatPercentage(coin.price_change_percentage_7d_in_currency)}
                    </td>
                    <td className="px-2 py-1.5 text-right num text-foreground">{formatCompact(coin.market_cap)}</td>
                    <td className="px-2 py-1.5 text-right num text-foreground">{formatCompact(coin.total_volume)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
