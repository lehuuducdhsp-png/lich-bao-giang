begin;

alter table public.profiles
  add column if not exists manager_can_schedule_ack_monitor boolean not null default false;

create table if not exists public.teaching_schedule_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  teaching_date date not null,
  schedule_signature text not null,
  schedule_summary text not null default '',
  source_tkb_id uuid null references public.tkb_files(id) on delete set null,
  source_tkb_updated_at timestamptz null,
  acknowledged_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, teaching_date)
);

create index if not exists teaching_schedule_ack_date_idx
  on public.teaching_schedule_acknowledgements(teaching_date, user_id);

alter table public.teaching_schedule_acknowledgements enable row level security;
revoke all on table public.teaching_schedule_acknowledgements from anon, authenticated;

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
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_row public.teaching_schedule_acknowledgements;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  select * into v_profile from public.profiles p
  where p.id=v_uid and p.is_active and (p.expires_at is null or p.expires_at>now());
  if not found then raise exception 'Tài khoản không còn hoạt động.'; end if;
  if btrim(coalesce(v_profile.teacher_code,''))='' then raise exception 'Tài khoản chưa liên kết mã giáo viên trong TKB.'; end if;
  if p_teaching_date is distinct from (v_today + 1) then raise exception 'Chỉ xác nhận lịch dạy của ngày mai.'; end if;
  if btrim(coalesce(p_schedule_signature,''))='' or char_length(p_schedule_signature)>20000 then raise exception 'Dấu nhận diện lịch dạy không hợp lệ.'; end if;
  if char_length(coalesce(p_schedule_summary,''))>5000 then raise exception 'Nội dung tóm tắt lịch dạy quá dài.'; end if;

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

  return jsonb_build_object('saved',true,'teaching_date',v_row.teaching_date,'schedule_signature',v_row.schedule_signature,'acknowledged_at',v_row.acknowledged_at);
end;
$$;

create or replace function public.my_teaching_schedule_ack(p_teaching_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.teaching_schedule_acknowledgements;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  select * into v_row from public.teaching_schedule_acknowledgements a
  where a.user_id=v_uid and a.teaching_date=p_teaching_date;
  if not found then return null; end if;
  return jsonb_build_object('teaching_date',v_row.teaching_date,'schedule_signature',v_row.schedule_signature,'schedule_summary',v_row.schedule_summary,'source_tkb_id',v_row.source_tkb_id,'source_tkb_updated_at',v_row.source_tkb_updated_at,'acknowledged_at',v_row.acknowledged_at,'updated_at',v_row.updated_at);
end;
$$;

create or replace function public.set_schedule_ack_monitor_permission(p_user_id uuid,p_enabled boolean)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_owner() then raise exception 'Chỉ Chủ sở hữu được cấp quyền theo dõi xác nhận lịch dạy.'; end if;
  update public.profiles p
  set manager_can_schedule_ack_monitor=coalesce(p_enabled,false)
  where p.id=p_user_id and p.role<>'owner' and p.is_active and p.is_manager;
  if not found then raise exception 'Chỉ có thể cấp quyền này cho tài khoản Quản lý đang hoạt động.'; end if;
end;
$$;

create or replace function public.schedule_ack_monitor_people()
returns table(user_id uuid,display_name text,username text,enabled boolean)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.is_owner() then raise exception 'Chỉ Chủ sở hữu được cấu hình quyền theo dõi xác nhận lịch dạy.'; end if;
  return query
  select p.id,p.display_name,p.username,coalesce(p.manager_can_schedule_ack_monitor,false)
  from public.profiles p
  where p.is_active and p.is_manager and p.role<>'owner' and (p.expires_at is null or p.expires_at>now())
  order by p.display_name,p.username;
end;
$$;

create or replace function public.teaching_schedule_ack_dashboard(p_teaching_date date)
returns table(
  user_id uuid,display_name text,username text,teacher_code text,is_group_leader boolean,
  group_id uuid,group_name text,acknowledged_at timestamptz,schedule_signature text,
  schedule_summary text,source_tkb_id uuid,source_tkb_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner boolean;
  v_leader boolean;
  v_manager_monitor boolean;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  v_owner := public.is_owner(v_uid);
  v_leader := public.is_group_leader(v_uid);
  select exists(
    select 1 from public.profiles p
    where p.id=v_uid and p.is_active and p.is_manager and p.manager_can_schedule_ack_monitor
      and (p.expires_at is null or p.expires_at>now())
  ) into v_manager_monitor;
  if not v_owner and not v_leader and not v_manager_monitor then raise exception 'Bạn không có quyền theo dõi xác nhận lịch dạy.'; end if;

  return query
  select p.id,p.display_name,p.username,upper(btrim(coalesce(p.teacher_code,''))) as teacher_code,
    coalesce(p.is_group_leader,false),grp.group_id,grp.group_name,
    a.acknowledged_at,a.schedule_signature,a.schedule_summary,a.source_tkb_id,a.source_tkb_updated_at
  from public.profiles p
  left join lateral (
    select gm.group_id,g.name as group_name
    from public.teacher_group_memberships gm
    join public.teacher_groups g on g.id=gm.group_id and g.is_active
    where gm.user_id=p.id and gm.valid_to is null
      and (v_owner or v_manager_monitor or exists(select 1 from public.teacher_group_managers m where m.user_id=v_uid and m.group_id=gm.group_id))
    order by g.name,gm.valid_from desc
    limit 1
  ) grp on true
  left join public.teaching_schedule_acknowledgements a on a.user_id=p.id and a.teaching_date=p_teaching_date
  where p.is_active and p.role<>'owner' and (p.expires_at is null or p.expires_at>now())
    and btrim(coalesce(p.teacher_code,''))<>''
    and (
      v_owner or v_manager_monitor or exists(
        select 1 from public.teacher_group_memberships gm2
        join public.teacher_group_managers m2 on m2.group_id=gm2.group_id and m2.user_id=v_uid
        join public.teacher_groups g2 on g2.id=gm2.group_id and g2.is_active
        where gm2.user_id=p.id and gm2.valid_to is null
      )
    )
  order by coalesce(grp.group_name,''),p.display_name,p.username;
end;
$$;

grant execute on function public.acknowledge_teaching_schedule(date,text,text,uuid,timestamptz) to authenticated;
grant execute on function public.my_teaching_schedule_ack(date) to authenticated;
grant execute on function public.set_schedule_ack_monitor_permission(uuid,boolean) to authenticated;
grant execute on function public.schedule_ack_monitor_people() to authenticated;
grant execute on function public.teaching_schedule_ack_dashboard(date) to authenticated;

commit;
