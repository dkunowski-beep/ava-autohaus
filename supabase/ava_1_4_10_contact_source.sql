-- AVA 1.4.10 – Kontaktquelle
alter table public.ava_customers
  add column if not exists contact_source text;

alter table public.ava_customers
  drop constraint if exists ava_customers_contact_source_check;

alter table public.ava_customers
  add constraint ava_customers_contact_source_check
  check (
    contact_source is null or contact_source in (
      'showroom','online','phone','referral','email',
      'manufacturer','existing','event','social','other'
    )
  );

comment on column public.ava_customers.contact_source is
'Quelle des Erstkontakts: showroom, online, phone, referral, email, manufacturer, existing, event, social, other';
