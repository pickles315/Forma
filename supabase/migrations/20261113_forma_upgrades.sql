-- Forma upgrades: richer team chat, team roles, scheduled meetings, notes, and integration links.
-- OAuth tokens and provider API secrets are intentionally not stored in this database.

alter table public.messages
  add column if not exists edited_at timestamptz,
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists pinned_at timestamptz;

drop policy if exists "Authors can update their messages" on public.messages;
create policy "Authors can update their messages" on public.messages
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and private.is_forma_team_member(team_id));

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('👍','❤️','😂','🎉','👀','👏')),
  created_at timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);
alter table public.message_reactions enable row level security;
create policy "Team members read message reactions" on public.message_reactions
for select to authenticated using (
  exists (select 1 from public.messages m where m.id = message_id and private.is_forma_team_member(m.team_id))
);
create policy "Users add their own reactions" on public.message_reactions
for insert to authenticated with check (
  user_id = (select auth.uid()) and
  exists (select 1 from public.messages m where m.id = message_id and private.is_forma_team_member(m.team_id))
);
create policy "Users remove their own reactions" on public.message_reactions
for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.message_reactions to authenticated;
create index if not exists message_reactions_message_idx on public.message_reactions(message_id);

alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('owner','admin','moderator','member'));
drop policy if exists "Members and owners can view memberships" on public.team_members;
create policy "Team members can view team roster" on public.team_members
for select to authenticated using (private.is_forma_team_member(team_id));
drop policy if exists "Team owners can update member roles" on public.team_members;
create policy "Team owners can update member roles" on public.team_members
for update to authenticated using (private.is_forma_team_owner(team_id))
with check (private.is_forma_team_owner(team_id) and role in ('owner','admin','moderator','member'));
drop policy if exists "Team owners can remove members" on public.team_members;
create policy "Team owners can remove members" on public.team_members
for delete to authenticated using (private.is_forma_team_owner(team_id) and user_id <> (select auth.uid()));

create table if not exists public.team_meetings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
alter table public.team_meetings enable row level security;
create policy "Team members read scheduled meetings" on public.team_meetings
for select to authenticated using (private.is_forma_team_member(team_id));
create policy "Team members schedule meetings" on public.team_meetings
for insert to authenticated with check (created_by = (select auth.uid()) and private.is_forma_team_member(team_id));
create policy "Creators and owners update meetings" on public.team_meetings
for update to authenticated using (created_by = (select auth.uid()) or private.is_forma_team_owner(team_id))
with check (private.is_forma_team_member(team_id));
create policy "Creators and owners delete meetings" on public.team_meetings
for delete to authenticated using (created_by = (select auth.uid()) or private.is_forma_team_owner(team_id));
grant select, insert, update, delete on public.team_meetings to authenticated;

create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.team_meetings(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  notes text not null default '',
  transcript text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.meeting_notes enable row level security;
create policy "Team members read meeting notes" on public.meeting_notes
for select to authenticated using (private.is_forma_team_member(team_id));
create policy "Team members create meeting notes" on public.meeting_notes
for insert to authenticated with check (updated_by = (select auth.uid()) and private.is_forma_team_member(team_id));
create policy "Team members update meeting notes" on public.meeting_notes
for update to authenticated using (private.is_forma_team_member(team_id))
with check (private.is_forma_team_member(team_id));
grant select, insert, update on public.meeting_notes to authenticated;

create table if not exists public.forma_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github','supabase','google_drive','google_docs','notion','slack','discord','figma','trello','linear','zapier','webhook')),
  label text not null check (char_length(trim(label)) between 1 and 120),
  external_url text not null check (external_url ~ '^https://'),
  created_at timestamptz not null default now(),
  unique(user_id, provider, external_url)
);
alter table public.forma_integrations enable row level security;
create policy "Users manage their own integration links" on public.forma_integrations
for select to authenticated using (user_id = (select auth.uid()));
create policy "Users add their own integration links" on public.forma_integrations
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove their own integration links" on public.forma_integrations
for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.forma_integrations to authenticated;

