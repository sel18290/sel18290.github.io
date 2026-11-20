alter table public.cortex_academy_class_sessions add column if not exists session_id uuid not null default gen_random_uuid();
alter table public.cortex_academy_sessions add column if not exists session_id uuid not null default gen_random_uuid();
create unique index if not exists cortex_class_sessions_admin_id on public.cortex_academy_class_sessions(session_id);
create unique index if not exists cortex_exam_sessions_admin_id on public.cortex_academy_sessions(session_id);
create index if not exists cortex_class_sessions_by_class on public.cortex_academy_class_sessions(class_id, student_number, created_at desc);
create index if not exists cortex_exam_sessions_by_exam on public.cortex_academy_sessions(assessment_id, student_number, created_at desc);

create table if not exists public.cortex_class_pin_invites (
  class_id uuid not null,
  student_number smallint not null,
  token_digest text not null unique,
  purpose text not null check (purpose in ('enrollment', 'reset')),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (class_id, student_number),
  foreign key (class_id, student_number)
    references public.cortex_academy_class_roster(class_id, student_number) on delete cascade
);
alter table public.cortex_class_pin_invites enable row level security;
revoke all on public.cortex_class_pin_invites from public, anon, authenticated;
grant select, insert, update, delete on public.cortex_class_pin_invites to service_role;

create or replace function public.cortex_class_pin_admin_overview(p_teacher uuid, p_class uuid)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with owned as (
    select id from public.cortex_teacher_classes where id=p_class and teacher_id=p_teacher and not archived
  ), contacts as (
    select s.student_number,s.created_at,s.expires_at
    from public.cortex_academy_class_sessions s join owned o on s.class_id=o.id
    union all
    select s.student_number,s.created_at,s.expires_at
    from public.cortex_academy_sessions s
    join public.cortex_teacher_assessments e on e.id=s.assessment_id and e.teacher_id=p_teacher
    join owned o on e.class_id=o.id
  ), counts as (
    select student_number,count(*) filter(where expires_at>statement_timestamp()) as active_sessions,
      max(created_at) as last_session_at
    from contacts group by student_number
  ), accounts as (
    select r.student_number,r.activated_at,r.demi_groupe,r.locked_until,
      i.purpose as invitation_purpose,i.issued_at as invitation_issued_at,i.expires_at as invitation_expires_at,
      coalesce(c.active_sessions,0) as active_sessions,c.last_session_at
    from public.cortex_academy_class_roster r join owned o on o.id=r.class_id
    left join public.cortex_class_pin_invites i using(class_id,student_number)
    left join counts c using(student_number)
  )
  select jsonb_build_object(
    'observed_at',statement_timestamp(),
    'access',(select jsonb_build_object('portal_code',a.portal_code,'roster_size',a.roster_size,
      'registration_open_until',a.registration_open_until,'active',a.active)
      from public.cortex_academy_class_access a join owned o on a.class_id=o.id where a.teacher_id=p_teacher),
    'accounts',coalesce((select jsonb_agg(to_jsonb(accounts) order by student_number) from accounts),'[]'::jsonb),
    'active_sessions',coalesce((select sum(active_sessions) from counts),0)
  ) from owned;
$$;

create or replace function public.cortex_class_pin_admin_sessions(
  p_teacher uuid,p_class uuid,p_student integer,p_state text,p_offset integer
) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with owned as (
    select id from public.cortex_teacher_classes where id=p_class and teacher_id=p_teacher and not archived
  ), contacts as (
    select s.session_id,s.student_number,s.created_at,s.expires_at,'class' as kind,null::text as exam_title
    from public.cortex_academy_class_sessions s join owned o on s.class_id=o.id
    where p_student is null or s.student_number=p_student
    union all
    select s.session_id,s.student_number,s.created_at,s.expires_at,'qr',e.title
    from public.cortex_academy_sessions s
    join public.cortex_teacher_assessments e on e.id=s.assessment_id and e.teacher_id=p_teacher
    join owned o on e.class_id=o.id
    where p_student is null or s.student_number=p_student
  ), page as (
    select *,expires_at>statement_timestamp() as active
    from contacts where p_state='all' or (p_state='active' and expires_at>statement_timestamp())
      or (p_state='expired' and expires_at<=statement_timestamp())
    order by created_at desc,session_id desc offset p_offset limit 31
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(to_jsonb(items) order by created_at desc,session_id desc) from (select * from page limit 30) items),'[]'::jsonb),
    'has_more',(select count(*)>30 from page)
  ) from owned;
