import { Film, ImageIcon, ChevronLeft, ChevronRight, Trash2, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { clipStart } from "@/editor/compositor"
import type { Clip, EditorAsset, Timeline as TimelineType } from "@/editor/types"

interface TimelineProps {
  timeline: TimelineType
  assets: EditorAsset[]
  onChange: (timeline: TimelineType) => void
}

function mutateClip(clip: Clip, patch: Partial<Clip>): Clip {
  return { ...clip, ...patch }
}

export function Timeline({ timeline, assets, onChange }: TimelineProps) {
  const assetMap = new Map(assets.map((a) => [a.id, a]))

  const update = (clips: Clip[]) => onChange({ ...timeline, clips })

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= timeline.clips.length) return
    const next = [...timeline.clips]
    ;[next[index], next[target]] = [next[target], next[index]]
    update(next)
  }

  const remove = (index: number) => {
    update(timeline.clips.filter((_, i) => i !== index))
  }

  const setDuration = (index: number, value: number) => {
    const v = Math.max(0.5, Math.min(120, value || 0))
    update(timeline.clips.map((c, i) => (i === index ? mutateClip(c, { duration: v }) : c)))
  }

  const setCaption = (index: number, value: string) => {
    update(timeline.clips.map((c, i) => (i === index ? mutateClip(c, { caption: value }) : c)))
  }

  if (timeline.clips.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 flex flex-col items-center gap-2 text-muted-foreground">
        <Clock className="w-6 h-6" />
        <p className="text-xs">Add assets from the library to build your timeline.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="w-full rounded-xl border border-border bg-card">
      <div className="flex gap-3 p-3 min-w-min">
        {timeline.clips.map((clip, index) => {
          const asset = assetMap.get(clip.assetId)
          const Icon = asset?.kind === "image" ? ImageIcon : Film
          const start = clipStart(timeline, index)
          return (
            <div
              key={clip.id}
              className="w-56 shrink-0 rounded-lg border border-border bg-secondary/40 overflow-hidden"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-secondary/70 border-b border-border">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    #{index + 1}
                  </span>
                  <Icon className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[11px] text-foreground truncate">
                    {asset?.name ?? "Missing asset"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  aria-label="Remove clip"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2.5 flex flex-col gap-2">
                <div
                  className={cn(
                    "h-16 rounded-md flex items-center justify-center text-[10px] font-mono",
                    asset ? "bg-black/60 text-muted-foreground" : "bg-destructive/20 text-destructive"
                  )}
                >
                  {asset ? `starts ${start.toFixed(1)}s` : "asset deleted"}
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={clip.duration}
                    onChange={(e) => setDuration(index, parseFloat(e.target.value))}
                    className="h-7 text-[11px] px-2"
                  />
                  <span className="text-[10px] text-muted-foreground">sec</span>
                </div>

                <Input
                  value={clip.caption}
                  onChange={(e) => setCaption(index, e.target.value)}
                  placeholder="Heading / caption…"
                  className="h-7 text-[11px] px-2"
                />

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="flex-1 h-6 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    aria-label="Move left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === timeline.clips.length - 1}
                    className="flex-1 h-6 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    aria-label="Move right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
