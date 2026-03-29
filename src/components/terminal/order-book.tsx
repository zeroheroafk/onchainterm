"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { BookOpen, RefreshCw } from "lucide-react"
import { ChartSkeleton } from "@/components/terminal/widget-skeleton"
import { formatPrice } from "@/lib/constants"

interface OrderLevel {
  price: number
  qty: number
  total: number
}

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "SUIUSDT"]
const DEPTH_LIMIT = 20

export function OrderBook() {
  const [bids, setBids] = useState<OrderLevel[]>([])
  const [asks, setAsks] = useState<OrderLevel[]>([])
  const [symbol, setSymbol] = useState("BTCUSDT")
  const [loading, setLoading] = useState(true)
  const [spread, setSpread] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const snapshotLoaded = useRef(false)

  const connectWs = useCallback(() => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    snapshotLoaded.current = false
    setLoading(true)
    setBids([])
    setAsks([])

    // First fetch snapshot via REST
    fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${DEPTH_LIMIT}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { bids: [string, string][]; asks: [string, string][] }) => {
        const parsedBids = processLevels(data.bids, "bid")
        const parsedAsks = processLevels(data.asks, "ask")
        setBids(parsedBids)
        setAsks(parsedAsks)
        if (parsedBids.length > 0 && parsedAsks.length > 0) {
          setSpread(parsedAsks[0].price - parsedBids[0].price)
        }
        snapshotLoaded.current = true
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })

    // Then connect WebSocket for live updates
    try {
      const ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth${DEPTH_LIMIT}@1000ms`
      )

      ws.onmessage = (event) => {
        if (!snapshotLoaded.current) return
        try {
          const data = JSON.parse(event.data)
          if (data.bids || data.b) {
            const rawBids = data.bids || data.b
            const rawAsks = data.asks || data.a
            if (rawBids?.length) {
              const newBids = processLevels(rawBids, "bid")
              setBids(newBids)
              if (newBids.length > 0) {
                setSpread((prev) => {
                  // Recalculate with current asks
                  return prev // will be recalculated below
                })
              }
            }
            if (rawAsks?.length) {
              const newAsks = processLevels(rawAsks, "ask")
              setAsks(newAsks)
            }

            // Update spread
            if (rawBids?.length && rawAsks?.length) {
              const topBid = parseFloat(rawBids[0][0])
              const topAsk = parseFloat(rawAsks[0][0])
              if (topBid > 0 && topAsk > 0) {
                setSpread(topAsk - topBid)
              }
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = () => ws.close()
      ws.onclose = () => {
        wsRef.current = null
      }

      wsRef.current = ws
    } catch {
      // WebSocket not available
    }
  }, [symbol])

  useEffect(() => {
    connectWs()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connectWs])

  const maxTotal = useMemo(() => {
    const maxBid = bids.length > 0 ? bids[bids.length - 1].total : 0
    const maxAsk = asks.length > 0 ? asks[asks.length - 1].total : 0
    return Math.max(maxBid, maxAsk, 1)
  }, [bids, asks])

  const displaySymbol = symbol.replace(/USDT$/, "")

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">Order Book</span>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-secondary/50 border border-border text-foreground text-[10px] px-1.5 py-0.5 outline-none focus:border-primary/40 font-mono"
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/USDT$/, "/USDT")}
              </option>
            ))}
          </select>
          <button onClick={connectWs} className="p-0.5 text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-3 gap-1 px-2 py-1 text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider border-b border-border shrink-0">
            <span>Price (USDT)</span>
            <span className="text-right">Qty ({displaySymbol})</span>
            <span className="text-right">Total</span>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Asks (reversed - lowest ask at bottom) */}
            <div className="flex-1 overflow-hidden flex flex-col justify-end">
              {[...asks].reverse().slice(-DEPTH_LIMIT).map((level) => (
                <div
                  key={level.price}
                  className="grid grid-cols-3 gap-1 px-2 py-[2px] text-[10px] relative"
                >
                  <div
                    className="absolute inset-0 bg-negative/10"
                    style={{ width: `${(level.total / maxTotal) * 100}%`, right: 0, left: "auto" }}
                  />
                  <span className="num text-negative relative z-10">{formatPrice(level.price)}</span>
                  <span className="num text-muted-foreground text-right relative z-10">{level.qty.toFixed(4)}</span>
                  <span className="num text-muted-foreground text-right relative z-10">{level.total.toFixed(4)}</span>
                </div>
              ))}
            </div>

            {/* Spread */}
            <div className="flex items-center justify-center py-1 border-y border-border shrink-0">
              <span className="text-[10px] text-muted-foreground">
                Spread: <span className="num text-foreground font-medium">{formatPrice(spread)}</span>
                {bids.length > 0 && bids[0].price > 0 && (
                  <span className="text-muted-foreground/60 ml-1">
                    ({((spread / bids[0].price) * 100).toFixed(3)}%)
                  </span>
                )}
              </span>
            </div>

            {/* Bids */}
            <div className="flex-1 overflow-hidden">
              {bids.slice(0, DEPTH_LIMIT).map((level) => (
                <div
                  key={level.price}
                  className="grid grid-cols-3 gap-1 px-2 py-[2px] text-[10px] relative"
                >
                  <div
                    className="absolute inset-0 bg-positive/10"
                    style={{ width: `${(level.total / maxTotal) * 100}%`, right: 0, left: "auto" }}
                  />
                  <span className="num text-positive relative z-10">{formatPrice(level.price)}</span>
                  <span className="num text-muted-foreground text-right relative z-10">{level.qty.toFixed(4)}</span>
                  <span className="num text-muted-foreground text-right relative z-10">{level.total.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-3 py-1 shrink-0 text-center">
            <span className="text-[8px] text-muted-foreground/40">Binance · Real-time</span>
          </div>
        </>
      )}
    </div>
  )
}

function processLevels(
  raw: [string, string][],
  side: "bid" | "ask"
): OrderLevel[] {
  const levels = raw
    .map(([price, qty]) => ({
      price: parseFloat(price),
      qty: parseFloat(qty),
      total: 0,
    }))
    .filter((l) => l.qty > 0)

  // Sort: bids descending, asks ascending
  levels.sort((a, b) =>
    side === "bid" ? b.price - a.price : a.price - b.price
  )

  // Cumulative total
  let cumulative = 0
  for (const level of levels) {
    cumulative += level.qty
    level.total = cumulative
  }

  return levels.slice(0, DEPTH_LIMIT)
}
