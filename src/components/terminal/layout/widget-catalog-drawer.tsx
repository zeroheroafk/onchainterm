"use client"

import { X, Plus, Check, RotateCcw } from "lucide-react"
import { useLayout } from "./layout-context"
import { WIDGET_CATEGORIES, getWidgetsByCategory, type WidgetDefinition } from "./widget-registry"

export function WidgetCatalogDrawer() {
  const { isCatalogOpen, setCatalogOpen, addWidget, removeWidget, isWidgetActive, resetToDefault } = useLayout()

  if (!isCatalogOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
        onClick={() => setCatalogOpen(false)}
      />
      <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Widgets</h2>
            <p className="text-[10px] text-muted-foreground">Add or remove widgets</p>
          </div>
          <button
            onClick={() => setCatalogOpen(false)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {WIDGET_CATEGORIES.map((cat) => {
            const widgets = getWidgetsByCategory(cat.key)
            if (widgets.length === 0) return null
            return (
              <div key={cat.key}>
                <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {cat.fallback}
                </h3>
                <div className="space-y-1">
                  {widgets.map((widget) => (
                    <WidgetCatalogItem
                      key={widget.id}
                      widget={widget}
                      isActive={isWidgetActive(widget.id)}
                      onToggle={() => {
                        if (isWidgetActive(widget.id)) {
                          removeWidget(widget.id)
                        } else {
                          addWidget(widget.id)
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-border bg-secondary/20 px-4 py-3">
          <button
            onClick={resetToDefault}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset to Default
          </button>
        </div>
      </div>
    </>
  )
}

function WidgetCatalogItem({ widget, isActive, onToggle }: { widget: WidgetDefinition; isActive: boolean; onToggle: () => void }) {
  const Icon = widget.icon
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
        isActive
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border bg-secondary/30 text-foreground/70 hover:bg-secondary/60"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
      <span className="flex-1 text-xs font-semibold">{widget.fallbackTitle}</span>
      <div
        className={`flex size-5 items-center justify-center rounded-full transition-colors ${
          isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        {isActive ? <Check className="size-3" /> : <Plus className="size-3" />}
      </div>
    </button>
  )
}
