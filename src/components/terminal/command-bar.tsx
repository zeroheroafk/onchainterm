"use client"

import { useState, useEffect, useRef, useCallback, startTransition } from "react"
import {
  Search, ArrowRight, Terminal,
  LineChart, MessagesSquare, Newspaper, BarChart3, TrendingUp, Flame, Fuel, Wallet, Star,
  ArrowLeftRight, Calculator, StickyNote, BellRing, MessageSquare, Activity, TrendingDown,
} from "lucide-react"
import { useLayout } from "@/components/terminal/layout/layout-context"

interface CommandItem {
  id: string
  label: string
  description: string
  keywords?: string[]
  icon: React.ElementType
  category: "widget" | "action"
  action: () => void
}

export function CommandBar() {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isWidgetActive, focusWidget, addWidget, bringToFront, isLocked, setCatalogOpen } = useLayout()

  const handleWidgetAction = useCallback((widgetId: string) => {
    if (isWidgetActive(widgetId)) {
      focusWidget(widgetId)
      bringToFront(widgetId)
    } else {
      addWidget(widgetId)
    }
  }, [isWidgetActive, focusWidget, addWidget, bringToFront])

  const commands: CommandItem[] = [
    { id: "price-table", label: "Crypto Prices", description: "Live price table with market data", keywords: ["btc", "eth", "bitcoin", "ethereum", "price", "market", "token", "coin", "spot", "rank", "cap"], icon: BarChart3, category: "widget", action: () => handleWidgetAction("price-table") },
    { id: "price-chart", label: "Price Chart", description: "Interactive price chart with timeframes", keywords: ["chart", "graph", "candle", "line", "trend", "technical", "ta", "trading view"], icon: LineChart, category: "widget", action: () => handleWidgetAction("price-chart") },
    { id: "market-overview", label: "Market Overview", description: "Global market stats and dominance", keywords: ["market", "global", "dominance", "btc.d", "total", "volume", "mcap", "overview"], icon: Activity, category: "widget", action: () => handleWidgetAction("market-overview") },
    { id: "top-movers", label: "Top Movers", description: "Biggest gainers and losers", keywords: ["gainer", "loser", "mover", "pump", "dump", "rally", "crash", "top"], icon: TrendingUp, category: "widget", action: () => handleWidgetAction("top-movers") },
    { id: "trending", label: "Trending", description: "Trending coins right now", keywords: ["trending", "hot", "popular", "viral", "hype", "buzz", "degen"], icon: Flame, category: "widget", action: () => handleWidgetAction("trending") },
    { id: "coin-detail", label: "Coin Detail", description: "Detailed coin information", keywords: ["detail", "info", "token", "coin", "fundamental", "about", "supply"], icon: TrendingDown, category: "widget", action: () => handleWidgetAction("coin-detail") },
    { id: "gas-tracker", label: "Gas Tracker", description: "Ethereum gas prices and fees", keywords: ["gas", "gwei", "fee", "eth", "ethereum", "transaction", "base fee", "priority"], icon: Fuel, category: "widget", action: () => handleWidgetAction("gas-tracker") },
    { id: "whale-alerts", label: "Whale Alerts", description: "Large crypto transfers", keywords: ["whale", "alert", "transfer", "big", "move", "wallet", "exchange"], icon: Activity, category: "widget", action: () => handleWidgetAction("whale-alerts") },
    { id: "portfolio", label: "Portfolio", description: "Track your crypto holdings", keywords: ["portfolio", "holdings", "balance", "wallet", "pnl", "profit", "loss", "track"], icon: Wallet, category: "widget", action: () => handleWidgetAction("portfolio") },
    { id: "watchlist", label: "Watchlist", description: "Your saved coins to watch", keywords: ["watchlist", "watch", "favorite", "save", "star", "follow"], icon: Star, category: "widget", action: () => handleWidgetAction("watchlist") },
    { id: "converter", label: "Converter", description: "Convert between crypto and fiat", keywords: ["convert", "swap", "exchange", "calculator", "usd", "eur", "fiat"], icon: ArrowLeftRight, category: "widget", action: () => handleWidgetAction("converter") },
    { id: "pnl-calculator", label: "P&L Calculator", description: "Calculate profit and loss", keywords: ["pnl", "profit", "loss", "calculate", "margin", "roi", "return"], icon: Calculator, category: "widget", action: () => handleWidgetAction("pnl-calculator") },
    { id: "notes", label: "Notes", description: "Personal notes and annotations", keywords: ["note", "memo", "annotation", "write", "text", "scratch"], icon: StickyNote, category: "widget", action: () => handleWidgetAction("notes") },
    { id: "alerts", label: "Alerts", description: "Price alerts and notifications", keywords: ["alert", "notification", "alarm", "trigger", "price alert"], icon: BellRing, category: "widget", action: () => handleWidgetAction("alerts") },
    { id: "chat", label: "Market Chat", description: "Community chat room", keywords: ["chat", "message", "talk", "discuss", "community", "room"], icon: MessagesSquare, category: "widget", action: () => handleWidgetAction("chat") },
    { id: "news", label: "Crypto News", description: "Latest crypto headlines", keywords: ["news", "headline", "article", "blog", "media", "press", "update"], icon: Newspaper, category: "widget", action: () => handleWidgetAction("news") },
    { id: "wallet-tracker", label: "Wallet Tracker", description: "Look up any Ethereum wallet", keywords: ["wallet", "address", "etherscan", "balance", "lookup", "track", "0x"], icon: Search, category: "widget", action: () => handleWidgetAction("wallet-tracker") },
    { id: "private-messages", label: "Messages", description: "Private messages", keywords: ["dm", "pm", "private", "inbox", "direct"], icon: MessageSquare, category: "widget", action: () => handleWidgetAction("private-messages") },
    { id: "catalog", label: "Widget Catalog", description: "Browse and add widgets", keywords: ["widget", "catalog", "add", "browse", "panel", "all"], icon: BarChart3, category: "action", action: () => setCatalogOpen(true) },
  ]

  const filtered = query.trim() === ""
    ? []
    : commands.filter(cmd => {
        const q = query.toLowerCase()
        return cmd.label.toLowerCase().includes(q) ||
          cmd.description.toLowerCase().includes(q) ||
          (cmd.keywords?.some(kw => kw.toLowerCase().includes(q)) ?? false)
      })

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
      <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-4 py-1.5">
        <Terminal className="size-3.5 text-primary shrink-0" />
        <span className="text-xs font-bold text-primary shrink-0">{">"}</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => { if (query.trim()) setIsOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Search commands, widgets, actions..."
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
          aria-label="Command bar search"
        />
        <div className="flex items-center gap-2">
          <kbd className="hidden sm:inline-flex rounded border border-border bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground font-mono">
            Ctrl+K
          </kbd>
          <Search className="size-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Dropdown results */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-72 overflow-y-auto border-b border-x border-border bg-card shadow-lg">
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            const isActive = cmd.category === "widget" && isWidgetActive(cmd.id)
            const q = query.toLowerCase()
            const matchedKeyword = cmd.keywords?.find(kw => kw.toLowerCase().includes(q))
            const isKeywordMatch = matchedKeyword && !cmd.label.toLowerCase().includes(q) && !cmd.description.toLowerCase().includes(q)
            return (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-secondary/50"
                }`}
              >
                <Icon className="size-4 shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium font-mono">{cmd.label}</span>
                    {isActive && (
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    {isKeywordMatch && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono text-primary/70">{matchedKeyword}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{cmd.description}</span>
                </div>
                <ArrowRight className="size-3 shrink-0 opacity-30" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
