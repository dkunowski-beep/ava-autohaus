-- AVA 1.5.0 – dynamischer Verkaufsprozess
alter table public.ava_customers
  add column if not exists sales_process_step text;

alter table public.ava_customers
  drop constraint if exists ava_customers_sales_process_step_check;

alter table public.ava_customers
  add constraint ava_customers_sales_process_step_check
  check (sales_process_step is null or sales_process_step in (
    'ordered','vehicle_arrived','registration_docs_ready','registration_signed',
    'registration_complete','delivery_scheduled','delivered','followup_done'
  ));

-- Bestehende Käufer sinnvoll initialisieren.
update public.ava_customers
set sales_process_step = case
  when delivered_at is not null or stage='customer' then 'delivered'
  when planned_delivery_at is not null then 'delivery_scheduled'
  when stage='ordered' then 'ordered'
  else sales_process_step
end
where sales_process_step is null and (stage in ('ordered','customer') or delivered_at is not null or planned_delivery_at is not null);

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
  from ava_customers
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

  update ava_customers set sales_process_step=p_next_step where id=p_customer_id and owner_id=v_uid;

  -- alte Lieferstatus-Aufgaben schließen, sobald das Fahrzeug da ist
  if p_next_step='vehicle_arrived' then
    update ava_tasks set status='done',completed_at=now()
    where owner_id=v_uid and customer_id=p_customer_id and status='open'
      and lower(title) like '%lieferstatus%';

    insert into ava_tasks(owner_id,customer_id,title,details,due_at,status)
    values(v_uid,p_customer_id,'Zulassungsunterlagen anfordern',
      v_name||' wegen Unterlagen für die Zulassung kontaktieren · '||v_vehicle,
      now(),'open');
  elsif p_next_step='registration_docs_ready' then
    insert into ava_tasks(owner_id,customer_id,title,details,due_at,status)
    values(v_uid,p_customer_id,'Zulassungsanträge unterschreiben lassen',
      'Termin mit '||v_name||' für die Unterschrift der Zulassungsanträge abstimmen.',
      now(),'open');
  elsif p_next_step='registration_complete' then
    insert into ava_tasks(owner_id,customer_id,title,details,due_at,status)
    values(v_uid,p_customer_id,'Abholtermin vereinbaren',
      'Fahrzeug ist zugelassen · Abholtermin mit '||v_name||' vereinbaren.',
      now(),'open');
  end if;

  insert into ava_history(customer_id,actor_id,action,details)
  values(p_customer_id,v_uid,
    case p_next_step
      when 'vehicle_arrived' then 'Fahrzeug eingetroffen'
      when 'registration_docs_ready' then 'Zulassungsunterlagen vollständig'
      when 'registration_signed' then 'Zulassungsanträge unterschrieben'
      when 'registration_complete' then 'Fahrzeug zugelassen'
    end,
    v_vehicle);
end;
$$;

grant execute on function public.ava_advance_sales_process(uuid,text) to authenticated;

-- Bestehenden Kauf-RPC automatisch in den Prozess setzen.
create or replace function public.ava_mark_purchase(p_customer_id uuid,p_customer_number text,p_vehicle text,p_ordered_at date)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_uid uuid:=auth.uid();
begin
  if nullif(trim(p_customer_number),'') is null then raise exception 'KUNDENNUMMER_REQUIRED'; end if;
  update ava_customers
  set customer_number=trim(p_customer_number),purchased_vehicle=p_vehicle,ordered_at=p_ordered_at,
      stage='ordered',customer_kind='buyer',sales_process_step='ordered'
  where id=p_customer_id and owner_id=v_uid;
  if not found then raise exception 'KUNDE_NICHT_GEFUNDEN'; end if;

  insert into ava_history(customer_id,actor_id,action,details)
  values(p_customer_id,v_uid,'Fahrzeug bestellt',p_vehicle);

  insert into ava_tasks(owner_id,customer_id,title,details,due_at,status)
  values(v_uid,p_customer_id,'Lieferstatus mit Kunde besprechen',
    'Regelmäßiges 3-Wochen-Update zum Lieferstand.',now()+interval '21 days','open');
end;
$$;

grant execute on function public.ava_mark_purchase(uuid,text,text,date) to authenticated;

-- Ergänzt bestehende Auslieferungs-RPCs um Prozessstatus.
do $$
begin
  -- kein Fehler, falls die RPCs projektspezifisch bereits anders definiert sind;
  -- App synchronisiert Kalender weiterhin zusätzlich clientseitig.
end $$;
