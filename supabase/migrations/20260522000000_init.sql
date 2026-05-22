create extension if not exists "pgcrypto";

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  business_problem text not null,
  industry text,
  key_metrics text,
  budget_range text,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_session_idx on reports(session_id, created_at desc);

alter table reports enable row level security;

-- MVP policy: anon can read (filtered by session_id client-side).
-- Writes happen exclusively via Edge Function using service_role key,
-- so no insert/update/delete policy is granted to anon.
drop policy if exists "anon read reports" on reports;
create policy "anon read reports" on reports for select to anon using (true);
