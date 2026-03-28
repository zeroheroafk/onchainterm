"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Palette, LogIn, LogOut, User, Pencil, Save, X, Volume2, VolumeX } from "lucide-react"
import { ThemeProvider, useTheme, THEMES, type ThemeId } from "@/lib/theme-context"
import { MarketDataProvider } from "@/lib/market-data-context"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { AuthModal } from "@/components/terminal/auth-modal"
import { LayoutProvider, useLayout } from "@/components/terminal/layout/layout-context"
import { WidgetGrid } from "@/components/terminal/layout/widget-grid"
import { WidgetCatalogDrawer } from "@/components/terminal/layout/widget-catalog-drawer"
import { PresetBar } from "@/components/terminal/layout/preset-bar"
import { CommandBar } from "@/components/terminal/command-bar"
import { DashboardBar } from "@/components/terminal/dashboard-bar"
import { CRTOverlay } from "@/components/effects/CRTOverlay"
import { OnboardingTour } from "@/components/terminal/onboarding-tour"
import type { TerminalWidgetContext } from "@/components/terminal/layout/widget-registry"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { ShortcutsHelp } from "@/components/terminal/shortcuts-help"
import { PresetManager } from "@/components/terminal/preset-manager"
import { SoundProvider, useSound } from "@/lib/sound-context"
import { NotificationProvider } from "@/lib/notification-context"
import { NotificationBell } from "@/components/terminal/notification-panel"
import { CoinContextMenuProvider } from "@/components/terminal/coin-context-menu"

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

