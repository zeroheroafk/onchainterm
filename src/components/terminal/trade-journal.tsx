"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { BookOpen, Plus, Trash2, Download, TrendingUp, TrendingDown } from "lucide-react"
import { formatPrice } from "@/lib/constants"
import { useToast } from "@/lib/toast-context"

interface Trade {
  id: string
  coin: string
  side: "Long" | "Short"
  entryPrice: number
  exitPrice: number
  amount: number
  tag: "Scalp" | "Swing" | "Position" | "DCA"
  notes: string
  date: string
}

const STORAGE_KEY = "onchainterm_trade_journal"
const TAGS = ["Scalp", "Swing", "Position", "DCA"] as const

function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveTrades(trades: Trade[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trades)) } catch {}
}

function calcPnl(trade: Trade) {
  const diff = trade.side === "Long"
    ? trade.exitPrice - trade.entryPrice
    : trade.entryPrice - trade.exitPrice
  const pnl = diff * trade.amount
  const pnlPct = trade.entryPrice > 0 ? (diff / trade.entryPrice) * 100 : 0
  return { pnl, pnlPct }
}

export function TradeJournal() {
  const { toast } = useToast()
  const [trades, setTrades] = useState<Trade[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const seenTradeIds = useRef<Set<string>>(new Set())

  // Form state
  const [coin, setCoin] = useState("")
  const [side, setSide] = useState<"Long" | "Short">("Long")
  const [entryPrice, setEntryPrice] = useState("")
  const [exitPrice, setExitPrice] = useState("")
  const [amount, setAmount] = useState("")
  const [tag, setTag] = useState<Trade["tag"]>("Scalp")
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16))

  useEffect(() => {
    const loaded = loadTrades()
    loaded.forEach(t => seenTradeIds.current.add(t.id))
    setTrades(loaded)
  }, [])

  const resetForm = useCallback(() => {
    setCoin("")
    setSide("Long")
    setEntryPrice("")
    setExitPrice("")
    setAmount("")
    setTag("Scalp")
    setNotes("")
    setDate(new Date().toISOString().slice(0, 16))
  }, [])

  const addTrade = useCallback(() => {
    if (!coin.trim() || !entryPrice || !exitPrice || !amount) return
    const ep = parseFloat(entryPrice)
    const xp = parseFloat(exitPrice)
    const am = parseFloat(amount)
    if (isNaN(ep) || ep <= 0 || isNaN(xp) || xp <= 0 || isNaN(am) || am <= 0) return
    const trade: Trade = {
      id: `${Date.now()}`,
      coin: coin.trim().toUpperCase(),
      side,
      entryPrice: ep,
      exitPrice: xp,
      amount: am,
      tag,
      notes: notes.trim(),
      date: new Date(date).toISOString(),
    }
    const updated = [trade, ...trades]
    setTrades(updated)
    saveTrades(updated)
    setCoin("")
    setSide("Long")
    setEntryPrice("")
    setExitPrice("")
    setAmount("")
    setTag("Scalp")
    setNotes("")
    setDate(new Date().toISOString().slice(0, 16))
    setShowForm(false)
    toast("Trade logged", "success")
  }, [coin, side, entryPrice, exitPrice, amount, tag, notes, date, trades, toast])

  const removeTrade = useCallback((id: string) => {
    const updated = trades.filter(t => t.id !== id)
    setTrades(updated)
    saveTrades(updated)
    toast("Trade deleted")
  }, [trades, toast])

  const stats = useMemo(() => {
    if (trades.length === 0) return null
    let totalPnl = 0
    let wins = 0
    let best = -Infinity
    let worst = Infinity
    trades.forEach(t => {
      const { pnl } = calcPnl(t)
      totalPnl += pnl
      if (pnl > 0) wins++
      if (pnl > best) best = pnl
      if (pnl < worst) worst = pnl
    })
    return {
      total: trades.length,
      winRate: (wins / trades.length) * 100,
      totalPnl,
      avgPnl: totalPnl / trades.length,
      best: best === -Infinity ? 0 : best,
      worst: worst === Infinity ? 0 : worst,
    }
  }, [trades])

  const exportCsv = useCallback(() => {
    if (trades.length === 0) return
    const rows = [["Date", "Coin", "Side", "Entry", "Exit", "Amount", "P&L ($)", "P&L (%)", "Tag", "Notes"]]
    trades.forEach(t => {
      const { pnl, pnlPct } = calcPnl(t)
      rows.push([
        new Date(t.date).toLocaleDateString(),
        t.coin, t.side,
        String(t.entryPrice), String(t.exitPrice), String(t.amount),
        pnl.toFixed(2), `${pnlPct.toFixed(2)}%`,
        t.tag,
        `"${t.notes.replace(/"/g, '""')}"`,
      ])
    })
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trade_journal_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [trades])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-3 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BookOpen className="size-3" />
            <span className="text-[10px] uppercase tracking-wider">Trade Journal</span>
          </div>
          <div className="flex items-center gap-1.5">
            {trades.length > 0 && (
              <button
                onClick={exportCsv}
                className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                title="Export CSV"
              >
                <Download className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {stats && (
        <div className="border-b border-border px-3 py-2 shrink-0">
          <div className="grid grid-cols-3 gap-x-3 gap-y-1">
            <div className="hover-3d">
              <div className="text-[9px] text-muted-foreground">Trades</div>
              <div className="text-xs font-bold">{stats.total}</div>
            </div>
            <div className="hover-3d">
              <div className="text-[9px] text-muted-foreground">Win Rate</div>
              <div className={`text-xs font-bold num ${stats.winRate >= 50 ? "text-positive" : "text-negative"}`}>
                {stats.winRate.toFixed(1)}%
              </div>
            </div>
            <div className="hover-3d">
              <div className="text-[9px] text-muted-foreground">Total P&L</div>
              <div className={`text-xs font-bold num ${stats.totalPnl >= 0 ? "text-positive" : "text-negative"}`}>
                {formatPrice(stats.totalPnl)}
              </div>
            </div>
            <div className="hover-3d">
              <div className="text-[9px] text-muted-foreground">Avg P&L</div>
              <div className={`text-xs font-bold num ${stats.avgPnl >= 0 ? "text-positive" : "text-negative"}`}>
                {formatPrice(stats.avgPnl)}
              </div>
            </div>
            <div className="hover-3d">
              <div className="text-[9px] text-muted-foreground">Best</div>
              <div className="text-xs font-bold num text-positive">{formatPrice(stats.best)}</div>
            </div>
            <div className="hover-3d">
              <div className="text-[9px] text-muted-foreground">Worst</div>
              <div className="text-xs font-bold num text-negative">{formatPrice(stats.worst)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Trade list */}
      <div className="flex-1 overflow-auto">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <BookOpen className="size-8 opacity-20" />
            <span className="text-[10px]">No trades logged yet</span>
            <span className="text-[8px]">Click + above to log your first trade</span>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {trades.map(trade => {
              const { pnl, pnlPct } = calcPnl(trade)
              const isExpanded = expandedId === trade.id
              const isWin = pnl >= 0
              const isNew = !seenTradeIds.current.has(trade.id)
              if (isNew) seenTradeIds.current.add(trade.id)
              return (
                <div key={trade.id} className={`group${isNew ? " animate-slide-in" : ""}`}>
                  <div
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isWin
                        ? <TrendingUp className="size-3 text-positive shrink-0" />
                        : <TrendingDown className="size-3 text-negative shrink-0" />
                      }
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">{trade.coin}</span>
                          <span className={`text-[9px] font-bold px-1 rounded ${
                            trade.side === "Long" ? "bg-positive-subtle text-positive" : "bg-negative-subtle text-negative"
                          }`}>
                            {trade.side}
                          </span>
                          <span className="text-[8px] px-1 rounded bg-secondary text-muted-foreground">
                            {trade.tag}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatPrice(trade.entryPrice)} → {formatPrice(trade.exitPrice)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className={`text-xs num font-bold ${isWin ? "text-positive" : "text-negative"}`}>
                          {pnl >= 0 ? "+" : ""}{formatPrice(pnl)}
                        </div>
                        <div className={`text-[10px] num ${isWin ? "text-positive" : "text-negative"}`}>
                          {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTrade(trade.id) }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-negative transition-all"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="animate-slide-down px-3 pb-2 text-[10px] text-muted-foreground border-t border-border/30 pt-1.5 mx-2">
                      <div className="flex items-center gap-3 mb-1">
                        <span>Amount: {trade.amount}</span>
                        <span>{new Date(trade.date).toLocaleDateString()} {new Date(trade.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {trade.notes && <div className="italic">{trade.notes}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add trade form */}
      <div className="border-t border-border px-3 py-2 shrink-0">
        {showForm ? (
          <div className="animate-slide-down flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <input
                value={coin}
                onChange={e => setCoin(e.target.value)}
                placeholder="Coin (e.g. BTC)"
                className="w-20 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40"
                autoFocus
              />
              <button
                onClick={() => setSide(side === "Long" ? "Short" : "Long")}
                className={`rounded px-2 py-1 text-[10px] font-bold transition-colors ${
                  side === "Long"
                    ? "bg-positive-subtle text-positive border border-green-400/30"
                    : "bg-negative-subtle text-negative border border-red-400/30"
                }`}
              >
                {side}
              </button>
              <select
                value={tag}
                onChange={e => setTag(e.target.value as Trade["tag"])}
                className="rounded border border-border bg-background px-1 py-1 text-[10px] outline-none focus:border-primary/40"
              >
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={entryPrice}
                onChange={e => setEntryPrice(e.target.value)}
                placeholder="Entry $"
                type="number"
                min="0"
                className="w-20 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40"
              />
              <input
                value={exitPrice}
                onChange={e => setExitPrice(e.target.value)}
                placeholder="Exit $"
                type="number"
                min="0"
                className="w-20 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40"
              />
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Amount"
                type="number"
                min="0"
                className="w-16 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40 flex-1"
              />
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40 resize-none"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={addTrade}
                disabled={!coin.trim() || !entryPrice || !exitPrice || !amount}
                className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                Add Trade
              </button>
              <button
                onClick={() => { resetForm(); setShowForm(false) }}
                className="text-muted-foreground hover:text-foreground text-[10px] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="size-3" /> Add trade
          </button>
        )}
      </div>
    </div>
  )
}
