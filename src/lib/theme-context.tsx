"use client"

import { createContext, useContext, useState, useLayoutEffect, useCallback, type ReactNode } from "react"

export type ThemeId = "bloomberg" | "neon" | "matrix" | "retro" | "amber" | "cyan" | "rose" | "violet" | "blue" | "midnight" | "light"

export interface ThemeConfig {
  id: ThemeId
  label: string
  primary: string
  primaryForeground: string
  accent: string
  accentForeground: string
  ring: string
  chart1: string
  chart2: string
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  border: string
  input: string
  sidebar: string
  sidebarForeground: string
  sidebarAccent: string
  sidebarAccentForeground: string
  sidebarBorder: string
  swatch: [string, string]
  /** If true, activates CRT overlay effects (scanlines, vignette, glow) */
  crtEffects?: boolean
  /** Optional monospace font override for the entire terminal */
  monoFont?: boolean
  /** If true, activates Bloomberg terminal styling (sharp corners, orange headers, dense layout) */
  bloombergMode?: boolean
  /** If true, activates retro-futuristic neon mode (grid bg, glitch, neon glow) */
  neonMode?: boolean
}

const DARK_BASE = {
  primaryForeground: "#0f0f0f",
  accentForeground: "#0f0f0f",
  background: "#0f0f0f",
  foreground: "#e0e0e0",
  card: "#1a1a1a",
  cardForeground: "#e0e0e0",
  popover: "#1a1a1a",
  popoverForeground: "#e0e0e0",
  secondary: "#252525",
  secondaryForeground: "#b0b0b0",
  muted: "#252525",
  mutedForeground: "#808080",
  border: "#333333",
  input: "#252525",
  sidebar: "#141414",
  sidebarForeground: "#e0e0e0",
  sidebarAccent: "#252525",
  sidebarAccentForeground: "#e0e0e0",
  sidebarBorder: "#333333",
}

