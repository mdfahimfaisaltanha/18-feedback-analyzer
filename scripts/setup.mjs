/**
 * EchoLens — schema + seed.
 *
 * Usage: node scripts/setup.mjs   (or: npm run setup)
 *
 * - Creates tables (idempotent).
 * - Seeds 2 dashboard users and ~31 feedback items across 6 languages and
 *   ~8 weeks, so the Insights tab (per-language sentiment, theme table,
 *   weekly trend) is alive on first sign-in.
 * - Skips seeding if users already exist.
 *
 * Seeded rows carry curated analysis fields (they don't re-run the pipeline);
 * everything submitted through the UI runs the real thing. The multilingual
 * originals below are all present in lib/translate.ts's phrasebook, so
 * re-submitting them through the UI in mock mode produces consistent results.
 */

import { readFileSync } from "node:fs"
import { randomBytes, scryptSync } from "node:crypto"
import pg from "pg"

// ---- .env.local loader ------------------------------------------------------
try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {
  /* .env.local optional if env vars are set another way */
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.")
  process.exit(1)
}

const SEED_PASSWORD = process.env.SEED_PASSWORD || "ChangeMe123!"
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })

function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 32, { N: 16384 })
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`
}

async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('analyst', 'admin')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('app_store', 'survey', 'email', 'social')),
      original TEXT NOT NULL,
      lang TEXT NOT NULL,
      lang_confidence INTEGER NOT NULL,
      detection_signal TEXT NOT NULL,
      translation TEXT NOT NULL,
      translation_mode TEXT NOT NULL CHECK (translation_mode IN ('none_needed', 'phrasebook', 'llm', 'passthrough')),
      translation_note TEXT,
      sentiment_score INTEGER NOT NULL,
      sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
      sentiment_hits JSONB NOT NULL DEFAULT '[]',
      sentiment_engine TEXT NOT NULL,
      themes JSONB NOT NULL DEFAULT '[]',
      theme_hits JSONB NOT NULL DEFAULT '[]',
      processing_ms INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_lang ON feedback (lang);
  `)
}

