"use client"

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { DEFAULT_LAYOUT, DEFAULT_ACTIVE_WIDGETS, type WidgetPosition, type AnyPreset } from "./default-layouts"
import { getWidgetDef } from "./widget-registry"
import { useLayoutPersistence } from "./use-layout-persistence"
import { usePresetPersistence } from "./use-preset-persistence"

interface LayoutContextType {
  layout: WidgetPosition[]
  activeWidgets: string[]
  isLocked: boolean
  isCatalogOpen: boolean
  setLayout: (layout: WidgetPosition[]) => void
  updateWidgetPosition: (id: string, update: Partial<WidgetPosition>) => void
  bringToFront: (id: string) => void
  addWidget: (widgetId: string) => void
  removeWidget: (widgetId: string) => void
  toggleLock: () => void
  setCatalogOpen: (open: boolean) => void
  resetToDefault: () => void
  isWidgetActive: (widgetId: string) => boolean
  focusWidget: (widgetId: string) => void
  widgetRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  activePresetId: string | null
  allPresets: AnyPreset[]
  applyPreset: (presetId: string) => void
  saveCurrentAsPreset: (name: string) => void
  deletePreset: (presetId: string) => void
  renamePreset: (presetId: string, newName: string) => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider")
  return ctx
}

export function LayoutProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const {
    layout,
    setLayout: setPersistedLayout,
    activeWidgets,
    setActiveWidgets: setPersistedActiveWidgets,
    persistLayout,
    loaded,
  } = useLayoutPersistence(userId)

  const {
    allPresets,
    activePresetId,
    setActivePresetId,
    addCustomPreset,
    deleteCustomPreset,
    renameCustomPreset,
    loaded: presetsLoaded,
  } = usePresetPersistence(userId)

  const [forceLoaded, setForceLoaded] = useState(false)

  useEffect(() => {
    if (loaded && presetsLoaded) return
    const timeout = setTimeout(() => {
      setForceLoaded(true)
    }, 5000)
    return () => clearTimeout(timeout)
  }, [loaded, presetsLoaded])

  const [isLocked] = useState(false)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const widgetRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const nextZRef = useRef(
    Math.max(...layout.map((w) => w.zIndex ?? 1), 1) + 1
  )

  const setLayout = useCallback(
    (newLayout: WidgetPosition[]) => {
      setPersistedLayout(newLayout)
      persistLayout(newLayout, activeWidgets)
      setActivePresetId(null)
    },
    [setPersistedLayout, persistLayout, activeWidgets, setActivePresetId]
  )

  const updateWidgetPosition = useCallback(
    (id: string, update: Partial<WidgetPosition>) => {
      const newLayout = layout.map((w) =>
        w.id === id ? { ...w, ...update } : w
      )
      setPersistedLayout(newLayout)
      persistLayout(newLayout, activeWidgets)
      setActivePresetId(null)
    },
    [layout, setPersistedLayout, persistLayout, activeWidgets, setActivePresetId]
  )

  const bringToFront = useCallback(
    (id: string) => {
      const current = layout.find((w) => w.id === id)
      const maxZ = Math.max(...layout.map((w) => w.zIndex ?? 0))
      if (current && current.zIndex === maxZ) return

      const z = nextZRef.current++
      const newLayout = layout.map((w) =>
        w.id === id ? { ...w, zIndex: z } : w
      )
      setPersistedLayout(newLayout)
    },
    [layout, setPersistedLayout]
  )

  const addWidget = useCallback(
    (widgetId: string) => {
      const def = getWidgetDef(widgetId)
      if (!def) return
      if (def.singleton && activeWidgets.includes(widgetId)) return
      if (activeWidgets.includes(widgetId)) return

      const newActiveWidgets = [...activeWidgets, widgetId]
      const z = nextZRef.current++
      const count = activeWidgets.length
      const offsetX = (count % 5) * 3
      const offsetY = (count % 5) * 3

      const newPos: WidgetPosition = {
        id: widgetId,
        x: 15 + offsetX,
        y: 10 + offsetY,
        w: def.defaultSize.w,
        h: def.defaultSize.h,
        zIndex: z,
      }
      const newLayout = [...layout, newPos]

      setPersistedLayout(newLayout)
      setPersistedActiveWidgets(newActiveWidgets)
      persistLayout(newLayout, newActiveWidgets)
      setActivePresetId(null)
    },
    [activeWidgets, layout, setPersistedLayout, setPersistedActiveWidgets, persistLayout, setActivePresetId]
  )

  const removeWidget = useCallback(
    (widgetId: string) => {
      const newActiveWidgets = activeWidgets.filter((id) => id !== widgetId)
      const newLayout = layout.filter((item) => item.id !== widgetId)

      setPersistedLayout(newLayout)
      setPersistedActiveWidgets(newActiveWidgets)
      persistLayout(newLayout, newActiveWidgets)
      setActivePresetId(null)
    },
    [activeWidgets, layout, setPersistedLayout, setPersistedActiveWidgets, persistLayout, setActivePresetId]
  )

  const toggleLock = useCallback(() => {}, [])

  const setCatalogOpen = useCallback((open: boolean) => {
    setIsCatalogOpen(open)
  }, [])

  const resetToDefault = useCallback(() => {
    nextZRef.current = 2
    setPersistedLayout(DEFAULT_LAYOUT)
    setPersistedActiveWidgets(DEFAULT_ACTIVE_WIDGETS)
    persistLayout(DEFAULT_LAYOUT, DEFAULT_ACTIVE_WIDGETS)
    setActivePresetId("default")
  }, [setPersistedLayout, setPersistedActiveWidgets, persistLayout, setActivePresetId])

  const isWidgetActive = useCallback(
    (widgetId: string) => activeWidgets.includes(widgetId),
    [activeWidgets]
  )

  const focusWidget = useCallback((widgetId: string) => {
    const el = widgetRefs.current[widgetId]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" })
      el.classList.add("widget-flash")
      setTimeout(() => el.classList.remove("widget-flash"), 1500)
    }
  }, [])

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = allPresets.find((p) => p.id === presetId)
      if (!preset) return
      nextZRef.current = Math.max(...preset.layout.map((w) => w.zIndex ?? 1), 1) + 1
      setPersistedLayout(preset.layout)
      setPersistedActiveWidgets(preset.activeWidgets)
      persistLayout(preset.layout, preset.activeWidgets)
      setActivePresetId(presetId)
    },
    [allPresets, setPersistedLayout, setPersistedActiveWidgets, persistLayout, setActivePresetId]
  )

  const saveCurrentAsPreset = useCallback(
    (name: string) => {
      addCustomPreset({ name, layout, activeWidgets })
    },
    [layout, activeWidgets, addCustomPreset]
  )

  const deletePreset = useCallback(
    (presetId: string) => deleteCustomPreset(presetId),
    [deleteCustomPreset]
  )

  const renamePreset = useCallback(
    (presetId: string, newName: string) => renameCustomPreset(presetId, newName),
    [renameCustomPreset]
  )

  if ((!loaded || !presetsLoaded) && !forceLoaded) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Loading layout...</div>
    </div>
  )

  return (
    <LayoutContext.Provider
      value={{
        layout, activeWidgets, isLocked, isCatalogOpen,
        setLayout, updateWidgetPosition, bringToFront,
        addWidget, removeWidget, toggleLock, setCatalogOpen,
        resetToDefault, isWidgetActive, focusWidget, widgetRefs,
        activePresetId, allPresets, applyPreset,
        saveCurrentAsPreset, deletePreset, renamePreset,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}
