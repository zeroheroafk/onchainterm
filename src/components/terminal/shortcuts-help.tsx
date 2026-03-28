"use client"

import { SHORTCUT_DESCRIPTIONS } from "@/hooks/useKeyboardShortcuts"

interface ShortcutsHelpProps {
  onClose: () => void
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  const fnKeys = SHORTCUT_DESCRIPTIONS.filter(s => s.key.startsWith("F"))
  const letterKeys = SHORTCUT_DESCRIPTIONS.filter(s => s.key.length === 1 && s.key !== "?")
  const specialKeys = SHORTCUT_DESCRIPTIONS.filter(s => s.key === "Esc" || s.key === "?")

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-border/40 bg-card/95 backdrop-blur-md p-5 rounded-lg shadow-2xl shadow-black/30 max-h-[85vh] overflow-auto ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground font-heading">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            ESC to close
          </button>
        </div>

        {/* Function keys */}
        <div className="mb-3">
          <h3 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-primary/70 mb-2">Function Keys</h3>
          <div className="grid grid-cols-2 gap-1">
            {fnKeys.map(({ key, description }) => (
              <ShortcutRow key={key} keyLabel={key} description={description} />
            ))}
          </div>
        </div>

        {/* Letter keys */}
        <div className="mb-3">
          <h3 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-primary/70 mb-2">Quick Access</h3>
          <div className="grid grid-cols-2 gap-1">
            {letterKeys.map(({ key, description }) => (
              <ShortcutRow key={key} keyLabel={key} description={description} />
            ))}
          </div>
        </div>

        {/* Special */}
        <div>
          <h3 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-primary/70 mb-2">General</h3>
          <div className="grid grid-cols-2 gap-1">
            {specialKeys.map(({ key, description }) => (
              <ShortcutRow key={key} keyLabel={key} description={description} />
            ))}
          </div>
        </div>

        <p className="mt-3 text-[9px] text-muted-foreground/60">
          Function keys work everywhere. Letter keys are disabled while typing in inputs.
        </p>
      </div>
    </div>
  )
}

function ShortcutRow({ keyLabel, description }: { keyLabel: string; description: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary/20 transition-colors">
      <kbd className="inline-flex h-5 min-w-[32px] items-center justify-center rounded border border-border/40 bg-secondary/50 px-1.5 font-mono text-[10px] text-foreground/80 shrink-0">
        {keyLabel}
      </kbd>
      <span className="text-[11px] text-muted-foreground/70">{description}</span>
    </div>
  )
}
