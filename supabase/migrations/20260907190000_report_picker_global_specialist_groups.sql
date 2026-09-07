begin;

-- Danh sách Khối / nhóm dùng riêng cho bộ chọn báo giảng.
-- Chủ sở hữu và Trưởng ban chuyên môn được xem toàn bộ nhóm để kiểm tra báo giảng.
-- Quyền này KHÔNG mở rộng quyền quản lý nhóm, tài khoản, bảng kê hay Google Sheets.
create or replace function public.report_picker_groups()
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
  v_report_all boolean;
  v_groups jsonb;
begin
  if v_uid is null then
    raise exception 'Bạn chưa đăng nhập.';
  end if;

  select * into v_profile
  from public.profiles
  where id=v_uid;

  if not found then
    raise exception 'Không tìm thấy hồ sơ tài khoản.';
  end if;

  v_owner := public.is_owner(v_uid);
  v_report_all := v_owner
    or coalesce(v_profile.can_review_all_reports,false)
    or (
      coalesce(v_profile.is_manager,false)
      and coalesce(v_profile.manager_can_review_all_reports,false)
    );

  select coalesce(jsonb_agg(group_row order by group_row->>'name'),'[]'::jsonb)
  into v_groups
  from (
    select jsonb_build_object(
      'id',g.id,
      'name',g.name,
      'members',coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'teacher_code',upper(coalesce(p.teacher_code,''))
          )
          order by p.display_name
        )
        from public.teacher_group_memberships gm
        join public.profiles p on p.id=gm.user_id
        where gm.group_id=g.id
          and gm.valid_to is null
          and p.is_active
      ),'[]'::jsonb)
    ) as group_row
    from public.teacher_groups g
    where g.is_active
      and (
        v_report_all
        or public.can_view_teacher_group(g.id,v_uid)
      )
  ) s;

  return v_groups;
end;
$$;

revoke all on function public.report_picker_groups() from public;
grant execute on function public.report_picker_groups() to authenticated;

commit;
