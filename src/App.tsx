import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/AppSidebar"
import { AppHeader, type AppView } from "@/components/AppHeader"
import { VideoEditor } from "@/components/editor/VideoEditor"
import { ProductInfoTab } from "@/components/ProductInfoTab"
import { GeneratedPromptsTab } from "@/components/GeneratedPromptsTab"
import { HistoryTab } from "@/components/HistoryTab"
import { SharedProjectView } from "@/components/SharedProjectView"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  fetchPromptHistory,
  savePromptGeneration,
  deletePromptGeneration,
  updatePromptGeneration,
  fetchProjects,
  createProject,
  deleteProject,
  assignPromptToProject,
} from "@/lib/supabase"
import {
  type ProductInfo,
  type GenerationSettings,
  type GeneratedPrompts,
  type PromptGeneration,
  type Project,
  SAMPLE_PRODUCT,
  DEFAULT_SETTINGS,
  DEFAULT_CTA_MESSAGE,
} from "@/types"

const EMPTY_PRODUCT: ProductInfo = {
  name: "",
  link: "",
  about: "",
  ingredients: "",
  howToUse: "",
  keyFeatures: "",
  eatAndEnjoy: "",
  whyChoose: "",
  ctaMessage: DEFAULT_CTA_MESSAGE,
}

function buildSystemPrompt(product: ProductInfo, settings: GenerationSettings): string {
  return `You are a world-class AI prompt engineer for Indian FMCG product advertisement videos.
Generate production-ready prompts for ${settings.videoModel} (video) and ${settings.imageModel} (image generation).
Return ONLY valid JSON with exactly these keys: {imagePrompt, hookPrompt, contentPrompt, content2Prompt, ctaPrompt}

IMAGE PROMPT rules: Product packaging comes alive as 3D cartoon mascot with expressive eyes, white-gloved arms, legs. Premium FMCG CGI quality. Indian kitchen/wellness background.

VIDEO PROMPT format (all three video prompts must include labeled sections):
MASTER PROMPT [TYPE] | [X]s | VERTICAL 9:16
PRODUCT FIDELITY LOCK: [packaging details to preserve]
SCENE: [description in English]
CAMERA: [movements in English]
ANIMATION: [VFX, mascot gestures, feature bubbles - ALL text/labels in English only]
${settings.language} VOICEOVER: [script written in ${settings.language} language only]
ON-SCREEN TEXT: [overlays - ALWAYS in English only, never in ${settings.language}]
MUSIC: [BGM description in English]
NEGATIVE PROMPT: [what to avoid in English]

CRITICAL LANGUAGE RULE: ONLY the VOICEOVER line must be written in ${settings.language}. Everything else — SCENE, CAMERA, ANIMATION text, ON-SCREEN TEXT, MUSIC, NEGATIVE PROMPT, and all overlay/caption text — MUST be in English. Do NOT put any ${settings.language} script in ON-SCREEN TEXT or ANIMATION labels. The on-screen text viewers see must always be English.

Hook=${settings.duration.hook}s: pain-point opener, problem question
Content=${settings.duration.content}s: mascot hero + animated benefit bubbles + family background
Content2=${settings.duration.content2}s: deeper product demo, second set of benefit bubbles, usage moment, social proof
CTA=${settings.duration.cta}s: store visit CTA, location pins, product close-up ending. Use this EXACT call-to-action message verbatim in the ${settings.language} VOICEOVER only (do not translate or rephrase it): "${product.ctaMessage}". The ON-SCREEN TEXT for CTA must be in English.
Language: ${settings.language} for voiceover ONLY, English for all other text elements. Tone: warm, family, Indian cultural context`
}

function buildUserMessage(product: ProductInfo, settings: GenerationSettings): string {
  const imgNote = product.productImages?.length
    ? `${product.productImages.length} image(s) attached`
    : "Not provided"
  return `Product Name: ${product.name}
Product Link: ${product.link || "N/A"}
About: ${product.about || "N/A"}
Key Ingredients: ${product.ingredients || "N/A"}
How to Use: ${product.howToUse || "N/A"}
Key Features: ${product.keyFeatures || "N/A"}
Eat & Enjoy: ${product.eatAndEnjoy || "N/A"}
Why to Choose: ${product.whyChoose || "N/A"}
Custom CTA Message (use verbatim in the CTA prompt): ${product.ctaMessage || "N/A"}
Product Images: ${imgNote}

Settings:
- Language: ${settings.language}
- Hook duration: ${settings.duration.hook}s
- Content duration: ${settings.duration.content}s
- Content 2 duration: ${settings.duration.content2}s
- CTA duration: ${settings.duration.cta}s
- Image Model: ${settings.imageModel}
- Video Model: ${settings.videoModel}`
}

function buildMessages(product: ProductInfo, settings: GenerationSettings) {
  const textContent = buildUserMessage(product, settings)
  const images = product.productImages ?? []

  if (images.length > 0) {
    return [
      { role: "system" as const, content: buildSystemPrompt(product, settings) },
      {
        role: "user" as const,
        content: [
          ...images.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
          { type: "text" as const, text: textContent },
        ],
      },
    ]
  }

  return [
    { role: "system" as const, content: buildSystemPrompt(product, settings) },
    { role: "user" as const, content: textContent },
  ]
}

export default function App() {
  const shareToken = new URLSearchParams(window.location.search).get("share")
  if (shareToken) {
    return <SharedProjectView token={shareToken} />
  }
  return <MainApp />
}

