"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Activity, RefreshCw, ExternalLink, ArrowRight, Volume2, VolumeX } from "lucide-react"
import { FeedSkeleton } from "@/components/terminal/widget-skeleton"
import { useLastUpdated } from "@/hooks/useLastUpdated"
import { useSound } from "@/lib/sound-context"
import { useNotifications } from "@/lib/notification-context"

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
  if (value >= 10000) return "text-negative"
  if (value >= 1000) return "text-amber-400"
  if (value >= 500) return "text-yellow-300"
  return "text-positive"
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
  const animatedTxRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef(true)
  const { playSound: playSoundGlobal } = useSound()
  const { addNotification } = useNotifications()
  const { markUpdated: markHookUpdated, formatLastUpdated } = useLastUpdated()

  const playSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      if (!audioRef.current) audioRef.current = new Audio(WHALE_SOUND_URL)
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [soundEnabled])

  const fetchWhales = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/whales", { signal })
      if (!res.ok) throw new Error("Failed to fetch whale data")
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // If aborted after fetch completed, don't update state
      if (signal?.aborted) return

      // Check for new transactions (sound alert)
      if (seenHashesRef.current.size > 0) {
        const newTxs = data.transactions.filter((tx: WhaleTx) => !seenHashesRef.current.has(tx.hash))
        if (newTxs.length > 0) {
          playSound()
          playSoundGlobal("whale")
          newTxs.forEach((tx: WhaleTx) => {
            addNotification("whale", "Whale Alert", `${formatEth(tx.value)} ETH transfer detected`)
          })
        }
      }
      data.transactions.forEach((tx: WhaleTx) => seenHashesRef.current.add(tx.hash))

      // On initial load, mark all items as already animated
      if (isInitialLoadRef.current) {
        data.transactions.forEach((tx: WhaleTx) => animatedTxRef.current.add(tx.hash))
        isInitialLoadRef.current = false
      }

      setTransactions(data.transactions)
      setLatestBlock(data.latestBlock)
      setLastUpdated(new Date())
      markHookUpdated()
      setError(null)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [playSound, playSoundGlobal, addNotification, markHookUpdated])

  useEffect(() => {
    const controller = new AbortController()
    fetchWhales(controller.signal)
    const interval = setInterval(() => fetchWhales(controller.signal), 30_000) // refresh every 30s
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [fetchWhales])

  if (loading && transactions.length === 0) {
    return <FeedSkeleton rows={5} />
  }

  if (error && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div className="text-muted-foreground/20">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-foreground/70 font-medium mb-1">Unable to fetch whale data</p>
          <p className="text-[9px] text-muted-foreground/50 max-w-[180px]">Etherscan API may be temporarily unavailable</p>
        </div>
        <button onClick={fetchWhales} className="text-[10px] text-primary/70 hover:text-primary transition-colors uppercase tracking-wider font-medium">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">ETH Whale Alerts</span>
          <span className="text-[9px] text-positive font-medium">● LIVE</span>
          {formatLastUpdated() && <span className="text-[8px] text-muted-foreground">{formatLastUpdated()}</span>}
        </div>
        <div className="flex items-center gap-2">
          {latestBlock && (
            <span className="text-[9px] text-muted-foreground/60 num">#{latestBlock.toLocaleString()}</span>
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
      <div className="px-3 py-1 border-b border-border/20 bg-secondary/10 text-[9px] text-muted-foreground/60 shrink-0">
        Scanning last 15 blocks · Showing transfers ≥ 50 ETH · Sorted by value
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-auto min-h-0">
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            No large transfers in recent blocks
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {transactions.map((tx) => {
              const isNew = !animatedTxRef.current.has(tx.hash)
              return (
              <div key={tx.hash} className={`px-3 py-2 hover:bg-secondary/30 transition-colors ${isNew ? "animate-slide-in animate-item-glow" : ""}`} onAnimationEnd={() => animatedTxRef.current.add(tx.hash)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm text-primary font-bold num ${getValueColor(tx.value)}`}>
                      {formatEth(tx.value)} ETH
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] text-muted-foreground/40">{timeAgo(tx.timestamp)}</span>
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
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-1 shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground/40">
          Etherscan · {transactions.length} whale txs found · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  )
}
