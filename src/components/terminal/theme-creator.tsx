"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Palette, Save, Trash2, Download, Upload, RotateCcw, Eye } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CustomThemeColors {
  "--background": string
  "--card": string
  "--primary": string
  "--primary-foreground": string
  "--foreground": string
  "--muted-foreground": string
  "--border": string
  "--secondary": string
}

interface CustomTheme {
  id: string
  name: string
  colors: CustomThemeColors
}

const STORAGE_KEY = "onchainterm_custom_themes"
const ACTIVE_KEY = "onchainterm_active_custom_theme"

const COLOR_FIELDS: { key: keyof CustomThemeColors; label: string }[] = [
  { key: "--background", label: "Background" },
  { key: "--card", label: "Card" },
  { key: "--primary", label: "Primary" },
  { key: "--primary-foreground", label: "Primary Foreground" },
  { key: "--foreground", label: "Foreground" },
  { key: "--muted-foreground", label: "Muted Foreground" },
  { key: "--border", label: "Border" },
  { key: "--secondary", label: "Secondary" },
]

const DEFAULT_COLORS: CustomThemeColors = {
  "--background": "#0f0f0f",
  "--card": "#1a1a1a",
  "--primary": "#22c55e",
  "--primary-foreground": "#0f0f0f",
  "--foreground": "#e0e0e0",
  "--muted-foreground": "#808080",
  "--border": "#333333",
  "--secondary": "#252525",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CustomTheme[]) : []
  } catch {
    return []
  }
}

function saveThemes(themes: CustomTheme[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes))
  } catch {}
}

function applyCustomColors(colors: CustomThemeColors) {
  const root = document.documentElement
  for (const [prop, value] of Object.entries(colors)) {
    root.style.setProperty(prop, value)
  }
}