export const THEMES: ThemeConfig[] = [
  {
    id: "bloomberg",
    label: "Bloomberg",
    primary: "#ff8c00",
    primaryForeground: "#0a0e17",
    accent: "#ffb800",
    accentForeground: "#0a0e17",
    ring: "#ff8c00",
    chart1: "#ff8c00",
    chart2: "#ffb800",
    background: "#0a0e17",
    foreground: "#d4d8e0",
    card: "#101829",
    cardForeground: "#d4d8e0",
    popover: "#101829",
    popoverForeground: "#d4d8e0",
    secondary: "#182238",
    secondaryForeground: "#8a9ab5",
    muted: "#182238",
    mutedForeground: "#5a6a85",
    border: "#1e2d4a",
    input: "#182238",
    sidebar: "#080d16",
    sidebarForeground: "#d4d8e0",
    sidebarAccent: "#182238",
    sidebarAccentForeground: "#d4d8e0",
    sidebarBorder: "#1e2d4a",
    swatch: ["#0a0e17", "#ff8c00"],
    bloombergMode: true,
    monoFont: true,
  },
  {
    id: "neon",
    label: "Neon 80s",
    primary: "#00d4ff",
    primaryForeground: "#0a0a12",
    accent: "#ff00aa",
    accentForeground: "#0a0a12",
    ring: "#00d4ff",
    chart1: "#00d4ff",
    chart2: "#ff00aa",
    background: "#0a0a12",
    foreground: "#e0e4f0",
    card: "#0f0f1e",
    cardForeground: "#e0e4f0",
    popover: "#0f0f1e",
    popoverForeground: "#e0e4f0",
    secondary: "#161630",
    secondaryForeground: "#8888bb",
    muted: "#161630",
    mutedForeground: "#5a5a8a",
    border: "#1a1a3e",
    input: "#161630",
    sidebar: "#08080e",
    sidebarForeground: "#e0e4f0",
    sidebarAccent: "#161630",
    sidebarAccentForeground: "#e0e4f0",
    sidebarBorder: "#1a1a3e",
    swatch: ["#0a0a12", "#00d4ff"],
    neonMode: true,
    monoFont: true,
  },
  {
    id: "matrix",
    label: "Matrix",
    primary: "#22c55e",
    accent: "#4ade80",
    ring: "#22c55e",
    chart1: "#22c55e",
    chart2: "#16a34a",
    swatch: ["#0f0f0f", "#22c55e"],
    ...DARK_BASE,
  },
  {
    id: "retro",
    label: "Retro CRT",
    primary: "#00ff41",
    accent: "#00cc33",
    ring: "#00ff41",
    chart1: "#00ff41",
    chart2: "#00cc33",
    swatch: ["#0a0a0a", "#00ff41"],
    ...DARK_BASE,
    background: "#0a0a0a",
    card: "#111111",
    popover: "#111111",
    secondary: "#1a1a1a",
    muted: "#1a1a1a",
    border: "#00ff4133",
    input: "#1a1a1a",
    sidebar: "#080808",
    sidebarBorder: "#00ff4133",
    crtEffects: true,
    monoFont: true,
  },
  {
    id: "amber",
    label: "Amber",
    primary: "#f59e0b",
    accent: "#fbbf24",
    ring: "#f59e0b",
    chart1: "#f59e0b",
    chart2: "#d97706",
    swatch: ["#0f0f0f", "#f59e0b"],
    ...DARK_BASE,
  },
  {
    id: "cyan",
    label: "Cyan",
    primary: "#06b6d4",
    accent: "#22d3ee",
    ring: "#06b6d4",
    chart1: "#06b6d4",
    chart2: "#0891b2",
    swatch: ["#0f0f0f", "#06b6d4"],
    ...DARK_BASE,
  },
  {
    id: "rose",
    label: "Rose",
    primary: "#f43f5e",
    accent: "#fb7185",
    ring: "#f43f5e",
    chart1: "#f43f5e",
    chart2: "#e11d48",
    swatch: ["#0f0f0f", "#f43f5e"],
    ...DARK_BASE,
  },
  {
    id: "violet",
    label: "Violet",
    primary: "#8b5cf6",
    accent: "#a78bfa",
    ring: "#8b5cf6",
    chart1: "#8b5cf6",
    chart2: "#7c3aed",
    swatch: ["#0f0f0f", "#8b5cf6"],
    ...DARK_BASE,
  },
  {
    id: "blue",
    label: "Blue",
    primary: "#3b82f6",
    accent: "#60a5fa",
    ring: "#3b82f6",
    chart1: "#3b82f6",
    chart2: "#2563eb",
    swatch: ["#0f0f0f", "#3b82f6"],
    ...DARK_BASE,
  },
  {
    id: "midnight",
    label: "Midnight",
    primary: "#60a5fa",
    primaryForeground: "#0a1628",
    accent: "#93c5fd",
    accentForeground: "#0a1628",
    ring: "#60a5fa",
    chart1: "#60a5fa",
    chart2: "#3b82f6",
    background: "#0a1628",
    foreground: "#d4dce8",
    card: "#111f36",
    cardForeground: "#d4dce8",
    popover: "#111f36",
    popoverForeground: "#d4dce8",
    secondary: "#1a2d4a",
    secondaryForeground: "#94a3b8",
    muted: "#1a2d4a",
    mutedForeground: "#64748b",
    border: "#1e3a5f",
    input: "#1a2d4a",
    sidebar: "#081422",
    sidebarForeground: "#d4dce8",
    sidebarAccent: "#1a2d4a",
    sidebarAccentForeground: "#d4dce8",
    sidebarBorder: "#1e3a5f",
    swatch: ["#0a1628", "#60a5fa"],
  },
  {
    id: "light",
    label: "Light",
    primary: "#6b8f6e",
    primaryForeground: "#fafaf7",
    accent: "#7da680",
    accentForeground: "#fafaf7",
    ring: "#6b8f6e",
    chart1: "#6b8f6e",
    chart2: "#5a7f5e",
    background: "#efeee8",
    foreground: "#454540",
    card: "#f5f4ef",
    cardForeground: "#454540",
    popover: "#f5f4ef",
    popoverForeground: "#454540",
    secondary: "#e8e7e1",
    secondaryForeground: "#70706b",
    muted: "#e8e7e1",
    mutedForeground: "#93938e",
    border: "#d5d4ce",
    input: "#e8e7e1",
    sidebar: "#ebeae4",
    sidebarForeground: "#454540",
    sidebarAccent: "#e0dfda",
    sidebarAccentForeground: "#454540",
    sidebarBorder: "#d5d4ce",
    swatch: ["#efeee8", "#6b8f6e"],
  },
]

