-- AVA 1.6.0 – automatisierte Verkaufsakte / Aufgabensteuerung

alter table public.ava_tasks
  add column if not exists managed_by_ava boolean not null default false;

alter table public.ava_tasks
  add column if not exists automation_key text;

create unique index if not exists ava_tasks_unique_open_automation
on public.ava_tasks(owner_id,customer_id,automation_key)
where status='open' and automation_key is not null;

-- Bestehende bekannte Prozessaufgaben als AVA-Aufgaben markieren.
update public.ava_tasks
set managed_by_ava=true,
    automation_key=case
      when lower(title) like '%nachkontakt angebot%' then 'offer_followup'
      when lower(title) like '%lieferstatus%' then 'delivery_status'
      when lower(title) like '%zulassungsunterlagen%' then 'registration_docs'
      when lower(title) like '%zulassungsanträge%' then 'registration_sign'
      when lower(title) like '%abholtermin%' then 'delivery_schedule'
      when lower(title) like '%nachkontakt ausliefer%' then 'delivery_followup'
      else automation_key
    end
where automation_key is null
  and (
    lower(title) like '%nachkontakt angebot%' or
    lower(title) like '%lieferstatus%' or
    lower(title) like '%zulassungsunterlagen%' or
    lower(title) like '%zulassungsanträge%' or
    lower(title) like '%abholtermin%' or
    lower(title) like '%nachkontakt ausliefer%'
  );

-- Doppelte offene Automationsaufgaben bereinigen.
with ranked as (
  select id,row_number() over(
    partition by owner_id,customer_id,automation_key
    order by due_at asc nulls last,created_at asc
  ) rn
  from public.ava_tasks
  where status='open' and automation_key is not null
)
delete from public.ava_tasks t
using ranked r
where t.id=r.id and r.rn>1;

