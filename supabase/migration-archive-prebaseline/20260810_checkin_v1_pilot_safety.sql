begin;

-- Check-in V1 pilot safety layer.
-- This migration is intentionally additive and isolated from existing TKB/Auth/payroll tables.
-- It makes the Check-in backend server-gated so the feature can be tested on production
-- infrastructure without exposing it to all teachers.

create table if not exists public.checkin_system_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  phase text not null default 'pilot' check (phase in ('pilot','production')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.checkin_system_settings(id,enabled,phase)
values(1,true,'pilot')
on conflict(id) do nothing;

create table if not exists public.checkin_pilot_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  can_checkin boolean not null default false,
  can_review boolean not null default false,
  note text,
  enabled_at timestamptz not null default now(),
  enabled_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  constraint checkin_pilot_note_len check (note is null or char_length(note) <= 200),
  constraint checkin_pilot_some_access check (can_checkin or can_review)
);

alter table public.checkin_pilot_users enable row level security;
revoke all on public.checkin_pilot_users from authenticated;

alter table public.teaching_checkin_slots
  add column if not exists record_phase text not null default 'pilot'
    check (record_phase in ('pilot','production'));

-- A pilot record and a later production record must never share the same slot.
alter table public.teaching_checkin_slots
  drop constraint if exists teaching_checkin_slots_user_id_teaching_date_session_school_name_norm_key;

create unique index if not exists teaching_checkin_slots_identity_phase_uidx
  on public.teaching_checkin_slots(user_id, teaching_date, session, school_name_norm, record_phase);

create index if not exists teaching_checkin_slots_phase_date_idx
  on public.teaching_checkin_slots(record_phase, teaching_date desc);

create or replace function public.checkin_current_settings()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'enabled',s.enabled,
    'phase',s.phase
  )
  from public.checkin_system_settings s
  where s.id=1;
$$;

create or replace function public.checkin_is_pilot_user(
  p_user uuid default auth.uid(),
  p_capability text default 'checkin'
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.checkin_pilot_users p
    join public.profiles u on u.id=p.user_id
    where p.user_id=p_user
      and u.is_active
      and (u.expires_at is null or u.expires_at>now())
      and case lower(coalesce(p_capability,'checkin'))
        when 'checkin' then p.can_checkin
        when 'review' then p.can_review
        else false
      end
  );
$$;

create or replace function public.checkin_access_context()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_settings public.checkin_system_settings;
  v_profile public.profiles;
  v_owner boolean;
  v_group_leader boolean;
  v_manager boolean;
  v_pilot_checkin boolean;
  v_pilot_review boolean;
  v_can_checkin boolean;
  v_can_review boolean;
  v_can_grant boolean;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_settings from public.checkin_system_settings where id=1;
  if not found then raise exception 'Chưa cấu hình Check-in.'; end if;

  select * into v_profile
  from public.profiles
  where id=v_uid and is_active and (expires_at is null or expires_at>now());
  if not found then raise exception 'Tài khoản không hoạt động.'; end if;

  v_owner := public.is_owner(v_uid);
  v_group_leader := public.is_group_leader(v_uid);
  v_manager := public.checkin_is_active_manager(v_uid);
  v_pilot_checkin := public.checkin_is_pilot_user(v_uid,'checkin');
  v_pilot_review := public.checkin_is_pilot_user(v_uid,'review');

  if not v_settings.enabled then
    v_can_checkin := false;
    v_can_review := v_owner;
    v_can_grant := false;
  elsif v_settings.phase='pilot' then
    v_can_checkin := (not v_owner) and (not v_group_leader)
      and btrim(coalesce(v_profile.teacher_code,''))<>''
      and v_pilot_checkin;
    v_can_review := v_owner or v_pilot_review;
    v_can_grant := v_owner or v_pilot_review;
  else
    v_can_checkin := (not v_owner) and (not v_group_leader)
      and btrim(coalesce(v_profile.teacher_code,''))<>'';
    v_can_review := v_owner or v_group_leader or v_manager;
    v_can_grant := v_owner or v_group_leader or v_manager;
  end if;

  return jsonb_build_object(
    'enabled',v_settings.enabled,
    'phase',v_settings.phase,
    'is_owner',v_owner,
    'is_group_leader',v_group_leader,
    'is_manager',v_manager,
    'pilot_can_checkin',v_pilot_checkin,
    'pilot_can_review',v_pilot_review,
    'can_checkin',v_can_checkin,
    'can_review',v_can_review,
    'can_grant',v_can_grant,
    'can_manage_pilot',v_owner
  );
end;
$$;

