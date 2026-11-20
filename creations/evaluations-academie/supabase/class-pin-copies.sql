-- Consultation en lecture seule des copies par classe et numéro, depuis l'espace professeur.
create or replace function public.cortex_class_pin_copies(
  p_teacher uuid, p_class uuid, p_student integer default null, p_assessment uuid default null
)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with exams as (
    select e.id, e.title, case when p_assessment is not null then e.content->'questions' end as questions
    from public.cortex_teacher_assessments e
    join public.cortex_teacher_classes c on c.id=e.class_id and c.teacher_id=p_teacher and not c.archived
    where e.class_id=p_class and e.teacher_id=p_teacher and (p_assessment is null or e.id=p_assessment)
  ), work as (
    select s.assessment_id, s.student_number, 'submitted' as kind, s.submitted_at as recorded_at,
      coalesce(s.attempt_started_at,s.submitted_at) as started_at, s.auto_submitted,
      s.file_path is not null as has_attachment,
      case when p_assessment is not null then s.answers end as answers,
      case when p_assessment is not null then s.file_path end as file_path,
      case when p_assessment is not null then s.file_name end as file_name
    from public.cortex_academy_submissions s join exams e on e.id=s.assessment_id
    where s.teacher_id=p_teacher and (p_student is null or s.student_number=p_student)
    union all
    select d.assessment_id, d.student_number, 'draft', d.started_at, d.started_at, false,
      d.file_path is not null,
      case when p_assessment is not null then d.answers end,
      case when p_assessment is not null then d.file_path end,
      case when p_assessment is not null then d.file_name end
    from public.cortex_academy_attempts d join exams e on e.id=d.assessment_id
    where (p_student is null or d.student_number=p_student)
      and not exists (
        select 1 from public.cortex_academy_submissions s
        where s.assessment_id=d.assessment_id and s.student_number=d.student_number and s.teacher_id=p_teacher
      )
      and (d.file_path is not null or exists (
        select 1 from jsonb_each_text(case when jsonb_typeof(d.answers)='object' then d.answers else '{}'::jsonb end) a
        where a.value ~ '[^[:space:]]'
      ))
  ), copies as (
    select w.*, coalesce(w.started_at<r.assignment_released_at,false) as previous_assignment
    from work w
    left join public.cortex_academy_class_roster r on r.class_id=p_class and r.student_number=w.student_number
  )
  select coalesce(case when p_student is null then (
    select jsonb_agg(to_jsonb(t) order by t.student_number)
    from (
      select student_number,
        count(*) filter(where kind='submitted' and not previous_assignment) as submitted,
        count(*) filter(where kind='draft' and not previous_assignment) as drafts,
        count(*) filter(where previous_assignment) as previous
      from copies group by student_number
    ) t
  ) else (
    select jsonb_agg(
      jsonb_build_object('assessment_id',w.assessment_id,'title',e.title,'kind',w.kind,'recorded_at',w.recorded_at,
        'auto_submitted',w.auto_submitted,'previous_assignment',w.previous_assignment,'has_attachment',w.has_attachment)
      || case when p_assessment is not null then jsonb_build_object(
        'answers',w.answers,'questions',e.questions,'file_path',w.file_path,'file_name',w.file_name
      ) else '{}'::jsonb end
      order by w.previous_assignment,w.recorded_at desc,w.assessment_id
    )
    from copies w join exams e on e.id=w.assessment_id
  ) end,'[]'::jsonb);
$$;

revoke all on function public.cortex_class_pin_copies(uuid, uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.cortex_class_pin_copies(uuid, uuid, integer, uuid) to service_role;
