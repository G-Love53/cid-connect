# Deploy CID Connect

**What this doc covers:** shipping the **Connect** SPA (Vite/React) — local dev, static hosting (e.g. Netlify), **environment variables**, and **per-segment** wiring to **CID-PDF-API** via **`app_settings`**. It applies to **all current and future segments** (Bar, Roofer, Plumber, HVAC, …) until the repo’s architecture changes.

**What this doc does not cover:** deploying **CID-PDF-API** (`pdf-backend` on Render), segment **landing** sites (Netlify per vertical), or **migrations** on **Render Postgres** — those live in **`pdf-backend`** / **CID-docs**. Connect never receives **service-role** or **provider** secrets in the browser.

---

## Source of truth

| Layer | Source of truth |
|--------|-----------------|
| Connect **frontend** code | **This repo** — Cursor + `git push` |
| Connect **runtime config** (public) | Host env: **`VITE_*`** only |
| **Segment → API base URL** | Famous **`app_settings`** rows `segment_backend_<segment>` (see below) |
| **Auth / DB for Connect app** | Famous (Supabase-compatible) — URL + **anon** key in the client |

---

## Environment variables

Set these wherever the **built** app runs (Netlify **Site settings → Environment variables**, Vercel, Cloudflare Pages, etc.) and in **local** `.env` (from **`.env.example`**).

| Variable | Required | Purpose |
|----------|----------|---------|
| **`VITE_SUPABASE_URL`** | Yes | Famous / DatabasePad project URL (browser-safe). |
| **`VITE_SUPABASE_ANON_KEY`** | Yes | **Anon** key only — never the service role. |
| **`VITE_SITE_URL`** | Optional | Canonical public origin for password reset / magic links (e.g. `https://your-connect.netlify.app`). If unset, the browser origin is used; Auth redirect allowlist must still match. |
| **`VITE_CID_API_URL`** | Optional but **recommended** for production | Base URL of **CID-PDF-API** (no trailing slash), e.g. `https://cid-pdf-api.onrender.com`. When set, **insured** policy/quote/doc/claim/COI/KB/chat traffic uses **`/api/connect/*`** on that host (**`X-User-Email`** / **`X-User-Id`**). **Segment actions** (COI/claim `fetch` to segment backends) still resolve via **`app_settings`** `segment_backend_*` (see below). |

**Security:** If a key name contains `SERVICE_ROLE`, `SECRET`, or provider tokens, it must **not** appear in Connect env or any client bundle. See **`docs/ARCHITECTURE.md`**.

---

## Local development

```bash
cp .env.example .env   # once — fill VITE_* from Famous project settings
npm install
npm run dev
```

Build sanity check:

```bash
npm run build
```

---

## CI

GitHub Actions runs a **build** on push to **`main`** (sanity check). Failing CI blocks nothing automatically unless you add branch protection; treat a green build as the minimum bar before tagging releases.

---

## Static hosting: Netlify (or Vercel / Cloudflare Pages)

The host **only serves** built HTML/JS/CSS. It does **not** host the database or CID-PDF-API.

1. Connect the **GitHub repo** that holds this app (e.g. **`main`** branch).
2. Set **Environment variables** to match local **`.env`** (**`VITE_SUPABASE_URL`**, **`VITE_SUPABASE_ANON_KEY`**, optional **`VITE_SITE_URL`**, and **`VITE_CID_API_URL`** when using the **cid-postgres** bridge).
3. **`netlify.toml`** in this repo defines **`npm run build`**, publish **`dist`**, **Node 20**, SPA **`/*` → `/index.html`**, and cache headers via **`public/_headers`**.

After first deploy, configure **Auth** (Site URL, redirect allowlist, optional SMTP): **`docs/database_AUTH_CONFIG.md`**.

---

## Segment backends (all segments — future-proof)

Connect resolves **which host** to call for segment-scoped **API actions** (COI, claims, renewals, coverage analysis, etc.) from the **`app_settings`** table in the **Famous** project:

| Key pattern | Value |
|-------------|--------|
| **`segment_backend_<segment>`** | Base URL of **CID-PDF-API** for that vertical, e.g. `https://cid-pdf-api.onrender.com` |

