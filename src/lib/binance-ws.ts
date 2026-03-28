"use client"

// CoinGecko ID → Binance USDT symbol mapping
const ID_TO_BINANCE: Record<string, string> = {
  bitcoin: "btcusdt",
  ethereum: "ethusdt",
  ripple: "xrpusdt",
  binancecoin: "bnbusdt",
  solana: "solusdt",
  dogecoin: "dogeusdt",
  cardano: "adausdt",
  tron: "trxusdt",
  "avalanche-2": "avaxusdt",
  chainlink: "linkusdt",
  sui: "suiusdt",
  stellar: "xlmusdt",
  "shiba-inu": "shibusdt",
  "hedera-hashgraph": "hbarusdt",
  polkadot: "dotusdt",
  "bitcoin-cash": "bchusdt",
  litecoin: "ltcusdt",
  uniswap: "uniusdt",
  monero: "xmrusdt",
  pepe: "pepeusdt",
  near: "nearusdt",
  aptos: "aptusdt",
  aave: "aaveusdt",
  "internet-computer": "icpusdt",
  "ethereum-classic": "etcusdt",
  "render-token": "renderusdt",
  "crypto-com-chain": "crousdt",
  vechain: "vetusdt",
  kaspa: "kasusdt",
  filecoin: "filusdt",
  arbitrum: "arbusdt",
  cosmos: "atomusdt",
  celestia: "tiausdt",
  bonk: "bonkusdt",
  "injective-protocol": "injusdt",
  "immutable-x": "imxusdt",
  "the-graph": "grtusdt",
}

// Reverse lookup: binance symbol → coingecko id
const BINANCE_TO_ID: Record<string, string> = {}
for (const [id, sym] of Object.entries(ID_TO_BINANCE)) {
  BINANCE_TO_ID[sym] = id
}

export interface RealtimePrice {
  price: number
  priceChange24h: number // percentage
}

export type PriceCallback = (prices: Record<string, RealtimePrice>) => void

/**
 * Get the Binance symbol for a CoinGecko ID.
 * Falls back to `{symbol}usdt` for unknown coins.
 */
export function getBinanceSymbol(coinGeckoId: string, symbol?: string): string | null {
  if (ID_TO_BINANCE[coinGeckoId]) return ID_TO_BINANCE[coinGeckoId]
  if (symbol) return `${symbol.toLowerCase()}usdt`
  return null
}

export function getCoinGeckoId(binanceSymbol: string): string | null {
  return BINANCE_TO_ID[binanceSymbol] || null
}

/**
 * Creates a Binance WebSocket connection for real-time price tickers.
 * Uses the combined stream endpoint with @miniTicker for minimal bandwidth.
 */
export function createBinanceWS(
  coinIds: string[],
  onPrices: PriceCallback,
): { close: () => void; updateSubscriptions: (newIds: string[]) => void } {
  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let currentSymbols: string[] = []
  let closed = false
  const latestPrices: Record<string, RealtimePrice> = {}

  function getSymbols(ids: string[]): string[] {
    const symbols: string[] = []
    const seen = new Set<string>()
    for (const id of ids) {
      const sym = ID_TO_BINANCE[id]
      if (sym && !seen.has(sym)) {
        seen.add(sym)
        symbols.push(sym)
      }
    }
    return symbols
  }

  function connect(symbols: string[]) {
    if (closed || symbols.length === 0) return
    currentSymbols = symbols

    // Use combined streams with miniTicker (less data than full ticker)
    const streams = symbols.map(s => `${s}@miniTicker`).join("/")
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

    try {
      ws = new WebSocket(url)
    } catch {
      scheduleReconnect()
      return
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const data = msg.data
        if (!data || !data.s) return

        const binanceSymbol = data.s.toLowerCase() + (data.s.toLowerCase().endsWith("usdt") ? "" : "")
        const sym = data.s.toLowerCase().endsWith("usdt") ? data.s.toLowerCase() : `${data.s.toLowerCase()}usdt`
        const coinId = BINANCE_TO_ID[sym]
        if (!coinId) return

        const close = parseFloat(data.c)
        const open = parseFloat(data.o)
        const change24h = open > 0 ? ((close - open) / open) * 100 : 0

        latestPrices[coinId] = { price: close, priceChange24h: change24h }

        // Batch updates — dispatch on every message (mini tickers come every ~1s per symbol)
        onPrices({ ...latestPrices })
      } catch { /* ignore parse errors */ }
    }

    ws.onerror = () => {
      ws?.close()
    }

    ws.onclose = () => {
      if (!closed) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    reconnectTimeout = setTimeout(() => {
      if (!closed) connect(currentSymbols)
    }, 3000)
  }

  function close() {
    closed = true
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    ws?.close()
  }

  function updateSubscriptions(newIds: string[]) {
    const newSymbols = getSymbols(newIds)
    const currentSet = new Set(currentSymbols)
    const newSet = new Set(newSymbols)

    // Only reconnect if symbols actually changed
    const changed = newSymbols.length !== currentSymbols.length ||
      newSymbols.some(s => !currentSet.has(s)) ||
      currentSymbols.some(s => !newSet.has(s))

    if (changed) {
      ws?.close()
      connect(newSymbols)
    }
  }

  // Initial connection
  const initialSymbols = getSymbols(coinIds)
  connect(initialSymbols)

  return { close, updateSubscriptions }
}
