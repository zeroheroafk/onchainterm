"use client"

import { useState, useEffect, useRef, useCallback, startTransition } from "react"
import {
  Search, Terminal, Eye, EyeOff, Filter, PieChart,
  LineChart, MessagesSquare, Newspaper, BarChart3, TrendingUp, Flame, Fuel, Wallet, Star,
  ArrowLeftRight, Calculator, StickyNote, BellRing, MessageSquare, Activity, TrendingDown, Percent,
  LayoutGrid, BookOpen, Grid3x3, Zap, Image, Cpu, Coins, Radio, Award, Palette, Hash,
} from "lucide-react"
import { useLayout } from "@/components/terminal/layout/layout-context"
import { useMarketData } from "@/lib/market-data-context"
import { FN_KEY_MAP, LETTER_KEY_MAP } from "@/hooks/useKeyboardShortcuts"

// Build reverse map: widget ID → shortcut key label
const WIDGET_SHORTCUT: Record<string, string> = {}
for (const [key, def] of Object.entries(FN_KEY_MAP)) {
  if (def.widget) WIDGET_SHORTCUT[def.widget] = key
}
for (const [letter, widgetId] of Object.entries(LETTER_KEY_MAP)) {
  if (!WIDGET_SHORTCUT[widgetId]) {
    WIDGET_SHORTCUT[widgetId] = letter.toUpperCase()
  }
}

interface CommandItem {
  id: string
  label: string
  description: string
  keywords?: string[]
  icon: React.ElementType
  category: "widget" | "action"
  action: () => void
}

function MiniSparkline({ prices }: { prices: number[] }) {
  if (prices.length < 2) return null
  const recent = prices.slice(-20)
  const min = Math.min(...recent)
  const max = Math.max(...recent)
  const range = max - min || 1
  const w = 40, h = 12
  const points = recent.map((p, i) =>
    `${(i / (recent.length - 1)) * w},${h - ((p - min) / range) * h}`
  ).join(" ")
  const isUp = recent[recent.length - 1] >= recent[0]
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth="1" />
    </svg>
  )
}

