import { Clapperboard, Package, Sparkles, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type AppView = "generator" | "editor"

interface HeaderProps {
  view: AppView
  onViewChange: (view: AppView) => void
  totalDuration: number
  onLoadSample: () => void
}

export function AppHeader({ view, onViewChange, totalDuration, onLoadSample }: HeaderProps) {
  return (
    <header
      className="fixed top-0 right-0 flex items-center justify-between px-6 h-16 border-b border-border z-30"
      style={{ left: 254, background: "#0c0c1e" }}
    >
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}
        >
          <Clapperboard className="w-5 h-5 text-[#0c0c1e]" />
        </div>
        <div>
          <h1
            className="text-base font-bold leading-none tracking-tight"
            style={{ color: "#F59E0B" }}
          >
            AI Video Prompt Generator
          </h1>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">
            RCM World Product Ad Builder • MyDesignNexus
          </p>
        </div>

        {/* View switcher */}
        <div className="ml-4 flex items-center gap-1 rounded-lg border border-border p-0.5 bg-card">
          <button
            type="button"
            onClick={() => onViewChange("generator")}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors",
              view === "generator"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Prompts
          </button>
          <button
            type="button"
            onClick={() => onViewChange("editor")}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors",
              view === "editor"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Film className="w-3.5 h-3.5" />
            Video Editor
          </button>
        </div>
      </div>

      {/* Right: Duration badge + Load Sample (generator only) */}
      {view === "generator" && (
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-primary/40 text-primary text-xs px-3 py-1 font-semibold"
          >
            ⏱ Total: {totalDuration}s
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadSample}
            className="gap-2 border-border text-foreground hover:bg-secondary text-xs h-8"
          >
            <Package className="w-3.5 h-3.5" />
            Load Sample
          </Button>
        </div>
      )}
    </header>
  )
}
