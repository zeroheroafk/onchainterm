"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "onchainterm_notes"

export function NotesWidget() {
  const [content, setContent] = useState("")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setContent(saved)
    } catch {}
  }, [])

  const handleChange = useCallback((value: string) => {
    setContent(value)
    try { localStorage.setItem(STORAGE_KEY, value) } catch {}
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
      <div className="border-t border-border px-3 py-1 text-[9px] text-muted-foreground shrink-0">
        {content.length} chars &middot; Auto-saved locally
      </div>
    </div>
  )
}
