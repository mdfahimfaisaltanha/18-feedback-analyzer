import { NextRequest, NextResponse } from "next/server"
import { analyzeFeedback } from "@/lib/pipeline"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Source } from "@/lib/types"

export const dynamic = "force-dynamic"

const SOURCES: Source[] = ["app_store", "survey", "email", "social"]
const MAX_LEN = 2000

/**
 * POST /api/feedback — public ingest endpoint (demo). One item per call,
 * returns the full analysis trace so the UI can show its work.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  const source: Source = SOURCES.includes(body?.source) ? body.source : "survey"

  if (!content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 })
  }
  if (content.length > MAX_LEN) {
    return NextResponse.json(
      { error: `content exceeds ${MAX_LEN} characters.` },
      { status: 400 },
    )
  }

  const trace = await analyzeFeedback(source, content)
  return NextResponse.json({ trace }, { status: 201 })
}

/**
 * GET /api/feedback — recent analyzed items for the dashboard feed
 * (analyst session required).
 */
export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const res = await db().query(
    `SELECT id, source, original, lang, lang_confidence, detection_signal,
            translation, translation_mode, translation_note,
            sentiment_score, sentiment_label, sentiment_hits, sentiment_engine,
            themes, theme_hits, processing_ms, created_at
     FROM feedback
     ORDER BY created_at DESC
     LIMIT 50`,
  )
  return NextResponse.json({ items: res.rows })
}
