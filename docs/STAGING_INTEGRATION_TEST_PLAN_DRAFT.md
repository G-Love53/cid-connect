# Staging integration test plan (draft) — quote → bind → policy → Connect

**Status:** Draft — executable checklist; §4 “source of truth” sentence resolved from code review (see below).  
**Audience:** QA, operator, and engineers validating staging without production carrier contracts.

---

## 1. Scope (one page)

| In scope | Out of scope (unless explicitly added) |
|----------|------------------------------------------|
| End-to-end path: intake → quote → bind → policy row visible in Connect | Production carrier APIs / live billing |
| Mock or staging carrier behavior | Changing RLS or anon key in browser |
| Operator / CID-PDF-API on staging | Segment-only backend repos (except Netlify → API smoke) |

---

## 2. Environments and surfaces

| Surface | Role | Notes |
|---------|------|--------|
| **cid-connect** (Vite SPA) | Insured-facing app; policy vault, documents, COI, etc. | Uses `VITE_SUPABASE_URL` + **anon** key only |
| **pdf-backend** (CID-PDF-API on Render) | Submissions, operator UI, S4–S6, bind, webhooks | Server secrets (e.g. service role) stay server-side |
| **Segment Netlify** (e.g. Bar/Roofer/Plumber landings) | `POST /submit-quote` to **same** API host | Not a second operator stack |
| **Database** | **Famous:** auth, **`profiles`**, many app tables. **Render `cid-postgres`:** canonical pipeline + **insured** data for **`/api/connect`** when Connect has **`VITE_CID_API_URL`**. | See **`docs/ARCHITECTURE.md`** — bridge mode vs legacy; don’t run pipeline SQL in the wrong project |

**Staging URLs:** _[fill: Connect base URL, CID-PDF-API host, segment Netlify URL]_

---

## 3. Test accounts and data hygiene

| Rule | Detail |
|------|--------|
| Emails | Prefer **`@allaccessins.com`** or other **test-only** addresses; synthetic “carrier” can send **mock quotes** to segment inboxes to exercise **Gmail poller → extraction → operator** without a production carrier contract |
| PDFs / uploads | Use agreed **fixture PDFs** (realistic carrier layout); include **CID token + PDF** so the poller ingests (see RSS rules in **`pdf-backend`** poller) |
| Users | Dedicated staging users; document IDs in runbook |
| Safety | No production carrier credentials; no service role in browser |

---

## 4. Source of truth for “active policy” in Connect

| Layer | What we think | Validate in staging |
|-------|----------------|---------------------|
| **Target architecture** | Canonical insurance rows in **`cid-postgres`**; Connect reads via **CID-PDF-API** **`/api/connect`** when **`VITE_CID_API_URL`** is set — see **`docs/ARCHITECTURE.md`** | **Network:** `GET` to **`{VITE_CID_API_URL}/api/connect/policies`** (or profile) with identity headers |
| **Shipped bridge mode (when env set)** | **`getUserPolicies`, `getActivePolicyForUser`, etc.** in **`src/api.ts`** call **`connectApi`** → **`GET /api/connect/policies`**. Policy vault / timeline / quote history use those helpers. | Test user email must exist in **`clients.primary_email`**; policy rows in **cid-postgres** **`policies`** for that **`client_id`** |
| **Legacy mode** (`VITE_CID_API_URL` unset) | Same helpers fall back to **`supabase.from('policies')`** (RLS). | **Network:** Supabase REST to **`policies`** |
| **Segment backends** | **`app_settings`** `segment_backend_*` — used for **`fetch`** to CID-PDF-API routes (COI, claims, etc.) **in addition** to the universal **`/api/connect`** base URL |

**One sentence:** *With **`VITE_CID_API_URL`** deployed, Connect’s insured policy list is driven by **`cid-postgres`** through **`/api/connect`**; without it, the app still uses **Famous `policies`** for those reads.*

