begin;

-- Check-in permission administration V2.
-- Owner can manage all PILOT participants in grouped views.
-- Group Leaders can manage Check-in access only for regular members of groups they lead.
-- Review permission remains Owner-controlled. Production role rules are unchanged.

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
      grp.group_id,
      grp.group_name,
      coalesce(cp.can_checkin,false) as pilot_checkin,
      coalesce(cp.can_review,false) as pilot_review,
      cp.note as pilot_note
    from public.profiles p
    left join lateral (
      select gm.group_id, g.name as group_name
      from public.teacher_group_memberships gm
      join public.teacher_groups g
        on g.id=gm.group_id
       and g.is_active
      where gm.user_id=p.id
        and gm.valid_to is null
      order by g.name, gm.valid_from desc
      limit 1
    ) grp on true
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
    x.group_id,
    x.group_name,
    case
      when x.target_is_manager then 'admin'
      when x.group_id is null then 'ungrouped'
      else 'group:'||x.group_id::text
    end as bucket_key,
    case
      when x.target_is_manager then 'Hành chính / Quản lý'
      when x.group_id is null then 'Chưa phân nhóm'
      else x.group_name
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
            join public.teacher_groups g on g.id=m.group_id and g.is_active
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
        join public.teacher_groups g on g.id=m.group_id and g.is_active
        where m.user_id=v_uid
      )
    )
  order by
    case when x.target_is_manager then 0 when x.group_id is null then 2 else 1 end,
    coalesce(x.group_name,''),
    x.display_name,
    x.username;
end;
$$;

create or replace function public.set_checkin_pilot_access_bulk(
  p_changes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner boolean;
  v_leader boolean;
  v_phase text;
  v_item jsonb;
  v_target uuid;
  v_profile public.profiles;
  v_target_leader boolean;
  v_target_manager boolean;
  v_requested_checkin boolean;
  v_requested_review boolean;
  v_existing_review boolean;
  v_final_checkin boolean;
  v_final_review boolean;
  v_note text;
  v_count integer := 0;
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
    raise exception 'Chỉ được chỉnh danh sách quyền khi hệ thống đang ở chế độ PILOT.';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then
    raise exception 'Dữ liệu lưu hàng loạt không hợp lệ.';
  end if;

  if jsonb_array_length(p_changes) > 300 then
    raise exception 'Mỗi lần chỉ được lưu tối đa 300 tài khoản.';
  end if;

  for v_item in select value from jsonb_array_elements(p_changes)
  loop
    begin
      v_target := nullif(v_item->>'user_id','')::uuid;
    exception when others then
      raise exception 'Có tài khoản không hợp lệ trong danh sách thay đổi.';
    end;

    if v_target is null then
      raise exception 'Thiếu tài khoản trong danh sách thay đổi.';
    end if;

    select * into v_profile
    from public.profiles p
    where p.id=v_target
      and p.is_active
      and (p.expires_at is null or p.expires_at>now())
      and p.role <> 'owner';

    if not found then
      raise exception 'Không tìm thấy tài khoản hợp lệ.';
    end if;

    v_target_leader := public.is_group_leader(v_target);
    v_target_manager := public.checkin_is_active_manager(v_target);
    v_requested_checkin := coalesce((v_item->>'can_checkin')::boolean,false);
    v_requested_review := coalesce((v_item->>'can_review')::boolean,false);
    v_note := nullif(regexp_replace(btrim(coalesce(v_item->>'note','')), '[[:space:]]+', ' ', 'g'),'');

    if char_length(coalesce(v_note,'')) > 200 then
      raise exception 'Ghi chú tối đa 200 ký tự.';
    end if;

    select coalesce(cp.can_review,false)
    into v_existing_review
    from public.checkin_pilot_users cp
    where cp.user_id=v_target;
    if not found then v_existing_review := false; end if;

    if v_owner then
      v_final_checkin := v_requested_checkin
        and btrim(coalesce(v_profile.teacher_code,''))<>''
        and not v_target_leader;
      v_final_review := v_requested_review
        and (v_target_leader or v_target_manager);
    else
      if v_target_leader or v_target_manager then
        raise exception 'Nhóm trưởng chỉ được quản lý quyền Check-in của giáo viên thường trong nhóm.';
      end if;

      if not exists(
        select 1
        from public.teacher_group_managers m
        join public.teacher_group_memberships gm
          on gm.group_id=m.group_id
         and gm.user_id=v_target
         and gm.valid_to is null
        join public.teacher_groups g on g.id=m.group_id and g.is_active
        where m.user_id=v_uid
      ) then
        raise exception 'Tài khoản không thuộc nhóm bạn đang quản lý.';
      end if;

      if btrim(coalesce(v_profile.teacher_code,''))='' and v_requested_checkin then
        raise exception 'Giáo viên chưa có mã TKB nên chưa thể bật Check-in.';
      end if;

      v_final_checkin := v_requested_checkin and btrim(coalesce(v_profile.teacher_code,''))<>'';
      -- Review stays exactly as the Owner last configured it.
      v_final_review := v_existing_review;
    end if;

    if not v_final_checkin and not v_final_review then
      delete from public.checkin_pilot_users where user_id=v_target;
    else
      insert into public.checkin_pilot_users(
        user_id,can_checkin,can_review,note,enabled_at,enabled_by
      ) values(
        v_target,v_final_checkin,v_final_review,v_note,now(),v_uid
      )
      on conflict(user_id) do update set
        can_checkin=excluded.can_checkin,
        can_review=excluded.can_review,
        note=excluded.note,
        enabled_at=excluded.enabled_at,
        enabled_by=excluded.enabled_by;
    end if;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'saved',true,
    'changed_count',v_count,
    'phase',v_phase,
    'actor_is_owner',v_owner,
    'actor_is_group_leader',v_leader
  );
end;
$$;

grant execute on function public.checkin_permission_admin_list() to authenticated;
grant execute on function public.set_checkin_pilot_access_bulk(jsonb) to authenticated;

commit;