create index if not exists team_meetings_team_starts_idx on public.team_meetings(team_id, starts_at);
create index if not exists meeting_notes_team_idx on public.meeting_notes(team_id);
create index if not exists forma_integrations_user_idx on public.forma_integrations(user_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='message_reactions') then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_meetings') then
    alter publication supabase_realtime add table public.team_meetings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='meeting_notes') then
    alter publication supabase_realtime add table public.meeting_notes;
  end if;
end $$;


-- Role checks stay in the non-exposed private schema. Owners are the team creator;
-- admins can manage ordinary members and moderators, but cannot grant admin access.
create or replace function private.has_forma_team_role(p_team_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.created_by = (select auth.uid())
  ) or exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = (select auth.uid()) and tm.role = any(p_roles)
  );
$$;
revoke all on function private.has_forma_team_role(uuid, text[]) from public, anon;
grant execute on function private.has_forma_team_role(uuid, text[]) to authenticated;

drop policy if exists "Team owners can update member roles" on public.team_members;
create policy "Team admins can update member roles" on public.team_members
for update to authenticated
using (private.has_forma_team_role(team_id, array['owner','admin']))
with check (
  private.has_forma_team_role(team_id, array['owner'])
  or (private.has_forma_team_role(team_id, array['admin']) and role in ('member','moderator'))
);
drop policy if exists "Team owners can remove members" on public.team_members;
create policy "Team admins can remove lower roles" on public.team_members
for delete to authenticated
using (
  user_id <> (select auth.uid()) and
  (private.has_forma_team_role(team_id, array['owner'])
   or (private.has_forma_team_role(team_id, array['admin']) and role in ('member','moderator')))
);
create policy "Moderators can remove messages" on public.messages
for delete to authenticated using (private.has_forma_team_role(team_id, array['owner','admin','moderator']));
drop policy if exists "Creators and owners update meetings" on public.team_meetings;
create policy "Creators and admins update meetings" on public.team_meetings
for update to authenticated
using (created_by = (select auth.uid()) or private.has_forma_team_role(team_id, array['owner','admin']))
with check (private.is_forma_team_member(team_id));
drop policy if exists "Creators and owners delete meetings" on public.team_meetings;
create policy "Creators and admins delete meetings" on public.team_meetings
for delete to authenticated
using (created_by = (select auth.uid()) or private.has_forma_team_role(team_id, array['owner','admin']));

create index if not exists meeting_notes_updated_by_idx on public.meeting_notes(updated_by);
create index if not exists message_reactions_user_idx on public.message_reactions(user_id);
create index if not exists messages_reply_to_idx on public.messages(reply_to_id);
create index if not exists team_meetings_created_by_idx on public.team_meetings(created_by);


alter table public.meeting_notes add column if not exists summary text not null default '';

create or replace function private.forma_notify_scheduled_meeting()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.forma_notifications(user_id, actor_id, team_id, kind, title, body, target)
  select tm.user_id, new.created_by, new.team_id, 'calendar', 'Meeting scheduled', new.title, 'Meetings'
  from public.team_members tm
  where tm.team_id = new.team_id and tm.user_id <> new.created_by;
  return new;
end;
$$;
drop trigger if exists forma_notify_scheduled_meeting on public.team_meetings;
create trigger forma_notify_scheduled_meeting after insert on public.team_meetings
for each row execute function private.forma_notify_scheduled_meeting();


-- Consolidate delete permissions into one policy to avoid duplicate permissive checks.
drop policy if exists "Authors can delete their messages" on public.messages;
drop policy if exists "Moderators can remove messages" on public.messages;
create policy "Authors and moderators can delete messages" on public.messages
for delete to authenticated
using (
  user_id = (select auth.uid())
  or private.has_forma_team_role(team_id, array['owner','admin','moderator'])
);
create index if not exists team_call_invites_team_id_idx on public.team_call_invites(team_id);
create index if not exists team_invitations_sender_id_idx on public.team_invitations(sender_id);
