# Step 1 — CID Connect Supabase read/write audit

**Purpose:** Map every `supabase.from()` / storage / realtime / edge invocation so Step 2 API endpoints match real usage.  
**Repo:** `cid-connect` (production app code: `src/`).  
**Date:** 2026-04-09 · **Status update:** Steps **2–5** implemented (see §8); **Step 6** = your quote/bind/policy E2E validation.  
**Scope note:** `reference/functions/*` is deployable Edge Function source (e.g. `redeem-bind-token`); listed separately from the SPA.

**Bridge mode:** When **`VITE_CID_API_URL`** is set, many rows below are **not** queried via `supabase.from` for insured flows — see **`src/lib/connectApi.ts`** and **`src/api.ts`** branches. This document remains the historical inventory for **legacy mode** and for **tables still on Famous** (profiles, admin, etc.).

---

## Summary counts

| Category | Tables / buckets touched |
|----------|---------------------------|
| **Insurance-domain (primary MOVE to cid-pdf-api)** | `policies`, `quotes`, `documents`, `claims`, `coi_requests`, `carriers`, `carrier_resources`, `chat_messages`, `document_downloads`, `payment_method_requests`, `renewal_preferences`, `renewal_bindings`, `renewal_notifications` |
| **Platform / admin (typically STAY in Famous)** | `profiles`, `app_settings`, `admin_audit_log`, `email_templates`, `webhook_events`, `webhook_rules`, `inbound_webhook_events`, `retry_queue`, `policy_bind_tokens` |
| **Not used via Supabase `.from()` in `src/`** | `submissions`, `carrier_messages`, `invoices` — pipeline tables on Render |
| **Clients / cid-postgres identity** | **`clients`** is not read directly in the SPA; identity for **`/api/connect`** is resolved **on CID-PDF-API** using headers + **`clients`** in **cid-postgres** |

**Storage buckets:** `policy-documents`, `cid-uploads`, `ai-training-docs` (plus `carrier_resources` metadata in DB).

**Submissions / pipeline:** UI copy references “quote submissions”; data is read from **`quotes`**, not a `submissions` table.

---

## 1. Table inventory (alphabetical)

Legend: **R** = read, **W** = write/update/delete, **Primary file** = main caller.

| Table | R/W | Primary usage | Filters / notes |
|-------|-----|---------------|-----------------|
| `admin_audit_log` | R/W | `api.ts` — `logAdminAction`, `getRecentAuditLogs`, paginated + CSV | Admin/staff |
| `app_settings` | R | `getSegmentBackendMap` — `like('key','segment_backend_%')` | Segment → CID-PDF-API base URLs |
| `app_settings` | R/W | `getAppSetting`, `setAppSetting`, `markCronScheduleConfigured` | Cron + misc keys |
| `carriers` | R | `getCarrierById`, `getActiveCarriers` | By id, `is_active` |
| `carrier_resources` | R | `getCarrierResources`, `AdminTrainAI` | `carrier_name`, `segment`, `is_active`; admin list |
| `chat_messages` | R/W | `CoverageChat.tsx` | `policy_id`, user-scoped; insert + load history |
| `claims` | R/W | `api.ts` + admin | `user_id`; inserts; status/settlement/assign; analytics |
| `coi_requests` | R/W | `api.ts` + admin | `user_id`; inserts; status/pdf URL |
| `document_downloads` | W | `DownloadDocuments.tsx` | Audit log of downloads |
| `documents` | R | `getUserDocuments` | `user_id` |
| `email_templates` | R/W/D | `getEmailTemplates`, `upsertEmailTemplate`, `deleteEmailTemplate` | Admin |
| `inbound_webhook_events` | R | `getInboundWebhookEvents` | Paginated |
| `payment_method_requests` | W | `UpdatePaymentMethod.tsx` | After API success |
| `policies` | R/W | Many | `user_id`, `status`, id; `bindQuote` insert; admin get all |
| `policy_bind_tokens` | R/W/D | `api.ts` — list/create/revoke; Edge `redeem-bind-token` updates policies | Admin + token lifecycle |
| `profiles` | R/W | `AuthContext`, `BindTokenRedemption`, `PostBindOnboarding`, `api.ts` admin | Role, onboarding, list all |
| `quotes` | R/W | `getQuoteDetails`, `getUserQuotes`, `getAllQuotesAdmin`, `bindQuote` | `user_id`, `quote_id`, `id` |
| `renewal_bindings` | R | `RenewalComparison.tsx` | User’s renewal |
| `renewal_notifications` | R | `getRenewalNotifications`, `getAdminAlerts` | Status filters |
| `renewal_preferences` | W | `RenewalReminders.tsx` | User preferences |
| `retry_queue` | R/W | `getRetryQueueRows`, `retryRetryQueueNow`, `cancelRetryQueueItem` | Admin |
| `webhook_events` | R | `getWebhookEvents`, `getAdminAlerts` | Direction, filters |
| `webhook_rules` | R/W/D | CRUD + toggle | Admin |

