"use client"

import { useCallback, useEffect, useState } from "react"

const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", de: "German", fr: "French",
  bn: "Bengali", ja: "Japanese", unknown: "Unknown",
}
const SOURCES = ["app_store", "survey", "email", "social"]

type AnyRec = Record<string, any>

function SentiBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score + 100) / 2))
  return (
    <div className="sentibar">
      <div className="marker" style={{ left: `calc(${pct}% - 2px)` }} />
    </div>
  )
}

function SentimentBadge({ label }: { label: string }) {
  const cls = label === "positive" ? "ok" : label === "negative" ? "bad" : "warn"
  return <span className={`badge ${cls}`}>{label}</span>
}

function TraceCard({ trace }: { trace: AnyRec }) {
  const det = trace.detection
  const tr = trace.translation
  const sent = trace.sentiment
  return (
    <div className="card">
      <div className="row">
        <span className="lang-chip">{LANG_NAMES[det.lang] ?? det.lang}</span>
        <span className="meta">confidence {det.confidence}% · {det.signal}</span>
        <span className="meta">· {trace.processingMs} ms</span>
      </div>
      <div className="orig-text">{trace.original}</div>
      {tr.mode !== "none_needed" && (
        <div className="trans-text">
          {tr.mode === "passthrough" ? "(not translated — analyzed in original language)" : tr.text}
        </div>
      )}
      {tr.note && <div className="meta">ℹ️ {tr.note}</div>}
      <div className="row" style={{ marginTop: 10 }}>
        <SentimentBadge label={sent.label} />
        <span className="mono">score {sent.score}</span>
        <span className="meta">engine: {sent.engine}</span>
      </div>
      <SentiBar score={sent.score} />
      {sent.hits?.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {sent.hits.map((h: AnyRec, i: number) => (
            <div key={i} className="hit-line">
              <b className={h.weight > 0 ? "pos" : "neg"}>{h.term}</b>{" "}
              {h.weight > 0 ? "+" : ""}{h.weight}
              {h.negated ? " · negated" : ""}
              {h.intensified ? " · intensified" : ""}
            </div>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        {trace.themes.map((t: AnyRec) => (
          <span key={t.theme} className="theme-chip">
            {t.theme}
            {t.matched?.length > 0 && t.matched[0] !== "llm" && (
              <span className="meta"> · {t.matched.slice(0, 3).join(", ")}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function SubmitPanel() {
  const [source, setSource] = useState("app_store")
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [traces, setTraces] = useState<AnyRec[]>([])

  async function submit() {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.")
      } else {
        setTraces((prev) => [data.trace, ...prev])
        setContent("")
      }
    } catch {
      setError("Network error.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Submit feedback in any language 🌍</h3>
        <p className="meta">
          English, Spanish, German, French, Bengali, and Japanese are detected
          automatically. Try the snippets in <span className="mono">samples/sample-feedback.md</span>.
        </p>
        <label>Source</label>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <label>Feedback text</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="La sincronización no funciona y he perdido mis notas dos veces."
        />
        {error && <div className="error-box">{error}</div>}
        <div style={{ marginTop: 10 }}>
          <button className="primary" onClick={submit} disabled={busy || !content.trim()}>
            {busy ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>
      {traces.map((t) => (
        <TraceCard key={t.id} trace={t} />
      ))}
    </div>
  )
}

function FeedPanel() {
  const [items, setItems] = useState<AnyRec[] | null>(null)

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
  }, [])

  if (items === null) return <p className="meta">Loading…</p>
  return (
    <div>
      {items.map((f) => (
        <div key={f.id} className="card">
          <div className="row">
            <span className="lang-chip">{LANG_NAMES[f.lang] ?? f.lang}</span>
            <span className="badge">{String(f.source).replace("_", " ")}</span>
            <SentimentBadge label={f.sentiment_label} />
            <span className="mono">score {f.sentiment_score}</span>
            <span className="meta">{new Date(f.created_at).toLocaleDateString()}</span>
          </div>
          <div className="orig-text">{f.original}</div>
          {f.translation_mode !== "none_needed" && (
            <div className="trans-text">
              {f.translation_mode === "passthrough"
                ? "(not translated — analyzed in original language)"
                : f.translation}
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            {(f.themes ?? []).map((t: string) => (
              <span key={t} className="theme-chip">{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function InsightsPanel() {
  const [data, setData] = useState<AnyRec | null>(null)

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({}))
  }, [])

  if (!data?.totals) return <p className="meta">Loading…</p>
  const t = data.totals
  const maxWeek = Math.max(1, ...data.weeklyTrend.map((w: AnyRec) => w.item_count))

  return (
    <div>
      <div className="grid">
        <div className="stat"><div className="value">{t.total_items}</div><div className="label">feedback items</div></div>
        <div className="stat"><div className="value">{t.avg_score > 0 ? `+${t.avg_score}` : t.avg_score}</div><div className="label">avg sentiment (−100…100)</div></div>
        <div className="stat"><div className="value">{t.positive_items}</div><div className="label">positive 🟢</div></div>
        <div className="stat"><div className="value">{t.neutral_items}</div><div className="label">neutral 🟡</div></div>
        <div className="stat"><div className="value">{t.negative_items}</div><div className="label">negative 🔴</div></div>
      </div>
      <p className="meta">analysis engine: {data.engine}</p>

      <h2>Weekly trend 📈</h2>
      <div className="card">
        <div className="trend-row">
          {data.weeklyTrend.map((w: AnyRec) => (
            <div key={w.week_start} className="trend-col">
              <span className="meta">{w.avg_score > 0 ? `+${w.avg_score}` : w.avg_score}</span>
              <div
                className={`trend-bar ${w.avg_score < 0 ? "neg" : ""}`}
                style={{ height: `${Math.round((w.item_count / maxWeek) * 80) + 8}px` }}
                title={`${w.item_count} items`}
              />
              <span className="trend-label">{String(w.week_start).slice(5)}</span>
            </div>
          ))}
        </div>
        <p className="meta">Bar height = volume · number = average sentiment · red = negative week</p>
      </div>

      <h2>By language 🗺️</h2>
      <div className="card">
        <table>
          <thead><tr><th>Language</th><th>Items</th><th>Avg</th><th>🟢</th><th>🟡</th><th>🔴</th></tr></thead>
          <tbody>
            {data.byLanguage.map((l: AnyRec) => (
              <tr key={l.lang}>
                <td><span className="lang-chip">{LANG_NAMES[l.lang] ?? l.lang}</span></td>
                <td>{l.item_count}</td>
                <td className="mono">{l.avg_score > 0 ? `+${l.avg_score}` : l.avg_score}</td>
                <td>{l.positive_items}</td>
                <td>{l.neutral_items}</td>
                <td>{l.negative_items}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>By theme 🏷️</h2>
      <div className="card">
        <table>
          <thead><tr><th>Theme</th><th>Items</th><th>Avg sentiment</th><th>Negative share</th></tr></thead>
          <tbody>
            {data.byTheme.map((th: AnyRec) => (
              <tr key={th.theme}>
                <td><span className="theme-chip">{th.theme}</span></td>
                <td>{th.item_count}</td>
                <td className="mono">{th.avg_score > 0 ? `+${th.avg_score}` : th.avg_score}</td>
                <td>{Math.round((th.negative_items / th.item_count) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="meta">One item can count toward several themes — that's intentional.</p>
      </div>

      <h2>By source 📥</h2>
      <div className="card">
        <table>
          <thead><tr><th>Source</th><th>Items</th><th>Avg sentiment</th></tr></thead>
          <tbody>
            {data.bySource.map((s: AnyRec) => (
              <tr key={s.source}>
                <td>{String(s.source).replace("_", " ")}</td>
                <td>{s.item_count}</td>
                <td className="mono">{s.avg_score > 0 ? `+${s.avg_score}` : s.avg_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LoginPanel({ onLogin }: { onLogin: (u: AnyRec) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function login() {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? "Sign-in failed.")
      else onLogin(data.user)
    } catch {
      setError("Network error.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap card">
      <h3 style={{ marginTop: 0 }}>Analyst sign-in</h3>
      <label>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="analyst@lumo.test" />
      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
      {error && <div className="error-box">{error}</div>}
      <div style={{ marginTop: 12 }}>
        <button className="primary" onClick={login} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
      <p className="meta">Seeded: analyst@lumo.test / lead@lumo.test (password from SEED_PASSWORD, default ChangeMe123!)</p>
    </div>
  )
}

export default function Home() {
  const [user, setUser] = useState<AnyRec | null>(null)
  const [checked, setChecked] = useState(false)
  const [tab, setTab] = useState<"submit" | "login" | "feed" | "insights">("submit")

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user)
        setChecked(true)
      })
      .catch(() => setChecked(true))
  }, [])

  const logout = useCallback(async () => {
    await fetch("/api/auth", { method: "DELETE" })
    setUser(null)
    setTab("submit")
  }, [])

  return (
    <main>
      <div className="topbar">
        <div className="brand">🔎 Echo<span>Lens</span> <span className="meta">· multi-language feedback analyzer for Lumo Notes</span></div>
        <div className="row">
          {user ? (
            <>
              <span className="meta">{user.name} ({user.role})</span>
              <button className="ghost" onClick={logout}>Sign out</button>
            </>
          ) : (
            checked && tab !== "login" && (
              <button className="ghost" onClick={() => setTab("login")}>Analyst sign-in</button>
            )
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "submit" ? "active" : ""} onClick={() => setTab("submit")}>✍️ Submit</button>
        {user && (
          <>
            <button className={tab === "feed" ? "active" : ""} onClick={() => setTab("feed")}>📥 Feed</button>
            <button className={tab === "insights" ? "active" : ""} onClick={() => setTab("insights")}>📊 Insights</button>
          </>
        )}
      </div>

      {tab === "submit" && <SubmitPanel />}
      {tab === "login" && !user && <LoginPanel onLogin={(u) => { setUser(u); setTab("insights") }} />}
      {tab === "feed" && user && <FeedPanel />}
      {tab === "insights" && user && <InsightsPanel />}
    </main>
  )
}