$$;

create or replace function public.cortex_class_pin_admin_action(
  p_teacher uuid,p_class uuid,p_student integer,p_action text,
  p_activated_at timestamptz,p_invited_at timestamptz,p_new_digest text,p_token_digest text,p_session uuid
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  account public.cortex_academy_class_roster%rowtype;
  invitation public.cortex_class_pin_invites%rowtype;
  received_at timestamptz;
  purpose text;
  class_closed integer;
  qr_closed integer;
begin
  if p_student not between 1 and 60 or p_action not in ('issue','release','unlock','disconnect') then
    return jsonb_build_object('status','invalid');
  end if;
  if not exists(select 1 from public.cortex_teacher_classes
    where id=p_class and teacher_id=p_teacher and not archived) then
    return jsonb_build_object('status','not_found');
  end if;
  select * into account from public.cortex_academy_class_roster
    where class_id=p_class and student_number=p_student for update;
  if p_action <> 'disconnect' then
    if account.class_id is null then return jsonb_build_object('status','not_found'); end if;
    select * into invitation from public.cortex_class_pin_invites where class_id=p_class and student_number=p_student;
    if account.activated_at is distinct from p_activated_at or invitation.issued_at is distinct from p_invited_at then
      return jsonb_build_object('status','changed');
    end if;
    if p_action='unlock' then
      update public.cortex_academy_class_roster set attempts=0,locked_until=null
        where class_id=p_class and student_number=p_student;
      return jsonb_build_object('status','ok');
    end if;
    if p_action='release' and account.activated_at is null and invitation.class_id is null then
      return jsonb_build_object('status','not_found');
    end if;
    received_at := clock_timestamp();
    update public.cortex_academy_class_roster
      set pin_digest=p_new_digest,activated_at=null,attempts=0,locked_until=null,pin_origin_class_id=null,
        demi_groupe=case when p_action='release' then null else account.demi_groupe end,
        assignment_released_at=case when p_action='release' then received_at else account.assignment_released_at end,
        updated_at=received_at
      where class_id=p_class and student_number=p_student;
    if p_action='issue' then
      purpose := case when account.activated_at is not null then 'reset' else coalesce(invitation.purpose,'enrollment') end;
      insert into public.cortex_class_pin_invites(class_id,student_number,token_digest,purpose,issued_at,expires_at)
        values(p_class,p_student,p_token_digest,purpose,received_at,received_at+interval '30 minutes')
        on conflict(class_id,student_number) do update set token_digest=excluded.token_digest,
          purpose=excluded.purpose,issued_at=excluded.issued_at,expires_at=excluded.expires_at;
    else
      delete from public.cortex_class_pin_invites where class_id=p_class and student_number=p_student;
    end if;
  end if;

  -- Le même verrou de numéro protège aussi l’émission de nouvelles sessions.
  delete from public.cortex_academy_class_sessions
    where class_id=p_class and student_number=p_student
      and (p_action<>'disconnect' or expires_at>clock_timestamp())
      and (p_session is null or session_id=p_session);
  get diagnostics class_closed = row_count;
  delete from public.cortex_academy_sessions s using public.cortex_teacher_assessments e
    where e.id=s.assessment_id and e.class_id=p_class and e.teacher_id=p_teacher
      and s.student_number=p_student and (p_action<>'disconnect' or s.expires_at>clock_timestamp())
      and (p_session is null or s.session_id=p_session);
  get diagnostics qr_closed = row_count;
  return jsonb_build_object('status','ok','closed',class_closed+qr_closed,
    'issued_at',case when p_action='issue' then received_at end,
    'expires_at',case when p_action='issue' then received_at+interval '30 minutes' end);
end;
$$;

create or replace function public.cortex_activate_class_student_pin(
  p_class uuid,p_student integer,p_pin_digest text,p_group integer,p_token_digest text,p_individual boolean
) returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  account public.cortex_academy_class_roster%rowtype;
  invitation public.cortex_class_pin_invites%rowtype;
  activated timestamptz;
begin
  if p_group not in (1,2) then return 'group'; end if;
  select r.* into account from public.cortex_academy_class_roster r
    join public.cortex_academy_class_access a on a.class_id=r.class_id
    join public.cortex_teacher_classes c on c.id=a.class_id and c.teacher_id=a.teacher_id and not c.archived
    where r.class_id=p_class and r.student_number=p_student and a.active and r.student_number<=a.roster_size
    for update of r;
  if not found then return 'not_found'; end if;
  select * into invitation from public.cortex_class_pin_invites where class_id=p_class and student_number=p_student;
  activated := clock_timestamp();
  if p_individual then
    if invitation.token_digest is distinct from p_token_digest or invitation.expires_at is null
      or invitation.expires_at<=activated then return 'invitation'; end if;
    if account.demi_groupe in (1,2) and account.demi_groupe<>p_group then return 'group'; end if;
  else
    if invitation.class_id is not null then return 'reserved'; end if;
    if not exists(select 1 from public.cortex_academy_class_access where class_id=p_class and active
      and registration_open_until>activated
      and (p_token_digest is null or registration_token_hash=p_token_digest)) then return 'closed'; end if;
  end if;
  if account.activated_at is not null then return 'active'; end if;
  if account.locked_until>activated then return 'locked'; end if;
  update public.cortex_academy_class_roster
    set pin_digest=p_pin_digest,activated_at=activated,demi_groupe=p_group,
      attempts=0,locked_until=null,pin_origin_class_id=null,updated_at=activated
    where class_id=p_class and student_number=p_student;
  if p_individual then
    delete from public.cortex_class_pin_invites where class_id=p_class and student_number=p_student;
  end if;
  return 'ok';
end;
$$;

create or replace function public.cortex_issue_class_student_session(
  p_class uuid,p_student integer,p_verified_pin text,p_session_digest text,p_assessment uuid
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare
  account public.cortex_academy_class_roster%rowtype;
  owner_id uuid;
  deadline timestamptz := clock_timestamp()+interval '8 hours';
begin
  select r.* into account from public.cortex_academy_class_roster r
    join public.cortex_academy_class_access a on a.class_id=r.class_id
    where r.class_id=p_class and r.student_number=p_student and a.active and r.student_number<=a.roster_size
    for update of r;
  if not found or account.activated_at is null or account.pin_digest is distinct from p_verified_pin then
    return false;
  end if;
  select teacher_id into owner_id from public.cortex_academy_class_access where class_id=p_class and active;
  if owner_id is null then return false; end if;
  if p_assessment is null then
    insert into public.cortex_academy_class_sessions(token_digest,class_id,student_number,expires_at)
      values(p_session_digest,p_class,p_student,deadline);
  else
    if not exists (select 1 from public.cortex_teacher_assessments e
      join public.cortex_academy_access a on a.assessment_id=e.id and a.teacher_id=e.teacher_id
      where e.id=p_assessment and e.class_id=p_class and e.teacher_id=owner_id and e.published and a.active
        and case e.content->>'publish_scope'
          when 'g1' then account.demi_groupe=1 when 'g2' then account.demi_groupe=2 else true end)
    then return false; end if;
    insert into public.cortex_academy_sessions(token_digest,assessment_id,student_number,expires_at)
      values(p_session_digest,p_assessment,p_student,deadline);
  end if;
  return true;
end;
$$;

revoke all on function public.cortex_class_pin_admin_overview(uuid,uuid) from public, anon, authenticated;
revoke all on function public.cortex_class_pin_admin_sessions(uuid,uuid,integer,text,integer) from public, anon, authenticated;
revoke all on function public.cortex_class_pin_admin_action(uuid,uuid,integer,text,timestamptz,timestamptz,text,text,uuid) from public, anon, authenticated;
revoke all on function public.cortex_activate_class_student_pin(uuid,integer,text,integer,text,boolean) from public, anon, authenticated;
revoke all on function public.cortex_issue_class_student_session(uuid,integer,text,text,uuid) from public, anon, authenticated;
grant execute on function public.cortex_class_pin_admin_overview(uuid,uuid) to service_role;
grant execute on function public.cortex_class_pin_admin_sessions(uuid,uuid,integer,text,integer) to service_role;
grant execute on function public.cortex_class_pin_admin_action(uuid,uuid,integer,text,timestamptz,timestamptz,text,text,uuid) to service_role;
grant execute on function public.cortex_activate_class_student_pin(uuid,integer,text,integer,text,boolean) to service_role;
grant execute on function public.cortex_issue_class_student_session(uuid,integer,text,text,uuid) to service_role;
