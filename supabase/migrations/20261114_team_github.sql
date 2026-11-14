-- Team-level GitHub App installations and shared repositories.
-- Installation credentials are held by the server-side GitHub App integration, never in browser-visible rows.
create table if not exists public.team_github_installations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams(id) on delete cascade,
  installation_id bigint not null,
  account_login text not null,
  account_type text not null default 'User',
  connected_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.team_github_installations enable row level security;
drop policy if exists "Team members view GitHub connection" on public.team_github_installations;
create policy "Team members view GitHub connection" on public.team_github_installations
for select to authenticated using (private.is_forma_team_member(team_id));
revoke insert, update, delete on public.team_github_installations from anon, authenticated;
grant select on public.team_github_installations to authenticated;

create table if not exists public.team_github_repositories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  installation_id bigint not null,
  repository_id bigint not null,
  full_name text not null,
  description text not null default '',
  private boolean not null default false,
  default_branch text not null default 'main',
  html_url text not null,
  added_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(team_id, repository_id)
);
alter table public.team_github_repositories enable row level security;
drop policy if exists "Team members view shared GitHub repositories" on public.team_github_repositories;
create policy "Team members view shared GitHub repositories" on public.team_github_repositories
for select to authenticated using (private.is_forma_team_member(team_id));
revoke insert, update, delete on public.team_github_repositories from anon, authenticated;
grant select on public.team_github_repositories to authenticated;
create index if not exists team_github_repositories_team_idx on public.team_github_repositories(team_id);
