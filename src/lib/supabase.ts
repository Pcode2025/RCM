import type {
  GeneratedPrompts,
  GenerationSettings,
  Project,
  ProductInfo,
  PromptGeneration,
  ShareStatus,
} from "@/types"
import { DEFAULT_CTA_MESSAGE } from "@/types"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const restHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
}

export const BUCKET = "product-images"

export function getPublicUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

export async function saveImageMetadata(
  storagePath: string,
  publicUrl: string,
  originalName: string,
  fileSize: number,
  mimeType: string
): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/product_images`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({
      storage_path: storagePath,
      public_url: publicUrl,
      original_name: originalName,
      file_size: fileSize,
      mime_type: mimeType,
    }),
  })
}

interface PromptGenerationRow {
  id: string
  created_at: string
  product_name: string
  language: string
  ai_model: string
  image_model: string
  video_model: string
  voice_type: string
  voice_age: number
  hook_duration: number
  content_duration: number
  content2_duration: number
  cta_duration: number
  image_prompt: string
  hook_prompt: string
  content_prompt: string
  content2_prompt: string
  cta_prompt: string
  product_images: string[]
  product_info: ProductInfo
  project_id: string | null
}

function rowToGeneration(row: PromptGenerationRow): PromptGeneration {
  return {
    id: row.id,
    createdAt: row.created_at,
    projectId: row.project_id ?? null,
    product: {
      ...row.product_info,
      name: row.product_info?.name ?? row.product_name,
      ctaMessage: row.product_info?.ctaMessage ?? DEFAULT_CTA_MESSAGE,
      productImages: row.product_images ?? row.product_info?.productImages ?? [],
    },
    settings: {
      language: row.language,
      aiModel: row.ai_model,
      imageModel: row.image_model,
      videoModel: row.video_model,
      voiceType: row.voice_type ?? "Male",
      voiceAge: row.voice_age ?? 30,
      duration: {
        hook: row.hook_duration,
        content: row.content_duration,
        content2: row.content2_duration ?? 0,
        cta: row.cta_duration,
      },
    },
    prompts: {
      imagePrompt: row.image_prompt,
      hookPrompt: row.hook_prompt,
      contentPrompt: row.content_prompt,
      content2Prompt: row.content2_prompt ?? "",
      ctaPrompt: row.cta_prompt,
    },
  }
}

export async function savePromptGeneration(
  product: ProductInfo,
  settings: GenerationSettings,
  prompts: GeneratedPrompts
): Promise<PromptGeneration | null> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/prompt_generations`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "return=representation" },
    body: JSON.stringify({
      product_name: product.name,
      language: settings.language,
      ai_model: settings.aiModel,
      image_model: settings.imageModel,
      video_model: settings.videoModel,
      voice_type: settings.voiceType,
      voice_age: settings.voiceAge,
      hook_duration: settings.duration.hook,
      content_duration: settings.duration.content,
      content2_duration: settings.duration.content2,
      cta_duration: settings.duration.cta,
      image_prompt: prompts.imagePrompt,
      hook_prompt: prompts.hookPrompt,
      content_prompt: prompts.contentPrompt,
      content2_prompt: prompts.content2Prompt,
      cta_prompt: prompts.ctaPrompt,
      product_images: product.productImages ?? [],
      product_info: product,
    }),
  })

  if (!response.ok) return null
  const rows = (await response.json()) as PromptGenerationRow[]
  return rows[0] ? rowToGeneration(rows[0]) : null
}

export async function fetchPromptHistory(): Promise<PromptGeneration[]> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/prompt_generations?select=*&order=created_at.desc`,
    { headers: restHeaders }
  )
  if (!response.ok) return []
  const rows = (await response.json()) as PromptGenerationRow[]
  return rows.map(rowToGeneration)
}

export async function deletePromptGeneration(id: string): Promise<boolean> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/prompt_generations?id=eq.${id}`,
    { method: "DELETE", headers: restHeaders }
  )
  return response.ok
}

export async function updatePromptGeneration(
  id: string,
  product: ProductInfo,
  prompts: GeneratedPrompts
): Promise<PromptGeneration | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/prompt_generations?id=eq.${id}`,
    {
      method: "PATCH",
      headers: { ...restHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        product_name: product.name,
        image_prompt: prompts.imagePrompt,
        hook_prompt: prompts.hookPrompt,
        content_prompt: prompts.contentPrompt,
        content2_prompt: prompts.content2Prompt,
        cta_prompt: prompts.ctaPrompt,
        product_images: product.productImages ?? [],
        product_info: product,
      }),
    }
  )

  if (!response.ok) return null
  const rows = (await response.json()) as PromptGenerationRow[]
  return rows[0] ? rowToGeneration(rows[0]) : null
}

interface ProjectRow {
  id: string
  name: string
  created_at: string
}

const rowToProject = (r: ProjectRow): Project => ({
  id: r.id,
  name: r.name,
  createdAt: r.created_at,
})

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/projects?select=*&order=created_at.desc`,
    { headers: restHeaders }
  )
  if (!response.ok) return []
  const rows = (await response.json()) as ProjectRow[]
  return rows.map(rowToProject)
}

export async function createProject(name: string): Promise<Project | null> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) return null
  const rows = (await response.json()) as ProjectRow[]
  return rows[0] ? rowToProject(rows[0]) : null
}

export async function deleteProject(id: string): Promise<boolean> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, {
    method: "DELETE",
    headers: restHeaders,
  })
  return response.ok
}

export async function assignPromptToProject(
  promptId: string,
  projectId: string | null
): Promise<boolean> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/prompt_generations?id=eq.${promptId}`,
    {
      method: "PATCH",
      headers: { ...restHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ project_id: projectId }),
    }
  )
  return response.ok
}

const SHARE_FN_URL = `${SUPABASE_URL}/functions/v1/project-share`

async function callShareFn<T>(payload: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch(SHARE_FN_URL, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function getShareStatus(projectId: string): Promise<ShareStatus> {
  const data = await callShareFn<ShareStatus>({ action: "status", projectId })
  return data ?? { shared: false }
}

export async function createShare(
  projectId: string,
  password?: string
): Promise<{ token: string; isProtected: boolean } | null> {
  const data = await callShareFn<{ token?: string; isProtected?: boolean; error?: string }>({
    action: "create",
    projectId,
    password,
  })
  if (!data || !data.token) return null
  return { token: data.token, isProtected: !!data.isProtected }
}

export async function revokeShare(projectId: string): Promise<boolean> {
  const data = await callShareFn<{ revoked?: boolean }>({ action: "revoke", projectId })
  return !!data?.revoked
}

export interface SharedProjectData {
  project: { id: string; name: string; createdAt: string }
  generations: PromptGeneration[]
}

export type ViewShareResult =
  | { ok: true; data: SharedProjectData }
  | { ok: false; needsPassword: boolean; invalidPassword: boolean; notFound: boolean }

export async function viewSharedProject(
  token: string,
  password?: string
): Promise<ViewShareResult> {
  const data = await callShareFn<{
    project?: SharedProjectData["project"]
    generations?: PromptGeneration[]
    needsPassword?: boolean
    error?: string
  }>({ action: "view", token, password })

  if (data?.project && data.generations) {
    return { ok: true, data: { project: data.project, generations: data.generations } }
  }
  return {
    ok: false,
    needsPassword: !!data?.needsPassword,
    invalidPassword: data?.error === "invalid_password",
    notFound: data?.error === "not_found",
  }
}

export function buildShareUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}?share=${token}`
}
