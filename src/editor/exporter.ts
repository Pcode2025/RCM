import {
  clipAt,
  drawBackground,
  drawCaption,
  drawVisual,
  preloadVisuals,
} from "@/editor/compositor"
import {
  type EditorAsset,
  type EditorProject,
  resolveDimensions,
  timelineDuration,
} from "@/editor/types"

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm",
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c
  }
  return "video/webm"
}

function bitrateFor(width: number, height: number): number {
  const pixels = width * height
  if (pixels >= 3840 * 2160) return 45_000_000
  if (pixels >= 2560 * 1440) return 24_000_000
  if (pixels >= 1920 * 1080) return 12_000_000
  return 7_000_000
}

export interface ExportResult {
  blob: Blob
  extension: string
}

export async function exportTimeline(
  project: EditorProject,
  assets: EditorAsset[],
  onProgress: (fraction: number) => void
): Promise<ExportResult> {
  const total = timelineDuration(project.timeline)
  if (total <= 0) throw new Error("Add at least one clip to the timeline before exporting.")

  const dims = resolveDimensions(project.exportResolution, project.orientation)
  const visuals = await preloadVisuals(assets)

  const canvas = document.createElement("canvas")
  canvas.width = dims.width
  canvas.height = dims.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not create a drawing context for export.")
  drawBackground(ctx, dims)

  const fps = project.exportFps
  const stream = canvas.captureStream(fps)

  // Mix background audio (if any) into the recorded stream.
  let audioCtx: AudioContext | null = null
  let audioEl: HTMLAudioElement | null = null
  const audioAsset = assets.find(
    (a) => a.id === project.timeline.audio.assetId && a.kind === "audio"
  )
  if (audioAsset) {
    try {
      audioEl = new Audio()
      audioEl.crossOrigin = "anonymous"
      audioEl.src = audioAsset.publicUrl
      audioEl.volume = project.timeline.audio.volume
      await new Promise<void>((resolve) => {
        audioEl!.oncanplay = () => resolve()
        audioEl!.onerror = () => resolve()
        setTimeout(resolve, 4000)
      })
      audioCtx = new AudioContext()
      const source = audioCtx.createMediaElementSource(audioEl)
      const dest = audioCtx.createMediaStreamDestination()
      source.connect(dest)
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
    } catch {
      audioEl = null
    }
  }

  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: bitrateFor(dims.width, dims.height),
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  const finished = new Promise<ExportResult>((resolve, reject) => {
    recorder.onstop = () => {
      audioCtx?.close().catch(() => {})
      resolve({ blob: new Blob(chunks, { type: "video/webm" }), extension: "webm" })
    }
    recorder.onerror = () => reject(new Error("Recording failed."))
  })

  recorder.start(200)
  if (audioEl) audioEl.play().catch(() => {})

  let currentClipId: string | null = null
  const startTs = performance.now()

  await new Promise<void>((resolve) => {
    const frame = () => {
      const playhead = (performance.now() - startTs) / 1000
      if (playhead >= total) {
        resolve()
        return
      }
      const active = clipAt(project.timeline, playhead)
      drawBackground(ctx, dims)
      if (active) {
        const el = visuals.get(active.assetId)
        if (el instanceof HTMLVideoElement) {
          if (currentClipId !== active.clipId) {
            visuals.forEach((v) => {
              if (v instanceof HTMLVideoElement) v.pause()
            })
            try {
              el.currentTime = Math.min(active.localTime, el.duration || active.localTime)
            } catch {
              /* ignore seek errors */
            }
            el.play().catch(() => {})
            currentClipId = active.clipId
          }
          drawVisual(ctx, dims, el)
        } else if (el) {
          if (currentClipId !== null) {
            visuals.forEach((v) => {
              if (v instanceof HTMLVideoElement) v.pause()
            })
            currentClipId = null
          }
          drawVisual(ctx, dims, el)
        }
        drawCaption(ctx, dims, active.caption)
      }
      onProgress(Math.min(0.999, playhead / total))
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })

  recorder.stop()
  visuals.forEach((v) => {
    if (v instanceof HTMLVideoElement) v.pause()
  })
  audioEl?.pause()
  onProgress(1)
  return finished
}
