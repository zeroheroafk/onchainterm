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
      <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-border/40 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/30 animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3.5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-primary/90 font-heading">Widgets</h2>
            <p className="text-[10px] text-muted-foreground/50">Add or remove widgets</p>
          </div>
          <button
            onClick={() => setCatalogOpen(false)}
            className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-secondary/50 hover:text-foreground"
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

        <div className="border-t border-border/30 bg-secondary/10 px-4 py-3">
          <button
            onClick={resetToDefault}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border/30 bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground/70 transition-all hover:bg-secondary/50 hover:text-foreground hover:border-border/50"
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
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 ${
        isActive
          ? "border-primary/25 bg-primary/8 text-foreground shadow-sm shadow-primary/5"
          : "border-border/30 bg-secondary/15 text-foreground/70 hover:bg-secondary/30 hover:border-border/50"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/60"}`} />
      <span className="flex-1 text-[11px] font-medium">{widget.fallbackTitle}</span>
      <div
        className={`flex size-5 items-center justify-center rounded-full transition-all ${
          isActive ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "bg-secondary/50 text-muted-foreground/50"
        }`}
      >
        {isActive ? <Check className="size-3" /> : <Plus className="size-3" />}
      </div>
    </button>
  )
}
