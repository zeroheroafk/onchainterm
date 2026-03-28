"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { CoinMarketData } from "@/types/market"
import { fetchMarketData } from "@/lib/coingecko"
import { REFRESH_INTERVAL_MS } from "@/lib/constants"
import { createBinanceWS, type RealtimePrice } from "@/lib/binance-ws"

interface MarketDataContextValue {
  data: CoinMarketData[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

const MarketDataContext = createContext<MarketDataContextValue>({
  data: [],
  isLoading: true,
  error: null,
  lastUpdated: null,
  refresh: () => {},
})

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [baseData, setBaseData] = useState<CoinMarketData[]>([])
  const [realtimePrices, setRealtimePrices] = useState<Record<string, RealtimePrice>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef<ReturnType<typeof createBinanceWS> | null>(null)

  // Fetch full market data from CoinGecko (every 60s for market cap, volume, etc.)
  const loadData = useCallback(async () => {
    try {
      setError(null)
      const marketData = await fetchMarketData()
      setBaseData(marketData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // CoinGecko polling (slower — for market cap, volume, sparklines)
  useEffect(() => {
    loadData()
    intervalRef.current = setInterval(loadData, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadData])

  // Binance WebSocket for real-time prices
  useEffect(() => {
    if (baseData.length === 0) return

    const coinIds = baseData.map(c => c.id)

    if (!wsRef.current) {
      wsRef.current = createBinanceWS(coinIds, (prices) => {
        setRealtimePrices(prices)
      })
    } else {
      wsRef.current.updateSubscriptions(coinIds)
    }

    return () => {
      // Don't close on every baseData change — only on unmount
    }
  }, [baseData])

  // Cleanup WS on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

  // Merge CoinGecko base data with Binance real-time prices
  const data = baseData.map(coin => {
    const rt = realtimePrices[coin.id]
    if (!rt) return coin
    return {
      ...coin,
      current_price: rt.price,
      price_change_percentage_24h: rt.priceChange24h,
    }
  })

  return (
    <MarketDataContext.Provider value={{ data, isLoading, error, lastUpdated, refresh: loadData }}>
      {children}
    </MarketDataContext.Provider>
  )
}

export function useMarketData() {
  return useContext(MarketDataContext)
}
