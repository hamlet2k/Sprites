# Sprite Squad

Local-first Fortnite **Chapter 7 Season 3** squad tool for tracking Sprite collections and planning who brings what for trades / extractions.

Optional **accounts** (email, Google, Discord via Supabase Auth) keep your personal collection across squads. Login is never required to use the app.

**Unofficial fan tool.** Not affiliated with, endorsed by, or connected to Epic Games in any way. Fortnite names, assets, and game data belong to Epic Games / their respective owners. This project is free and open source ([MIT](./LICENSE)).

## Support / donations

Sprite Squad is **completely free**. There are no paywalls and no exclusive features.

If you like the tool and want to support optional development costs (hosting, coffee, spare time), you can tip on Ko-fi — **only if you want to**:

**[ko-fi.com/hamlet2k](https://ko-fi.com/hamlet2k)**

Donations never unlock anything in the app.

## Features

- **Per-player collection** for all live sprite combinations (families × variants; catalog in `src/data/sprites.ts`)
- Quick in-game updates: tap to toggle **Ready ↔ Lost** (Missing first becomes Ready); **✕** marks Missing
- Reorder squad members on the Squad tab (Collection chips follow that order)
- **Mastered** crown toggle (extracted at Level 5)
- **Suggest** plan for the players in the next match:
  - Prioritizes hard-to-find sprites
  - Prefers **Ready** (no Sprite Dust) over **Lost** (repurchase)
  - Suggests **repurchase** when only a lost copy can fill a squad mate’s gap
  - Clear **who brings → who receives**
  - Falls back to **mastery leveling** when a player has no useful trade
  - Per round: if exchanges would be **only** lost-restores (no Missing fills), use
    **mastery / hunt** instead to avoid endless Lost↔Ready thrash

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Progress is stored in the browser (`localStorage`). Use **Squad → Export / Import JSON** to back up or share.

## Share with teammates on the internet

Yes — deploy the site + enable a free Supabase room so everyone edits the same collection.

See **[DEPLOY.md](./DEPLOY.md)** for the full walkthrough (Vercel/Netlify + room codes).

Short version:

1. Create a free [Supabase](https://supabase.com) project and run `supabase/schema.sql`
2. Deploy to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) with:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. In the app: **Squad → Create room → Copy share link**

## Data notes

Catalog compiled from community sources (fortnite.gg, IGN, Fortnite Wiki) as of **2026-07-24**. Epic adds sprites/variants weekly (New Sprite Day / Thursdays); update `src/data/sprites.ts` when new ones ship.

### Variant bonuses (summary)

| Variant  | Extra effect                                      |
|----------|---------------------------------------------------|
| Gold     | Bonus XP from eliminations                        |
| Gummy    | Bonus Sprite Dust on extraction                   |
| Galaxy   | Bonus ammo when looting                           |
| Holofoil | Better chance at rare sprite variants (squad)     |
| Cube     | Storm Overdrive / extra shield on level-up        |

### Status meanings

| Status    | Meaning                                              |
|-----------|------------------------------------------------------|
| Missing   | Never extracted into collection                      |
| Ready     | In collection and available to equip (no dust)       |
| Lost      | Was in collection / needs Sprite Dust to re-summon   |
| ★ Mastered| Extracted at max Level 5 (permanent mastery flag)    |
