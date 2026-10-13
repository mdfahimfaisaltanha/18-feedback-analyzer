# Paste-ready sample feedback (with expected mock-mode results)

All multilingual snippets below are in the mock phrasebook, so they translate
exactly in mock mode. Scores are from the deterministic lexicon engine.

## English

| Text | Expected |
| --- | --- |
| `Love the new dark mode, absolutely beautiful!` | positive · ux |
| `The app keeps crashing when I attach large images.` | negative · bugs |
| `This is not good, sync failed again.` | negative — **negation demo**: “not” flips “good” |
| `Search is fast but tags are confusing to organize.` | ≈ neutral · features + ux — mixed sentiment sums out |

## Spanish 🇪🇸

| Text | Expected |
| --- | --- |
| `Me encanta la aplicación, pero el precio es demasiado alto para estudiantes.` | ≈ neutral (love + pricing complaint) · pricing |
| `La sincronización no funciona y he perdido mis notas dos veces.` | negative · sync, bugs |
| `Muy buena aplicación, la uso todos los días para mis clases.` | positive |
| `El modo oscuro es precioso, gracias por escucharnos.` | positive · ux |

## German 🇩🇪

| Text | Expected |
| --- | --- |
| `Die App ist sehr langsam geworden nach dem letzten Update.` | negative · performance |
| `Der Support hat mir schnell geholfen, sehr freundlich!` | positive · support |
| `Zu teuer für das, was es bietet. Ich kündige mein Abo.` | negative · pricing |

## French 🇫🇷

| Text | Expected |
| --- | --- |
| `L'application plante à chaque fois que j'ouvre une grande note.` | negative · bugs |
| `Très bonne expérience, l'interface est belle et simple.` | positive · ux |
| `Le mode hors ligne ne marche pas, c'est frustrant.` | negative · sync — **“ne marche pas” multi-word negation** |

## Bengali 🇧🇩

| Text | Expected |
| --- | --- |
| `অ্যাপটা খুব ভালো, কিন্তু দাম একটু বেশি।` | positive-leaning · pricing |
| `সিঙ্ক কাজ করছে না, আমার নোট হারিয়ে গেছে।` | negative · sync |
| `সাপোর্ট টিম খুব দ্রুত সাহায্য করেছে, ধন্যবাদ।` | positive · support |

## Japanese 🇯🇵

| Text | Expected |
| --- | --- |
| `このアプリが大好きです。毎日使っています。` | positive |
| `同期が遅すぎます。改善してください。` | negative · sync + performance |
| `料金が高すぎると思います。学生割引がほしいです。` | negative · pricing |

## Passthrough demo (mock-mode honesty)

Paste any Spanish/German/French sentence **not** listed above, e.g.

```
La última versión tiene muchos errores y falla al abrir.
```

→ detection still says Spanish, translation shows *passthrough* with an
explicit note, and the Spanish micro-lexicon still scores it negative
(`error`, `falla`). The pipeline degrades gracefully instead of pretending.
