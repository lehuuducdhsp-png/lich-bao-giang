begin;

-- Trưởng ban chuyên môn là quyền toàn hệ thống đối với việc kiểm tra/lập báo giảng.
-- Quyền này KHÔNG bao gồm xem bảng kê cá nhân, quản lý tài khoản, Google Sheets
-- hoặc quản lý thành viên nhóm.
alter table public.profiles
  add column if not exists can_review_all_reports boolean not null default false;

-- Giữ lại lựa chọn cũ một cách an toàn: tài khoản đã được cấp chuyên môn ở
-- toàn bộ các nhóm đang hoạt động sẽ tự chuyển thành Trưởng ban chuyên môn toàn hệ thống.
update public.profiles p
set can_review_all_reports=true
where p.role<>'owner'
  and exists(select 1 from public.teacher_groups g where g.is_active)
  and not exists(
    select 1
    from public.teacher_groups g
    where g.is_active
      and not exists(
        select 1
        from public.teacher_group_scoped_access a
        where a.group_id=g.id and a.user_id=p.id
      )
  );

-- Cơ chế chuyên môn theo từng nhóm được ngừng sử dụng.
-- Nhóm vẫn dành cho nhóm trưởng; Trưởng ban chuyên môn dùng cờ toàn hệ thống ở profiles.
create or replace function public.can_view_teacher_group(
  p_group uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_owner(p_user)
    or exists(
      select 1
      from public.teacher_group_managers m
      where m.group_id=p_group and m.user_id=p_user
    );
$$;

create or replace function public.can_manage_teacher_group(
  p_group uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_owner(p_user)
    or exists(
      select 1
      from public.teacher_group_managers m
      where m.group_id=p_group
        and m.user_id=p_user
        and m.can_manage_members
    );
$$;

create or replace function public.set_global_specialist_access(
  p_user_id uuid,
  p_enabled boolean default true
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_owner() then
    raise exception 'Chỉ chủ sở hữu được cấp quyền Trưởng ban chuyên môn.';
  end if;

  update public.profiles
  set can_review_all_reports=coalesce(p_enabled,false)
  where id=p_user_id and role<>'owner';

  if not found then
    raise exception 'Không tìm thấy tài khoản thành viên.';
  end if;
end;
$$;

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
  v_specialist boolean;
  v_codes jsonb;
  v_groups jsonb;
  v_managed jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_profile
  from public.profiles
  where id=v_uid;

  if not found then raise exception 'Không tìm thấy hồ sơ tài khoản.'; end if;

  v_owner := public.is_owner(v_uid);
  v_specialist := v_owner or coalesce(v_profile.can_review_all_reports,false);

  select coalesce(jsonb_agg(x.teacher_code order by x.teacher_code),'[]'::jsonb)
  into v_codes
  from (
    select distinct upper(btrim(p.teacher_code)) as teacher_code
    from public.profiles p
    where p.teacher_code is not null
      and btrim(p.teacher_code)<>''
      and (
        v_specialist
        or p.id=v_uid
        or exists(
          select 1
          from public.teacher_group_memberships gm
          where gm.user_id=p.id
            and gm.valid_to is null
            and public.can_view_teacher_group(gm.group_id,v_uid)
        )
        or exists(
          select 1
          from public.teacher_group_managers m
          where m.user_id=p.id
            and public.can_view_teacher_group(m.group_id,v_uid)
        )
      )
  ) x;

  select coalesce(jsonb_agg(g.id order by g.name),'[]'::jsonb)
  into v_groups
  from public.teacher_groups g
  where g.is_active
    and (v_owner or public.can_view_teacher_group(g.id,v_uid));

  select coalesce(jsonb_agg(g.id order by g.name),'[]'::jsonb)
  into v_managed
  from public.teacher_groups g
  where g.is_active
    and public.can_manage_teacher_group(g.id,v_uid);

  return jsonb_build_object(
    'user_id',v_uid,
    'role',v_profile.role,
    'display_name',v_profile.display_name,
    'teacher_code',upper(coalesce(v_profile.teacher_code,'')),
    'is_owner',v_owner,
    'is_group_leader',v_profile.is_group_leader,
    'is_head_specialist',coalesce(v_profile.can_review_all_reports,false),
    'can_review_all_reports',v_specialist,
    'can_view_payroll_details',v_owner or v_profile.can_view_payroll_details,
    'can_view_all_weekly_stats',v_owner or v_profile.is_group_leader or coalesce(v_profile.can_review_all_reports,false),
    'teacher_codes',v_codes,
    'group_ids',v_groups,
    'managed_group_ids',v_managed
  );
end;
$$;

grant execute on function public.set_global_specialist_access(uuid,boolean) to authenticated;
grant execute on function public.my_access_context() to authenticated;
grant execute on function public.can_view_teacher_group(uuid,uuid) to authenticated;
grant execute on function public.can_manage_teacher_group(uuid,uuid) to authenticated;

commit;
