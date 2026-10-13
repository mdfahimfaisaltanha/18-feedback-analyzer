import type { Lang, Sentiment, SentimentHit, SentimentLabel } from "./types"

/**
 * Lexicon sentiment (mock engine, deterministic):
 *
 * - Weighted term lexicon per language (EN is the main one; es/de/fr/bn/ja
 *   have micro-lexicons so PASSTHROUGH text still gets scored).
 * - Negation flips a term's sign when a negator appears within 3 tokens
 *   before it ("not good" → negative). "n't" is expanded to "not" first.
 * - Intensifiers (very / muy / sehr / très / খুব ...) boost the next hit ×1.5.
 * - Multi-word entries (e.g. "ne marche pas") are substring-matched, which is
 *   also how bn/ja are scored — token splitting doesn't work for scripts
 *   without spaces.
 *
 * score = clamp(sum × 15, -100, 100); label thresholds at ±15.
 */

type Lexicon = Record<string, number>

const EN: Lexicon = {
  love: 4, loves: 4, loved: 4, excellent: 4, amazing: 4, perfect: 4, wonderful: 4, best: 3,
  great: 3, helpful: 3, intuitive: 3, reliable: 3, recommend: 3, friendly: 2, fast: 2,
  good: 2, beautiful: 2, simple: 2, easy: 2, useful: 2, happy: 2, thanks: 2, thank: 2,
  quick: 2, quickly: 2, smooth: 2, worth: 2, nice: 2, improved: 2,
  hate: -4, terrible: -4, awful: -4, worst: -4, unusable: -4, scam: -4,
  crash: -3, crashes: -3, crashed: -3, buggy: -3, broken: -3, lost: -3, useless: -3,
  frustrating: -3, frustrated: -3, disappointed: -3, disappointing: -3, freezes: -3,
  fails: -3, failed: -3, waste: -3, overpriced: -3,
  slow: -2, bug: -2, bugs: -2, expensive: -2, annoying: -2, confusing: -2, cancel: -2,
  canceling: -2, cancelled: -2, laggy: -2, stuck: -2, missing: -2, problem: -2,
  problems: -2, refund: -2, lose: -2, losing: -2,
  issue: -1, issues: -1,
}

const MICRO: Partial<Record<Lang, Lexicon>> = {
  es: {
    encanta: 4, excelente: 4, perfecto: 4, buena: 2, bueno: 2, rápida: 2, rápido: 2,
    fácil: 2, precioso: 3, gracias: 2,
    terrible: -4, frustrante: -3, falla: -3, perdido: -3, "no funciona": -3,
    mala: -2, malo: -2, lenta: -2, lento: -2, cara: -2, caro: -2, error: -2,
  },
  de: {
    perfekt: 4, toll: 3, hilfreich: 3, gut: 2, schnell: 2, freundlich: 2, danke: 2,
    schlecht: -3, absturz: -3, stürzt: -3, verloren: -3,
    langsam: -2, teuer: -2, fehler: -2, kündige: -2,
  },
  fr: {
    excellente: 4, super: 3, bonne: 2, bon: 2, belle: 2, simple: 2, rapide: 2, merci: 2,
    plante: -3, frustrant: -3, perdu: -3, "ne marche pas": -3, "ne fonctionne pas": -3,
    lent: -2, lente: -2, cher: -2, chère: -2,
  },
  bn: {
    "খুব ভালো": 3, "ভালো": 2, "ধন্যবাদ": 2, "দ্রুত": 2, "সুন্দর": 2,
    "কাজ করছে না": -3, "হারিয়ে গেছে": -3, "সমস্যা": -2, "ধীর": -2, "বাজে": -2, "খারাপ": -3,
  },
  ja: {
    "大好き": 4, "素晴らしい": 4, "便利": 3, "使いやすい": 3, "好き": 3, "ありがとう": 2,
    "最悪": -4, "クラッシュ": -3, "落ちる": -3, "遅すぎ": -3, "高すぎ": -3,
    "遅い": -2, "バグ": -2, "問題": -2, "残念": -2,
  },
}

const NEGATORS = new Set(["not", "no", "never", "nothing", "without", "hardly", "nicht", "kein", "keine", "ne", "jamais", "nunca"])
const INTENSIFIERS = new Set(["very", "really", "extremely", "super", "too", "so", "muy", "sehr", "très", "demasiado", "zu", "খুব"])

function label(score: number): SentimentLabel {
  if (score > 15) return "positive"
  if (score < -15) return "negative"
  return "neutral"
}

export function lexiconSentiment(text: string, lang: Lang): Sentiment {
  const lexicon: Lexicon =
    lang === "en" || lang === "unknown" ? EN : (MICRO[lang] ?? EN)

  const hits: SentimentHit[] = []
  let raw = 0
  const lower = text.normalize("NFC").toLowerCase().replace(/n't\b/g, " not")

  // —— multi-word + non-spaced-script entries: substring matching ——
  const substringTerms = Object.keys(lexicon).filter(
    (t) => t.includes(" ") || lang === "bn" || lang === "ja",
  )
  const consumed: string[] = []
  for (const term of substringTerms) {
    if (lower.includes(term)) {
      // longest-match-first shadowing: "খুব ভালো" should suppress plain "ভালো"
      if (consumed.some((c) => c.includes(term))) continue
      raw += lexicon[term]
      hits.push({ term, weight: lexicon[term], negated: false, intensified: false })
      consumed.push(term)
    }
  }

  // —— token pass (spaced scripts only) ——
  if (lang !== "bn" && lang !== "ja") {
    const tokens = lower.split(/[^\p{L}']+/u).filter(Boolean)
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      const weight = lexicon[t]
      if (weight === undefined || t.includes(" ")) continue
      const window = tokens.slice(Math.max(0, i - 3), i)
      const negated = window.some((w) => NEGATORS.has(w))
      const intensified = window.some((w) => INTENSIFIERS.has(w))
      let contribution = weight
      if (negated) contribution = -contribution * 0.8
      if (intensified) contribution *= 1.5
      raw += contribution
      hits.push({ term: t, weight: Math.round(contribution * 10) / 10, negated, intensified })
    }
  }

  // Sort substring-first artifacts into reading order isn't needed for scoring;
  // keep hits as evidence for the UI/audit.
  const score = Math.max(-100, Math.min(100, Math.round(raw * 15)))
  return { score, label: label(score), hits, engine: "lexicon-v1" }
}

export function sentimentLabel(score: number): SentimentLabel {
  return label(score)
}
