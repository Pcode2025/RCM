import { useRef, useState, useCallback, useEffect } from "react"
import { ImagePlus, X, Plus, CheckCircle, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { BUCKET, getPublicUrl, saveImageMetadata } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStatus = "converting" | "uploading" | "done" | "error"

interface ImageEntry {
  localId: string
  previewUrl: string        // Object URL for instant preview
  publicUrl?: string        // Supabase public URL (after done)
  progress: number          // 0–100
  status: UploadStatus
  name: string
}

// ─── Format conversion ────────────────────────────────────────────────────────
// OpenRouter vision models only accept PNG / JPEG / WebP / GIF. Anything else
// (AVIF, BMP, HEIC, TIFF…) is decoded and re-encoded to WebP before upload so the
// stored public URL is always something the model can fetch and analyse.

const MODEL_SUPPORTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
])

interface PreparedImage {
  blob: Blob
  type: string
  name: string
}

async function decodeToCanvas(file: File): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    bitmap = null
  }

  const canvas = document.createElement("canvas")

  if (bitmap) {
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
    bitmap.close()
    return canvas
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Could not decode image"))
      el.src = objectUrl
    })
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext("2d")?.drawImage(img, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (MODEL_SUPPORTED_TYPES.has(file.type)) {
    return { blob: file, type: file.type, name: file.name }
  }

  const canvas = await decodeToCanvas(file)
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("Could not decode image")
  }

  // Prefer WebP (small + model-supported); fall back to PNG if the browser
  // can't encode WebP (toBlob returns PNG in that case).
  let blob = await canvasToBlob(canvas, "image/webp", 0.92)
  let type = "image/webp"
  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/png")
    type = "image/png"
  }
  if (!blob) throw new Error("Could not convert image")

  const ext = type === "image/webp" ? "webp" : "png"
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image"
  return { blob, type, name: `${baseName}.${ext}` }
}

// ─── Upload helper (XHR for real progress events) ─────────────────────────────