// [daysAgo, source, lang, confidence, signal, original, translation, mode, score, themes]
const ITEMS = [
  // —— English ——
  [2, "app_store", "en", 85, "Latin script, English default", "Love the new dark mode, absolutely beautiful!", null, "none_needed", 75, ["ux"]],
  [3, "email", "en", 85, "Latin script, English default", "The app keeps crashing when I attach large images.", null, "none_needed", -60, ["bugs"]],
  [5, "survey", "en", 85, "Latin script, English default", "Sync between my laptop and phone is flawless now, great job.", null, "none_needed", 55, ["sync"]],
  [7, "social", "en", 85, "Latin script, English default", "Too expensive compared to alternatives, considering canceling.", null, "none_needed", -45, ["pricing"]],
  [9, "survey", "en", 85, "Latin script, English default", "Search is fast but tags are confusing to organize.", null, "none_needed", -10, ["features", "ux"]],
  [12, "email", "en", 85, "Latin script, English default", "Support answered in ten minutes. Amazing service.", null, "none_needed", 70, ["support"]],
  [15, "survey", "en", 85, "Latin script, English default", "Onboarding tutorial was clear and quick.", null, "none_needed", 45, ["onboarding"]],
  [18, "app_store", "en", 85, "Latin script, English default", "I lost a whole notebook after the last sync. Furious.", null, "none_needed", -85, ["sync", "bugs"]],
  [24, "survey", "en", 85, "Latin script, English default", "Would love a calendar integration feature.", null, "none_needed", 20, ["features"]],
  [30, "app_store", "en", 85, "Latin script, English default", "Performance on older phones is terrible.", null, "none_needed", -55, ["performance"]],
  [38, "social", "en", 85, "Latin script, English default", "Great app overall, worth every taka.", null, "none_needed", 60, ["pricing"]],
  [42, "app_store", "en", 85, "Latin script, English default", "Notes disappeared twice this month. Unacceptable.", null, "none_needed", -75, ["bugs"]],
  [48, "survey", "en", 85, "Latin script, English default", "The redesign made everything easier to find.", null, "none_needed", 50, ["ux"]],
  [53, "app_store", "en", 85, "Latin script, English default", "Frequent crashes after the March update.", null, "none_needed", -65, ["bugs"]],

  // —— Spanish ——
  [4, "app_store", "es", 79, "3 es stopwords vs 0 runner-up", "Me encanta la aplicación, pero el precio es demasiado alto para estudiantes.", "I love the app, but the price is too high for students.", "phrasebook", 15, ["pricing"]],
  [6, "email", "es", 79, "3 es stopwords vs 0 runner-up", "La sincronización no funciona y he perdido mis notas dos veces.", "The sync does not work and I have lost my notes twice.", "phrasebook", -70, ["sync", "bugs"]],
  [13, "app_store", "es", 87, "4 es stopwords vs 0 runner-up", "Muy buena aplicación, la uso todos los días para mis clases.", "Very good app, I use it every day for my classes.", "phrasebook", 65, ["general"]],
  [20, "social", "es", 79, "3 es stopwords vs 0 runner-up", "El modo oscuro es precioso, gracias por escucharnos.", "The dark mode is beautiful, thanks for listening to us.", "phrasebook", 60, ["ux"]],
  [26, "app_store", "es", 79, "3 es stopwords vs 1 runner-up", "La última versión tiene muchos errores y falla al abrir.", "La última versión tiene muchos errores y falla al abrir.", "passthrough", -50, ["bugs"], "Mock mode: text not in phrasebook — analyzed in the original language via multilingual sentiment lexicons. Set OPENAI_API_KEY for real translation."],

  // —— German ——
  [5, "app_store", "de", 87, "4 de stopwords vs 0 runner-up", "Die App ist sehr langsam geworden nach dem letzten Update.", "The app has become very slow after the latest update.", "phrasebook", -50, ["performance"]],
  [11, "email", "de", 79, "3 de stopwords vs 0 runner-up", "Der Support hat mir schnell geholfen, sehr freundlich!", "Support helped me quickly, very friendly!", "phrasebook", 65, ["support"]],
  [17, "survey", "de", 79, "3 de stopwords vs 0 runner-up", "Zu teuer für das, was es bietet. Ich kündige mein Abo.", "Too expensive for what it offers. I am canceling my subscription.", "phrasebook", -60, ["pricing"]],
  [23, "email", "de", 87, "4 de stopwords vs 0 runner-up", "Die Suche findet meine alten Notizen nicht mehr.", "The search no longer finds my old notes.", "phrasebook", -40, ["features", "bugs"]],

  // —— French ——
  [4, "app_store", "fr", 87, "4 fr stopwords vs 0 runner-up", "L'application plante à chaque fois que j'ouvre une grande note.", "The application crashes every time I open a large note.", "phrasebook", -65, ["bugs"]],
  [10, "survey", "fr", 79, "3 fr stopwords vs 0 runner-up", "Très bonne expérience, l'interface est belle et simple.", "Very good experience, the interface is beautiful and simple.", "phrasebook", 70, ["ux"]],
  [16, "social", "fr", 87, "4 fr stopwords vs 0 runner-up", "Le mode hors ligne ne marche pas, c'est frustrant.", "The offline mode does not work, it is frustrating.", "phrasebook", -55, ["sync"]],
  [27, "survey", "fr", 71, "2 fr stopwords vs 0 runner-up", "J'aimerais pouvoir exporter mes notes en PDF.", "I would like to be able to export my notes as PDF.", "phrasebook", 10, ["features"]],

  // —— Bengali ——
  [3, "social", "bn", 98, "Bengali script (24 chars)", "অ্যাপটা খুব ভালো, কিন্তু দাম একটু বেশি।", "The app is very good, but the price is a bit high.", "phrasebook", 25, ["pricing"]],
  [8, "email", "bn", 98, "Bengali script (26 chars)", "সিঙ্ক কাজ করছে না, আমার নোট হারিয়ে গেছে।", "Sync is not working, my notes are lost.", "phrasebook", -70, ["sync"]],
  [14, "app_store", "bn", 98, "Bengali script (28 chars)", "নতুন আপডেটের পর অ্যাপ খুব ধীর হয়ে গেছে।", "After the new update the app has become very slow.", "phrasebook", -50, ["performance"]],
  [21, "email", "bn", 98, "Bengali script (30 chars)", "সাপোর্ট টিম খুব দ্রুত সাহায্য করেছে, ধন্যবাদ।", "The support team helped very quickly, thank you.", "phrasebook", 65, ["support"]],

  // —— Japanese ——
  [2, "app_store", "ja", 97, "Japanese script (14 kana, 4 kanji)", "このアプリが大好きです。毎日使っています。", "I love this app. I use it every day.", "phrasebook", 80, ["general"]],
  [9, "survey", "ja", 97, "Japanese script (12 kana, 4 kanji)", "同期が遅すぎます。改善してください。", "Sync is too slow. Please improve it.", "phrasebook", -45, ["sync", "performance"]],
  [19, "app_store", "ja", 97, "Japanese script (16 kana, 7 kanji)", "料金が高すぎると思います。学生割引がほしいです。", "I think the price is too high. I would like a student discount.", "phrasebook", -40, ["pricing"]],
  [25, "survey", "ja", 97, "Japanese script (15 kana, 8 kanji)", "検索機能が素晴らしいです。仕事がはかどります。", "The search feature is wonderful. My work is moving forward.", "phrasebook", 70, ["features"]],
]