---

## 2. Direct component usage (outside `api.ts` only)

| File | Table / API | R/W |
|------|-------------|-----|
| `AuthContext.tsx` | `profiles` | W (insert on signup) |
| `BindTokenRedemption.tsx` | `profiles` | R |
| `PostBindOnboarding.tsx` | `profiles` | W (`onboarding_completed`) |
| `PolicyVault.tsx` | — | **R via `getActivePolicyForUser` → `api.ts`** (connect or Supabase) |
| `PolicyTimeline.tsx` | — | **R via `getPolicyById`, `getUserQuotes`, `getClaimsForPolicy`, `getCoiRequestsForPolicy`** |
| `QuoteHistory.tsx` | — | **R via `getUserQuotes`** |
| `DownloadDocuments.tsx` | `document_downloads` | **Policy:** `getActivePolicyForUser`; **docs:** `getUserDocuments`; **W** download audit |
| `UpdatePaymentMethod.tsx` | `payment_method_requests` | **Policy:** `getActivePolicyForUser`; **W** Supabase |
| `CoverageChat.tsx` | `chat_messages` | **Policy/summary:** `api.ts`; **chat:** `POST /api/connect/chat` if `VITE_CID_API_URL`, else `coverage-chat` Edge |
| `RenewalReminders.tsx` | `renewal_preferences` | **Policy:** `getActivePolicyForUser`; **W** Supabase |
| `RenewalComparison.tsx` | `renewal_bindings` | **Policy:** `getActivePolicyForUser`; **R** `renewal_bindings` Supabase |
| `AmICoveredChat.tsx` | — | **`POST /api/connect/chat`** or `invoke('coverage-chat')` |
| `AdminTrainAI.tsx` | `carrier_resources`; storage `ai-training-docs` | R + upload + insert |
| `AdminOverviewLive.tsx` | — | `supabase.channel('admin-overview-realtime')` (no `.from` in snippet) |

All other feature flows go through **`src/api.ts`** helpers.

---

## 3. `src/api.ts` — grouped by domain

### Policies (`policies`)

| Function / area | Op | Select / filter highlights |
|-----------------|----|-----------------------------|
| `getDistinctSegments` | R | `select('segment')` only |
| `bindQuote` | W | INSERT policy; UPDATE `quotes` status `bound` |
| `getUserPolicies` | R | `user_id` |
| `getAllPolicies` | R | Admin — all rows |
| `getPolicyById` | R | `id` |
| `getCarrierPolicies` | R | `carrier_id` |
| `getUpcomingRenewals` | R | Active, expiration window |
| Overview / analytics / admin feed | R | Counts, sparklines, activity — `created_at`, `updated_at` |

### Quotes (`quotes`)

| Function | Op | Notes |
|----------|-----|--------|
| `getQuoteDetails` | R | By `quote_id` or UUID `id` |
| `getUserQuotes` | R | `user_id` |
| `getAiSummaryForPolicy` | R | Bound quote + `ai_summary` |
| `getAllQuotesAdmin` | R | Admin bulk |

### Documents (`documents`)

| Function | Op | Notes |
|----------|-----|--------|
| `getUserDocuments` | R | `user_id` |

### Storage (buckets)

