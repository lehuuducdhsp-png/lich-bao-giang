begin;

-- Nhóm trưởng tự động được tính là giáo viên thuộc phạm vi báo giảng của nhóm mình quản lý.
-- Người phụ trách chuyên môn xem một nhóm sẽ thấy cả nhóm trưởng và các thành viên của nhóm đó.
create or replace function public.my_access_context()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_owner boolean;
  v_codes jsonb;
  v_groups jsonb;
  v_managed jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  select * into v_profile from public.profiles where id=v_uid;
  if not found then raise exception 'Không tìm thấy hồ sơ tài khoản.'; end if;
  v_owner := public.is_owner(v_uid);

  select coalesce(jsonb_agg(x.teacher_code order by x.teacher_code),'[]'::jsonb)
  into v_codes
  from (
    select distinct teacher_code
    from (
      select upper(btrim(v_profile.teacher_code)) as teacher_code
      where v_profile.teacher_code is not null and btrim(v_profile.teacher_code)<>''

      union

      select upper(btrim(r.teacher_code))
      from public.teacher_group_roster r
      join public.teacher_groups g on g.id=r.group_id and g.is_active
      where r.valid_to is null
        and (v_owner or public.can_view_teacher_group(r.group_id,v_uid))

      union

      select upper(btrim(p.teacher_code))
      from public.teacher_group_managers m
      join public.teacher_groups g on g.id=m.group_id and g.is_active
      join public.profiles p on p.id=m.user_id
      where p.teacher_code is not null and btrim(p.teacher_code)<>''
        and (v_owner or public.can_view_teacher_group(m.group_id,v_uid))

      union

      select upper(btrim(p.teacher_code))
      from public.profiles p
      join public.teacher_group_memberships gm on gm.user_id=p.id and gm.valid_to is null
      where p.teacher_code is not null and btrim(p.teacher_code)<>''
        and (v_owner or public.can_view_teacher_group(gm.group_id,v_uid))

      union

      select upper(btrim(p.teacher_code))
      from public.profiles p
      where v_owner and p.teacher_code is not null and btrim(p.teacher_code)<>''
    ) all_codes
    where teacher_code is not null and teacher_code<>''
  ) x;

  select coalesce(jsonb_agg(g.id order by g.name),'[]'::jsonb)
  into v_groups
  from public.teacher_groups g
  where g.is_active and (v_owner or public.can_view_teacher_group(g.id,v_uid));

  select coalesce(jsonb_agg(g.id order by g.name),'[]'::jsonb)
  into v_managed
  from public.teacher_groups g
  where g.is_active and public.can_manage_teacher_group(g.id,v_uid);

  return jsonb_build_object(
    'user_id',v_uid,
    'role',v_profile.role,
    'display_name',v_profile.display_name,
    'teacher_code',upper(coalesce(v_profile.teacher_code,'')),
    'is_owner',v_owner,
    'is_group_leader',v_profile.is_group_leader,
    'can_view_payroll_details',v_owner or v_profile.can_view_payroll_details,
    'can_view_all_weekly_stats',v_owner or v_profile.is_group_leader,
    'teacher_codes',v_codes,
    'group_ids',v_groups,
    'managed_group_ids',v_managed
  );
end;
$$;

grant execute on function public.my_access_context() to authenticated;

commit;
