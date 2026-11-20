create table if not exists public.cortex_pfmp_hosts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.cortex_teacher_profiles(user_id) on delete cascade,
  siret text not null check (siret ~ '^[0-9]{14}$'),
  sector text not null check (sector in ('accueil', 'commerce-vente', 'gestion-administration')),
  type_id text not null check (type_id ~ '^[a-z-]{1,50}$'),
  completed_on date not null check (completed_on >= date '2000-01-01' and completed_on <= current_date),
  name text not null check (length(name) between 1 and 150),
  address text not null check (length(address) between 1 and 220),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  unique (teacher_id, siret, sector, type_id, completed_on)
);

alter table public.cortex_pfmp_hosts enable row level security;
revoke all on public.cortex_pfmp_hosts from public, anon, authenticated;
grant select, insert, update, delete on public.cortex_pfmp_hosts to service_role;

create index if not exists cortex_pfmp_hosts_search
  on public.cortex_pfmp_hosts (teacher_id, sector, type_id, lat, lon);
