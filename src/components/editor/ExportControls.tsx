import { useState } from "react"
import { Download, Loader2, Monitor, Smartphone, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { exportTimeline } from "@/editor/exporter"
import {
  FPS_OPTIONS,
  RESOLUTIONS,
  resolveDimensions,
  timelineDuration,
  type EditorAsset,
  type EditorProject,
  type Orientation,
  type ResolutionId,
} from "@/editor/types"

interface ExportControlsProps {
  project: EditorProject
  assets: EditorAsset[]
  onPatch: (patch: Partial<Pick<EditorProject, "exportResolution" | "exportFps" | "orientation">>) => void
}

export function ExportControls({ project, assets, onPatch }: ExportControlsProps) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const total = timelineDuration(project.timeline)
  const dims = resolveDimensions(project.exportResolution, project.orientation)

  const handleExport = async () => {
    setError(null)
    setExporting(true)
    setProgress(0)
    try {
      const result = await exportTimeline(project, assets, (f) => setProgress(Math.round(f * 100)))
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement("a")
      const safe = project.name.replace(/\s+/g, "_").replace(/[^\w.-]/g, "") || "video"
      a.href = url
      a.download = `${safe}_${project.exportResolution}_${project.exportFps}fps.${result.extension}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Export settings</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] text-muted-foreground">Resolution</Label>
          <Select
            value={project.exportResolution}
            onValueChange={(v) => onPatch({ exportResolution: v as ResolutionId })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTIONS.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] text-muted-foreground">Frame rate</Label>
          <Select
            value={String(project.exportFps)}
            onValueChange={(v) => onPatch({ exportFps: parseInt(v, 10) })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FPS_OPTIONS.map((f) => (
                <SelectItem key={f} value={String(f)} className="text-xs">
                  {f} fps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[11px] text-muted-foreground">Orientation</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["landscape", "portrait"] as Orientation[]).map((o) => {
            const active = project.orientation === o
            const Icon = o === "landscape" ? Monitor : Smartphone
            return (
              <button
                key={o}
                type="button"
                onClick={() => onPatch({ orientation: o })}
                className={cn(
                  "h-9 rounded-md border flex items-center justify-center gap-1.5 text-xs capitalize transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {o}
              </button>
            )
          })}
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
        {dims.width}×{dims.height} · {total.toFixed(1)}s · {project.exportFps}fps
      </div>

      {exporting && (
        <div className="flex flex-col gap-1.5">
          <Progress value={progress} className="h-2" />
          <span className="text-[11px] text-muted-foreground">
            Rendering… {progress}% (plays in real time)
          </span>
        </div>
      )}

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <Button
        onClick={handleExport}
        disabled={exporting || total <= 0}
        className="w-full gap-2"
        style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)", color: "#0c0c1e" }}
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Exporting…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export &amp; download video
          </>
        )}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Exports as .webm. Recording runs in real time — keep this tab focused.
      </p>
    </div>
  )
}
