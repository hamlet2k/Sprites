# Sprite Squad

Local-first web app for Fortnite **Chapter 7 Season 3** squads: track Sprite collections and plan who brings what for trades / extractions.

**Live app:** [sprites-amber.vercel.app](https://sprites-amber.vercel.app)  
**Source:** [github.com/hamlet2k/Sprites](https://github.com/hamlet2k/Sprites)

**Unofficial fan tool.** Not affiliated with, endorsed by, or connected to Epic Games in any way. Fortnite names, assets, and game data belong to Epic Games / their respective owners. This project is free and open source ([MIT](./LICENSE)).

## Features

- **Per-seat collection** for live sprite families × variants (catalog: `src/data/sprites.ts`)
- **Forced seat** on each device — only *your* seat is editable; others are view-only
- Status: **Missing / Ready / Lost** + **Mastered** (Level 5 crown)
- Quick filters: status row + in-game presets (**Need** = Missing+Lost, **Level up**)
- **Exchange plans** (Focus Completion / Focus Parity) with Confirm / Lost / Ignore after the match
- Optional **live rooms** (Supabase) so the squad shares one list
- Optional **accounts** (email, Google, Discord) for portable collection + recent squads
- **EN / ES** UI; catalog names stay English as in-game
- **Installable PWA** — Add to Home Screen / install from browser for a standalone app feel (works offline for the app shell; live rooms still need network)

Login is never required. Donations never unlock features.

## Support / donations

Sprite Squad is **completely free** — no paywalls, no exclusive features.

Optional tip (hosting / coffee / spare time):

**[ko-fi.com/hamlet2k](https://ko-fi.com/hamlet2k)**

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Progress is stored in the browser (`localStorage`). Use **Squad → Export / Import** to back up or move data.

```bash
npm run build   # production build (includes service worker + web manifest)
npm run lint
npm run icons   # regenerate PWA icons in public/
```

### Install as an app (PWA)

After deploy (HTTPS):

- **Android / Chrome / Edge:** browser menu → **Install app** / **Add to Home screen**
- **iPhone / iPad (Safari):** Share → **Add to Home Screen**

The service worker caches the app shell and sprite icons for quicker reloads. Collections still live in `localStorage` on that device.

## Share with teammates

Deploy the site and enable Supabase rooms so everyone edits the same collection.

Full walkthrough: **[DEPLOY.md](./DEPLOY.md)** (hosting, schema, auth providers).

Short version:

1. Free [Supabase](https://supabase.com) project → run `supabase/schema.sql`
2. Deploy to [Vercel](https://vercel.com) / [Netlify](https://netlify.com) with:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. In the app: **Squad → Start session → Copy share link**

Never put OAuth client secrets in frontend env vars — only in the Supabase dashboard.

## Status meanings

| Status | Meaning |
|--------|---------|
| Missing | Never collected |
| Ready | In collection, can bring without dust |
| Lost | Needs Sprite Dust to re-summon before bring |
| Mastered | Extracted at Level 5 (independent flag) |

## Data notes

Catalog from community sources (e.g. fortnite.gg). Epic may add sprites/variants during the season — update `src/data/sprites.ts` when new ones ship.

## License

[MIT](./LICENSE) © hamlet2k
