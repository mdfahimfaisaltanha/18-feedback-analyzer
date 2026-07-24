export type Lang = "en" | "es" | "de" | "fr" | "bn" | "ja" | "unknown"

export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  bn: "Bengali",
  ja: "Japanese",
  unknown: "Unknown",
}

export type SentimentLabel = "positive" | "neutral" | "negative"

export type Theme =
  | "pricing"
  | "performance"
  | "bugs"
  | "sync"
  | "ux"
  | "features"
  | "support"
  | "onboarding"
  | "general"

export type Source = "app_store" | "survey" | "email" | "social"

export type Detection = {
  lang: Lang
  /** 0-100 */
  confidence: number
  /** human-readable reason, e.g. "Bengali script" or "12 Spanish stopwords" */
  signal: string
}

export type Translation = {
  text: string
  /** how the English text was obtained */
  mode: "none_needed" | "phrasebook" | "llm" | "passthrough"
  note?: string
}

export type SentimentHit = {
  term: string
  weight: number
  negated: boolean
  intensified: boolean
}

export type Sentiment = {
  /** -100 .. 100 */
  score: number
  label: SentimentLabel
  hits: SentimentHit[]
  engine: "lexicon-v1" | "gpt-4o-mini"
}

export type ThemeHit = {
  theme: Theme
  matched: string[]
}

export type AnalysisTrace = {
  id: number
  source: Source
  original: string
  detection: Detection
  translation: Translation
  sentiment: Sentiment
  themes: ThemeHit[]
  processingMs: number
}

export type User = {
  id: number
  name: string
  email: string
  role: "analyst" | "admin"
}
