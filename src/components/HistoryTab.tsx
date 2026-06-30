import { useState, useEffect } from "react"
import {
  Clock,
  Trash2,
  Eye,
  RefreshCw,
  Globe,
  Film,
  ChevronDown,
  Save,
  X,
  LayoutGrid,
  List,
  FolderPlus,
  Folder,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductImagesUpload } from "@/components/ProductImagesUpload"
import { ShareDialog } from "@/components/ShareDialog"
import { cn } from "@/lib/utils"
import type { GeneratedPrompts, ProductInfo, Project, PromptGeneration } from "@/types"

type HistoryView = "list" | "grid"

const NO_PROJECT = "none"

interface HistoryTabProps {
  history: PromptGeneration[]
  projects: Project[]
  loading: boolean
  onView: (item: PromptGeneration) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, product: ProductInfo, prompts: GeneratedPrompts) => Promise<boolean>
  onRefresh: () => void
  onCreateProject: (name: string) => Promise<void>
  onDeleteProject: (id: string) => Promise<void>
  onAssignProject: (promptId: string, projectId: string | null) => Promise<void>
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function HistoryTab({
  history,
  projects,
  loading,
  onView,
  onDelete,
  onUpdate,
  onRefresh,
  onCreateProject,
  onDeleteProject,
  onAssignProject,
}: HistoryTabProps) {
  const [view, setView] = useState<HistoryView>(
    () => (localStorage.getItem("history-view") as HistoryView) || "list"
  )
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [savingProject, setSavingProject] = useState(false)
  const [shareProject, setShareProject] = useState<Project | null>(null)

  const changeView = (next: HistoryView) => {
    setView(next)
    localStorage.setItem("history-view", next)
  }

  const handleCreateProject = async () => {
    const name = newName.trim()
    if (!name) return
    setSavingProject(true)
    await onCreateProject(name)
    setSavingProject(false)
    setNewName("")
    setCreating(false)
  }

  const activeProject =
    selectedProject !== "all" ? projects.find((p) => p.id === selectedProject) ?? null : null

  const visibleHistory =
    selectedProject === "all"
      ? history
      : selectedProject === NO_PROJECT
        ? history.filter((h) => !h.projectId)
        : history.filter((h) => h.projectId === selectedProject)

  const countFor = (id: string) =>
    id === "all"
      ? history.length
      : id === NO_PROJECT
        ? history.filter((h) => !h.projectId).length
        : history.filter((h) => h.projectId === id).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
            Generation History
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group prompts into projects, then share a project with a private link.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && changeView(v as HistoryView)}
            variant="outline"
            size="sm"
            className="border-border"
          >
            <ToggleGroupItem
              value="list"
              aria-label="List view"
              className="text-muted-foreground data-[state=on]:bg-secondary data-[state=on]:text-foreground"
            >
              <List className="w-3.5 h-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="grid"
              aria-label="Grid view"
              className="text-muted-foreground data-[state=on]:bg-secondary data-[state=on]:text-foreground"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2 border-border text-foreground hover:bg-secondary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Projects toolbar */}
      <div className="flex flex-col gap-2 rounded-xl border border-border p-3" style={{ background: "var(--card)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectChip
            label="All"
            count={countFor("all")}
            active={selectedProject === "all"}
            onClick={() => setSelectedProject("all")}
          />
          <ProjectChip
            label="Unfiled"
            count={countFor(NO_PROJECT)}
            active={selectedProject === NO_PROJECT}
            onClick={() => setSelectedProject(NO_PROJECT)}
          />
          {projects.map((p) => (
            <ProjectChip
              key={p.id}
              label={p.name}
              count={countFor(p.id)}
              active={selectedProject === p.id}
              icon={<Folder className="w-3 h-3" />}
              onClick={() => setSelectedProject(p.id)}
            />
          ))}

          {creating ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject()
                  if (e.key === "Escape") {
                    setCreating(false)
                    setNewName("")
                  }
                }}
                placeholder="Project name"
                className="h-7 w-40 text-xs"
              />
              <Button
                size="sm"
                onClick={handleCreateProject}
                disabled={savingProject || !newName.trim()}
                className="h-7 px-2 text-xs"
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreating(false)
                  setNewName("")
                }}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreating(true)}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New project
            </Button>
          )}
        </div>

        {activeProject && (
          <>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Managing <span className="text-foreground font-medium">{activeProject.name}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShareProject(activeProject)}
                  className="h-7 gap-1.5 px-2 text-xs"
                  style={{ color: "#F59E0B" }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await onDeleteProject(activeProject.id)
                    setSelectedProject("all")
                  }}
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete project
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {loading && history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} />
          <p className="text-sm text-muted-foreground">Loading history…</p>
        </div>
      ) : visibleHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.12)" }}
          >
            <Clock className="w-6 h-6" style={{ color: "#F59E0B" }} />
          </div>
          <p className="text-muted-foreground text-sm">
            {history.length === 0
              ? "No history yet. Generate prompts to start building your history."
              : "No prompts in this view yet."}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "pb-6",
            view === "grid"
              ? "grid grid-cols-2 lg:grid-cols-3 gap-3 items-start"
              : "flex flex-col gap-3"
          )}
        >
          {visibleHistory.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              view={view}
              projects={projects}
              onView={onView}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onAssignProject={onAssignProject}
            />
          ))}
        </div>
      )}

      <ShareDialog
        project={shareProject}
        open={!!shareProject}
        onOpenChange={(o) => !o && setShareProject(null)}
      />
    </div>
  )
}

