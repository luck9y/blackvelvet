-- Demo policies for the current browser-only Supabase setup.
-- Replace these with authenticated leadership policies before production use.

alter table public.access_logs enable row level security;
alter table public.applications enable row level security;
alter table public.staff_accounts enable row level security;

drop policy if exists "Public can read access logs" on public.access_logs;
drop policy if exists "Public can insert access logs" on public.access_logs;
drop policy if exists "Public can delete access logs" on public.access_logs;

create policy "Public can read access logs"
on public.access_logs
for select
to anon, authenticated
using (true);

create policy "Public can insert access logs"
on public.access_logs
for insert
to anon, authenticated
with check (true);

create policy "Public can delete access logs"
on public.access_logs
for delete
to anon, authenticated
using (true);

drop policy if exists "Public can read applications" on public.applications;
drop policy if exists "Public can submit applications" on public.applications;
drop policy if exists "Public can update applications" on public.applications;

create policy "Public can read applications"
on public.applications
for select
to anon, authenticated
using (true);

create policy "Public can submit applications"
on public.applications
for insert
to anon, authenticated
with check (true);

create policy "Public can update applications"
on public.applications
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Public can read staff accounts" on public.staff_accounts;
drop policy if exists "Public can create staff accounts" on public.staff_accounts;
drop policy if exists "Public can update staff accounts" on public.staff_accounts;
drop policy if exists "Public can delete staff accounts" on public.staff_accounts;

create policy "Public can read staff accounts"
on public.staff_accounts
for select
to anon, authenticated
using (true);

create policy "Public can create staff accounts"
on public.staff_accounts
for insert
to anon, authenticated
with check (true);

create policy "Public can update staff accounts"
on public.staff_accounts
for update
to anon, authenticated
using (true)
with check (true);

create policy "Public can delete staff accounts"
on public.staff_accounts
for delete
to anon, authenticated
using (true);
