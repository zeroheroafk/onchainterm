"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Star, Plus, X, Search, Loader2, Share2, Check, Download, GripVertical } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"
import { formatPrice, formatPercentage } from "@/lib/constants"
import { TableSkeleton } from "@/components/terminal/widget-skeleton"
import { useToast } from "@/lib/toast-context"
import { useCoinContextMenu } from "@/components/terminal/coin-context-menu"

const STORAGE_KEY = "onchainterm_watchlists"
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

interface Watchlist {
  id: string
  name: string
  coins: string[]
}

function loadWatchlists(): Watchlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) return parsed
    }
    // Migrate from old single-watchlist format
    const oldRaw = localStorage.getItem("onchainterm_watchlist")
    const oldCoins = oldRaw ? JSON.parse(oldRaw) : ["bitcoin", "ethereum", "solana"]
    const migrated: Watchlist[] = [{ id: "default", name: "Main", coins: oldCoins }]
    saveWatchlists(migrated)
    return migrated
  } catch {
    return [{ id: "default", name: "Main", coins: ["bitcoin", "ethereum", "solana"] }]
  }
}

function saveWatchlists(lists: Watchlist[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lists)) } catch {}
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
  const { data: marketData, isLoading: marketLoading } = useMarketData()
  const { toast } = useToast()
  const { showMenu } = useCoinContextMenu()
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [activeListId, setActiveListId] = useState("default")
  const [meta, setMeta] = useState<Record<string, WatchlistCoinMeta>>({})
  const [addMode, setAddMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<WatchlistCoinMeta[]>([])
  const [searching, setSearching] = useState(false)
  const [extraPrices, setExtraPrices] = useState<Record<string, CoinPrice>>({})
  const [copied, setCopied] = useState(false)
  const [importBanner, setImportBanner] = useState<{ ids: string[] } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeList = watchlists.find(l => l.id === activeListId) || watchlists[0]
  const watchlist = activeList?.coins || []

  useEffect(() => {
    const lists = loadWatchlists()
    setWatchlists(lists)
    setActiveListId(lists[0]?.id || "default")
    setMeta(loadMeta())
  }, [])

  // Cleanup share timer on unmount
  useEffect(() => {
    return () => {
      if (shareTimer.current) clearTimeout(shareTimer.current)
    }
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

  // ─── List management ───

  const updateActiveList = useCallback((updater: (list: Watchlist) => Watchlist) => {
    setWatchlists(prev => {
      const updated = prev.map(l => l.id === activeListId ? updater(l) : l)
      saveWatchlists(updated)
      return updated
    })
  }, [activeListId])

  const createList = useCallback(() => {
    if (watchlists.length >= 20) {
      toast("Max 20 watchlists", "error")
      return
    }
    const id = `wl_${Date.now()}`
    const name = `List ${watchlists.length + 1}`
    const newList: Watchlist = { id, name, coins: [] }
    const updated = [...watchlists, newList]
    setWatchlists(updated)
    saveWatchlists(updated)
    setActiveListId(id)
    // Auto-start rename so user can name it immediately
    setRenaming(id)
    setRenameValue(name)
  }, [watchlists, toast])

  const deleteList = useCallback((listId: string) => {
    if (watchlists.length <= 1) return
    const updated = watchlists.filter(l => l.id !== listId)
    setWatchlists(updated)
    saveWatchlists(updated)
    if (activeListId === listId) setActiveListId(updated[0].id)
  }, [watchlists, activeListId])

  const startRename = useCallback((listId: string) => {
    const list = watchlists.find(l => l.id === listId)
    if (!list) return
    setRenaming(listId)
    setRenameValue(list.name)
  }, [watchlists])

  const confirmRename = useCallback(() => {
    if (!renaming || !renameValue.trim()) { setRenaming(null); return }
    setWatchlists(prev => {
      const updated = prev.map(l => l.id === renaming ? { ...l, name: renameValue.trim() } : l)
      saveWatchlists(updated)
      return updated
    })
    setRenaming(null)
  }, [renaming, renameValue])

  // ─── Coin management ───

  const addCoin = useCallback((coin: WatchlistCoinMeta) => {
    if (watchlist.includes(coin.id)) return
    updateActiveList(l => ({ ...l, coins: [...l.coins, coin.id] }))

    const updatedMeta = { ...meta, [coin.id]: coin }
    setMeta(updatedMeta)
    saveMeta(updatedMeta)

    setSearchQuery("")
    setSearchResults([])
  }, [watchlist, meta, updateActiveList])

  const removeCoin = useCallback((coinId: string) => {
    updateActiveList(l => ({ ...l, coins: l.coins.filter(id => id !== coinId) }))
    toast("Coin removed", "success")
  }, [updateActiveList, toast])

  const shareWatchlist = useCallback(() => {
    const encoded = btoa(JSON.stringify(watchlist))
    const url = `${window.location.origin}?watchlist=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast("Watchlist shared!", "success")
      if (shareTimer.current) clearTimeout(shareTimer.current)
      shareTimer.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [watchlist, toast])

  const importSharedWatchlist = useCallback(() => {
    if (!importBanner) return
    const currentSet = new Set(watchlist)
    const newIds = importBanner.ids.filter(id => !currentSet.has(id))
    if (newIds.length > 0) {
      updateActiveList(l => ({ ...l, coins: [...l.coins, ...newIds] }))
    }
    setImportBanner(null)
    const params = new URLSearchParams(window.location.search)
    params.delete("watchlist")
    const newSearch = params.toString()
    window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""))
  }, [watchlist, importBanner, updateActiveList])

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
      {/* Watchlist tabs */}
      <div className="flex items-center border-b border-border shrink-0 min-h-0">
        <div className="flex-1 flex items-center overflow-x-auto min-w-0 scrollbar-none">
          {watchlists.map(list => (
            <div key={list.id} className="shrink-0 group relative">
              {renaming === list.id ? (
                <div className="flex items-center px-2 py-1.5 border-r border-border bg-card">
                  <input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenaming(null) }}
                    className="w-16 bg-transparent text-[10px] outline-none border-b border-primary font-medium"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => setActiveListId(list.id)}
                  onDoubleClick={() => startRename(list.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium border-r border-border transition-colors whitespace-nowrap ${
                    list.id === activeListId
                      ? "bg-card text-primary border-b-2 border-b-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                  }`}
                >
                  {list.id === activeListId && <Star className="size-2.5 text-amber-400 shrink-0" />}
                  <span className="truncate max-w-[80px]">{list.name}</span>
                  <span className="text-[8px] text-muted-foreground/60">{list.coins.length}</span>
                  {watchlists.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); deleteList(list.id) }}
                      className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 text-muted-foreground hover:text-negative transition-all cursor-pointer"
                    >
                      <X className="size-2.5" />
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}
          {/* New tab button */}
          <button
            onClick={createList}
            className="shrink-0 px-2 py-1.5 text-muted-foreground hover:text-primary hover:bg-secondary/30 transition-colors"
            title="New watchlist"
          >
            <Plus className="size-3" />
          </button>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 shrink-0 border-l border-border">
          <button
            onClick={shareWatchlist}
            className="relative rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title="Share watchlist"
          >
            {copied ? <Check className="size-3 text-positive" /> : <Share2 className="size-3" />}
          </button>
          <button
            onClick={() => { setAddMode(!addMode); setSearchQuery(""); setSearchResults([]) }}
            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title={addMode ? "Cancel" : "Add coin"}
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
              className="text-[10px] font-bold text-positive hover:text-positive transition-colors px-1.5 py-0.5 rounded hover:bg-secondary"
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
        {marketLoading && watchlist.length > 0 && marketData.length === 0 ? (
          <div className="p-3">
            <TableSkeleton rows={5} />
          </div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Star className="size-8 opacity-20" />
            <span className="text-[10px]">No coins in watchlist</span>
            <span className="text-[8px]">Use the search above to add coins</span>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {watchlist.map((coinId, i) => {
              const coin = getCoinDisplay(coinId)
              return (
                <div
                  key={coinId}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(i)
                    e.dataTransfer.effectAllowed = "move"
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverIndex(i)
                  }}
                  onDragEnd={() => {
                    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                      updateActiveList(l => {
                        const newCoins = [...l.coins]
                        const [moved] = newCoins.splice(dragIndex, 1)
                        newCoins.splice(dragOverIndex, 0, moved)
                        return { ...l, coins: newCoins }
                      })
                    }
                    setDragIndex(null)
                    setDragOverIndex(null)
                  }}
                  className={`flex items-center justify-between px-3 py-2 group hover:bg-secondary/30 transition-colors duration-150 cursor-pointer ${dragOverIndex === i ? "border-t-2 border-primary" : ""} ${dragIndex === i ? "opacity-50" : ""}`}
                  onClick={() => onSelectSymbol?.(coinId)}
                  onContextMenu={(e) => showMenu(e, coinId, coin.symbol)}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className={`size-3 text-muted-foreground shrink-0 ${dragIndex !== null ? "cursor-grabbing" : "cursor-grab"}`} />
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
                      <div className="text-xs num text-foreground">
                        {coin.price !== null ? formatPrice(coin.price) : "—"}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        {coin.change1h !== null && (
                          <span className={`text-[10px] num ${coin.change1h >= 0 ? "text-positive" : "text-negative"}`}>
                            {formatPercentage(coin.change1h)}
                          </span>
                        )}
                        {coin.change24h !== null && (
                          <span className={`text-[10px] num ${coin.change24h >= 0 ? "text-positive" : "text-negative"}`}>
                            {formatPercentage(coin.change24h)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCoin(coinId) }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-negative transition-all"
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
