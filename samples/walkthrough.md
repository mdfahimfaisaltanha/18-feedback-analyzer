# 5-minute demo walkthrough

Run `npm run setup` then `npm run dev`, open http://localhost:3000.

## 1. Watch the pipeline show its work (Submit tab, no login)

Submit these and read the trace card each time:

1. `Love the new dark mode, absolutely beautiful!`
   → English detected · no translation needed · every sentiment hit listed
   with its weight · theme **ux** with the matched keywords.
2. `This is not good, sync failed again.`
   → the **negation demo**: “good” appears with *negated* next to it and a
   flipped negative contribution.
3. `La sincronización no funciona y he perdido mis notas dos veces.`
   → Spanish detected by stopword voting (the trace names the signal) ·
   phrasebook translation · negative · themes **sync + bugs**.
4. `সিঙ্ক কাজ করছে না, আমার নোট হারিয়ে গেছে।`
   → Bengali detected from script alone (98% confidence) · translated ·
   negative via substring-matched Bengali phrases.
5. `La última versión tiene muchos errores y falla al abrir.`
   → the **honesty demo**: not in the phrasebook → explicit *passthrough*
   note, yet still scored negative by the Spanish micro-lexicon.

## 2. Read the dashboard like a product owner

**Analyst sign-in** → `analyst@lumo.test` / your `SEED_PASSWORD` (default `ChangeMe123!`).

- **📊 Insights**: the seeded story is deliberate — **sync** and **bugs** are
  the unhappiest themes (that's your roadmap), **support** is the happiest
  (that's your retention asset). The per-language table shows German and
  Japanese users skewing negative on **pricing** — a localization-pricing
  question, visible only because feedback was unified across languages.
- **Weekly trend**: bar height = volume, number = average sentiment, red =
  negative week.
- **📥 Feed**: last 50 items with original + translation side by side — the
  analyst never needs to speak six languages.

## 3. The taxonomy argument (30 seconds)

Open `lib/themes.ts`: the taxonomy is fixed and each theme carries native
keywords for passthrough mode. Adding a theme is one line — and because the
taxonomy is stable, every chart stays comparable week over week. That's the
trade against open-ended clustering, and it's a deliberate one.

## 4. Real mode (optional)

Set `OPENAI_API_KEY` in `.env.local`, restart, and resubmit snippet 5 — the
passthrough becomes a real translation (`llm` mode), sentiment comes from the
same single combined call, and the trace records the engine change.
