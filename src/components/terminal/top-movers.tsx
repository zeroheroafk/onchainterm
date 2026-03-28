"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatPrice, formatPercentage } from "@/lib/constants"

interface MoverCoin {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
}

export function TopMovers({ onSelectSymbol }: { onSelectSymbol?: (id: string) => void }) {
  const [gainers, setGainers] = useState<MoverCoin[]>([])
  const [losers, setLosers] = useState<MoverCoin[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"gainers" | "losers">("gainers")

  useEffect(() => {
    async function fetchMovers() {
      try {
        const [gainRes, loseRes] = await Promise.all([
          fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h_desc&per_page=10&page=1&sparkline=false"),
          fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h_asc&per_page=10&page=1&sparkline=false"),
        ])
        if (gainRes.ok) {
          const g = await gainRes.json()
          setGainers(g.filter((c: MoverCoin) => c.price_change_percentage_24h > 0).slice(0, 10))
        }
        if (loseRes.ok) {
          const l = await loseRes.json()
          setLosers(l.filter((c: MoverCoin) => c.price_change_percentage_24h < 0).slice(0, 10))
        }
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
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            tab === "gainers" ? "text-green-400 border-b-2 border-green-400" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="size-3" /> Gainers
        </button>
        <button
          onClick={() => setTab("losers")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            tab === "losers" ? "text-red-400 border-b-2 border-red-400" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingDown className="size-3" /> Losers
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Loading...</div>
        ) : list.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>
        ) : (
          <div className="divide-y divide-border/50">
            {list.map((coin) => (
              <div key={coin.id} className="flex items-center justify-between px-3 py-2 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => onSelectSymbol?.(coin.id)}>
                <div>
                  <span className="text-xs font-bold text-foreground">{coin.symbol.toUpperCase()}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">{coin.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-foreground">{formatPrice(coin.current_price)}</div>
                  <div className={`text-[10px] font-mono ${coin.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400"}`}>
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
