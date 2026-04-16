# Architecture — for the next developer

Clean split: **where code lives (Git)** vs **what serves traffic** vs **where data lives**.

## The point (Cursor across platforms)

**Cursor + Git** are the **source of truth for all app code** you open in the workspace: **`pdf-backend`**, segment backends, **`CID_HomeBase`**, **`cid-connect`**, docs. You edit here; **`git push`** is how versions are saved and shared.

**Famous** is **not** “the place we edit Connect forever.” It’s the **runtime** for Connect’s **backend**: DB, Auth, Edge Functions, Storage. The React app **calls** Famous; Famous does **not** need to hold the only copy of the React source.

## Myth vs reality (read this once)

| Wrong | Right |
|--------|--------|
| “Push to Git → **Famous pulls** and deploys the frontend” | Famous **does not** offer that Git sync today. **GitHub `cid-connect`** is updated by **Cursor** + **`git push`**. |
| “Famous AI and Cursor stay in sync through Git automatically” | **No automatic sync.** One-time **export zip from Famous** bootstrapped the repo; **ongoing** work is in **Git/Cursor**. |
| “We need Famous to see Git” | **Runtime only:** the built or dev app uses **env vars** pointing at Famous’s DB. **No** Famous↔Git pull required for that. |

**Optional:** Netlify (or similar) can **build from Git** for a public URL — that’s **not** Famous pulling Git; it’s a static host reading GitHub.

## Roles (one glance)

| Piece | What it does | Where it lives |
|-------|----------------|----------------|
| **This repo (`cid-connect`)** | React app — Connect UI, forms, admin | **GitHub** → you edit in Cursor, run `npm run dev`, `git push` |
| **Famous** | Auth/session, app state, Edge Functions, Storage (e.g. `*.databasepad.com`) | **Famous** dashboard — not a duplicate of this frontend source |
| **cid-postgres** | Canonical insurance data (policies, documents, clients) written by pipeline | Accessed by backend service layer (read-only path for Connect) |
| **Netlify** *(optional)* | **Static hosting only** — public **URL** + serves built HTML/JS (forms hit APIs + Famous) | Connect repo to Netlify if you want a hosted URL; otherwise skip |
| **CID-PDF-API** | Universal ops / intake / `segment` in JSON (**RSS**) | **`pdf-backend`** repo on Render → `cid-pdf-api.onrender.com` |
| **Segment backends** | Quote PDF / render per vertical (plumber, roofer, …) | Separate repos (`plumber-pdf-backend`, …) on Render |

## Netlify in one line

**Netlify does not replace Famous.** It only **serves the built frontend** (and URL) if you connect it to this repo. The app still talks to **Famous** for DB and to **Render** for CID APIs.

## Data bridge (approved target)

- Connect browser uses Famous auth/session context; browser never gets service-role credentials.
- **Canonical insurance data** for the insured experience lives in **Render `cid-postgres`** (policies, quotes, documents, claims, COI, carrier KB, etc.) and is exposed to Connect through **CID-PDF-API** **`/api/connect/*`** when the bridge is enabled.
- Identity: **`clients.primary_email`** (required header **`X-User-Email`**) plus optional **`X-User-Id`** (Supabase **`auth.users.id`**) with lazy **`clients.famous_user_id`** backfill — see **`pdf-backend`** `src/middleware/connectAuth.js`.
- Performance: index on **`famous_user_id`**; optional short client-side caching of segment backend URLs (`app_settings`) remains separate.

## Data bridge — shipped behavior (verify in code + env)

Connect supports **two modes** for **insured** insurance data (policies, quotes, documents, claims, COI, KB search, chat). Which path runs depends on **`VITE_CID_API_URL`** at **build time**.

### A. Bridge mode (**`VITE_CID_API_URL` set** — e.g. Netlify + `https://cid-pdf-api.onrender.com`)

