import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/insights — the aggregate views the dashboard renders:
 *  - totals + sentiment split
 *  - per-language: volume, avg sentiment, pos/neu/neg counts
 *  - per-theme: volume, avg sentiment, negative share (jsonb_array_elements
 *    unnests the themes array so one item can count toward several themes)
 *  - per-source volume
 *  - weekly trend (last 10 weeks): volume + avg sentiment
 */
export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const pool = db()

  const [totals, byLang, byTheme, bySource, trend] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total_items,
              ROUND(AVG(sentiment_score))::int AS avg_score,
              COUNT(*) FILTER (WHERE sentiment_label = 'positive')::int AS positive_items,
              COUNT(*) FILTER (WHERE sentiment_label = 'neutral')::int AS neutral_items,
              COUNT(*) FILTER (WHERE sentiment_label = 'negative')::int AS negative_items
       FROM feedback`,
    ),
    pool.query(
      `SELECT lang,
              COUNT(*)::int AS item_count,
              ROUND(AVG(sentiment_score))::int AS avg_score,
              COUNT(*) FILTER (WHERE sentiment_label = 'positive')::int AS positive_items,
              COUNT(*) FILTER (WHERE sentiment_label = 'neutral')::int AS neutral_items,
              COUNT(*) FILTER (WHERE sentiment_label = 'negative')::int AS negative_items
       FROM feedback
       GROUP BY lang
       ORDER BY item_count DESC`,
    ),
    pool.query(
      `SELECT t.value #>> '{}' AS theme,
              COUNT(*)::int AS item_count,
              ROUND(AVG(f.sentiment_score))::int AS avg_score,
              COUNT(*) FILTER (WHERE f.sentiment_label = 'negative')::int AS negative_items
       FROM feedback f, jsonb_array_elements(f.themes) AS t
       GROUP BY t.value #>> '{}'
       ORDER BY item_count DESC`,
    ),
    pool.query(
      `SELECT source, COUNT(*)::int AS item_count,
              ROUND(AVG(sentiment_score))::int AS avg_score
       FROM feedback
       GROUP BY source
       ORDER BY item_count DESC`,
    ),
    pool.query(
      `SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week_start,
              COUNT(*)::int AS item_count,
              ROUND(AVG(sentiment_score))::int AS avg_score
       FROM feedback
       WHERE created_at > now() - interval '10 weeks'
       GROUP BY date_trunc('week', created_at)
       ORDER BY date_trunc('week', created_at)`,
    ),
  ])

  return NextResponse.json({
    totals: totals.rows[0],
    byLanguage: byLang.rows,
    byTheme: byTheme.rows,
    bySource: bySource.rows,
    weeklyTrend: trend.rows,
    engine: process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "mock (deterministic)",
  })
}