export function CommandBar() {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isWidgetActive, focusWidget, addWidget, bringToFront, removeWidget, setCatalogOpen } = useLayout()
  const { data: coins } = useMarketData()

  const handleWidgetAction = useCallback((widgetId: string) => {
    if (isWidgetActive(widgetId)) {
      focusWidget(widgetId)
      bringToFront(widgetId)
    } else {
      addWidget(widgetId)
    }
  }, [isWidgetActive, focusWidget, addWidget, bringToFront])

  const handleWidgetToggle = useCallback((e: React.MouseEvent, widgetId: string) => {
    e.stopPropagation()
    if (isWidgetActive(widgetId)) {
      removeWidget(widgetId)
    } else {
      addWidget(widgetId)
    }
  }, [isWidgetActive, removeWidget, addWidget])

  const commands: CommandItem[] = [
    { id: "price-table", label: "Crypto Prices", description: "Live price table with market data", keywords: ["btc", "eth", "bitcoin", "ethereum", "price", "market", "token", "coin", "spot", "rank", "cap"], icon: BarChart3, category: "widget", action: () => handleWidgetAction("price-table") },
    { id: "price-chart", label: "Price Chart", description: "Interactive price chart with timeframes", keywords: ["chart", "graph", "candle", "line", "trend", "technical", "ta", "trading view"], icon: LineChart, category: "widget", action: () => handleWidgetAction("price-chart") },
    { id: "market-overview", label: "Market Overview", description: "Global market stats and dominance", keywords: ["market", "global", "dominance", "btc.d", "total", "volume", "mcap", "overview"], icon: Activity, category: "widget", action: () => handleWidgetAction("market-overview") },
    { id: "top-movers", label: "Top Movers", description: "Biggest gainers and losers", keywords: ["gainer", "loser", "mover", "pump", "dump", "rally", "crash", "top"], icon: TrendingUp, category: "widget", action: () => handleWidgetAction("top-movers") },
    { id: "trending", label: "Trending", description: "Trending coins right now", keywords: ["trending", "hot", "popular", "viral", "hype", "buzz", "degen"], icon: Flame, category: "widget", action: () => handleWidgetAction("trending") },
    { id: "coin-detail", label: "Coin Detail", description: "Detailed coin information", keywords: ["detail", "info", "token", "coin", "fundamental", "about", "supply"], icon: TrendingDown, category: "widget", action: () => handleWidgetAction("coin-detail") },
    { id: "gas-tracker", label: "Gas Tracker", description: "Ethereum gas prices and fees", keywords: ["gas", "gwei", "fee", "eth", "ethereum", "transaction", "base fee", "priority"], icon: Fuel, category: "widget", action: () => handleWidgetAction("gas-tracker") },
    { id: "whale-alerts", label: "Whale Alerts", description: "Large crypto transfers", keywords: ["whale", "alert", "transfer", "big", "move", "wallet", "exchange"], icon: Activity, category: "widget", action: () => handleWidgetAction("whale-alerts") },
    { id: "fear-greed", label: "Fear & Greed", description: "Market sentiment index", keywords: ["fear", "greed", "sentiment", "index", "mood", "fng", "emotion"], icon: Activity, category: "widget", action: () => handleWidgetAction("fear-greed") },
    { id: "defi-dashboard", label: "DeFi Dashboard", description: "DeFi protocols and TVL rankings", keywords: ["defi", "tvl", "protocol", "aave", "lido", "uniswap", "maker", "locked", "yield"], icon: Activity, category: "widget", action: () => handleWidgetAction("defi-dashboard") },
    { id: "liquidations", label: "Liquidations", description: "Futures liquidation feed", keywords: ["liquidation", "rekt", "long", "short", "leverage", "futures", "margin", "cascade"], icon: Activity, category: "widget", action: () => handleWidgetAction("liquidations") },
    { id: "heatmap", label: "Market Heatmap", description: "Visual price performance map", keywords: ["heatmap", "heat", "map", "visual", "green", "red", "performance", "overview"], icon: Activity, category: "widget", action: () => handleWidgetAction("heatmap") },
    { id: "exchange-flows", label: "Exchange Flows", description: "ETH exchange inflow and outflow", keywords: ["exchange", "flow", "inflow", "outflow", "binance", "coinbase", "accumulation", "selling"], icon: Activity, category: "widget", action: () => handleWidgetAction("exchange-flows") },
    { id: "dominance-chart", label: "BTC Dominance", description: "Bitcoin dominance and market share chart", keywords: ["dominance", "btc.d", "bitcoin dominance", "market share"], icon: PieChart, category: "widget", action: () => handleWidgetAction("dominance-chart") },
    { id: "funding-rates", label: "Funding Rates", description: "Perpetual futures funding rates from Binance", keywords: ["funding", "rate", "perpetual", "futures", "perp"], icon: Percent, category: "widget", action: () => handleWidgetAction("funding-rates") },
    { id: "portfolio", label: "Portfolio", description: "Track your crypto holdings", keywords: ["portfolio", "holdings", "balance", "wallet", "pnl", "profit", "loss", "track"], icon: Wallet, category: "widget", action: () => handleWidgetAction("portfolio") },
    { id: "watchlist", label: "Watchlist", description: "Your saved coins to watch", keywords: ["watchlist", "watch", "favorite", "save", "star", "follow"], icon: Star, category: "widget", action: () => handleWidgetAction("watchlist") },
    { id: "converter", label: "Converter", description: "Convert between crypto and fiat", keywords: ["convert", "swap", "exchange", "calculator", "usd", "eur", "fiat"], icon: ArrowLeftRight, category: "widget", action: () => handleWidgetAction("converter") },
    { id: "pnl-calculator", label: "P&L Calculator", description: "Calculate profit and loss", keywords: ["pnl", "profit", "loss", "calculate", "margin", "roi", "return"], icon: Calculator, category: "widget", action: () => handleWidgetAction("pnl-calculator") },
    { id: "notes", label: "Notes", description: "Personal notes and annotations", keywords: ["note", "memo", "annotation", "write", "text", "scratch"], icon: StickyNote, category: "widget", action: () => handleWidgetAction("notes") },
    { id: "alerts", label: "Alerts", description: "Price alerts and notifications", keywords: ["alert", "notification", "alarm", "trigger", "price alert"], icon: BellRing, category: "widget", action: () => handleWidgetAction("alerts") },
    { id: "chat", label: "Market Chat", description: "Community chat room", keywords: ["chat", "message", "talk", "discuss", "community", "room"], icon: MessagesSquare, category: "widget", action: () => handleWidgetAction("chat") },
    { id: "news", label: "Crypto News", description: "Latest crypto headlines", keywords: ["news", "headline", "article", "blog", "media", "press", "update"], icon: Newspaper, category: "widget", action: () => handleWidgetAction("news") },
    { id: "wallet-tracker", label: "Wallet Tracker", description: "Look up any Ethereum wallet", keywords: ["wallet", "address", "etherscan", "balance", "lookup", "track", "0x"], icon: Search, category: "widget", action: () => handleWidgetAction("wallet-tracker") },
    { id: "token-screener", label: "Token Screener", description: "Filter and scan tokens by market cap, volume, and price change", keywords: ["screener", "filter", "scan", "screen", "find"], icon: Filter, category: "widget", action: () => handleWidgetAction("token-screener") },
    { id: "multi-chart", label: "Multi Chart", description: "View 2-4 charts side by side", keywords: ["multi", "chart", "compare", "grid", "side"], icon: LayoutGrid, category: "widget", action: () => handleWidgetAction("multi-chart") },
    { id: "trade-journal", label: "Trade Journal", description: "Log and review your trades with P&L tracking", keywords: ["journal", "trade", "log", "diary", "record", "history"], icon: BookOpen, category: "widget", action: () => handleWidgetAction("trade-journal") },
    { id: "correlation-matrix", label: "Correlation Matrix", description: "Price correlation between crypto assets", keywords: ["correlation", "matrix", "compare", "relation", "pearson"], icon: Grid3x3, category: "widget", action: () => handleWidgetAction("correlation-matrix") },
    { id: "dex-prices", label: "DEX Prices", description: "Trending DEX tokens from DexScreener", keywords: ["dex", "decentralized", "uniswap", "raydium", "memecoin", "new token", "dexscreener"], icon: Zap, category: "widget", action: () => handleWidgetAction("dex-prices") },
    { id: "nft-tracker", label: "NFT Floor Prices", description: "Top NFT collection floor prices", keywords: ["nft", "floor", "collection", "opensea", "bored ape", "punk", "art"], icon: Image, category: "widget", action: () => handleWidgetAction("nft-tracker") },
    { id: "onchain-metrics", label: "On-Chain Metrics", description: "Bitcoin blockchain analytics and metrics", keywords: ["onchain", "on-chain", "hash", "hashrate", "difficulty", "addresses", "blockchain"], icon: Cpu, category: "widget", action: () => handleWidgetAction("onchain-metrics") },
    { id: "staking-calculator", label: "Staking Calculator", description: "Calculate staking rewards and yields", keywords: ["staking", "stake", "yield", "apy", "rewards", "validator"], icon: Coins, category: "widget", action: () => handleWidgetAction("staking-calculator") },
    { id: "trading-signals", label: "Trading Signals", description: "Community trading signals with upvotes", keywords: ["signal", "signals", "call", "bullish", "bearish", "community"], icon: Radio, category: "widget", action: () => handleWidgetAction("trading-signals") },
    { id: "user-badges", label: "Badges & Levels", description: "Your achievements, badges, and XP level", keywords: ["badge", "level", "xp", "achievement", "gamification", "rank"], icon: Award, category: "widget", action: () => handleWidgetAction("user-badges") },
    { id: "theme-creator", label: "Theme Creator", description: "Create and manage custom color themes", keywords: ["theme", "color", "custom", "creator", "palette", "design", "skin"], icon: Palette, category: "widget", action: () => handleWidgetAction("theme-creator") },
    { id: "private-messages", label: "Messages", description: "Private messages", keywords: ["dm", "pm", "private", "inbox", "direct"], icon: MessageSquare, category: "widget", action: () => handleWidgetAction("private-messages") },
    { id: "x-feed", label: "X / Twitter Feed", description: "Live crypto posts from X/Twitter", keywords: ["twitter", "x", "tweet", "social", "feed", "whale alert", "crypto twitter", "ct"], icon: Hash, category: "widget", action: () => handleWidgetAction("x-feed") },
    { id: "catalog", label: "Widget Catalog", description: "Browse and add widgets", keywords: ["widget", "catalog", "add", "browse", "panel", "all"], icon: BarChart3, category: "action", action: () => setCatalogOpen(true) },
  ]

  // Sort priority: F-keys first (by number), then letters A-Z, then digits, then no shortcut
  function shortcutSortKey(id: string): string {
    const sc = WIDGET_SHORTCUT[id]
    if (!sc) return "ZZZ" // no shortcut → end
    if (sc.startsWith("F") && sc.length > 1) {
      const num = parseInt(sc.slice(1), 10)
      return `A${num.toString().padStart(2, "0")}` // F1→A01, F12→A12
    }
    if (/^\d$/.test(sc)) return `C${sc}` // digits after letters
    return `B${sc}` // letters
  }

  const filtered = (query.trim() === ""
    ? commands
    : commands.filter(cmd => {
        const q = query.toLowerCase()
        return cmd.label.toLowerCase().includes(q) ||
          cmd.description.toLowerCase().includes(q) ||
          (cmd.keywords?.some(kw => kw.toLowerCase().includes(q)) ?? false)
      })
  ).sort((a, b) => shortcutSortKey(a.id).localeCompare(shortcutSortKey(b.id)))

  useEffect(() => {
    startTransition(() => setSelectedIndex(0))
  }, [query])

  // Ctrl+K or / to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSelect = (cmd: CommandItem) => {
    cmd.action()
    setQuery("")
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
      setQuery("")
      inputRef.current?.blur()
      return
    }

    if (!isOpen || filtered.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % filtered.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      handleSelect(filtered[selectedIndex])
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Inline search bar */}
      <div className="flex items-center gap-2.5 border-b border-border/40 bg-secondary/20 px-3 py-1">
        <Terminal className="size-3.5 text-primary/70 shrink-0" />
        <span className="text-xs font-bold text-primary/60 shrink-0 font-mono">{">"}</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay so click on dropdown item can fire before closing
            setTimeout(() => {
              if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
                setIsOpen(false)
              }
            }, 150)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search commands, widgets, actions..."
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none font-mono"
          aria-label="Command bar search"
        />
        <div className="flex items-center gap-2">
          <kbd className="hidden sm:inline-flex rounded border border-border/40 bg-secondary/60 px-1.5 py-0.5 text-[8px] text-muted-foreground/60 font-mono">
            Ctrl+K
          </kbd>
          <Search className="size-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Dropdown results */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-80 overflow-y-auto border-b border-x border-border bg-card animate-dropdown">
          {!query.trim() && coins.length > 0 && (
            <div className="border-b border-border px-2 py-1.5">
              <span className="text-[8px] text-muted-foreground/50 uppercase tracking-[0.15em] font-medium">Quick Prices</span>
              <div className="mt-1 flex flex-col gap-0.5">
                {coins.slice(0, 5).map(coin => (
                  <div key={coin.id} className="flex items-center gap-2 px-1 py-0.5 text-[10px]">
                    <span className="text-foreground font-bold w-10 truncate">{coin.symbol?.toUpperCase()}</span>
                    <span className="text-foreground num">${coin.current_price?.toLocaleString()}</span>
                    <span className={coin.price_change_percentage_24h >= 0 ? "text-positive" : "text-negative"}>
                      {coin.price_change_percentage_24h >= 0 ? "+" : ""}{coin.price_change_percentage_24h?.toFixed(1)}%
                    </span>
                    <MiniSparkline prices={coin.sparkline_in_7d?.price || []} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            const isActive = cmd.category === "widget" && isWidgetActive(cmd.id)
            const q = query.toLowerCase()
            const matchedKeyword = query.trim() && cmd.keywords?.find(kw => kw.toLowerCase().includes(q))
            const isKeywordMatch = matchedKeyword && !cmd.label.toLowerCase().includes(q) && !cmd.description.toLowerCase().includes(q)
            return (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 px-3 py-1.5 text-left transition-all duration-100 ${
                  i === selectedIndex
                    ? "bg-primary/8 text-primary border-l-2 border-l-primary/60"
                    : "text-foreground/70 hover:bg-secondary/30 border-l-2 border-l-transparent"
                }`}
              >
                <Icon className={`size-4 shrink-0 ${isActive ? "text-primary" : "opacity-60"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium font-mono">{(() => {
                      if (!query.trim()) return cmd.label
                      const idx = cmd.label.toLowerCase().indexOf(query.toLowerCase())
                      if (idx === -1) return cmd.label
                      return (
                        <>
                          {cmd.label.slice(0, idx)}
                          <span className="text-primary">{cmd.label.slice(idx, idx + query.length)}</span>
                          {cmd.label.slice(idx + query.length)}
                        </>
                      )
                    })()}</span>
                    {isActive && (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">OPEN</span>
                    )}
                    {isKeywordMatch && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono text-primary/70">{matchedKeyword}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{cmd.description}</span>
                </div>
                {WIDGET_SHORTCUT[cmd.id] && (
                  <kbd className="shrink-0 inline-flex items-center justify-center min-w-[22px] h-[20px] rounded border border-border bg-secondary px-1.5 text-[9px] font-mono font-bold text-muted-foreground">
                    {WIDGET_SHORTCUT[cmd.id]}
                  </kbd>
                )}
                {cmd.category === "widget" && (
                  <button
                    onClick={(e) => handleWidgetToggle(e, cmd.id)}
                    className={`shrink-0 p-1 rounded transition-colors ${
                      isActive
                        ? "text-primary hover:text-red-400 hover:bg-red-400/10"
                        : "text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
                    }`}
                    title={isActive ? "Hide widget" : "Show widget"}
                  >
                    {isActive ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
