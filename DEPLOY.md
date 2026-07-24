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
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

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

## Security note

Room codes are the access control (anyone with the link/code can edit).  
That is fine for a private Fortnite squad. Do not put passwords or personal data in the app.

---

## Checklist

- [ ] Supabase project created  
- [ ] `schema.sql` executed  
- [ ] Site deployed with both env vars  
- [ ] Create room + share link works on a second phone  