create or replace function public.checkin_target_in_current_phase(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when s.phase='production' then true
    else public.checkin_is_pilot_user(p_target,'checkin')
  end
  from public.checkin_system_settings s
  where s.id=1 and s.enabled;
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
    public.checkin_target_in_current_phase(p_target)
    and (
      p_viewer=p_target
      or public.is_owner(p_viewer)
      or (
        (select phase from public.checkin_system_settings where id=1)='pilot'
        and public.checkin_is_pilot_user(p_viewer,'review')
      )
      or (
        (select phase from public.checkin_system_settings where id=1)='production'
        and (
          public.checkin_is_active_manager(p_viewer)
          or exists(
            select 1
            from public.teacher_group_managers m
            join public.teacher_group_memberships gm
              on gm.group_id=m.group_id
             and gm.user_id=p_target
             and gm.valid_to is null
            where m.user_id=p_viewer
          )
        )
      )
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
    public.checkin_target_in_current_phase(p_target)
    and (
      public.is_owner(p_viewer)
      or (
        (select phase from public.checkin_system_settings where id=1)='pilot'
        and public.checkin_is_pilot_user(p_viewer,'review')
      )
      or (
        (select phase from public.checkin_system_settings where id=1)='production'
        and (
          public.checkin_is_active_manager(p_viewer)
          or exists(
            select 1
            from public.teacher_group_managers m
            join public.teacher_group_memberships gm
              on gm.group_id=m.group_id
             and gm.user_id=p_target
             and gm.valid_to is null
            where m.user_id=p_viewer
          )
        )
      )
    );
$$;

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
  v_settings public.checkin_system_settings;
  v_access jsonb;
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

  select * into v_settings from public.checkin_system_settings where id=1;
  if not found or not v_settings.enabled then
    raise exception 'Check-in hiện đang tạm tắt.';
  end if;

  v_access := public.checkin_access_context();
  if not coalesce((v_access->>'can_checkin')::boolean,false) then
    if v_settings.phase='pilot' then
      raise exception 'Tài khoản này chưa được bật quyền thử nghiệm Check-in.';
    end if;
    raise exception 'Tài khoản không thuộc đối tượng Check-in.';
  end if;

  select * into v_profile
  from public.profiles
  where id=v_uid and is_active and (expires_at is null or expires_at>now());
  if not found then raise exception 'Tài khoản không hoạt động.'; end if;

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
    schedule_source,manual_reason,schedule_reference,created_by,record_phase
  )
  values(
    v_uid,p_teaching_date,public.checkin_school_year(p_teaching_date),
    v_session,v_school,v_school_norm,v_source,v_reason,
    coalesce(p_schedule_reference,'{}'::jsonb),v_uid,v_settings.phase
  )
  on conflict(user_id,teaching_date,session,school_name_norm,record_phase)
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

  select count(*) into v_used from public.teaching_checkins where slot_id=v_slot.id;
  select coalesce(sum(amount),0)::integer into v_granted
  from public.teaching_checkin_quota_grants where slot_id=v_slot.id;
  v_total := v_slot.initial_quota + v_granted;

  if v_used >= v_total then
    raise exception 'Bạn đã sử dụng hết % lượt check-in. Hãy báo Nhóm trưởng để được cấp thêm 3 lượt.', v_total;
  end if;

  v_attempt := v_used + 1;
  insert into public.teaching_checkins(
    slot_id,user_id,attempt_no,latitude,longitude,accuracy_m,gps_quality
  ) values(
    v_slot.id,v_uid,v_attempt,p_latitude,p_longitude,p_accuracy_m,v_quality
  ) returning id,checked_at into v_checkin_id,v_checked_at;

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
    'schedule_source',v_slot.schedule_source,
    'record_phase',v_slot.record_phase
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
  v_settings public.checkin_system_settings;
  v_access jsonb;
  v_date date := coalesce(p_teaching_date,(now() at time zone 'Asia/Ho_Chi_Minh')::date);
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  select * into v_settings from public.checkin_system_settings where id=1;
  if not found then raise exception 'Chưa cấu hình Check-in.'; end if;
  v_access := public.checkin_access_context();
  if not coalesce((v_access->>'can_review')::boolean,false) then
    raise exception 'Bạn không có quyền xem dữ liệu Check-in.';
  end if;

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
      s.record_phase,
      c.id as checkin_id,
      c.attempt_no,
      c.checked_at,
      c.latitude,
      c.longitude,
      c.accuracy_m,
      c.gps_quality,
      s.initial_quota + coalesce((select sum(g.amount) from public.teaching_checkin_quota_grants g where g.slot_id=s.id),0)::integer as quota_total,
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
      and s.record_phase=v_settings.phase
      and public.can_view_checkin_target(s.user_id,v_uid)
  ) x;

  return jsonb_build_object(
    'date',v_date,
    'school_year',public.checkin_school_year(v_date),
    'phase',v_settings.phase,
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
  v_settings public.checkin_system_settings;
  v_access jsonb;
  v_date date := coalesce(p_teaching_date,(now() at time zone 'Asia/Ho_Chi_Minh')::date);
  v_slots jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  select * into v_settings from public.checkin_system_settings where id=1;
  if not found then raise exception 'Chưa cấu hình Check-in.'; end if;
  v_access := public.checkin_access_context();

  if not coalesce((v_access->>'can_checkin')::boolean,false) then
    return jsonb_build_object(
      'date',v_date,
      'school_year',public.checkin_school_year(v_date),
      'phase',v_settings.phase,
      'slots','[]'::jsonb
    );
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'slot_id',s.id,
      'teaching_date',s.teaching_date,
      'school_year',s.school_year,
      'session',s.session,
      'school_name',s.school_name,
      'schedule_source',s.schedule_source,
      'manual_reason',s.manual_reason,
      'record_phase',s.record_phase,
      'quota_total',s.initial_quota + coalesce(g.granted,0),
      'attempts_used',coalesce(a.used,0),
      'remaining',greatest(s.initial_quota + coalesce(g.granted,0) - coalesce(a.used,0),0),
      'attempts',coalesce(a.attempts,'[]'::jsonb)
    ) order by s.session,s.school_name
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
  where s.user_id=v_uid
    and s.teaching_date=v_date
    and s.record_phase=v_settings.phase;

  return jsonb_build_object(
    'date',v_date,
    'school_year',public.checkin_school_year(v_date),
    'phase',v_settings.phase,
    'slots',v_slots
  );
