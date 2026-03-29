"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X,
  User,
  Shield,
  ShieldCheck,
  Globe,
  Lock,
  Pencil,
  Save,
  Loader2,
  Wallet,
  CheckCircle2,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/lib/theme-context"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/lib/toast-context"
import { VerificationForm } from "./verification-form"

interface ProfileData {
  id: string
  username: string
  bio: string
  portfolio_public: boolean
  portfolio_verified: boolean
  is_admin: boolean
  created_at: string
}

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  /** If set, view another user's profile. If null, view own profile. */
  viewUserId?: string | null
}

const PORTFOLIO_STORAGE_KEY = "onchainterm_portfolio"

function getLocalPortfolioValue(): number {
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY)
    if (!raw) return 0
    const entries = JSON.parse(raw)
    // Rough estimate — just sum amounts * buy prices as fallback
    return entries.reduce((sum: number, e: { amount: number; buyPrice: number }) => sum + e.amount * e.buyPrice, 0)
  } catch {
    return 0
  }
}

export function UserProfileModal({ isOpen, onClose, viewUserId }: UserProfileModalProps) {
  const { user, username, refreshUser } = useAuth()
  const { theme } = useTheme()
  const { toast } = useToast()
  const isBloomberg = theme.bloombergMode

  const isOwnProfile = !viewUserId || viewUserId === user?.id
  const targetUserId = viewUserId || user?.id

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingBio, setEditingBio] = useState(false)
  const [bioText, setBioText] = useState("")
  const [saving, setSaving] = useState(false)
  const [showVerificationForm, setShowVerificationForm] = useState(false)
  const [portfolioValue] = useState(() => getLocalPortfolioValue())

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle()

      if (error) {
        console.error("Fetch profile error:", error)
        setProfile(null)
      } else if (data) {
        setProfile(data as ProfileData)
        setBioText(data.bio || "")
      } else if (isOwnProfile && user) {
        // Profile doesn't exist yet, create it
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username: username || user.email?.split("@")[0] || "Anon",
            bio: "",
            portfolio_public: false,
            portfolio_verified: false,
          })
          .select()
          .single()

        if (!insertError && newProfile) {
          setProfile(newProfile as ProfileData)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [targetUserId, isOwnProfile, user, username])

  useEffect(() => {
    if (isOpen) fetchProfile()
  }, [isOpen, fetchProfile])

  const handleSaveBio = async () => {
    if (!user || !profile) return
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({ bio: bioText.slice(0, 280), updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (error) {
      toast("Failed to save bio", "error")
    } else {
      setProfile(prev => prev ? { ...prev, bio: bioText.slice(0, 280) } : prev)
      setEditingBio(false)
      toast("Bio updated", "success")
    }
    setSaving(false)
  }

  const handleTogglePortfolioPublic = async () => {
    if (!user || !profile) return
    const newValue = !profile.portfolio_public
    const { error } = await supabase
      .from("profiles")
      .update({ portfolio_public: newValue, updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (error) {
      toast("Failed to update setting", "error")
    } else {
      setProfile(prev => prev ? { ...prev, portfolio_public: newValue } : prev)
      toast(newValue ? "Portfolio is now public" : "Portfolio is now private", "success")
    }
  }

  const handleVerificationSuccess = () => {
    setShowVerificationForm(false)
    toast("Verification request submitted! We'll review it shortly.", "success")
    fetchProfile()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div
          className={`relative w-full max-w-md mx-4 border border-border bg-card ${isBloomberg ? "" : "rounded-lg shadow-2xl"}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <User className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                {isOwnProfile ? "My Profile" : profile?.username || "Profile"}
              </h2>
            </div>
            <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !profile ? (
            <div className="flex items-center justify-center py-16 text-xs text-muted-foreground">
              Profile not found
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-secondary border border-border">
                  <User className="size-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground truncate">
                      {profile.username}
                    </span>
                    {profile.portfolio_verified && (
                      <ShieldCheck className="size-4 text-positive shrink-0" title="Verified Portfolio" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Bio</span>
                  {isOwnProfile && !editingBio && (
                    <button
                      onClick={() => setEditingBio(true)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="size-2.5" /> Edit
                    </button>
                  )}
                </div>
                {editingBio && isOwnProfile ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={bioText}
                      onChange={e => setBioText(e.target.value)}
                      maxLength={280}
                      rows={3}
                      className={`w-full bg-secondary border border-border px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary resize-none ${isBloomberg ? "" : "rounded-md"}`}
                      placeholder="Tell others about yourself..."
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">{bioText.length}/280</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleSaveBio}
                          disabled={saving}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50 ${isBloomberg ? "" : "rounded"}`}
                        >
                          <Save className="size-3" />
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => { setEditingBio(false); setBioText(profile.bio || "") }}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground border border-border hover:bg-secondary transition-colors ${isBloomberg ? "" : "rounded"}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={`text-xs text-foreground/80 ${!profile.bio ? "italic text-muted-foreground" : ""}`}>
                    {profile.bio || (isOwnProfile ? "No bio yet. Click edit to add one." : "No bio.")}
                  </p>
                )}
              </div>

              {/* Portfolio sharing */}
              {isOwnProfile && (
                <div className="border border-border/40 rounded-lg p-3 bg-secondary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="size-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground">Portfolio Sharing</span>
                    </div>
                    <button
                      onClick={handleTogglePortfolioPublic}
                      className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold border transition-colors ${isBloomberg ? "" : "rounded-md"} ${
                        profile.portfolio_public
                          ? "border-positive/30 bg-positive/10 text-positive"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
                      }`}
                    >
                      {profile.portfolio_public ? <Globe className="size-3" /> : <Lock className="size-3" />}
                      {profile.portfolio_public ? "Public" : "Private"}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {profile.portfolio_public
                      ? "Other users can see your portfolio on your profile."
                      : "Your portfolio is hidden from other users."}
                  </p>
                </div>
              )}

              {/* Verification status */}
              <div className="border border-border/40 rounded-lg p-3 bg-secondary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {profile.portfolio_verified ? (
                      <ShieldCheck className="size-3.5 text-positive" />
                    ) : (
                      <Shield className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-bold text-foreground">Portfolio Verification</span>
                  </div>
                  {profile.portfolio_verified && (
                    <span className="flex items-center gap-1 text-[10px] text-positive font-bold">
                      <CheckCircle2 className="size-3" /> Verified
                    </span>
                  )}
                </div>

                {profile.portfolio_verified ? (
                  <p className="text-[10px] text-muted-foreground">
                    Your portfolio has been verified. You have the <strong className="text-positive">Whale</strong> badge.
                  </p>
                ) : isOwnProfile ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Verify your portfolio value exceeds $100,000 to earn the <strong className="text-amber-400">Whale</strong> badge.
                      Submit proof for admin review.
                    </p>
                    <button
                      onClick={() => setShowVerificationForm(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/80 transition-colors ${isBloomberg ? "" : "rounded-md"}`}
                    >
                      <Shield className="size-3" />
                      Request Verification
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Not verified.</p>
                )}
              </div>

              {/* Public portfolio view (for viewing other users) */}
              {!isOwnProfile && profile.portfolio_public && (
                <div className="border border-border/40 rounded-lg p-3 bg-secondary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">Portfolio</span>
                    {profile.portfolio_verified && (
                      <span className="flex items-center gap-0.5 text-[9px] text-positive font-bold bg-positive/10 border border-positive/20 px-1.5 py-0.5 rounded-full">
                        <ShieldCheck className="size-2.5" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Portfolio data is shown in the Portfolio widget when shared.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Verification form modal */}
      {showVerificationForm && (
        <VerificationForm
          onClose={() => setShowVerificationForm(false)}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </>
  )
}
