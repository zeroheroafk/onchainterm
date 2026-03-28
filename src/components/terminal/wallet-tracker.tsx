"use client"

import { useState, useCallback } from "react"
import { Search, ExternalLink, ArrowRight, Loader2, Copy, Check } from "lucide-react"
import { FeedSkeleton } from "@/components/terminal/widget-skeleton"

interface WalletTx {
  hash: string
  from: string
  to: string
  fromLabel: string
  toLabel: string
  value: number
  timestamp: number
  isError: boolean
  method: string
}

interface TokenInfo {
  symbol: string
  name: string
}

interface WalletData {
  address: string
  balanceEth: number
  transactions: WalletTx[]
  recentTokens: TokenInfo[]
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function WalletTracker() {
  const [address, setAddress] = useState("")
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchWallet = useCallback(async (addr: string) => {
    const trimmed = addr.trim()
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError("Invalid Ethereum address")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/wallet?address=${trimmed}`)
      if (!res.ok) throw new Error("Failed to fetch wallet data")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchWallet(address)
  }

  const handleCopy = () => {
    if (data?.address) {
      navigator.clipboard.writeText(data.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Search className="size-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter ETH address (0x...)"
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none font-mono"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : "Lookup"}
        </button>
      </form>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {error && (
          <div className="flex items-center justify-center p-4 text-negative text-xs">{error}</div>
        )}

        {!data && !error && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 p-4">
            <Search className="size-8 opacity-20" />
            <span>Enter an Ethereum address to view balance and transactions</span>
          </div>
        )}

        {loading && !data && (
          <FeedSkeleton rows={5} />
        )}

        {data && (
          <div className="space-y-0">
            {/* Balance section */}
            <div className="px-3 py-3 border-b border-border rounded-lg border border-primary/15 bg-gradient-to-br from-primary/5 to-secondary/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {data.address.slice(0, 8)}...{data.address.slice(-6)}
                  </span>
                  <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors">
                    {copied ? <Check className="size-3 text-positive" /> : <Copy className="size-3" />}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${data.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
              <div className="text-xl font-bold text-foreground">
                {data.balanceEth.toFixed(4)} <span className="text-sm text-muted-foreground">ETH</span>
              </div>
              {data.recentTokens.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {data.recentTokens.map((t) => (
                    <span key={t.symbol} className="rounded bg-secondary/50 px-1.5 py-0.5 text-[9px] text-muted-foreground font-mono">
                      {t.symbol}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions */}
            <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              Recent Transactions
            </div>
            {data.transactions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">No transactions found</div>
            ) : (
              <div className="divide-y divide-border/50">
                {data.transactions.map((tx) => {
                  const isIncoming = tx.to.toLowerCase() === data.address.toLowerCase()
                  return (
                    <div key={tx.hash} className="rounded-lg border border-border/20 bg-secondary/5 hover:bg-secondary/15 transition-colors mb-1 px-2 py-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            tx.isError
                              ? "bg-negative-subtle text-negative"
                              : isIncoming
                              ? "bg-positive-subtle text-positive"
                              : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {tx.isError ? "FAIL" : isIncoming ? "IN" : "OUT"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{tx.method}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] num font-medium text-foreground">
                            {tx.value > 0 ? `${tx.value.toFixed(4)} ETH` : "0 ETH"}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{timeAgo(tx.timestamp)}</span>
                          <a
                            href={`https://etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="size-2.5" />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[9px]">
                        <span className="text-muted-foreground/60 truncate max-w-[100px]">{tx.fromLabel}</span>
                        <ArrowRight className="size-2.5 text-muted-foreground/40 shrink-0" />
                        <span className="text-muted-foreground/60 truncate max-w-[100px]">{tx.toLabel}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
