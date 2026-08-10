begin;

-- Check-in V1
-- Business rules:
-- * Only active teachers with a teacher code can check in.
-- * Group leaders are exempt from check-in.
-- * One teaching point = date + session + school.
-- * Each point starts with 3 successful check-in attempts.
-- * Only a successful server write consumes an attempt.
-- * Extra quota is granted in fixed blocks of 3 by the group leader for that teacher,
--   or by an owner/manager.
-- * Check-ins are immutable: authenticated users only read; writes happen through RPCs.
-- * GPS is evidence for later review, not an automatic "right school" verdict.

create extension if not exists pgcrypto;

create or replace function public.checkin_school_year(p_date date)
returns text
language sql
immutable
set search_path=public
as $$
  select case
    when extract(month from p_date) >= 8
      then extract(year from p_date)::int::text || '-' || (extract(year from p_date)::int + 1)::text
    else (extract(year from p_date)::int - 1)::text || '-' || extract(year from p_date)::int::text
  end;
$$;

create table if not exists public.teaching_checkin_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  teaching_date date not null,
  school_year text not null,
  session text not null check (session in ('Sáng','Chiều','Khác')),
  school_name text not null,
  school_name_norm text not null,
  schedule_source text not null default 'timetable'
    check (schedule_source in ('timetable','manual')),
  manual_reason text,
  schedule_reference jsonb not null default '{}'::jsonb,
  initial_quota integer not null default 3 check (initial_quota = 3),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  constraint teaching_checkin_slots_school_name_len
    check (char_length(btrim(school_name)) between 2 and 160),
  constraint teaching_checkin_slots_manual_reason_ck
    check (
      (schedule_source='timetable' and manual_reason is null)
      or
      (schedule_source='manual' and char_length(btrim(coalesce(manual_reason,''))) between 2 and 120)
    ),
  unique(user_id, teaching_date, session, school_name_norm)
);

create index if not exists teaching_checkin_slots_user_date_idx
  on public.teaching_checkin_slots(user_id, teaching_date desc);
create index if not exists teaching_checkin_slots_school_year_idx
  on public.teaching_checkin_slots(school_year, teaching_date desc);

