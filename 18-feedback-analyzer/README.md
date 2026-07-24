# EchoLens — Multi-Language Feedback Analyzer

Customer feedback arrives in whatever language customers speak. EchoLens
ingests feedback for a fictional note-taking app (Lumo Notes) in **6
languages** (English, Spanish, German, French, Bengali, Japanese), detects the
language, translates to English, scores sentiment with negation handling, and
tags items against a fixed theme taxonomy — then rolls it all up into an
insights dashboard: per-language sentiment splits, per-theme health, and a
weekly trend.

**Stack:** Next.js 14 (App Router) · TypeScript · PostgreSQL · OpenAI (optional — full mock mode included)

---

## The pipeline

```
feedback text
    │
    ▼
┌──────────────────┐  ALWAYS local: script ranges (Bengali, Japanese)
│ 1. DETECT LANGUAGE│  are unambiguous from Unicode; Latin languages use
└─────────┐────────┘  stopword voting. Paying an LLM for this is waste.
          ▼
┌──────────────────┐  mock: phrasebook (exact) or explicit passthrough
│ 2. TRANSLATE      │  real: gpt-4o-mini — ONE combined call also returns
└─────────┐────────┘  sentiment + themes (one round trip, not three)
          ▼
┌──────────────────┐  weighted lexicons + negation window + intensifiers;
│ 3. SENTIMENT      │  multilingual micro-lexicons score untranslated text
└─────────┐────────┘  (bn/ja are substring-matched — no spaces to split)
          ▼
┌──────────────────┐  FIXED taxonomy: pricing, performance, bugs, sync,
│ 4. THEMES         │  ux, features, support, onboarding (+ general).
└─────────┐────────┘  One item can carry several themes.
          ▼
     Postgres → dashboard (feed · insights · weekly trend)
```

## Design

- **Fixed taxonomy over open clustering.** “Cluster whatever you find” yields
  different themes every run — you can't chart a trend against a moving
  target. A fixed taxonomy makes weeks, languages, and sources comparable
  apples-to-apples; adding a theme is a one-line change.
- **Detection never uses the LLM.** Bengali and Japanese are unambiguous from
  Unicode script ranges alone; Latin languages fall to stopword voting with an
  English default. Free, instant, deterministic.
- **One combined LLM call, not three.** In real mode, translation + sentiment
  + themes come back in a single gpt-4o-mini JSON response — a third of the
  latency and cost of chaining three calls.
- **Graceful degradation, not fail-closed.** If the LLM call fails, the item
  is analyzed by the deterministic mock engines and the trace says so.
  Contrast with a moderation pipeline (which must fail CLOSED): analytics
  should degrade to cruder numbers, never drop feedback on the floor.
  Different domain ⇒ different failure policy.
- **Honest mock translation.** A keyword table can't fake real machine
  translation, so mock mode doesn't pretend: known corpus → phrasebook;
  unknown text → explicit *passthrough* with a note, and the multilingual
  sentiment micro-lexicons still score the original. The trace never lies
  about what happened.
- **Negation handling.** “not good” flips the term's sign within a 3-token
  window (with `n't` → `not` expansion); French `ne … pas` constructions are
  handled as multi-word substring entries (“ne marche pas”). Intensifiers
  (very / muy / sehr / très / খুব) boost ×1.5.

## Getting started

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL (Neon/Supabase free tier works)
npm run setup                # schema + 31 seeded items across 6 languages
npm run dev                  # http://localhost:3000
```

Seeded sign-ins (password = `SEED_PASSWORD`, default `ChangeMe123!`):

| Email | Role |
| --- | --- |
| `analyst@lumo.test` | Analyst |
| `lead@lumo.test` | Admin |

The public **Submit** tab analyzes anything you paste and renders the full
trace — detection signal, translation mode, every sentiment hit with its
weight/negation/intensifier, and matched theme keywords. Signed-in analysts
get the **Feed** (last 50 analyzed items) and **Insights** (per-language
table, theme health, source split, weekly trend). Demo script:
`samples/walkthrough.md`; paste-ready snippets: `samples/sample-feedback.md`.

## Mock vs real mode

| Stage | Mock (no key) | Real (`OPENAI_API_KEY` set) |
| --- | --- | --- |
| Detection | Script ranges + stopwords | Same (always local) |
| Translation | Phrasebook / explicit passthrough | gpt-4o-mini |
| Sentiment | Weighted lexicons, negation, intensifiers | gpt-4o-mini (same combined call) |
| Themes | Keyword taxonomy (incl. native keywords) | gpt-4o-mini, constrained to the taxonomy |
| Determinism | Same input → same numbers, every run | Model-dependent |
| Failure | n/a | Falls back to mock engines, noted in trace |

## API surface

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/feedback` | POST | public¹ | Analyze one item → full trace |
| `/api/feedback` | GET | analyst | Last 50 analyzed items |
| `/api/insights` | GET | analyst | Totals, per-language/theme/source, weekly trend |
| `/api/auth` | GET/POST/DELETE | — | Analyst session |

¹ Public for the demo; production would put user auth or a service key in front.

## Edge cases handled

| Case | Behavior |
| --- | --- |
| “not good” / “never works” | Negation window flips the term's contribution |
| French “ne marche pas” | Multi-word lexicon entry — token windows can't catch split negation |
| Bengali/Japanese tokenization | Substring matching — these scripts don't split on spaces |
| “খুব ভালো” vs “ভালো” | Longest-match-first — the stronger phrase suppresses the weaker term |
| Mixed sentiment (“love it, but pricey”) | Weights sum toward neutral — by design, not a bug |
| Unknown language / emoji-only | `unknown` + neutral, flagged in the trace instead of guessed |
| Text not in the mock phrasebook | Explicit passthrough + micro-lexicon scoring, honest note in trace |
| LLM failure in real mode | Falls back to mock engines, recorded in the trace |
| Prompt injection in feedback | LLM prompt instructs treating text as data; mock engines immune by construction |
| One item, many themes | Counts toward each — `jsonb_array_elements` unnests in the theme rollup |
| Sign-in probing | No-enumeration: identical 401 for wrong email or wrong password |
| Oversized input | 400 with a clear message (2000-char cap) |

## Known limitations (deliberate)

- Lexicon sentiment misses sarcasm and idiom (“great, it crashed again”) —
  real mode handles this; the mock exists for determinism and zero-cost demos.
- The phrasebook only covers the shipped corpus — that's the honest boundary
  of mock translation, stated in the trace.
- Language detection defaults Latin-script ambiguity to English; short texts
  (“ok”) are genuinely ambiguous.
- CJK-only text is assumed Japanese for the demo; production adds a
  Chinese/Korean disambiguation pass.
- No near-duplicate collapsing across sources (the same tweet pasted from two
  channels counts twice).

## Deploying

- **Vercel** — import the repo, set `DATABASE_URL` (+ `OPENAI_API_KEY` for real mode).
- **Neon / Supabase** — free Postgres; run `npm run setup` once against it.
