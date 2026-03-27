"use client"

import { useEffect, useRef, useMemo } from "react"
import { useTheme } from "@/lib/theme-context"

// Map CoinGecko IDs to TradingView symbol pairs
const SYMBOL_MAP: Record<string, string> = {
  bitcoin: "BINANCE:BTCUSDT",
  ethereum: "BINANCE:ETHUSDT",
  ripple: "BINANCE:XRPUSDT",
  binancecoin: "BINANCE:BNBUSDT",
  solana: "BINANCE:SOLUSDT",
  dogecoin: "BINANCE:DOGEUSDT",
  cardano: "BINANCE:ADAUSDT",
  tron: "BINANCE:TRXUSDT",
  "avalanche-2": "BINANCE:AVAXUSDT",
  chainlink: "BINANCE:LINKUSDT",
  sui: "BINANCE:SUIUSDT",
  stellar: "BINANCE:XLMUSDT",
  "shiba-inu": "BINANCE:SHIBUSDT",
  "hedera-hashgraph": "BINANCE:HBARUSDT",
  polkadot: "BINANCE:DOTUSDT",
  "bitcoin-cash": "BINANCE:BCHUSDT",
  hyperliquid: "BINANCE:HYPEUSDT",
  litecoin: "BINANCE:LTCUSDT",
  uniswap: "BINANCE:UNIUSDT",
  "leo-token": "BITFINEX:LEOUSD",
  monero: "BINANCE:XMRUSDT",
  pepe: "BINANCE:PEPEUSDT",
  near: "BINANCE:NEARUSDT",
  aptos: "BINANCE:APTUSDT",
  aave: "BINANCE:AAVEUSDT",
  "internet-computer": "BINANCE:ICPUSDT",
  "ethereum-classic": "BINANCE:ETCUSDT",
  "render-token": "BINANCE:RENDERUSDT",
  mantle: "BINANCE:MNTLUSDT",
  "crypto-com-chain": "BINANCE:CROUSDT",
  vechain: "BINANCE:VETUSDT",
  "ondo-finance": "BINANCE:ONDOUSDT",
  kaspa: "BINANCE:KASUSDT",
  filecoin: "BINANCE:FILUSDT",
  "artificial-superintelligence-alliance": "BINANCE:FETUSDT",
  arbitrum: "BINANCE:ARBUSDT",
  cosmos: "BINANCE:ATOMUSDT",
  okb: "OKX:OKBUSDT",
  celestia: "BINANCE:TIAUSDT",
  bonk: "BINANCE:BONKUSDT",
  "injective-protocol": "BINANCE:INJUSDT",
  "immutable-x": "BINANCE:IMXUSDT",
  "the-graph": "BINANCE:GRTUSDT",
}

interface PriceChartProps {
  symbol: string
}

export function PriceChart({ symbol }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { themeId } = useTheme()

  const tvSymbol = SYMBOL_MAP[symbol] || "BINANCE:BTCUSDT"
  const isDark = themeId !== "light"

  // Stable reference for the TradingView config
  const widgetConfig = useMemo(() => ({
    symbol: tvSymbol,
    theme: isDark ? "dark" : "light",
  }), [tvSymbol, isDark])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear previous widget
    container.innerHTML = ""

    const widgetDiv = document.createElement("div")
    widgetDiv.className = "tradingview-widget-container__widget"
    widgetDiv.style.height = "100%"
    widgetDiv.style.width = "100%"
    container.appendChild(widgetDiv)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: widgetConfig.symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: widgetConfig.theme,
      style: "1",
      locale: "en",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(128, 128, 128, 0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    })
    container.appendChild(script)

    return () => {
      container.innerHTML = ""
    }
  }, [widgetConfig])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="tradingview-widget-container flex-1 min-h-0"
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  )
}
