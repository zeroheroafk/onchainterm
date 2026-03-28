"use client"

import {
  LineChart,
  MessagesSquare,
  Newspaper,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Flame,
  Fuel,
  Wallet,
  Star,
  ArrowLeftRight,
  Calculator,
  StickyNote,
  BellRing,
  MessageSquare,
  Activity,
  Search,
  Gauge,
  Layers,
  Zap,
  Grid3x3,
  ArrowUpDown,
  Filter,
  PieChart,
  Percent,
  type LucideIcon,
} from "lucide-react"

export interface WidgetProps {
  widgetId: string
  context: TerminalWidgetContext
}

export interface TerminalWidgetContext {
  chartSymbol: string
  setChartSymbol: (s: string) => void
}

export type WidgetId =
  | "price-table" | "price-chart" | "market-overview" | "top-movers" | "trending" | "coin-detail"
  | "gas-tracker" | "whale-alerts" | "fear-greed" | "defi-dashboard" | "liquidations" | "heatmap" | "exchange-flows"
  | "portfolio" | "watchlist" | "converter" | "pnl-calculator" | "notes" | "alerts" | "wallet-tracker"
  | "chat" | "news" | "private-messages"
  | "token-screener" | "dominance-chart"
  | "funding-rates"

export type WidgetCategory = "market" | "trade" | "tools" | "comms"

