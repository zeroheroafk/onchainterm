"use client"

import { useRef, useCallback, memo, useMemo, lazy, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { useLayout } from "./layout-context"
import { WidgetWrapper } from "./widget-wrapper"
import { WidgetErrorBoundary } from "./widget-error-boundary"
import { getWidgetDef, type TerminalWidgetContext, type WidgetId } from "./widget-registry"
import type { WidgetPosition } from "./default-layouts"

// Lazy-loaded widget imports
const PriceTableWidget = lazy(() => import("@/components/terminal/price-table-widget").then(m => ({ default: m.PriceTableWidget })))
const PriceChart = lazy(() => import("@/components/terminal/price-chart").then(m => ({ default: m.PriceChart })))
const MarketOverview = lazy(() => import("@/components/terminal/market-overview").then(m => ({ default: m.MarketOverview })))
const TopMovers = lazy(() => import("@/components/terminal/top-movers").then(m => ({ default: m.TopMovers })))
const TrendingWidget = lazy(() => import("@/components/terminal/trending").then(m => ({ default: m.TrendingWidget })))
const GasTracker = lazy(() => import("@/components/terminal/gas-tracker").then(m => ({ default: m.GasTracker })))
const PortfolioWidget = lazy(() => import("@/components/terminal/portfolio").then(m => ({ default: m.PortfolioWidget })))
const ConverterWidget = lazy(() => import("@/components/terminal/converter").then(m => ({ default: m.ConverterWidget })))
const NotesWidget = lazy(() => import("@/components/terminal/notes-widget").then(m => ({ default: m.NotesWidget })))
const NewsWidget = lazy(() => import("@/components/terminal/news-widget").then(m => ({ default: m.NewsWidget })))
const ChatWidget = lazy(() => import("@/components/terminal/chat-widget").then(m => ({ default: m.ChatWidget })))
const WhaleAlerts = lazy(() => import("@/components/terminal/whale-alerts").then(m => ({ default: m.WhaleAlerts })))
const FearGreedIndex = lazy(() => import("@/components/terminal/fear-greed").then(m => ({ default: m.FearGreedIndex })))
const DefiDashboard = lazy(() => import("@/components/terminal/defi-dashboard").then(m => ({ default: m.DefiDashboard })))
const LiquidationsFeed = lazy(() => import("@/components/terminal/liquidations").then(m => ({ default: m.LiquidationsFeed })))
const Heatmap = lazy(() => import("@/components/terminal/heatmap").then(m => ({ default: m.Heatmap })))
const ExchangeFlows = lazy(() => import("@/components/terminal/exchange-flows").then(m => ({ default: m.ExchangeFlows })))
const WatchlistWidget = lazy(() => import("@/components/terminal/watchlist").then(m => ({ default: m.WatchlistWidget })))
const PnlCalculator = lazy(() => import("@/components/terminal/pnl-calculator").then(m => ({ default: m.PnlCalculator })))
const WalletTracker = lazy(() => import("@/components/terminal/wallet-tracker").then(m => ({ default: m.WalletTracker })))

function WidgetLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}

interface WidgetGridProps {
  context: TerminalWidgetContext
}

function renderWidget(widgetId: WidgetId, ctx: TerminalWidgetContext) {
  switch (widgetId) {
    case "price-table":
      return <PriceTableWidget onSelectSymbol={ctx.setChartSymbol} />
    case "price-chart":
      return <PriceChart key={ctx.chartSymbol} symbol={ctx.chartSymbol} />
    case "market-overview":
      return <MarketOverview />
    case "top-movers":
      return <TopMovers />
    case "trending":
      return <TrendingWidget />
    case "coin-detail":
      return <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">Coin detail coming soon</div>
    case "gas-tracker":
      return <GasTracker />
    case "whale-alerts":
      return <WhaleAlerts />
    case "fear-greed":
      return <FearGreedIndex />
    case "defi-dashboard":
      return <DefiDashboard />
    case "liquidations":
      return <LiquidationsFeed />
    case "heatmap":
      return <Heatmap />
    case "exchange-flows":
      return <ExchangeFlows />
    case "portfolio":
      return <PortfolioWidget />
    case "watchlist":
      return <WatchlistWidget />
    case "converter":
      return <ConverterWidget />
    case "pnl-calculator":
      return <PnlCalculator />
    case "notes":
      return <NotesWidget />
    case "alerts":
      return <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">Alerts coming soon</div>
    case "wallet-tracker":
      return <WalletTracker />
    case "chat":
      return <ChatWidget />
    case "news":
      return <NewsWidget />
    case "private-messages":
      return <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">Messages coming soon</div>
    default: {
      const _exhaustive: never = widgetId
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
          Unknown widget: {_exhaustive}
        </div>
      )
    }
  }
}

