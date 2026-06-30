export type AssetKind = "video" | "image" | "audio"

export interface EditorAsset {
  id: string
  projectId: string
  kind: AssetKind
  name: string
  publicUrl: string
  storagePath: string
  duration: number
  fileSize: number
  mimeType: string
  createdAt: string
}

export interface Clip {
  id: string
  assetId: string
  duration: number
  caption: string
}

export interface AudioTrack {
  assetId: string | null
  volume: number
}

export interface Timeline {
  clips: Clip[]
  audio: AudioTrack
}

export type ResolutionId = "4k" | "2k" | "fhd" | "hd"
export type Orientation = "landscape" | "portrait"

export interface EditorProject {
  id: string
  name: string
  timeline: Timeline
  exportResolution: ResolutionId
  exportFps: number
  orientation: Orientation
  createdAt: string
  updatedAt: string
}

export const RESOLUTIONS: {
  id: ResolutionId
  label: string
  longEdge: number
  shortEdge: number
}[] = [
  { id: "4k", label: "4K UHD", longEdge: 3840, shortEdge: 2160 },
  { id: "2k", label: "2K QHD", longEdge: 2560, shortEdge: 1440 },
  { id: "fhd", label: "Full HD 1080p", longEdge: 1920, shortEdge: 1080 },
  { id: "hd", label: "HD 720p", longEdge: 1280, shortEdge: 720 },
]

export const FPS_OPTIONS = [24, 30, 60]

export function resolveDimensions(res: ResolutionId, orientation: Orientation) {
  const r = RESOLUTIONS.find((x) => x.id === res) ?? RESOLUTIONS[2]
  return orientation === "portrait"
    ? { width: r.shortEdge, height: r.longEdge }
    : { width: r.longEdge, height: r.shortEdge }
}

export const EMPTY_TIMELINE: Timeline = {
  clips: [],
  audio: { assetId: null, volume: 1 },
}

export function timelineDuration(timeline: Timeline): number {
  return timeline.clips.reduce((sum, c) => sum + Math.max(0, c.duration), 0)
}

export function kindFromMime(mime: string): AssetKind {
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  return "image"
}
