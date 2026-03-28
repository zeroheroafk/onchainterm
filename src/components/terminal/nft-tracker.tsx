"use client"

import { useState, useEffect, useCallback } from "react"
import { Image, RefreshCw } from "lucide-react"
import { formatPrice, formatLargeNumber } from "@/lib/constants"

interface NftCollection {
  id: string
  name: string
  symbol: string
  floorPrice: { native: number; usd: number }
  marketCap: number
  volume24h: number
  floorChange24h: number | null
}

interface NftResponse {
  collections: NftCollection[]
  stale?: boolean
  error?: string
}

export function NftTracker() {
  const [collections, setCollections] = useState<NftCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchNfts = useCallback(async () => {
    try {
      const res = await fetch("/api/nft")
      if (!res.ok) throw new Error("Failed to fetch NFT data")
      const data: NftResponse = await res.json()
      if (data.error) throw new Error(data.error)
      setCollections(data.collections)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNfts()
    const interval = setInterval(fetchNfts, 5 * 60 * 1000) // 5 min
    return () => clearInterval(interval)
  }, [fetchNfts])

  if (loading && collections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Loading NFT floor prices...
      </div>
    )
  }

  if (error && collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
        <span className="text-red-400">{error}</span>
        <button onClick={fetchNfts} className="text-primary hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Image className="size-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            NFT Floor Prices
          </span>
        </div>
        <button
          onClick={fetchNfts}
          className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          title="Refresh"
        >
          <RefreshCw className="size-3" />
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.5rem_1fr_5.5rem_4rem_4.5rem] gap-1 text-[9px] text-muted-foreground uppercase tracking-wider px-1 shrink-0">
        <span>#</span>
        <span>Collection</span>
        <span className="text-right">Floor</span>
        <span className="text-right">24h</span>
        <span className="text-right">Mkt Cap</span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5">
        {collections.map((nft, index) => {
          const changeColor =
            nft.floorChange24h === null
              ? "text-muted-foreground"
              : nft.floorChange24h >= 0
                ? "text-green-400"
                : "text-red-400"

          const changeText =
            nft.floorChange24h === null
              ? "N/A"
              : `${nft.floorChange24h >= 0 ? "+" : ""}${nft.floorChange24h.toFixed(2)}%`

          return (
            <div
              key={nft.id}
              className="grid grid-cols-[1.5rem_1fr_5.5rem_4rem_4.5rem] gap-1 items-center text-[10px] px-1 py-1 rounded hover:bg-secondary/30 transition-colors"
            >
              <span className="text-muted-foreground font-mono">
                {index + 1}
              </span>
              <span className="text-foreground font-medium truncate">
                {nft.name}
              </span>
              <div className="text-right">
                <div className="text-foreground font-mono">
                  {nft.floorPrice.native.toFixed(
                    nft.floorPrice.native >= 1 ? 2 : 4
                  )}{" "}
                  ETH
                </div>
                <div className="text-[8px] text-muted-foreground">
                  {formatPrice(nft.floorPrice.usd)}
                </div>
              </div>
              <span className={`text-right font-mono ${changeColor}`}>
                {changeText}
              </span>
              <span className="text-right font-mono text-muted-foreground">
                {nft.marketCap > 0 ? formatLargeNumber(nft.marketCap) : "N/A"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground">
          CoinGecko NFT Data
          {lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  )
}