function UserMenu() {
  const { user, username, signOut, refreshUser } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { theme } = useTheme()
  const isBloomberg = theme.bloombergMode

  const handleEditProfile = () => {
    setEditUsername(username || "")
    setSaveError(null)
    setEditMode(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setSaveError(null)
  }

  const handleSaveProfile = async () => {
    if (!user || !editUsername.trim()) return
    setSaving(true)
    setSaveError(null)

    try {
      const { error: profileError } = await (await import("@/lib/supabase")).supabase
        .from("profiles")
        .update({ username: editUsername.trim() })
        .eq("id", user.id)

      if (profileError) {
        setSaveError(profileError.message)
        setSaving(false)
        return
      }

      const { error: authError } = await (await import("@/lib/supabase")).supabase
        .auth.updateUser({ data: { username: editUsername.trim() } })

      if (authError) {
        setSaveError(authError.message)
        setSaving(false)
        return
      }

      await refreshUser()
      setEditMode(false)
    } catch (err) {
      setSaveError("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const closeMenu = () => {
    setShowMenu(false)
    setEditMode(false)
    setSaveError(null)
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className={`flex items-center gap-1.5 border border-border/50 px-2.5 py-1 text-[10px] text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground hover:border-border ${isBloomberg ? "" : "rounded-md"}`}
        >
          <LogIn className="size-3" />
          <span className="hidden sm:inline">Sign In</span>
        </button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/20 ${isBloomberg ? "" : "rounded-md"}`}
      >
        <User className="size-3" />
        <span className="hidden sm:inline max-w-[80px] truncate">{username || user.email?.split("@")[0]}</span>
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div className={`absolute right-0 top-full mt-1 z-50 w-52 border border-border bg-card py-1 ${isBloomberg ? "" : "rounded-md shadow-xl"}`}>
            {editMode ? (
              <div className="px-3 py-2 border-b border-border">
                <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Username</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); if (e.key === "Escape") handleCancelEdit() }}
                  className={`mt-1 w-full bg-secondary border border-border px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary ${isBloomberg ? "" : "rounded"}`}
                  disabled={saving}
                />
                {saveError && (
                  <p className="mt-1 text-[9px] text-red-400">{saveError}</p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || !editUsername.trim()}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50 ${isBloomberg ? "" : "rounded"}`}
                  >
                    <Save className="size-3" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground border border-border hover:bg-secondary transition-colors disabled:opacity-50 ${isBloomberg ? "" : "rounded"}`}
                  >
                    <X className="size-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[11px] font-bold text-foreground truncate">{username}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleEditProfile}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-secondary transition-colors"
                >
                  <Pencil className="size-3" />
                  Edit Profile
                </button>
              </>
            )}
            <button
              onClick={() => { signOut(); closeMenu() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="size-3" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function TerminalHeader() {
  const { theme, themeId, setTheme } = useTheme()
  const { muted, toggleMute } = useSound()
  const [showThemes, setShowThemes] = useState(false)
  const isBloomberg = theme.bloombergMode
  const isNeon = theme.neonMode

  return (
    <div className={`flex items-center justify-between border-b shrink-0 ${isBloomberg ? "bg-card border-border px-3 py-1" : "bg-gradient-to-r from-card via-card to-card/95 border-border/50 sm:px-5 px-3 py-2 sm:py-2.5"}`}>
      <div className="flex items-center gap-3">
        <h1 className={`font-bold uppercase text-primary ${isBloomberg ? "text-xs font-mono tracking-widest" : "text-sm tracking-[0.2em] font-heading"} ${isNeon ? "font-mono neon-glitch-text" : ""}`}>
          {isBloomberg ? "ONCHAINTERM" : "OnchainTerm"}
        </h1>
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
            // CRYPTO MARKET INTELLIGENCE
          </span>
        ) : (
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em] hidden sm:inline font-medium">
            Crypto Market Intelligence
          </span>
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
              <div className={`absolute right-0 top-full mt-1.5 z-50 w-44 border bg-card/95 backdrop-blur-sm py-1 ${isBloomberg ? "border-border" : "rounded-lg shadow-2xl border-border/50 ring-1 ring-white/5"}`}>
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

function ActionBar({ onShowHelp, onShowPresets }: { onShowHelp: () => void; onShowPresets: () => void }) {
  const { theme } = useTheme()
  const { addWidget, removeWidget, isWidgetActive } = useLayout()
  const isBloomberg = theme.bloombergMode

  const toggleWidget = (widgetId: string) => {
    if (isWidgetActive(widgetId)) {
      removeWidget(widgetId)
    } else {
      addWidget(widgetId)
    }
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
      case "F11":
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          document.documentElement.requestFullscreen().catch(() => {})
        }
        break
      case "F12": toggleWidget("theme-creator"); break
    }
  }

  const FN_KEYS = [
    { key: "F1",  label: "HELP" },
    { key: "F2",  label: "SEARCH" },
    { key: "F3",  label: "CHART" },
    { key: "F4",  label: "PRICES" },
    { key: "F5",  label: "NEWS" },
    { key: "F6",  label: "PORTFL" },
    { key: "F7",  label: "WATCH" },
    { key: "F8",  label: "CHAT" },
    { key: "F9",  label: "SIGNAL" },
    { key: "F10", label: "LAYOUT" },
    { key: "F11", label: "FULL" },
    { key: "F12", label: "THEME" },
  ]

  return (
    <div className="hidden md:flex items-center border-b border-border/40 bg-gradient-to-r from-secondary/15 via-secondary/25 to-secondary/15 px-1 shrink-0 py-0.5 overflow-x-auto">
      <div className="flex items-center gap-0 font-mono mx-auto">
        {FN_KEYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFnClick(key)}
            className={`flex items-center shrink-0 transition-all duration-100 hover:bg-secondary/60 active:bg-primary/20 ${
              isBloomberg ? "" : "px-0.5 rounded-sm"
            }`}
          >
            <span className={isBloomberg ? "bloomberg-fn-key" : "inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold text-primary/80 bg-primary/5 rounded-sm mr-0.5"}>{key}</span>
            <span className={isBloomberg ? "bloomberg-fn-label" : "text-[9px] text-muted-foreground/70 pr-2 font-medium"}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TerminalContent() {
  const [chartSymbol, setChartSymbol] = useState("bitcoin")
  const { theme } = useTheme()
  const { showHelp, setShowHelp, showPresets, setShowPresets } = useKeyboardShortcuts()

  const context: TerminalWidgetContext = {
    chartSymbol,
    setChartSymbol: useCallback((s: string) => setChartSymbol(s), []),
  }

  return (
    <div className="flex h-screen flex-col">
      <TerminalHeader />
      <CommandBar />
      <DashboardBar />
      <ActionBar onShowHelp={() => setShowHelp(prev => !prev)} onShowPresets={() => setShowPresets(prev => !prev)} />
      <CoinContextMenuProvider onSelectSymbol={context.setChartSymbol}>
        <WidgetGrid context={context} />
        <PresetBar />
        <WidgetCatalogDrawer />
        <PresetManager externalOpen={showPresets} onExternalClose={() => setShowPresets(false)} />
      </CoinContextMenuProvider>
      {theme.crtEffects && <CRTOverlay />}
      {theme.neonMode && (
        <>
          <div className="neon-grid-overlay" />
          <div className="neon-scanlines" />
        </>
      )}
      <OnboardingTour />
      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
    </div>
  )
}

export function TerminalPageClient() {
  return (
    <ThemeProvider>
      <SoundProvider>
        <NotificationProvider>
        <AuthProvider>
          <MarketDataProvider>
            <LayoutProvider>
              <TerminalContent />
            </LayoutProvider>
          </MarketDataProvider>
        </AuthProvider>
        </NotificationProvider>
      </SoundProvider>
    </ThemeProvider>
  )
}
