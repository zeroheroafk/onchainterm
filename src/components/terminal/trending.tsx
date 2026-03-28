"use client"

import { useState, useEffect } from "react"
import { Flame } from "lucide-react"
import { FeedSkeleton } from "@/components/terminal/widget-skeleton"

interface TrendingCoin {
  item: {
    id: string
    coin_id: number
    name: string
    symbol: string
    market_cap_rank: number
    thumb: string
    score: number
    data?: {
      price: string
      price_change_percentage_24h?: { usd?: number }
    }
  }
}

export function TrendingWidget() {
  const [coins, setCoins] = useState<TrendingCoin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/search/trending")
        if (!res.ok) throw new Error("Failed")
        const json = await res.json()
        setCoins(json.coins?.slice(0, 10) || [])
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchTrending()
    const interval = setInterval(fetchTrending, 120_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <FeedSkeleton rows={6} />
  }

  return (
    <div className="h-full overflow-auto">
      <div className="divide-y divide-border/50">
        {coins.map((item, i) => {
          const coin = item.item
          const pctChange = coin.data?.price_change_percentage_24h?.usd
          return (
            <div key={coin.id} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/20 transition-colors animate-fade-in" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'both' }}>
              <span className="text-primary/60 font-semibold text-[10px] w-4 num">{i + 1}</span>
              <Flame className="size-3 text-amber-400/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground/90">{coin.symbol.toUpperCase()}</span>
                  <span className="text-[10px] text-muted-foreground/50 truncate">{coin.name}</span>
                </div>
                {coin.market_cap_rank && (
                  <span className="text-[8px] text-muted-foreground/40">Rank #{coin.market_cap_rank}</span>
                )}
              </div>
              <div className="text-right shrink-0">
                {coin.data?.price && (
                  <div className="text-[10px] num text-foreground/80">{coin.data.price}</div>
                )}
                {pctChange !== undefined && (
                  <div className={`text-[10px] num ${pctChange >= 0 ? "text-positive" : "text-negative"}`}>
                    {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
