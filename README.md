# CID Connect — Insurance Platform

Commercial insurance platform with quoting, policy management, claims, COI requests, and admin dashboard.

**Next dev:** read **`docs/ARCHITECTURE.md`** (target vs **shipped** data bridge), **`docs/AI_MODEL_POLICY.md`**, and **`docs/WORKFLOW_HANDOFF.md`**. For staging **quote → bind → policy → Connect**, use **`docs/STAGING_INTEGRATION_TEST_PLAN_DRAFT.md`**. For **API bridge Step 1 (Supabase audit)**, see **`docs/CONNECT_API_BRIDGE_STEP1_AUDIT.md`**.

## Source of truth & workflow (default)

| Step | What |
|------|------|
| **Edit** | **Cursor** — `cid-connect` repo |
| **Run** | **`npm run dev`** locally (`.env` from **`.env.example`** — never commit `.env`) |
| **Ship** | **`git add` → `git commit` → `git push origin main`** |

**Handoff rule:** Famous provides patch handoffs only; Cursor agent applies, verifies, commits, and pushes. A task is done only when a GitHub commit SHA is posted.

Optional: **Netlify** = **static URL + built SPA/forms only** (does not host DB). See **`docs/DEPLOY.md`** and **`docs/ARCHITECTURE.md`**. Not required for local dev.

**Secrets (local):** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in **`.env`**.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth, Database, Edge Functions, Storage, Realtime)
- **Segment APIs:** Render-hosted backends per segment (Plumber, Roofer, Bar)
- **Email:** Resend via Edge Functions
- **AI:** Claude primary + Gemini fallback via Render-proxied inference (`coverage-chat`)

## Getting Started

```bash
npm install
npm run dev
```

## pg_cron Schedule for check-renewals

The `check-renewals` Edge Function sends renewal reminder emails for policies expiring within 60/30/14/7 days. It runs automatically via a **pg_cron** schedule.

### Canonical Schedule

| Setting | Value |
|---------|-------|
| **Cron expression** | `0 8 * * *` |
| **Frequency** | Daily at **08:00 UTC** |
| **Job name** | `daily-renewal-check` |
| **Approach** | `pg_cron` + `pg_net` → HTTP POST to Edge Function |
| **Auth** | Service role key stored in **Vault** (`service_role_key`) |
| **Soft kill switch** | `app_settings.renewal_cron_enabled` (toggle in Admin → Renewals) |
| **Last run tracking** | `app_settings.renewal_last_cron_at` (set by Edge Function on success) |

### Setup Options

#### Option A: pg_cron + pg_net (Recommended)

1. Open **Supabase Dashboard → SQL Editor**
2. Run the migration: `reference/migrations/001_setup_pg_cron_renewal_check.sql`
3. This will:
   - Enable `pg_cron` and `pg_net` extensions
   - Store the service role key in Vault
   - Create the `daily-renewal-check` cron job
   - Record the setup in `app_settings`

#### Option B: Supabase Dashboard Edge Function Schedules

1. Go to **Edge Functions → check-renewals → Schedules**
2. Add schedule: `0 8 * * *`
3. Save

### Verification

```sql
-- Check the cron job exists:
SELECT jobid, jobname, schedule FROM cron.job WHERE jobname = 'daily-renewal-check';

-- Check recent runs:
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-renewal-check')
ORDER BY start_time DESC LIMIT 5;

-- Check app_settings:
SELECT * FROM app_settings WHERE key LIKE 'cron_%' OR key LIKE 'renewal_%';
```

### Admin UI

The **Admin Dashboard → Renewals** tab provides:
- **Enable/Disable toggle** — pauses automatic runs without removing the cron job
- **"Run Renewal Check" button** — triggers the function manually
- **Last run timestamp** — shows when the cron last completed successfully
- **pg_cron Setup Panel** — collapsible guide with copy-paste SQL and "Mark as Configured" buttons

### Key Files

| File | Purpose |
|------|---------|
| `reference/migrations/001_setup_pg_cron_renewal_check.sql` | Full migration SQL with Vault, cron setup, verification queries |
| `src/components/admin/AdminRenewalAlerts.tsx` | Admin UI for renewals + cron setup panel |
| `src/api.ts` → `getCronScheduleStatus()` | Reads cron config status from `app_settings` |
| `src/api.ts` → `markCronScheduleConfigured()` | Records that cron was set up |
| `src/api.ts` → `triggerRenewalCheck()` | Manual trigger via `supabase.functions.invoke` |

