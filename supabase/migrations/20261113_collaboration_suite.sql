-- Forma collaboration suite: shared documents, presentations, team calendar, and notifications.
create table if not exists public.team_documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled document' check (char_length(trim(title)) between 1 and 160),
  content text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.team_documents enable row level security;
create policy "Team members can read documents" on public.team_documents for select to authenticated using (private.is_forma_team_member(team_id));
create policy "Team members can create documents" on public.team_documents for insert to authenticated with check (created_by = (select auth.uid()) and private.is_forma_team_member(team_id));
create policy "Team members can update documents" on public.team_documents for update to authenticated using (private.is_forma_team_member(team_id)) with check (private.is_forma_team_member(team_id));
create policy "Team members can delete documents" on public.team_documents for delete to authenticated using (private.is_forma_team_member(team_id));
grant select, insert, update, delete on public.team_documents to authenticated;

create table if not exists public.team_presentations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled presentation' check (char_length(trim(title)) between 1 and 160),
  slides jsonb not null default '[{"id":"slide-1","title":"Welcome","body":"Add your ideas here.","background":"#25243a"}]'::jsonb check (jsonb_typeof(slides) = 'array'),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.team_presentations enable row level security;
create policy "Team members can read presentations" on public.team_presentations for select to authenticated using (private.is_forma_team_member(team_id));
create policy "Team members can create presentations" on public.team_presentations for insert to authenticated with check (created_by = (select auth.uid()) and private.is_forma_team_member(team_id));
create policy "Team members can update presentations" on public.team_presentations for update to authenticated using (private.is_forma_team_member(team_id)) with check (private.is_forma_team_member(team_id));
create policy "Team members can delete presentations" on public.team_presentations for delete to authenticated using (private.is_forma_team_member(team_id));
grant select, insert, update, delete on public.team_presentations to authenticated;

create table if not exists public.forma_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  team_id uuid references public.teams(id) on delete cascade,
  kind text not null check (kind in ('message','team_invite','call_invite','calendar')),
  title text not null,
  body text not null default '',
  target text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.forma_notifications enable row level security;
create policy "Users read their notifications" on public.forma_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "Users update their notifications" on public.forma_notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete their notifications" on public.forma_notifications for delete to authenticated using (user_id = (select auth.uid()));
grant select, update, delete on public.forma_notifications to authenticated;

create or replace function private.forma_notify_team_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.forma_notifications(user_id, actor_id, team_id, kind, title, body, target)
  select tm.user_id, new.user_id, new.team_id, 'message', 'New team message', left(new.content, 180), 'Chats'
  from public.team_members tm where tm.team_id = new.team_id and tm.user_id <> new.user_id;
  return new;
end;
$$;
create trigger forma_notify_team_message after insert on public.messages
for each row execute function private.forma_notify_team_message();

create or replace function private.forma_notify_team_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.forma_notifications(user_id, actor_id, team_id, kind, title, body, target)
  values (new.recipient_id, new.sender_id, new.team_id, 'team_invite', 'Team invitation', coalesce(new.team_name, 'You have been invited to a team.'), 'Teams');
  return new;
end;
$$;
create trigger forma_notify_team_invite after insert on public.team_invitations
for each row execute function private.forma_notify_team_invite();

create or replace function private.forma_notify_call_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.forma_notifications(user_id, actor_id, team_id, kind, title, body, target)
  values (new.recipient_id, new.caller_id, new.team_id, 'call_invite', 'Incoming team call', 'Someone invited you to join a team call.', 'Chats');
  return new;
end;
$$;
create trigger forma_notify_call_invite after insert on public.team_call_invites
for each row execute function private.forma_notify_call_invite();

create or replace function private.forma_notify_team_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.team_id is not null then
    insert into public.forma_notifications(user_id, actor_id, team_id, kind, title, body, target)
    select tm.user_id, new.created_by, new.team_id, 'calendar', 'New team event', new.title, 'Calendar'
    from public.team_members tm where tm.team_id = new.team_id and tm.user_id <> new.created_by;
  end if;
  return new;
end;
$$;
create trigger forma_notify_team_event after insert on public.calendar_events
for each row execute function private.forma_notify_team_event();

drop policy if exists "Owners can create calendar events" on public.calendar_events;
drop policy if exists "Owners can update their calendar events" on public.calendar_events;
drop policy if exists "Owners can view their calendar events" on public.calendar_events;
drop policy if exists "Users can delete their calendar events" on public.calendar_events;
create policy "Users can view personal and team events" on public.calendar_events for select to authenticated
using (created_by = (select auth.uid()) or (team_id is not null and private.is_forma_team_member(team_id)));
create policy "Users can create personal and team events" on public.calendar_events for insert to authenticated
with check (created_by = (select auth.uid()) and (team_id is null or private.is_forma_team_member(team_id)));
create policy "Creators update their events" on public.calendar_events for update to authenticated
using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()) and (team_id is null or private.is_forma_team_member(team_id)));
create policy "Creators delete their events" on public.calendar_events for delete to authenticated
using (created_by = (select auth.uid()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_documents') then
    alter publication supabase_realtime add table public.team_documents;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_presentations') then
    alter publication supabase_realtime add table public.team_presentations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='forma_notifications') then
    alter publication supabase_realtime add table public.forma_notifications;
  end if;
end $$;

-- Query indexes and narrow notification updates to the read marker only.
create index if not exists team_documents_team_updated_idx on public.team_documents(team_id, updated_at desc);
create index if not exists team_documents_created_by_idx on public.team_documents(created_by);
create index if not exists team_presentations_team_updated_idx on public.team_presentations(team_id, updated_at desc);
create index if not exists team_presentations_created_by_idx on public.team_presentations(created_by);
create index if not exists forma_notifications_user_created_idx on public.forma_notifications(user_id, created_at desc);
create index if not exists forma_notifications_actor_idx on public.forma_notifications(actor_id);
create index if not exists forma_notifications_team_idx on public.forma_notifications(team_id);
revoke all on public.forma_notifications from anon;
revoke insert, update on public.forma_notifications from authenticated;
grant update(read_at) on public.forma_notifications to authenticated;

create or replace function private.forma_notify_direct_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.forma_notifications(user_id, actor_id, kind, title, body, target)
  select cm.user_id, new.sender_id, 'message', 'New private message', left(new.content, 180), 'Private Chats'
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id and cm.user_id <> new.sender_id;
  return new;
end;
$$;
create trigger forma_notify_direct_message after insert on public.direct_messages
for each row execute function private.forma_notify_direct_message();