| Function | Bucket | Op |
|----------|--------|-----|
| `getDownloadUrl`, `downloadDocumentFile` | `policy-documents` | Signed URL |
| `getCarrierResourceDownloadUrl` | `policy-documents` | Signed URL |
| `uploadClaimPhotos`, `getClaimPhotoUrl` | `cid-uploads` | Upload / signed URL |
| `uploadCoiFile` | `cid-uploads` | Upload |

### Claims (`claims`)

| Function | Op | Notes |
|----------|-----|--------|
| `submitClaim` | W + W | Insert; update `backend_notified`; `fileClaim()` → CID-PDF-API |
| `getUserClaims`, `getClaimById` | R | User + admin |
| `getAllClaims` | R | Admin |
| `updateClaimStatus`, `updateClaimSettlement` | W | Admin |
| `assignClaim`, `unassignClaim` | W | Admin |
| `getAnalyticsData` | R | `created_at`, amounts |
| `getUserRecentActivity` | R | Partial columns |
| Overview / CSV exports | R | Various |

### COI (`coi_requests`)

| Function | Op | Notes |
|----------|-----|--------|
| `submitCoiRequest` | W + W | Insert; update after `requestCoi()` → CID-PDF-API |
| `getUserCoiRequests`, `getCoiRequestById` | R | |
| `getAllCoiRequests`, `updateCoiRequestStatus`, `updateCoiRequestPdfUrl` | R/W | Admin |

### Carriers (`carriers`, `carrier_resources`)

| Function | Op |
|----------|-----|
| `getCarrierById`, `getActiveCarriers` | R |
| `getCarrierResources` | R |

### Bind tokens (`policy_bind_tokens`)

| Function | Op |
|----------|-----|
| `getBindTokens`, `createBindTokenRecord`, `revokeBindToken` | R/W/D |
| `validateBindToken`, `redeemBindToken` | Invoke Edge `redeem-bind-token` (not direct table write from SPA for redeem) |

### Profiles (`profiles`)

| Function | Op |
|----------|-----|
| `getUserProfile`, `getUserEmailById`, `getAllProfiles`, `getStaffProfiles`, `getProfileNameById`, `getProfileNamesByIds` | R |
| `updateUserRole` | W |

### Admin / ops (`admin_audit_log`, `email_templates`, `app_settings`, webhooks, renewals, retries)

| Area | Tables |
|------|--------|
| Audit | `admin_audit_log` — insert, list, paginated, CSV |
| Email templates | `email_templates` |
| Cron / toggles | `app_settings` (includes `segment_backend_*` and renewal keys) |
| Renewals | `renewal_notifications`, `triggerRenewalCheck` → Edge |
| Webhooks | `webhook_events`, `webhook_rules`, `retryOutboundWebhook` |
| Inbound audit | `inbound_webhook_events` |
| Retry queue | `retry_queue` |
| Alerts | `policies`, `claims`, `renewal_notifications`, `webhook_events` — read-only for counts |

### Edge functions invoked from `api.ts`

| Function name | Purpose |
|---------------|---------|
| `redeem-bind-token` | Validate/redeem bind token |
| `send-notification` | Email notifications |
| `generate-quote-pdf` | Quote PDF download |
| `email-quote-pdf` | Email quote PDF |
| `check-renewals` | Renewal batch |
| `export-admin-overview-pdf` | Admin PDF |
| `process-retry-queue` | Retry processor |
| `receive-external-webhook` | Test webhook |

---

## 4. MOVE vs STAY (for API bridge planning)

### Target: move to **cid-pdf-api** `/api/connect/*` (insurance data)

- **Core:** `policies`, `quotes`, `documents`, `claims`, `coi_requests`, `carriers`, `carrier_resources`
- **Related:** `chat_messages` (if chat history stays in DB), `document_downloads`, `payment_method_requests`, `renewal_preferences`, `renewal_bindings`, `renewal_notifications`
- **Storage:** Document and claim/COI file access should become **server-issued URLs** (or R2 via API), not browser buckets pointing at canonical insurance files — align with migration plan.

### Target: **stay** on Famous Supabase (app + admin platform)