// ─── Draggable/Resizable Widget Item ─────────────────────────────────────

interface FreeWidgetProps {
  pos: WidgetPosition
  isLocked: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  context: TerminalWidgetContext
}

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

const FreeWidget = memo(function FreeWidget({ pos, isLocked, containerRef, context }: FreeWidgetProps) {
  const { updateWidgetPosition, bringToFront, removeWidget, widgetRefs } = useLayout()
  const def = getWidgetDef(pos.id)
  const elRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const isDraggingRef = useRef(false)

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isLocked) return
      e.preventDefault()
      e.stopPropagation()

      const container = containerRef.current
      const el = elRef.current
      if (!container || !el) return

      bringToFront(pos.id)
      isDraggingRef.current = true
      el.classList.add("widget-dragging")

      const rect = container.getBoundingClientRect()
      const startMouseX = e.clientX
      const startMouseY = e.clientY
      const startPosX = pos.x
      const startPosY = pos.y
      let finalX = startPosX
      let finalY = startPosY

      const onMouseMove = (ev: MouseEvent) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          const dx = ((ev.clientX - startMouseX) / rect.width) * 100
          const dy = ((ev.clientY - startMouseY) / rect.height) * 100
          finalX = Math.max(0, Math.min(100 - pos.w, startPosX + dx))
          finalY = Math.max(0, Math.min(100 - pos.h, startPosY + dy))
          const translateX = ((finalX - startPosX) / 100) * rect.width
          const translateY = ((finalY - startPosY) / 100) * rect.height
          el.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`
        })
      }

      const onMouseUp = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
        isDraggingRef.current = false
        el.style.transform = ""
        el.classList.remove("widget-dragging")
        updateWidgetPosition(pos.id, { x: finalX, y: finalY })
      }

      document.body.style.userSelect = "none"
      document.body.style.cursor = "grabbing"
      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    },
    [isLocked, pos.id, pos.x, pos.y, pos.w, pos.h, containerRef, updateWidgetPosition, bringToFront]
  )

  const handleResizeStart = useCallback(
    (edge: ResizeEdge) => (e: React.MouseEvent) => {
      if (isLocked) return
      e.preventDefault()
      e.stopPropagation()

      const container = containerRef.current
      const el = elRef.current
      if (!container || !el) return

      bringToFront(pos.id)
      isDraggingRef.current = true
      el.classList.add("widget-dragging")

      const rect = container.getBoundingClientRect()
      const startMouseX = e.clientX
      const startMouseY = e.clientY
      const startX = pos.x
      const startY = pos.y
      const startW = pos.w
      const startH = pos.h
      const minW = def ? (def.minSize.w / rect.width) * 100 : 10
      const minH = def ? (def.minSize.h / rect.height) * 100 : 10

      const resizesLeft = edge.includes("w")
      const resizesRight = edge.includes("e")
      const resizesTop = edge.includes("n")
      const resizesBottom = edge.includes("s")

      const cursorMap: Record<ResizeEdge, string> = {
        n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
        ne: "ne-resize", nw: "nw-resize", se: "se-resize", sw: "sw-resize",
      }

      let finalUpdate: Partial<WidgetPosition> = {}

      const onMouseMove = (ev: MouseEvent) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          const dx = ((ev.clientX - startMouseX) / rect.width) * 100
          const dy = ((ev.clientY - startMouseY) / rect.height) * 100
          const update: Partial<WidgetPosition> = {}
          let newX = startX, newY = startY, newW = startW, newH = startH

          if (resizesRight) { newW = Math.max(minW, Math.min(100 - startX, startW + dx)); update.w = newW }
          if (resizesBottom) { newH = Math.max(minH, Math.min(100 - startY, startH + dy)); update.h = newH }
          if (resizesLeft) {
            const maxDx = startW - minW
            const clampedDx = Math.max(-startX, Math.min(maxDx, dx))
            newX = startX + clampedDx; newW = startW - clampedDx
            update.x = newX; update.w = newW
          }
          if (resizesTop) {
            const maxDy = startH - minH
            const clampedDy = Math.max(-startY, Math.min(maxDy, dy))
            newY = startY + clampedDy; newH = startH - clampedDy
            update.y = newY; update.h = newH
          }

          const translateX = ((newX - startX) / 100) * rect.width
          const translateY = ((newY - startY) / 100) * rect.height
          if (translateX !== 0 || translateY !== 0) {
            el.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`
          }
          if (update.w !== undefined) el.style.width = `${newW}%`
          if (update.h !== undefined) el.style.height = `${newH}%`
          finalUpdate = update
        })
      }

      const onMouseUp = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
        isDraggingRef.current = false
        el.style.transform = ""
        el.classList.remove("widget-dragging")
        if (Object.keys(finalUpdate).length > 0) {
          updateWidgetPosition(pos.id, finalUpdate)
        }
      }

      document.body.style.userSelect = "none"
      document.body.style.cursor = cursorMap[edge]
      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    },
    [isLocked, pos.id, pos.x, pos.y, pos.w, pos.h, containerRef, def, updateWidgetPosition, bringToFront]
  )

  const handleMouseDown = useCallback(() => {
    if (!isDraggingRef.current) bringToFront(pos.id)
  }, [pos.id, bringToFront])

  if (!def) return null

  return (
    <div
      ref={elRef}
      className="absolute widget-positioned"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        height: `${pos.h}%`,
        zIndex: pos.zIndex,
        padding: "2px",
      }}
      onMouseDown={handleMouseDown}
    >
      <WidgetWrapper
        ref={(el: HTMLDivElement | null) => { widgetRefs.current[pos.id] = el }}
        title={def.fallbackTitle}
        icon={def.icon}
        isLocked={isLocked}
        onRemove={() => removeWidget(pos.id)}
        onDragStart={handleDragStart}
      >
        <WidgetErrorBoundary widgetTitle={def.fallbackTitle}>
          <Suspense fallback={<WidgetLoadingFallback />}>
            {renderWidget(pos.id as WidgetId, context)}
          </Suspense>
        </WidgetErrorBoundary>
      </WidgetWrapper>

      {!isLocked && (
        <>
          <div className="absolute top-0 left-2 right-2 h-2 cursor-ns-resize z-10" onMouseDown={handleResizeStart("n")} />
          <div className="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize z-10" onMouseDown={handleResizeStart("s")} />
          <div className="absolute left-0 top-2 bottom-2 w-2 cursor-ew-resize z-10" onMouseDown={handleResizeStart("w")} />
          <div className="absolute right-0 top-2 bottom-2 w-2 cursor-ew-resize z-10" onMouseDown={handleResizeStart("e")} />
          <div className="absolute top-0 left-0 size-4 cursor-nw-resize z-10" onMouseDown={handleResizeStart("nw")} />
          <div className="absolute top-0 right-0 size-4 cursor-ne-resize z-10" onMouseDown={handleResizeStart("ne")} />
          <div className="absolute bottom-0 left-0 size-4 cursor-sw-resize z-10" onMouseDown={handleResizeStart("sw")} />
          <div className="absolute bottom-0 right-0 size-4 cursor-se-resize z-10" onMouseDown={handleResizeStart("se")}>
            <svg width="10" height="10" viewBox="0 0 10 10" className="absolute bottom-1 right-1 text-muted-foreground hover:text-primary transition-colors">
              <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
})

// ─── Main Grid ───────────────────────────────────────────────────────────

export function WidgetGrid({ context }: WidgetGridProps) {
  const { layout, activeWidgets, isLocked } = useLayout()
  const containerRef = useRef<HTMLDivElement>(null)

  const visiblePositions = useMemo(
    () => layout.filter((p) => activeWidgets.includes(p.id)),
    [layout, activeWidgets]
  )

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-hidden ${!isLocked ? "widget-grid-editing" : ""}`}
    >
      {visiblePositions.map((pos) => (
        <FreeWidget
          key={pos.id}
          pos={pos}
          isLocked={isLocked}
          containerRef={containerRef}
          context={context}
        />
      ))}
    </div>
  )
}
