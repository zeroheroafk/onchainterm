"use client"

import { useState, useEffect, useCallback, useRef } from "react"

const STORAGE_KEY = "onchainterm_notes"

export function NotesWidget() {
  const [content, setContent] = useState("")
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setContent(saved)
    } catch {}
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const handleChange = useCallback((value: string) => {
    setContent(value)
    setSaveStatus('saving')
    try { localStorage.setItem(STORAGE_KEY, value) } catch {}

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved')
      idleTimerRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    }, 500)
  }, [])

  return (
    <div className="h-full flex flex-col">
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type your notes here..."
        className="flex-1 w-full resize-none bg-transparent p-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 font-mono"
        spellCheck={false}
      />
      <div className="border-t border-border/20 px-3 py-1 text-[9px] text-muted-foreground shrink-0 flex items-center justify-between">
        <span className="text-[8px] text-muted-foreground/30 num">{content.length} chars</span>
        {saveStatus === 'saving' && <span className="text-[8px] text-muted-foreground/40 animate-pulse">Saving...</span>}
        {saveStatus === 'saved' && <span className="text-[8px] text-positive/60">✓ Saved</span>}
      </div>
    </div>
  )
}
