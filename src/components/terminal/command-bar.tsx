"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Search, X, Plus, Eye, Palette, Layout, Lock, Unlock, RotateCcw } from "lucide-react"
import { useTheme, THEMES, type ThemeId } from "@/lib/theme-context"
import { useLayout } from "@/components/terminal/layout/layout-context"
import {
  WIDGET_REGISTRY,
  WIDGET_CATEGORIES,
  type WidgetCategory,
} from "@/components/terminal/layout/widget-registry"

type CommandItemType = "widget-add" | "widget-focus" | "theme" | "preset" | "action"

interface CommandItem {
  id: string
  label: string
  description: string
  type: CommandItemType
  category: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  active?: boolean
  onSelect: () => void
}

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  market: "Market",
  trade: "Trade",
  tools: "Tools",
  comms: "Comms",
}

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { theme, themeId, setTheme } = useTheme()
  const {
    isLocked, toggleLock, addWidget, isWidgetActive,
    focusWidget, bringToFront, allPresets, applyPreset,
    activePresetId, resetToDefault, setCatalogOpen,
  } = useLayout()

  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = []

    // Widget commands: add or focus
    for (const widget of WIDGET_REGISTRY) {
      const isActive = isWidgetActive(widget.id)
      const catLabel = CATEGORY_LABELS[widget.category] || widget.category

      if (isActive) {
        items.push({
          id: `focus-${widget.id}`,
          label: widget.fallbackTitle,
          description: `Focus ${catLabel} widget`,
          type: "widget-focus",
          category: `Widgets / ${catLabel}`,
          icon: widget.icon,
          active: true,
          onSelect: () => {
            focusWidget(widget.id)
            bringToFront(widget.id)
            setOpen(false)
          },
        })
      } else {
        items.push({
          id: `add-${widget.id}`,
          label: widget.fallbackTitle,
          description: `Add ${catLabel} widget`,
          type: "widget-add",
          category: `Widgets / ${catLabel}`,
          icon: widget.icon,
          onSelect: () => {
            addWidget(widget.id)
            setOpen(false)
          },
        })
      }
    }

    // Theme commands
    for (const t of THEMES) {
      items.push({
        id: `theme-${t.id}`,
        label: t.label,
        description: "Switch theme",
        type: "theme",
        category: "Themes",
        icon: Palette,
        active: themeId === t.id,
        onSelect: () => {
          setTheme(t.id as ThemeId)
          setOpen(false)
        },
      })
    }

    // Preset commands
    for (const preset of allPresets) {
      const name = preset.builtIn ? preset.fallbackName : preset.name
      items.push({
        id: `preset-${preset.id}`,
        label: name,
        description: "Apply layout preset",
        type: "preset",
        category: "Presets",
        icon: Layout,
        active: activePresetId === preset.id,
        onSelect: () => {
          applyPreset(preset.id)
          setOpen(false)
        },
      })
    }

    // Actions
    items.push({
      id: "action-lock",
      label: isLocked ? "Unlock Layout" : "Lock Layout",
      description: isLocked ? "Enable editing mode" : "Lock widgets in place",
      type: "action",
      category: "Actions",
      icon: isLocked ? Unlock : Lock,
      onSelect: () => {
        toggleLock()
        setOpen(false)
      },
    })

    items.push({
      id: "action-catalog",
      label: "Open Widget Catalog",
      description: "Browse all available widgets",
      type: "action",
      category: "Actions",
      icon: Plus,
      onSelect: () => {
        setCatalogOpen(true)
        setOpen(false)
      },
    })

    items.push({
      id: "action-reset",
      label: "Reset to Default",
      description: "Restore default layout",
      type: "action",
      category: "Actions",
      icon: RotateCcw,
      onSelect: () => {
        resetToDefault()
        setOpen(false)
      },
    })

    return items
  }, [
    isWidgetActive, focusWidget, bringToFront, addWidget,
    themeId, setTheme, allPresets, activePresetId, applyPreset,
    isLocked, toggleLock, setCatalogOpen, resetToDefault,
  ])

  // Filter by query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    )
  }, [commands, query])

  // Group by category
  const grouped = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = []
    for (const item of filtered) {
      let group = groups.find((g) => g.category === item.category)
      if (!group) {
        group = { category: item.category, items: [] }
        groups.push(group)
      }
      group.items.push(item)
    }
    return groups
  }, [filtered])

  // Flat list for keyboard nav
  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped])

  // Clamp selectedIndex
  useEffect(() => {
    if (selectedIndex >= flatItems.length) setSelectedIndex(Math.max(0, flatItems.length - 1))
  }, [flatItems.length, selectedIndex])

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-cmd-index="${selectedIndex}"]`)
    if (el) el.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard shortcut: Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        flatItems[selectedIndex]?.onSelect()
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    },
    [flatItems, selectedIndex]
  )

  const typeLabel = (type: CommandItemType) => {
    switch (type) {
      case "widget-add": return "ADD"
      case "widget-focus": return "OPEN"
      case "theme": return "THEME"
      case "preset": return "PRESET"
      case "action": return "ACTION"
    }
  }

  const typeBadgeClass = (type: CommandItemType) => {
    switch (type) {
      case "widget-add": return "bg-primary/20 text-primary"
      case "widget-focus": return "bg-accent/20 text-accent"
      case "theme": return "bg-violet-500/20 text-violet-400"
      case "preset": return "bg-blue-500/20 text-blue-400"
      case "action": return "bg-amber-500/20 text-amber-400"
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="command-bar-trigger flex items-center gap-2 border border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground font-mono transition-colors hover:bg-secondary hover:text-foreground hover:border-primary/30"
      >
        <Search className="size-3" />
        <span className="hidden sm:inline">Search commands...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-card px-1 py-0.5 text-[9px] font-mono text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
    )
  }

  let flatIndex = 0

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Command palette */}
      <div className="command-bar-modal fixed left-1/2 top-[15%] z-50 w-[90vw] max-w-lg -translate-x-1/2 border border-border bg-card overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 shrink-0 text-primary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button onClick={() => setOpen(false)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground font-mono">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {group.category}
                  </span>
                </div>
                {group.items.map((item) => {
                  const idx = flatIndex++
                  const isSelected = idx === selectedIndex
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      data-cmd-index={idx}
                      onClick={item.onSelect}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground/80 hover:bg-secondary/50"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono font-medium truncate">
                            {item.label}
                          </span>
                          {item.active && (
                            <span className="text-[8px] font-bold uppercase tracking-wider text-primary/70">
                              active
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {item.description}
                        </span>
                      </div>
                      <span className={`shrink-0 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded ${typeBadgeClass(item.type)}`}>
                        {typeLabel(item.type)}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-[9px] text-muted-foreground font-mono">
          <span><kbd className="rounded border border-border px-1 py-0.5 bg-card">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border border-border px-1 py-0.5 bg-card">↵</kbd> select</span>
          <span><kbd className="rounded border border-border px-1 py-0.5 bg-card">esc</kbd> close</span>
        </div>
      </div>
    </>
  )
}