const STORAGE_KEY = "onchainterm_theme"

interface ThemeContextType {
  theme: ThemeConfig
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

function getTheme(id: ThemeId): ThemeConfig {
  return THEMES.find(t => t.id === id) || THEMES[0]
}

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement
  root.classList.add("theme-transitioning")
  root.style.setProperty("--primary", theme.primary)
  root.style.setProperty("--primary-foreground", theme.primaryForeground)
  root.style.setProperty("--accent", theme.accent)
  root.style.setProperty("--accent-foreground", theme.accentForeground)
  root.style.setProperty("--ring", theme.ring)
  root.style.setProperty("--chart-1", theme.chart1)
  root.style.setProperty("--chart-2", theme.chart2)
  root.style.setProperty("--background", theme.background)
  root.style.setProperty("--foreground", theme.foreground)
  root.style.setProperty("--card", theme.card)
  root.style.setProperty("--card-foreground", theme.cardForeground)
  root.style.setProperty("--popover", theme.popover)
  root.style.setProperty("--popover-foreground", theme.popoverForeground)
  root.style.setProperty("--secondary", theme.secondary)
  root.style.setProperty("--secondary-foreground", theme.secondaryForeground)
  root.style.setProperty("--muted", theme.muted)
  root.style.setProperty("--muted-foreground", theme.mutedForeground)
  root.style.setProperty("--border", theme.border)
  root.style.setProperty("--input", theme.input)
  root.style.setProperty("--sidebar", theme.sidebar)
  root.style.setProperty("--sidebar-foreground", theme.sidebarForeground)
  root.style.setProperty("--sidebar-primary", theme.primary)
  root.style.setProperty("--sidebar-primary-foreground", theme.primaryForeground)
  root.style.setProperty("--sidebar-accent", theme.sidebarAccent)
  root.style.setProperty("--sidebar-accent-foreground", theme.sidebarAccentForeground)
  root.style.setProperty("--sidebar-border", theme.sidebarBorder)
  root.style.setProperty("--sidebar-ring", theme.ring)

  // Toggle CRT body class
  if (theme.crtEffects) {
    root.classList.add("crt-active")
  } else {
    root.classList.remove("crt-active")
  }

  // Toggle mono font
  if (theme.monoFont) {
    root.classList.add("font-mono-override")
  } else {
    root.classList.remove("font-mono-override")
  }

  // Toggle Bloomberg mode
  if (theme.bloombergMode) {
    root.classList.add("bloomberg-active")
  } else {
    root.classList.remove("bloomberg-active")
  }

  // Toggle Neon retro-futuristic mode
  if (theme.neonMode) {
    root.classList.add("neon-active")
  } else {
    root.classList.remove("neon-active")
  }

  setTimeout(() => {
    root.classList.remove("theme-transitioning")
  }, 350)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("bloomberg")
  const theme = getTheme(themeId)

  useLayoutEffect(() => {
    try {
      const local = localStorage.getItem(STORAGE_KEY) as ThemeId | null
      if (local && THEMES.some(t => t.id === local)) {
        setThemeId(local)
        applyTheme(getTheme(local))
      }
    } catch {}
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id)
    const t = getTheme(id)
    applyTheme(t)
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
