-- AVA 1.3 Team Assistant
create table if not exists public.ava_team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.ava_team_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  message_type text not null default 'message' check (message_type in ('message','task','handover')),
  due_at timestamptz,
  todo_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.ava_todos add column if not exists assigned_by uuid references auth.users(id) on delete set null;
alter table public.ava_todos add column if not exists source_message_id uuid references public.ava_team_messages(id) on delete set null;

alter table public.ava_team_members enable row level security;
alter table public.ava_team_messages enable row level security;
drop policy if exists ava_team_members_read on public.ava_team_members;
create policy ava_team_members_read on public.ava_team_members for select to authenticated using (active=true);
drop policy if exists ava_team_messages_read on public.ava_team_messages;
create policy ava_team_messages_read on public.ava_team_messages for select to authenticated using (sender_id=auth.uid() or recipient_id=auth.uid());
drop policy if exists ava_team_messages_insert on public.ava_team_messages;
create policy ava_team_messages_insert on public.ava_team_messages for insert to authenticated with check (sender_id=auth.uid());
drop policy if exists ava_team_messages_update on public.ava_team_messages;
create policy ava_team_messages_update on public.ava_team_messages for update to authenticated using (recipient_id=auth.uid());

create or replace function public.ava_send_team_message(p_recipient_id uuid,p_body text,p_as_task boolean default false,p_due_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_sender uuid:=auth.uid(); v_msg uuid; v_todo uuid; v_sender_name text;
begin
  if v_sender is null or p_recipient_id is null or trim(coalesce(p_body,''))='' then raise exception 'Ungültige Nachricht'; end if;
  select display_name into v_sender_name from public.ava_team_members where user_id=v_sender;
  insert into public.ava_team_messages(sender_id,recipient_id,body,message_type,due_at)
  values(v_sender,p_recipient_id,trim(p_body),case when p_as_task then 'task' else 'message' end,p_due_at) returning id into v_msg;
  if p_as_task then
    insert into public.ava_todos(user_id,title,due_date,status,assigned_by,source_message_id)
    values(p_recipient_id,trim(p_body),coalesce(p_due_at::date,current_date),'open',v_sender,v_msg) returning id into v_todo;
    update public.ava_team_messages set todo_id=v_todo where id=v_msg;
  end if;
  insert into public.ava_notifications(user_id,kind,title,body,source_key,scheduled_for)
  values(p_recipient_id,'team',case when p_as_task then 'Neue Aufgabe von ' else 'Neue Nachricht von ' end||coalesce(v_sender_name,'Kollege'),trim(p_body),'team-'||v_msg::text,now())
  on conflict(user_id,kind,source_key) do nothing;
  return v_msg;
end $$;

create or replace function public.ava_complete_assigned_todo(p_todo_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_todo public.ava_todos%rowtype; v_name text;
begin
  select * into v_todo from public.ava_todos where id=p_todo_id and user_id=auth.uid();
  if not found then raise exception 'Aufgabe nicht gefunden'; end if;
  update public.ava_todos set status='done',completed_at=now() where id=p_todo_id;
  if v_todo.assigned_by is not null then
    select display_name into v_name from public.ava_team_members where user_id=auth.uid();
    insert into public.ava_notifications(user_id,kind,title,body,source_key,scheduled_for)
    values(v_todo.assigned_by,'team_done',coalesce(v_name,'Kollege')||' hat deine Aufgabe erledigt',v_todo.title,'team-done-'||p_todo_id::text,now())
    on conflict(user_id,kind,source_key) do nothing;
  end if;
end $$;
