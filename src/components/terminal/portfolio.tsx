"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Plus, Trash2, Wallet, Download, Search, Loader2, X, PieChart } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"
import { formatPrice, formatLargeNumber } from "@/lib/constants"
import { CardsSkeleton } from "@/components/terminal/widget-skeleton"
import { useToast } from "@/lib/toast-context"

interface PortfolioEntry {
  id: string
  coinId: string
  symbol: string
  name: string
  thumb: string
  amount: number
  buyPrice: number
}

interface CoinPrice {
  usd: number
  usd_24h_change: number | null
}

interface SearchCoin {
  id: string
  name: string
  symbol: string
  thumb: string
  market_cap_rank: number | null
}

const STORAGE_KEY = "onchainterm_portfolio"
const HISTORY_KEY = "onchainterm-portfolio-history"

const PIE_COLORS = [
  "#ff8c00", "#3b82f6", "#2dd4a0", "#f87171", "#a78bfa",
  "#fbbf24", "#ec4899", "#06b6d4", "#84cc16", "#f97316",
  "#8b5cf6", "#14b8a6",
]

function loadPortfolio(): PortfolioEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function savePortfolio(entries: PortfolioEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) } catch {}
}

function PortfolioSparkline({ history }: { history: { t: number; v: number }[] }) {
  if (history.length < 2) return null
  const values = history.map(h => h.v)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 120, h = 24
  const points = values.map((v, i) =>
    `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`
  ).join(" ")
  const isUp = values[values.length - 1] >= values[0]
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20">
      <span className="text-[8px] text-muted-foreground/40 uppercase">Value History</span>
      <svg width={w} height={h} className="flex-1">
        <polyline points={points} fill="none" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth="1.5" />
      </svg>
    </div>
  )
}

