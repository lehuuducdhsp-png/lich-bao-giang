begin;

-- Mở quyền theo dõi xác nhận lịch ngày mai theo cách linh hoạt, không khóa theo vai trò.
-- Chủ sở hữu: luôn xem toàn hệ thống.
-- Nhóm trưởng: mặc định xem phạm vi nhóm mình quản lý.
-- Bất kỳ tài khoản hoạt động nào: có thể được Chủ sở hữu cấp quyền xem toàn hệ thống.
-- Tách hoàn toàn khỏi quyền Check-in GPS.

alter table public.profiles
  add column if not exists can_monitor_schedule_ack_all boolean not null default false;

-- Bảo toàn những quyền đã cấp thử trước đó cho tài khoản Quản lý.
update public.profiles
set can_monitor_schedule_ack_all = true
where coalesce(manager_can_schedule_ack_monitor,false) = true
  and coalesce(can_monitor_schedule_ack_all,false) = false;

create or replace function public.set_schedule_ack_monitor_permission(
  p_user_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_owner() then
    raise exception 'Chỉ Chủ sở hữu được cấp quyền xem xác nhận lịch dạy toàn hệ thống.';
  end if;

  update public.profiles p
  set can_monitor_schedule_ack_all=coalesce(p_enabled,false)
  where p.id=p_user_id
    and p.role<>'owner'
    and p.is_active
    and (p.expires_at is null or p.expires_at>now());

  if not found then
    raise exception 'Không tìm thấy tài khoản hoạt động để cấp quyền.';
  end if;
end;
$$;

create or replace function public.schedule_ack_monitor_people()
returns table(
  user_id uuid,
  display_name text,
  username text,
  enabled boolean
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.is_owner() then
    raise exception 'Chỉ Chủ sở hữu được cấu hình quyền theo dõi xác nhận lịch dạy.';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.username,
    coalesce(p.can_monitor_schedule_ack_all,false)
  from public.profiles p
  where p.is_active
    and p.role<>'owner'
    and (p.expires_at is null or p.expires_at>now())
  order by
    case when coalesce(p.can_monitor_schedule_ack_all,false) then 0 else 1 end,
    p.display_name,
    p.username;
end;
$$;

create or replace function public.my_schedule_ack_monitor_access()
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_global boolean := false;
begin
  if v_uid is null then return 'none'; end if;
  if public.is_owner(v_uid) then return 'all'; end if;

  select coalesce(p.can_monitor_schedule_ack_all,false)
  into v_global
  from public.profiles p
  where p.id=v_uid
    and p.is_active
    and (p.expires_at is null or p.expires_at>now());

  if coalesce(v_global,false) then return 'all'; end if;
  if public.is_group_leader(v_uid) then return 'group'; end if;
  return 'none';
end;
$$;

create or replace function public.teaching_schedule_ack_dashboard(
  p_teaching_date date
)
returns table(
  user_id uuid,
  display_name text,
  username text,
  teacher_code text,
  is_group_leader boolean,
  group_id uuid,
  group_name text,
  acknowledged_at timestamptz,
  schedule_signature text,
  schedule_summary text,
  source_tkb_id uuid,
  source_tkb_updated_at timestamptz
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
  v_global boolean := false;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  v_owner := public.is_owner(v_uid);
  v_leader := public.is_group_leader(v_uid);

  select coalesce(p.can_monitor_schedule_ack_all,false)
  into v_global
  from public.profiles p
  where p.id=v_uid
    and p.is_active
    and (p.expires_at is null or p.expires_at>now());
  if not found then v_global := false; end if;

  if not v_owner and not v_leader and not v_global then
    raise exception 'Bạn không có quyền theo dõi xác nhận lịch dạy.';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.username,
    upper(btrim(coalesce(p.teacher_code,''))) as teacher_code,
    coalesce(p.is_group_leader,false),
    grp.group_id,
    grp.group_name,
    a.acknowledged_at,
    a.schedule_signature,
    a.schedule_summary,
    a.source_tkb_id,
    a.source_tkb_updated_at
  from public.profiles p
  left join lateral (
    select gm.group_id,g.name as group_name
    from public.teacher_group_memberships gm
    join public.teacher_groups g on g.id=gm.group_id and g.is_active
    where gm.user_id=p.id
      and gm.valid_to is null
      and (
        v_owner
        or v_global
        or exists(
          select 1
          from public.teacher_group_managers m
          where m.user_id=v_uid and m.group_id=gm.group_id
        )
      )
    order by g.name,gm.valid_from desc
    limit 1
  ) grp on true
  left join public.teaching_schedule_acknowledgements a
    on a.user_id=p.id and a.teaching_date=p_teaching_date
  where p.is_active
    and p.role<>'owner'
    and (p.expires_at is null or p.expires_at>now())
    and btrim(coalesce(p.teacher_code,''))<>''
    and (
      v_owner
      or v_global
      or exists(
        select 1
        from public.teacher_group_memberships gm2
        join public.teacher_group_managers m2
          on m2.group_id=gm2.group_id and m2.user_id=v_uid
        join public.teacher_groups g2
          on g2.id=gm2.group_id and g2.is_active
        where gm2.user_id=p.id and gm2.valid_to is null
      )
    )
  order by coalesce(grp.group_name,''),p.display_name,p.username;
end;
$$;

grant execute on function public.set_schedule_ack_monitor_permission(uuid,boolean) to authenticated;
grant execute on function public.schedule_ack_monitor_people() to authenticated;
grant execute on function public.my_schedule_ack_monitor_access() to authenticated;
grant execute on function public.teaching_schedule_ack_dashboard(date) to authenticated;

commit;
