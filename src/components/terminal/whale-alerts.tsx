"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Activity, RefreshCw, ExternalLink, ArrowRight, Volume2, VolumeX } from "lucide-react"

const WHALE_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgipGJdWBYX3uRmpWAfXd8jZiXj4B3dn6OmZmUhXx5gI6YlpKEe3l/jZeVkoR7eX+Nl5WShHt5f42XlZKEe3l/jZeVkoR7eYA="

interface WhaleTx {
  hash: string
  from: string
  to: string
  value: number
  timestamp: number
  fromLabel: string
  toLabel: string
  block: number
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatEth(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(1)}K`
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`
  return value.toFixed(1)
}

function getValueColor(value: number): string {
  if (value >= 10000) return "text-red-400"
  if (value >= 1000) return "text-amber-400"
  if (value >= 500) return "text-yellow-400"
  return "text-green-400"
}

function isKnownLabel(label: string): boolean {
  return !label.includes("...")
}

export function WhaleAlerts() {
  const [transactions, setTransactions] = useState<WhaleTx[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [latestBlock, setLatestBlock] = useState<number | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seenHashesRef = useRef<Set<string>>(new Set())

  const playSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      if (!audioRef.current) audioRef.current = new Audio(WHALE_SOUND_URL)
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [soundEnabled])

  const fetchWhales = useCallback(async () => {
    try {
      const res = await fetch("/api/whales")
      if (!res.ok) throw new Error("Failed to fetch whale data")
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Check for new transactions (sound alert)
      if (seenHashesRef.current.size > 0) {
        const hasNew = data.transactions.some((tx: WhaleTx) => !seenHashesRef.current.has(tx.hash))
        if (hasNew) playSound()
      }
      data.transactions.forEach((tx: WhaleTx) => seenHashesRef.current.add(tx.hash))

      setTransactions(data.transactions)
      setLatestBlock(data.latestBlock)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [playSound])

  useEffect(() => {
    fetchWhales()
    const interval = setInterval(fetchWhales, 30_000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchWhales])

  if (loading && transactions.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Scanning recent blocks...</div>
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
        <div className="flex items-center gap-2">
          <Activity className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ETH Whale Alerts</span>
          <span className="text-[9px] text-green-400 font-medium">● LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          {latestBlock && (
            <span className="text-[9px] text-muted-foreground/60 font-mono">#{latestBlock.toLocaleString()}</span>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
          >
            {soundEnabled ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />}
          </button>
          <button
            onClick={fetchWhales}
            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>

      {/* Threshold info */}
      <div className="px-3 py-1 border-b border-border/50 bg-secondary/10 text-[9px] text-muted-foreground/60 shrink-0">
        Scanning last 5 blocks · Showing transfers ≥ 50 ETH · Sorted by value
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-auto min-h-0">
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            No large transfers in recent blocks
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.map((tx) => (
              <div key={tx.hash} className="px-3 py-2 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
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
                  <span
                    className={`truncate max-w-[120px] ${isKnownLabel(tx.fromLabel) ? "text-primary/80 font-medium" : "text-muted-foreground"}`}
                    title={tx.from}
                  >
                    {tx.fromLabel}
                  </span>
                  <ArrowRight className="size-3 text-muted-foreground/50 shrink-0" />
                  <span
                    className={`truncate max-w-[120px] ${isKnownLabel(tx.toLabel) ? "text-primary/80 font-medium" : "text-muted-foreground"}`}
                    title={tx.to}
                  >
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
          Etherscan · {transactions.length} whale txs found · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  )
}
