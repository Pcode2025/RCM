import type { EditorAsset, Timeline } from "@/editor/types"

export interface Dimensions {
  width: number
  height: number
}

export interface ActiveClip {
  clipId: string
  assetId: string
  index: number
  localTime: number
  caption: string
}

// Find which clip is showing at playhead time `t` (seconds), and the local
// offset inside that clip.
export function clipAt(timeline: Timeline, t: number): ActiveClip | null {
  let acc = 0
  for (let i = 0; i < timeline.clips.length; i++) {
    const clip = timeline.clips[i]
    const dur = Math.max(0, clip.duration)
    if (t < acc + dur || i === timeline.clips.length - 1) {
      return {
        clipId: clip.id,
        assetId: clip.assetId,
        index: i,
        localTime: Math.max(0, Math.min(dur, t - acc)),
        caption: clip.caption,
      }
    }
    acc += dur
  }
  return null
}

export function clipStart(timeline: Timeline, index: number): number {
  let acc = 0
  for (let i = 0; i < index; i++) acc += Math.max(0, timeline.clips[i].duration)
  return acc
}

// Cover-fit a source rect into a destination rect (like CSS object-fit: cover).
function coverRect(srcW: number, srcH: number, dstW: number, dstH: number) {
  if (!srcW || !srcH) return { dx: 0, dy: 0, dw: dstW, dh: dstH }
  const scale = Math.max(dstW / srcW, dstH / srcH)
  const dw = srcW * scale
  const dh = srcH * scale
  return { dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh }
}

export function drawBackground(ctx: CanvasRenderingContext2D, dims: Dimensions) {
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, dims.width, dims.height)
}

export function drawVisual(
  ctx: CanvasRenderingContext2D,
  dims: Dimensions,
  el: HTMLVideoElement | HTMLImageElement
) {
  const srcW =
    el instanceof HTMLVideoElement ? el.videoWidth : (el as HTMLImageElement).naturalWidth
  const srcH =
    el instanceof HTMLVideoElement ? el.videoHeight : (el as HTMLImageElement).naturalHeight
  if (!srcW || !srcH) return
  const { dx, dy, dw, dh } = coverRect(srcW, srcH, dims.width, dims.height)
  try {
    ctx.drawImage(el, dx, dy, dw, dh)
  } catch {
    /* media not ready this frame */
  }
}

export function drawCaption(
  ctx: CanvasRenderingContext2D,
  dims: Dimensions,
  text: string
) {
  if (!text.trim()) return
  const fontSize = Math.round(dims.height * 0.05)
  const pad = Math.round(fontSize * 0.5)
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "bottom"

  const lines = wrapText(ctx, text, dims.width * 0.86)
  const lineHeight = fontSize * 1.25
  const blockHeight = lines.length * lineHeight + pad
  const baseY = dims.height - Math.round(dims.height * 0.07)

  // translucent backdrop band
  ctx.fillStyle = "rgba(0,0,0,0.45)"
  ctx.fillRect(0, baseY - blockHeight, dims.width, blockHeight + pad)

  lines.forEach((line, i) => {
    const y = baseY - (lines.length - 1 - i) * lineHeight
    ctx.lineWidth = Math.max(2, fontSize * 0.08)
    ctx.strokeStyle = "rgba(0,0,0,0.85)"
    ctx.strokeText(line, dims.width / 2, y)
    ctx.fillStyle = "#ffffff"
    ctx.fillText(line, dims.width / 2, y)
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

// Preload all visual assets (video + image) into ready-to-draw HTML elements.
export async function preloadVisuals(
  assets: EditorAsset[]
): Promise<Map<string, HTMLVideoElement | HTMLImageElement>> {
  const map = new Map<string, HTMLVideoElement | HTMLImageElement>()
  await Promise.all(
    assets
      .filter((a) => a.kind === "video" || a.kind === "image")
      .map(
        (a) =>
          new Promise<void>((resolve) => {
            if (a.kind === "image") {
              const img = new Image()
              img.crossOrigin = "anonymous"
              img.onload = () => {
                map.set(a.id, img)
                resolve()
              }
              img.onerror = () => resolve()
              img.src = a.publicUrl
            } else {
              const video = document.createElement("video")
              video.crossOrigin = "anonymous"
              video.muted = true
              video.playsInline = true
              video.preload = "auto"
              video.onloadeddata = () => {
                map.set(a.id, video)
                resolve()
              }
              video.onerror = () => resolve()
              video.src = a.publicUrl
            }
          })
      )
  )
  return map
}
