# Put Sprite Squad on the internet

Two free pieces:

1. **Hosting** — so teammates open a normal `https://…` link on phone/PC  
2. **Supabase** — so everyone shares the **same** squad collection (live rooms)

Without Supabase, the site still works, but each browser keeps its own local data.

---

## 1. Create the free cloud database (Supabase) — ~5 minutes

1. Sign up at [supabase.com](https://supabase.com) and **New project**.
2. Wait until the project is ready.
3. Open **SQL Editor** → **New query**.
4. Paste everything from [`supabase/schema.sql`](./supabase/schema.sql) → **Run**.
5. Open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`  
     Use only the host, e.g. `https://xxxx.supabase.co`  
     **Do not** append `/rest/v1/` (that causes “Invalid path specified in request URL”).
   - **anon public** key (or the new **publishable** key) → `VITE_SUPABASE_ANON_KEY`

Local test (optional):

```bash
copy .env.example .env.local
# edit .env.local with your URL + anon key
npm run dev
```

---

## 2. Deploy the website (pick one)

### Option A — Vercel (recommended)

1. Push this folder to a GitHub repo (or use Vercel CLI).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework: **Vite** (auto-detected).
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

Your link looks like: `https://sprite-squad-xxx.vercel.app`

CLI alternative (logged into Vercel):

```bash
npx vercel
# then set env vars in the Vercel dashboard and redeploy
npx vercel --prod
```

### Option B — Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → import repo  
   or drag the `dist` folder after `npm run build`.
2. Build command: `npm run build`  
   Publish directory: `dist`
3. Site settings → **Environment variables** → same two `VITE_*` keys.
4. Trigger a redeploy after adding env vars.

`netlify.toml` is already in the repo.

### Option C — Tonight only (your PC as the host)

Good for a single session if you do not want to deploy yet:

```bash
npm run dev -- --host
```

Then use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or [ngrok](https://ngrok.com/):

```bash
# example with cloudflared (if installed)
cloudflared tunnel --url http://localhost:5173
```

Share the generated HTTPS URL. Data is still local unless Supabase env is set.

---

## 3. Invite teammates

1. Open the live site.
2. **Squad → Create room** (uses your current player list / progress).
3. **Copy share link** → Discord / WhatsApp / etc.
4. Teammates open the link → they are in the same room automatically (`?room=ABC123`).
5. Anyone can update collections; others see changes within about a second.

They can also type the **room code** under Squad → Join.

---

## 4. Optional login (email, Google, Discord)

Login is **optional**. Guests can still use rooms by code. Signed-in users keep a **portable collection** across squads and see **recent squads**.

### 4a. Re-run schema

In Supabase **SQL Editor**, run the full updated [`supabase/schema.sql`](./supabase/schema.sql) again (safe to re-run). This adds `profiles`, `user_collections`, `user_squads`, and optional `squad_rooms.name`.

### 4b. Auth URLs

Supabase → **Authentication → URL configuration**:

- **Site URL:** your production site, e.g. `https://sprites-amber.vercel.app`
- **Redirect URLs:** add:
  - `https://sprites-amber.vercel.app/**`
  - `http://localhost:5173/**`
  - Supabase callback (already default): `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### 4c. Email / password

Supabase → **Authentication → Providers → Email**: enable.  
Optional: turn off “Confirm email” for easier private-squad signup, or leave it on for production.

### 4d. Google

1. Google Cloud Console → OAuth client (Web).
2. Authorized redirect URI must be exactly:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Providers → Google** → enable.
4. Paste **Client ID** and **Client Secret** into Supabase only.

**Never put the Google Client Secret in the Vite app, `.env` frontend files, or git.**  
If a secret was pasted into chat or a commit, rotate it in Google Cloud.

### 4e. Discord

1. Discord Developer Portal → OAuth2.
2. Redirects must include **exactly**:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   (not the Vercel app URL — Supabase receives Discord, then sends the user back to the app).
3. Supabase → **Authentication → Providers → Discord** → enable with **Client ID** + **Client Secret**.
4. Site URL / redirect allow list must include your app origin (e.g. `https://sprites-amber.vercel.app/**`).

Note: Discord’s “Public Key” is for bot interactions, **not** OAuth. Use the OAuth2 **Client Secret** from Discord.

If Discord “authorizes” but you land logged out, check the address bar for `?error=` / `error_description=` (wrong secret or redirect). The app now surfaces that message and completes the PKCE `code` exchange on return.

### 4f. App behavior when signed in

- Collection updates for **your** player slot also save to `user_collections`.
- Joining another room re-applies that collection to your slot.
- Creating a room can set an optional **squad name**.
- Recent rooms appear under Squad when signed in.

---

## Security note

Room codes are the access control for squad rooms (anyone with the link/code can edit).  
That is fine for a private Fortnite squad. Do not put passwords or personal data in the app.

**OAuth client secrets** belong only in the Supabase dashboard (server-side). They must not appear in the frontend bundle.

---

## Checklist

- [ ] Supabase project created  
- [ ] `schema.sql` executed (including auth tables)  
- [ ] Site deployed with both env vars  
- [ ] Create room + share link works on a second phone  
- [ ] (Optional) Email / Google / Discord providers configured in Supabase  
- [ ] Redirect URLs include production + localhost  

