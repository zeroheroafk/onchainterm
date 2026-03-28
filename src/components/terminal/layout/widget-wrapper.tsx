"use client"

import { forwardRef, useEffect, useState } from "react"
import { ChevronDown, ChevronUp, GripVertical, Maximize2, Minimize2, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface WidgetWrapperProps {
  title: string
  icon: LucideIcon
  status?: "live" | "stale" | "error"
  isLocked: boolean
  onRemove: () => void
  onDragStart?: (e: React.MouseEvent) => void
  children: React.ReactNode
}

export const WidgetWrapper = forwardRef<HTMLDivElement, WidgetWrapperProps>(
  function WidgetWrapper({ title, icon: Icon, status, isLocked, onRemove, onDragStart, children }, ref) {
    const [collapsed, setCollapsed] = useState(false)
    const [fullscreen, setFullscreen] = useState(false)

    useEffect(() => {
      if (!fullscreen) return
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") setFullscreen(false)
      }
      window.addEventListener("keydown", handler)
      return () => window.removeEventListener("keydown", handler)
    }, [fullscreen])

    return (
      <div
        ref={ref}
        className={`${fullscreen ? "fixed inset-0 z-[100]" : ""} flex h-full w-full flex-col overflow-hidden rounded border border-border/60 bg-card transition-colors widget-panel`}
      >
        <div
          className={`flex h-7 shrink-0 items-center justify-between border-b border-border/40 px-2.5 ${
            !isLocked ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          onMouseDown={!isLocked ? onDragStart : undefined}
          onDoubleClick={() => setFullscreen(f => !f)}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {!isLocked && (
              <div className="p-0.5 text-muted-foreground">
                <GripVertical className="size-3" />
              </div>
            )}
            <Icon className="size-3 shrink-0 text-primary/70" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/90 select-none">
              {title}
            </span>
            {status && (
              <span className={`status-dot ${
                status === "live" ? "status-dot-live" :
                status === "stale" ? "status-dot-stale" : "status-dot-error"
              }`} title={status === "live" ? "Live data" : status === "stale" ? "Data may be stale" : "Connection error"} />
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreen(f => !f) }}
              onMouseDown={(e) => e.stopPropagation()}
              className="rounded p-0.5 text-muted-foreground/50 hover:text-primary/80 transition-colors"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c) }}
              onMouseDown={(e) => e.stopPropagation()}
              className="rounded p-0.5 text-muted-foreground/50 hover:text-primary/80 transition-colors"
              title={collapsed ? "Expand widget" : "Collapse widget"}
            >
              {collapsed ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {!isLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                onMouseDown={(e) => e.stopPropagation()}
                className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-destructive/15 hover:text-destructive/80"
                title="Remove widget"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <div
          className="flex-1 min-h-0 overflow-hidden relative"
          style={{
            transition: "max-height 0.2s ease-out, opacity 0.15s ease",
            maxHeight: collapsed ? "0px" : "2000px",
            opacity: collapsed ? 0 : 1,
          }}
        >
          {children}
        </div>
      </div>
    )
  }
)
