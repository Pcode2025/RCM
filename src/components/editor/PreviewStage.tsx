import { useEffect, useMemo, useRef, useState } from "react"
import { Play, Pause, SkipBack, Clapperboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  clipAt,
  drawBackground,
  drawCaption,
  drawVisual,
  preloadVisuals,
  type Dimensions,
} from "@/editor/compositor"
import {
  type EditorAsset,
  type Orientation,
  type Timeline,
  timelineDuration,
} from "@/editor/types"

interface PreviewStageProps {
  timeline: Timeline
  assets: EditorAsset[]
  orientation: Orientation
  audioAsset: EditorAsset | null
  audioVolume: number
}

function previewSize(orientation: Orientation): Dimensions {
  const maxW = 560
  const maxH = 416
  const aspect = orientation === "portrait" ? 9 / 16 : 16 / 9
  let width = maxW
  let height = Math.round(width / aspect)
  if (height > maxH) {
    height = maxH
    width = Math.round(height * aspect)
  }
  return { width, height }
}

function fmt(t: number): string {
  const s = Math.max(0, t)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const cs = Math.floor((s % 1) * 10)
  return `${m}:${sec.toString().padStart(2, "0")}.${cs}`
}

export function PreviewStage({
  timeline,
  assets,
  orientation,
  audioAsset,
  audioVolume,
}: PreviewStageProps) {
  const dims = useMemo(() => previewSize(orientation), [orientation])
  const total = timelineDuration(timeline)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const poolRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map())
  const rafRef = useRef<number>(0)
  const startTsRef = useRef(0)
  const startHeadRef = useRef(0)
  const timeRef = useRef(0)
  const currentClipRef = useRef<string | null>(null)
  const playingRef = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [, setReady] = useState(false)

  const assetKey = assets.map((a) => `${a.id}:${a.kind}`).join(",")

  const draw = (head: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    drawBackground(ctx, dims)
    const active = clipAt(timeline, head)
    if (active) {
      const el = poolRef.current.get(active.assetId)
      if (el) drawVisual(ctx, dims, el)
      drawCaption(ctx, dims, active.caption)
    }
  }

  // Preload visual media whenever the asset set changes.
  useEffect(() => {
    let cancelled = false
    preloadVisuals(assets).then((map) => {
      if (cancelled) return
      poolRef.current = map
      setReady(true)
      if (!playingRef.current) draw(timeRef.current)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetKey])

  // Redraw current frame when the timeline changes while paused.
  useEffect(() => {
    if (timeRef.current > total) {
      timeRef.current = total
      setTime(total)
    }
    if (!playingRef.current) draw(timeRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, dims, total])

  const stopVideos = () => {
    poolRef.current.forEach((v) => {
      if (v instanceof HTMLVideoElement) v.pause()
    })
  }

  const loop = () => {
    const head = startHeadRef.current + (performance.now() - startTsRef.current) / 1000
    if (head >= total) {
      timeRef.current = total
      setTime(total)
      draw(total)
      pause()
      return
    }
    const active = clipAt(timeline, head)
    if (active) {
      const el = poolRef.current.get(active.assetId)
      if (el instanceof HTMLVideoElement) {
        if (currentClipRef.current !== active.clipId) {
          stopVideos()
          try {
            el.currentTime = Math.min(active.localTime, el.duration || active.localTime)
          } catch {
            /* ignore */
          }
          el.play().catch(() => {})
          currentClipRef.current = active.clipId
        }
      } else if (currentClipRef.current !== null) {
        stopVideos()
        currentClipRef.current = null
      }
    }
    timeRef.current = head
    setTime(head)
    draw(head)
    rafRef.current = requestAnimationFrame(loop)
  }

  const play = () => {
    if (total <= 0) return
    if (timeRef.current >= total) {
      timeRef.current = 0
      setTime(0)
    }
    playingRef.current = true
    setPlaying(true)
    currentClipRef.current = null
    startHeadRef.current = timeRef.current
    startTsRef.current = performance.now()
    const audio = audioRef.current
    if (audio && audioAsset) {
      try {
        audio.currentTime = timeRef.current
      } catch {
        /* ignore */
      }
      audio.play().catch(() => {})
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  const pause = () => {
    playingRef.current = false
    setPlaying(false)
    cancelAnimationFrame(rafRef.current)
    stopVideos()
    audioRef.current?.pause()
  }

  const seek = (v: number) => {
    const clamped = Math.max(0, Math.min(total, v))
    timeRef.current = clamped
    setTime(clamped)
    currentClipRef.current = null
    stopVideos()
    const active = clipAt(timeline, clamped)
    if (active) {
      const el = poolRef.current.get(active.assetId)
      if (el instanceof HTMLVideoElement) {
        try {
          el.currentTime = Math.min(active.localTime, el.duration || active.localTime)
        } catch {
          /* ignore */
        }
      }
    }
    if (playingRef.current) {
      startHeadRef.current = clamped
      startTsRef.current = performance.now()
      if (audioRef.current && audioAsset) {
        try {
          audioRef.current.currentTime = clamped
        } catch {
          /* ignore */
        }
      }
    }
    draw(clamped)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Pause playback if the timeline becomes empty.
  useEffect(() => {
    if (total <= 0 && playingRef.current) pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div
        className="rounded-xl border border-border overflow-hidden bg-black shadow-lg"
        style={{ width: dims.width, maxWidth: "100%" }}
      >
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          className="block w-full h-auto"
        />
      </div>

      {total <= 0 ? (
        <div className="flex flex-col items-center gap-1 text-muted-foreground py-2">
          <Clapperboard className="w-5 h-5" />
          <p className="text-xs">Add clips to the timeline to preview your video.</p>
        </div>
      ) : (
        <div className="w-full max-w-xl flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              onClick={() => seek(0)}
              aria-label="Restart"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => (playing ? pause() : play())}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Slider
              value={[Math.min(time, total)]}
              min={0}
              max={total}
              step={0.05}
              onValueChange={([v]) => seek(v)}
              className="flex-1"
            />
            <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 w-24 text-right">
              {fmt(time)} / {fmt(total)}
            </span>
          </div>
        </div>
      )}

      {audioAsset && (
        <audio
          ref={audioRef}
          src={audioAsset.publicUrl}
          crossOrigin="anonymous"
          preload="auto"
          style={{ display: "none" }}
          // volume set via effect below through ref
        />
      )}
      <VolumeBinder audioRef={audioRef} volume={audioVolume} enabled={!!audioAsset} />
    </div>
  )
}

function VolumeBinder({
  audioRef,
  volume,
  enabled,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>
  volume: number
  enabled: boolean
}) {
  useEffect(() => {
    if (enabled && audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, volume))
  }, [audioRef, volume, enabled])
  return null
}