function MainApp() {
  const [product, setProduct] = useState<ProductInfo>(EMPTY_PRODUCT)
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS)
  const [prompts, setPrompts] = useState<GeneratedPrompts | null>(null)
  const [activeTab, setActiveTab] = useState("product")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<PromptGeneration[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [view, setView] = useState<AppView>("generator")

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      setHistory(await fetchPromptHistory())
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadProjects = async () => {
    setProjects(await fetchProjects())
  }

  useEffect(() => {
    loadHistory()
    loadProjects()
  }, [])

  const handleCreateProject = async (name: string) => {
    const created = await createProject(name)
    if (created) setProjects((prev) => [created, ...prev])
  }

  const handleDeleteProject = async (id: string) => {
    const ok = await deleteProject(id)
    if (ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setHistory((prev) =>
        prev.map((h) => (h.projectId === id ? { ...h, projectId: null } : h))
      )
    }
  }

  const handleAssignProject = async (promptId: string, projectId: string | null) => {
    const ok = await assignPromptToProject(promptId, projectId)
    if (ok) {
      setHistory((prev) =>
        prev.map((h) => (h.id === promptId ? { ...h, projectId } : h))
      )
    }
  }

  const handleViewHistory = (item: PromptGeneration) => {
    setProduct(item.product)
    setSettings(item.settings)
    setPrompts(item.prompts)
    setActiveTab("prompts")
  }

  const handleDeleteHistory = async (id: string) => {
    const ok = await deletePromptGeneration(id)
    if (ok) setHistory((prev) => prev.filter((h) => h.id !== id))
  }

  const handleUpdateHistory = async (
    id: string,
    updatedProduct: ProductInfo,
    updatedPrompts: GeneratedPrompts
  ) => {
    const updated = await updatePromptGeneration(id, updatedProduct, updatedPrompts)
    if (updated) setHistory((prev) => prev.map((h) => (h.id === id ? updated : h)))
    return !!updated
  }

  const totalDuration =
    settings.duration.hook +
    settings.duration.content +
    settings.duration.content2 +
    settings.duration.cta

  const handleGenerate = async () => {
    if (!product.name.trim()) {
      setError("Product name is required.")
      return
    }

    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    if (!apiKey) {
      setError("VITE_OPENROUTER_API_KEY is not set in your .env file.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "AI Video Prompt Generator",
        },
        body: JSON.stringify({
          model: settings.aiModel,
          max_tokens: 4000,
          messages: buildMessages(product, settings),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData?.error?.message || `API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      const rawText: string = data.choices[0].message.content
      const cleaned = rawText.replace(/```json|```/g, "").trim()
      const parsed: GeneratedPrompts = JSON.parse(cleaned)

      setPrompts(parsed)
      setActiveTab("prompts")

      const saved = await savePromptGeneration(product, settings, parsed)
      if (saved) setHistory((prev) => [saved, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#0c0c1e" }}>
      {/* Sidebar (generator only) */}
      {view === "generator" && (
        <AppSidebar
          settings={settings}
          onChange={setSettings}
          onGenerate={handleGenerate}
          loading={loading}
          error={error}
        />
      )}

      {/* Header */}
      <AppHeader
        view={view}
        onViewChange={setView}
        totalDuration={totalDuration}
        onLoadSample={() => {
          setProduct(SAMPLE_PRODUCT)
          setActiveTab("product")
        }}
      />

      {/* Main content */}
      {view === "editor" ? (
        <div className="min-h-screen pt-16">
          <div className="p-6">
            <VideoEditor />
          </div>
        </div>
      ) : (
        <div className="min-h-screen pt-16" style={{ marginLeft: 254 }}>
          <div className="p-6 max-w-4xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className="mb-6 border border-border"
              style={{ background: "var(--card)" }}
            >
              <TabsTrigger
                value="product"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm gap-2"
              >
                📝 Product Info
              </TabsTrigger>
              <TabsTrigger
                value="prompts"
                disabled={!prompts}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm gap-2 disabled:opacity-40"
              >
                ✨ Generated Prompts
                {prompts && (
                  <span
                    className="text-xs font-bold ml-1 px-1.5 py-0.5 rounded"
                    style={{ background: "#F59E0B22", color: "#F59E0B" }}
                  >
                    5
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm gap-2"
              >
                🕑 History
                {history.length > 0 && (
                  <span
                    className="text-xs font-bold ml-1 px-1.5 py-0.5 rounded"
                    style={{ background: "#F59E0B22", color: "#F59E0B" }}
                  >
                    {history.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="product">
              <ProductInfoTab
                product={product}
                onChange={setProduct}
                onGenerate={handleGenerate}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="prompts">
              {prompts ? (
                <GeneratedPromptsTab
                  prompts={prompts}
                  settings={settings}
                  product={product}
                  onNewProduct={() => {
                    setProduct(EMPTY_PRODUCT)
                    setPrompts(null)
                    setActiveTab("product")
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: "rgba(245,158,11,0.12)" }}
                  >
                    ✨
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Generate prompts to see them here.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <HistoryTab
                history={history}
                projects={projects}
                loading={historyLoading}
                onView={handleViewHistory}
                onDelete={handleDeleteHistory}
                onUpdate={handleUpdateHistory}
                onRefresh={loadHistory}
                onCreateProject={handleCreateProject}
                onDeleteProject={handleDeleteProject}
                onAssignProject={handleAssignProject}
              />
            </TabsContent>
          </Tabs>
        </div>
        </div>
      )}
    </div>
  )
}
