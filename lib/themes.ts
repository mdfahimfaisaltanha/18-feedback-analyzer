import type { Theme, ThemeHit } from "./types"

/**
 * Theme extraction against a FIXED taxonomy.
 *
 * Deliberate design choice: an open-ended "cluster whatever you find" system
 * produces different themes every run and can't power a trend chart. A fixed
 * taxonomy means the dashboard can compare weeks, languages, and sources
 * apples-to-apples. New themes are a one-line addition here.
 *
 * Keywords are matched against the ENGLISH text when translation succeeded,
 * and against the original when it passed through — so each theme also
 * carries a few native-language keywords for mock-mode passthrough.
 */

const THEME_KEYWORDS: Record<Exclude<Theme, "general">, string[]> = {
  pricing: [
    "price", "pricing", "expensive", "cost", "cheap", "subscription", "discount",
    "refund", "pay", "paid", "billing", "trial",
    "precio", "caro", "cara", "teuer", "abo", "cher", "chère", "দাম", "料金", "割引",
  ],
  performance: [
    "slow", "lag", "laggy", "speed", "freezes", "freeze", "performance", "loading",
    "langsam", "lenta", "lento", "lent", "lente", "ধীর", "遅すぎ", "遅い",
  ],
  bugs: [
    "crash", "crashes", "crashed", "bug", "bugs", "buggy", "broken", "error", "fails",
    "failed", "glitch", "plante", "falla", "absturz", "stürzt", "fehler", "クラッシュ", "バグ",
  ],
  sync: [
    "sync", "syncing", "synchronization", "offline", "sincronización", "hors ligne",
    "সিঙ্ক", "同期", "conflict", "devices", "device",
  ],
  ux: [
    "interface", "design", "layout", "dark mode", "font", "beautiful", "confusing",
    "intuitive", "navigation", "theme", "ugly", "clean", "modo oscuro",
  ],
  features: [
    "feature", "features", "wish", "would like", "add", "export", "tags", "search",
    "missing", "request", "integration", "widget", "検索", "pdf",
  ],
  support: [
    "support", "helped", "help", "response", "customer service", "team", "reply",
    "answered", "সাপোর্ট", "サポート",
  ],
  onboarding: [
    "onboarding", "tutorial", "getting started", "signup", "sign up", "account creation",
    "first time", "setup", "confusing to start",
  ],
}

export function extractThemes(englishText: string, originalText: string): ThemeHit[] {
  const haystack = `${englishText}\n${originalText}`.normalize("NFC").toLowerCase()
  const results: ThemeHit[] = []

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS) as Array<
    [Exclude<Theme, "general">, string[]]
  >) {
    const matched = keywords.filter((k) => haystack.includes(k))
    if (matched.length > 0) {
      results.push({ theme, matched })
    }
  }

  if (results.length === 0) {
    return [{ theme: "general", matched: [] }]
  }
  // Most-evidenced themes first
  results.sort((a, b) => b.matched.length - a.matched.length)
  return results
}

export const ALL_THEMES: Theme[] = [
  ...(Object.keys(THEME_KEYWORDS) as Theme[]),
  "general",
]
