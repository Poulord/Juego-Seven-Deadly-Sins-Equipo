-- Each plan contains immutable-by-reference snapshots, never inventory assignments.
create table public.teams (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 120),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ?& array['id','name','character','pieces','base','sets','tags','updatedAt'] and data->>'id' = id),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index teams_owner_updated_idx on public.teams (user_id, updated_at desc);
create table public.catalog_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 120),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ?& array['id','name','kind','stats','modifiers','thresholds'] and data->>'id' = id),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.teams enable row level security;
alter table public.catalog_entries enable row level security;
revoke all on public.teams, public.catalog_entries from anon;
grant select, insert, update, delete on public.teams, public.catalog_entries to authenticated;
create policy teams_select on public.teams for select to authenticated using ((select auth.uid()) = user_id);
create policy teams_insert on public.teams for insert to authenticated with check ((select auth.uid()) = user_id);
create policy teams_update on public.teams for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy teams_delete on public.teams for delete to authenticated using ((select auth.uid()) = user_id);
create policy catalog_select on public.catalog_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy catalog_insert on public.catalog_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy catalog_update on public.catalog_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy catalog_delete on public.catalog_entries for delete to authenticated using ((select auth.uid()) = user_id);
