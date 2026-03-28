"use client"

import { forwardRef, useState } from "react"
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface WidgetWrapperProps {
  title: string
  icon: LucideIcon
  isLocked: boolean
  onRemove: () => void
  onDragStart?: (e: React.MouseEvent) => void
  children: React.ReactNode
}

export const WidgetWrapper = forwardRef<HTMLDivElement, WidgetWrapperProps>(
  function WidgetWrapper({ title, icon: Icon, isLocked, onRemove, onDragStart, children }, ref) {
    const [collapsed, setCollapsed] = useState(false)

    return (
      <div
        ref={ref}
        className="flex h-full w-full flex-col overflow-hidden rounded border border-border bg-card transition-colors widget-panel"
      >
        <div
          className={`flex h-8 shrink-0 items-center justify-between border-b border-border bg-secondary/30 px-2 shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${
            !isLocked ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          onMouseDown={!isLocked ? onDragStart : undefined}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {!isLocked && (
              <div className="p-0.5 text-muted-foreground">
                <GripVertical className="size-3.5" />
              </div>
            )}
            <Icon className="size-3.5 shrink-0 text-primary" />
            <span className="truncate text-[11px] font-bold uppercase tracking-widest text-primary select-none">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c) }}
              onMouseDown={(e) => e.stopPropagation()}
              className="rounded p-0.5 text-muted-foreground hover:text-primary transition-colors"
              title={collapsed ? "Expand widget" : "Collapse widget"}
            >
              {collapsed ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {!isLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                onMouseDown={(e) => e.stopPropagation()}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                title="Remove widget"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <div
          className="flex-1 min-h-0 overflow-hidden"
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
