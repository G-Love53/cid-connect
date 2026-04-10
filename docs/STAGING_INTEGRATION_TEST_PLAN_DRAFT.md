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
| **Database** | **Connect** reads **`policies`** (and much app data) from the **Famous** Supabase project; **CID-PDF-API** uses **Render Postgres** (`DATABASE_URL`) for submissions, quotes, **`carrier_messages`**, operator queue | See **`docs/ARCHITECTURE.md`** — two stores; don’t run pipeline SQL in the wrong project |

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

## 4. Source of truth for “active policy” in Connect (resolved for current code)

| Layer | What we think | Validate in staging |
|-------|----------------|---------------------|
| **Target architecture** | Canonical insurance data in **`cid-postgres`**; reads via backend service — see **`docs/ARCHITECTURE.md`** | Long-term alignment with handoff |
| **Current app behavior (code)** | **Connect reads active policy data from the Famous Supabase project via `supabase.from('policies')`** (and related helpers in **`src/api.ts`**, **`PolicyVault`**, **`CoverageChat`**, etc.), with **`user_id`** = session user and typically **`status = 'active'`**, subject to RLS | Confirm row exists for test user; network tab shows Supabase REST, not `cid-pdf-api` for that read |
| **Segment backends** | **`app_settings`** `segment_backend_*` URLs — used for **`fetch`** to CID-PDF-API for COI, claims, renewals, coverage analysis, etc. | Not a substitute for verifying where **`policies`** rows are read |

**One sentence:** *Today, Connect lists “active policy” from **Supabase `policies`** (browser + anon key + RLS); the “API-only bridge” is the **target**, not the only path in the shipped client.*

**Gap to track:** When policy reads move to **`cid-pdf-api`** (or a BFF), update **`docs/ARCHITECTURE.md`** and re-run this checklist against the new API.

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
| 6 | Active policy UI | Step 5 pass | Policy vault / home shows active policy | UI shows policy summary | Empty / error toast |
| 7 | Documents / COI (optional) | Step 6 pass | Open documents or COI flow | Loads without error; data matches policy | 403 / empty |

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
2. **Connect** shows an **active** policy for the **same** Famous user as the bind (validate against **Supabase `policies`** reads until API-only policy list ships).
3. **Gaps** between target architecture and shipped code are **documented** in **`docs/ARCHITECTURE.md`** § “Data bridge — current shipped behavior” — tests must not assume API-only reads without verifying network + code.
4. This document becomes an **executable** checklist with **pass/fail** per step and **filled URLs/IDs**.

---

## 9. References (repo)

- `docs/WORKFLOW_HANDOFF.md` — includes Gmail poller / Render DB vs Famous notes
- `docs/ARCHITECTURE.md` — target vs shipped data bridge
- `reference/docs/BIND_TOKEN_SMOKE_TEST.md`
- Connect policy reads: `src/api.ts` (`getUserPolicies`), `src/components/policy/PolicyVault.tsx`, `src/components/services/CoverageChat.tsx`

---

## 10. Gmail poller / pipeline DB (staging realism)

- Inbox → **`carrier_messages`** / quotes flow is **CID-PDF-API** + **Render Postgres** (`DATABASE_URL`). Do not debug pipeline SQL against the **Famous** Supabase project unless data is replicated there.
- **March 2026:** Historical duplicate **`carrier_messages`** rows were investigated; **recent-window** duplicate checks were clean at verification. Use this plan to prove **forward** behavior; treat legacy duplicate cleanup as **optional** ops, not a blocker to locking Connect + API for staging tests.

---

**Revision notes for the next agent:** Fill **staging URLs** in §2; add exact SQL only after confirming table names in the **correct** DB host; keep pass/fail columns tight.