---

## Webhook Rule Execution Engine

The `receive-external-webhook` Edge Function includes **full rule execution** with isolated error handling.

### Flow

1. **Auth** — Validates `x-webhook-secret` or `Authorization: Bearer` against `GATEWAY_API_KEY`
2. **Log inbound** — Inserts into `webhook_events` (direction=inbound)
3. **Load rules** — Queries `webhook_rules` where `is_active=true` AND `event_type_match` = incoming `event_type`
4. **Filter by source** — `source_match` NULL = wildcard (match any); non-null = exact match
5. **Execute actions** — For each matched rule, runs the action in try/catch:
   - **`log_audit`** — Inserts into `admin_audit_log` (admin_user_id=NULL for system rows)
   - **`send_notification`** — Invokes `send-notification` Edge Function via internal HTTP with service role key
   - **`create_claim`** — Inserts into `claims` table using `field_mappings` for JSON path extraction
6. **Log execution** — Each rule execution logged to `webhook_events` (direction=outbound, source=rule-execution)
7. **Update inbound event** — Inbound `webhook_events` row updated with rule execution summary
8. **Return 200** — Always returns 200 to external caller, even if some rules fail

### Rule Matching Semantics

| Field | Behavior |
|-------|----------|
| `event_type_match` | **Exact** match on incoming `event_type`. No substring or regex. |
| `source_match` | NULL or empty = **wildcard** (match any source); non-null = **exact** match on incoming `source`. |

### Auth Headers

The function accepts two authentication methods:
- **`x-webhook-secret: <GATEWAY_API_KEY>`** — Primary method for external callers
- **`Authorization: Bearer <GATEWAY_API_KEY>`** — Alternative Bearer token method

Both validate against the `GATEWAY_API_KEY` Supabase secret.

### Action Types

#### `log_audit`

Inserts a row into `admin_audit_log` with:
- `admin_user_id` = NULL (system/automation row)
- `admin_email` = `action_config.admin_email` or `"system@webhook-rules"`
- `action` = `action_config.audit_action` or `"webhook_rule_{event_type}"`
- `entity_type` = `action_config.entity_type` or `"webhook"`
- `entity_id` = resolved from `action_config.entity_id_path` or the inbound event ID
- `details` = JSON with source, event_type, rule_id, payload_summary

#### `send_notification`

Invokes the `send-notification` Edge Function via internal HTTP POST with service role key.

**Required fields** (resolved in order: config static → field_mappings → payload root):
- `user_email`
- `reference_number`
- `entity_type`
- `new_status`

**Optional fields:**
- `user_name`
- `extra_context`

If `user_email` cannot be resolved, the action fails with an error (does not break the webhook response).

#### `create_claim`

Inserts a new claim into the `claims` table.

**Minimum required columns:**
- `user_id` (must be resolvable — action fails if missing)
- `policy_id`, `claim_number` (auto-generated if missing), `segment`, `incident_date`, `description`, `claim_type`, `status`

**Resolution order per column:**
1. `field_mappings` value (resolved from payload via dot-notation path)
2. `action_config` static value (e.g., `"segment": "bar"`)
3. Payload root field (e.g., `payload.user_id`)
4. Default value (e.g., auto-generated claim_number, current date for incident_date)

### Field Mappings Syntax

The `action_config.field_mappings` object maps target column names to dot-notation paths in the webhook payload:

```json
{
  "field_mappings": {
    "user_id": "user_id",
    "policy_id": "policy_id",
    "description": "details.description",
    "incident_date": "details.incident_date",
    "estimated_amount": "details.estimated_amount",
    "incident_location": "details.location",
    "third_party_name": "details.third_party.name",
    "third_party_contact": "details.third_party.phone"
  }
}
```

**Supported path features:**
- **Dot notation:** `"details.description"` → `payload.details.description`
- **Array indexing:** `"items.0.name"` → `payload.items[0].name`
- **Nested objects:** `"details.third_party.name"` → `payload.details.third_party.name`

### Example Seeded Rules

Three example rules are seeded in the database:

| event_type_match | action_type | Description |
|-----------------|-------------|-------------|
| `test_event` | `log_audit` | Smoke test: logs any test_event to admin_audit_log |
| `external_claim_filed` | `create_claim` | Auto-creates claim with field_mappings from external system |
| `policy_renewed` | `send_notification` | Sends renewal confirmation email to policyholder |