- **Auth/session:** `auth.*` only (no table)
- **`profiles`** — roles, onboarding, `famous_user_id` mapping surface
- **`app_settings`** — `segment_backend_*`, cron flags, `VITE_*` companion config
- **`policy_bind_tokens`** — optional STAY (tied to `redeem-bind-token` Edge); or move list/admin to API later
- **Admin ops not in cid-postgres:** `admin_audit_log`, `email_templates`, `webhook_events`, `webhook_rules`, `inbound_webhook_events`, `retry_queue` — **decision:** either remain Famous-only (current) or duplicate/sync; **not** in the minimal “insurance read” API unless product says otherwise

### Identity bridge (for API)

- Current code scopes **insured** data by **`user_id`** (= Supabase `auth.users.id`), not `clients.email` only.
- Step 2 endpoints must define **`cid-postgres.clients` ↔ `profiles.id` / `famous_user_id`)** or email join — **reconcile with `cid-postgres` schema** before implementing.

---

## 5. Suggested API surface (from this audit — Step 2 input)

Minimal set to replace **direct** insurance reads/writes in Connect:

1. **GET** policies (list + by id), **GET** quotes (list + detail), **GET** documents list, **GET** claims, **GET** coi_requests, **GET** carriers / carrier_resources (as needed)
2. **POST** claim, **POST** coi request (or **POST** to API that writes `cid-postgres` + calls segment backend internally)
3. **PATCH** claim/coi status (admin) — or admin-only routes
4. **GET** policy/quote/claim activity aggregates (replace `getAnalyticsData` / overview raw queries or move analytics to API)
5. **Chat:** **POST** `/api/connect/chat` (replaces `coverage-chat` Edge + `chat_messages` pattern)
6. **Storage:** **GET** signed URLs for policy docs / claim photos / COI uploads via API

**Platform tables** (webhooks, audit log, email templates, retry queue) can remain Supabase until a separate “admin API” migration.

---

## 6. Checklist — Step 1 complete

- [x] Every `supabase.from('…')` in `src/` catalogued
- [x] Storage buckets listed
- [x] Edge invokes listed
- [x] Gaps: `submissions`, `clients`, `carrier_messages`, `invoices` not in Connect — add to API only if/when product reads them
- [x] **Step 2:** **`/api/connect`** on **`pdf-backend`** — `connectApi.js`, `connectAuth.js`, migration **`007_connect_api.sql`** on Render **cid-postgres**
- [x] **Step 3:** KB seed — **`008_kb_v0_seed.sql`** (optional **`carrier_knowledge`** rows)
- [x] **Step 4:** Connect — **`VITE_CID_API_URL`**, **`src/lib/connectApi.ts`**, **`api.ts`** branches, components wired to helpers
- [x] **Step 5:** **`POST /api/connect/chat`** — **`connectChatService.js`** (Claude + Gemini); Connect **`CoverageChat`** / **`AmICoveredChat`**
- [ ] **Step 6:** Full **quote → bind → policy** journey against **cid-postgres** + Connect (see **`docs/STAGING_INTEGRATION_TEST_PLAN_DRAFT.md`**)

---

## 7. Implementation pointers (canonical)

| Piece | Location |
|--------|----------|
| API routes | **`pdf-backend`** `src/routes/connectApi.js` |
| Auth headers | **`X-User-Email`**, **`X-User-Id`** — `src/middleware/connectAuth.js` |
| Migrations | **`pdf-backend/migrations/007_connect_api.sql`**, **`008_kb_v0_seed.sql`** |
| Connect client | **`cid-connect`** `src/lib/connectApi.ts` |
| Smoke script | **`pdf-backend/scripts/smoke-connect-api.sh`** |
| Deploy env | **`cid-connect`** `docs/DEPLOY.md` — **`VITE_CID_API_URL`**; Render **`ANTHROPIC_API_KEY`** (chat) |

---

## 8. Next action (ongoing)

- **Operational:** Run **`scripts/smoke-connect-api.sh`** after deploys (`CID_API_URL`, `TEST_EMAIL`).
- **Product / QA:** Complete **Step 6** — confirm pipeline writes policies clients can see via **`/api/connect`** (email in **`clients`**, rows in **cid-postgres** **`policies`**). **`bindQuote`** still targets **Famous** until/unless replaced by an API bind path.