end;
$$;

create or replace function public.checkin_pilot_list()
returns table(
  user_id uuid,
  display_name text,
  username text,
  teacher_code text,
  is_group_leader boolean,
  is_manager boolean,
  can_checkin boolean,
  can_review boolean,
  note text
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.is_owner() then
    raise exception 'Chỉ Chủ sở hữu được quản lý danh sách thử nghiệm Check-in.';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.username,
    upper(coalesce(p.teacher_code,'')),
    coalesce(p.is_group_leader,false),
    coalesce(p.is_manager,false),
    coalesce(x.can_checkin,false),
    coalesce(x.can_review,false),
    x.note
  from public.profiles p
  left join public.checkin_pilot_users x on x.user_id=p.id
  where p.is_active and p.role<>'owner'
  order by p.display_name;
end;
$$;

create or replace function public.set_checkin_pilot_user(
  p_user_id uuid,
  p_can_checkin boolean,
  p_can_review boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_checkin boolean := coalesce(p_can_checkin,false);
  v_review boolean := coalesce(p_can_review,false);
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
begin
  if not public.is_owner() then
    raise exception 'Chỉ Chủ sở hữu được quản lý danh sách thử nghiệm Check-in.';
  end if;
  if not exists(select 1 from public.profiles where id=p_user_id and is_active and role<>'owner') then
    raise exception 'Không tìm thấy tài khoản hợp lệ.';
  end if;
  if char_length(coalesce(v_note,''))>200 then
    raise exception 'Ghi chú tối đa 200 ký tự.';
  end if;

  if not v_checkin and not v_review then
    delete from public.checkin_pilot_users where user_id=p_user_id;
    return;
  end if;

  insert into public.checkin_pilot_users(user_id,can_checkin,can_review,note,enabled_at,enabled_by)
  values(p_user_id,v_checkin,v_review,v_note,now(),auth.uid())
  on conflict(user_id) do update set
    can_checkin=excluded.can_checkin,
    can_review=excluded.can_review,
    note=excluded.note,
    enabled_at=now(),
    enabled_by=auth.uid();
end;
$$;

create or replace function public.set_checkin_system_mode(
  p_enabled boolean,
  p_phase text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_phase text := lower(btrim(coalesce(p_phase,'')));
begin
  if not public.is_owner() then
    raise exception 'Chỉ Chủ sở hữu được đổi chế độ Check-in.';
  end if;
  if v_phase not in ('pilot','production') then
    raise exception 'Chế độ Check-in không hợp lệ.';
  end if;

  update public.checkin_system_settings
  set enabled=coalesce(p_enabled,false),phase=v_phase,updated_at=now(),updated_by=auth.uid()
  where id=1;

  return public.checkin_current_settings();
end;
$$;

grant execute on function public.checkin_current_settings() to authenticated;
grant execute on function public.checkin_is_pilot_user(uuid,text) to authenticated;
grant execute on function public.checkin_access_context() to authenticated;
grant execute on function public.checkin_target_in_current_phase(uuid) to authenticated;
grant execute on function public.checkin_pilot_list() to authenticated;
grant execute on function public.set_checkin_pilot_user(uuid,boolean,boolean,text) to authenticated;
grant execute on function public.set_checkin_system_mode(boolean,text) to authenticated;

commit;
