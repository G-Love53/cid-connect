# Auth configuration (Site URL, redirects, SMTP)

**Scope:** Famous / Supabase **Auth** and email (password reset, SMTP). For **where insurance and operator pipeline data live** (Famous vs Render `cid_postgres`, Gmail poller, Connect policy reads), see **`docs/ARCHITECTURE.md`** and **`docs/WORKFLOW_HANDOFF.md`**.

CID Connect reads **`VITE_SUPABASE_URL`** / **`VITE_SUPABASE_ANON_KEY`** from Netlify; password reset uses **`getPasswordResetRedirectUrl()`** (see `src/lib/siteUrl.ts` and `resetPassword` in `src/contexts/AuthContext.tsx`). No app changes are required once the **project Auth config** matches.

If you **cannot** open **Authentication** in the Supabase dashboard (e.g. access denied to project `zyaqtsmeeygcyqrvpyuy`), someone with **org/project admin** rights can apply the same settings with the **Supabase Management API**.

> **Famous / DatabasePad:** Confirm with Famous whether **`https://api.supabase.com`** applies to your managed instance. If not, use Famous’s process or dashboard for Auth.

---

## Prerequisites

1. **Project ref:** `zyaqtsmeeygcyqrvpyuy` (must match `VITE_SUPABASE_URL` host).
2. **Supabase Personal Access Token (PAT):** not the anon key. Create at  
   [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens).  
   Required OAuth scopes for the PATCH call include **`auth:write`** (and fine-grained **`auth_config_write`** / **`project_admin_write`** as documented).
3. **Do not** commit secrets or paste PAT/SMTP passwords into Git.

Export in your shell (example):

```bash
export SUPABASE_ACCESS_TOKEN="your_personal_access_token"
export PROJECT_REF="zyaqtsmeeygcyqrvpyuy"
```

---

## 1. Site URL + redirect allowlist (password reset links)

**Endpoint:** `PATCH https://api.supabase.com/v1/projects/{ref}/config/auth`

- **`site_url`** — Public app origin (no trailing slash required if your client accepts it).
- **`uri_allow_list`** — **String** of allowed redirect URLs (Supabase dashboard uses the same allowlist; format is often comma-separated entries).

Example (production Netlify app):

```bash
curl -sS -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://cid-connect.netlify.app",
    "uri_allow_list": "https://cid-connect.netlify.app/**"
  }'
```

Include **`https://cid-connect.netlify.app/reset-password`** explicitly if you do not use a wildcard.

---

## 2. Custom SMTP (reliable password reset email)

Configure the fields your provider gives you. Official guide:  
[Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Example shape (Resend often uses SMTP; **use your provider’s host/port/user/pass**):

```bash
curl -sS -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_host": "smtp.resend.com",
    "smtp_port": "465",
    "smtp_user": "resend",
    "smtp_pass": "YOUR_SMTP_PASSWORD",
    "smtp_admin_email": "noreply@yourdomain.com",
    "smtp_sender_name": "CID Connect"
  }'
```

**SendGrid / Mailgun:** use their SMTP hostname, port (often `587` or `465`), and API credentials as required by that provider.

You can combine **`site_url`**, **`uri_allow_list`**, and SMTP fields in **one** `PATCH` body if you prefer a single request.

---

## 3. Verify

- Dashboard: **Authentication → URL Configuration** (if you later get access).
- **Auth → Users:** test user exists.
- **Rate limits:** default email provider is heavily limited; SMTP is recommended for production.

---

## Troubleshooting

| Symptom | Likely cause |
|--------|----------------|
| `403` / `403` from Management API | PAT lacks scopes, or your account is not a member of the project/org. |
| `404` on project ref | Wrong ref or project not under your Supabase org. |
| Dashboard “no access” | Same as above — PAT cannot override membership. Famous must invite you or apply config. |
| Emails still missing | SMTP not set, wrong domain, spam, or rate limits on default provider. |

---

## References

- [Management API: Update auth service config](https://supabase.com/docs/reference/api/v1-update-auth-service-config)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