- **`src/lib/connectApi.ts`** sends **`GET`/`POST`** to **`${VITE_CID_API_URL}/api/connect/...`** with **`X-User-Email`** and **`X-User-Id`** from the Supabase session.
- **`src/api.ts`** routes **`getUserPolicies`**, **`getQuoteDetails`**, **`getUserDocuments`**, **`submitClaim`**, **`submitCoiRequest`**, **`getAiSummaryForPolicy`**, and related helpers to the API when **`isConnectInsuranceApiEnabled()`** is true.
- **UI** components use those helpers (**`PolicyVault`**, **`PolicyTimeline`**, **`QuoteHistory`**, **`DownloadDocuments`**, **`CoverageChat`** policy load, etc.) — no direct **`supabase.from('policies')`** for those flows in bridge mode.
- **Coverage chat:** **`CoverageChat`** and **`AmICoveredChat`** call **`POST /api/connect/chat`** (Claude primary, Gemini fallback on the server — **`pdf-backend`** `src/services/connectChatService.js`). **`chat_messages`** history may still load/save in Famous when present.
- **Still Famous / Supabase (browser):** **`profiles`**, **`app_settings`**, **`bindQuote`** (insert policy + update quote in Famous), **`chat_messages`** persistence, admin tables, **`renewal_preferences`** / **`renewal_bindings`** where not migrated, storage buckets, Edge **`coverage-chat`** when **`VITE_CID_API_URL` is unset**.

### B. Legacy mode (**`VITE_CID_API_URL` unset**)

- Same as historical behavior: insured data reads/writes use **`supabase.from(...)`** for **`policies`**, **`quotes`**, etc., subject to RLS.
- **Coverage chat** uses the **`coverage-chat`** Edge Function instead of **`/api/connect/chat`**.

**E2E testing:** When validating **quote → bind → Connect**, confirm whether the **policy row** your pipeline writes is in **Famous `policies`** only, **cid-postgres** only, or both. **`bindQuote`** in Connect still writes to **Famous**; **`/api/connect`** reads from **cid-postgres**. Align pipeline + test users so the email exists in **`clients`** and policies exist where Connect reads.

See also **`docs/CONNECT_API_BRIDGE_STEP1_AUDIT.md`**, **`docs/DEPLOY.md`** (`VITE_CID_API_URL`), **`docs/STAGING_INTEGRATION_TEST_PLAN_DRAFT.md`** §4.

## Where operator / pipeline data lives (don’t query the wrong DB)

- **Famous / DatabasePad (Supabase-compatible):** Auth, Connect app tables you configure there, Edge Functions — **`VITE_SUPABASE_URL`** in the browser.
- **Render `DATABASE_URL` (e.g. `cid_postgres`):** **CID-PDF-API** (`pdf-backend`) — submissions, quotes, **`carrier_messages`**, operator queue, bind flow, Gmail poller writes, etc. SQL against “carrier pipeline” tables belongs here, **not** in the Famous SQL editor unless you have explicitly synced or replicated that data there.

## Bind-token onboarding (cross-segment)

- Bind links attach users to policies by `policy_id`, not by a hardcoded segment route.
- Result: onboarding flow works across all current segments when policy records are present.
- **Schema:** `policy_bind_tokens` uses `used_at` (single-use redemption time) and `used_by` — not `redeemed_at`.
- **App:** `BindTokenRedemption` → signup/redeem → `PostBindOnboarding` until `profiles.onboarding_completed`.
- **Paths:** `src/components/auth/BindTokenRedemption.tsx`, `src/components/onboarding/PostBindOnboarding.tsx`, admin `src/components/admin/BindTokensTab.tsx` (not `AdminBindTokens.tsx`).

## RSS (single backend rule)

Intake and notify flows use **one** `cid-pdf-api` host with **`segment`** in the JSON body — not a separate operator stack per segment repo. Details: `pdf-backend` / `DOCUMENTATION.md` / CID-docs.
