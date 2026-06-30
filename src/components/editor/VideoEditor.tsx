import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Clapperboard, Loader2, Check } from "lucide-react"
import { EditorProjectPicker } from "@/components/editor/EditorProjectPicker"
import { AssetLibrary } from "@/components/editor/AssetLibrary"
import { Timeline } from "@/components/editor/Timeline"
import { PreviewStage } from "@/components/editor/PreviewStage"
import { ExportControls } from "@/components/editor/ExportControls"
import { fetchAssets, updateEditorProject } from "@/lib/editorApi"
import {
  EMPTY_TIMELINE,
  type EditorAsset,
  type EditorProject,
  type Timeline as TimelineType,
} from "@/editor/types"

type SaveState = "idle" | "saving" | "saved"

export function VideoEditor() {
  const [project, setProject] = useState<EditorProject | null>(null)
  const [assets, setAssets] = useState<EditorAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const projectId = project?.id ?? null

  useEffect(() => {
    if (!projectId) {
      setAssets([])
      return
    }
    let cancelled = false
    setAssetsLoading(true)
    fetchAssets(projectId).then((list) => {
      if (cancelled) return
      setAssets(list)
      setAssetsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Debounced persistence of the working timeline + export settings.
  const scheduleSave = useCallback(
    (next: EditorProject) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setSaveState("saving")
      saveTimer.current = setTimeout(async () => {
        const updated = await updateEditorProject(next.id, {
          timeline: next.timeline,
          exportResolution: next.exportResolution,
          exportFps: next.exportFps,
          orientation: next.orientation,
        })
        setSaveState(updated ? "saved" : "idle")
        if (updated) setTimeout(() => setSaveState("idle"), 1500)
      }, 700)
    },
    []
  )

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  const patchProject = (patch: Partial<EditorProject>) => {
    setProject((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      scheduleSave(next)
      return next
    })
  }

  const setTimeline = (timeline: TimelineType) => patchProject({ timeline })

  const handleAddClip = (asset: EditorAsset) => {
    if (!project) return
    const duration = asset.kind === "video" && asset.duration > 0 ? asset.duration : 5
    const clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      assetId: asset.id,
      duration: Math.round(duration * 10) / 10,
      caption: "",
    }
    setTimeline({ ...project.timeline, clips: [...project.timeline.clips, clip] })
  }

  const handleSetAudio = (asset: EditorAsset | null) => {
    if (!project) return
    setTimeline({
      ...project.timeline,
      audio: asset
        ? { assetId: asset.id, volume: project.timeline.audio.volume }
        : { assetId: null, volume: project.timeline.audio.volume },
    })
  }

  const handleDeletedAsset = (asset: EditorAsset) => {
    setAssets((prev) => prev.filter((a) => a.id !== asset.id))
    if (!project) return
    const clips = project.timeline.clips.filter((c) => c.assetId !== asset.id)
    const audio =
      project.timeline.audio.assetId === asset.id
        ? { assetId: null, volume: project.timeline.audio.volume }
        : project.timeline.audio
    setTimeline({ ...project.timeline, clips, audio })
  }

  const timeline = project?.timeline ?? EMPTY_TIMELINE
  const audioAsset = useMemo(
    () => assets.find((a) => a.id === timeline.audio.assetId) ?? null,
    [assets, timeline.audio.assetId]
  )

  return (
    <div className="flex gap-4">
      {/* Left rail: projects + assets */}
      <div className="w-72 shrink-0 flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card h-[280px] overflow-hidden">
          <EditorProjectPicker activeId={projectId} onSelect={setProject} />
        </div>
        {project && (
          <div className="rounded-xl border border-border bg-card flex-1 min-h-[320px] overflow-hidden">
            <AssetLibrary
              projectId={project.id}
              assets={assets}
              audioAssetId={timeline.audio.assetId}
              onUploaded={(a) => setAssets((prev) => [...prev, a])}
              onDeleted={handleDeletedAsset}
              onAddClip={handleAddClip}
              onSetAudio={handleSetAudio}
            />
          </div>
        )}
      </div>

      {/* Main editing area */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {!project ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)" }}
            >
              <Clapperboard className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No project selected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create or pick a project on the left to start editing.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground truncate">{project.name}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {saveState === "saving" && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                  </>
                )}
                {saveState === "saved" && (
                  <>
                    <Check className="w-3 h-3 text-primary" /> Saved
                  </>
                )}
              </div>
            </div>

            {assetsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PreviewStage
                timeline={timeline}
                assets={assets}
                orientation={project.orientation}
                audioAsset={audioAsset}
                audioVolume={timeline.audio.volume}
              />
            )}

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-foreground">Timeline</span>
              <Timeline timeline={timeline} assets={assets} onChange={setTimeline} />
            </div>

            <ExportControls
              project={project}
              assets={assets}
              onPatch={(patch) => patchProject(patch)}
            />
          </>
        )}
      </div>
    </div>
  )
}
