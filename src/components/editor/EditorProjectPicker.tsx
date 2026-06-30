import { useEffect, useRef, useState } from "react"
import { Plus, FolderOpen, Trash2, Loader2, Film, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  fetchEditorProjects,
  createEditorProject,
  deleteEditorProject,
} from "@/lib/editorApi"
import { timelineDuration, type EditorProject } from "@/editor/types"

interface ProjectPickerProps {
  activeId: string | null
  onSelect: (project: EditorProject) => void
}

export function EditorProjectPicker({ activeId, onSelect }: ProjectPickerProps) {
  const [projects, setProjects] = useState<EditorProject[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const autoSelected = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchEditorProjects().then((list) => {
      if (cancelled) return
      setProjects(list)
      setLoading(false)
      if (!autoSelected.current && !activeId && list.length > 0) {
        autoSelected.current = true
        onSelect(list[0])
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    const created = await createEditorProject(trimmed)
    setCreating(false)
    if (created) {
      setProjects((prev) => [created, ...prev])
      setName("")
      onSelect(created)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const ok = await deleteEditorProject(id)
    if (ok) setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Projects</span>
        <span className="text-xs text-muted-foreground ml-auto">{projects.length}</span>
      </div>

      <div className="p-3 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New project name…"
          className="h-9 text-xs"
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          aria-label="Create project"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 pb-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No projects yet. Create one to start editing.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((p) => {
              const active = p.id === activeId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p)}
                  className={cn(
                    "group text-left rounded-lg border px-3 py-2.5 transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Film
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        active ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-[12px] font-medium text-foreground truncate flex-1">
                      {p.name}
                    </span>
                    <span
                      onClick={(e) => handleDelete(e, p.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      aria-label="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {timelineDuration(p.timeline).toFixed(1)}s
                    </span>
                    <span>· {p.timeline.clips.length} clips</span>
                    <span className="uppercase">· {p.exportResolution}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
