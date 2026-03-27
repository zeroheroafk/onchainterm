"use client"

import { useState, useCallback, useEffect } from "react"
import { Lock, Unlock, LayoutGrid, Palette } from "lucide-react"
import { ThemeProvider, useTheme, THEMES, type ThemeId } from "@/lib/theme-context"
import { LayoutProvider, useLayout } from "@/components/terminal/layout/layout-context"
import { WidgetGrid } from "@/components/terminal/layout/widget-grid"
import { WidgetCatalogDrawer } from "@/components/terminal/layout/widget-catalog-drawer"
import { PresetBar } from "@/components/terminal/layout/preset-bar"
import { CRTOverlay } from "@/components/effects/CRTOverlay"
import type { TerminalWidgetContext } from "@/components/terminal/layout/widget-registry"

function BloombergClock() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-[10px] text-foreground tabular-nums">{time}</span>
}

function TerminalHeader() {
  const { theme, themeId, setTheme } = useTheme()
  const [showThemes, setShowThemes] = useState(false)
  const isBloomberg = theme.bloombergMode

  return (
    <div className={`flex items-center justify-between border-b border-border px-3 shrink-0 ${isBloomberg ? "bg-card py-1" : "bg-card px-4 py-2"}`}>
      <div className="flex items-center gap-3">
        <h1 className={`font-bold uppercase tracking-widest text-primary ${isBloomberg ? "text-xs font-mono" : "text-sm"}`}>
          {isBloomberg ? "ONCHAINTERM" : "OnchainTerm"}
        </h1>
        {isBloomberg ? (
          <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono">
            <span className="text-muted-foreground">|</span>
            <span className="text-accent uppercase tracking-wider">CRYPTO MARKET INTELLIGENCE</span>
            <span className="text-muted-foreground">|</span>
            <BloombergClock />
          </div>
        ) : (
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider hidden sm:inline">
            Crypto Market Intelligence
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Theme picker */}
        <div className="relative">
          <button
            onClick={() => setShowThemes(!showThemes)}
            className={`flex items-center gap-1.5 border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${isBloomberg ? "" : "rounded-md"}`}
          >
            <Palette className="size-3" />
            <span className="hidden sm:inline">{THEMES.find(t => t.id === themeId)?.label}</span>
          </button>
          {showThemes && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowThemes(false)} />
              <div className={`absolute right-0 top-full mt-1 z-50 w-40 border border-border bg-card py-1 ${isBloomberg ? "" : "rounded-md shadow-xl"}`}>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id as ThemeId); setShowThemes(false) }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-[11px] transition-colors ${
                      themeId === t.id ? "text-primary bg-primary/10" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="flex gap-0.5">
                      <div className="size-3" style={{ background: t.swatch[0], border: "1px solid #333" }} />
                      <div className="size-3" style={{ background: t.swatch[1], border: "1px solid #333" }} />
                    </div>
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionBar() {
  const { isLocked, toggleLock, setCatalogOpen } = useLayout()
  const { theme } = useTheme()
  const isBloomberg = theme.bloombergMode

  return (
    <div className={`hidden md:flex items-center gap-1.5 border-b border-border bg-secondary/20 px-3 shrink-0 ${isBloomberg ? "py-0.5" : "py-1"}`}>
      <button
        onClick={toggleLock}
        className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium transition-colors ${
          !isLocked
            ? "bg-primary/15 text-primary border border-primary/30"
            : "text-muted-foreground border border-transparent hover:bg-secondary hover:text-foreground"
        } ${isBloomberg ? "" : "rounded-md"}`}
      >
        {isLocked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
        {isLocked ? "Locked" : "Editing"}
      </button>

      {!isLocked && (
        <button
          onClick={() => setCatalogOpen(true)}
          className={`flex items-center gap-1.5 border border-dashed border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary hover:bg-primary/5 ${isBloomberg ? "" : "rounded-md"}`}
        >
          <LayoutGrid className="size-3" />
          + Widgets
        </button>
      )}

      {isBloomberg && (
        <div className="ml-auto hidden lg:flex items-center gap-0 font-mono">
          <span className="bloomberg-fn-key">F1</span><span className="bloomberg-fn-label">HELP</span>
          <span className="bloomberg-fn-key">F5</span><span className="bloomberg-fn-label">CHART</span>
          <span className="bloomberg-fn-key">F8</span><span className="bloomberg-fn-label">NEWS</span>
          <span className="bloomberg-fn-key">F10</span><span className="bloomberg-fn-label">LAYOUT</span>
        </div>
      )}
    </div>
  )
}

function TerminalContent() {
  const [chartSymbol, setChartSymbol] = useState("bitcoin")
  const { theme } = useTheme()

  const context: TerminalWidgetContext = {
    chartSymbol,
    setChartSymbol: useCallback((s: string) => setChartSymbol(s), []),
  }

  return (
    <div className="flex h-screen flex-col">
      <TerminalHeader />
      <ActionBar />
      <WidgetGrid context={context} />
      <PresetBar />
      <WidgetCatalogDrawer />
      {theme.crtEffects && <CRTOverlay />}
    </div>
  )
}

export function TerminalPageClient() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <TerminalContent />
      </LayoutProvider>
    </ThemeProvider>
  )
}
