"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useTheme } from "@/lib/theme-context"

type LayoutMode = 2 | 3 | 4

const DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "BNB"]

const LAYOUT_LABELS: Record<LayoutMode, string> = {
  2: "1x2",
  3: "2+1",
  4: "2x2",
}

function toTradingViewSymbol(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/USDT$/, "")
  if (cleaned.includes(":")) return input.trim().toUpperCase()
  return `BINANCE:${cleaned}USDT`
}

/* ── Single chart pane ── */

function ChartPane({
  symbol,
  onSymbolChange,
  theme,
}: {
  symbol: string
  onSymbolChange: (s: string) => void
  theme: "dark" | "light"
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const [inputValue, setInputValue] = useState(symbol)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep local input in sync when parent changes the symbol
  useEffect(() => {
    setInputValue(symbol)
  }, [symbol])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    // Fully clean up previous widget: remove iframe and all children
    if (scriptRef.current) {
      scriptRef.current.remove()
      scriptRef.current = null
    }
    // Remove any existing iframes the widget may have injected
    const existingIframes = container.querySelectorAll("iframe")
    existingIframes.forEach((iframe) => iframe.remove())
    // Clear remaining content
    container.innerHTML = ""

    setLoading(true)
    setError(null)

    const widgetDiv = document.createElement("div")
    widgetDiv.className = "tradingview-widget-container__widget"
    widgetDiv.style.height = "100%"
    widgetDiv.style.width = "100%"
    container.appendChild(widgetDiv)

    const tvSymbol = toTradingViewSymbol(symbol)

    const script = document.createElement("script")
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(128, 128, 128, 0.06)",
      hide_top_toolbar: true,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      support_host: "https://www.tradingview.com",
    })

    script.onload = () => {
      if (!cancelled) setLoading(false)
    }
    script.onerror = () => {
      if (!cancelled) {
        setLoading(false)
        setError("Failed to load TradingView widget")
      }
    }

    scriptRef.current = script
    container.appendChild(script)

    return () => {
      cancelled = true
      // Thorough cleanup to prevent memory leaks
      if (scriptRef.current) {
        scriptRef.current.remove()
        scriptRef.current = null
      }
      const iframes = container.querySelectorAll("iframe")
      iframes.forEach((iframe) => {
        try {
          iframe.src = "about:blank"
        } catch {
          // cross-origin iframe, just remove it
        }
        iframe.remove()
      })
      container.innerHTML = ""
    }
  }, [symbol, theme])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = inputValue.trim()
      if (val) onSymbolChange(val.toUpperCase())
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border border-border/40 rounded-md">
      {/* symbol input bar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 border-b border-border/40">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            const val = inputValue.trim()
            if (val && val.toUpperCase() !== symbol) {
              onSymbolChange(val.toUpperCase())
            }
          }}
          className="w-24 bg-transparent text-xs font-mono px-1.5 py-0.5 rounded border border-border/50 focus:outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground"
          placeholder="Symbol"
        />
        <span className="text-[10px] text-muted-foreground select-none">
          USDT
        </span>
      </div>
      {/* chart */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="animate-fade-in absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs text-muted-foreground">
                Loading {symbol} chart...
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <span className="text-xs text-red-500">{error}</span>
          </div>
        )}
        <div
          ref={containerRef}
          className="tradingview-widget-container h-full w-full"
        />
      </div>
    </div>
  )
}

/* ── Multi-chart layout ── */

export function MultiChart() {
  const { themeId } = useTheme()
  const isDark = themeId !== "light"
  const tvTheme = isDark ? "dark" : "light"

  const [layout, setLayout] = useState<LayoutMode>(4)
  const [symbols, setSymbols] = useState<string[]>([...DEFAULT_SYMBOLS])

  const updateSymbol = useCallback((index: number, value: string) => {
    setSymbols((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  // CSS grid templates per layout
  const gridStyle: React.CSSProperties =
    layout === 2
      ? { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr" }
      : layout === 3
        ? {
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
          }
        : { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" }

  const visibleCount = layout

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-muted/20 shrink-0">
        <span className="text-xs font-medium text-foreground/80">
          Multi-Chart
        </span>
        <div className="flex items-center gap-1">
          {([2, 3, 4] as LayoutMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setLayout(mode)}
              className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors ${
                layout === mode
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              }`}
            >
              {LAYOUT_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* chart grid */}
      <div
        key={visibleCount}
        className="tab-content flex-1 min-h-0 grid gap-1 p-1"
        style={gridStyle}
      >
        {Array.from({ length: visibleCount }).map((_, i) => {
          // For 3-chart layout, make the third chart span full width
          const span =
            layout === 3 && i === 2
              ? { gridColumn: "1 / -1" }
              : undefined

          return (
            <div key={i} style={span} className="min-h-0 min-w-0">
              <ChartPane
                symbol={symbols[i] ?? DEFAULT_SYMBOLS[i]}
                onSymbolChange={(s) => updateSymbol(i, s)}
                theme={tvTheme}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