export interface WidgetDefinition {
  id: string
  titleKey: string
  fallbackTitle: string
  icon: LucideIcon
  category: WidgetCategory
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  singleton?: boolean
  requiresAuth?: boolean
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ─── Market ───
  {
    id: "price-table",
    titleKey: "widget.priceTable",
    fallbackTitle: "Crypto Prices",
    icon: BarChart3,
    category: "market",
    defaultSize: { w: 25, h: 100 },
    minSize: { w: 200, h: 250 },
    singleton: true,
  },
  {
    id: "price-chart",
    titleKey: "widget.priceChart",
    fallbackTitle: "Chart",
    icon: LineChart,
    category: "market",
    defaultSize: { w: 40, h: 42 },
    minSize: { w: 250, h: 200 },
  },
  {
    id: "market-overview",
    titleKey: "widget.marketOverview",
    fallbackTitle: "Market Overview",
    icon: Activity,
    category: "market",
    defaultSize: { w: 35, h: 40 },
    minSize: { w: 280, h: 200 },
    singleton: true,
  },
  {
    id: "top-movers",
    titleKey: "widget.topMovers",
    fallbackTitle: "Top Movers",
    icon: TrendingUp,
    category: "market",
    defaultSize: { w: 30, h: 50 },
    minSize: { w: 250, h: 250 },
    singleton: true,
  },
  {
    id: "trending",
    titleKey: "widget.trending",
    fallbackTitle: "Trending",
    icon: Flame,
    category: "market",
    defaultSize: { w: 30, h: 45 },
    minSize: { w: 220, h: 200 },
    singleton: true,
  },
  {
    id: "coin-detail",
    titleKey: "widget.coinDetail",
    fallbackTitle: "Coin Detail",
    icon: TrendingDown,
    category: "market",
    defaultSize: { w: 35, h: 55 },
    minSize: { w: 280, h: 280 },
    singleton: true,
  },
  // ─── Trade ───
  {
    id: "gas-tracker",
    titleKey: "widget.gasTracker",
    fallbackTitle: "Gas Tracker",
    icon: Fuel,
    category: "trade",
    defaultSize: { w: 25, h: 35 },
    minSize: { w: 200, h: 180 },
    singleton: true,
  },
  {
    id: "whale-alerts",
    titleKey: "widget.whaleAlerts",
    fallbackTitle: "ETH Whale Alerts",
    icon: Activity,
    category: "trade",
    defaultSize: { w: 35, h: 50 },
    minSize: { w: 280, h: 250 },
    singleton: true,
  },
  {
    id: "fear-greed",
    titleKey: "widget.fearGreed",
    fallbackTitle: "Fear & Greed",
    icon: Gauge,
    category: "market",
    defaultSize: { w: 25, h: 45 },
    minSize: { w: 220, h: 280 },
    singleton: true,
  },
  {
    id: "defi-dashboard",
    titleKey: "widget.defiDashboard",
    fallbackTitle: "DeFi Dashboard",
    icon: Layers,
    category: "market",
    defaultSize: { w: 35, h: 55 },
    minSize: { w: 280, h: 280 },
    singleton: true,
  },
  {
    id: "liquidations",
    titleKey: "widget.liquidations",
    fallbackTitle: "Liquidations",
    icon: Zap,
    category: "trade",
    defaultSize: { w: 30, h: 50 },
    minSize: { w: 250, h: 250 },
    singleton: true,
  },
  {
    id: "dominance-chart",
    titleKey: "widget.dominanceChart",
    fallbackTitle: "BTC Dominance",
    icon: PieChart,
    category: "market",
    defaultSize: { w: 30, h: 45 },
    minSize: { w: 250, h: 280 },
    singleton: true,
  },
  {
    id: "heatmap",
    titleKey: "widget.heatmap",
    fallbackTitle: "Market Heatmap",
    icon: Grid3x3,
    category: "market",
    defaultSize: { w: 40, h: 50 },
    minSize: { w: 300, h: 250 },
    singleton: true,
  },
  {
    id: "exchange-flows",
    titleKey: "widget.exchangeFlows",
    fallbackTitle: "Exchange Flows",
    icon: ArrowUpDown,
    category: "trade",
    defaultSize: { w: 30, h: 50 },
    minSize: { w: 250, h: 280 },
    singleton: true,
  },
  {
    id: "token-screener",
    titleKey: "widget.tokenScreener",
    fallbackTitle: "Token Screener",
    icon: Filter,
    category: "market",
    defaultSize: { w: 40, h: 50 },
    minSize: { w: 350, h: 300 },
    singleton: true,
  },
  {
    id: "funding-rates",
    titleKey: "widget.fundingRates",
    fallbackTitle: "Funding Rates",
    icon: Percent,
    category: "market",
    defaultSize: { w: 30, h: 55 },
    minSize: { w: 250, h: 280 },
    singleton: true,
  },
  // ─── Tools ───
  {
    id: "portfolio",
    titleKey: "widget.portfolio",
    fallbackTitle: "Portfolio",
    icon: Wallet,
    category: "tools",
    defaultSize: { w: 40, h: 55 },
    minSize: { w: 300, h: 280 },
    singleton: true,
  },
  {
    id: "watchlist",
    titleKey: "widget.watchlist",
    fallbackTitle: "Watchlist",
    icon: Star,
    category: "tools",
    defaultSize: { w: 25, h: 45 },
    minSize: { w: 200, h: 220 },
    singleton: true,
  },
  {
    id: "converter",
    titleKey: "widget.converter",
    fallbackTitle: "Converter",
    icon: ArrowLeftRight,
    category: "tools",
    defaultSize: { w: 28, h: 40 },
    minSize: { w: 220, h: 200 },
    singleton: true,
  },
  {
    id: "pnl-calculator",
    titleKey: "widget.pnlCalculator",
    fallbackTitle: "P&L Calculator",
    icon: Calculator,
    category: "tools",
    defaultSize: { w: 30, h: 45 },
    minSize: { w: 250, h: 250 },
    singleton: true,
  },
  {
    id: "notes",
    titleKey: "widget.notes",
    fallbackTitle: "Notes",
    icon: StickyNote,
    category: "tools",
    defaultSize: { w: 30, h: 50 },
    minSize: { w: 250, h: 250 },
    singleton: true,
  },
  {
    id: "alerts",
    titleKey: "widget.alerts",
    fallbackTitle: "Alerts",
    icon: BellRing,
    category: "tools",
    defaultSize: { w: 30, h: 55 },
    minSize: { w: 280, h: 300 },
    singleton: true,
  },
  {
    id: "wallet-tracker",
    titleKey: "widget.walletTracker",
    fallbackTitle: "Wallet Tracker",
    icon: Search,
    category: "tools",
    defaultSize: { w: 35, h: 55 },
    minSize: { w: 280, h: 280 },
    singleton: true,
  },
  // ─── Comms ───
  {
    id: "chat",
    titleKey: "widget.chat",
    fallbackTitle: "Market Chat",
    icon: MessagesSquare,
    category: "comms",
    defaultSize: { w: 40, h: 58 },
    minSize: { w: 250, h: 250 },
    singleton: true,
  },
  {
    id: "news",
    titleKey: "widget.news",
    fallbackTitle: "Crypto News",
    icon: Newspaper,
    category: "comms",
    defaultSize: { w: 33, h: 100 },
    minSize: { w: 200, h: 250 },
    singleton: true,
  },
  {
    id: "private-messages",
    titleKey: "widget.privateMessages",
    fallbackTitle: "Messages",
    icon: MessageSquare,
    category: "comms",
    defaultSize: { w: 35, h: 60 },
    minSize: { w: 280, h: 300 },
    singleton: true,
    requiresAuth: true,
  },
]

export function getWidgetDef(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id)
}

export const WIDGET_CATEGORIES: { key: WidgetCategory; labelKey: string; fallback: string }[] = [
  { key: "market", labelKey: "category.market", fallback: "Market" },
  { key: "trade", labelKey: "category.trade", fallback: "Trade" },
  { key: "tools", labelKey: "category.tools", fallback: "Tools" },
  { key: "comms", labelKey: "category.comms", fallback: "Comms" },
]

export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return WIDGET_REGISTRY.filter((w) => w.category === category)
}
