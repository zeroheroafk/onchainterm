"use client"
import { useCallback } from "react"

export function useScreenshot() {
  const captureScreenshot = useCallback(async () => {
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import("html2canvas")).default
      const element = document.getElementById("terminal-content")
      if (!element) return

      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
      })

      const link = document.createElement("a")
      link.download = `onchainterm-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (err) {
      // Fallback: use browser's built-in screenshot
      console.warn("Screenshot failed:", err)
    }
  }, [])

  return { captureScreenshot }
}
