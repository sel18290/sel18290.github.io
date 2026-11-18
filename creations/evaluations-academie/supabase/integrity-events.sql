-- Migration déployée : cortex_integrity_event_read_only (Supabase Paris)
-- Journal minimal d'événements, réservé à un futur moteur élève vérifiant la session côté serveur.
-- Aucun identifiant de navigateur, contenu de presse-papiers, image ou score de fraude.
create table if not exists public.cortex_integrity_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references public.cortex_teacher_assessments(id) on delete cascade,
  class_id uuid references public.cortex_teacher_classes(id) on delete set null,
  roster_number smallint not null check (roster_number between 1 and 60),
  kind text not null check (kind in ('paste_blocked','copy_blocked','tab_hidden')),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 3600000),
  occurred_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
create index if not exists cortex_integrity_events_teacher_date on public.cortex_integrity_events(teacher_id,occurred_at desc);
create index if not exists cortex_integrity_events_assessment on public.cortex_integrity_events(assessment_id);
create index if not exists cortex_integrity_events_class on public.cortex_integrity_events(class_id);
alter table public.cortex_integrity_events enable row level security;
revoke all on public.cortex_integrity_events from anon,authenticated;
grant select on public.cortex_integrity_events to authenticated;
drop policy if exists cortex_integrity_events_teacher_read on public.cortex_integrity_events;
create policy cortex_integrity_events_teacher_read on public.cortex_integrity_events
for select to authenticated
using (teacher_id=(select auth.uid()) and exists (
 select 1 from public.cortex_teacher_assessments a
 where a.id=assessment_id and a.teacher_id=(select auth.uid())
));
-- Pas de politique INSERT / UPDATE / DELETE pour le navigateur. Ces opérations
-- nécessitent un futur service authentifié qui vérifiera l'identité de l'élève.
