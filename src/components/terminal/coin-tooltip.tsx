"use client"

import { useState, useRef, useEffect } from "react"
import { useMarketData } from "@/lib/market-data-context"
import { formatPrice, formatLargeNumber, formatPercentage } from "@/lib/constants"

interface CoinTooltipProps {
  coinId: string
  children: React.ReactNode
}

export function CoinTooltip({ coinId, children }: CoinTooltipProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const { data } = useMarketData()

  const coin = data.find(c => c.id === coinId)

  const handleMouseEnter = (e: React.MouseEvent) => {
    timeoutRef.current = setTimeout(() => {
      setPos({ x: e.clientX, y: e.clientY })
      setShow(true)
    }, 400) // 400ms delay to avoid accidental triggers
  }

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current)
    setShow(false)
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  if (!coin) return <>{children}</>

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative">
      {children}
      {show && (
        <div
          className="fixed z-[200] animate-dropdown"
          style={{
            left: Math.min(pos.x + 12, window.innerWidth - 220),
            top: pos.y - 10,
          }}
        >
          <div className="w-[200px] border border-border/50 bg-card/95 backdrop-blur-md rounded-lg shadow-2xl shadow-black/30 ring-1 ring-white/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coin.image} alt="" className="size-5 coin-avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <div>
                <div className="text-[11px] font-semibold text-foreground">{coin.name}</div>
                <div className="text-[9px] text-muted-foreground/60 uppercase">{coin.symbol}</div>
              </div>
              <div className="ml-auto text-[9px] badge badge-neutral">#{coin.market_cap_rank}</div>
            </div>
            <div className="widget-separator my-2" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px]">
              <div>
                <div className="text-muted-foreground/50 uppercase tracking-wider">Price</div>
                <div className="num text-foreground font-medium">{formatPrice(coin.current_price)}</div>
              </div>
              <div>
                <div className="text-muted-foreground/50 uppercase tracking-wider">24h</div>
                <div className={`num font-medium ${coin.price_change_percentage_24h >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatPercentage(coin.price_change_percentage_24h)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground/50 uppercase tracking-wider">MCap</div>
                <div className="num text-foreground/80">{formatLargeNumber(coin.market_cap)}</div>
              </div>
              <div>
                <div className="text-muted-foreground/50 uppercase tracking-wider">Volume</div>
                <div className="num text-foreground/80">{formatLargeNumber(coin.total_volume)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