- **`<segment>`** is **lowercase** in the key: `segment_backend_bar`, `segment_backend_plumber`, `segment_backend_roofer`, `segment_backend_hvac`, etc.
- The app maps policy/flow **segment** strings to these keys (see **`src/api.ts`** — `getSegmentBackendMap`, **`getBaseUrl`**).
- URLs are **cached ~5 minutes** in the client after fetch; after changing **`app_settings`**, wait or reload — or call **`clearSegmentBackendCache()`** if you add a dev-only refresh later.

**When adding a new segment (Connect checklist):**

1. Ensure **CID-PDF-API** accepts that **`segment`** in JSON and is deployed ( **`pdf-backend`** / **CID-docs** deploy guides).
2. Insert **`app_settings`** row: **`segment_backend_<newsegment>`** → same **CID-PDF-API** origin you use for other segments (RSS: **one** operator API, **`segment`** in body).
3. Smoke-test at least one **fetch** path (e.g. coverage analysis or COI) for a policy whose **`segment`** matches.
4. Intake **landing** sites (segment Netlify) post to the **same** API host — that is separate from this repo but must stay aligned.

---

## Optional: Famous deploypad

Previews or experiments published from **Famous** are **not** a substitute for **GitHub** as the canonical frontend source. Avoid editing only in Famous without merging into this repo.

---

## Bind-token onboarding deploy checklist

Use when deploying **bind-link** onboarding updates to Famous.

1. Pull latest **`main`** from Git before dashboard edits.
2. Deploy Edge Function from Git source: **`reference/functions/redeem-bind-token/index.ts`** — function name **`redeem-bind-token`**.
3. Run migrations in SQL Editor:
   - **`reference/migrations/003_policy_bind_tokens.sql`**
   - **`reference/migrations/004_profiles_onboarding_completed.sql`**
4. Edge Function secrets (runtime — **Supabase standard names**):
   - **`SUPABASE_URL`**
   - **`SUPABASE_SERVICE_ROLE_KEY`**  
   The function reads **`SUPABASE_*`** only — see **`reference/functions/redeem-bind-token/index.ts`**.
5. Smoke test: **`reference/docs/BIND_TOKEN_SMOKE_TEST.md`**.

### Segment scope

Bind-token onboarding is **segment-agnostic**: it links by **`policy_id`**. It works for **every** segment once a policy row exists for the user.

---

## Outbound email & deliverability (campaigns — RSS)

**Connect** does not send segment **acquisition** campaigns; those run on your ESP (e.g. Instantly) from **segment vertical domains**. For **reliable** inbox placement and **audit-ready** DNS monitoring:

- Add each **sending domain** to [Google Postmaster Tools](https://postmaster.google.com/) and verify ownership.
- Keep **SPF / DKIM / DMARC** on those domains aligned with the **From** identity your ESP uses (same guidance as operator `quotes@` mail — see **`pdf-backend/docs/Deploy_Guide.md`** → *Email infrastructure* and *Postmaster Tools*).

CTAs in campaigns should still point at **canonical** segment intake + **CID Connect** URLs (see product marketing handoff), not undocumented hosts.

---

## See also

| Doc | Use |
|-----|-----|
| **`docs/ARCHITECTURE.md`** | Famous vs Render **`DATABASE_URL`**; target vs shipped policy reads; pipeline vs Connect tables. |
| **`docs/database_AUTH_CONFIG.md`** | Site URL, redirect allowlist, optional SMTP (Management API examples). |
| **`docs/WORKFLOW_HANDOFF.md`** | Famous ↔ Cursor handoff, smoke runbooks, Gmail/poller DB notes. |
| **`docs/STAGING_INTEGRATION_TEST_PLAN_DRAFT.md`** | Staging **quote → bind → policy → Connect** checklist. |
| **`pdf-backend/docs/Deploy_Guide.md`** (sibling repo) | Postmaster, Gmail auth, **S5** client email checks, GitHub heartbeat vs **CID-PDF-API** `/healthz`. |
