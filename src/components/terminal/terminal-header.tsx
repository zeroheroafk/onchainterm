"use client"

import { useState } from "react"
import { Palette, Volume2, VolumeX, Camera, PanelTop, Eye, EyeOff } from "lucide-react"
import { useTheme, THEMES, type ThemeId } from "@/lib/theme-context"
import { useLayout } from "@/components/terminal/layout/layout-context"
import { useScreenshot } from "@/hooks/useScreenshot"
import { useSound } from "@/lib/sound-context"
import { NotificationBell } from "@/components/terminal/notification-panel"
import { BloombergClock } from "@/components/terminal/bloomberg-clock"
import { UserMenu } from "@/components/terminal/user-menu"

export function TerminalHeader({ onToggleDashboardBar, onToggleActionBar, showDashboardBar, showActionBar, onShowHelp, onShowPresets }: { onToggleDashboardBar: () => void; onToggleActionBar: () => void; showDashboardBar: boolean; showActionBar: boolean; onShowHelp: () => void; onShowPresets: () => void }) {
  const { theme, themeId, setTheme } = useTheme()
  const { muted, toggleMute } = useSound()
  const { captureScreenshot } = useScreenshot()
  const { addWidget, removeWidget, isWidgetActive } = useLayout()
  const [showThemes, setShowThemes] = useState(false)
  const [showViewMenu, setShowViewMenu] = useState(false)
  const isBloomberg = theme.bloombergMode
  const isNeon = theme.neonMode

  const toggleWidget = (widgetId: string) => {
    if (isWidgetActive(widgetId)) removeWidget(widgetId)
    else addWidget(widgetId)
  }

  const handleFnClick = (key: string) => {
    switch (key) {
      case "F1": onShowHelp(); break
      case "F2": {
        const input = document.querySelector<HTMLInputElement>('[aria-label="Command bar search"]')
        input?.focus()
        break
      }
      case "F3": toggleWidget("price-chart"); break
      case "F4": toggleWidget("price-table"); break
      case "F5": toggleWidget("news"); break
      case "F6": toggleWidget("portfolio"); break
      case "F7": toggleWidget("watchlist"); break
      case "F8": toggleWidget("chat"); break
      case "F9": toggleWidget("trading-signals"); break
      case "F10": onShowPresets(); break
    }
  }

  const FN_KEYS = [
    { key: "F1", label: "HELP" },
    { key: "F2", label: "SRCH" },
    { key: "F3", label: "CHRT" },
    { key: "F4", label: "PRCE" },
    { key: "F5", label: "NEWS" },
    { key: "F6", label: "PORT" },
    { key: "F7", label: "WTCH" },
    { key: "F8", label: "CHAT" },
    { key: "F9", label: "SGNL" },
    { key: "F10", label: "LAYT" },
  ]

  return (
    <div className={`relative flex items-center justify-between border-b shrink-0 ${isBloomberg ? "bg-card border-border px-2 py-0.5" : "bg-card border-border/50 sm:px-4 px-2 py-1 sm:py-1"}`}>
      <div className="flex items-center gap-3">
        {isBloomberg ? (
          <h1 className="text-xs font-mono font-bold uppercase tracking-widest text-primary">
            ONCHAINTERM
          </h1>
        ) : (
          <h1 className={`flex items-center gap-0 ${isNeon ? "font-mono neon-glitch-text" : "font-heading"}`}>
            {/* Logo mark */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mr-1.5 shrink-0 opacity-80">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
              <path d="M8 16V11L12 8L16 11V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
              <circle cx="12" cy="12" r="2" fill="currentColor" className="text-primary/60" />
            </svg>
            <span className="text-xs font-normal tracking-[0.15em] uppercase text-foreground/90">
              Onchain
            </span>
            <span className="text-xs font-bold tracking-[0.15em] uppercase text-gradient">
              Term
            </span>
          </h1>
        )}
        <span className="live-dot" title="Live data connected" />
        {isNeon && <span className="neon-cursor" />}
        {isBloomberg ? (
          <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono">
            <span className="text-muted-foreground">|</span>
            <span className="text-accent uppercase tracking-wider">CRYPTO MARKET INTELLIGENCE</span>
            <span className="text-muted-foreground">|</span>
            <BloombergClock />
          </div>
        ) : isNeon ? (
          <span className="hidden sm:inline text-[9px] text-accent uppercase tracking-wider font-mono neon-text-pulse">
            {"// CRYPTO MARKET INTELLIGENCE"}
          </span>
        ) : (
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em] hidden sm:inline font-medium">
            Crypto Market Intelligence
          </span>
        )}
        {/* Inline F-key shortcuts */}
        {showActionBar && (
          <div className="hidden lg:flex items-center gap-px ml-2">
            {FN_KEYS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleFnClick(key)}
                className="flex items-center shrink-0 transition-all duration-100 hover:bg-secondary/50 active:bg-primary/20 px-0.5 py-0.5 rounded"
              >
                <span className={isBloomberg ? "bloomberg-fn-key" : "inline-flex items-center justify-center px-1 py-px text-[8px] font-bold text-primary/70 bg-primary/6 rounded-sm mr-0.5"}>{key}</span>
                <span className={isBloomberg ? "bloomberg-fn-label" : "text-[8px] text-muted-foreground/50 pr-1 font-medium"}>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />
        {/* User auth */}
        <UserMenu />
        {/* Sound toggle */}
        <button
          onClick={toggleMute}
          className={`flex items-center gap-1 border border-border/50 px-2 py-1 text-[10px] text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground hover:border-border ${isBloomberg ? "" : "rounded-md"}`}
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
        </button>
        {/* Screenshot */}
        <button
          onClick={captureScreenshot}
          className={`flex items-center gap-1 border border-border/50 px-2 py-1 text-[10px] text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground hover:border-border ${isBloomberg ? "" : "rounded-md"}`}
          title="Export screenshot"
        >
          <Camera className="size-3" />
        </button>
        {/* View toggle */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowViewMenu(!showViewMenu)}
            className={`flex items-center gap-1 border border-border/50 px-2 py-1 text-[10px] text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground hover:border-border ${isBloomberg ? "" : "rounded-md"}`}
            title="Toggle bars"
          >
            <PanelTop className="size-3" />
            <span className="hidden md:inline">View</span>
          </button>
          {showViewMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowViewMenu(false)} />
              <div className={`absolute right-0 top-full mt-1.5 z-50 w-48 border border-border bg-card py-1 ${isBloomberg ? "" : "rounded-lg"}`}>
                <button
                  onClick={() => { onToggleDashboardBar(); setShowViewMenu(false) }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-foreground hover:bg-secondary transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {showDashboardBar ? <Eye className="size-3 text-primary" /> : <EyeOff className="size-3 text-muted-foreground/50" />}
                    Market Stats Bar
                  </span>
                  <span className={`text-[9px] ${showDashboardBar ? "text-positive" : "text-muted-foreground/40"}`}>{showDashboardBar ? "ON" : "OFF"}</span>
                </button>
                <button
                  onClick={() => { onToggleActionBar(); setShowViewMenu(false) }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-foreground hover:bg-secondary transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {showActionBar ? <Eye className="size-3 text-primary" /> : <EyeOff className="size-3 text-muted-foreground/50" />}
                    Shortcuts
                  </span>
                  <span className={`text-[9px] ${showActionBar ? "text-positive" : "text-muted-foreground/40"}`}>{showActionBar ? "ON" : "OFF"}</span>
                </button>
              </div>
            </>
          )}
        </div>
        {/* Theme picker */}
        <div className="relative">
          <button
            onClick={() => setShowThemes(!showThemes)}
            className={`flex items-center gap-1.5 border border-border/50 px-2 py-1 text-[10px] text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground hover:border-border ${isBloomberg ? "" : "rounded-md"}`}
          >
            <Palette className="size-3" />
            <span className="hidden sm:inline">{THEMES.find(t => t.id === themeId)?.label}</span>
          </button>
          {showThemes && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowThemes(false)} />
              <div className={`absolute right-0 top-full mt-1.5 z-50 w-44 border border-border bg-card py-1 ${isBloomberg ? "" : "rounded-lg"}`}>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id as ThemeId); setShowThemes(false) }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-[11px] transition-colors ${
                      themeId === t.id ? "text-primary bg-primary/10" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="flex gap-0.5">
                      <div className="size-2.5 rounded-full ring-1 ring-white/10" style={{ background: t.swatch[0] }} />
                      <div className="size-2.5 rounded-full ring-1 ring-white/10" style={{ background: t.swatch[1] }} />
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
