"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, X, Pencil, Trash2, Check, Layout } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { useLayout } from "./layout-context"
import type { AnyPreset } from "./default-layouts"

export function PresetBar() {
  const { theme } = useTheme()
  const isBloomberg = theme.bloombergMode
  const {
    activePresetId, allPresets, applyPreset,
    saveCurrentAsPreset, deletePreset, renamePreset,
  } = useLayout()

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const saveInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saveDialogOpen && saveInputRef.current) saveInputRef.current.focus()
  }, [saveDialogOpen])

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  const sanitizeName = (raw: string): string => {
    return raw
      .replace(/["\n\r]/g, "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f]/g, "")
      .trim()
      .slice(0, 20)
  }

  const handleSave = () => {
    const name = sanitizeName(saveName)
    if (!name) return
    saveCurrentAsPreset(name)
    setSaveName("")
    setSaveDialogOpen(false)
  }

  const handleRename = (presetId: string) => {
    const name = sanitizeName(editName)
    if (!name) return
    renamePreset(presetId, name)
    setEditingId(null)
    setEditName("")
  }

  const getPresetLabel = (preset: AnyPreset) => {
    return preset.builtIn ? preset.fallbackName : preset.name
  }

  return (
    <div className={`hidden md:flex items-center gap-1.5 border-t border-border/30 bg-secondary/8 px-3 shrink-0 ${isBloomberg ? "py-0.5" : "py-1"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground/30 mr-1 shrink-0">
        <Layout className="size-3" />
        <span className="text-[8px] font-medium uppercase tracking-[0.15em] select-none">Presets</span>
      </div>

      <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
        {allPresets.map((preset) => {
          const isActive = activePresetId === preset.id
          const isEditing = editingId === preset.id

          return (
            <div key={preset.id} className="flex items-center gap-0 shrink-0 group">
              {isEditing ? (
                <form onSubmit={(e) => { e.preventDefault(); handleRename(preset.id) }} className="flex items-center gap-1">
                  <input
                    ref={editInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => { setEditingId(null); setEditName("") }}
                    className="w-24 rounded border border-primary/40 bg-background px-2 py-0.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary/40"
                    maxLength={20}
                  />
                  <button type="submit" className="rounded p-0.5 text-primary hover:bg-primary/10" onMouseDown={(e) => e.preventDefault()}>
                    <Check className="size-3" />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    onClick={() => applyPreset(preset.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${isBloomberg ? "font-mono" : "rounded-md"} ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5"
                        : "text-foreground/50 border border-transparent hover:bg-secondary/40 hover:text-foreground/70"
                    }`}
                  >
                    {getPresetLabel(preset)}
                  </button>
                  {!preset.builtIn && (
                    <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(preset.id); setEditName(preset.name) }}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-2.5" />
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {saveDialogOpen ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="flex items-center gap-1.5 shrink-0">
          <input
            ref={saveInputRef}
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Preset name..."
            className="w-32 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
            maxLength={20}
          />
          <button type="submit" disabled={!saveName.trim()} className="rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">
            <Check className="size-3" />
          </button>
          <button type="button" onClick={() => { setSaveDialogOpen(false); setSaveName("") }} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="size-3" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setSaveDialogOpen(true)}
          className="flex items-center justify-center size-6 rounded-md border border-dashed border-border/30 text-muted-foreground/40 transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/5 shrink-0"
          title="Save current layout as preset"
        >
          <Plus className="size-3.5" />
        </button>
      )}
    </div>
  )
}
