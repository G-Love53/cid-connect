# Step 1 — CID Connect Supabase read/write audit

**Purpose:** Map every `supabase.from()` / storage / realtime / edge invocation so Step 2 API endpoints match real usage.  
**Repo:** `cid-connect` (production app code: `src/`).  
**Date:** 2026-04-09  
**Scope note:** `reference/functions/*` is deployable Edge Function source (e.g. `redeem-bind-token`); listed separately from the SPA.

---

## Summary counts

| Category | Tables / buckets touched |
|----------|---------------------------|
| **Insurance-domain (primary MOVE to cid-pdf-api)** | `policies`, `quotes`, `documents`, `claims`, `coi_requests`, `carriers`, `carrier_resources`, `chat_messages`, `document_downloads`, `payment_method_requests`, `renewal_preferences`, `renewal_bindings`, `renewal_notifications` |
| **Platform / admin (typically STAY in Famous)** | `profiles`, `app_settings`, `admin_audit_log`, `email_templates`, `webhook_events`, `webhook_rules`, `inbound_webhook_events`, `retry_queue`, `policy_bind_tokens` |
| **Not used in Connect today** | `submissions`, `carrier_messages`, `clients`, `invoices` — no `.from()` in `src/` |

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
| `PolicyVault.tsx` | `policies` | R — active policy, `user_id` |
| `PolicyTimeline.tsx` | `policies`, `quotes`, `claims`, `coi_requests` | R — timeline |
| `QuoteHistory.tsx` | `quotes` | R — `user_id` |
| `DownloadDocuments.tsx` | `policies`, `document_downloads` | R + W |
| `UpdatePaymentMethod.tsx` | `policies`, `payment_method_requests` | R + W |
| `CoverageChat.tsx` | `policies`, `chat_messages` | R + W; `supabase.functions.invoke('coverage-chat')` |
| `RenewalReminders.tsx` | `policies`, `renewal_preferences` | R + W |
| `RenewalComparison.tsx` | `policies`, `renewal_bindings` | R |
| `AmICoveredChat.tsx` | — | `invoke('coverage-chat')` only |
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
- [ ] **Step 2:** Confirm `cid-postgres` column names vs `Policy` types in `src/types/index.ts`

---

## 7. Next action

**Step 2 (implemented in `pdf-backend`):** `src/routes/connectApi.js` + `src/middleware/connectAuth.js`, mounted at **`/api/connect`**. Run **`pdf-backend/migrations/007_connect_api.sql`** on Render. See **`pdf-backend/README.md`** (CID Connect API).
