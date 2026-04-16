# Workflow Handoff Standard

This file defines the required handoff process between Famous (analysis/patch author) and Cursor agent (implementation + Git operations).

## Roles

- Famous: proposes changes, provides full patch handoff artifacts.
- Cursor agent: applies patch, verifies behavior, commits, and pushes to GitHub.

## Done Definition

A task is not done until:

1. Changes are committed to GitHub.
2. Commit SHA is posted in chat.
3. Smoke-test evidence is included.

## Required Patch Handoff Format

Every handoff must include:

1. Exact file paths changed (repo-relative).
2. Full file contents or precise diffs.
3. Intended commit message.
4. Smoke-test commands + expected output.
5. Required env/secrets changes.

## RSS Alignment (decision filter)

Use RSS for every architecture/process decision:

- **Reliable**: predictable deploy + rollback path, no hidden dashboard-only changes.
- **Scalable**: repeatable workflow for multi-agent handoffs and future contributors.
- **Sellable**: clean auditability and transferability for due diligence/exit.

## Security and Surface Rules

- Browser/frontend never receives service-role or provider secrets.
- Famous runtime handles auth/session context.
- Render/CID API holds model-provider secrets and privileged server credentials.
- Connect is not deployed on Render unless explicitly approved.

## Audit Requirements

For each completed change:

- Capture commit SHA.
- Include smoke-test evidence.
- Record secrets touched (names only, no secret values).
- Keep source-of-truth in Git (no dashboard-only final state).

## Failure Handling

If any required handoff item is missing, implementation pauses until the patch is complete.

## Smoke test runbooks (Git paths)

| Scope | Path |
|--------|------|
| Bind-token onboarding (validate / redeem / onboarding flag) | `reference/docs/BIND_TOKEN_SMOKE_TEST.md` |
| Full app E2E (admin, quotes, webhooks, etc.) | `reference/cid-connect-famous/E2E_SMOKE_TEST.md` |
| Staging quote → bind → policy → Connect | `docs/STAGING_INTEGRATION_TEST_PLAN_DRAFT.md` |
| **CID-PDF-API `/api/connect`** (health, profile, chat) — bash + curl | **`pdf-backend/scripts/smoke-connect-api.sh`** (requires `CID_API_URL`, `TEST_EMAIL`; optional `TEST_USER_ID`) |

`redeem-bind-token` uses **`SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** (see `reference/functions/redeem-bind-token/index.ts` and `docs/DEPLOY.md`). Do not document **`database_*`** names for that function.

## Canonical names (avoid drift with informal labels)

Git is the source of truth. If documentation or chat uses a different label, map it here:

| Topic | Canonical in Git | Informal / avoid |
|--------|------------------|------------------|
| Token redemption timestamp | `policy_bind_tokens.used_at` | `redeemed_at` |
| Who redeemed | `policy_bind_tokens.used_by` | — |
| Admin bind-token UI | `src/components/admin/BindTokensTab.tsx` | `AdminBindTokens.tsx` |
| Post-signup onboarding | `src/components/onboarding/PostBindOnboarding.tsx` | `auth/PostBindOnboarding.tsx` |
| Bind-link entry / routing | `src/components/auth/BindTokenRedemption.tsx` | — |
| `redeem-bind-token` secrets | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | ad-hoc `database_*` names |

User-facing labels for redeemed tokens use **Used**; internal status values may still be `'redeemed'` for compatibility. Both map to **`used_at`** in the database.

---

## CID Connect ↔ cid-postgres (API bridge — flow)

End-to-end flow when the **Connect** build includes **`VITE_CID_API_URL`** (e.g. Netlify) and **CID-PDF-API** is deployed on Render:

1. **User** signs in with **Famous** (`VITE_SUPABASE_URL` + anon key in the browser).
2. **Connect** calls **`${VITE_CID_API_URL}/api/connect/*`** from **`src/lib/connectApi.ts`**, sending **`X-User-Email`** (session email, required) and **`X-User-Id`** (Supabase user UUID, optional).
3. **CID-PDF-API** **`connectAuthMiddleware`** resolves **`clients`** in **Render Postgres** (`DATABASE_URL`) by **`famous_user_id`** or **`primary_email`**, then attaches **`client_id`** for downstream queries.
4. **Handlers** in **`src/routes/connectApi.js`** read/write **cid-postgres** tables (`policies`, `quotes`, `documents`, `claims`, `coi_requests`, `carrier_knowledge`, etc.). **Chat** uses **`src/services/connectChatService.js`** (Claude + Gemini; keys on Render only).
5. **Platform** data (**`profiles`**, **`app_settings`**, admin, **`chat_messages`** persistence, **`bindQuote`** inserts to Famous) remains on **Famous** unless separately migrated.

**Do not** run **cid-postgres** migrations in the Famous SQL editor. **External** DB URL for `psql` / CI: **`pdf-backend`** Render Postgres dashboard (not the internal URL from the web service env if you connect from your laptop).

**Docs:** **`docs/ARCHITECTURE.md`** (bridge vs legacy), **`docs/CONNECT_API_BRIDGE_STEP1_AUDIT.md`**, **`docs/DEPLOY.md`**.

---

## Operator / CID-PDF-API — data store and Gmail poller (avoid confusion)

- **`carrier_messages`**, poller dedupe, and related pipeline tables live in **Render Postgres** behind **`DATABASE_URL`** on **CID-PDF-API**, not in the Famous project you use for Connect **auth** unless you have explicitly replicated data there. Running SQL in the wrong project produces “relation does not exist” or misleading empty results.
- **Gmail poller (March 2026 investigation):** Duplicate **`carrier_messages`** rows for the same **`(gmail_message_id, segment)`** were traced to **short bursts** (e.g. March 11 and 18), not a steady “every three minutes forever” pattern. A **last-N-days** duplicate check showed **no** duplicate groups in the recent window at verification time — treat ongoing risk as **monitoring**, not an open fire without new evidence.
- **Dedupe tooling (optional cleanup):** The poller includes **`dedupeCarrierMessagesForGmail`**. In **pdf-backend**, **`npm run dedupe:carrier-messages`** and a browser form at **`/operator/maintenance/dedupe-carrier-messages`** (env **`CID_MAINTENANCE_SECRET`**) exist for one-off cleanup — use only with ops agreement; destructive to duplicate-linked rows.

---

## Next session (start here)

Paste this as the first message when resuming work:

1. **Baseline:** `git pull origin main` and confirm a clean working tree before changing code (always work from latest `main`).
2. **Source of truth:** GitHub — no dashboard-only final state. Famous supplies full patch handoffs per **Required Patch Handoff Format** above; Cursor applies, verifies, commits, pushes.
3. **Scope:** Feature coding for bind-token naming / admin UI cleanup is **closed** unless you open a new ticket with **one** concrete objective (single sentence).

**Next single objective (fill in before coding):**

> _Example: “Deploy migrations 003–004 and `redeem-bind-token` to Famous prod, then run `reference/docs/BIND_TOKEN_SMOKE_TEST.md`.”_