async function seed() {
  const existing = await pool.query(`SELECT COUNT(*)::int AS n FROM users`)
  if (existing.rows[0].n > 0) {
    console.log("Users already exist — skipping seed. (Drop tables to reseed.)")
    return
  }

  const pw = hashPassword(SEED_PASSWORD)
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES
     ('Nadia Rahman', 'analyst@lumo.test', $1, 'analyst'),
     ('Kenji Watanabe', 'lead@lumo.test', $1, 'admin')`,
    [pw],
  )

  for (const item of ITEMS) {
    const [daysAgo, source, lang, conf, signal, original, translation, mode, score, themes, note] = item
    const label = score > 15 ? "positive" : score < -15 ? "negative" : "neutral"
    const themeHits = themes.map((t) => ({ theme: t, matched: [] }))
    await pool.query(
      `INSERT INTO feedback
         (source, original, lang, lang_confidence, detection_signal,
          translation, translation_mode, translation_note,
          sentiment_score, sentiment_label, sentiment_hits, sentiment_engine,
          themes, theme_hits, processing_ms, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'[]','lexicon-v1',$11,$12,$13,
               now() - ($14 || ' days')::interval - (random() * interval '6 hours'))`,
      [
        source, original, lang, conf, signal,
        translation ?? original, mode, note ?? null,
        score, label,
        JSON.stringify(themes), JSON.stringify(themeHits),
        2 + Math.floor(Math.random() * 6),
        String(daysAgo),
      ],
    )
  }

  console.log("\nSeed complete ✅")
  console.log(`\nDashboard sign-ins (password: ${SEED_PASSWORD})`)
  console.log("  analyst@lumo.test  — analyst")
  console.log("  lead@lumo.test     — admin")
  console.log(`\nSeeded: ${ITEMS.length} feedback items across 6 languages and ~8 weeks.`)
  console.log("\nNext: npm run dev → http://localhost:3000")
  console.log("Try the snippets in samples/sample-feedback.md on the Submit tab.")
}

try {
  await createSchema()
  await seed()
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  await pool.end()
}