function uploadFileXhr(
  blob: Blob,
  contentType: string,
  originalName: string,
  storagePath: string,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`
    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 95))
    }

    xhr.onload = async () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const publicUrl = getPublicUrl(storagePath)
        // Save metadata to DB (non-blocking)
        saveImageMetadata(storagePath, publicUrl, originalName, blob.size, contentType)
        resolve(publicUrl)
      } else {
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    }

    xhr.onerror = () => reject(new Error("Network error"))
    xhr.open("POST", url)
    xhr.setRequestHeader("Authorization", `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.setRequestHeader("x-upsert", "true")
    xhr.send(blob)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductImagesUpload({
  values,
  onChange,
  label = "Product Images",
}: {
  values: string[]
  onChange: (urls: string[]) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [entries, setEntries] = useState<ImageEntry[]>([])

  const updateEntry = useCallback(
    (localId: string, patch: Partial<ImageEntry>) =>
      setEntries((prev) => prev.map((e) => (e.localId === localId ? { ...e, ...patch } : e))),
    []
  )

  // Keep displayed thumbnails in sync with the parent `values` (e.g. when a past
  // generation is reopened from History, its saved image URLs should reappear).
  useEffect(() => {
    setEntries((prev) => {
      const kept = prev.filter(
        (e) => e.status !== "done" || (e.publicUrl != null && values.includes(e.publicUrl))
      )
      const known = new Set(kept.map((e) => e.publicUrl).filter(Boolean))
      const added: ImageEntry[] = values
        .filter((url) => !known.has(url))
        .map((url) => ({
          localId: url,
          previewUrl: url,
          publicUrl: url,
          progress: 100,
          status: "done" as const,
          name: decodeURIComponent(url.split("/").pop() ?? "image"),
        }))
      return added.length === 0 && kept.length === prev.length ? prev : [...kept, ...added]
    })
  }, [values])

  const uploadFiles = useCallback(
    (files: File[]) => {
      files.forEach((file) => {
        if (!file.type.startsWith("image/")) return

        const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        const previewUrl = URL.createObjectURL(file)
        const needsConversion = !MODEL_SUPPORTED_TYPES.has(file.type)

        const entry: ImageEntry = {
          localId,
          previewUrl,
          progress: 0,
          status: needsConversion ? "converting" : "uploading",
          name: file.name,
        }

        setEntries((prev) => [...prev, entry])

        prepareImageForUpload(file)
          .then(({ blob, type, name }) => {
            updateEntry(localId, { status: "uploading", name })
            const storagePath = `uploads/${localId}-${name.replace(/\s+/g, "_")}`
            return uploadFileXhr(blob, type, name, storagePath, (pct) =>
              updateEntry(localId, { progress: pct })
            )
          })
          .then((publicUrl) => {
            setEntries((prev) => {
              const next = prev.map((e) =>
                e.localId === localId
                  ? { ...e, progress: 100, status: "done" as const, publicUrl }
                  : e
              )
              const urls = next
                .filter((e) => e.status === "done" && e.publicUrl)
                .map((e) => e.publicUrl as string)
              queueMicrotask(() => onChange(urls))
              return next
            })
          })
          .catch(() => {
            updateEntry(localId, { status: "error" })
          })
      })
    },
    [onChange, updateEntry]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(Array.from(e.target.files))
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  const removeEntry = (localId: string) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.localId === localId)
      if (target?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(target.previewUrl)
      const next = prev.filter((e) => e.localId !== localId)
      const urls = next
        .filter((e) => e.status === "done" && e.publicUrl)
        .map((e) => e.publicUrl as string)
      queueMicrotask(() => onChange(urls))
      return next
    })
  }

  const clearAll = () => {
    entries.forEach((e) => {
      if (e.previewUrl.startsWith("blob:")) URL.revokeObjectURL(e.previewUrl)
    })
    setEntries([])
    onChange([])
  }

  const convertingCount = entries.filter((e) => e.status === "converting").length
  const uploadingCount = entries.filter(
    (e) => e.status === "uploading" || e.status === "converting"
  ).length
  const doneCount = entries.filter((e) => e.status === "done").length
  const totalCount = entries.length
  const hasEntries = totalCount > 0

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          {label}
          {uploadingCount > 0 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded animate-pulse"
              style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}
            >
              {convertingCount > 0 ? "Converting & uploading" : "Uploading"} {doneCount}/{totalCount}…
            </span>
          )}
          {uploadingCount === 0 && doneCount > 0 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
            >
              {doneCount} uploaded
            </span>
          )}
        </Label>
        {hasEntries && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {hasEntries ? (
        /* Thumbnail grid */
        <div
          className={cn(
            "w-full rounded-xl border border-border bg-card p-3 transition-colors",
            dragging && "border-amber-500/70 bg-amber-500/5"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {/* Overall progress bar — shown while any are uploading */}
          {uploadingCount > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">
                  Uploading {doneCount} of {totalCount} images to storage…
                </span>
                <span className="text-[10px] font-medium" style={{ color: "#F59E0B" }}>
                  {Math.round((doneCount / totalCount) * 100)}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((doneCount / totalCount) * 100)}%`,
                    background: "linear-gradient(90deg, #F59E0B, #D97706)",
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {entries.map((entry, i) => (
              <div
                key={entry.localId}
                className="relative rounded-lg overflow-hidden border border-border flex-shrink-0"
                style={{ width: 88, height: 88 }}
              >
                {/* Thumbnail */}
                <img
                  src={entry.previewUrl}
                  alt={entry.name}
                  className="w-full h-full object-cover"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />

                {/* Converting overlay (unsupported format → WebP/PNG) */}
                {entry.status === "converting" && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{ background: "rgba(0,0,0,0.65)" }}
                  >
                    <span className="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-amber-400 rounded-full" />
                    <span className="text-[9px] text-white font-medium">Converting…</span>
                  </div>
                )}

                {/* Upload progress overlay */}
                {entry.status === "uploading" && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                  >
                    <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                      <circle
                        cx="12" cy="12" r="9"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="12" cy="12" r="9"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 9}`}
                        strokeDashoffset={`${2 * Math.PI * 9 * (1 - entry.progress / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-200"
                      />
                    </svg>
                    <span className="text-[9px] text-white font-medium">{entry.progress}%</span>
                  </div>
                )}

                {/* Done checkmark */}
                {entry.status === "done" && (
                  <div
                    className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(34,197,94,0.9)" }}
                  >
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Error badge */}
                {entry.status === "error" && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.65)" }}
                  >
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeEntry(entry.localId)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-destructive/90"
                  style={{ background: "rgba(0,0,0,0.65)" }}
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>

                {/* Index badge */}
                <div
                  className="absolute bottom-0 left-0 right-0 text-[9px] text-center text-white/70 py-0.5"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  {i + 1}
                </div>
              </div>
            ))}

            {/* Add More tile */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex-shrink-0 rounded-lg border-2 border-dashed transition-all duration-150",
                "flex flex-col items-center justify-center gap-1",
                dragging
                  ? "border-amber-500/70 bg-amber-500/10"
                  : "border-border hover:border-amber-500/40 hover:bg-amber-500/5"
              )}
              style={{ width: 88, height: 88 }}
            >
              <Plus
                className="w-4 h-4"
                style={{ color: dragging ? "#F59E0B" : "var(--muted-foreground)" }}
              />
              <span
                className="text-[10px]"
                style={{ color: dragging ? "#F59E0B" : "var(--muted-foreground)" }}
              >
                Add more
              </span>
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
            Images are saved to Supabase Storage and used as visual context · drag &amp; drop to
            add more
          </p>
        </div>
      ) : (
        /* Empty drop zone */
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "relative w-full rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none",
            "flex flex-col items-center justify-center gap-2 py-8",
            dragging
              ? "border-amber-500/70 bg-amber-500/8"
              : "border-border hover:border-amber-500/40 hover:bg-amber-500/4 bg-card"
          )}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: dragging ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)" }}
          >
            <ImagePlus
              className="w-5 h-5 transition-colors"
              style={{ color: dragging ? "#F59E0B" : "#D97706" }}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {dragging ? "Drop images here" : "Upload product images"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag &amp; drop or click to browse · PNG, JPG, WEBP · multiple supported
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  )
}
