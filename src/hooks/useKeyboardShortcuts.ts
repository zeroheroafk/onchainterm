"use client"

import { useEffect, useState, useCallback } from "react"
import { useLayout } from "@/components/terminal/layout/layout-context"

const SHORTCUT_MAP: Record<string, string> = {
  "1": "price-table",
  "2": "price-chart",
  "3": "news",
  "4": "portfolio",
  "5": "watchlist",
  "6": "gas-tracker",
  "7": "whale-alerts",
  "8": "chat",
  "9": "alerts",
}

export const SHORTCUT_DESCRIPTIONS: { key: string; description: string }[] = [
  { key: "1", description: "Toggle Crypto Prices" },
  { key: "2", description: "Toggle Chart" },
  { key: "3", description: "Toggle Crypto News" },
  { key: "4", description: "Toggle Portfolio" },
  { key: "5", description: "Toggle Watchlist" },
  { key: "6", description: "Toggle Gas Tracker" },
  { key: "7", description: "Toggle Whale Alerts" },
  { key: "8", description: "Toggle Market Chat" },
  { key: "9", description: "Toggle Alerts" },
  { key: "Esc", description: "Blur focused element" },
  { key: "?", description: "Show/hide shortcuts help" },
]

export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const { addWidget, removeWidget, isWidgetActive, bringToFront, focusWidget } = useLayout()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return
      if ((document.activeElement as HTMLElement)?.isContentEditable) return

      if (e.key === "Escape") {
        if (showHelp) {
          setShowHelp(false)
        } else {
          ;(document.activeElement as HTMLElement)?.blur?.()
        }
        return
      }

      if (e.key === "?") {
        e.preventDefault()
        setShowHelp((prev) => !prev)
        return
      }

      const widgetId = SHORTCUT_MAP[e.key]
      if (widgetId) {
        e.preventDefault()
        if (isWidgetActive(widgetId)) {
          removeWidget(widgetId)
        } else {
          addWidget(widgetId)
          bringToFront(widgetId)
          focusWidget(widgetId)
        }
      }
    },
    [showHelp, addWidget, removeWidget, isWidgetActive, bringToFront, focusWidget]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return { showHelp, setShowHelp }
}
