export interface ProductInfo {
  name: string
  link: string
  about: string
  ingredients: string
  howToUse: string
  keyFeatures: string
  eatAndEnjoy: string
  whyChoose: string
  ctaMessage: string
  productImages?: string[]
}

export const DEFAULT_CTA_MESSAGE =
  "ನಮ್ಮ ಶಾಖೆಗಳು ಹಾಸನ, ಹೊನ್ನಾಳಿ, ಕಡೂರು, ನಲ್ಲಿ ಲಭ್ಯ ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಮತ್ತು ಶಾಖೆ ವಿವರಗಳಿಗಾಗಿ ಕಮೆಂಟ್ ಬಾಕ್ಸ್ ನೋಡಿ"

export interface DurationSettings {
  hook: number
  content: number
  content2: number
  cta: number
}

export interface GenerationSettings {
  language: string
  duration: DurationSettings
  voiceType: string
  voiceAge: number
  imageModel: string
  videoModel: string
  aiModel: string
}

export const VOICE_TYPES = [
  "Male",
  "Female",
  "Boy",
  "Girl",
  "Old Man",
  "Old Woman",
  "Deep Male",
  "Soft Female",
  "Narrator Male",
  "Narrator Female",
] as const

export interface AiModelOption {
  id: string
  label: string
  provider: "google" | "anthropic" | "openai" | "meta"
  badge?: string
}

export const AI_MODEL_GROUPS: { provider: string; color: string; icon: string; models: AiModelOption[] }[] = [
  {
    provider: "Google Gemini",
    color: "#4285F4",
    icon: "✦",
    models: [
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "google", badge: "Pro" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google", badge: "Fast" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", provider: "google" },
    ],
  },
  {
    provider: "Anthropic Claude",
    color: "#D97706",
    icon: "◆",
    models: [
      { id: "anthropic/claude-opus-4", label: "Claude Opus 4", provider: "anthropic", badge: "Best" },
      { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "anthropic" },
      { id: "anthropic/claude-haiku-3-5", label: "Claude Haiku 3.5", provider: "anthropic", badge: "Fast" },
    ],
  },
  {
    provider: "OpenAI ChatGPT",
    color: "#10b981",
    icon: "●",
    models: [
      { id: "openai/gpt-4o", label: "GPT-4o", provider: "openai" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", badge: "Fast" },
      { id: "openai/o3-mini", label: "o3-mini", provider: "openai", badge: "Reason" },
    ],
  },
  {
    provider: "Meta Llama",
    color: "#a855f7",
    icon: "▲",
    models: [
      { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", provider: "meta", badge: "New" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", provider: "meta" },
      { id: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B", provider: "meta", badge: "Fast" },
    ],
  },
]

export interface GeneratedPrompts {
  imagePrompt: string
  hookPrompt: string
  contentPrompt: string
  content2Prompt: string
  ctaPrompt: string
}

export interface PromptGeneration {
  id: string
  createdAt: string
  product: ProductInfo
  settings: GenerationSettings
  prompts: GeneratedPrompts
  projectId?: string | null
}

export interface Project {
  id: string
  name: string
  createdAt: string
}

export interface ShareStatus {
  shared: boolean
  token?: string
  isProtected?: boolean
}

export const LANGUAGES = [
  "Kannada",
  "English",
  "Hindi",
  "Kannada + English",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
]

export const IMAGE_MODEL_SUGGESTIONS = [
  "Nano Banana Pro",
  "Higgsfield",
  "Ideogram v2",
  "Seedream 4.5",
  "Midjourney",
  "DALL-E 3",
  "Flux Pro",
  "GPT Image 4o",
  "Kling Image",
]

export const VIDEO_MODEL_SUGGESTIONS = [
  "Seedance 2.0",
  "Kling 3.0",
  "Veo 3",
  "Kling 2.0 Turbo",
  "Hailuo",
  "Runway Gen-3",
]

export const SAMPLE_PRODUCT: ProductInfo = {
  name: "Health Guard Rice Bran Oil, 1 ltr",
  link: "https://rcmworld.com/product/health-guard-rice-bran-oil-1-ltr-20004504",
  about:
    "Elevate your meals with Health Guard Rice Bran Oil, a premium cooking oil that combines balanced fats and antioxidants for healthy cooking. Extracted from rice bran, this oil is designed for everyday use in all types of cooking.",
  ingredients:
    "1. Oryzanol – Helps in Cholesterol Management\n2. Vitamin E – Powerful antioxidant\n3. Vitamin A – Vision support\n4. Vitamin D – Bone health\n5. MUFA & Omega-6 PUFA – Heart-friendly fats",
  howToUse:
    "Suitable for all types of cooking — sautéing, stir-frying, baking, and deep-frying. Use daily for healthy family meals.",
  keyFeatures:
    "1. Trans Fat Free\n2. High smoke point\n3. Physically refined (not chemically processed)\n4. 1500mg Oryzanol per 100g\n5. ISO 9001:2015 certified",
  eatAndEnjoy: "",
  whyChoose:
    "1. GMP standards followed\n2. Physically refined – safer than chemically processed oils\n3. Oryzanol supports heart wellness\n4. Globally certified quality",
  ctaMessage: DEFAULT_CTA_MESSAGE,
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  language: "Kannada",
  duration: { hook: 5, content: 10, content2: 10, cta: 10 },
  voiceType: "Male",
  voiceAge: 30,
  imageModel: "Flux Pro",
  videoModel: "Kling 3.0",
  aiModel: "google/gemini-2.5-flash",
}
