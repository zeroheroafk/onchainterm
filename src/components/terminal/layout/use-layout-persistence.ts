"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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

async function loadFromSupabase(userId: string): Promise<PersistedLayout | null> {
  try {
    const { supabase } = await import("@/lib/supabase")
    const { data, error } = await supabase
      .from("user_layouts")
      .select("layout, active_widgets")
      .eq("user_id", userId)
      .single()
    if (error || !data) return null
    const layout = data.layout as WidgetPosition[]
    const activeWidgets = data.active_widgets as string[]
    if (!Array.isArray(layout) || !Array.isArray(activeWidgets)) return null
    return { layout, activeWidgets }
  } catch (err) {
    console.error("[layout] Supabase load error:", err)
    return null
  }
}

async function saveToSupabase(userId: string, data: PersistedLayout) {
  try {
    const { supabase } = await import("@/lib/supabase")
    const { error } = await supabase
      .from("user_layouts")
      .upsert(
        {
          user_id: userId,
          layout: data.layout,
          active_widgets: data.activeWidgets,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
    if (error) {
      console.error("[layout] Supabase save error:", error)
    }
  } catch (err) {
    console.error("[layout] Supabase save error:", err)
  }
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
  const localSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cloudSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cloudLoadedRef = useRef(false)

  // On mount (or userId change): load from Supabase and merge
  useEffect(() => {
    if (!userId) return
    cloudLoadedRef.current = false
    let cancelled = false

    loadFromSupabase(userId).then((cloudData) => {
      if (cancelled || !cloudData) return
      cloudLoadedRef.current = true
      // Cloud data takes precedence
      setLayout(cloudData.layout)
      setActiveWidgets(cloudData.activeWidgets)
      // Also update localStorage with cloud data
      saveToStorage(cloudData)
    })

    return () => { cancelled = true }
  }, [userId])

  const persistLayout = useCallback(
    (newLayout: WidgetPosition[], newActiveWidgets: string[]) => {
      // Always save to localStorage (debounced 500ms)
      if (localSaveTimer.current) clearTimeout(localSaveTimer.current)
      localSaveTimer.current = setTimeout(() => {
        saveToStorage({ layout: newLayout, activeWidgets: newActiveWidgets })
      }, 500)

      // Save to Supabase if authenticated (debounced 2s)
      if (userId) {
        if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current)
        cloudSaveTimer.current = setTimeout(() => {
          saveToSupabase(userId, { layout: newLayout, activeWidgets: newActiveWidgets })
        }, 2000)
      }
    },
    [userId]
  )

  return {
    layout,
    setLayout,
    activeWidgets,
    setActiveWidgets,
    persistLayout,
    loaded,
  }
}
