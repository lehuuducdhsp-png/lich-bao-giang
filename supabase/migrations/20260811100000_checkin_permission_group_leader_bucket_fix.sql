begin;

-- Fix grouping in the PILOT Check-in permission administration screen.
-- Group leaders are represented by teacher_group_managers and are not necessarily
-- ordinary rows in teacher_group_memberships. Therefore, when building the Owner's
-- grouped permission list, prefer the group a user manages (primary first), then
-- fall back to the user's current membership group. Only users with neither relation
-- are classified as "Chưa phân nhóm".

create or replace function public.checkin_permission_admin_list()
returns table(
  user_id uuid,
  display_name text,
  username text,
  teacher_code text,
  is_group_leader boolean,
  is_manager boolean,
  group_id uuid,
  group_name text,
  bucket_key text,
  bucket_name text,
  can_checkin boolean,
  can_review boolean,
  note text,
  can_edit_checkin boolean,
  can_edit_review boolean
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
  v_phase text;
begin
  if v_uid is null then
    raise exception 'Bạn chưa đăng nhập.';
  end if;

  v_owner := public.is_owner(v_uid);
  v_leader := public.is_group_leader(v_uid);

  if not v_owner and not v_leader then
    raise exception 'Bạn không có quyền quản lý quyền Check-in.';
  end if;

  select s.phase into v_phase
  from public.checkin_system_settings s
  where s.id=1;

  if coalesce(v_phase,'') <> 'pilot' then
    raise exception 'Danh sách quyền thử nghiệm chỉ sử dụng khi Check-in đang ở chế độ PILOT.';
  end if;

  return query
  with people as (
    select
      p.id,
      p.display_name,
      p.username,
      p.teacher_code,
      public.is_group_leader(p.id) as target_is_group_leader,
      public.checkin_is_active_manager(p.id) as target_is_manager,
      coalesce(managed_grp.group_id, member_grp.group_id) as effective_group_id,
      coalesce(managed_grp.group_name, member_grp.group_name) as effective_group_name,
      coalesce(cp.can_checkin,false) as pilot_checkin,
      coalesce(cp.can_review,false) as pilot_review,
      cp.note as pilot_note
    from public.profiles p

    -- A group leader belongs to the permission bucket of the group they manage.
    -- If a user manages multiple groups, prefer the primary assignment; otherwise
    -- use a deterministic name/id order so the account appears only once.
    left join lateral (
      select m.group_id, g.name as group_name
      from public.teacher_group_managers m
      join public.teacher_groups g
        on g.id=m.group_id
       and g.is_active
      where m.user_id=p.id
      order by m.is_primary desc, g.name, m.group_id
      limit 1
    ) managed_grp on true

    -- Ordinary teachers use their current active membership group.
    left join lateral (
      select gm.group_id, g.name as group_name
      from public.teacher_group_memberships gm
      join public.teacher_groups g
        on g.id=gm.group_id
       and g.is_active
      where gm.user_id=p.id
        and gm.valid_to is null
      order by gm.valid_from desc, g.name, gm.group_id
      limit 1
    ) member_grp on true

    left join public.checkin_pilot_users cp on cp.user_id=p.id
    where p.is_active
      and (p.expires_at is null or p.expires_at>now())
      and p.role <> 'owner'
  )
  select
    x.id,
    x.display_name,
    x.username,
    x.teacher_code,
    x.target_is_group_leader,
    x.target_is_manager,
    x.effective_group_id,
    x.effective_group_name,
    case
      when x.target_is_manager then 'admin'
      when x.effective_group_id is null then 'ungrouped'
      else 'group:'||x.effective_group_id::text
    end as bucket_key,
    case
      when x.target_is_manager then 'Hành chính / Quản lý'
      when x.effective_group_id is null then 'Chưa phân nhóm'
      else x.effective_group_name
    end as bucket_name,
    x.pilot_checkin,
    x.pilot_review,
    x.pilot_note,
    (
      btrim(coalesce(x.teacher_code,''))<>''
      and not x.target_is_group_leader
      and (
        v_owner
        or (
          v_leader
          and not x.target_is_manager
          and exists(
            select 1
            from public.teacher_group_managers m
            join public.teacher_group_memberships gm
              on gm.group_id=m.group_id
             and gm.user_id=x.id
             and gm.valid_to is null
            join public.teacher_groups g
              on g.id=m.group_id
             and g.is_active
            where m.user_id=v_uid
          )
        )
      )
    ) as can_edit_checkin,
    (v_owner and (x.target_is_group_leader or x.target_is_manager)) as can_edit_review
  from people x
  where
    v_owner
    or (
      v_leader
      and not x.target_is_group_leader
      and not x.target_is_manager
      and exists(
        select 1
        from public.teacher_group_managers m
        join public.teacher_group_memberships gm
          on gm.group_id=m.group_id
         and gm.user_id=x.id
         and gm.valid_to is null
        join public.teacher_groups g
          on g.id=m.group_id
         and g.is_active
        where m.user_id=v_uid
      )
    )
  order by
    case when x.target_is_manager then 0 when x.effective_group_id is null then 2 else 1 end,
    coalesce(x.effective_group_name,''),
    x.display_name,
    x.username;
end;
$$;

commit;
