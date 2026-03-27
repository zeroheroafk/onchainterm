"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Wallet } from "lucide-react"
import { useCryptoPrices } from "@/hooks/useCryptoPrices"
import { formatPrice, formatLargeNumber } from "@/lib/constants"

interface PortfolioEntry {
  id: string
  coinId: string
  symbol: string
  amount: number
  buyPrice: number
}

const STORAGE_KEY = "onchainterm_portfolio"

function loadPortfolio(): PortfolioEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function savePortfolio(entries: PortfolioEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) } catch {}
}

export function PortfolioWidget() {
  const { data: marketData } = useCryptoPrices()
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

  let totalValue = 0
  let totalCost = 0
  entries.forEach(e => {
    const cp = getCurrentPrice(e)
    if (cp) totalValue += cp * e.amount
    totalCost += e.buyPrice * e.amount
  })
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  return (
    <div className="flex h-full flex-col">
      {/* Header stats */}
      <div className="border-b border-border px-3 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="size-3" />
            <span className="text-[10px] uppercase tracking-wider">Portfolio Value</span>
          </div>
          <span className="text-sm font-bold text-foreground">{formatLargeNumber(totalValue)}</span>
        </div>
        {entries.length > 0 && (
          <div className={`text-[10px] text-right font-mono ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {totalPnl >= 0 ? "+" : ""}{formatPrice(totalPnl)} ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%)
          </div>
        )}
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
            No holdings yet. Click + to add.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {entries.map((entry) => {
              const cp = getCurrentPrice(entry)
              const pnl = cp ? (cp - entry.buyPrice) * entry.amount : 0
              return (
                <div key={entry.id} className="flex items-center justify-between px-3 py-2 group">
                  <div>
                    <span className="text-xs font-bold">{entry.symbol}</span>
                    <div className="text-[10px] text-muted-foreground">
                      {entry.amount} @ {formatPrice(entry.buyPrice)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-mono">{cp ? formatPrice(cp * entry.amount) : "—"}</div>
                      <div className={`text-[10px] font-mono ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {pnl >= 0 ? "+" : ""}{formatPrice(pnl)}
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