function ProjectChip({
  label,
  count,
  active,
  icon,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-amber-500/60 bg-amber-500/10 text-foreground"
          : "border-border text-muted-foreground hover:border-amber-500/40 hover:text-foreground"
      )}
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
      <span className={cn("text-[10px]", active ? "text-amber-500" : "text-muted-foreground")}>
        {count}
      </span>
    </button>
  )
}

interface HistoryCardProps {
  item: PromptGeneration
  view: HistoryView
  projects: Project[]
  onView: (item: PromptGeneration) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, product: ProductInfo, prompts: GeneratedPrompts) => Promise<boolean>
  onAssignProject: (promptId: string, projectId: string | null) => Promise<void>
}

function HistoryCard({
  item,
  view,
  projects,
  onView,
  onDelete,
  onUpdate,
  onAssignProject,
}: HistoryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const [name, setName] = useState(item.product.name)
  const [images, setImages] = useState<string[]>(item.product.productImages ?? [])
  const [prompts, setPrompts] = useState<GeneratedPrompts>(item.prompts)

  // Re-seed editable state whenever the underlying record changes (e.g. after save).
  useEffect(() => {
    setName(item.product.name)
    setImages(item.product.productImages ?? [])
    setPrompts(item.prompts)
  }, [item])

  const dirty =
    name !== item.product.name ||
    JSON.stringify(images) !== JSON.stringify(item.product.productImages ?? []) ||
    JSON.stringify(prompts) !== JSON.stringify(item.prompts)

  const handleSave = async () => {
    setSaving(true)
    const updatedProduct: ProductInfo = { ...item.product, name, productImages: images }
    const ok = await onUpdate(item.id, updatedProduct, prompts)
    setSaving(false)
    if (ok) {
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    }
  }

  const handleCancel = () => {
    setName(item.product.name)
    setImages(item.product.productImages ?? [])
    setPrompts(item.prompts)
  }

  const totalDuration =
    item.settings.duration.hook +
    item.settings.duration.content +
    item.settings.duration.content2 +
    item.settings.duration.cta

  const imageCount = item.product.productImages?.length ?? 0
  const thumb = item.product.productImages?.[0]
  const isGrid = view === "grid"

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-3 transition-colors",
        expanded ? "border-amber-500/40" : "border-border hover:border-amber-500/40",
        isGrid && expanded && "col-span-2 lg:col-span-3"
      )}
      style={{ background: "var(--card)" }}
    >
      {isGrid ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex flex-col gap-2.5 text-left"
          >
            {thumb ? (
              <img
                src={thumb}
                alt={item.product.name}
                className="aspect-square w-full rounded-lg object-cover border border-border"
              />
            ) : (
              <div
                className="aspect-square w-full rounded-lg flex items-center justify-center text-3xl border border-border"
                style={{ background: "rgba(245,158,11,0.1)" }}
              >
                🎬
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {item.product.name || "Untitled product"}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{formatDate(item.createdAt)}</span>
              </div>
              {imageCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{imageCount} image(s)</p>
              )}
            </div>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(item)}
              className="h-8 px-3 text-xs gap-1.5 flex-1"
              style={{ color: "#F59E0B" }}
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDelete(item.id)
                    setConfirmDelete(false)
                  }}
                  className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  className="h-8 px-2 text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            {/* Clickable header → toggles the editor */}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-start gap-3 min-w-0 text-left flex-1"
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={item.product.name}
                  className="w-11 h-11 rounded-lg object-cover border border-border flex-shrink-0"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: "rgba(245,158,11,0.1)" }}
                >
                  🎬
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {item.product.name || "Untitled product"}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDate(item.createdAt)}
                  {imageCount > 0 && <span className="ml-1">· {imageCount} image(s)</span>}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 mt-1 text-muted-foreground transition-transform flex-shrink-0",
                  expanded && "rotate-180"
                )}
              />
            </button>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(item)}
                className="h-8 px-3 text-xs gap-1.5"
                style={{ color: "#F59E0B" }}
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </Button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDelete(item.id)
                      setConfirmDelete(false)
                    }}
                    className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    className="h-8 px-2 text-xs text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs border-primary/40 text-primary px-2 py-0 gap-1"
            >
              <Globe className="w-3 h-3" />
              {item.settings.language}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs border-border text-muted-foreground px-2 py-0 gap-1"
            >
              <Film className="w-3 h-3" />
              {item.settings.videoModel}
            </Badge>
            <span className="text-xs text-muted-foreground">{totalDuration}s total</span>
            <span className="text-xs text-muted-foreground">· {item.settings.imageModel}</span>
          </div>
        </>
      )}

      {/* Project assignment */}
      <div className="flex items-center gap-2">
        <Folder className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <Select
          value={item.projectId ?? NO_PROJECT}
          onValueChange={(v) => onAssignProject(item.id, v === NO_PROJECT ? null : v)}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="No project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PROJECT} className="text-xs">
              No project
            </SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expanded inline editor */}
      {expanded && (
        <div className="flex flex-col gap-4 pt-1">
          <Separator className="bg-border" />

          <EditorField label="Product Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </EditorField>

          <ProductImagesUpload label="Images" values={images} onChange={setImages} />

          <EditorField label="Image Prompt">
            <PromptTextarea
              value={prompts.imagePrompt}
              onChange={(v) => setPrompts((p) => ({ ...p, imagePrompt: v }))}
            />
          </EditorField>
          <EditorField label="Hook Prompt">
            <PromptTextarea
              value={prompts.hookPrompt}
              onChange={(v) => setPrompts((p) => ({ ...p, hookPrompt: v }))}
            />
          </EditorField>
          <EditorField label="Content Prompt 1">
            <PromptTextarea
              value={prompts.contentPrompt}
              onChange={(v) => setPrompts((p) => ({ ...p, contentPrompt: v }))}
            />
          </EditorField>
          <EditorField label="Content Prompt 2">
            <PromptTextarea
              value={prompts.content2Prompt}
              onChange={(v) => setPrompts((p) => ({ ...p, content2Prompt: v }))}
            />
          </EditorField>
          <EditorField label="CTA Prompt">
            <PromptTextarea
              value={prompts.ctaPrompt}
              onChange={(v) => setPrompts((p) => ({ ...p, ctaPrompt: v }))}
            />
          </EditorField>

          <div className="flex items-center justify-end gap-2">
            {savedFlash && (
              <span className="text-xs font-medium mr-auto" style={{ color: "#22c55e" }}>
                Changes saved
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={!dirty || saving}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="gap-1.5 font-semibold"
              style={{
                background:
                  !dirty || saving
                    ? "#b45309"
                    : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                color: "#0c0c1e",
                opacity: !dirty || saving ? 0.55 : 1,
              }}
            >
              {saving ? (
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  )
}

function PromptTextarea({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={5}
      className="bg-background border-border text-foreground text-xs font-mono leading-relaxed resize-y"
    />
  )
}
