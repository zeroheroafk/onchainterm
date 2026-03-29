"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BUILT_IN_PRESETS, type CustomPreset, type AnyPreset } from "./default-layouts"

const PRESETS_STORAGE_KEY = "onchainterm_presets_v1"
const ACTIVE_PRESET_KEY = "onchainterm_active_preset"

function loadCustomPresetsFromStorage(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p: Record<string, unknown>) =>
        p.id && p.name && Array.isArray(p.layout) && Array.isArray(p.activeWidgets)
    )
  } catch {
    return []
  }
}

function saveCustomPresetsToStorage(presets: CustomPreset[]) {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets))
  } catch {}
}

function loadActivePresetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PRESET_KEY)
  } catch {
    return null
  }
}

function saveActivePresetId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PRESET_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_PRESET_KEY)
    }
  } catch {}
}

async function loadPresetsFromSupabase(userId: string): Promise<CustomPreset[] | null> {
  try {
    const { supabase } = await import("@/lib/supabase")
    const { data, error } = await supabase
      .from("user_presets")
      .select("preset_id, name, layout, active_widgets, created_at")
      .eq("user_id", userId)
    if (error || !data) return null
    return data.map((row) => ({
      id: row.preset_id,
      name: row.name,
      layout: row.layout as CustomPreset["layout"],
      activeWidgets: row.active_widgets as string[],
      builtIn: false as const,
      createdAt: row.created_at,
    }))
  } catch (err) {
    console.error("[presets] Supabase load error:", err)
    return null
  }
}

async function savePresetsToSupabase(userId: string, presets: CustomPreset[]) {
  try {
    const { supabase } = await import("@/lib/supabase")
    // Delete existing user presets and re-insert
    const { error: deleteError } = await supabase
      .from("user_presets")
      .delete()
      .eq("user_id", userId)
    if (deleteError) {
      console.error("[presets] Supabase delete error:", deleteError)
      return
    }
    if (presets.length === 0) return
    const rows = presets.map((p) => ({
      user_id: userId,
      preset_id: p.id,
      name: p.name,
      layout: p.layout,
      active_widgets: p.activeWidgets,
      created_at: p.createdAt || new Date().toISOString(),
    }))
    const { error: insertError } = await supabase
      .from("user_presets")
      .insert(rows)
    if (insertError) {
      console.error("[presets] Supabase insert error:", insertError)
    }
  } catch (err) {
    console.error("[presets] Supabase save error:", err)
  }
}

export function usePresetPersistence(userId?: string) {
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => loadCustomPresetsFromStorage())
  const [activePresetId, setActivePresetIdState] = useState<string | null>(() => loadActivePresetId())
  const [loaded] = useState(true)
  const localSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cloudSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On mount (or userId change): load from Supabase
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    loadPresetsFromSupabase(userId).then((cloudPresets) => {
      if (cancelled || !cloudPresets) return
      // Cloud data takes precedence
      setCustomPresets(cloudPresets)
      saveCustomPresetsToStorage(cloudPresets)
    })

    return () => { cancelled = true }
  }, [userId])

  const persistPresets = useCallback(
    (presets: CustomPreset[]) => {
      // Always save to localStorage (debounced 500ms)
      if (localSaveTimer.current) clearTimeout(localSaveTimer.current)
      localSaveTimer.current = setTimeout(() => {
        saveCustomPresetsToStorage(presets)
      }, 500)

      // Save to Supabase if authenticated (debounced 2s)
      if (userId) {
        if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current)
        cloudSaveTimer.current = setTimeout(() => {
          savePresetsToSupabase(userId, presets)
        }, 2000)
      }
    },
    [userId]
  )

  const setActivePresetId = useCallback((id: string | null) => {
    setActivePresetIdState(id)
    saveActivePresetId(id)
  }, [])

  const addCustomPreset = useCallback(
    (preset: Omit<CustomPreset, "id" | "builtIn" | "createdAt">) => {
      const newPreset: CustomPreset = {
        ...preset,
        id: `custom-${Date.now()}`,
        builtIn: false,
        createdAt: new Date().toISOString(),
      }
      const updated = [...customPresets, newPreset]
      setCustomPresets(updated)
      persistPresets(updated)
      setActivePresetId(newPreset.id)
      return newPreset
    },
    [customPresets, persistPresets, setActivePresetId]
  )

  const deleteCustomPreset = useCallback(
    (presetId: string) => {
      const updated = customPresets.filter((p) => p.id !== presetId)
      setCustomPresets(updated)
      persistPresets(updated)
      if (activePresetId === presetId) {
        setActivePresetId(null)
      }
    },
    [customPresets, activePresetId, persistPresets, setActivePresetId]
  )

  const renameCustomPreset = useCallback(
    (presetId: string, newName: string) => {
      const updated = customPresets.map((p) =>
        p.id === presetId ? { ...p, name: newName } : p
      )
      setCustomPresets(updated)
      persistPresets(updated)
    },
    [customPresets, persistPresets]
  )

  const allPresets: AnyPreset[] = [...BUILT_IN_PRESETS, ...customPresets]

  return {
    allPresets,
    customPresets,
    activePresetId,
    setActivePresetId,
    addCustomPreset,
    deleteCustomPreset,
    renameCustomPreset,
    loaded,
  }
}
