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

## Data bridge (approved)

- Connect browser uses Famous auth/session context; browser never gets service-role credentials.
- Policy/doc/client reads come from `cid-postgres` through a backend service (with read-replica + pooling), not direct browser DB access.
- Identity mapping: Famous `user.id` (UUID) maps to insurance records via `clients.famous_user_id`.
- Performance target: sub-200ms policy reads with index on `famous_user_id`; cache summaries for 5 minutes.
- Degraded mode: show a temporary-unavailable message and cached summary while fresh data refreshes.

## Bind-token onboarding (cross-segment)

- Bind links attach users to policies by `policy_id`, not by a hardcoded segment route.
- Result: onboarding flow works across all current segments when policy records are present.

## RSS (single backend rule)

Intake and notify flows use **one** `cid-pdf-api` host with **`segment`** in the JSON body — not a separate operator stack per segment repo. Details: `pdf-backend` / `DOCUMENTATION.md` / CID-docs.