### Smoke Test

```bash
# Test log_audit rule
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/receive-external-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <GATEWAY_API_KEY>" \
  -d '{
    "source": "smoke-test",
    "event_type": "test_event",
    "payload": { "message": "Hello from smoke test" }
  }'
```

Expected response:
```json
{
  "ok": true,
  "event_id": "uuid",
  "rules_matched": 1,
  "rules_succeeded": 1,
  "rules_failed": 0,
  "rule_results": [
    {
      "rule_id": "uuid",
      "action_type": "log_audit",
      "success": true
    }
  ]
}
```

---

## send-notification Rate Limiting

The `send-notification` Edge Function includes **application-level deduplication** to prevent repeated sends:

### Dedup Behavior

- **Window:** 5 minutes (configurable via `DEDUP_WINDOW_MINUTES` constant)
- **Key:** `user_email` + `reference_number` + `new_status`
- **Check:** Queries `webhook_events` for matching outbound sends within the window
- **Skip response:** Returns `{ sent: false, skipped: true, reason: "Duplicate..." }` with HTTP 200
- **Override:** Pass `skip_dedup: true` in the request body to bypass (e.g., manual resend from admin UI)

### Resend Provider Rate Limiting

- HTTP 429 from Resend is caught and returned with `retry_after_seconds`
- All sends (success, skipped, rate-limited) are logged to `webhook_events`

---

## Quote Comparison

The **Quote History** screen supports side-by-side comparison:

1. User clicks **"Compare Quotes"** button in Quote History
2. Selects 2–3 quotes via checkboxes
3. Clicks **"Compare N Quotes"** → navigates to `QuoteComparison` view
4. Side-by-side table (desktop) or stacked cards (mobile) with:
   - Premium comparison with lowest highlighted in green
   - Coverage limits (GL, Property, Auto, Umbrella, Deductible)
   - Eligibility badges, carrier, segment, dates
   - Coverage summaries

### Wiring

| Component | Role |
|-----------|------|
| `QuoteHistory` | Compare mode UI, checkbox selection (max 3), `onCompareQuotes(ids)` callback |
| `MainApp` | `handleCompareQuotes` → sets `selectedCompareIds` state + `serviceView='quote-compare'` |
| `QuoteComparison` | Fetches quotes by ID via `getQuoteDetails()`, renders comparison table |

---

## Project Structure

```
src/
├── api.ts                          # All Supabase + backend API functions
├── components/
│   ├── admin/                      # Admin dashboard tabs
│   │   ├── AdminDashboard.tsx      # Main admin container with tabs
│   │   ├── BindTokensTab.tsx       # Issue/revoke bind-token invite links
│   │   ├── AdminOverviewLive.tsx   # Real-time overview with alerts banner
│   │   ├── AdminRenewalAlerts.tsx  # Renewal management + cron setup
│   │   ├── AdminAlertsBanner.tsx   # Critical alerts (expiring policies, stale claims)
│   │   ├── WebhookLogTab.tsx       # Unified webhook events viewer
│   │   ├── WebhookRulesTab.tsx     # Webhook rules engine CRUD
│   │   └── ...                     # Analytics, Audit, Templates, Users, Claims, etc.
│   ├── quote/                      # Quote flow screens
│   │   ├── QuoteComparison.tsx     # Side-by-side quote comparison view
│   │   └── ...                     # QuoteScreen, QuoteResults, SegmentSelector
│   ├── history/
│   │   └── QuoteHistory.tsx        # Quote history with compare mode
│   ├── services/                   # Claims, COI, Chat, Billing, Carrier Detail
│   ├── coverage/                   # Dedicated "Am I Covered?" tab
│   ├── coi/                        # Dedicated Instant COI tab
│   ├── onboarding/                 # PostBindOnboarding.tsx — post-bind onboarding flow
│   ├── auth/                       # Login, BindTokenRedemption (bind-link URL routing)
│   ├── policy/                     # Policy vault & timeline
│   └── navigation/                 # Header & bottom nav
├── contexts/                       # Auth & App context providers
├── lib/supabase.ts                 # Supabase client init
└── types/index.ts                  # TypeScript interfaces

reference/
├── docs/
│   └── BIND_TOKEN_SMOKE_TEST.md
├── cid-pdf-api/
│   └── coverage-inference-contract.md
├── functions/
│   ├── coverage-chat/
│   │   └── index.ts
│   └── redeem-bind-token/
│       └── index.ts
├── cid-connect-famous/
│   └── E2E_SMOKE_TEST.md           # End-to-end smoke test script
└── migrations/
    ├── 001_setup_pg_cron_renewal_check.sql
    ├── 002_chat_model_audit_log.sql
    ├── 003_policy_bind_tokens.sql
    └── 004_profiles_onboarding_completed.sql
```

