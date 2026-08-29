-- AVA 1.5.1 – Angebot versendet -> genau ein automatischer Nachkontakt
alter table public.ava_customers
  add column if not exists offer_sent_at timestamptz;

create or replace function public.ava_mark_offer_sent(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_customer public.ava_customers%rowtype;
  v_due timestamptz:=now()+interval '2 days';
  v_keep uuid;
begin
  select * into v_customer
  from public.ava_customers
  where id=p_customer_id and owner_id=v_uid
  for update;

  if not found then raise exception 'KUNDE_NICHT_GEFUNDEN'; end if;
  if v_customer.customer_kind='buyer' or v_customer.stage in ('ordered','customer','sold','delivery') then
    raise exception 'KUNDE_HAT_BEREITS_GEKAUFT';
  end if;

  update public.ava_customers
  set offer_sent_at=now(), stage='offer'
  where id=p_customer_id and owner_id=v_uid;

  -- Falls durch frühere Doppel-Klicks mehrere offene Angebots-Follow-ups existieren:
  -- einen behalten, alle weiteren entfernen.
  select id into v_keep
  from public.ava_tasks
  where owner_id=v_uid
    and customer_id=p_customer_id
    and status='open'
    and (type='offer' or lower(title) like '%nachkontakt angebot%')
  order by due_at asc, created_at asc
  limit 1;

  if v_keep is not null then
    delete from public.ava_tasks
    where owner_id=v_uid
      and customer_id=p_customer_id
      and status='open'
      and (type='offer' or lower(title) like '%nachkontakt angebot%')
      and id<>v_keep;

    update public.ava_tasks
    set type='offer',
        title='Nachkontakt Angebot',
        details=v_customer.name||
          case when nullif(v_customer.vehicle_interest,'') is not null then ' · '||v_customer.vehicle_interest else '' end,
        due_at=v_due
    where id=v_keep;
  else
    insert into public.ava_tasks(owner_id,customer_id,type,title,details,due_at,status)
    values(
      v_uid,p_customer_id,'offer','Nachkontakt Angebot',
      v_customer.name||
        case when nullif(v_customer.vehicle_interest,'') is not null then ' · '||v_customer.vehicle_interest else '' end,
      v_due,'open'
    );
  end if;

  insert into public.ava_history(customer_id,actor_id,action,details)
  values(p_customer_id,v_uid,'Angebot versendet','Automatischer Nachkontakt geplant für '||to_char(v_due at time zone 'Europe/Berlin','DD.MM.YYYY HH24:MI'));
end
$$;

grant execute on function public.ava_mark_offer_sent(uuid) to authenticated;

-- Einmalige Bereinigung bereits vorhandener doppelter offener Angebots-Nachkontakte:
with ranked as (
  select id,
         row_number() over (
           partition by owner_id,customer_id
           order by due_at asc nulls last,created_at asc
         ) as rn
  from public.ava_tasks
  where status='open'
    and (type='offer' or lower(title) like '%nachkontakt angebot%')
)
delete from public.ava_tasks t
using ranked r
where t.id=r.id and r.rn>1;
