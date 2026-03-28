"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Star, Plus, X, Search, Loader2, Share2, Check, Download } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"
import { formatPrice, formatPercentage } from "@/lib/constants"

const STORAGE_KEY = "onchainterm_watchlist"
const WATCHLIST_META_KEY = "onchainterm_watchlist_meta"

interface WatchlistCoinMeta {
  id: string
  symbol: string
  name: string
  thumb: string
  market_cap_rank?: number | null
}

interface CoinPrice {
  usd: number
  usd_24h_change: number | null
}

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : ["bitcoin", "ethereum", "solana"]
  } catch { return ["bitcoin", "ethereum", "solana"] }
}

function saveWatchlist(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {}
}

function loadMeta(): Record<string, WatchlistCoinMeta> {
  try {
    const raw = localStorage.getItem(WATCHLIST_META_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveMeta(meta: Record<string, WatchlistCoinMeta>) {
  try { localStorage.setItem(WATCHLIST_META_KEY, JSON.stringify(meta)) } catch {}
}

export function WatchlistWidget({ onSelectSymbol }: { onSelectSymbol?: (id: string) => void }) {
  const { data: marketData } = useMarketData()
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [meta, setMeta] = useState<Record<string, WatchlistCoinMeta>>({})
  const [addMode, setAddMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<WatchlistCoinMeta[]>([])
  const [searching, setSearching] = useState(false)
  const [extraPrices, setExtraPrices] = useState<Record<string, CoinPrice>>({})
  const [copied, setCopied] = useState(false)
  const [importBanner, setImportBanner] = useState<{ ids: string[] } | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setWatchlist(loadWatchlist())
    setMeta(loadMeta())
  }, [])

  // Check URL for shared watchlist on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const encoded = params.get("watchlist")
      if (encoded) {
        const decoded = JSON.parse(atob(encoded)) as string[]
        if (Array.isArray(decoded) && decoded.length > 0 && decoded.every(id => typeof id === "string")) {
          setImportBanner({ ids: decoded })
        }
      }
    } catch {}
  }, [])

  // Fetch prices for coins not in marketData
  useEffect(() => {
    const marketIds = new Set(marketData.map(c => c.id))
    const missingIds = watchlist.filter(id => !marketIds.has(id))
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
  }, [watchlist, marketData])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/coin-search?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const { coins } = await res.json()
          setSearchResults(coins.filter((c: WatchlistCoinMeta) => !watchlist.includes(c.id)))
        }
      } catch {}
      setSearching(false)
    }, 300)

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery, watchlist])

  const addCoin = useCallback((coin: WatchlistCoinMeta) => {
    if (watchlist.includes(coin.id)) return
    const updated = [...watchlist, coin.id]
    setWatchlist(updated)
    saveWatchlist(updated)

    const updatedMeta = { ...meta, [coin.id]: coin }
    setMeta(updatedMeta)
    saveMeta(updatedMeta)

    setSearchQuery("")
    setSearchResults([])
  }, [watchlist, meta])

  const removeCoin = useCallback((coinId: string) => {
    const updated = watchlist.filter(id => id !== coinId)
    setWatchlist(updated)
    saveWatchlist(updated)
  }, [watchlist])

  const shareWatchlist = useCallback(() => {
    const encoded = btoa(JSON.stringify(watchlist))
    const url = `${window.location.origin}?watchlist=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [watchlist])

  const importSharedWatchlist = useCallback(() => {
    if (!importBanner) return
    const currentSet = new Set(watchlist)
    const newIds = importBanner.ids.filter(id => !currentSet.has(id))
    if (newIds.length > 0) {
      const updated = [...watchlist, ...newIds]
      setWatchlist(updated)
      saveWatchlist(updated)
    }
    setImportBanner(null)
    const params = new URLSearchParams(window.location.search)
    params.delete("watchlist")
    const newSearch = params.toString()
    window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""))
  }, [watchlist, importBanner])

  const dismissSharedWatchlist = useCallback(() => {
    setImportBanner(null)
    const params = new URLSearchParams(window.location.search)
    params.delete("watchlist")
    const newSearch = params.toString()
    window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""))
  }, [])

  const getCoinDisplay = (coinId: string) => {
    const marketCoin = marketData.find(c => c.id === coinId)
    if (marketCoin) {
      return {
        name: marketCoin.name,
        symbol: marketCoin.symbol.toUpperCase(),
        image: marketCoin.image,
        price: marketCoin.current_price,
        change1h: marketCoin.price_change_percentage_1h_in_currency,
        change24h: marketCoin.price_change_percentage_24h,
      }
    }

    const m = meta[coinId]
    const ep = extraPrices[coinId]
    return {
      name: m?.name || coinId,
      symbol: m?.symbol?.toUpperCase() || coinId.toUpperCase(),
      image: m?.thumb || null,
      price: ep?.usd ?? null,
      change1h: null,
      change24h: ep?.usd_24h_change ?? null,
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Star className="size-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Watchlist</span>
          <span className="text-[9px] text-muted-foreground">{watchlist.length} coins</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={shareWatchlist}
            className="relative rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title="Share watchlist"
          >
            {copied ? <Check className="size-3 text-green-400" /> : <Share2 className="size-3" />}
            {copied && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-green-400 whitespace-nowrap font-medium">
                Copied!
              </span>
            )}
          </button>
          <button
            onClick={() => { setAddMode(!addMode); setSearchQuery(""); setSearchResults([]) }}
            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          >
            {addMode ? <X className="size-3" /> : <Plus className="size-3" />}
          </button>
        </div>
      </div>

      {/* Import banner */}
      {importBanner && (
        <div className="border-b border-border px-3 py-2 shrink-0 bg-secondary/50">
          <div className="flex items-center gap-2">
            <Download className="size-3 text-amber-400 shrink-0" />
            <span className="text-[10px] text-foreground flex-1">
              Import shared watchlist? ({importBanner.ids.length} coins)
            </span>
            <button
              onClick={importSharedWatchlist}
              className="text-[10px] font-bold text-green-400 hover:text-green-300 transition-colors px-1.5 py-0.5 rounded hover:bg-secondary"
            >
              Import
            </button>
            <button
              onClick={dismissSharedWatchlist}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {addMode && (
        <div className="border-b border-border px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded border border-border bg-background px-2">
            <Search className="size-3 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search any coin..."
              className="w-full py-1 text-xs bg-transparent outline-none"
              autoFocus
            />
            {searching && <Loader2 className="size-3 text-muted-foreground animate-spin shrink-0" />}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 max-h-40 overflow-auto divide-y divide-border/50 rounded border border-border">
              {searchResults.map(coin => (
                <button
                  key={coin.id}
                  onClick={() => addCoin(coin)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {coin.thumb && <img src={coin.thumb} alt="" className="size-4 rounded-full" />}
                  <span className="text-xs font-bold">{coin.symbol?.toUpperCase()}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{coin.name}</span>
                  {coin.market_cap_rank && (
                    <span className="ml-auto text-[9px] text-muted-foreground/60">#{coin.market_cap_rank}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim() && !searching && searchResults.length === 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground text-center py-2">No results found</p>
          )}
        </div>
      )}

      {/* Coin list */}
      <div className="flex-1 overflow-auto min-h-0">
        {watchlist.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
            Your watchlist is empty. Click + to add coins.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {watchlist.map(coinId => {
              const coin = getCoinDisplay(coinId)
              return (
                <div
                  key={coinId}
                  className="flex items-center justify-between px-3 py-2 group hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => onSelectSymbol?.(coinId)}
                >
                  <div className="flex items-center gap-2">
                    {coin.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coin.image} alt="" className="size-5 rounded-full" />
                    ) : (
                      <div className="size-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                        {coin.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-foreground">{coin.symbol}</div>
                      <div className="text-[9px] text-muted-foreground">{coin.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-mono text-amber-400">
                        {coin.price !== null ? formatPrice(coin.price) : "—"}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        {coin.change1h !== null && (
                          <span className={`text-[10px] font-mono ${coin.change1h >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {formatPercentage(coin.change1h)}
                          </span>
                        )}
                        {coin.change24h !== null && (
                          <span className={`text-[10px] font-mono ${coin.change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {formatPercentage(coin.change24h)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCoin(coinId) }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <X className="size-3" />
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
