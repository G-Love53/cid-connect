# Deploy CID Connect

**Default workflow:** develop **locally** (`npm run dev`), then **`git push`** to GitHub. No extra platform required.

```bash
cp .env.example .env   # once — fill VITE_* from Famous
npm install
npm run dev
# … edit …
git add -A && git commit -m "..." && git push origin main
```

GitHub Actions **CI** runs a build on push to `main` (sanity check).

---

## Optional: Netlify (or Vercel / Cloudflare Pages)

**Netlify only serves URLs and static assets** (built JS/CSS + HTML). It does **not** replace Famous (DB/Edge) or Render (CID-PDF-API). Connect the repo to Netlify only if you want a **public URL** without running `npm run dev`.

1. Import **`G-Love53/cid-connect`** / **`main`**.
2. Env: **`VITE_SUPABASE_URL`**, **`VITE_SUPABASE_ANON_KEY`** (same as local `.env`).
3. Repo **`netlify.toml`** has build + SPA redirect.

---

## Optional: Famous deploypad

If you still publish previews from **Famous**, that’s separate from Git — **GitHub remains the code source of truth**; avoid editing only in Famous without pulling into this repo.

---

## Bind Token Onboarding Deploy Checklist

Use this when deploying bind-link onboarding updates to Famous.

1. Pull latest `main` from Git before any dashboard edits.
2. Deploy edge function from Git source:
   - `reference/functions/redeem-bind-token/index.ts`
   - Function name: `redeem-bind-token`
3. Run migrations in SQL Editor:
   - `reference/migrations/003_policy_bind_tokens.sql`
   - `reference/migrations/004_profiles_onboarding_completed.sql`
4. Verify secrets used by `redeem-bind-token`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Run smoke test runbook:
   - `reference/docs/BIND_TOKEN_SMOKE_TEST.md`

### Segment scope

Bind-token onboarding is segment-agnostic. It links by `policy_id`, so it works across all current segments as long as the policy row exists.
