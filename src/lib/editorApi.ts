import {
  type AssetKind,
  type EditorAsset,
  type EditorProject,
  type Orientation,
  type ResolutionId,
  type Timeline,
  EMPTY_TIMELINE,
  kindFromMime,
} from "@/editor/types"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const EDITOR_BUCKET = "editor-assets"

const restHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
}

// ─── Projects ──────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string
  name: string
  timeline: Partial<Timeline> | null
  export_resolution: ResolutionId
  export_fps: number
  orientation: Orientation
  created_at: string
  updated_at: string
}

function rowToProject(row: ProjectRow): EditorProject {
  const t = row.timeline ?? {}
  return {
    id: row.id,
    name: row.name,
    timeline: {
      clips: Array.isArray(t.clips) ? t.clips : [],
      audio: t.audio ?? { ...EMPTY_TIMELINE.audio },
    },
    exportResolution: row.export_resolution ?? "fhd",
    exportFps: row.export_fps ?? 30,
    orientation: row.orientation ?? "landscape",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchEditorProjects(): Promise<EditorProject[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/editor_projects?select=*&order=updated_at.desc`,
    { headers: restHeaders }
  )
  if (!res.ok) return []
  const rows = (await res.json()) as ProjectRow[]
  return rows.map(rowToProject)
}

export async function createEditorProject(name: string): Promise<EditorProject | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/editor_projects`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ name, timeline: EMPTY_TIMELINE }),
  })
  if (!res.ok) return null
  const rows = (await res.json()) as ProjectRow[]
  return rows[0] ? rowToProject(rows[0]) : null
}

export async function updateEditorProject(
  id: string,
  patch: Partial<{
    name: string
    timeline: Timeline
    exportResolution: ResolutionId
    exportFps: number
    orientation: Orientation
  }>
): Promise<EditorProject | null> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) body.name = patch.name
  if (patch.timeline !== undefined) body.timeline = patch.timeline
  if (patch.exportResolution !== undefined) body.export_resolution = patch.exportResolution
  if (patch.exportFps !== undefined) body.export_fps = patch.exportFps
  if (patch.orientation !== undefined) body.orientation = patch.orientation

  const res = await fetch(`${SUPABASE_URL}/rest/v1/editor_projects?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...restHeaders, Prefer: "return=representation" },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const rows = (await res.json()) as ProjectRow[]
  return rows[0] ? rowToProject(rows[0]) : null
}

export async function deleteEditorProject(id: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/editor_projects?id=eq.${id}`, {
    method: "DELETE",
    headers: restHeaders,
  })
  return res.ok
}

// ─── Assets ────────────────────────────────────────────────────────────────

interface AssetRow {
  id: string
  project_id: string
  kind: AssetKind
  name: string
  public_url: string
  storage_path: string
  duration: number
  file_size: number
  mime_type: string
  created_at: string
}

function rowToAsset(row: AssetRow): EditorAsset {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    name: row.name,
    publicUrl: row.public_url,
    storagePath: row.storage_path,
    duration: row.duration,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  }
}

export async function fetchAssets(projectId: string): Promise<EditorAsset[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/editor_assets?project_id=eq.${projectId}&select=*&order=created_at.asc`,
    { headers: restHeaders }
  )
  if (!res.ok) return []
  const rows = (await res.json()) as AssetRow[]
  return rows.map(rowToAsset)
}

function probeDuration(file: File, kind: AssetKind): Promise<number> {
  if (kind === "image") return Promise.resolve(0)
  return new Promise((resolve) => {
    const el = document.createElement(kind === "audio" ? "audio" : "video")
    el.preload = "metadata"
    const url = URL.createObjectURL(file)
    const done = (d: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) && d > 0 ? d : 0)
    }
    el.onloadedmetadata = () => done(el.duration)
    el.onerror = () => done(0)
    el.src = url
  })
}

function uploadToStorage(
  file: File,
  storagePath: string,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/storage/v1/object/${EDITOR_BUCKET}/${storagePath}`
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(`${SUPABASE_URL}/storage/v1/object/public/${EDITOR_BUCKET}/${storagePath}`)
      } else {
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.open("POST", url)
    xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_ANON_KEY}`)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.setRequestHeader("x-upsert", "true")
    xhr.send(file)
  })
}

export async function uploadAsset(
  projectId: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<EditorAsset | null> {
  const kind = kindFromMime(file.type)
  const duration = await probeDuration(file, kind)
  const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const safeName = file.name.replace(/\s+/g, "_").replace(/[^\w.-]/g, "")
  const storagePath = `${projectId}/${localId}-${safeName}`

  const publicUrl = await uploadToStorage(file, storagePath, onProgress)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/editor_assets`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "return=representation" },
    body: JSON.stringify({
      project_id: projectId,
      kind,
      name: file.name,
      public_url: publicUrl,
      storage_path: storagePath,
      duration,
      file_size: file.size,
      mime_type: file.type,
    }),
  })
  if (!res.ok) return null
  const rows = (await res.json()) as AssetRow[]
  return rows[0] ? rowToAsset(rows[0]) : null
}

export async function deleteAsset(asset: EditorAsset): Promise<boolean> {
  if (asset.storagePath) {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${EDITOR_BUCKET}/${asset.storagePath}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY } }
    ).catch(() => {})
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/editor_assets?id=eq.${asset.id}`, {
    method: "DELETE",
    headers: restHeaders,
  })
  return res.ok
}
