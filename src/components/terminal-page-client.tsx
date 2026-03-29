"use client"

import { useState, useCallback } from "react"
import { useTheme } from "@/lib/theme-context"
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
import { CoinContextMenuProvider } from "@/components/terminal/coin-context-menu"
import { TerminalHeader } from "@/components/terminal/terminal-header"
import { TerminalProviders } from "@/components/terminal/terminal-providers"

function TerminalContent() {
  const [chartSymbol, setChartSymbol] = useState("bitcoin")
  const { theme } = useTheme()
  const { showHelp, setShowHelp, showPresets, setShowPresets } = useKeyboardShortcuts()
  const [showDashboardBar, setShowDashboardBar] = useState(true)
  const [showActionBar, setShowActionBar] = useState(true)

  const context: TerminalWidgetContext = {
    chartSymbol,
    setChartSymbol: useCallback((s: string) => setChartSymbol(s), []),
  }

  return (
    <div id="terminal-content" className="flex h-screen flex-col">
      <div className="loading-bar" id="global-loading" style={{ display: 'none' }} />
      <TerminalHeader onToggleDashboardBar={() => setShowDashboardBar(p => !p)} onToggleActionBar={() => setShowActionBar(p => !p)} showDashboardBar={showDashboardBar} showActionBar={showActionBar} onShowHelp={() => setShowHelp(prev => !prev)} onShowPresets={() => setShowPresets(prev => !prev)} />
      <CommandBar />
      {showDashboardBar && <DashboardBar />}
      <CoinContextMenuProvider onSelectSymbol={context.setChartSymbol}>
        <WidgetGrid context={context} />
        <div className="hide-mobile"><PresetBar /></div>
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
    <TerminalProviders>
      <TerminalContent />
    </TerminalProviders>
  )
}
