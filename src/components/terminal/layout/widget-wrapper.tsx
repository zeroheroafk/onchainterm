"use client"

import { forwardRef } from "react"
import { GripVertical, X } from "lucide-react"
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
    return (
      <div
        ref={ref}
        className="flex h-full w-full flex-col overflow-hidden rounded border border-border bg-card transition-colors widget-panel"
      >
        <div
          className={`flex h-8 shrink-0 items-center justify-between border-b border-border bg-secondary/30 px-2 ${
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
          {!isLocked && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              onMouseDown={(e) => e.stopPropagation()}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Remove widget"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    )
  }
)
