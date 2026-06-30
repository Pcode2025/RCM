import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ProductImagesUpload } from "@/components/ProductImagesUpload"
import type { ProductInfo } from "@/types"

interface ProductInfoTabProps {
  product: ProductInfo
  onChange: (product: ProductInfo) => void
  onGenerate: () => void
  loading: boolean
}

export function ProductInfoTab({
  product,
  onChange,
  onGenerate,
  loading,
}: ProductInfoTabProps) {
  const set = (key: keyof ProductInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => onChange({ ...product, [key]: e.target.value })

  return (
    <div className="flex flex-col gap-5">
      {/* Intro banner */}
      <div
        className="rounded-xl p-4 border"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 100%)",
          borderColor: "rgba(245,158,11,0.3)",
        }}
      >
        <p className="text-sm font-semibold" style={{ color: "#F59E0B" }}>
          🎬 Indian FMCG Product Ad Builder
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Fill in your product details below. The AI will craft production-ready image and video
          prompts tailored for Indian cultural context and your selected language &amp; duration
          settings.
        </p>
      </div>

      {/* Product Images Upload */}
      <ProductImagesUpload
        values={product.productImages ?? []}
        onChange={(urls) => onChange({ ...product, productImages: urls })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Product Name" required>
          <Input
            value={product.name}
            onChange={set("name")}
            placeholder="e.g. Health Guard Rice Bran Oil, 1 ltr"
            className="bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </FormField>
        <FormField label="Product Link">
          <Input
            value={product.link}
            onChange={set("link")}
            placeholder="https://..."
            className="bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </FormField>
      </div>

      <FormField label="About This Product">
        <Textarea
          value={product.about}
          onChange={set("about")}
          rows={4}
          placeholder="Describe the product — what it is, its purpose, and who it's for..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
        />
      </FormField>

      <FormField label="Key Ingredients">
        <Textarea
          value={product.ingredients}
          onChange={set("ingredients")}
          rows={4}
          placeholder="1. Ingredient – Benefit&#10;2. Ingredient – Benefit"
          className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="How to Use">
          <Textarea
            value={product.howToUse}
            onChange={set("howToUse")}
            rows={3}
            placeholder="Instructions for using the product..."
            className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
          />
        </FormField>
        <FormField label="Eat & Enjoy / Optional">
          <Textarea
            value={product.eatAndEnjoy}
            onChange={set("eatAndEnjoy")}
            rows={2}
            placeholder="Serving suggestions, recipes, or enjoyment tips..."
            className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
          />
        </FormField>
      </div>

      <FormField label="Key Features">
        <Textarea
          value={product.keyFeatures}
          onChange={set("keyFeatures")}
          rows={4}
          placeholder="1. Feature&#10;2. Feature"
          className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
        />
      </FormField>

      <FormField label="Why to Choose?">
        <Textarea
          value={product.whyChoose}
          onChange={set("whyChoose")}
          rows={3}
          placeholder="What sets this product apart? Key differentiators..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
        />
      </FormField>

      <FormField label="Call to Action (CTA) Message">
        <Textarea
          value={product.ctaMessage}
          onChange={set("ctaMessage")}
          rows={3}
          placeholder="Branch availability, contact details, or any custom call-to-action..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Used verbatim in the CTA video prompt. Defaults to the standard branch message — edit it for each product as needed.
        </p>
      </FormField>

      <div className="flex justify-end pt-2 pb-4">
        <Button
          onClick={onGenerate}
          disabled={loading || !product.name.trim()}
          size="lg"
          className="font-semibold gap-2 px-8"
          style={{
            background:
              loading || !product.name.trim()
                ? "#b45309"
                : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            color: "#0c0c1e",
            border: "none",
            opacity: !product.name.trim() ? 0.5 : 1,
          }}
        >
          {loading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              Generating All 5 Prompts...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generate All 5 Prompts
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  )
}
