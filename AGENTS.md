# Sprite Squad — Grok Build project context

Read this file when starting or resuming work on this repo. It keeps sessions on different machines aligned without relying on chat history.

## What this product is

**Sprite Squad** is a small local-first web app for a Fortnite **Chapter 7 Season 3** squad:

- Track **Sprite** ownership per player (Missing / Ready / Lost + Mastered).
- Generate a **bring / gift plan** for the next match (who brings what → who receives).
- Optional **live room** sync via Supabase so teammates share one collection.
- **Not** a game mod — lobby / between-match utility only.

Repo: `https://github.com/hamlet2k/Sprites`  
Owner GitHub: `hamlet2k`  
Production (Vercel): `https://sprites-amber.vercel.app`  
Vercel project: `sprites` under team `hamlet2ks-projects`  
Git: push to **`main`** auto-deploys production (GitHub integration).

## Stack

- React 19 + TypeScript + Vite 8
- Supabase JS (optional cloud rooms)
- Lint: oxlint
- Deploy: Vercel (primary); Netlify config also present
- i18n: English + Spanish (`src/i18n/`)

### Local commands

```bash
npm install
npm run dev      # usually http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint
```

Env (optional cloud): see `.env.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Schema: `supabase/schema.sql`. Deploy notes: `DEPLOY.md`.

## Layout (important paths)

| Path | Role |
|------|------|
| `src/App.tsx` | UI tabs: Collection, Suggest, Squad, Help; modals; rooms |
| `src/App.css` | Styles (including help guide, cards, modals) |
| `src/lib/suggest.ts` | Suggestion / matching engine |
| `src/lib/cycle.ts` | Card status cycle + mark missing / mastered |
| `src/lib/storage.ts` | localStorage squad + player export/import |
| `src/lib/cloud.ts` | Supabase rooms, hydrate/push, wipe protection |
| `src/lib/squadScore.ts` | Sparse overwrite / room wipe guards |
| `src/data/sprites.ts` | C7S3 catalog (names/abilities stay EN as game data) |
| `src/i18n/` | `en.ts`, `es.ts`, `catalog.ts`, `I18nProvider` |
| `src/types.ts` | `Player`, `SquadState`, `BringAssignment`, etc. |

Persistence key: `fortnite-sprite-squad-v1` (localStorage). Locale: `fortnite-sprite-squad-locale`. Room code: `fortnite-sprite-squad-room-v1`.

## Domain model (keep these meanings)

| Status | Code | Meaning |
|--------|------|---------|
| Missing | `none` | Never collected |
| Ready | `available` | In collection, can bring without dust |
| Lost | `lost` | Needs Sprite Dust re-summon before bring |
| Mastered | `mastered` flag | Extracted at Level 5 (independent toggle) |

**Card tap:** Missing → Ready, then Ready ↔ Lost. **Crossed-circle** sets Missing. **Crown** toggles Mastered.

**Confirm exchange (success):** recipient → Ready; bringer → Lost for that sprite.  
**Failed exchange (died / lost before extract):** bringer → Lost only; recipient unchanged.

## Suggestion rules (current behavior)

Implemented in `src/lib/suggest.ts`:

1. Prefer filling **Missing** over **Lost restores**.
2. Prefer giver **Ready** inventory over **Lost** (repurchase).
3. **Hard 1:1 per round:** each active player gives ≤1 and receives ≤1 (no unbalanced double-gift). Multiple fair passes form cycles (A→B→C→A).
4. Up to **4** bring slots per player (rounds 1–4).
5. **Pure lost-restore rounds** (all exchanges are restore-only, no Missing fills): drop those trades and assign **mastery / hunt** instead (anti thrash).
6. **Mixed** missing + restore in one round: keep both (fairness).
7. Repurchase-to-fill-Missing is allowed (collaborative).

After the match: individual or round-level **Confirm** (success) and **Failed** (lost before extract) — modals, not `window.confirm`/`alert`.

Apply with `applyExchangeRound(state, items, mode)` where `mode` is `'success' | 'failed'`, using **`stateRef.current`** (not side effects inside `setState`).

## User preferences (this project)

- **Always commit + push to `main` after normal feature work** so Vercel redeploys. Do **not** ask “push?” every time.
- Pause only if **risky** (force-push, destructive data ops, secrets, ambiguous intent).
- Help UI is for **end users** (purpose + how-to). Deploy/Supabase ops stay in `DEPLOY.md` / README, not Help.
- UI language: **EN + ES**; Fortnite sprite catalog names/abilities remain English.
- Keep UX mobile-friendly (touch targets, clear labels).

## Session history (this Grok Build thread — high level)

Started fresh (new machine / location); cloned `hamlet2k/Sprites` into workspace. Shipped on `main` (among others):

1. Reorder squad players (↑/↓); collection chips follow order.
2. Status UX: Ready↔Lost tap; Missing via control; crown mastery badge top-left gold.
3. Per-exchange confirm + round remaining confirm; app modals with sprite art.
4. Fixed false “no collections updated” after confirm.
5. Skip pure lost-restore suggestion rounds → mastery/hunt.
6. Fixed 1:1 (removed unbalanced multi-receive; Dero/Fredek/Antequera repro).
7. Color recipient names on suggestion cards.
8. Per-player export/import; delete-player confirm modal; Help rewritten for basic users.
9. Full EN/ES i18n + language selector.
10. Help overhaul (guided layout, plain language EN/ES).

Latest on main when this file was written: see `git log -1`. Prefer **code + this file** over old chat transcripts if they disagree.

## Working agreements for future sessions

1. `git pull` / confirm clean `main` before large work if the machine might be stale.
2. Run `npm run build` after non-trivial TS/UI changes.
3. Touch both `src/i18n/en.ts` and `src/i18n/es.ts` when adding user-visible strings.
4. Suggestion copy for plans uses `buildSuggestionPlan(state, locale)` — regenerate plan after locale change to refresh reason text.
5. Do not invent exploits or attack remote systems; local defensive fixes only.
6. Catalog updates: `src/data/sprites.ts` when Epic ships new sprites/variants.

## Quick “resume elsewhere” checklist

```bash
git clone https://github.com/hamlet2k/Sprites.git   # or pull if already cloned
cd Sprites
npm install
npm run dev
# optional: .env.local with Supabase vars for rooms
```

Open Help in the app for end-user flows. Read this `AGENTS.md` for agent/engineering context. Cloud deploy is automatic on push to `main`.
