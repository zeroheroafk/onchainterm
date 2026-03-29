"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatPrice, formatPercentage } from "@/lib/constants"
import { FeedSkeleton } from "@/components/terminal/widget-skeleton"
import { useCoinContextMenu } from "@/components/terminal/coin-context-menu"

interface MoverCoin {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
}

export function TopMovers({ onSelectSymbol }: { onSelectSymbol?: (id: string) => void }) {
  const { showMenu } = useCoinContextMenu()
  const [gainers, setGainers] = useState<MoverCoin[]>([])
  const [losers, setLosers] = useState<MoverCoin[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"gainers" | "losers">("gainers")

  useEffect(() => {
    async function fetchMovers() {
      try {
        const res = await fetch("/api/top-movers")
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (data.gainers) setGainers(data.gainers)
        if (data.losers) setLosers(data.losers)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchMovers()
    const interval = setInterval(fetchMovers, 120_000)
    return () => clearInterval(interval)
  }, [])

  const list = tab === "gainers" ? gainers : losers

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border shrink-0">
        <button
          onClick={() => setTab("gainers")}
          className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors widget-tab ${
            tab === "gainers" ? "text-positive widget-tab-active" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="size-3" /> Gainers
        </button>
        <button
          onClick={() => setTab("losers")}
          className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors widget-tab ${
            tab === "losers" ? "text-negative widget-tab-active" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingDown className="size-3" /> Losers
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <FeedSkeleton rows={5} />
        ) : list.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>
        ) : (
          <div key={tab} className="divide-y divide-border/50 tab-content">
            {list.map((coin, i) => (
              <div key={coin.id} className="flex items-center justify-between px-2 py-1 hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => onSelectSymbol?.(coin.id)} onContextMenu={(e) => showMenu(e, coin.id, coin.symbol)}>
                <div>
                  <span className="text-xs font-bold text-foreground">{coin.symbol.toUpperCase()}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">{coin.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs num text-foreground">{formatPrice(coin.current_price)}</div>
                  <div className={`text-[10px] num ${coin.price_change_percentage_24h >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatPercentage(coin.price_change_percentage_24h)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
