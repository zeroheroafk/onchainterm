"use client"

import { useCallback, useRef, useState } from "react"
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

export function usePresetPersistence(userId?: string) {
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => loadCustomPresetsFromStorage())
  const [activePresetId, setActivePresetIdState] = useState<string | null>(() => loadActivePresetId())
  const [loaded] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  void userId // Reserved for future Supabase integration

  const persistPresets = useCallback((presets: CustomPreset[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveCustomPresetsToStorage(presets)
    }, 500)
  }, [])

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
