# Bind Token Smoke Test

Use this checklist to validate bind-link onboarding end-to-end.

**Naming:** Redemption time is stored in **`policy_bind_tokens.used_at`** (and **`used_by`**). Do not expect a `redeemed_at` column. UI labels may say "redeemed."

This flow is segment-agnostic (policy-based linkage), so run it against at least one policy from each active segment during full regression.

## Preconditions

- Migration applied: `reference/migrations/003_policy_bind_tokens.sql`
- Edge function deployed: `redeem-bind-token`
- Famous secrets set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting (read this first)

**`invalid_token` (404)** — Expected if you call validate with a raw string that has **no matching row** in `policy_bind_tokens`. The function hashes the raw token with SHA-256 and compares to `token_hash`. You must insert a row **before** testing, using the same raw token string in SQL as you send in JSON (`token` field).

**`missing_service_config` (500)** — Edge Function secrets are missing or wrong names. Set **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** for the **same** Famous project where the table lives.

**`500` with a JSON error body** — After redeploying the latest `index.js`, the `error` field should show the real PostgREST message (e.g. missing table, wrong schema). If you still see `"[object Object]"`, redeploy the function from repo `reference/functions/redeem-bind-token/index.js`.

**Example:** validate body `{"action":"validate","token":"smoke-token-123","email":"you@example.com"}` only succeeds after you insert a row with `token_hash = encode(digest('smoke-token-123', 'sha256'), 'hex')` and `intended_email = 'you@example.com'` (case-insensitive match on email).

## 1) Create a test token row (SQL)

```sql
-- Replace values before running.
insert into public.policy_bind_tokens (
  token_hash,
  intended_email,
  policy_id,
  segment,
  expires_at,
  created_by
)
values (
  encode(digest('RAW_TEST_TOKEN_123', 'sha256'), 'hex'),
  'customer@example.com',
  '00000000-0000-0000-0000-000000000000',
  'bar',
  now() + interval '2 days',
  'smoke-test'
);
```

Use a **real** `policy_id` from `public.policies` (the all-zero UUID is only illustrative and may fail FKs or business checks). You can get one with `select id from public.policies limit 1;`.

**Quick match for `token` + `email` in the Test Function UI:** if you send `{"action":"validate","token":"smoke-token-123","email":"gtjoneshome@gmail.com"}`, the inserted row must use `encode(digest('smoke-token-123', 'sha256'), 'hex')` and `intended_email` that matches that email (case-insensitive).

## 2) Validate token (frontend or invoke)

Expected: `ok: true` for matching email and active token.

## 3) Negative checks

- Wrong email -> `email_mismatch`
- Expired token -> `token_expired`
- Bad token -> `invalid_token`

## 4) Redeem token

Sign up via link:

`https://<connect-host>/?bind_token=RAW_TEST_TOKEN_123&email=customer@example.com`

Expected:

- Account created
- `policy_bind_tokens.used_at` is set
- `policy_bind_tokens.used_by` is set
- Linked policy row has `policies.user_id = used_by`

## 5) Replay protection

Redeem same token again.

Expected: `token_already_used`

## 6) Verify audit rows

```sql
select id, intended_email, policy_id, used_at, used_by, expires_at, created_at
from public.policy_bind_tokens
order by created_at desc
limit 20;
```

## 7) Verify onboarding one-time behavior

```sql
select id, email, full_name, onboarding_completed
from public.profiles
where email = 'customer@example.com';
```

Expected:

- First successful bind onboarding sets `onboarding_completed = true`.
- Subsequent logins skip post-bind onboarding and go straight to app.
