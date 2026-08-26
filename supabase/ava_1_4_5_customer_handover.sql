-- AVA 1.4.5 – echte Kunden-/Interessentenübergabe
create or replace function public.ava_handover_customer(p_customer_id uuid,p_recipient_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sender uuid := auth.uid();
  v_customer public.ava_customers%rowtype;
  v_sender_name text;
  v_recipient_name text;
  v_msg uuid;
begin
  if v_sender is null then raise exception 'Nicht angemeldet'; end if;
  if p_recipient_id is null or p_recipient_id=v_sender then raise exception 'Ungültiger Empfänger'; end if;

  select * into v_customer
  from public.ava_customers
  where id=p_customer_id and owner_id=v_sender;
  if not found then raise exception 'Kundenakte nicht gefunden oder nicht deine Kundenakte'; end if;

  select display_name into v_sender_name from public.ava_team_members where user_id=v_sender and active=true;
  select display_name into v_recipient_name from public.ava_team_members where user_id=p_recipient_id and active=true;
  if v_recipient_name is null then raise exception 'Kollege nicht gefunden oder nicht aktiv'; end if;

  -- ownership of the actual customer record changes
  update public.ava_customers set owner_id=p_recipient_id where id=p_customer_id;

  -- customer-bound events/documents follow the new responsible colleague where applicable
  update public.ava_events set owner_id=p_recipient_id where customer_id=p_customer_id and owner_id=v_sender;
  update public.ava_documents set owner_id=p_recipient_id where customer_id=p_customer_id and owner_id=v_sender;

  -- open customer tasks follow the customer
  update public.ava_tasks
     set assigned_to=p_recipient_id
   where customer_id=p_customer_id
     and assigned_to=v_sender
     and coalesce(status,'open') <> 'done';

  -- permanent audit trail
  insert into public.ava_history(customer_id,actor_id,action,details)
  values(
    p_customer_id,
    v_sender,
    'Kundenübergabe',
    'Von '||coalesce(v_sender_name,'Kollege')||' an '||v_recipient_name||' übergeben'
  );

  -- team message + in-app notification; existing push pipeline can deliver it
  insert into public.ava_team_messages(sender_id,recipient_id,body,message_type)
  values(
    v_sender,
    p_recipient_id,
    coalesce(v_customer.name,'Kunde')||
      case when nullif(v_customer.vehicle_interest,'') is not null then ' · '||v_customer.vehicle_interest else '' end||
      ' wurde an dich übergeben.',
    'handover'
  ) returning id into v_msg;

  insert into public.ava_notifications(user_id,kind,title,body,source_key,scheduled_for)
  values(
    p_recipient_id,
    'team',
    'Kundenübergabe von '||coalesce(v_sender_name,'Kollege'),
    coalesce(v_customer.name,'Kunde')||
      case when nullif(v_customer.vehicle_interest,'') is not null then ' · '||v_customer.vehicle_interest else '' end,
    'handover-'||p_customer_id::text||'-'||v_msg::text,
    now()
  )
  on conflict(user_id,kind,source_key) do nothing;
end
$$;

grant execute on function public.ava_handover_customer(uuid,uuid) to authenticated;
