-- Contacts de page éphémères, supprimés avec le brouillon à la remise.
create table if not exists public.cortex_exam_presence (
  assessment_id uuid not null,
  student_number integer not null,
  page_id uuid not null,
  state text not null check (state in ('visible', 'hidden', 'left')),
  sequence integer not null check (sequence > 0),
  state_since timestamptz not null,
  seen_at timestamptz not null,
  primary key (assessment_id, student_number, page_id),
  foreign key (assessment_id, student_number)
    references public.cortex_academy_attempts (assessment_id, student_number) on delete cascade
);
alter table public.cortex_exam_presence enable row level security;
revoke all on public.cortex_exam_presence from public, anon, authenticated;
grant select, insert, update, delete on public.cortex_exam_presence to service_role;

alter table public.cortex_integrity_events
  drop constraint if exists cortex_integrity_events_kind_check,
  add constraint cortex_integrity_events_kind_check
    check (kind in ('paste_blocked','copy_blocked','tab_hidden','parallel_access')) not valid;
alter table public.cortex_integrity_events validate constraint cortex_integrity_events_kind_check;

create or replace function public.cortex_exam_parallel_contacts(
  p_exam uuid, p_student integer, p_now timestamptz
) returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.cortex_exam_presence a
    join public.cortex_exam_presence b using (assessment_id, student_number)
    where a.assessment_id = p_exam and a.student_number = p_student and a.page_id < b.page_id
      and a.state = 'visible' and b.state = 'visible'
      and least(a.seen_at, b.seen_at) > p_now - interval '50 seconds'
      -- Deux séries de contacts visibles se recoupent. Un rechargement donne deux séries successives.
      and greatest(a.state_since, b.state_since) < least(a.seen_at, b.seen_at)
  );
$$;

create or replace function public.cortex_report_exam_presence(
  p_exam uuid, p_student integer, p_page uuid, p_state text, p_sequence integer
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare
  exam record;
  received_at timestamptz;
  already_parallel boolean;
  written integer;
begin
  -- Sérialiser seulement les contacts du même numéro, indépendamment de la sauvegarde de copie.
  perform pg_advisory_xact_lock(hashtextextended('cortex-presence:' || p_exam || ':' || p_student, 0));
  received_at := clock_timestamp();
  select e.teacher_id, e.class_id into exam
    from public.cortex_teacher_assessments e
    join public.cortex_academy_access a on a.assessment_id = e.id and a.teacher_id = e.teacher_id
    join public.cortex_academy_attempts d on d.assessment_id = e.id and d.student_number = p_student
    left join public.cortex_academy_class_roster r on r.class_id = e.class_id and r.student_number = p_student
    where e.id = p_exam and e.published and a.active and d.deadline_at > received_at
      and (r.assignment_released_at is null or d.started_at >= r.assignment_released_at)
      and e.content->'antiCheat' @> '{"enabled":true,"trackLive":true}'::jsonb;
  if not found then return false; end if;

  already_parallel := p_state = 'visible' and public.cortex_exam_parallel_contacts(p_exam, p_student, received_at);
  insert into public.cortex_exam_presence as previous
    (assessment_id, student_number, page_id, state, sequence, state_since, seen_at)
    values (p_exam, p_student, p_page, p_state, p_sequence, received_at, received_at)
  on conflict (assessment_id, student_number, page_id) do update set
    state = excluded.state,
    sequence = excluded.sequence,
    state_since = case
      when previous.state = excluded.state and (excluded.state <> 'visible' or
        previous.seen_at > received_at - interval '50 seconds')
      then previous.state_since else received_at end,
    seen_at = received_at
  where previous.sequence < excluded.sequence;
  get diagnostics written = row_count;

  if written > 0 and p_state = 'visible' and not already_parallel
    and public.cortex_exam_parallel_contacts(p_exam, p_student, received_at)
  then
    insert into public.cortex_integrity_events (teacher_id, assessment_id, class_id, roster_number, kind, occurred_at)
      values (exam.teacher_id, p_exam, exam.class_id, p_student, 'parallel_access', received_at);
  end if;
  return written > 0;
exception when foreign_key_violation then
  -- La copie a pu être remise pendant la réception du dernier contact.
  return false;
end;
$$;

create or replace function public.cortex_read_exam_presence(p_exam uuid, p_teacher uuid)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with exam as (
    select e.id, e.class_id, coalesce(a.active, false) as active,
      coalesce(e.content->'antiCheat' @> '{"enabled":true,"trackLive":true}'::jsonb, false) as enabled,
      case when jsonb_typeof(e.content->'questions') = 'array'
        then greatest(1, least(40, jsonb_array_length(e.content->'questions'))) else 1 end as question_count
    from public.cortex_teacher_assessments e
    left join public.cortex_academy_access a on a.assessment_id = e.id and a.teacher_id = e.teacher_id
    where e.id = p_exam and e.teacher_id = p_teacher and e.published
  ), entries as (
    select d.student_number, case
      when d.deadline_at <= statement_timestamp() then 'finalizing'
      when not e.active then 'closed'
      when p.seen_at is null then 'waiting'
      when p.state = 'left' then 'left'
      when p.seen_at <= statement_timestamp() - interval '50 seconds' then 'stale'
      else p.state end as state,
      e.active and d.deadline_at > statement_timestamp() and
        public.cortex_exam_parallel_contacts(p_exam, d.student_number, statement_timestamp()) as parallel,
      least(e.question_count, (select count(*) from jsonb_each_text(d.answers) a where btrim(a.value) <> '')) as answered,
      e.question_count, d.started_at, p.state_since, p.seen_at,
      p.state as last_state, null::timestamptz as submitted_at, false as auto_submitted
    from exam e
    join public.cortex_academy_attempts d on d.assessment_id = e.id
    left join public.cortex_academy_class_roster r on r.class_id = e.class_id and r.student_number = d.student_number
    left join lateral (
      select c.state, c.state_since, c.seen_at from public.cortex_exam_presence c
      where c.assessment_id = e.id and c.student_number = d.student_number
      order by (c.state = 'visible' and c.seen_at > statement_timestamp() - interval '50 seconds') desc,
        c.seen_at desc limit 1
    ) p on true
    where e.enabled and (r.assignment_released_at is null or d.started_at >= r.assignment_released_at)
      and not exists (select 1 from public.cortex_academy_submissions s
        where s.assessment_id = e.id and s.student_number = d.student_number)
    union all
    select s.student_number, 'submitted', false, null, null, null, null, null, null, s.submitted_at, s.auto_submitted
    from exam e join public.cortex_academy_submissions s on s.assessment_id = e.id and s.teacher_id = p_teacher
    where e.enabled
  )
  select jsonb_build_object(
    'enabled', coalesce((select enabled from exam), false),
    'observed_at', statement_timestamp(),
    'entries', coalesce((select jsonb_agg(to_jsonb(entries) order by student_number) from entries), '[]'::jsonb)
  );
$$;

revoke all on function public.cortex_exam_parallel_contacts(uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.cortex_report_exam_presence(uuid, integer, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.cortex_read_exam_presence(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cortex_exam_parallel_contacts(uuid, integer, timestamptz) to service_role;
grant execute on function public.cortex_report_exam_presence(uuid, integer, uuid, text, integer) to service_role;
grant execute on function public.cortex_read_exam_presence(uuid, uuid) to service_role;
