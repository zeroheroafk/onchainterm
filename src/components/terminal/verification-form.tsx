"use client"

import { useState, useRef } from "react"
import {
  X,
  Shield,
  Upload,
  ImagePlus,
  Loader2,
  Trash2,
  FileText,
  AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/lib/theme-context"
import { supabase } from "@/lib/supabase"

interface VerificationFormProps {
  onClose: () => void
  onSuccess: () => void
}

export function VerificationForm({ onClose, onSuccess }: VerificationFormProps) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isBloomberg = theme.bloombergMode

  const [portfolioValue, setPortfolioValue] = useState("")
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    const valid = newFiles.filter(f => {
      if (f.size > 5 * 1024 * 1024) return false // 5MB max
      if (!f.type.startsWith("image/")) return false
      return true
    })
    setFiles(prev => [...prev, ...valid].slice(0, 5)) // max 5 files
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!portfolioValue.trim()) {
      setError("Please enter your portfolio value.")
      return
    }
    if (!description.trim()) {
      setError("Please provide a description of your proof.")
      return
    }
    if (files.length === 0) {
      setError("Please upload at least one screenshot as proof.")
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Upload files to Supabase Storage
      const uploadedUrls: string[] = []

      for (const file of files) {
        const ext = file.name.split(".").pop() || "png"
        const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from("verification-uploads")
          .upload(filePath, file, { contentType: file.type })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        uploadedUrls.push(filePath)
      }

      // Create verification request
      const { error: insertError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          portfolio_value: portfolioValue.trim(),
          description: description.trim(),
          screenshot_urls: uploadedUrls,
          status: "pending",
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className={`relative w-full max-w-lg mx-4 border border-border bg-card max-h-[85vh] overflow-y-auto ${isBloomberg ? "" : "rounded-lg shadow-2xl"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Portfolio Verification</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          {/* Instructions */}
          <div className={`border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200/80 ${isBloomberg ? "" : "rounded-lg"}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-400 mb-1">How to verify your portfolio</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>1. Take screenshots of your exchange/wallet balances</li>
                  <li>2. Screenshots must show total value &gt; $100,000</li>
                  <li>3. Include your OnchainTerm username visible in the screenshot (write it on paper next to screen)</li>
                  <li>4. We accept: exchange screenshots, DeFi dashboards, on-chain wallet views</li>
                  <li>5. Our admin team will review within 24-48h</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Portfolio value */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">
              Estimated Portfolio Value (USD)
            </label>
            <input
              type="text"
              value={portfolioValue}
              onChange={e => setPortfolioValue(e.target.value)}
              placeholder="e.g. $150,000"
              className={`w-full bg-secondary border border-border px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary ${isBloomberg ? "" : "rounded-md"}`}
              disabled={uploading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">
              Description / Proof Details
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Describe your holdings: which exchanges, wallets, DeFi positions, etc. Include any relevant details that help verify your portfolio."
              className={`w-full bg-secondary border border-border px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary resize-none ${isBloomberg ? "" : "rounded-md"}`}
              disabled={uploading}
            />
            <span className="text-[9px] text-muted-foreground">{description.length}/1000</span>
          </div>

          {/* File uploads */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1.5">
              Screenshots (max 5, up to 5MB each)
            </label>

            {/* File list */}
            {files.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 border border-border/40 bg-secondary/30 px-2.5 py-1.5 ${isBloomberg ? "" : "rounded-md"}`}
                  >
                    <FileText className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-foreground truncate flex-1">{file.name}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)}KB</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="rounded p-0.5 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`flex items-center gap-2 w-full border border-dashed border-border/60 px-3 py-3 text-[10px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors ${isBloomberg ? "" : "rounded-md"}`}
              >
                <ImagePlus className="size-4" />
                <span>Click to add screenshot</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={uploading}
            className={`flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50 ${isBloomberg ? "" : "rounded-md"}`}
          >
            {uploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading & Submitting...
              </>
            ) : (
              <>
                <Upload className="size-3.5" />
                Submit Verification Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
