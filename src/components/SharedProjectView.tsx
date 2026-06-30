import { useEffect, useState } from "react"
import { Lock, Loader2, Globe, Film, Clock, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { viewSharedProject, type SharedProjectData } from "@/lib/supabase"
import type { PromptGeneration } from "@/types"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function SharedProjectView({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SharedProjectData | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = async (pwd?: string) => {
    const res = await viewSharedProject(token, pwd)
    if (res.ok) {
      setData(res.data)
      setNeedsPassword(false)
      setInvalid(false)
    } else {
      setNotFound(res.notFound)
      setNeedsPassword(res.needsPassword)
      setInvalid(res.invalidPassword)
    }
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleSubmit = async () => {
    setSubmitting(true)
    await load(password)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen" style={{ background: "#0c0c1e" }}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notFound ? (
          <Centered title="Link not found" subtitle="This share link is invalid or was revoked." />
        ) : needsPassword ? (
          <div className="mx-auto flex max-w-sm flex-col gap-4 rounded-2xl border border-border p-6" style={{ background: "var(--card)" }}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(245,158,11,0.12)" }}>
                <Lock className="h-5 w-5" style={{ color: "#F59E0B" }} />
              </div>
              <h1 className="text-base font-semibold text-foreground">Password required</h1>
              <p className="text-xs text-muted-foreground">
                This shared project is protected. Enter the password to continue.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Password</Label>
              <Input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                aria-invalid={invalid}
              />
              {invalid && <p className="text-xs text-destructive">Incorrect password. Try again.</p>}
            </div>
            <Button onClick={handleSubmit} disabled={submitting || !password} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Unlock
            </Button>
          </div>
        ) : data ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Shared project</span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {data.generations.length} prompt set{data.generations.length === 1 ? "" : "s"}
              </p>
            </div>
            <Separator className="bg-border" />
            {data.generations.length === 0 ? (
              <Centered title="Nothing here yet" subtitle="This project has no prompts." />
            ) : (
              <div className="flex flex-col gap-4">
                {data.generations.map((g) => (
                  <SharedPromptCard key={g.id} item={g} />
                ))}
              </div>
            )}
            <p className="pt-4 text-center text-xs text-muted-foreground">
              Read-only shared view · AI Video Prompt Generator
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Centered({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function SharedPromptCard({ item }: { item: PromptGeneration }) {
  const totalDuration =
    item.settings.duration.hook +
    item.settings.duration.content +
    item.settings.duration.content2 +
    item.settings.duration.cta
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4" style={{ background: "var(--card)" }}>
      <div className="flex items-start gap-3">
        {item.product.productImages?.[0] ? (
          <img
            src={item.product.productImages[0]}
            alt={item.product.name}
            className="h-11 w-11 flex-shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-lg" style={{ background: "rgba(245,158,11,0.1)" }}>
            🎬
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {item.product.name || "Untitled product"}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(item.createdAt)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1 border-primary/40 px-2 py-0 text-xs text-primary">
          <Globe className="h-3 w-3" />
          {item.settings.language}
        </Badge>
        <Badge variant="outline" className="gap-1 border-border px-2 py-0 text-xs text-muted-foreground">
          <Film className="h-3 w-3" />
          {item.settings.videoModel}
        </Badge>
        <span className="text-xs text-muted-foreground">{totalDuration}s total</span>
      </div>

      <Separator className="bg-border" />
      <SharedPrompt label="Image Prompt" value={item.prompts.imagePrompt} />
      <SharedPrompt label="Hook Prompt" value={item.prompts.hookPrompt} />
      <SharedPrompt label="Content Prompt 1" value={item.prompts.contentPrompt} />
      <SharedPrompt label="Content Prompt 2" value={item.prompts.content2Prompt} />
      <SharedPrompt label="CTA Prompt" value={item.prompts.ctaPrompt} />
    </div>
  )
}

function SharedPrompt({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <Button variant="ghost" size="sm" onClick={copy} className="h-6 gap-1 px-2 text-xs text-muted-foreground">
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground">
        {value}
      </pre>
    </div>
  )
}
