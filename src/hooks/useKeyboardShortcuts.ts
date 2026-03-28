"use client"

import { useEffect, useState, useCallback } from "react"
import { useLayout } from "@/components/terminal/layout/layout-context"

// ─── Function keys (shown in the bar) ───
export const FN_KEY_MAP: Record<string, { widget?: string; action?: string; label: string }> = {
  F1:  { action: "help",       label: "HELP" },
  F2:  { action: "search",     label: "SEARCH" },
  F3:  { widget: "price-chart", label: "CHART" },
  F4:  { widget: "price-table", label: "PRICES" },
  F5:  { widget: "news",       label: "NEWS" },
  F6:  { widget: "portfolio",  label: "PORTFL" },
  F7:  { widget: "watchlist",  label: "WATCH" },
  F8:  { widget: "chat",       label: "CHAT" },
  F9:  { widget: "trading-signals", label: "SIGNAL" },
  F10: { action: "presets",    label: "LAYOUT" },
  F11: { action: "fullscreen", label: "FULL" },
  F12: { widget: "theme-creator", label: "THEME" },
}

// ─── Letter keys (not in bar, shown in help modal) ───
export const LETTER_KEY_MAP: Record<string, string> = {
  g: "gas-tracker",
  w: "whale-alerts",
  d: "dex-prices",
  n: "nft-tracker",
  m: "multi-chart",
  j: "trade-journal",
  s: "staking-calculator",
  b: "user-badges",
  o: "onchain-metrics",
  c: "correlation-matrix",
  t: "token-screener",
  r: "funding-rates",
  a: "alerts",
  e: "exchange-flows",
  x: "exchange-flows",
  h: "heatmap",
  f: "fear-greed",
  l: "liquidations",
  i: "defi-dashboard",
  k: "converter",
  p: "pnl-calculator",
}

// ─── Descriptions for help modal ───
export const SHORTCUT_DESCRIPTIONS: { key: string; description: string }[] = [
  // Function keys
  { key: "F1", description: "Help — keyboard shortcuts" },
  { key: "F2", description: "Focus search bar" },
  { key: "F3", description: "Chart" },
  { key: "F4", description: "Crypto Prices" },
  { key: "F5", description: "News" },
  { key: "F6", description: "Portfolio" },
  { key: "F7", description: "Watchlist" },
  { key: "F8", description: "Chat" },
  { key: "F9", description: "Trading Signals" },
  { key: "F10", description: "Layout Presets" },
  { key: "F11", description: "Fullscreen" },
  { key: "F12", description: "Theme Creator" },
  // Letter keys
  { key: "G", description: "Gas Tracker" },
  { key: "W", description: "Whale Alerts" },
  { key: "D", description: "DEX Prices" },
  { key: "N", description: "NFT Tracker" },
  { key: "M", description: "Multi Chart" },
  { key: "J", description: "Trade Journal" },
  { key: "S", description: "Staking Calculator" },
  { key: "B", description: "Badges & Levels" },
  { key: "O", description: "On-Chain Metrics" },
  { key: "C", description: "Correlation Matrix" },
  { key: "T", description: "Token Screener" },
  { key: "R", description: "Funding Rates" },
  { key: "A", description: "Alerts" },
  { key: "E", description: "Exchange Flows" },
  { key: "H", description: "Heatmap" },
  { key: "F", description: "Fear & Greed" },
  { key: "L", description: "Liquidations" },
  { key: "I", description: "DeFi Dashboard" },
  { key: "K", description: "Converter" },
  { key: "P", description: "P&L Calculator" },
  // Special
  { key: "Esc", description: "Close modal / blur" },
  { key: "?", description: "Toggle this help" },
]

function isInputFocused(): boolean {
  const tag = (document.activeElement?.tagName ?? "").toLowerCase()
  if (tag === "input" || tag === "textarea" || tag === "select") return true
  if ((document.activeElement as HTMLElement)?.isContentEditable) return true
  return false
}

export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const { addWidget, removeWidget, isWidgetActive } = useLayout()

  const toggleWidget = useCallback((widgetId: string) => {
    if (isWidgetActive(widgetId)) {
      removeWidget(widgetId)
    } else {
      addWidget(widgetId)
    }
  }, [addWidget, removeWidget, isWidgetActive])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Escape always works (even in inputs)
      if (e.key === "Escape") {
        if (showHelp) { setShowHelp(false); return }
        if (showPresets) { setShowPresets(false); return }
        ;(document.activeElement as HTMLElement)?.blur?.()
        return
      }

      // Function keys work everywhere (even in inputs)
      const fnDef = FN_KEY_MAP[e.key]
      if (fnDef) {
        e.preventDefault()
        if (fnDef.action === "help") { setShowHelp(prev => !prev); return }
        if (fnDef.action === "search") {
          const input = document.querySelector<HTMLInputElement>('[aria-label="Command bar search"]')
          input?.focus()
          return
        }
        if (fnDef.action === "presets") { setShowPresets(prev => !prev); return }
        if (fnDef.action === "fullscreen") {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
          } else {
            document.documentElement.requestFullscreen().catch(() => {})
          }
          return
        }
        if (fnDef.widget) { toggleWidget(fnDef.widget); return }
      }

      // Letter keys only when not typing
      if (isInputFocused()) return

      if (e.key === "?") {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      const widgetId = LETTER_KEY_MAP[e.key.toLowerCase()]
      if (widgetId) {
        e.preventDefault()
        toggleWidget(widgetId)
      }
    },
    [showHelp, showPresets, toggleWidget]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return { showHelp, setShowHelp, showPresets, setShowPresets }
}
