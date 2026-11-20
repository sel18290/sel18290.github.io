create extension if not exists pg_cron;

alter table public.cortex_academy_submissions
  add column if not exists auto_submitted boolean not null default false,
  add column if not exists attempt_started_at timestamptz;

alter table public.cortex_academy_class_roster
  add column if not exists assignment_released_at timestamptz;

create table if not exists public.cortex_academy_attempts (
  assessment_id uuid not null references public.cortex_academy_access(assessment_id) on delete cascade,
  student_number integer not null check (student_number between 1 and 60),
  started_at timestamptz not null,
  deadline_at timestamptz not null,
  answers jsonb not null default '{}'::jsonb,
  revision integer not null default 0,
  file_path text,
  file_name text,
  primary key (assessment_id, student_number)
);

create index if not exists cortex_academy_attempts_deadline
  on public.cortex_academy_attempts (deadline_at);
alter table public.cortex_academy_attempts enable row level security;
revoke all on public.cortex_academy_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.cortex_academy_attempts to service_role;

create or replace function public.cortex_record_attempt(
  p_assessment uuid, p_student integer, p_action text,
  p_answers jsonb default null, p_revision integer default null,
  p_file_path text default null, p_file_name text default null,
  p_remove_file boolean default false
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  attempt public.cortex_academy_attempts%rowtype;
  exam record;
  received_at timestamptz := clock_timestamp();
  duration_minutes numeric;
  expired boolean;
  replaced_file text;
begin
  if p_action not in ('start', 'save', 'submit') then
    raise exception 'Unknown attempt action';
  end if;

  select a.teacher_id, a.active, e.published, e.content->>'duration' as duration
    into exam
    from public.cortex_academy_access a
    join public.cortex_teacher_assessments e on e.id = a.assessment_id and e.teacher_id = a.teacher_id
    where a.assessment_id = p_assessment;
  if not found then return jsonb_build_object('status', 'closed'); end if;

  -- A legacy client can still submit a copy opened before the migration.
  if p_action in ('start', 'submit') and exam.active and exam.published then
    duration_minutes := case when exam.duration ~ '^[0-9]{1,8}([.][0-9]{1,4})?$'
      then least(240, greatest(5, nullif(exam.duration::numeric, 0))) else 60 end;
    if exam.duration ~ '^0+([.]0+)?$' then duration_minutes := 60; end if;
    insert into public.cortex_academy_attempts (assessment_id, student_number, started_at, deadline_at)
      select p_assessment, p_student, received_at, received_at + make_interval(secs => (duration_minutes * 60)::double precision)
      where not exists (
        select 1 from public.cortex_academy_submissions
        where assessment_id = p_assessment and student_number = p_student
      )
      on conflict (assessment_id, student_number) do nothing;
  end if;

  select * into attempt from public.cortex_academy_attempts
    where assessment_id = p_assessment and student_number = p_student for update;

  if exists (select 1 from public.cortex_academy_submissions
      where assessment_id = p_assessment and student_number = p_student) then
    delete from public.cortex_academy_attempts where assessment_id = p_assessment and student_number = p_student;
    return jsonb_build_object('status', 'submitted');
  end if;
  if attempt.assessment_id is null or not (exam.active and exam.published) then
    return jsonb_build_object('status', 'closed');
  end if;

  expired := received_at >= attempt.deadline_at;
  if not expired and p_action <> 'start' then
    if p_revision is distinct from attempt.revision and (p_action = 'save' or p_revision is not null) then
      return jsonb_build_object('status', 'conflict', 'revision', attempt.revision,
        'answers', attempt.answers, 'file_name', attempt.file_name);
    end if;
    if p_file_path is not null or p_remove_file then
      replaced_file := attempt.file_path;
      attempt.file_path := p_file_path;
      attempt.file_name := p_file_name;
    end if;
    attempt.answers := p_answers;
    attempt.revision := attempt.revision + 1;
  end if;

  if expired or p_action = 'submit' then
    insert into public.cortex_academy_submissions
      (assessment_id, teacher_id, student_number, answers, file_path, file_name, submitted_at, auto_submitted, attempt_started_at)
      values (p_assessment, exam.teacher_id, p_student, attempt.answers, attempt.file_path, attempt.file_name,
        case when expired then attempt.deadline_at else received_at end, expired, attempt.started_at)
      on conflict (assessment_id, student_number) do nothing;
    delete from public.cortex_academy_attempts
      where assessment_id = p_assessment and student_number = p_student;
    return jsonb_build_object('status', 'submitted', 'accepted_file', not expired and p_file_path is not null,
      'replaced_file', replaced_file);
  end if;

  if p_action = 'save' then
    update public.cortex_academy_attempts set answers = attempt.answers, revision = attempt.revision,
      file_path = attempt.file_path, file_name = attempt.file_name
      where assessment_id = p_assessment and student_number = p_student;
  end if;

  return jsonb_build_object('status', 'open', 'started_at', attempt.started_at,
    'deadline_at', attempt.deadline_at, 'answers', attempt.answers, 'revision', attempt.revision,
    'file_name', attempt.file_name, 'accepted_file', p_file_path is not null, 'replaced_file', replaced_file);
end;
$$;

create or replace function public.cortex_submit_expired_attempts()
returns void
language sql security invoker set search_path = ''
as $$
  with due as materialized (
    select d.*, a.teacher_id
    from public.cortex_academy_attempts d
    join public.cortex_academy_access a using (assessment_id)
    where d.deadline_at <= now()
    order by d.deadline_at
    limit 500
    for update of d skip locked
  ), receipts as (
    insert into public.cortex_academy_submissions
      (assessment_id, teacher_id, student_number, answers, file_path, file_name, submitted_at, auto_submitted, attempt_started_at)
    select assessment_id, teacher_id, student_number, answers, file_path, file_name, deadline_at, true, started_at from due
    on conflict (assessment_id, student_number) do nothing
  )
  delete from public.cortex_academy_attempts d using due
    where d.assessment_id = due.assessment_id and d.student_number = due.student_number;
$$;

create or replace function public.cortex_release_class_pin(
  p_teacher uuid, p_class uuid, p_student integer, p_digest text, p_remove_assignment boolean
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
begin
  update public.cortex_academy_class_roster r
    set pin_digest = p_digest, activated_at = null, pin_origin_class_id = null,
        attempts = 0, locked_until = null, updated_at = now(),
        assignment_released_at = case when p_remove_assignment then clock_timestamp() else r.assignment_released_at end,
        demi_groupe = case when p_remove_assignment then null else r.demi_groupe end
    from public.cortex_academy_class_access a
    where a.class_id = p_class and a.teacher_id = p_teacher
      and r.class_id = a.class_id and r.student_number = p_student and p_student <= a.roster_size
      and r.activated_at is not null;
  if not found then return false; end if;

  delete from public.cortex_academy_class_sessions
    where class_id = p_class and student_number = p_student;
  delete from public.cortex_academy_sessions s using public.cortex_teacher_assessments e
    where s.assessment_id = e.id and s.student_number = p_student
      and e.class_id = p_class and e.teacher_id = p_teacher;
  return true;
end;
$$;

revoke all on function public.cortex_record_attempt(uuid,integer,text,jsonb,integer,text,text,boolean) from public, anon, authenticated;
revoke all on function public.cortex_submit_expired_attempts() from public, anon, authenticated;
revoke all on function public.cortex_release_class_pin(uuid,uuid,integer,text,boolean) from public, anon, authenticated;
grant execute on function public.cortex_record_attempt(uuid,integer,text,jsonb,integer,text,text,boolean) to service_role;
grant execute on function public.cortex_release_class_pin(uuid,uuid,integer,text,boolean) to service_role;

select cron.schedule('cortex-submit-expired-attempts', '10 seconds', 'select public.cortex_submit_expired_attempts()');
