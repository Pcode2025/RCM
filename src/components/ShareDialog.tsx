import { useEffect, useState } from "react"
import { Link2, Copy, Check, Lock, LockOpen, Loader2, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  getShareStatus,
  createShare,
  revokeShare,
  buildShareUrl,
} from "@/lib/supabase"
import type { Project } from "@/types"

interface ShareDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ project, open, onOpenChange }: ShareDialogProps) {
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [shared, setShared] = useState(false)
  const [isProtected, setIsProtected] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || !project) return
    setPassword("")
    setCopied(false)
    setLoading(true)
    getShareStatus(project.id)
      .then((s) => {
        setShared(s.shared)
        setIsProtected(!!s.isProtected)
        setToken(s.token ?? null)
      })
      .finally(() => setLoading(false))
  }, [open, project])

  if (!project) return null

  const shareUrl = token ? buildShareUrl(token) : ""

  const handleEnable = async () => {
    setWorking(true)
    const res = await createShare(project.id, password || undefined)
    setWorking(false)
    if (res) {
      setShared(true)
      setToken(res.token)
      setIsProtected(res.isProtected)
      setPassword("")
    }
  }

  const handleRevoke = async () => {
    setWorking(true)
    const ok = await revokeShare(project.id)
    setWorking(false)
    if (ok) {
      setShared(false)
      setToken(null)
      setIsProtected(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4" style={{ color: "#F59E0B" }} />
            Share "{project.name}"
          </DialogTitle>
          <DialogDescription>
            Anyone with the link can view this project's prompts. Add a password to keep it
            private.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : shared ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {isProtected ? (
                <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                  <Lock className="w-3 h-3" /> Password protected
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
                  <LockOpen className="w-3 h-3" /> Public link
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Share link</Label>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} className="text-xs font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {isProtected ? "Change password" : "Add a password"}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isProtected ? "New password" : "Leave blank for public"}
                  className="text-sm"
                />
                <Button onClick={handleEnable} disabled={working} className="shrink-0">
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {isProtected && (
                <p className="text-xs text-muted-foreground">
                  Submit an empty password to make the link public again.
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              onClick={handleRevoke}
              disabled={working}
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Stop sharing
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Password (optional)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for a public link"
                className="text-sm"
              />
            </div>
            <Button onClick={handleEnable} disabled={working} className="gap-2">
              {working ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Create share link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