function MiniPieChart({ slices }: { slices: { pct: number; color: string; label: string }[] }) {
  if (slices.length === 0) return null
  const size = 80
  const cx = size / 2
  const cy = size / 2
  const r = 32

  const { elements: paths } = slices.reduce<{ elements: React.ReactNode[]; cumulativeAngle: number }>(
    (acc, slice, i) => {
    const startAngle = acc.cumulativeAngle
    const angle = (slice.pct / 100) * 360

    const startRad = (startAngle * Math.PI) / 180
    const endRad = ((startAngle + angle) * Math.PI) / 180

    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    const element = slices.length === 1
      ? <circle key={i} cx={cx} cy={cy} r={r} fill={slice.color} style={{ animation: 'fade-in 0.5s ease-out', animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }} />
      : (
        <path
          key={i}
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={slice.color}
          style={{ animation: 'fade-in 0.5s ease-out', animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
        />
      )

    return { elements: [...acc.elements, element], cumulativeAngle: startAngle + angle }
  }, { elements: [], cumulativeAngle: -90 })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={18} fill="var(--card)" />
    </svg>
  )
}

export function PortfolioWidget({ onSelectSymbol }: { onSelectSymbol?: (id: string) => void }) {
  const { data: marketData, isLoading: pricesLoading } = useMarketData()
  const { toast } = useToast()
  const [entries, setEntries] = useState<PortfolioEntry[]>(() => loadPortfolio())
  const [valueHistory, setValueHistory] = useState<{t: number, v: number}[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed
      }
    } catch {}
    return []
  })
  const lastHistoryTime = useRef<number>((() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.length > 0) return parsed[parsed.length - 1].t as number
      }
    } catch {}
    return 0
  })())
  const [showAdd, setShowAdd] = useState(false)
  const [amount, setAmount] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [extraPrices, setExtraPrices] = useState<Record<string, CoinPrice>>({})

  // Coin search state
  const [coinQuery, setCoinQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchCoin[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCoin, setSelectedCoin] = useState<SearchCoin | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Portfolio entries and history are loaded via useState initializers above

  // Fetch prices for coins not in marketData
  useEffect(() => {
    const marketIds = new Set(marketData.map(c => c.id))
    const missingIds = [...new Set(entries.map(e => e.coinId))].filter(id => !marketIds.has(id))
    if (missingIds.length === 0) return

    let cancelled = false
    async function fetchPrices() {
      try {
        const res = await fetch(`/api/coin-price?ids=${missingIds.join(",")}`)
        if (!res.ok) return
        const { prices } = await res.json()
        if (!cancelled) setExtraPrices(prev => ({ ...prev, ...prices }))
      } catch {}
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [entries, marketData])

  // Debounced coin search
  useEffect(() => {
    if (!coinQuery.trim()) {
      // Show marketData coins when query is empty but add mode is active
      setSearchResults([])
      return
    }

    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/coin-search?q=${encodeURIComponent(coinQuery)}`)
        if (res.ok) {
          const { coins } = await res.json()
          setSearchResults(coins)
        }
      } catch {}
      setSearching(false)
    }, 300)

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [coinQuery])

  const selectCoin = useCallback((coin: SearchCoin) => {
    setSelectedCoin(coin)
    setCoinQuery("")
    setSearchResults([])
  }, [])

  const addEntry = useCallback(() => {
    if (!selectedCoin || !amount || !buyPrice) return
    const entry: PortfolioEntry = {
      id: `${Date.now()}`,
      coinId: selectedCoin.id,
      symbol: selectedCoin.symbol.toUpperCase(),
      name: selectedCoin.name,
      thumb: selectedCoin.thumb || "",
      amount: parseFloat(amount),
      buyPrice: parseFloat(buyPrice),
    }
    const updated = [...entries, entry]
    setEntries(updated)
    savePortfolio(updated)
    setSelectedCoin(null)
    setAmount("")
    setBuyPrice("")
    setShowAdd(false)
    toast("Added to portfolio", "success")
  }, [selectedCoin, amount, buyPrice, entries, toast])

  const removeEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    savePortfolio(updated)
    toast("Removed from portfolio")
  }

  const getCurrentPrice = (entry: PortfolioEntry) => {
    const coin = marketData.find(c => c.id === entry.coinId || c.symbol.toLowerCase() === entry.symbol.toLowerCase())
    if (coin) return coin.current_price
    return extraPrices[entry.coinId]?.usd ?? null
  }

  const exportCsv = useCallback(() => {
    if (entries.length === 0) return
    const rows = [["Symbol", "Amount", "Buy Price", "Current Price", "Value", "P&L", "P&L %"]]
    entries.forEach(e => {
      const cp = getCurrentPrice(e)
      const value = cp ? cp * e.amount : 0
      const cost = e.buyPrice * e.amount
      const pnl = value - cost
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
      rows.push([e.symbol, String(e.amount), String(e.buyPrice), cp ? String(cp) : "N/A", value.toFixed(2), pnl.toFixed(2), `${pnlPct.toFixed(2)}%`])
    })
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `portfolio_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, marketData, extraPrices])

  let totalValue = 0
  let totalCost = 0
  entries.forEach(e => {
    const cp = getCurrentPrice(e)
    if (cp) totalValue += cp * e.amount
    totalCost += e.buyPrice * e.amount
  })
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  // Track portfolio value history (throttled to 1 per minute, max 100 points)
  useEffect(() => {
    if (totalValue <= 0) return
    const now = Date.now()
    if (now - lastHistoryTime.current < 60_000) return
    lastHistoryTime.current = now
    setValueHistory(prev => {
      const next = [...prev, { t: now, v: totalValue }].slice(-100)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [totalValue])

  const pieSlices = useMemo(() => {
    if (entries.length === 0 || totalValue === 0) return []
    const slices: { pct: number; color: string; label: string }[] = []
    entries.forEach((e, i) => {
      const cp = getCurrentPrice(e)
      if (!cp) return
      const value = cp * e.amount
      slices.push({
        pct: (value / totalValue) * 100,
        color: PIE_COLORS[i % PIE_COLORS.length],
        label: e.symbol,
      })
    })
    return slices.sort((a, b) => b.pct - a.pct)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, totalValue, marketData, extraPrices])

  return (
    <div className="flex h-full flex-col">
      {/* Header stats */}
      <div className="border-b border-border px-3 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="size-3" />
            <span className="text-[10px] uppercase tracking-wider">Portfolio Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            {entries.length > 0 && (
              <button
                onClick={exportCsv}
                className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                title="Export CSV"
              >
                <Download className="size-3" />
              </button>
            )}
            <span className="text-sm font-bold text-gradient num">{formatLargeNumber(totalValue)}</span>
          </div>
        </div>
        {entries.length > 0 && (
          <div className={`text-[10px] text-right num ${totalPnl >= 0 ? "text-positive" : "text-negative"}`}>
            {totalPnl >= 0 ? "+" : ""}{formatPrice(totalPnl)} ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%)
          </div>
        )}
      </div>

      {/* Value sparkline */}
      <PortfolioSparkline history={valueHistory} />

      {/* Pie chart */}
      {pieSlices.length > 0 && (
        <div className="border-b border-border px-3 py-2 shrink-0 flex items-center gap-3">
          <MiniPieChart slices={pieSlices} />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {pieSlices.map((slice, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="text-[9px] text-muted-foreground">{slice.label} <span className="num">{slice.pct.toFixed(1)}%</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="border-b border-border px-3 py-2 shrink-0">
        {showAdd ? (
          <div className="animate-slide-down flex flex-col gap-1.5">
            {/* Coin search */}
            {!selectedCoin ? (
              <div className="relative">
                <div className="flex items-center gap-1.5 rounded border border-border bg-background px-2">
                  <Search className="size-3 text-muted-foreground shrink-0" />
                  <input
                    value={coinQuery}
                    onChange={e => setCoinQuery(e.target.value)}
                    placeholder="Search any coin..."
                    className="w-full py-1 text-[10px] bg-transparent outline-none"
                    autoFocus
                  />
                  {searching && <Loader2 className="size-3 text-muted-foreground animate-spin shrink-0" />}
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-0.5 z-10 max-h-32 overflow-auto rounded border border-border bg-card shadow-lg divide-y divide-border/50">
                    {searchResults.map(coin => (
                      <button
                        key={coin.id}
                        onClick={() => selectCoin(coin)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-secondary/50 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {coin.thumb && <img src={coin.thumb} alt="" className="size-4 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                        <span className="text-[10px] font-bold">{coin.symbol?.toUpperCase()}</span>
                        <span className="text-[9px] text-muted-foreground truncate">{coin.name}</span>
                        {coin.market_cap_rank && (
                          <span className="ml-auto text-[8px] text-muted-foreground/60">#{coin.market_cap_rank}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {selectedCoin.thumb && <img src={selectedCoin.thumb} alt="" className="size-3 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                  <span className="text-[10px] font-bold text-primary">{selectedCoin.symbol.toUpperCase()}</span>
                  <button onClick={() => setSelectedCoin(null)} className="text-primary/60 hover:text-primary ml-0.5">
                    <X className="size-2.5" />
                  </button>
                </div>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" type="number" min="0" className="w-16 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40" />
                <input value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="Buy $" type="number" min="0" className="w-16 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40" />
                <button onClick={addEntry} disabled={!amount || !buyPrice} className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">Add</button>
              </div>
            )}
            <button onClick={() => { setShowAdd(false); setSelectedCoin(null); setCoinQuery("") }} className="text-muted-foreground hover:text-foreground text-[10px] text-left">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <Plus className="size-3" /> Add holding
          </button>
        )}
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-auto">
        {pricesLoading && entries.length === 0 ? (
          <div className="p-3">
            <CardsSkeleton count={4} />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <PieChart className="size-8 opacity-20" />
            <span className="text-[10px]">No holdings yet</span>
            <span className="text-[8px]">Add your first holding above</span>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {entries.map((entry, i) => {
              const cp = getCurrentPrice(entry)
              const value = cp ? cp * entry.amount : 0
              const cost = entry.buyPrice * entry.amount
              const pnl = value - cost
              const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-3 py-2 group cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => onSelectSymbol?.(entry.coinId)}
                >
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div>
                      <span className="text-xs font-bold">{entry.symbol}</span>
                      <div className="text-[10px] text-muted-foreground">
                        {entry.amount} @ {formatPrice(entry.buyPrice)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs num">{cp ? formatPrice(value) : "—"}</div>
                      <div className={`text-[10px] num ${pnl >= 0 ? "text-positive" : "text-negative"}`}>
                        {pnl >= 0 ? "+" : ""}{formatPrice(pnl)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeEntry(entry.id) }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
