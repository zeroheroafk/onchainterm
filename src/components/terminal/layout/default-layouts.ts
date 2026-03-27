export interface WidgetPosition {
  id: string
  x: number
  y: number
  w: number
  h: number
  zIndex: number
}

// Default: price-table left, chart+chat center, news right
export const DEFAULT_LAYOUT: WidgetPosition[] = [
  { id: "price-table",  x: 0,    y: 0,  w: 25, h: 100, zIndex: 1 },
  { id: "price-chart",  x: 25.5, y: 0,  w: 41, h: 42,  zIndex: 1 },
  { id: "chat",         x: 25.5, y: 43, w: 41, h: 57,  zIndex: 1 },
  { id: "news",         x: 67,   y: 0,  w: 33, h: 100, zIndex: 1 },
]

export const DEFAULT_ACTIVE_WIDGETS = ["price-table", "price-chart", "chat", "news"]

export const NEW_WIDGET_DEFAULT = { w: 40, h: 50 }

export interface LayoutPreset {
  id: string
  nameKey: string
  fallbackName: string
  layout: WidgetPosition[]
  activeWidgets: string[]
  builtIn: true
}

export interface CustomPreset {
  id: string
  name: string
  layout: WidgetPosition[]
  activeWidgets: string[]
  builtIn: false
  createdAt: string
}

export type AnyPreset = LayoutPreset | CustomPreset

export const BUILT_IN_PRESETS: LayoutPreset[] = [
  {
    id: "default",
    nameKey: "preset.default",
    fallbackName: "Default",
    builtIn: true,
    layout: DEFAULT_LAYOUT,
    activeWidgets: DEFAULT_ACTIVE_WIDGETS,
  },
  {
    id: "trader",
    nameKey: "preset.trader",
    fallbackName: "Trader",
    builtIn: true,
    layout: [
      { id: "price-table",   x: 0,    y: 0,  w: 22, h: 100, zIndex: 1 },
      { id: "price-chart",   x: 22.5, y: 0,  w: 38, h: 50,  zIndex: 1 },
      { id: "gas-tracker",   x: 22.5, y: 51, w: 18, h: 49,  zIndex: 1 },
      { id: "whale-alerts",  x: 41,   y: 51, w: 20, h: 49,  zIndex: 1 },
      { id: "news",          x: 61,   y: 0,  w: 20, h: 100, zIndex: 1 },
      { id: "chat",          x: 81.5, y: 0,  w: 18.5, h: 100, zIndex: 1 },
    ],
    activeWidgets: ["price-table", "price-chart", "gas-tracker", "whale-alerts", "news", "chat"],
  },
  {
    id: "analyst",
    nameKey: "preset.analyst",
    fallbackName: "Analyst",
    builtIn: true,
    layout: [
      { id: "price-table",      x: 0,    y: 0,  w: 20, h: 100, zIndex: 1 },
      { id: "price-chart",      x: 20.5, y: 0,  w: 40, h: 45,  zIndex: 1 },
      { id: "market-overview",  x: 20.5, y: 46, w: 40, h: 54,  zIndex: 1 },
      { id: "top-movers",       x: 61,   y: 0,  w: 39, h: 50,  zIndex: 1 },
      { id: "trending",         x: 61,   y: 51, w: 39, h: 49,  zIndex: 1 },
    ],
    activeWidgets: ["price-table", "price-chart", "market-overview", "top-movers", "trending"],
  },
  {
    id: "compact",
    nameKey: "preset.compact",
    fallbackName: "Compact",
    builtIn: true,
    layout: [
      { id: "price-table",  x: 0,    y: 0, w: 30, h: 100, zIndex: 1 },
      { id: "price-chart",  x: 30.5, y: 0, w: 35, h: 100, zIndex: 1 },
      { id: "news",         x: 66,   y: 0, w: 34, h: 100, zIndex: 1 },
    ],
    activeWidgets: ["price-table", "price-chart", "news"],
  },
]
