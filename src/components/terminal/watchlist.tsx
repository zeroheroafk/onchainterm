"use client"

import { useState, useEffect } from "react"
import { Star, Plus, X } from "lucide-react"
import { useCryptoPrices } from "@/hooks/useCryptoPrices"
import { formatPrice, formatPercentage } from "@/lib/constants"

const STORAGE_KEY = "onchainterm_watchlist"

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : ["bitcoin", "ethereum", "solana"]
  } catch { return ["bitcoin", "ethereum", "solana"] }
}

function saveWatchlist(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {}
}

export function WatchlistWidget() {
  const { data: marketData } = useCryptoPrices()
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [addMode, setAddMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => { setWatchlist(loadWatchlist()) }, [])

  const addCoin = (coinId: string) => {
    if (watchlist.includes(coinId)) return
    const updated = [...watchlist, coinId]
    setWatchlist(updated)
    saveWatchlist(updated)
    setAddMode(false)
    setSearchQuery("")
  }

  const removeCoin = (coinId: string) => {
    const updated = watchlist.filter(id => id !== coinId)
    setWatchlist(updated)
    saveWatchlist(updated)
  }

  const watchedCoins = marketData.filter(c => watchlist.includes(c.id))
  const searchResults = searchQuery.trim()
    ? marketData.filter(c =>
        !watchlist.includes(c.id) &&
        (c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 8)
    : []

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Star className="size-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Watchlist</span>
          <span className="text-[9px] text-muted-foreground">{watchedCoins.length} coins</span>
        </div>
        <button
          onClick={() => setAddMode(!addMode)}
          className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
        >
          {addMode ? <X className="size-3" /> : <Plus className="size-3" />}
        </button>
      </div>

      {/* Add search */}
      {addMode && (
        <div className="border-b border-border px-3 py-2 shrink-0">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search coins to add..."
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary/40"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="mt-1 max-h-32 overflow-auto divide-y divide-border/50">
              {searchResults.map(coin => (
                <button
                  key={coin.id}
                  onClick={() => addCoin(coin.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coin.image} alt="" className="size-4 rounded-full" />
                  <span className="text-xs font-bold">{coin.symbol.toUpperCase()}</span>
                  <span className="text-[10px] text-muted-foreground">{coin.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coin list */}
      <div className="flex-1 overflow-auto min-h-0">
        {watchedCoins.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
            Your watchlist is empty. Click + to add coins.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {watchedCoins.map(coin => (
              <div key={coin.id} className="flex items-center justify-between px-3 py-2 group hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coin.image} alt="" className="size-5 rounded-full" />
                  <div>
                    <div className="text-xs font-bold text-foreground">{coin.symbol.toUpperCase()}</div>
                    <div className="text-[9px] text-muted-foreground">{coin.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-mono text-amber-400">{formatPrice(coin.current_price)}</div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className={`text-[10px] font-mono ${(coin.price_change_percentage_1h_in_currency ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatPercentage(coin.price_change_percentage_1h_in_currency)}
                      </span>
                      <span className={`text-[10px] font-mono ${coin.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatPercentage(coin.price_change_percentage_24h)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCoin(coin.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
