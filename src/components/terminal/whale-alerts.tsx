"use client"

import { useState, useEffect, useCallback } from "react"
import { Activity, RefreshCw, ExternalLink, ArrowRight } from "lucide-react"

interface WhaleTx {
  hash: string
  from: string
  to: string
  value: number
  timestamp: number
  fromLabel: string
  toLabel: string
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatEth(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(1)}K`
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`
  return value.toFixed(2)
}

function getValueColor(value: number): string {
  if (value >= 10000) return "text-red-400"
  if (value >= 1000) return "text-amber-400"
  return "text-green-400"
}

export function WhaleAlerts() {
  const [transactions, setTransactions] = useState<WhaleTx[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchWhales = useCallback(async () => {
    try {
      const res = await fetch("/api/whales")
      if (!res.ok) throw new Error("Failed to fetch whale data")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTransactions(data.transactions)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWhales()
    const interval = setInterval(fetchWhales, 60_000) // refresh every 60s
    return () => clearInterval(interval)
  }, [fetchWhales])

  if (loading && transactions.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Loading whale alerts...</div>
  }

  if (error && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
        <span className="text-red-400">{error}</span>
        <button onClick={fetchWhales} className="text-primary hover:underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="size-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Whale Alerts · Live</span>
          <span className="text-[9px] text-muted-foreground/60">≥100 ETH</span>
        </div>
        <button
          onClick={fetchWhales}
          className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          title="Refresh"
        >
          <RefreshCw className="size-3" />
        </button>
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-auto min-h-0">
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            No large transactions found recently
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.map((tx) => (
              <div key={tx.hash} className="px-3 py-2 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-sm font-bold font-mono ${getValueColor(tx.value)}`}>
                      {formatEth(tx.value)} ETH
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] text-muted-foreground">{timeAgo(tx.timestamp)}</span>
                    <a
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-muted-foreground truncate max-w-[100px]" title={tx.from}>
                    {tx.fromLabel}
                  </span>
                  <ArrowRight className="size-3 text-muted-foreground/50 shrink-0" />
                  <span className="text-muted-foreground truncate max-w-[100px]" title={tx.to}>
                    {tx.toLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-1 shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground">
          Etherscan · Monitoring {13} exchange wallets · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  )
}
