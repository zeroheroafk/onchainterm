"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Save, FolderOpen, Trash2, Layout, X } from "lucide-react"
import { useLayout } from "./layout/layout-context"
import type { WidgetPosition } from "./layout/default-layouts"

/* ── Built-in preset definitions ─────────────────────────────── */

const BUILT_IN_MANAGER_PRESETS: {
  id: string
  name: string
  activeWidgets: string[]
  layout: WidgetPosition[]
}[] = [
  {
    id: "builtin-trading",
    name: "Trading",
    activeWidgets: ["price-chart", "price-table", "top-movers", "gas-tracker", "whale-alerts"],
    layout: [
      { id: "price-chart",  x: 0,    y: 0,  w: 40, h: 50, zIndex: 1 },
      { id: "price-table",  x: 0,    y: 51, w: 40, h: 49, zIndex: 1 },
      { id: "top-movers",   x: 40.5, y: 0,  w: 30, h: 50, zIndex: 1 },
      { id: "gas-tracker",  x: 40.5, y: 51, w: 30, h: 49, zIndex: 1 },
      { id: "whale-alerts", x: 71,   y: 0,  w: 29, h: 100, zIndex: 1 },
    ],
  },
  {
    id: "builtin-research",
    name: "Research",
    activeWidgets: ["price-table", "news", "defi-dashboard", "correlation-matrix", "onchain-metrics"],
    layout: [
      { id: "price-table",        x: 0,    y: 0,  w: 25, h: 100, zIndex: 1 },
      { id: "news",               x: 25.5, y: 0,  w: 25, h: 50,  zIndex: 1 },
      { id: "defi-dashboard",     x: 25.5, y: 51, w: 25, h: 49,  zIndex: 1 },
      { id: "correlation-matrix", x: 51,   y: 0,  w: 25, h: 50,  zIndex: 1 },
      { id: "onchain-metrics",    x: 51,   y: 51, w: 49, h: 49,  zIndex: 1 },
    ],
  },
  {
    id: "builtin-defi",
    name: "DeFi",
    activeWidgets: ["defi-dashboard", "gas-tracker", "exchange-flows", "portfolio", "watchlist"],
    layout: [
      { id: "defi-dashboard", x: 0,    y: 0,  w: 35, h: 50,  zIndex: 1 },
      { id: "gas-tracker",    x: 0,    y: 51, w: 35, h: 49,  zIndex: 1 },
      { id: "exchange-flows", x: 35.5, y: 0,  w: 30, h: 100, zIndex: 1 },
      { id: "portfolio",      x: 66,   y: 0,  w: 34, h: 50,  zIndex: 1 },
      { id: "watchlist",      x: 66,   y: 51, w: 34, h: 49,  zIndex: 1 },
    ],
  },
  {
    id: "builtin-minimal",
    name: "Minimal",
    activeWidgets: ["price-chart", "price-table", "news"],
    layout: [
      { id: "price-chart", x: 0,    y: 0, w: 40, h: 100, zIndex: 1 },
      { id: "price-table", x: 40.5, y: 0, w: 30, h: 100, zIndex: 1 },
      { id: "news",        x: 71,   y: 0, w: 29, h: 100, zIndex: 1 },
    ],
  },
]

/* ── localStorage helpers ────────────────────────────────────── */

const STORAGE_KEY = "onchainterm_user_presets"

interface UserPreset {
  id: string
  name: string
  activeWidgets: string[]
  layout: WidgetPosition[]
  createdAt: string
}

function loadUserPresets(): UserPreset[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserPreset[]) : []
  } catch {
    return []
  }
}

function persistUserPresets(presets: UserPreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/* ── Component ───────────────────────────────────────────────── */

export function PresetManager({ externalOpen, onExternalClose }: { externalOpen?: boolean; onExternalClose?: () => void } = {}) {
  const {
    layout,
    activeWidgets,
    setLayout,
    addWidget,
    removeWidget,
  } = useLayout()

  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen ?? internalOpen
  const setOpen = useCallback((v: boolean) => {
    if (!v && onExternalClose) onExternalClose()
    setInternalOpen(v)
  }, [onExternalClose])
  const [userPresets, setUserPresets] = useState<UserPreset[]>(() => loadUserPresets())
  const [saveName, setSaveName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus the input when the panel opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open, setOpen])

  /* ── Save ─────────────────────────────────── */

  const handleSave = () => {
    const name = saveName.trim()
    if (!name) return

    const preset: UserPreset = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      activeWidgets: [...activeWidgets],
      layout: layout.map((p) => ({ ...p })),
      createdAt: new Date().toISOString(),
    }

    const updated = [...userPresets, preset]
    setUserPresets(updated)
    persistUserPresets(updated)
    setSaveName("")
  }

  /* ── Load ─────────────────────────────────── */

  const applyPreset = (preset: { activeWidgets: string[]; layout: WidgetPosition[] }) => {
    // Remove widgets not in the preset
    for (const wid of activeWidgets) {
      if (!preset.activeWidgets.includes(wid)) {
        removeWidget(wid)
      }
    }
    // Add widgets that are in the preset but not currently active
    for (const wid of preset.activeWidgets) {
      if (!activeWidgets.includes(wid)) {
        addWidget(wid)
      }
    }
    // Apply the full layout positions
    setLayout(preset.layout)
    setOpen(false)
  }

  /* ── Delete ───────────────────────────────── */

  const handleDelete = (id: string) => {
    const updated = userPresets.filter((p) => p.id !== id)
    setUserPresets(updated)
    persistUserPresets(updated)
  }

  /* ── Render ───────────────────────────────── */

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return ""
    }
  }

  return (
    <div className="relative inline-block">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
      >
        <FolderOpen className="size-3.5" />
        <span>Manage Presets</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card/95 backdrop-blur-md shadow-2xl shadow-black/30 ring-1 ring-white/5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layout className="size-4" />
              Layout Presets
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Save current layout */}
            <div className="border-b border-border px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Save Current Layout
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSave()
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Preset name..."
                  maxLength={30}
                  className="flex-1 rounded border border-border bg-secondary/30 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={!saveName.trim()}
                  className="flex items-center gap-1 rounded-md bg-primary/90 px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary disabled:opacity-40"
                >
                  <Save className="size-3" />
                  Save
                </button>
              </form>
            </div>

            {/* Built-in presets */}
            <div className="border-b border-border px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Built-in Presets
              </p>
              <div className="flex flex-col gap-1">
                {BUILT_IN_MANAGER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors duration-100 hover:bg-secondary"
                  >
                    <div>
                      <span className="font-medium text-foreground">
                        {preset.name}
                      </span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {preset.activeWidgets.length} widgets
                      </span>
                    </div>
                    <FolderOpen className="size-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* User presets */}
            <div className="px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Your Presets
              </p>
              {userPresets.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-muted-foreground/60">
                  No saved presets yet. Save your current layout above.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {userPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="group flex items-center justify-between rounded-md px-3 py-2 transition-colors duration-100 hover:bg-secondary"
                    >
                      <button
                        onClick={() => applyPreset(preset)}
                        className="flex-1 text-left"
                      >
                        <div className="text-xs font-medium text-foreground">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {preset.activeWidgets.length} widgets &middot;{" "}
                          {formatDate(preset.createdAt)}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(preset.id)
                        }}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        title="Delete preset"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
