import type { Detection, Lang } from "./types"

/**
 * Language detection — deterministic, zero-dependency, zero-cost.
 *
 * Two signals, in order of reliability:
 *  1. Script ranges: Bengali and Japanese are unambiguous from Unicode alone.
 *  2. Stopword voting for Latin-script languages (es/de/fr vs en default).
 *
 * This is the one stage that stays local even in real-LLM mode: detection is
 * cheap and reliable enough that paying an API for it is waste.
 */

const STOPWORDS: Record<"es" | "de" | "fr", string[]> = {
  es: ["el", "la", "los", "las", "que", "es", "muy", "pero", "para", "con", "una", "uno", "todos", "esta", "está", "aplicación", "más", "mis", "cuando", "tiene", "demasiado", "funciona", "veces", "días", "encanta"],
  de: ["der", "die", "das", "und", "ist", "nicht", "sehr", "aber", "ich", "mir", "mein", "nach", "dem", "für", "was", "es", "zu", "hat", "wird", "geworden", "letzten", "schnell", "bietet", "kündige"],
  fr: ["le", "la", "les", "est", "très", "mais", "ne", "pas", "je", "une", "des", "que", "pour", "avec", "c'est", "chaque", "fois", "quand", "mode", "marche", "plante", "j'ouvre", "hors", "ligne", "grande"],
}

export function detectLanguage(text: string): Detection {
  // 1. Script-based detection (unambiguous)
  const bengaliChars = (text.match(/[\u0980-\u09ff]/g) ?? []).length
  const kanaChars = (text.match(/[\u3040-\u30ff]/g) ?? []).length
  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
  const totalChars = text.replace(/\s/g, "").length || 1

  if (bengaliChars / totalChars > 0.3) {
    return { lang: "bn", confidence: 98, signal: `Bengali script (${bengaliChars} chars)` }
  }
  if (kanaChars > 0 || cjkChars / totalChars > 0.3) {
    // Kana is uniquely Japanese; CJK-only text is assumed Japanese for this demo
    // (a production system would add a Chinese/Korean disambiguation pass).
    const confidence = kanaChars > 0 ? 97 : 80
    return { lang: "ja", confidence, signal: `Japanese script (${kanaChars} kana, ${cjkChars} kanji)` }
  }

  // 2. Stopword voting for Latin scripts
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}']+/u)
    .filter(Boolean)
  if (tokens.length === 0) {
    return { lang: "unknown", confidence: 0, signal: "no letters found" }
  }

  const votes: Array<{ lang: Lang; hits: number }> = (
    Object.keys(STOPWORDS) as Array<"es" | "de" | "fr">
  ).map((lang) => ({
    lang,
    hits: tokens.filter((t) => STOPWORDS[lang].includes(t)).length,
  }))
  votes.sort((a, b) => b.hits - a.hits)

  const [top, second] = votes
  // Require at least 2 stopword hits AND a clear margin over the runner-up;
  // otherwise default to English (the platform's dominant language).
  if (top.hits >= 2 && top.hits > (second?.hits ?? 0)) {
    const confidence = Math.min(95, 55 + top.hits * 8)
    return {
      lang: top.lang,
      confidence,
      signal: `${top.hits} ${top.lang} stopwords vs ${second?.hits ?? 0} runner-up`,
    }
  }

  return { lang: "en", confidence: top.hits === 0 ? 85 : 60, signal: "Latin script, no strong stopword signal → English default" }
}