create or replace function public.ava_upsert_automated_task(
  p_customer_id uuid,
  p_key text,
  p_type text,
  p_title text,
  p_details text,
  p_due_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_id uuid;
begin
  if not exists(select 1 from public.ava_customers where id=p_customer_id and owner_id=v_uid)
    then raise exception 'KUNDE_NICHT_GEFUNDEN'; end if;

  select id into v_id
  from public.ava_tasks
  where owner_id=v_uid and customer_id=p_customer_id and automation_key=p_key and status='open'
  order by created_at asc limit 1;

  if v_id is null then
    insert into public.ava_tasks(owner_id,assigned_to,customer_id,type,title,details,due_at,status,managed_by_ava,automation_key)
    values(v_uid,v_uid,p_customer_id,p_type,p_title,p_details,p_due_at,'open',true,p_key)
    returning id into v_id;
  else
    update public.ava_tasks
    set type=p_type,title=p_title,details=p_details,due_at=p_due_at,managed_by_ava=true
    where id=v_id;
  end if;
  return v_id;
end $$;

grant execute on function public.ava_upsert_automated_task(uuid,text,text,text,text,timestamptz) to authenticated;

create or replace function public.ava_handle_automated_task(p_task_id uuid,p_action text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_task public.ava_tasks%rowtype;
  v_customer public.ava_customers%rowtype;
  v_next timestamptz;
begin
  select * into v_task from public.ava_tasks
  where id=p_task_id and (owner_id=v_uid or assigned_to=v_uid) and status='open'
  for update;
  if not found then raise exception 'AUFGABE_NICHT_GEFUNDEN'; end if;

  select * into v_customer from public.ava_customers where id=v_task.customer_id;

  if p_action='not_reached' then
    v_next:=now()+interval '1 day';
    update public.ava_tasks set due_at=v_next where id=v_task.id;
    insert into public.ava_history(customer_id,actor_id,action,details)
    values(v_task.customer_id,v_uid,'Kunde nicht erreicht',v_task.title||' · neuer Versuch morgen');
    return;
  end if;

  update public.ava_tasks set status='done',completed_at=now() where id=v_task.id;

  insert into public.ava_history(customer_id,actor_id,action,details)
  values(v_task.customer_id,v_uid,
    case when p_action='reached' then 'Kunde erreicht' else 'AVA-Aufgabe erledigt' end,
    v_task.title);

  -- Lieferstatus: bei erfolgreichem Kontakt automatisch +21 Tage neu planen,
  -- solange das Fahrzeug noch nicht als eingetroffen bestätigt wurde.
  if p_action='reached' and v_task.automation_key='delivery_status'
     and coalesce(v_customer.sales_process_step,'ordered')='ordered' then
    perform public.ava_upsert_automated_task(
      v_task.customer_id,'delivery_status','delivery_update',
      'Lieferstatus mit Kunde besprechen',
      coalesce(v_customer.name,'Kunde')||' über den aktuellen Lieferstand informieren.',
      now()+interval '21 days'
    );
  end if;

  -- Angebots-Nachkontakt: nach erfolgreichem Kontakt wartet AVA auf die Kundenentscheidung.
  if p_action='reached' and v_task.automation_key='offer_followup' then
    update public.ava_customers set waiting_on_customer=true where id=v_task.customer_id;
  end if;
end $$;

grant execute on function public.ava_handle_automated_task(uuid,text) to authenticated;

-- Angebotsworkflow auf idempotente AVA-Aufgabe umstellen.
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
begin
  select * into v_customer from public.ava_customers
  where id=p_customer_id and owner_id=v_uid for update;

  if not found then raise exception 'KUNDE_NICHT_GEFUNDEN'; end if;
  if v_customer.customer_kind='buyer' or v_customer.stage in ('ordered','customer','sold','delivery')
    then raise exception 'KUNDE_HAT_BEREITS_GEKAUFT'; end if;

  update public.ava_customers
  set offer_sent_at=now(),stage='offer',waiting_on_customer=false
  where id=p_customer_id;

  perform public.ava_upsert_automated_task(
    p_customer_id,'offer_followup','offer','Nachkontakt Angebot',
    v_customer.name||
      case when nullif(v_customer.vehicle_interest,'') is not null then ' · '||v_customer.vehicle_interest else '' end,
    v_due
  );

  insert into public.ava_history(customer_id,actor_id,action,details)
  values(p_customer_id,v_uid,'Angebot versendet','AVA plant automatisch den Nachkontakt in 2 Tagen.');
end $$;

-- Kauf: offene Verkaufsaufgaben schließen, dann 21-Tage-Lieferstatus automatisch starten.
create or replace function public.ava_mark_purchase(p_customer_id uuid,p_customer_number text,p_vehicle text,p_ordered_at date)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_name text;
begin
  if nullif(trim(p_customer_number),'') is null then raise exception 'KUNDENNUMMER_REQUIRED'; end if;

  update public.ava_customers
  set customer_number=trim(p_customer_number),purchased_vehicle=p_vehicle,ordered_at=p_ordered_at,
      stage='ordered',customer_kind='buyer',sales_process_step='ordered',waiting_on_customer=false
  where id=p_customer_id and owner_id=v_uid
  returning name into v_name;

  if not found then raise exception 'KUNDE_NICHT_GEFUNDEN'; end if;

  update public.ava_tasks set status='done',completed_at=now()
  where customer_id=p_customer_id and status='open'
    and (owner_id=v_uid or assigned_to=v_uid);

  perform public.ava_upsert_automated_task(
    p_customer_id,'delivery_status','delivery_update','Lieferstatus mit Kunde besprechen',
    coalesce(v_name,'Kunde')||' über den aktuellen Lieferstand informieren.',
    now()+interval '21 days'
  );

  insert into public.ava_history(customer_id,actor_id,action,details)
  values(p_customer_id,v_uid,'Fahrzeug bestellt',p_vehicle||' · erster Lieferstatus-Kontakt automatisch in 21 Tagen');
end $$;

-- Prozessschritte: vorherige AVA-Aufgabe schließen, nächste automatisch erzeugen.
create or replace function public.ava_advance_sales_process(p_customer_id uuid,p_next_step text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_current text;
  v_name text;
  v_vehicle text;
  v_allowed boolean:=false;
begin
  select sales_process_step,name,coalesce(purchased_vehicle,vehicle_interest,'Fahrzeug')
  into v_current,v_name,v_vehicle
  from public.ava_customers
  where id=p_customer_id and owner_id=v_uid
  for update;
  if not found then raise exception 'KUNDE_NICHT_GEFUNDEN'; end if;

  v_current:=coalesce(v_current,'ordered');
  v_allowed :=
    (v_current='ordered' and p_next_step='vehicle_arrived') or
    (v_current='vehicle_arrived' and p_next_step='registration_docs_ready') or
    (v_current='registration_docs_ready' and p_next_step='registration_signed') or
    (v_current='registration_signed' and p_next_step='registration_complete');

  if not v_allowed then raise exception 'UNGUELTIGER_PROZESSSCHRITT'; end if;

  update public.ava_customers set sales_process_step=p_next_step where id=p_customer_id;

  if p_next_step='vehicle_arrived' then
    update public.ava_tasks set status='done',completed_at=now()
    where customer_id=p_customer_id and status='open' and automation_key='delivery_status';
    perform public.ava_upsert_automated_task(
      p_customer_id,'registration_docs','registration',
      'Zulassungsunterlagen anfordern',
      v_name||' wegen Unterlagen für die Zulassung kontaktieren · '||v_vehicle,now()
    );
  elsif p_next_step='registration_docs_ready' then
    update public.ava_tasks set status='done',completed_at=now()
    where customer_id=p_customer_id and status='open' and automation_key='registration_docs';
    perform public.ava_upsert_automated_task(
      p_customer_id,'registration_sign','registration',
      'Zulassungsanträge unterschreiben lassen',
      'Termin mit '||v_name||' für die Unterschrift der Zulassungsanträge abstimmen.',now()
    );
  elsif p_next_step='registration_signed' then
    update public.ava_tasks set status='done',completed_at=now()
    where customer_id=p_customer_id and status='open' and automation_key='registration_sign';
  elsif p_next_step='registration_complete' then
    perform public.ava_upsert_automated_task(
      p_customer_id,'delivery_schedule','delivery',
      'Abholtermin vereinbaren',
      'Fahrzeug ist zugelassen · Abholtermin mit '||v_name||' vereinbaren.',now()
    );
  end if;

  insert into public.ava_history(customer_id,actor_id,action,details)
  values(p_customer_id,v_uid,
    case p_next_step
      when 'vehicle_arrived' then 'Fahrzeug eingetroffen'
      when 'registration_docs_ready' then 'Zulassungsunterlagen vollständig'
      when 'registration_signed' then 'Zulassungsanträge unterschrieben'
      when 'registration_complete' then 'Fahrzeug zugelassen'
    end,
    v_vehicle);
end $$;
