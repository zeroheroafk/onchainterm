"use client"

import { SHORTCUT_DESCRIPTIONS } from "@/hooks/useKeyboardShortcuts"

interface ShortcutsHelpProps {
  onClose: () => void
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-border bg-card p-6 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ESC to close
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SHORTCUT_DESCRIPTIONS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded px-2 py-1.5"
            >
              <kbd className="inline-flex h-6 min-w-[28px] items-center justify-center rounded border border-border bg-secondary px-1.5 font-mono text-xs text-foreground">
                {key}
              </kbd>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
