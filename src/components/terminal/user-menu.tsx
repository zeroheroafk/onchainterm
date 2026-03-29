"use client"

import { useState, useRef } from "react"
import { LogIn, LogOut, User, Pencil, Save, X } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { useAuth } from "@/lib/auth-context"
import { AuthModal } from "@/components/terminal/auth-modal"

export function UserMenu() {
  const { user, username, signOut, refreshUser } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { theme } = useTheme()
  const isBloomberg = theme.bloombergMode

  const handleEditProfile = () => {
    setEditUsername(username || "")
    setSaveError(null)
    setEditMode(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setSaveError(null)
  }

  const handleSaveProfile = async () => {
    if (!user || !editUsername.trim()) return
    setSaving(true)
    setSaveError(null)

    try {
      const { error: profileError } = await (await import("@/lib/supabase")).supabase
        .from("profiles")
        .update({ username: editUsername.trim() })
        .eq("id", user.id)

      if (profileError) {
        setSaveError(profileError.message)
        setSaving(false)
        return
      }

      const { error: authError } = await (await import("@/lib/supabase")).supabase
        .auth.updateUser({ data: { username: editUsername.trim() } })

      if (authError) {
        setSaveError(authError.message)
        setSaving(false)
        return
      }

      await refreshUser()
      setEditMode(false)
    } catch {
      setSaveError("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const closeMenu = () => {
    setShowMenu(false)
    setEditMode(false)
    setSaveError(null)
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className={`flex items-center gap-1.5 border border-border/50 px-2.5 py-1 text-[10px] text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground hover:border-border ${isBloomberg ? "" : "rounded-md"}`}
        >
          <LogIn className="size-3" />
          <span className="hidden sm:inline">Sign In</span>
        </button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/20 ${isBloomberg ? "" : "rounded-md"}`}
      >
        <User className="size-3" />
        <span className="hidden sm:inline max-w-[80px] truncate">{username || user.email?.split("@")[0]}</span>
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div className={`absolute right-0 top-full mt-1 z-50 w-52 border border-border bg-card py-1 ${isBloomberg ? "" : "rounded-md shadow-xl"}`}>
            {editMode ? (
              <div className="px-3 py-2 border-b border-border">
                <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Username</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); if (e.key === "Escape") handleCancelEdit() }}
                  className={`mt-1 w-full bg-secondary border border-border px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary ${isBloomberg ? "" : "rounded"}`}
                  disabled={saving}
                />
                {saveError && (
                  <p className="mt-1 text-[9px] text-red-400">{saveError}</p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || !editUsername.trim()}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50 ${isBloomberg ? "" : "rounded"}`}
                  >
                    <Save className="size-3" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground border border-border hover:bg-secondary transition-colors disabled:opacity-50 ${isBloomberg ? "" : "rounded"}`}
                  >
                    <X className="size-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[11px] font-bold text-foreground truncate">{username}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleEditProfile}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-secondary transition-colors"
                >
                  <Pencil className="size-3" />
                  Edit Profile
                </button>
              </>
            )}
            <button
              onClick={() => { signOut(); closeMenu() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="size-3" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
