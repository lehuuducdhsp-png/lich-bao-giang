begin;

-- Check-in admin polish:
-- 1) expose only reviewable active groups for the Check-in group filter;
-- 2) add a safe owner-only "delete group" operation implemented as archive/soft-delete.

create or replace function public.checkin_review_groups()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_gate jsonb;
  v_groups jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  v_gate := public.checkin_access_context();
  if not coalesce((v_gate->>'can_review')::boolean,false) then
    raise exception 'Tài khoản không có quyền kiểm tra Check-in.';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',g.id,
      'name',g.name,
      'member_count',(
        select count(*)::integer
        from public.teacher_group_memberships gm
        join public.profiles p on p.id=gm.user_id
        where gm.group_id=g.id
          and gm.valid_to is null
          and p.is_active
          and (p.expires_at is null or p.expires_at>now())
      ),
      'member_codes',coalesce((
        select jsonb_agg(upper(btrim(p.teacher_code)) order by upper(btrim(p.teacher_code)))
        from public.teacher_group_memberships gm
        join public.profiles p on p.id=gm.user_id
        where gm.group_id=g.id
          and gm.valid_to is null
          and p.is_active
          and (p.expires_at is null or p.expires_at>now())
          and btrim(coalesce(p.teacher_code,''))<>''
      ),'[]'::jsonb)
    ) order by g.name
  ),'[]'::jsonb)
  into v_groups
  from public.teacher_groups g
  where g.is_active
    and (
      public.is_owner(v_uid)
      or public.checkin_is_active_manager(v_uid)
      or exists(
        select 1
        from public.teacher_group_managers m
        where m.group_id=g.id and m.user_id=v_uid
      )
    );

  return v_groups;
end;
$$;

grant execute on function public.checkin_review_groups() to authenticated;

create or replace function public.archive_teacher_group(
  p_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_members integer := 0;
  v_managers integer := 0;
  v_access integer := 0;
  v_manager_ids uuid[] := '{}'::uuid[];
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  if not public.is_owner(v_uid) then
    raise exception 'Chỉ Chủ sở hữu được xóa nhóm.';
  end if;

  select name into v_name
  from public.teacher_groups
  where id=p_group_id and is_active
  for update;

  if not found then raise exception 'Không tìm thấy nhóm đang hoạt động.'; end if;

  select coalesce(array_agg(user_id),'{}'::uuid[])
  into v_manager_ids
  from public.teacher_group_managers
  where group_id=p_group_id;

  update public.teacher_group_memberships
  set valid_to=now(), ended_by=v_uid
  where group_id=p_group_id and valid_to is null;
  get diagnostics v_members = row_count;

  delete from public.teacher_group_scoped_access
  where group_id=p_group_id;
  get diagnostics v_access = row_count;

  delete from public.teacher_group_managers
  where group_id=p_group_id;
  get diagnostics v_managers = row_count;

  update public.teacher_groups
  set is_active=false, updated_at=now()
  where id=p_group_id;

  if cardinality(v_manager_ids)>0 then
    update public.profiles p
    set is_group_leader=exists(
      select 1
      from public.teacher_group_managers m
      join public.teacher_groups g on g.id=m.group_id and g.is_active
      where m.user_id=p.id
    )
    where p.id=any(v_manager_ids)
      and p.role<>'owner';
  end if;

  return jsonb_build_object(
    'group_id',p_group_id,
    'group_name',v_name,
    'archived',true,
    'members_released',v_members,
    'managers_removed',v_managers,
    'scoped_access_removed',v_access,
    'archived_at',now()
  );
end;
$$;

grant execute on function public.archive_teacher_group(uuid) to authenticated;

commit;
