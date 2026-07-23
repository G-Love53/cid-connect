# Connect custom domain — rollout

**Goal:** Insureds land on **`https://connect.commercialinsurance-direct.com`** after bind — not `cid-connect.netlify.app` (Safe Browsing / phishing false positives on generic Netlify login pages).

**Canonical origin:** `https://connect.commercialinsurance-direct.com`

---

## Why this matters

Post-bind welcome email → Create Account / Sign In with password on a **generic `*.netlify.app`** host + **Commercial Insurance DIRECT** branding is exactly what Chrome Safe Browsing classifies as deceptive. A subdomain on your **own domain** is the professional fix (and reduces repeat flags).

---

## Checklist (do in order)

### 1. DNS (domain registrar or Cloudflare)

Add a **CNAME** for the Connect host:

| Type | Name | Target |
|------|------|--------|
| CNAME | `connect` | `<your-site>.netlify.app` (Netlify shows exact target after step 2) |

Use Netlify’s recommended target (often `apex-loadbalancer.netlify.com` or the site subdomain).

### 2. Netlify — Domain management

1. Open the **cid-connect** site in [Netlify](https://app.netlify.com).
2. **Domain management → Add domain → `connect.commercialinsurance-direct.com`**.
3. Wait for **DNS verification** and **Let’s Encrypt / DigiCert** certificate (usually minutes).
4. Set **Primary domain** to `connect.commercialinsurance-direct.com` (optional but recommended).

### 3. Netlify — Environment variables

Set (then **trigger deploy** — `VITE_*` are baked at build time):

| Variable | Value |
|----------|--------|
| `VITE_SITE_URL` | `https://connect.commercialinsurance-direct.com` |
| `VITE_SUPABASE_URL` | *(unchanged)* |
| `VITE_SUPABASE_ANON_KEY` | *(unchanged)* |
| `VITE_CID_API_URL` | `https://cid-pdf-api.onrender.com` *(or your API host)* |

### 4. Render — CID-PDF-API

In **Render → CID-PDF-API → Environment**:

| Variable | Value |
|----------|--------|
| `CID_APP_URL` | `https://connect.commercialinsurance-direct.com` |

Redeploy API (or wait for next deploy) so **welcome/bind emails** and operator signed-page links use the new origin.

Default in code (if env unset) is already `connect.commercialinsurance-direct.com` via `src/config/cidConnectUrl.js`.

### 5. Famous / Supabase Auth

Update **Site URL** and **redirect allowlist** — see **`docs/database_AUTH_CONFIG.md`**.

Minimum:

- `site_url`: `https://connect.commercialinsurance-direct.com`
- `uri_allow_list`: `https://connect.commercialinsurance-direct.com/**`

Keep `https://cid-connect.netlify.app/**` in the allowlist until the 301 redirect has been live for a while (password-reset links in old emails).

### 6. Deploy Connect repo

Push includes:

- `netlify.toml` — **301** from `cid-connect.netlify.app` → custom domain (after DNS is live).
- `VITE_SITE_URL` in Netlify env + rebuild.

### 7. Smoke test

1. Open `https://connect.commercialinsurance-direct.com` — no Chrome **Dangerous** badge.
2. **Sign In** with a test insured email.
3. Trigger or resend a **welcome email** — link must be `https://connect.commercialinsurance-direct.com/?email=...`.
4. **Password reset** — link must land on `/reset-password` on the custom domain.
5. **PWA install** card shows `connect.commercialinsurance-direct.com`.
6. Old URL `https://cid-connect.netlify.app` → **301** to custom domain.

### 8. Google Safe Browsing (optional cleanup)

- [Report false positive](https://safebrowsing.google.com/safebrowsing/report_error/?url=https://cid-connect.netlify.app/) for the old Netlify URL if it stays flagged.
- Add **`connect.commercialinsurance-direct.com`** to **Google Search Console** for monitoring.

---

## Rollback

- Remove CNAME or point Netlify primary back to `cid-connect.netlify.app`.
- Revert `CID_APP_URL` / `VITE_SITE_URL` to the Netlify subdomain.
- Revert Auth `site_url` to match.

---

## References

- **`docs/DEPLOY.md`** — Connect hosting and env vars
- **`docs/database_AUTH_CONFIG.md`** — Auth PATCH examples
- **`pdf-backend/docs/Deploy_Guide.md`** — `CID_APP_URL` on Render
