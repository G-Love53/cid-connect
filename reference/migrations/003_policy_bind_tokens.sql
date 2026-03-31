-- Bind token table for account onboarding -> policy linking
create table if not exists public.policy_bind_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  intended_email text not null,
  policy_id uuid null,
  quote_id uuid null,
  segment text null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  used_by uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text null
);

alter table public.policy_bind_tokens
  add constraint policy_bind_tokens_target_check
  check (policy_id is not null or quote_id is not null);

create index if not exists idx_bind_tokens_email_expiry
  on public.policy_bind_tokens (lower(intended_email), expires_at desc);

create index if not exists idx_bind_tokens_unused_expiry
  on public.policy_bind_tokens (expires_at)
  where used_at is null;

alter table public.policy_bind_tokens enable row level security;

drop policy if exists "service role manage bind tokens" on public.policy_bind_tokens;
create policy "service role manage bind tokens"
on public.policy_bind_tokens
for all
to service_role
using (true)
with check (true);
