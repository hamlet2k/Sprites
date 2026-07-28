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
| `src/lib/cloud.ts` | Supabase rooms, hydrate/push, wipe protection, stale-revision guards |
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

**Confirm (success):** recipient → Ready; bringer → Lost.  
**Failed (died / lost before extract):** bringer → Lost only; recipient unchanged.  
**Ignore (forgot to bring):** no collection changes; row just cleared.  

Plan + outcomes live on `SquadState.suggestion` so **live rooms** sync greying for every teammate.

**Room revision rule:** only a client at the current `state.revision` may push the next one. Stale idle tabs must **adopt** a higher remote revision — never overwrite it with an old plan (see `pushRoom` stale + CAS filter).

## Suggestion rules (current behavior)

Implemented in `src/lib/suggest.ts`:

Two engine modes (UI toggle on Suggest; stored in `localStorage` + `suggestion.mode` when a plan is generated):

### `completion` (default) — complete squad fastest
1. Each round **maximizes Missing fills** under 1-give / 1-receive.
2. Prefer **Ready** before repurchase; Missing before Lost restores.
3. **Rarity is only a tiny tie-break**. Unfair paths OK if they complete more.
4. Pure lost-restore thrash → mastery / hunt.

### `fair` — 100% fair trades
1. **Mutual 2-cycles first** (A↔B).
2. **Cumulative debt** (gives − receives): prefer gifting to net givers.
3. Missing before Lost; Ready before repurchase; rarity stronger for “cool” picks.
4. Pure lost-restore thrash → mastery / hunt.

Shared: up to **4** rounds; repurchase-to-fill-Missing allowed; Confirm / Failed / Ignore.

After the match: individual or round-level **Confirm** / **Failed** / **Ignore** — modals, not `window.confirm`/`alert`.

Apply with `applyExchangeRound(state, items, mode)` where `mode` is `'success' | 'failed' | 'ignored'`, then write outcomes into `state.suggestion` and push the room so all clients update.

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
