"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  User,
  ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  LogIn,
  ChevronDown,
  FileText,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/lib/theme-context"
import { ToastProvider, useToast } from "@/lib/toast-context"

interface VerificationRequest {
  id: string
  user_id: string
  status: "pending" | "approved" | "rejected"
  portfolio_value: string
  description: string
  screenshot_urls: string[]
  admin_notes: string
  created_at: string
  updated_at: string
  // joined
  username?: string
  email?: string
}

type StatusFilter = "all" | "pending" | "approved" | "rejected"

function AdminPanelInner() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>("pending")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  // Check admin status
  useEffect(() => {
    if (!user) return
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(data?.is_admin === true)
      })
  }, [user])

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    if (!user || !isAdmin) return
    setLoading(true)

    let query = supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (filter !== "all") {
      query = query.eq("status", filter)
    }

    const { data, error } = await query

    if (error) {
      console.error("Fetch requests error:", error)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    // Get usernames from profiles
    const userIds = [...new Set(data.map((r: VerificationRequest) => r.user_id))]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds)

    const profileMap = new Map(
      profiles?.map((p: { id: string; username: string }) => [p.id, p.username]) || []
    )

    const enriched = data.map((r: VerificationRequest) => ({
      ...r,
      username: profileMap.get(r.user_id) || "Unknown",
    }))

    setRequests(enriched)
    setLoading(false)
  }, [user, isAdmin, filter])

  useEffect(() => {
    if (isAdmin) fetchRequests()
  }, [isAdmin, fetchRequests])

  // Get signed URL for a screenshot
  const getImageUrl = useCallback(async (path: string) => {
    if (imageUrls[path]) return imageUrls[path]

    const { data } = await supabase.storage
      .from("verification-uploads")
      .createSignedUrl(path, 3600) // 1 hour expiry

    if (data?.signedUrl) {
      setImageUrls(prev => ({ ...prev, [path]: data.signedUrl }))
      return data.signedUrl
    }
    return null
  }, [imageUrls])

  // Load images when expanding a request
  useEffect(() => {
    if (!expandedId) return
    const req = requests.find(r => r.id === expandedId)
    if (!req) return
    req.screenshot_urls.forEach(url => getImageUrl(url))
  }, [expandedId, requests, getImageUrl])

  const handleApprove = async (requestId: string, userId: string) => {
    setProcessing(requestId)
    try {
      // Update request status
      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          admin_notes: adminNotes[requestId] || "",
          reviewed_by: user!.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)

      if (reqError) throw reqError

      // Update profile as verified
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          portfolio_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (profileError) throw profileError

      toast("Verification approved!", "success")
      fetchRequests()
    } catch (err) {
      toast("Failed to approve: " + (err instanceof Error ? err.message : "Unknown error"), "error")
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessing(requestId)
    try {
      const { error } = await supabase
        .from("verification_requests")
        .update({
          status: "rejected",
          admin_notes: adminNotes[requestId] || "",
          reviewed_by: user!.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)

      if (error) throw error

      toast("Verification rejected", "success")
      fetchRequests()
    } catch (err) {
      toast("Failed to reject: " + (err instanceof Error ? err.message : "Unknown error"), "error")
    } finally {
      setProcessing(null)
    }
  }

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Shield className="size-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Sign in to access the admin panel.</p>
          <a href="/terminal" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <LogIn className="size-3" /> Go to Terminal
          </a>
        </div>
      </div>
    )
  }

  // Not admin
  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <ShieldX className="size-12 text-red-400/50 mx-auto" />
          <p className="text-sm text-muted-foreground">Access denied. Admin privileges required.</p>
          <a href="/terminal" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            Go to Terminal
          </a>
        </div>
      </div>
    )
  }

  // Still checking admin
  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const statusCounts = {
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground">Manage verification requests</p>
            </div>
          </div>
          <a href="/terminal" className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ExternalLink className="size-3" /> Terminal
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(["pending", "approved", "rejected"] as const).map(status => (
            <div
              key={status}
              className={`border border-border rounded-lg p-3 bg-card cursor-pointer transition-colors ${filter === status ? "border-primary/40 bg-primary/5" : "hover:bg-secondary/30"}`}
              onClick={() => setFilter(status)}
            >
              <div className="flex items-center gap-2 mb-1">
                {status === "pending" && <Clock className="size-3.5 text-amber-400" />}
                {status === "approved" && <CheckCircle2 className="size-3.5 text-positive" />}
                {status === "rejected" && <XCircle className="size-3.5 text-red-400" />}
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{status}</span>
              </div>
              <span className="text-xl font-bold num">{statusCounts[status]}</span>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-border">
          {(["all", "pending", "approved", "rejected"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
                filter === s
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Request list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="size-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">No {filter === "all" ? "" : filter} verification requests.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map(req => {
              const isExpanded = expandedId === req.id
              const isProcessing = processing === req.id

              return (
                <div
                  key={req.id}
                  className="border border-border rounded-lg bg-card overflow-hidden"
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-secondary/20 transition-colors"
                  >
                    <div className="shrink-0">
                      {req.status === "pending" && <Clock className="size-4 text-amber-400" />}
                      {req.status === "approved" && <CheckCircle2 className="size-4 text-positive" />}
                      {req.status === "rejected" && <XCircle className="size-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="size-3 text-muted-foreground" />
                        <span className="text-xs font-bold">{req.username}</span>
                        <span className="text-[10px] text-muted-foreground">claims {req.portfolio_value}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">{req.screenshot_urls.length} file(s)</span>
                      <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 space-y-4">
                      {/* Description */}
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Description</span>
                        <p className="text-xs text-foreground/80 whitespace-pre-wrap">{req.description}</p>
                      </div>

                      {/* Screenshots */}
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-2">Screenshots</span>
                        <div className="grid grid-cols-2 gap-2">
                          {req.screenshot_urls.map((path, i) => {
                            const url = imageUrls[path]
                            return (
                              <div key={i} className="border border-border rounded-md overflow-hidden bg-secondary/20">
                                {url ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt={`Screenshot ${i + 1}`}
                                      className="w-full h-auto max-h-48 object-contain"
                                    />
                                  </a>
                                ) : (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Admin notes */}
                      {req.status === "pending" && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Admin Notes</span>
                          <textarea
                            value={adminNotes[req.id] || ""}
                            onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                            rows={2}
                            placeholder="Optional notes (visible to admin only)..."
                            className="w-full bg-secondary border border-border px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary rounded-md resize-none"
                          />
                        </div>
                      )}

                      {req.admin_notes && req.status !== "pending" && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Admin Notes</span>
                          <p className="text-xs text-foreground/60">{req.admin_notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {req.status === "pending" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                          <button
                            onClick={() => handleApprove(req.id, req.user_id)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-positive/20 text-positive border border-positive/30 hover:bg-positive/30 rounded-md transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                            Approve & Verify
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminPanel() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AdminPanelInner />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
