import { useState } from "react"
import { Copy, Check, Download, ArrowLeft, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { GeneratedPrompts, GenerationSettings, ProductInfo } from "@/types"

interface GeneratedPromptsTabProps {
  prompts: GeneratedPrompts
  settings: GenerationSettings
  product: ProductInfo
  onNewProduct: () => void
}

const PROMPT_CARDS = [
  {
    key: "imagePrompt" as keyof GeneratedPrompts,
    icon: "🖼️",
    label: "IMAGE PROMPT",
    accent: "#a855f7",
    description: "3D cartoon mascot + premium CGI product visualization",
  },
  {
    key: "hookPrompt" as keyof GeneratedPrompts,
    icon: "🎯",
    label: "HOOK VIDEO",
    accent: "#ef4444",
    description: "Pain-point opener to grab attention",
  },
  {
    key: "contentPrompt" as keyof GeneratedPrompts,
    icon: "📦",
    label: "CONTENT VIDEO 1",
    accent: "#3b82f6",
    description: "Mascot hero + animated benefit bubbles",
  },
  {
    key: "content2Prompt" as keyof GeneratedPrompts,
    icon: "🎬",
    label: "CONTENT VIDEO 2",
    accent: "#8b5cf6",
    description: "Deeper product demo + social proof moment",
  },
  {
    key: "ctaPrompt" as keyof GeneratedPrompts,
    icon: "📣",
    label: "CTA VIDEO",
    accent: "#10b981",
    description: "Store visit CTA with location pins",
  },
]

export function GeneratedPromptsTab({
  prompts,
  settings,
  product,
  onNewProduct,
}: GeneratedPromptsTabProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [allCopied, setAllCopied] = useState(false)

  const totalDuration =
    settings.duration.hook +
    settings.duration.content +
    settings.duration.content2 +
    settings.duration.cta

  const handleCopy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCopyAll = async () => {
    const all = PROMPT_CARDS.map(
      (c) => `=== ${c.icon} ${c.label} ===\n\n${prompts[c.key]}`
    ).join("\n\n" + "=".repeat(60) + "\n\n")
    await navigator.clipboard.writeText(all)
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 2000)
  }

  const handleDownload = () => {
    const content = [
      `AI VIDEO PROMPT GENERATOR`,
      `Product: ${product.name}`,
      `Language: ${settings.language}`,
      `Duration: Hook ${settings.duration.hook}s | Content ${settings.duration.content}s | Content 2 ${settings.duration.content2}s | CTA ${settings.duration.cta}s | Total ${totalDuration}s`,
      `Video Model: ${settings.videoModel}`,
      `Image Model: ${settings.imageModel}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "=".repeat(60),
      "",
      ...PROMPT_CARDS.map(
        (c) => `${c.icon} ${c.label}\n\n${prompts[c.key]}\n\n${"=".repeat(60)}\n`
      ),
    ].join("\n")

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prompts-${product.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary bar */}
      <div
        className="rounded-xl p-4 border flex flex-wrap gap-3 items-center"
        style={{
          background: "rgba(245,158,11,0.08)",
          borderColor: "rgba(245,158,11,0.25)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Product:</span>
          <span className="text-xs font-semibold text-foreground">{product.name}</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Language:</span>
          <Badge variant="outline" className="text-xs border-primary/40 text-primary px-2 py-0">
            {settings.language}
          </Badge>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Duration:</span>
          <span className="text-xs font-semibold" style={{ color: "#F59E0B" }}>
            {totalDuration}s
          </span>
          <span className="text-xs text-muted-foreground">
            ({settings.duration.hook}s + {settings.duration.content}s + {settings.duration.content2}s + {settings.duration.cta}s)
          </span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Video:</span>
          <span className="text-xs font-semibold text-foreground">{settings.videoModel}</span>
        </div>
      </div>

      {/* Prompt cards */}
      <div className="flex flex-col gap-4">
        {PROMPT_CARDS.map((card) => (
          <PromptCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            accent={card.accent}
            description={card.description}
            text={prompts[card.key]}
            isCopied={copied === card.key}
            onCopy={() => handleCopy(card.key, prompts[card.key])}
          />
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap gap-3 pt-2 pb-6 border-t border-border justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onNewProduct}
          className="gap-2 border-border text-foreground hover:bg-secondary"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          New Product
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2 border-border text-foreground hover:bg-secondary"
          >
            <Download className="w-3.5 h-3.5" />
            Download .txt
          </Button>
          <Button
            size="sm"
            onClick={handleCopyAll}
            className="gap-2 font-semibold"
            style={{
              background: allCopied
                ? "#10b981"
                : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              color: "#0c0c1e",
              border: "none",
              transition: "background 0.3s",
            }}
          >
            {allCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardList className="w-3.5 h-3.5" />
                Copy All {PROMPT_CARDS.length} Prompts
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function PromptCard({
  icon,
  label,
  accent,
  description,
  text,
  isCopied,
  onCopy,
}: {
  icon: string
  label: string
  accent: string
  description: string
  text: string
  isCopied: boolean
  onCopy: () => void
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{ borderColor: accent + "40", background: "var(--card)" }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: accent + "18",
          borderColor: accent + "30",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <div>
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: accent }}
            >
              {label}
            </span>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">{description}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-7 px-3 text-xs gap-1.5 transition-all duration-200"
          style={
            isCopied
              ? { background: "#10b981", color: "#fff" }
              : { color: "var(--muted-foreground)" }
          }
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Card content */}
      <div className="p-4">
        <pre
          className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        >
          {text}
        </pre>
      </div>
    </div>
  )
}