create table if not exists public.teaching_checkins (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.teaching_checkin_slots(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  attempt_no integer not null check (attempt_no > 0),
  checked_at timestamptz not null default now(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision not null check (accuracy_m > 0 and accuracy_m <= 100000),
  gps_quality text not null check (gps_quality in ('good','fair','low')),
  created_at timestamptz not null default now(),
  unique(slot_id, attempt_no)
);

create index if not exists teaching_checkins_slot_time_idx
  on public.teaching_checkins(slot_id, checked_at desc);
create index if not exists teaching_checkins_user_time_idx
  on public.teaching_checkins(user_id, checked_at desc);

create table if not exists public.teaching_checkin_quota_grants (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.teaching_checkin_slots(id) on delete restrict,
  granted_to uuid not null references public.profiles(id) on delete restrict,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  amount integer not null default 3 check (amount = 3),
  reason text not null,
  granted_at timestamptz not null default now(),
  constraint teaching_checkin_quota_grants_reason_len
    check (char_length(btrim(reason)) between 2 and 200)
);

create index if not exists teaching_checkin_quota_grants_slot_idx
  on public.teaching_checkin_quota_grants(slot_id, granted_at desc);

create or replace function public.checkin_is_active_manager(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id=p_user
      and p.is_active
      and coalesce(p.is_manager,false)
      and (p.expires_at is null or p.expires_at>now())
  );
$$;

create or replace function public.can_view_checkin_target(
  p_target uuid,
  p_viewer uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select
    p_viewer = p_target
    or public.is_owner(p_viewer)
    or public.checkin_is_active_manager(p_viewer)
    or exists(
      select 1
      from public.teacher_group_managers m
      join public.teacher_group_memberships gm
        on gm.group_id=m.group_id
       and gm.user_id=p_target
       and gm.valid_to is null
      where m.user_id=p_viewer
    );
$$;

create or replace function public.can_grant_checkin_target(
  p_target uuid,
  p_viewer uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select
    public.is_owner(p_viewer)
    or public.checkin_is_active_manager(p_viewer)
    or exists(
      select 1
      from public.teacher_group_managers m
      join public.teacher_group_memberships gm
        on gm.group_id=m.group_id
       and gm.user_id=p_target
       and gm.valid_to is null
      where m.user_id=p_viewer
    );
$$;

alter table public.teaching_checkin_slots enable row level security;
alter table public.teaching_checkins enable row level security;
alter table public.teaching_checkin_quota_grants enable row level security;

drop policy if exists teaching_checkin_slots_read on public.teaching_checkin_slots;
create policy teaching_checkin_slots_read
on public.teaching_checkin_slots
for select
to authenticated
using (public.can_view_checkin_target(user_id));

drop policy if exists teaching_checkins_read on public.teaching_checkins;
create policy teaching_checkins_read
on public.teaching_checkins
for select
to authenticated
using (public.can_view_checkin_target(user_id));

drop policy if exists teaching_checkin_quota_grants_read on public.teaching_checkin_quota_grants;
create policy teaching_checkin_quota_grants_read
on public.teaching_checkin_quota_grants
for select
to authenticated
using (public.can_view_checkin_target(granted_to));

revoke insert, update, delete on public.teaching_checkin_slots from authenticated;
revoke insert, update, delete on public.teaching_checkins from authenticated;
revoke insert, update, delete on public.teaching_checkin_quota_grants from authenticated;

grant select on public.teaching_checkin_slots to authenticated;
grant select on public.teaching_checkins to authenticated;
grant select on public.teaching_checkin_quota_grants to authenticated;

create or replace function public.submit_teaching_checkin(
  p_teaching_date date,
  p_session text,
  p_school_name text,
  p_schedule_source text,
  p_manual_reason text,
  p_schedule_reference jsonb,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_school text := regexp_replace(btrim(coalesce(p_school_name,'')), '[[:space:]]+', ' ', 'g');
  v_school_norm text;
  v_session text := initcap(lower(btrim(coalesce(p_session,''))));
  v_source text := lower(btrim(coalesce(p_schedule_source,'timetable')));
  v_reason text := nullif(regexp_replace(btrim(coalesce(p_manual_reason,'')), '[[:space:]]+', ' ', 'g'),'');
  v_slot public.teaching_checkin_slots;
  v_used integer;
  v_granted integer;
  v_total integer;
  v_attempt integer;
  v_quality text;
  v_checkin_id uuid;
  v_checked_at timestamptz;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_profile
  from public.profiles
  where id=v_uid
    and is_active
    and (expires_at is null or expires_at>now());

  if not found then raise exception 'Tài khoản không hoạt động.'; end if;
  if public.is_owner(v_uid) then raise exception 'Chủ sở hữu không thuộc đối tượng check-in.'; end if;
  if coalesce(v_profile.is_group_leader,false) then
    raise exception 'Nhóm trưởng không thuộc đối tượng check-in.';
  end if;
  if btrim(coalesce(v_profile.teacher_code,''))='' then
    raise exception 'Tài khoản chưa được gán mã giáo viên.';
  end if;

  if p_teaching_date is distinct from v_today then
    raise exception 'Chỉ được check-in cho ngày hiện tại.';
  end if;

  if v_session not in ('Sáng','Chiều','Khác') then
    raise exception 'Buổi dạy không hợp lệ.';
  end if;

  if char_length(v_school) not between 2 and 160 then
    raise exception 'Tên trường không hợp lệ.';
  end if;

  if v_source not in ('timetable','manual') then
    raise exception 'Nguồn điểm dạy không hợp lệ.';
  end if;
  if v_source='manual' and char_length(coalesce(v_reason,'')) not between 2 and 120 then
    raise exception 'Hãy chọn hoặc nhập lý do cho điểm dạy ngoài TKB.';
  end if;
  if v_source='timetable' then v_reason := null; end if;

  if p_latitude is null or p_latitude not between -90 and 90 then
    raise exception 'Vĩ độ GPS không hợp lệ.';
  end if;
  if p_longitude is null or p_longitude not between -180 and 180 then
    raise exception 'Kinh độ GPS không hợp lệ.';
  end if;
  if p_accuracy_m is null or p_accuracy_m <= 0 or p_accuracy_m > 100000 then
    raise exception 'Độ chính xác GPS không hợp lệ.';
  end if;

  v_school_norm := lower(v_school);
  v_quality := case
    when p_accuracy_m <= 50 then 'good'
    when p_accuracy_m <= 200 then 'fair'
    else 'low'
  end;

  insert into public.teaching_checkin_slots(
    user_id,teaching_date,school_year,session,school_name,school_name_norm,
    schedule_source,manual_reason,schedule_reference,created_by
  )
  values(
    v_uid,p_teaching_date,public.checkin_school_year(p_teaching_date),
    v_session,v_school,v_school_norm,v_source,v_reason,coalesce(p_schedule_reference,'{}'::jsonb),v_uid
  )
  on conflict(user_id,teaching_date,session,school_name_norm)
  do update set
    school_name=excluded.school_name,
    schedule_reference=case
      when public.teaching_checkin_slots.schedule_reference='{}'::jsonb
      then excluded.schedule_reference
      else public.teaching_checkin_slots.schedule_reference
    end
  returning * into v_slot;

  select * into v_slot
  from public.teaching_checkin_slots
  where id=v_slot.id
  for update;

  select count(*) into v_used
  from public.teaching_checkins
  where slot_id=v_slot.id;

  select coalesce(sum(amount),0)::integer into v_granted
  from public.teaching_checkin_quota_grants
  where slot_id=v_slot.id;

  v_total := v_slot.initial_quota + v_granted;

  if v_used >= v_total then
    raise exception 'Bạn đã sử dụng hết % lượt check-in. Hãy báo Nhóm trưởng để được cấp thêm 3 lượt.', v_total;
  end if;

  v_attempt := v_used + 1;

  insert into public.teaching_checkins(
    slot_id,user_id,attempt_no,latitude,longitude,accuracy_m,gps_quality
  )
  values(
    v_slot.id,v_uid,v_attempt,p_latitude,p_longitude,p_accuracy_m,v_quality
  )
  returning id,checked_at into v_checkin_id,v_checked_at;

  return jsonb_build_object(
    'slot_id',v_slot.id,
    'checkin_id',v_checkin_id,
    'attempt_no',v_attempt,
    'quota_total',v_total,
    'attempts_used',v_attempt,
    'remaining',greatest(v_total-v_attempt,0),
    'checked_at',v_checked_at,
    'gps_quality',v_quality,
    'accuracy_m',p_accuracy_m,
    'school_name',v_slot.school_name,
    'session',v_slot.session,
    'schedule_source',v_slot.schedule_source
  );
end;
$$;

create or replace function public.grant_teaching_checkin_quota(
  p_slot_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot public.teaching_checkin_slots;
  v_reason text := regexp_replace(btrim(coalesce(p_reason,'')), '[[:space:]]+', ' ', 'g');
  v_grant_id uuid;
  v_used integer;
  v_granted integer;
  v_total integer;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_slot
  from public.teaching_checkin_slots
  where id=p_slot_id
  for update;

  if not found then raise exception 'Không tìm thấy điểm dạy.'; end if;
  if not public.can_grant_checkin_target(v_slot.user_id,v_uid) then
    raise exception 'Bạn không có quyền cấp thêm lượt cho giáo viên này.';
  end if;
  if char_length(v_reason) not between 2 and 200 then
    raise exception 'Hãy nhập lý do cấp thêm lượt.';
  end if;

  select count(*) into v_used
  from public.teaching_checkins
  where slot_id=v_slot.id;

  select coalesce(sum(amount),0)::integer into v_granted
  from public.teaching_checkin_quota_grants
  where slot_id=v_slot.id;

  v_total := v_slot.initial_quota + v_granted;

  if v_used < v_total then
    raise exception 'Giáo viên vẫn còn % lượt check-in; chưa cần cấp thêm.', v_total-v_used;
  end if;

  insert into public.teaching_checkin_quota_grants(
    slot_id,granted_to,granted_by,amount,reason
  )
  values(v_slot.id,v_slot.user_id,v_uid,3,v_reason)
  returning id into v_grant_id;

  v_total := v_total + 3;

  return jsonb_build_object(
    'grant_id',v_grant_id,
    'slot_id',v_slot.id,
    'granted',3,
    'quota_total',v_total,
    'attempts_used',v_used,
    'remaining',greatest(v_total-v_used,0),
    'granted_at',now()
  );
end;
$$;

create or replace function public.checkin_dashboard(
  p_teaching_date date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_date date := coalesce(p_teaching_date,(now() at time zone 'Asia/Ho_Chi_Minh')::date);
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.display_name,x.session,x.school_name,x.checked_at),'[]'::jsonb)
  into v_items
  from (
    select
      s.id as slot_id,
      s.user_id,
      p.display_name,
      upper(coalesce(p.teacher_code,'')) as teacher_code,
      s.teaching_date,
      s.school_year,
      s.session,
      s.school_name,
      s.schedule_source,
      s.manual_reason,
      c.id as checkin_id,
      c.attempt_no,
      c.checked_at,
      c.latitude,
      c.longitude,
      c.accuracy_m,
      c.gps_quality,
      s.initial_quota
        + coalesce((select sum(g.amount) from public.teaching_checkin_quota_grants g where g.slot_id=s.id),0)::integer as quota_total,
      (select count(*) from public.teaching_checkins cc where cc.slot_id=s.id)::integer as attempts_used,
      (
        s.initial_quota
        + coalesce((select sum(g.amount) from public.teaching_checkin_quota_grants g where g.slot_id=s.id),0)::integer
        - (select count(*) from public.teaching_checkins cc where cc.slot_id=s.id)::integer
      ) as remaining
    from public.teaching_checkin_slots s
    join public.profiles p on p.id=s.user_id
    left join public.teaching_checkins c on c.slot_id=s.id
    where s.teaching_date=v_date
      and public.can_view_checkin_target(s.user_id,v_uid)
  ) x;

  return jsonb_build_object(
    'date',v_date,
    'school_year',public.checkin_school_year(v_date),
    'items',v_items
  );
end;
$$;

create or replace function public.my_checkin_day(
  p_teaching_date date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_date date := coalesce(p_teaching_date,(now() at time zone 'Asia/Ho_Chi_Minh')::date);
  v_slots jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'slot_id',s.id,
      'teaching_date',s.teaching_date,
      'school_year',s.school_year,
      'session',s.session,
      'school_name',s.school_name,
      'schedule_source',s.schedule_source,
      'manual_reason',s.manual_reason,
      'quota_total',s.initial_quota + coalesce(g.granted,0),
      'attempts_used',coalesce(a.used,0),
      'remaining',greatest(s.initial_quota + coalesce(g.granted,0) - coalesce(a.used,0),0),
      'attempts',coalesce(a.attempts,'[]'::jsonb)
    )
    order by s.session,s.school_name
  ),'[]'::jsonb)
  into v_slots
  from public.teaching_checkin_slots s
  left join lateral (
    select
      count(*)::integer as used,
      jsonb_agg(
        jsonb_build_object(
          'id',c.id,
          'attempt_no',c.attempt_no,
          'checked_at',c.checked_at,
          'latitude',c.latitude,
          'longitude',c.longitude,
          'accuracy_m',c.accuracy_m,
          'gps_quality',c.gps_quality
        ) order by c.attempt_no
      ) as attempts
    from public.teaching_checkins c
    where c.slot_id=s.id
  ) a on true
  left join lateral (
    select coalesce(sum(q.amount),0)::integer as granted
    from public.teaching_checkin_quota_grants q
    where q.slot_id=s.id
  ) g on true
  where s.user_id=v_uid and s.teaching_date=v_date;

  return jsonb_build_object(
    'date',v_date,
    'school_year',public.checkin_school_year(v_date),
    'slots',v_slots
  );
end;
$$;

grant execute on function public.checkin_school_year(date) to authenticated;
grant execute on function public.checkin_is_active_manager(uuid) to authenticated;
grant execute on function public.can_view_checkin_target(uuid,uuid) to authenticated;
grant execute on function public.can_grant_checkin_target(uuid,uuid) to authenticated;
grant execute on function public.submit_teaching_checkin(date,text,text,text,text,jsonb,double precision,double precision,double precision) to authenticated;
grant execute on function public.grant_teaching_checkin_quota(uuid,text) to authenticated;
grant execute on function public.checkin_dashboard(date) to authenticated;
grant execute on function public.my_checkin_day(date) to authenticated;

commit;
