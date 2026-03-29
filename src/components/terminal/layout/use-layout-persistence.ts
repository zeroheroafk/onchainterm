"use client"

import { useCallback, useRef, useState } from "react"
import { DEFAULT_LAYOUT, DEFAULT_ACTIVE_WIDGETS, type WidgetPosition } from "./default-layouts"

const STORAGE_KEY = "onchainterm_layout_v1"

interface PersistedLayout {
  layout: WidgetPosition[]
  activeWidgets: string[]
}

function loadFromStorage(): PersistedLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedLayout
    if (!Array.isArray(parsed.layout) || !Array.isArray(parsed.activeWidgets)) return null
    if (parsed.layout.length > 0 && typeof parsed.layout[0].id !== "string") return null
    return parsed
  } catch {
    return null
  }
}

function saveToStorage(data: PersistedLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function useLayoutPersistence(userId?: string) {
  const [loaded] = useState(true)
  const [layout, setLayout] = useState<WidgetPosition[]>(() => {
    const persisted = loadFromStorage()
    if (persisted) {
      const layoutIds = new Set(persisted.layout.map((p) => p.id))
      const cleanedActive = persisted.activeWidgets.filter((id) => layoutIds.has(id))
      if (cleanedActive.length !== persisted.activeWidgets.length) {
        saveToStorage({ layout: persisted.layout, activeWidgets: cleanedActive })
      }
      return persisted.layout
    }
    return DEFAULT_LAYOUT
  })
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
    const persisted = loadFromStorage()
    if (persisted) {
      const layoutIds = new Set(persisted.layout.map((p) => p.id))
      return persisted.activeWidgets.filter((id) => layoutIds.has(id))
    }
    return DEFAULT_ACTIVE_WIDGETS
  })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  void userId // Reserved for future Supabase integration

  const persistLayout = useCallback((newLayout: WidgetPosition[], newActiveWidgets: string[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveToStorage({ layout: newLayout, activeWidgets: newActiveWidgets })
    }, 500)
  }, [])

  return {
    layout,
    setLayout,
    activeWidgets,
    setActiveWidgets,
    persistLayout,
    loaded,
  }
}
