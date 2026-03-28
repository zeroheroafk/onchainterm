"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Trash2, Wallet, Download } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"
import { formatPrice, formatLargeNumber } from "@/lib/constants"

interface PortfolioEntry {
  id: string
  coinId: string
  symbol: string
  amount: number
  buyPrice: number
}

const STORAGE_KEY = "onchainterm_portfolio"

const PIE_COLORS = [
  "#f7931a", "#627eea", "#00d4aa", "#e84142", "#2775ca",
  "#14f195", "#e6007a", "#ff007a", "#00adef", "#8247e5",
  "#f0b90b", "#26a17b",
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

function MiniPieChart({ slices }: { slices: { pct: number; color: string; label: string }[] }) {
  if (slices.length === 0) return null
  const size = 80
  const cx = size / 2
  const cy = size / 2
  const r = 32

  let cumulativeAngle = -90 // start from top

  const paths = slices.map((slice, i) => {
    const startAngle = cumulativeAngle
    const angle = (slice.pct / 100) * 360
    cumulativeAngle += angle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = ((startAngle + angle) * Math.PI) / 180

    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    if (slices.length === 1) {
      return <circle key={i} cx={cx} cy={cy} r={r} fill={slice.color} />
    }

    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={slice.color}
      />
    )
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={18} fill="var(--card)" />
    </svg>
  )
}

export function PortfolioWidget({ onSelectSymbol }: { onSelectSymbol?: (id: string) => void }) {
  const { data: marketData } = useMarketData()
  const [entries, setEntries] = useState<PortfolioEntry[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [symbol, setSymbol] = useState("")
  const [amount, setAmount] = useState("")
  const [buyPrice, setBuyPrice] = useState("")

  useEffect(() => { setEntries(loadPortfolio()) }, [])

  const addEntry = useCallback(() => {
    if (!symbol.trim() || !amount || !buyPrice) return
    const coin = marketData.find(c => c.symbol.toLowerCase() === symbol.toLowerCase())
    const entry: PortfolioEntry = {
      id: `${Date.now()}`,
      coinId: coin?.id || symbol.toLowerCase(),
      symbol: symbol.toUpperCase(),
      amount: parseFloat(amount),
      buyPrice: parseFloat(buyPrice),
    }
    const updated = [...entries, entry]
    setEntries(updated)
    savePortfolio(updated)
    setSymbol(""); setAmount(""); setBuyPrice("")
    setShowAdd(false)
  }, [symbol, amount, buyPrice, entries, marketData])

  const removeEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    savePortfolio(updated)
  }

  const getCurrentPrice = (entry: PortfolioEntry) => {
    const coin = marketData.find(c => c.id === entry.coinId || c.symbol.toLowerCase() === entry.symbol.toLowerCase())
    return coin?.current_price ?? null
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
  }, [entries, marketData])

  let totalValue = 0
  let totalCost = 0
  entries.forEach(e => {
    const cp = getCurrentPrice(e)
    if (cp) totalValue += cp * e.amount
    totalCost += e.buyPrice * e.amount
  })
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  // Pie chart data
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
  }, [entries, totalValue, marketData])

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
            <span className="text-sm font-bold text-foreground">{formatLargeNumber(totalValue)}</span>
          </div>
        </div>
        {entries.length > 0 && (
          <div className={`text-[10px] text-right font-mono ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {totalPnl >= 0 ? "+" : ""}{formatPrice(totalPnl)} ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%)
          </div>
        )}
      </div>

      {/* Pie chart */}
      {pieSlices.length > 0 && (
        <div className="border-b border-border px-3 py-2 shrink-0 flex items-center gap-3">
          <MiniPieChart slices={pieSlices} />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {pieSlices.map((slice, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="text-[9px] text-muted-foreground">{slice.label} {slice.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries list */}
      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
            No holdings yet. Click + to add.
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
                      <div className="text-xs font-mono">{cp ? formatPrice(value) : "—"}</div>
                      <div className={`text-[10px] font-mono ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {pnl >= 0 ? "+" : ""}{formatPrice(pnl)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                      </div>
                    </div>
                    <button
                      onClick={() => removeEntry(entry.id)}
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

      {/* Add form */}
      <div className="border-t border-border px-3 py-2 shrink-0">
        {showAdd ? (
          <div className="flex items-center gap-1.5">
            <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="BTC" className="w-14 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40" />
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" type="number" className="w-16 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40" />
            <input value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="Buy $" type="number" className="w-16 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40" />
            <button onClick={addEntry} className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary/90">Add</button>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground text-[10px]">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <Plus className="size-3" /> Add holding
          </button>
        )}
      </div>
    </div>
  )
}
