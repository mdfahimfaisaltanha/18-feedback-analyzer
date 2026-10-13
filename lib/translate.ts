import type { Lang, Translation } from "./types"

/**
 * Mock translation = a phrasebook keyed on normalized text.
 *
 * Honest framing (also in the README): real machine translation is not
 * something a keyword table can fake. In mock mode we translate the corpus we
 * ship (seed data + samples) exactly, and PASS THROUGH anything unknown with
 * an explicit note — the multilingual sentiment micro-lexicons in
 * lib/sentiment.ts then still score the original text, so the pipeline
 * degrades gracefully instead of lying. With OPENAI_API_KEY set, translation
 * is a real gpt-4o-mini call (see lib/pipeline.ts).
 */

export function normalizeKey(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s.,!?。、！？¡¿“”"']+$/gu, "")
    .replace(/^[\s.,!?。、！？¡¿“”"']+/gu, "")
    .trim()
}

const PHRASEBOOK: Record<string, string> = {
  // —— Spanish ——
  [normalizeKey("Me encanta la aplicación, pero el precio es demasiado alto para estudiantes.")]:
    "I love the app, but the price is too high for students.",
  [normalizeKey("La sincronización no funciona y he perdido mis notas dos veces.")]:
    "The sync does not work and I have lost my notes twice.",
  [normalizeKey("Muy buena aplicación, la uso todos los días para mis clases.")]:
    "Very good app, I use it every day for my classes.",
  [normalizeKey("El modo oscuro es precioso, gracias por escucharnos.")]:
    "The dark mode is beautiful, thanks for listening to us.",

  // —— German ——
  [normalizeKey("Die App ist sehr langsam geworden nach dem letzten Update.")]:
    "The app has become very slow after the latest update.",
  [normalizeKey("Der Support hat mir schnell geholfen, sehr freundlich!")]:
    "Support helped me quickly, very friendly!",
  [normalizeKey("Zu teuer für das, was es bietet. Ich kündige mein Abo.")]:
    "Too expensive for what it offers. I am canceling my subscription.",
  [normalizeKey("Die Suche findet meine alten Notizen nicht mehr.")]:
    "The search no longer finds my old notes.",

  // —— French ——
  [normalizeKey("L'application plante à chaque fois que j'ouvre une grande note.")]:
    "The application crashes every time I open a large note.",
  [normalizeKey("Très bonne expérience, l'interface est belle et simple.")]:
    "Very good experience, the interface is beautiful and simple.",
  [normalizeKey("Le mode hors ligne ne marche pas, c'est frustrant.")]:
    "The offline mode does not work, it is frustrating.",
  [normalizeKey("J'aimerais pouvoir exporter mes notes en PDF.")]:
    "I would like to be able to export my notes as PDF.",

  // —— Bengali ——
  [normalizeKey("অ্যাপটা খুব ভালো, কিন্তু দাম একটু বেশি।")]:
    "The app is very good, but the price is a bit high.",
  [normalizeKey("সিঙ্ক কাজ করছে না, আমার নোট হারিয়ে গেছে।")]:
    "Sync is not working, my notes are lost.",
  [normalizeKey("নতুন আপডেটের পর অ্যাপ খুব ধীর হয়ে গেছে।")]:
    "After the new update the app has become very slow.",
  [normalizeKey("সাপোর্ট টিম খুব দ্রুত সাহায্য করেছে, ধন্যবাদ।")]:
    "The support team helped very quickly, thank you.",

  // —— Japanese ——
  [normalizeKey("このアプリが大好きです。毎日使っています。")]:
    "I love this app. I use it every day.",
  [normalizeKey("同期が遅すぎます。改善してください。")]:
    "Sync is too slow. Please improve it.",
  [normalizeKey("料金が高すぎると思います。学生割引がほしいです。")]:
    "I think the price is too high. I would like a student discount.",
  [normalizeKey("検索機能が素晴らしいです。仕事がはかどります。")]:
    "The search feature is wonderful. My work is moving forward.",
}

export function mockTranslate(text: string, lang: Lang): Translation {
  if (lang === "en" || lang === "unknown") {
    return { text, mode: "none_needed" }
  }
  const hit = PHRASEBOOK[normalizeKey(text)]
  if (hit) {
    return { text: hit, mode: "phrasebook" }
  }
  return {
    text,
    mode: "passthrough",
    note: "Mock mode: text not in phrasebook — analyzed in the original language via multilingual sentiment lexicons. Set OPENAI_API_KEY for real translation.",
  }
}
