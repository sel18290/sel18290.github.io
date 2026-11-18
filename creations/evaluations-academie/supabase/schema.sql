-- CORTEX Académie — schéma de départ déployé sur CORTEX Evaluations Paris (eu-west-3)
-- IMPORTANT : activer d'abord Auth -> Email -> Confirm Email + SMTP personnalisé.
-- Aucun nom/prénom d'élève ni INE n'est requis dans ces tables.
-- Ce schéma est volontairement fermé aux accès élèves/anon :
-- l'intégration sécurisée du parcours élève requiert une étape dédiée.

begin;

create schema if not exists cortex_private;
revoke all on schema cortex_private from public;
revoke all on schema cortex_private from anon, authenticated;

-- Barrière d’inscription exécutée par PostgreSQL ; ne pas s'appuyer
-- uniquement sur la validation JavaScript du navigateur.
create or replace function cortex_private.require_ac_paris_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is null
     or lower(btrim(new.email)) !~ '^[a-z0-9._%+\-]+@ac-paris[.]fr$' then
    raise exception 'Inscription réservée aux adresses @ac-paris.fr'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists cortex_academy_email_required on auth.users;
create trigger cortex_academy_email_required
before insert or update of email on auth.users
for each row execute function cortex_private.require_ac_paris_email();

create table if not exists public.cortex_teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (lower(email) ~ '^[a-z0-9._%+\-]+@ac-paris[.]fr$'),
  created_at timestamptz not null default now()
);
alter table public.cortex_teacher_profiles enable row level security;
revoke all on public.cortex_teacher_profiles from anon;
grant select on public.cortex_teacher_profiles to authenticated;
drop policy if exists cortex_profile_read_self on public.cortex_teacher_profiles;
create policy cortex_profile_read_self on public.cortex_teacher_profiles
for select to authenticated
using (user_id = (select auth.uid()));

-- Le propriétaire seulement peut voir/modifier ses données.
-- Ce sont les supports "enseignants" du futur moteur synchronisé.
create table if not exists public.cortex_teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (char_length(code) between 1 and 40),
  display_name text not null check (char_length(display_name) between 1 and 80),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (teacher_id,code)
);
create index if not exists cortex_teacher_classes_owner on public.cortex_teacher_classes(teacher_id);
alter table public.cortex_teacher_classes enable row level security;
revoke all on public.cortex_teacher_classes from anon;
grant select,insert,update,delete on public.cortex_teacher_classes to authenticated;
drop policy if exists cortex_teacher_classes_select on public.cortex_teacher_classes;
create policy cortex_teacher_classes_select on public.cortex_teacher_classes
for select to authenticated using (teacher_id=(select auth.uid()));
drop policy if exists cortex_teacher_classes_insert on public.cortex_teacher_classes;
create policy cortex_teacher_classes_insert on public.cortex_teacher_classes
for insert to authenticated with check (teacher_id=(select auth.uid()));
drop policy if exists cortex_teacher_classes_update on public.cortex_teacher_classes;
create policy cortex_teacher_classes_update on public.cortex_teacher_classes
for update to authenticated
using (teacher_id=(select auth.uid()))
with check (teacher_id=(select auth.uid()));
drop policy if exists cortex_teacher_classes_delete on public.cortex_teacher_classes;
create policy cortex_teacher_classes_delete on public.cortex_teacher_classes
for delete to authenticated using (teacher_id=(select auth.uid()));

create table if not exists public.cortex_teacher_assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.cortex_teacher_classes(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  content jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cortex_teacher_assessments_owner on public.cortex_teacher_assessments(teacher_id);
alter table public.cortex_teacher_assessments enable row level security;
revoke all on public.cortex_teacher_assessments from anon;
grant select,insert,update,delete on public.cortex_teacher_assessments to authenticated;
drop policy if exists cortex_teacher_assessments_select on public.cortex_teacher_assessments;
create policy cortex_teacher_assessments_select on public.cortex_teacher_assessments
for select to authenticated using (teacher_id=(select auth.uid()));
drop policy if exists cortex_teacher_assessments_insert on public.cortex_teacher_assessments;
create policy cortex_teacher_assessments_insert on public.cortex_teacher_assessments
for insert to authenticated
with check (
 teacher_id=(select auth.uid())
 and (class_id is null or exists (
   select 1 from public.cortex_teacher_classes c
   where c.id=class_id and c.teacher_id=(select auth.uid())
 ))
);
drop policy if exists cortex_teacher_assessments_update on public.cortex_teacher_assessments;
create policy cortex_teacher_assessments_update on public.cortex_teacher_assessments
for update to authenticated using (teacher_id=(select auth.uid()))
with check (
 teacher_id=(select auth.uid())
 and (class_id is null or exists (
   select 1 from public.cortex_teacher_classes c
   where c.id=class_id and c.teacher_id=(select auth.uid())
 ))
);
drop policy if exists cortex_teacher_assessments_delete on public.cortex_teacher_assessments;
create policy cortex_teacher_assessments_delete on public.cortex_teacher_assessments
for delete to authenticated using (teacher_id=(select auth.uid()));

-- AUCUNE table "student_pins" ouverte à l’API, aucun accès direct
-- aux copies élèves depuis anon. La boucle examen/copie demandera
-- des endpoints authentifiés serveur et une politique de conservation.
-- Ne pas déposer de copies réelles avant validation institutionnelle.

create or replace function cortex_private.create_teacher_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.cortex_teacher_profiles (user_id,email)
  values (new.id,lower(new.email))
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists cortex_after_auth_signup on auth.users;
create trigger cortex_after_auth_signup
after insert or update of email on auth.users
for each row execute function cortex_private.create_teacher_profile();

revoke all on function cortex_private.require_ac_paris_email() from public,anon,authenticated;
revoke all on function cortex_private.create_teacher_profile() from public,anon,authenticated;

commit;

-- À vérifier après migration :
-- select schemaname,tablename,rowsecurity
-- from pg_tables where schemaname='public' and tablename like 'cortex_%';
-- puis analyser les Security Advisors du dashboard Supabase.
