import { Settings, Zap } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LANGUAGES,
  IMAGE_MODEL_SUGGESTIONS,
  VIDEO_MODEL_SUGGESTIONS,
  AI_MODEL_GROUPS,
  VOICE_TYPES,
  type GenerationSettings,
} from "@/types"

interface SidebarProps {
  settings: GenerationSettings
  onChange: (settings: GenerationSettings) => void
  onGenerate: () => void
  loading: boolean
  error: string | null
}

export function AppSidebar({
  settings,
  onChange,
  onGenerate,
  loading,
  error,
}: SidebarProps) {
  const total =
    settings.duration.hook +
    settings.duration.content +
    settings.duration.content2 +
    settings.duration.cta

  const setDuration = (key: keyof typeof settings.duration, val: number) => {
    onChange({ ...settings, duration: { ...settings.duration, [key]: val } })
  }

  const selectedModelLabel = AI_MODEL_GROUPS.flatMap((g) => g.models).find(
    (m) => m.id === settings.aiModel
  )

  return (
    <aside
      className="fixed left-0 top-0 h-full overflow-y-auto flex flex-col gap-4 p-4 border-r border-border"
      style={{ width: 254, background: "var(--sidebar)", zIndex: 40 }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 pt-2 pb-1">
        <Settings className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground tracking-wide">
          Generation Settings
        </span>
      </div>

      <div className="h-px bg-border" />

      {/* Language */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Language
        </Label>
        <Select
          value={settings.language}
          onValueChange={(v) => onChange({ ...settings, language: v })}
        >
          <SelectTrigger className="w-full bg-card border-border text-foreground text-sm h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang} className="text-foreground text-sm">
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Voiceover */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Voiceover
        </Label>
        <div className="flex flex-col gap-2">
          <Select
            value={settings.voiceType}
            onValueChange={(v) => onChange({ ...settings, voiceType: v })}
          >
            <SelectTrigger className="w-full bg-card border-border text-foreground text-sm h-9">
              <SelectValue placeholder="Voice type" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {VOICE_TYPES.map((vt) => (
                <SelectItem key={vt} value={vt} className="text-foreground text-sm">
                  {vt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Age</Label>
            <Input
              type="number"
              min={5}
              max={80}
              value={settings.voiceAge}
              onChange={(e) =>
                onChange({ ...settings, voiceAge: Math.max(5, Math.min(80, Number(e.target.value) || 30)) })
              }
              className="bg-card border-border text-foreground text-sm h-8 w-16 text-center"
            />
            <span className="text-xs text-muted-foreground">yrs</span>
          </div>
        </div>
      </div>

      {/* Duration Settings */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Duration Settings
        </Label>
        <div className="flex flex-col gap-2">
          <DurationInput
            icon="🎯"
            label="Hook"
            accent="#ef4444"
            value={settings.duration.hook}
            onChange={(v) => setDuration("hook", v)}
          />
          <DurationInput
            icon="📦"
            label="Content 1"
            accent="#3b82f6"
            value={settings.duration.content}
            onChange={(v) => setDuration("content", v)}
          />
          <DurationInput
            icon="🎬"
            label="Content 2"
            accent="#8b5cf6"
            value={settings.duration.content2}
            onChange={(v) => setDuration("content2", v)}
          />
          <DurationInput
            icon="📣"
            label="CTA"
            accent="#10b981"
            value={settings.duration.cta}
            onChange={(v) => setDuration("cta", v)}
          />
        </div>
        <div className="flex justify-between items-center mt-1 px-1">
          <span className="text-xs text-muted-foreground">Total Duration</span>
          <span className="text-sm font-bold" style={{ color: "var(--gold)" }}>
            {total}s
          </span>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* AI Text Model */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          AI Text Model
        </Label>
        <Select
          value={settings.aiModel}
          onValueChange={(v) => onChange({ ...settings, aiModel: v })}
        >
          <SelectTrigger className="w-full bg-card border-border text-foreground text-sm h-9">
            <SelectValue>
              {selectedModelLabel ? (
                <span className="flex items-center gap-1.5">
                  <ProviderDot provider={selectedModelLabel.provider} />
                  <span className="truncate">{selectedModelLabel.label}</span>
                </span>
              ) : (
                "Select model..."
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {AI_MODEL_GROUPS.map((group) => (
              <SelectGroup key={group.provider}>
                <SelectLabel
                  className="flex items-center gap-1.5 text-xs font-semibold py-1.5"
                  style={{ color: group.color }}
                >
                  <span>{group.icon}</span>
                  {group.provider}
                </SelectLabel>
                {group.models.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    className="text-foreground text-sm pl-5"
                  >
                    <span className="flex items-center gap-2 w-full">
                      <span className="flex-1">{model.label}</span>
                      {model.badge && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4 leading-none border-border"
                          style={{ color: group.color, borderColor: group.color + "50" }}
                        >
                          {model.badge}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground leading-tight px-0.5">
          Powered by OpenRouter
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* Image Model */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Image Model
        </Label>
        <div className="relative">
          <Input
            list="image-models"
            value={settings.imageModel}
            onChange={(e) => onChange({ ...settings, imageModel: e.target.value })}
            className="bg-card border-border text-foreground text-sm h-9"
            placeholder="Select or type model..."
          />
          <datalist id="image-models">
            {IMAGE_MODEL_SUGGESTIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Video Model */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Video Model
        </Label>
        <div className="relative">
          <Input
            list="video-models"
            value={settings.videoModel}
            onChange={(e) => onChange({ ...settings, videoModel: e.target.value })}
            className="bg-card border-border text-foreground text-sm h-9"
            placeholder="Select or type model..."
          />
          <datalist id="video-models">
            {VIDEO_MODEL_SUGGESTIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button
          onClick={onGenerate}
          disabled={loading}
          className="w-full font-semibold text-sm h-10 transition-all duration-200"
          style={{
            background: loading
              ? "#b45309"
              : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            color: "#0c0c1e",
            border: "none",
          }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Generate Prompts
            </span>
          )}
        </Button>
        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded p-2 leading-relaxed">
            {error}
          </p>
        )}
      </div>
    </aside>
  )
}

function ProviderDot({ provider }: { provider: "google" | "anthropic" | "openai" | "meta" }) {
  const colors: Record<string, string> = {
    google: "#4285F4",
    anthropic: "#D97706",
    openai: "#10b981",
    meta: "#a855f7",
  }
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: colors[provider] }}
    />
  )
}

function DurationInput({
  icon,
  label,
  accent,
  value,
  onChange,
}: {
  icon: string
  label: string
  accent: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-1.5 flex-1 bg-card rounded-md px-2 py-1.5 border"
        style={{ borderColor: accent + "40" }}
      >
        <span className="text-xs">{icon}</span>
        <span className="text-xs font-medium flex-1" style={{ color: accent }}>
          {label}
        </span>
        <input
          type="number"
          min={1}
          max={60}
          value={value}
          onChange={(e) => onChange(Math.min(60, Math.max(1, Number(e.target.value))))}
          className="w-10 text-right text-xs bg-transparent text-foreground outline-none"
          style={{ color: accent }}
        />
        <span className="text-xs text-muted-foreground">s</span>
      </div>
    </div>
  )
}
