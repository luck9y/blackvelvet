create table if not exists public.system_errors (
  id text primary key,
  created_at timestamptz default now(),
  source text,
  message text not null,
  stack_trace text,
  page_url text,
  username text,
  user_role text,
  device_hex text,
  browser text
);

alter table public.system_errors enable row level security;

drop policy if exists "system_errors_insert_anyone" on public.system_errors;
drop policy if exists "system_errors_select_anyone" on public.system_errors;
drop policy if exists "system_errors_delete_anyone" on public.system_errors;

create policy "system_errors_insert_anyone"
on public.system_errors
for insert
to anon
with check (true);

create policy "system_errors_select_anyone"
on public.system_errors
for select
to anon
using (true);

create policy "system_errors_delete_anyone"
on public.system_errors
for delete
to anon
using (true);

create index if not exists system_errors_created_at_idx
on public.system_errors (created_at desc);