**E2E gap to validate:** **Bind** may still write **`policies`** to **Famous** only (**`bindQuote`** in **`src/api.ts`**). Confirm your pipeline creates a **cid-postgres** policy + **`clients`** row for the same insured user before expecting the Connect bridge to show a policy.

---

## 5. Order of operations (checklist)

Execute in order unless a step is marked parallel.

| # | Step | Preconditions | Actions | Pass | Fail |
|---|------|---------------|---------|------|------|
| 1 | API health | Staging API URL known | `GET` health or root as documented | 200 / expected body | 5xx / wrong host |
| 2 | Submit quote | Fixture PDF + test account | Submit via segment or operator path per environment | Submission / quote ID created | Error or missing row |
| 3 | Quote → bind (staging) | Operator access; mock carrier path enabled | Complete bind steps per S6 runbook | Bind completes; policy/bind artifacts as expected | Stuck / wrong segment |
| 4 | Policy row | Bind succeeded | In DB or operator: `policies` (or canonical table) has row for test user | Row present; `status` matches expectation (e.g. `active`) | Missing / wrong `user_id` |
| 5 | Connect session | Test user can sign in | Open Connect staging; same Famous user as bound policy | Session `user.id` matches policy `user_id` | Wrong user / no session |
| 6 | Active policy UI | Step 5 pass | Policy vault / home shows active policy | UI shows policy summary (bridge: data from **cid-postgres** via API) | Empty / error toast |
| 7 | Documents / COI (optional) | Step 6 pass | Open documents or COI flow | Loads without error; data matches policy | 403 / empty / 404 client |

---

## 6. Expected signals (UI + DB)

| Checkpoint | UI signal | DB / API signal |
|------------|-----------|-----------------|
| Bind complete | Operator or email shows success | Policy (or link table) written |
| Connect | “Active” policy card or vault | `policies.status = 'active'` (if that is the table used) |
| RLS | — | Anon read allowed only for owning `user_id` |

---

## 7. Rollback / safety

- Do not delete shared staging data without agreement; prefer **test users** and **labeled** quotes/policies.
- If bind partially completed: document IDs; escalate rather than patching production.
- Revoke test tokens/links if security review requires it.

---

## 8. Acceptance criteria (summary)

1. Staging path completes **quote → bind → policy** without production carrier contract.
2. **Connect** shows an **active** policy for the **same** user as the bind (validate **network**: **`/api/connect`** if **`VITE_CID_API_URL`** is set, else **Supabase `policies`**).
3. **Architecture** for bridge vs legacy is **`docs/ARCHITECTURE.md`** § “Data bridge — shipped behavior” — tests must not assume API-only reads without verifying **env + network**.
4. This document stays an **executable** checklist with **pass/fail** per step and **filled URLs/IDs**.

---

## 9. References (repo)

- `docs/WORKFLOW_HANDOFF.md` — includes Gmail poller / Render DB vs Famous notes
- `docs/ARCHITECTURE.md` — target vs shipped data bridge
- `reference/docs/BIND_TOKEN_SMOKE_TEST.md`
- Connect policy reads: `src/api.ts` (`getUserPolicies`, `getActivePolicyForUser`), `src/lib/connectApi.ts`, `src/components/policy/PolicyVault.tsx`, `src/components/services/CoverageChat.tsx`

---

## 10. Gmail poller / pipeline DB (staging realism)

- Inbox → **`carrier_messages`** / quotes flow is **CID-PDF-API** + **Render Postgres** (`DATABASE_URL`). Do not debug pipeline SQL against the **Famous** Supabase project unless data is replicated there.
- **March 2026:** Historical duplicate **`carrier_messages`** rows were investigated; **recent-window** duplicate checks were clean at verification. Use this plan to prove **forward** behavior; treat legacy duplicate cleanup as **optional** ops, not a blocker to locking Connect + API for staging tests.

---

**Revision notes for the next agent:** Fill **staging URLs** in §2; add exact SQL only after confirming table names in the **correct** DB host; keep pass/fail columns tight.
