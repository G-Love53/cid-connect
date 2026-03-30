# Deploy CID Connect (Git is source of truth)

**Famous does not need to hold the only copy of frontend code.** Push to **GitHub**, deploy from there.

## Netlify (recommended)

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project** → **GitHub** → repo **`G-Love53/cid-connect`**, branch **`main`**.
2. Build settings (also in repo **`netlify.toml`**):
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment variables** (Site → Environment variables):
   - `VITE_SUPABASE_URL` — from Famous / Database (e.g. `*.databasepad.com`)
   - `VITE_SUPABASE_ANON_KEY` — anon/public key (same as used in browser)
4. Trigger deploy. Production URL will be something like `https://xxx.netlify.app`.

## Local dev after pulling repo

```bash
cp .env.example .env
# Edit .env — paste URL + anon key from Famous (never commit .env)
npm install && npm run dev
```

## CI

GitHub Actions **CI** runs `npm ci` + `npm run build` on every push to `main` (uses dummy env only to verify the build compiles).
