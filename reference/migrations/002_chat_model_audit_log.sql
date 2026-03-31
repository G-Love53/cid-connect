-- chat_model_audit_log
create table if not exists public.chat_model_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  model_used text not null,
  fallback_used boolean not null default false,
  fallback_reason text null,
  latency_ms integer null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_audit_fallback_created
  on public.chat_model_audit_log (fallback_used, created_at desc);

create index if not exists idx_chat_audit_user_created
  on public.chat_model_audit_log (user_id, created_at desc);

create index if not exists idx_chat_audit_model_created
  on public.chat_model_audit_log (model_used, created_at desc);

alter table public.chat_model_audit_log enable row level security;

drop policy if exists "service role insert chat audit" on public.chat_model_audit_log;
create policy "service role insert chat audit"
on public.chat_model_audit_log
for insert
to service_role
with check (true);

drop policy if exists "staff admin read chat audit" on public.chat_model_audit_log;
create policy "staff admin read chat audit"
on public.chat_model_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

drop policy if exists "user read own chat audit" on public.chat_model_audit_log;
create policy "user read own chat audit"
on public.chat_model_audit_log
for select
to authenticated
using (user_id = auth.uid());
