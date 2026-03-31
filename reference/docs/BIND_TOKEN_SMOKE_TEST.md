# Bind Token Smoke Test

Use this checklist to validate bind-link onboarding end-to-end.

## Preconditions

- Migration applied: `reference/migrations/003_policy_bind_tokens.sql`
- Edge function deployed: `redeem-bind-token`
- Famous secrets set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

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
