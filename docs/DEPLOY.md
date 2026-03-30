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
