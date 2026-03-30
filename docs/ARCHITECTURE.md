# Architecture — for the next developer

Clean split: **where code lives (Git)** vs **what serves traffic** vs **where data lives**.

## Roles (one glance)

| Piece | What it does | Where it lives |
|-------|----------------|----------------|
| **This repo (`cid-connect`)** | React app — Connect UI, forms, admin | **GitHub** → you edit in Cursor, run `npm run dev`, `git push` |
| **Famous** | Database, Auth, Edge Functions, Storage (e.g. `*.databasepad.com`) | **Famous** dashboard — not a duplicate of this frontend source |
| **Netlify** *(optional)* | **Static hosting only** — public **URL** + serves built HTML/JS (forms hit APIs + Famous) | Connect repo to Netlify if you want a hosted URL; otherwise skip |
| **CID-PDF-API** | Universal ops / intake / `segment` in JSON (**RSS**) | **`pdf-backend`** repo on Render → `cid-pdf-api.onrender.com` |
| **Segment backends** | Quote PDF / render per vertical (plumber, roofer, …) | Separate repos (`plumber-pdf-backend`, …) on Render |

## Netlify in one line

**Netlify does not replace Famous.** It only **serves the built frontend** (and URL) if you connect it to this repo. The app still talks to **Famous** for DB and to **Render** for CID APIs.

## RSS (single backend rule)

Intake and notify flows use **one** `cid-pdf-api` host with **`segment`** in the JSON body — not a separate operator stack per segment repo. Details: `pdf-backend` / `DOCUMENTATION.md` / CID-docs.
