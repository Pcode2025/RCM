import { useRef, useState } from "react"
import {
  Upload,
  Film,
  ImageIcon,
  Music,
  Trash2,
  Plus,
  Loader2,
  AudioLines,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { uploadAsset, deleteAsset } from "@/lib/editorApi"
import type { EditorAsset } from "@/editor/types"

interface UploadEntry {
  localId: string
  name: string
  progress: number
  error?: boolean
}

interface AssetLibraryProps {
  projectId: string
  assets: EditorAsset[]
  audioAssetId: string | null
  onUploaded: (asset: EditorAsset) => void
  onDeleted: (asset: EditorAsset) => void
  onAddClip: (asset: EditorAsset) => void
  onSetAudio: (asset: EditorAsset | null) => void
}

const KIND_ICON = {
  video: Film,
  image: ImageIcon,
  audio: Music,
}

export function AssetLibrary({
  projectId,
  assets,
  audioAssetId,
  onUploaded,
  onDeleted,
  onAddClip,
  onSetAudio,
}: AssetLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadEntry[]>([])
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files: File[]) => {
    files.forEach((file) => {
      if (!/^(video|image|audio)\//.test(file.type)) return
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setUploads((prev) => [...prev, { localId, name: file.name, progress: 0 }])

      uploadAsset(projectId, file, (pct) =>
        setUploads((prev) =>
          prev.map((u) => (u.localId === localId ? { ...u, progress: pct } : u))
        )
      )
        .then((asset) => {
          setUploads((prev) => prev.filter((u) => u.localId !== localId))
          if (asset) onUploaded(asset)
          else
            setUploads((prev) => [
              ...prev,
              { localId, name: file.name, progress: 0, error: true },
            ])
        })
        .catch(() =>
          setUploads((prev) =>
            prev.map((u) => (u.localId === localId ? { ...u, error: true } : u))
          )
        )
    })
  }

  const handleDelete = async (asset: EditorAsset) => {
    const ok = await deleteAsset(asset)
    if (ok) onDeleted(asset)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <AudioLines className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Assets</span>
        <span className="text-xs text-muted-foreground ml-auto">{assets.length}</span>
      </div>

      <div className="p-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFiles(Array.from(e.dataTransfer.files))
          }}
          className={cn(
            "rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-6 cursor-pointer transition-colors",
            dragging
              ? "border-primary/70 bg-primary/10"
              : "border-border hover:border-primary/40 hover:bg-primary/5 bg-card"
          )}
        >
          <Upload className="w-5 h-5 text-primary" />
          <p className="text-xs font-medium text-foreground">Upload media</p>
          <p className="text-[10px] text-muted-foreground text-center px-2">
            Video, images &amp; audio · drag &amp; drop or click
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,image/*,audio/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) handleFiles(Array.from(e.target.files))
            e.target.value = ""
          }}
        />
      </div>

      {uploads.length > 0 && (
        <div className="px-3 pb-2 flex flex-col gap-1.5">
          {uploads.map((u) => (
            <div
              key={u.localId}
              className="rounded-md border border-border bg-card px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2">
                {u.error ? (
                  <span className="text-[10px] text-destructive font-medium">Failed</span>
                ) : (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                )}
                <span className="text-[11px] text-foreground truncate flex-1">{u.name}</span>
                {!u.error && (
                  <span className="text-[10px] text-muted-foreground">{u.progress}%</span>
                )}
              </div>
              {!u.error && (
                <div className="h-1 rounded-full bg-border overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 px-3 pb-3">
        <div className="flex flex-col gap-2">
          {assets.length === 0 && uploads.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No media yet. Upload clips, images or audio to begin.
            </p>
          )}
          {assets.map((asset) => {
            const Icon = KIND_ICON[asset.kind]
            const isAudio = asset.kind === "audio"
            const isActiveAudio = isAudio && audioAssetId === asset.id
            return (
              <div
                key={asset.id}
                className="group rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-foreground truncate">
                      {asset.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {asset.kind}
                      {asset.duration > 0 && ` · ${asset.duration.toFixed(1)}s`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(asset)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    aria-label="Delete asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-2.5 pb-2">
                  {isAudio ? (
                    <Button
                      size="sm"
                      variant={isActiveAudio ? "default" : "outline"}
                      className="w-full h-7 text-[11px] gap-1.5"
                      onClick={() => onSetAudio(isActiveAudio ? null : asset)}
                    >
                      <Music className="w-3 h-3" />
                      {isActiveAudio ? "Remove background audio" : "Use as background audio"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-[11px] gap-1.5"
                      onClick={() => onAddClip(asset)}
                    >
                      <Plus className="w-3 h-3" />
                      Add to timeline
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