## Edge Functions

| Function | Purpose |
|----------|---------|
| `analyze-quote` | AI quote analysis via Gemini |
| `coverage-chat` | AI coverage chat with policy context |
| `redeem-bind-token` | Validates/redeems single-use bind token and links policy to new user |
| `send-notification` | Email notifications via Resend with template support + **dedup rate limiting** |
| `check-renewals` | Daily renewal reminder emails (pg_cron scheduled) |
| `receive-external-webhook` | Inbound webhook ingestion + **rule execution engine** (log_audit, send_notification, create_claim) |
| `generate-quote-pdf` | Server-side PDF generation for quotes |
| `email-quote-pdf` | Email quote PDF as Resend attachment |
| `export-admin-overview-pdf` | Admin dashboard PDF export |

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with roles (agent, staff, admin) |
| `policies` | Active/expired policies |
| `quotes` | Quote submissions with AI analysis |
| `claims` | Insurance claims |
| `coi_requests` | Certificate of Insurance requests |
| `chat_messages` | Coverage chat history |
| `documents` | Policy documents |
| `carriers` | Insurance carrier directory |
| `carrier_resources` | Carrier-specific resources (forms, guides) |
| `webhook_events` | Unified inbound + outbound webhook event log |
| `webhook_rules` | Automation rules for webhook processing |
| `admin_audit_log` | Admin action audit trail (supports NULL admin_user_id for system rows) |
| `app_settings` | Key-value store for cron toggles, config flags |
| `email_templates` | Customizable email templates per entity_type/status |
| `renewal_notifications` | Renewal email send history |
| `policy_bind_tokens` | Signed bind-link tokens for onboarding and policy linkage |

## Bind Token Onboarding

- Invite links use format: `/?bind_token=<raw_token>&email=<intended_email>`.
- Admin issues/revokes tokens from **Admin Dashboard -> Bind Tokens** (`BindTokensTab.tsx`, not `AdminBindTokens.tsx`).
- Token flow: validate -> redeem -> link `policies.user_id` -> one-time onboarding (`PostBindOnboarding.tsx` lives under `src/components/onboarding/`).
- New users are shown a guided post-bind onboarding screen until `profiles.onboarding_completed = true`.
- **DB:** redemption is stored as `policy_bind_tokens.used_at` / `used_by` (UI may say "redeemed"; there is no `redeemed_at` column). Full alias table: `docs/WORKFLOW_HANDOFF.md` (Canonical names).

## Secrets

| Secret | Used By | Notes |
|--------|---------|-------|
| `GATEWAY_API_KEY` | `receive-external-webhook`, `send-notification` | Webhook ingest auth + API key auth |
| `RESEND_API_KEY` | `send-notification`, `check-renewals`, `email-quote-pdf` | Resend email service |
| `SUPABASE_SERVICE_ROLE_KEY` | All Edge Functions | Auto-injected by Supabase runtime |

## Known Issues / Tech Debt

- ~~**Webhook rule execution not implemented**~~ — **DONE** (2026-03-30)
- ~~**QuoteComparison not wired in MainApp**~~ — **DONE** (2026-03-30)
- ~~**create_claim field_mappings not implemented**~~ — **DONE** (2026-03-30)
- ~~**admin_audit_log.admin_user_id NOT NULL blocked system rows**~~ — **FIXED** (2026-03-30, altered to nullable)
- ~~**send-notification had no rate limiting**~~ — **DONE** (2026-03-30, 5-min dedup window)
- **No retry queue** for failed Resend sends (429s are caught but not retried automatically)
- **No separate `WEBHOOK_INGEST_SECRET`** — reuses `GATEWAY_API_KEY` for webhook auth
- **create_claim** field_mappings needs E2E test with real carrier webhook payloads
