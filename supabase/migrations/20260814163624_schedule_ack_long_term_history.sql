begin;

create table if not exists public.teaching_schedule_expectations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  teaching_date date not null,
  is_required boolean not null default true,
  display_name_snapshot text not null default '',
  username_snapshot text not null default '',
  teacher_code_snapshot text not null default '',
  group_id_snapshot uuid null references public.teacher_groups(id) on delete set null,
  group_name_snapshot text null,
  schedule_signature text not null default '',
  schedule_summary text not null default '',
  source_tkb_id uuid null references public.tkb_files(id) on delete set null,
  source_tkb_updated_at timestamptz null,
  first_snapshot_at timestamptz not null default now(),
  last_snapshot_at timestamptz not null default now(),
  schedule_changed_at timestamptz null,
  revision_no integer not null default 1 check (revision_no >= 1),
  created_by uuid null references public.profiles(id) on delete set null,
  unique(user_id, teaching_date)
);

create index if not exists teaching_schedule_expectations_date_idx
  on public.teaching_schedule_expectations(teaching_date, is_required, user_id);
create index if not exists teaching_schedule_expectations_group_idx
  on public.teaching_schedule_expectations(group_id_snapshot, teaching_date);

create table if not exists public.teaching_schedule_ack_events (
  id uuid primary key default gen_random_uuid(),
  expectation_id uuid null references public.teaching_schedule_expectations(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  teaching_date date not null,
  schedule_signature text not null,
  schedule_summary text not null default '',
  source_tkb_id uuid null references public.tkb_files(id) on delete set null,
  source_tkb_updated_at timestamptz null,
  event_kind text not null check (event_kind in ('on_time','late','reacknowledged')),
  acknowledged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists teaching_schedule_ack_events_user_date_idx
  on public.teaching_schedule_ack_events(user_id, teaching_date, acknowledged_at);
create index if not exists teaching_schedule_ack_events_expectation_idx
  on public.teaching_schedule_ack_events(expectation_id, acknowledged_at);

alter table public.teaching_schedule_expectations enable row level security;
alter table public.teaching_schedule_ack_events enable row level security;
revoke all on table public.teaching_schedule_expectations from anon, authenticated;
revoke all on table public.teaching_schedule_ack_events from anon, authenticated;

insert into public.teaching_schedule_expectations(
  user_id, teaching_date, is_required,
  display_name_snapshot, username_snapshot, teacher_code_snapshot,
  group_id_snapshot, group_name_snapshot,
  schedule_signature, schedule_summary,
  source_tkb_id, source_tkb_updated_at,
  first_snapshot_at, last_snapshot_at, revision_no, created_by
)
select
  a.user_id, a.teaching_date, true,
  coalesce(p.display_name,''), coalesce(p.username,''), upper(btrim(coalesce(p.teacher_code,''))),
  grp.group_id, grp.group_name,
  a.schedule_signature, a.schedule_summary,
  a.source_tkb_id, a.source_tkb_updated_at,
  a.acknowledged_at, a.updated_at, 1, a.user_id
from public.teaching_schedule_acknowledgements a
join public.profiles p on p.id=a.user_id
left join lateral (
  select gm.group_id, g.name as group_name
  from public.teacher_group_memberships gm
  join public.teacher_groups g on g.id=gm.group_id
  where gm.user_id=a.user_id and gm.valid_to is null
  order by gm.valid_from desc, g.name
  limit 1
) grp on true
on conflict(user_id, teaching_date) do nothing;

insert into public.teaching_schedule_ack_events(
  expectation_id,user_id,teaching_date,schedule_signature,schedule_summary,
  source_tkb_id,source_tkb_updated_at,event_kind,acknowledged_at,created_at
)
select
  e.id,a.user_id,a.teaching_date,a.schedule_signature,a.schedule_summary,
  a.source_tkb_id,a.source_tkb_updated_at,
  case when (a.acknowledged_at at time zone 'Asia/Ho_Chi_Minh')::time >= time '22:00' then 'late' else 'on_time' end,
  a.acknowledged_at,a.acknowledged_at
from public.teaching_schedule_acknowledgements a
join public.teaching_schedule_expectations e on e.user_id=a.user_id and e.teaching_date=a.teaching_date
where not exists (
  select 1 from public.teaching_schedule_ack_events x
  where x.user_id=a.user_id and x.teaching_date=a.teaching_date
    and x.schedule_signature=a.schedule_signature and x.acknowledged_at=a.acknowledged_at
);

create or replace function public.acknowledge_teaching_schedule(
  p_teaching_date date,
  p_schedule_signature text,
  p_schedule_summary text default '',
  p_source_tkb_id uuid default null,
  p_source_tkb_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_local_ts timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  v_today date := v_local_ts::date;
  v_local_time time := v_local_ts::time;
  v_group_id uuid;
  v_group_name text;
  v_expectation public.teaching_schedule_expectations;
  v_row public.teaching_schedule_acknowledgements;
  v_prior_any boolean := false;
  v_prior_different boolean := false;
  v_event_kind text;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_profile
  from public.profiles p
  where p.id=v_uid and p.is_active and (p.expires_at is null or p.expires_at>now());
  if not found then raise exception 'Tài khoản không còn hoạt động.'; end if;
  if btrim(coalesce(v_profile.teacher_code,''))='' then raise exception 'Tài khoản chưa liên kết mã giáo viên trong TKB.'; end if;
  if p_teaching_date is distinct from (v_today + 1) then raise exception 'Chỉ xác nhận lịch dạy của ngày mai.'; end if;
  if v_local_time < time '17:00' then raise exception 'Báo lịch ngày mai mở từ 17:00 đến 23:59.'; end if;
  if btrim(coalesce(p_schedule_signature,''))='' or char_length(p_schedule_signature)>20000 then raise exception 'Dấu nhận diện lịch dạy không hợp lệ.'; end if;
  if char_length(coalesce(p_schedule_summary,''))>5000 then raise exception 'Nội dung tóm tắt lịch dạy quá dài.'; end if;

  select gm.group_id,g.name into v_group_id,v_group_name
  from public.teacher_group_memberships gm
  join public.teacher_groups g on g.id=gm.group_id
  where gm.user_id=v_uid and gm.valid_to is null
  order by gm.valid_from desc,g.name
  limit 1;

  select exists(
    select 1 from public.teaching_schedule_ack_events x
    where x.user_id=v_uid and x.teaching_date=p_teaching_date
  ), exists(
    select 1 from public.teaching_schedule_ack_events x
    where x.user_id=v_uid and x.teaching_date=p_teaching_date
      and x.schedule_signature is distinct from p_schedule_signature
  ) into v_prior_any,v_prior_different;

  insert into public.teaching_schedule_expectations(
    user_id,teaching_date,is_required,
    display_name_snapshot,username_snapshot,teacher_code_snapshot,
    group_id_snapshot,group_name_snapshot,
    schedule_signature,schedule_summary,source_tkb_id,source_tkb_updated_at,
    first_snapshot_at,last_snapshot_at,schedule_changed_at,revision_no,created_by
  ) values(
    v_uid,p_teaching_date,true,
    coalesce(v_profile.display_name,''),coalesce(v_profile.username,''),upper(btrim(coalesce(v_profile.teacher_code,''))),
    v_group_id,v_group_name,
    p_schedule_signature,coalesce(p_schedule_summary,''),p_source_tkb_id,p_source_tkb_updated_at,
    now(),now(),null,1,v_uid
  )
  on conflict(user_id,teaching_date) do update set
    is_required=true,
    display_name_snapshot=excluded.display_name_snapshot,
    username_snapshot=excluded.username_snapshot,
    teacher_code_snapshot=excluded.teacher_code_snapshot,
    group_id_snapshot=excluded.group_id_snapshot,
    group_name_snapshot=excluded.group_name_snapshot,
    schedule_summary=excluded.schedule_summary,
    source_tkb_id=excluded.source_tkb_id,
    source_tkb_updated_at=excluded.source_tkb_updated_at,
    schedule_changed_at=case
      when public.teaching_schedule_expectations.schedule_signature is distinct from excluded.schedule_signature then now()
      else public.teaching_schedule_expectations.schedule_changed_at end,
    revision_no=case
      when public.teaching_schedule_expectations.schedule_signature is distinct from excluded.schedule_signature then public.teaching_schedule_expectations.revision_no+1
      else public.teaching_schedule_expectations.revision_no end,
    schedule_signature=excluded.schedule_signature,
    last_snapshot_at=now()
  returning * into v_expectation;

  if v_prior_different then
    v_event_kind := 'reacknowledged';
  elsif v_local_time >= time '22:00' then
    v_event_kind := 'late';
  else
    v_event_kind := 'on_time';
  end if;

  insert into public.teaching_schedule_ack_events(
    expectation_id,user_id,teaching_date,schedule_signature,schedule_summary,
    source_tkb_id,source_tkb_updated_at,event_kind,acknowledged_at,created_at
  ) values(
    v_expectation.id,v_uid,p_teaching_date,p_schedule_signature,coalesce(p_schedule_summary,''),
    p_source_tkb_id,p_source_tkb_updated_at,v_event_kind,now(),now()
  );

  insert into public.teaching_schedule_acknowledgements(
    user_id,teaching_date,schedule_signature,schedule_summary,source_tkb_id,source_tkb_updated_at,acknowledged_at,updated_at
  ) values(
    v_uid,p_teaching_date,p_schedule_signature,coalesce(p_schedule_summary,''),p_source_tkb_id,p_source_tkb_updated_at,now(),now()
  )
  on conflict(user_id,teaching_date) do update set
    schedule_signature=excluded.schedule_signature,
    schedule_summary=excluded.schedule_summary,
    source_tkb_id=excluded.source_tkb_id,
    source_tkb_updated_at=excluded.source_tkb_updated_at,
    acknowledged_at=now(),
    updated_at=now()
  returning * into v_row;

  return jsonb_build_object(
    'saved',true,
    'teaching_date',v_row.teaching_date,
    'schedule_signature',v_row.schedule_signature,
    'acknowledged_at',v_row.acknowledged_at,
    'event_kind',v_event_kind,
    'late',v_event_kind='late'
  );
end;
$$;

create or replace function public.snapshot_my_teaching_schedule_expectation(
  p_teaching_date date,
  p_is_required boolean,
  p_schedule_signature text default '',
  p_schedule_summary text default '',
  p_source_tkb_id uuid default null,
  p_source_tkb_updated_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_group_id uuid;
  v_group_name text;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  if p_teaching_date is distinct from (v_today+1) then raise exception 'Chỉ ghi nhận lịch ngày mai.'; end if;
  select * into v_profile from public.profiles p
  where p.id=v_uid and p.is_active and (p.expires_at is null or p.expires_at>now());
  if not found then raise exception 'Tài khoản không còn hoạt động.'; end if;

  select gm.group_id,g.name into v_group_id,v_group_name
  from public.teacher_group_memberships gm
  join public.teacher_groups g on g.id=gm.group_id
  where gm.user_id=v_uid and gm.valid_to is null
  order by gm.valid_from desc,g.name limit 1;

  insert into public.teaching_schedule_expectations(
    user_id,teaching_date,is_required,display_name_snapshot,username_snapshot,teacher_code_snapshot,
    group_id_snapshot,group_name_snapshot,schedule_signature,schedule_summary,source_tkb_id,source_tkb_updated_at,
    first_snapshot_at,last_snapshot_at,revision_no,created_by
  ) values(
    v_uid,p_teaching_date,coalesce(p_is_required,false),coalesce(v_profile.display_name,''),coalesce(v_profile.username,''),upper(btrim(coalesce(v_profile.teacher_code,''))),
    v_group_id,v_group_name,coalesce(p_schedule_signature,''),coalesce(p_schedule_summary,''),p_source_tkb_id,p_source_tkb_updated_at,
    now(),now(),1,v_uid
  )
  on conflict(user_id,teaching_date) do update set
    is_required=excluded.is_required,
    display_name_snapshot=excluded.display_name_snapshot,
    username_snapshot=excluded.username_snapshot,
    teacher_code_snapshot=excluded.teacher_code_snapshot,
    group_id_snapshot=excluded.group_id_snapshot,
    group_name_snapshot=excluded.group_name_snapshot,
    schedule_changed_at=case
      when public.teaching_schedule_expectations.schedule_signature is distinct from excluded.schedule_signature
        and public.teaching_schedule_expectations.schedule_signature<>'' and excluded.schedule_signature<>'' then now()
      else public.teaching_schedule_expectations.schedule_changed_at end,
    revision_no=case
      when public.teaching_schedule_expectations.schedule_signature is distinct from excluded.schedule_signature
        and public.teaching_schedule_expectations.schedule_signature<>'' and excluded.schedule_signature<>'' then public.teaching_schedule_expectations.revision_no+1
      else public.teaching_schedule_expectations.revision_no end,
    schedule_signature=excluded.schedule_signature,
    schedule_summary=excluded.schedule_summary,
    source_tkb_id=excluded.source_tkb_id,
    source_tkb_updated_at=excluded.source_tkb_updated_at,
    last_snapshot_at=now();
end;
$$;

create or replace function public.sync_teaching_schedule_expectations(
  p_rows jsonb,
  p_source_tkb_id uuid,
  p_source_tkb_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_all boolean := false;
  v_source_ok boolean := false;
  v_item jsonb;
  v_user_id uuid;
  v_date date;
  v_sig text;
  v_summary text;
  v_profile public.profiles;
  v_group_id uuid;
  v_group_name text;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  if public.is_owner(v_uid) then v_all:=true;
  else
    select coalesce(p.can_monitor_schedule_ack_all,false) into v_all
    from public.profiles p
    where p.id=v_uid and p.is_active and (p.expires_at is null or p.expires_at>now());
    if not found then v_all:=false; end if;
  end if;
  if not v_all then raise exception 'Chỉ người có quyền xem toàn hệ thống mới được đồng bộ ảnh chụp lịch dạy.'; end if;

  select exists(
    select 1 from public.tkb_files t
    where t.id=p_source_tkb_id and t.scope='shared' and t.status='ready' and t.is_active=true
  ) into v_source_ok;
  if not v_source_ok then raise exception 'TKB nguồn không phải TKB chung đang áp dụng.'; end if;

  if jsonb_typeof(coalesce(p_rows,'[]'::jsonb))<>'array' then raise exception 'Dữ liệu lịch không hợp lệ.'; end if;
  if jsonb_array_length(coalesce(p_rows,'[]'::jsonb))>5000 then raise exception 'Dữ liệu lịch quá lớn cho một lần đồng bộ.'; end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) loop
    begin
      v_user_id := (v_item->>'user_id')::uuid;
      v_date := (v_item->>'teaching_date')::date;
    exception when others then
      raise exception 'Dòng dữ liệu lịch không hợp lệ.';
    end;
    if v_date<=v_today or v_date>v_today+90 then continue; end if;
    v_sig:=btrim(coalesce(v_item->>'schedule_signature',''));
    v_summary:=coalesce(v_item->>'schedule_summary','');
    if v_sig='' or char_length(v_sig)>20000 or char_length(v_summary)>5000 then continue; end if;

    select * into v_profile from public.profiles p
    where p.id=v_user_id and p.is_active and (p.expires_at is null or p.expires_at>now()) and btrim(coalesce(p.teacher_code,''))<>'';
    if not found then continue; end if;

    v_group_id:=null;v_group_name:=null;
    select gm.group_id,g.name into v_group_id,v_group_name
    from public.teacher_group_memberships gm
    join public.teacher_groups g on g.id=gm.group_id
    where gm.user_id=v_user_id and gm.valid_to is null
    order by gm.valid_from desc,g.name limit 1;

    insert into public.teaching_schedule_expectations(
      user_id,teaching_date,is_required,display_name_snapshot,username_snapshot,teacher_code_snapshot,
      group_id_snapshot,group_name_snapshot,schedule_signature,schedule_summary,source_tkb_id,source_tkb_updated_at,
      first_snapshot_at,last_snapshot_at,revision_no,created_by
    ) values(
      v_user_id,v_date,true,coalesce(v_profile.display_name,''),coalesce(v_profile.username,''),upper(btrim(coalesce(v_profile.teacher_code,''))),
      v_group_id,v_group_name,v_sig,v_summary,p_source_tkb_id,p_source_tkb_updated_at,
      now(),now(),1,v_uid
    )
    on conflict(user_id,teaching_date) do update set
      is_required=true,
      display_name_snapshot=excluded.display_name_snapshot,
      username_snapshot=excluded.username_snapshot,
      teacher_code_snapshot=excluded.teacher_code_snapshot,
      group_id_snapshot=excluded.group_id_snapshot,
      group_name_snapshot=excluded.group_name_snapshot,
      schedule_changed_at=case
        when public.teaching_schedule_expectations.schedule_signature is distinct from excluded.schedule_signature then now()
        else public.teaching_schedule_expectations.schedule_changed_at end,
      revision_no=case
        when public.teaching_schedule_expectations.schedule_signature is distinct from excluded.schedule_signature then public.teaching_schedule_expectations.revision_no+1
        else public.teaching_schedule_expectations.revision_no end,
      schedule_signature=excluded.schedule_signature,
      schedule_summary=excluded.schedule_summary,
      source_tkb_id=excluded.source_tkb_id,
      source_tkb_updated_at=excluded.source_tkb_updated_at,
      last_snapshot_at=now();
    v_count:=v_count+1;
  end loop;

  update public.teaching_schedule_expectations e
  set is_required=false,last_snapshot_at=now(),source_tkb_id=p_source_tkb_id,source_tkb_updated_at=p_source_tkb_updated_at
  where e.teaching_date>v_today and e.teaching_date<=v_today+90 and e.is_required=true
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) x
      where (x->>'user_id')::uuid=e.user_id
        and (x->>'teaching_date')::date=e.teaching_date
        and btrim(coalesce(x->>'schedule_signature',''))<>''
    );

  return jsonb_build_object('synced',v_count,'source_tkb_id',p_source_tkb_id,'synced_at',now());
end;
$$;

create or replace function public.my_teaching_schedule_ack_state(p_teaching_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  e public.teaching_schedule_expectations;
  v_final_at timestamptz;
  v_final_kind text;
  v_any boolean:=false;
  v_prior_diff boolean:=false;
  v_status text;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  select * into e from public.teaching_schedule_expectations x where x.user_id=v_uid and x.teaching_date=p_teaching_date;
  if not found then return null; end if;
  select exists(select 1 from public.teaching_schedule_ack_events a where a.user_id=v_uid and a.teaching_date=p_teaching_date),
         exists(select 1 from public.teaching_schedule_ack_events a where a.user_id=v_uid and a.teaching_date=p_teaching_date and a.schedule_signature is distinct from e.schedule_signature)
    into v_any,v_prior_diff;
  select a.acknowledged_at,a.event_kind into v_final_at,v_final_kind
  from public.teaching_schedule_ack_events a
  where a.user_id=v_uid and a.teaching_date=p_teaching_date and a.schedule_signature=e.schedule_signature
  order by a.acknowledged_at asc limit 1;

  if v_final_at is null then
    if v_any then v_status:=case when p_teaching_date<=v_today then 'not_reacknowledged' else 'changed_pending' end;
    else v_status:=case when p_teaching_date<=v_today then 'not_acknowledged' else 'pending' end;
    end if;
  elsif v_prior_diff then v_status:='reacknowledged';
  elsif (v_final_at at time zone 'Asia/Ho_Chi_Minh')::time>=time '22:00' then v_status:='late';
  else v_status:='on_time'; end if;

  return jsonb_build_object('status',v_status,'acknowledged_at',v_final_at,'event_kind',v_final_kind,'revision_no',e.revision_no,'schedule_changed_at',e.schedule_changed_at,'is_required',e.is_required);
end;
$$;

create or replace function public.teaching_schedule_ack_history(
  p_from date,
  p_to date
)
returns table(
  user_id uuid,
  teaching_date date,
  display_name text,
  username text,
  teacher_code text,
  group_id uuid,
  group_name text,
  schedule_summary text,
  status text,
  acknowledged_at timestamptz,
  revision_no integer,
  schedule_changed_at timestamptz,
  source_tkb_id uuid
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_owner boolean:=false;
  v_all boolean:=false;
  v_leader boolean:=false;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  if p_from is null or p_to is null or p_from>p_to then raise exception 'Khoảng ngày không hợp lệ.'; end if;
  if p_to-p_from>366 then raise exception 'Mỗi lần chỉ xem tối đa 367 ngày.'; end if;

  v_owner:=public.is_owner(v_uid);
  v_leader:=public.is_group_leader(v_uid);
  select coalesce(p.can_monitor_schedule_ack_all,false) into v_all
  from public.profiles p where p.id=v_uid and p.is_active and (p.expires_at is null or p.expires_at>now());
  if not found then v_all:=false; end if;
  if not v_owner and not v_all and not v_leader then raise exception 'Bạn không có quyền xem lịch sử xác nhận lịch dạy.'; end if;

  return query
  with base as (
    select e.*,
      (select min(a.acknowledged_at) from public.teaching_schedule_ack_events a
       where a.user_id=e.user_id and a.teaching_date=e.teaching_date and a.schedule_signature=e.schedule_signature) as final_ack_at,
      exists(select 1 from public.teaching_schedule_ack_events a
       where a.user_id=e.user_id and a.teaching_date=e.teaching_date) as any_ack,
      exists(select 1 from public.teaching_schedule_ack_events a
       where a.user_id=e.user_id and a.teaching_date=e.teaching_date and a.schedule_signature is distinct from e.schedule_signature) as prior_diff
    from public.teaching_schedule_expectations e
    where e.teaching_date between p_from and p_to and e.is_required=true
      and (
        v_owner or v_all or exists(
          select 1 from public.teacher_group_managers m
          where m.user_id=v_uid and m.group_id=e.group_id_snapshot
        )
      )
  )
  select
    b.user_id,b.teaching_date,b.display_name_snapshot,b.username_snapshot,b.teacher_code_snapshot,
    b.group_id_snapshot,b.group_name_snapshot,b.schedule_summary,
    case
      when b.final_ack_at is null and b.any_ack then case when b.teaching_date<=v_today then 'not_reacknowledged' else 'changed_pending' end
      when b.final_ack_at is null then case when b.teaching_date<=v_today then 'not_acknowledged' else 'pending' end
      when b.prior_diff then 'reacknowledged'
      when (b.final_ack_at at time zone 'Asia/Ho_Chi_Minh')::time>=time '22:00' then 'late'
      else 'on_time'
    end as status,
    b.final_ack_at,b.revision_no,b.schedule_changed_at,b.source_tkb_id
  from base b
  order by b.teaching_date desc,b.group_name_snapshot nulls last,b.display_name_snapshot,b.username_snapshot;
end;
$$;

revoke execute on function public.acknowledge_teaching_schedule(date,text,text,uuid,timestamptz) from public,anon;
revoke execute on function public.snapshot_my_teaching_schedule_expectation(date,boolean,text,text,uuid,timestamptz) from public,anon;
revoke execute on function public.sync_teaching_schedule_expectations(jsonb,uuid,timestamptz) from public,anon;
revoke execute on function public.my_teaching_schedule_ack_state(date) from public,anon;
revoke execute on function public.teaching_schedule_ack_history(date,date) from public,anon;
grant execute on function public.acknowledge_teaching_schedule(date,text,text,uuid,timestamptz) to authenticated;
grant execute on function public.snapshot_my_teaching_schedule_expectation(date,boolean,text,text,uuid,timestamptz) to authenticated;
grant execute on function public.sync_teaching_schedule_expectations(jsonb,uuid,timestamptz) to authenticated;
grant execute on function public.my_teaching_schedule_ack_state(date) to authenticated;
grant execute on function public.teaching_schedule_ack_history(date,date) to authenticated;

commit;