function removeCustomColors() {
  const root = document.documentElement
  for (const { key } of COLOR_FIELDS) {
    root.style.removeProperty(key)
  }
  try {
    localStorage.removeItem(ACTIVE_KEY)
  } catch {}
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThemeCreator() {
  const [colors, setColors] = useState<CustomThemeColors>({ ...DEFAULT_COLORS })
  const [themeName, setThemeName] = useState("")
  const [savedThemes, setSavedThemes] = useState<CustomTheme[]>([])
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  // Load saved themes on mount
  useEffect(() => {
    setSavedThemes(loadThemes())
    try {
      setActiveCustomId(localStorage.getItem(ACTIVE_KEY))
    } catch {}
  }, [])

  const updateColor = useCallback((key: keyof CustomThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
  }, [])

  // Save current colors as a new theme
  const handleSave = useCallback(() => {
    let name = themeName.trim() || "Untitled Theme"
    // Prevent duplicate theme names
    const existingNames = new Set(savedThemes.map(t => t.name))
    if (existingNames.has(name)) {
      let suffix = 2
      while (existingNames.has(`${name} (${suffix})`)) {
        suffix++
      }
      name = `${name} (${suffix})`
    }
    const newTheme: CustomTheme = {
      id: `custom_${Date.now()}`,
      name,
      colors: { ...colors },
    }
    const updated = [...savedThemes, newTheme]
    saveThemes(updated)
    setSavedThemes(updated)
    setThemeName("")
  }, [themeName, colors, savedThemes])

  // Apply a saved custom theme
  const handleApply = useCallback((theme: CustomTheme) => {
    applyCustomColors(theme.colors)
    setActiveCustomId(theme.id)
    setColors({ ...theme.colors })
    try {
      localStorage.setItem(ACTIVE_KEY, theme.id)
    } catch {}
  }, [])

  // Delete a saved custom theme
  const handleDelete = useCallback(
    (id: string) => {
      const updated = savedThemes.filter(t => t.id !== id)
      saveThemes(updated)
      setSavedThemes(updated)
      if (activeCustomId === id) {
        removeCustomColors()
        setActiveCustomId(null)
      }
    },
    [savedThemes, activeCustomId],
  )

  // Reset to built-in theme
  const handleReset = useCallback(() => {
    removeCustomColors()
    setActiveCustomId(null)
    setColors({ ...DEFAULT_COLORS })
  }, [])

  // Export themes as JSON
  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(savedThemes, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "onchainterm-custom-themes.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [savedThemes])

  // Import themes from JSON
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 1_000_000) {
        alert("File too large (max 1MB)")
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string) as CustomTheme[]
          if (!Array.isArray(imported)) return
          const isValid = imported.every(
            (t) =>
              t &&
              typeof t === "object" &&
              typeof t.id === "string" &&
              typeof t.name === "string" &&
              t.colors &&
              typeof t.colors === "object",
          )
          if (!isValid) {
            alert("Invalid theme file: each theme must have id, name, and colors properties")
            return
          }
          const merged = [...savedThemes, ...imported]
          saveThemes(merged)
          setSavedThemes(merged)
        } catch {}
      }
      reader.readAsText(file)
      // Reset so the same file can be re-imported
      e.target.value = ""
    },
    [savedThemes],
  )

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border p-4 bg-card"
      style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--primary)" }}>
        <Palette className="h-4 w-4" />
        Theme Creator
      </div>

      {/* Color Pickers */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-xs">
            <input
              type="color"
              value={colors[key]}
              onChange={e => updateColor(key, e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0 ring-1 ring-border/40 rounded overflow-hidden"
            />
            <span className="min-w-[120px]" style={{ color: "var(--muted-foreground)" }}>
              {label}
            </span>
            <span className="font-mono text-[10px]" style={{ color: "var(--foreground)", opacity: 0.6 }}>
              {colors[key]}
            </span>
          </label>
        ))}
      </div>

      {/* Preview Panel */}
      <div>
        <div className="mb-1 flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          <Eye className="h-3 w-3" />
          Preview
        </div>
        <div
          className="rounded-lg border p-3"
          style={{
            background: colors["--background"],
            borderColor: colors["--border"],
          }}
        >
          <div
            className="rounded border p-2"
            style={{
              background: colors["--card"],
              borderColor: colors["--border"],
            }}
          >
            <div className="mb-1 text-xs font-semibold" style={{ color: colors["--primary"] }}>
              Card Title
            </div>
            <div className="mb-2 text-[10px]" style={{ color: colors["--foreground"] }}>
              Body text in foreground color.{" "}
              <span style={{ color: colors["--muted-foreground"] }}>Muted helper text.</span>
            </div>
            <button
              type="button"
              className="rounded px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: colors["--primary"],
                color: colors["--primary-foreground"],
              }}
            >
              Button
            </button>
            <span
              className="ml-2 inline-block rounded px-2 py-0.5 text-[10px]"
              style={{ background: colors["--secondary"], color: colors["--foreground"] }}
            >
              Badge
            </span>
          </div>
        </div>
      </div>

      {/* Theme Name + Save */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Theme name..."
          value={themeName}
          onChange={e => setThemeName(e.target.value)}
          className="flex-1 rounded border bg-transparent px-2 py-1 text-xs outline-none"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        />
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Save className="h-3 w-3" />
          Save
        </button>
      </div>

      {/* Saved Themes List */}
      {savedThemes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60" style={{ color: "var(--muted-foreground)" }}>
            Saved Themes
          </div>
          {savedThemes.map(theme => (
            <div
              key={theme.id}
              className="flex items-center gap-2 rounded border px-2 py-1.5"
              style={{
                borderColor: activeCustomId === theme.id ? "var(--primary)" : "var(--border)",
                background: "var(--background)",
              }}
            >
              {/* Color swatches */}
              <div className="flex gap-0.5">
                {(
                  [
                    theme.colors["--background"],
                    theme.colors["--primary"],
                    theme.colors["--foreground"],
                    theme.colors["--secondary"],
                    theme.colors["--border"],
                  ] as string[]
                ).map((c, i) => (
                  <span
                    key={i}
                    className="inline-block h-3 w-3 rounded-full border"
                    style={{ background: c, borderColor: "var(--border)" }}
                  />
                ))}
              </div>

              {/* Name */}
              <span className="flex-1 truncate text-xs" style={{ color: "var(--foreground)" }}>
                {theme.name}
              </span>

              {/* Apply */}
              <button
                type="button"
                onClick={() => handleApply(theme)}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                Apply
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDelete(theme.id)}
                className="text-xs transition-opacity hover:opacity-60"
                style={{ color: "var(--muted-foreground)" }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Reset */}
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-secondary/50 transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>

        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          disabled={savedThemes.length === 0}
          className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-secondary/50 transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <Download className="h-3 w-3" />
          Export
        </button>

        {/* Import */}
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-secondary/50 transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <Upload className="h-3 w-3" />
          Import
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>
    </div>
  )
}
