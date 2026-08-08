begin;

-- Tài khoản Quản lý không bắt buộc có mã TKB.
-- Các quyền được tách độc lập để Chủ sở hữu cấp đúng nhu cầu.
alter table public.profiles
  add column if not exists can_review_all_reports boolean not null default false,
  add column if not exists is_manager boolean not null default false,
  add column if not exists manager_can_weekly_stats boolean not null default false,
  add column if not exists manager_can_manage_groups boolean not null default false,
  add column if not exists manager_can_transfer_members boolean not null default false,
  add column if not exists manager_can_upload_shared boolean not null default false,
  add column if not exists manager_can_activate_shared_tkb boolean not null default false,
  add column if not exists manager_can_review_all_reports boolean not null default false,
  add column if not exists manager_can_view_other_payroll boolean not null default false,
  add column if not exists manager_can_view_payroll_amounts boolean not null default false,
  add column if not exists can_upload_shared boolean not null default false;

-- Nếu trước đây một tài khoản đã được cấp chuyên môn ở toàn bộ nhóm đang hoạt động,
-- giữ ý nghĩa cũ bằng cách chuyển thành Trưởng ban chuyên môn toàn hệ thống.
update public.profiles p
set can_review_all_reports=true
where p.role<>'owner'
  and exists(select 1 from public.teacher_groups g where g.is_active)
  and not exists(
    select 1
    from public.teacher_groups g
    where g.is_active
      and not exists(
        select 1 from public.teacher_group_scoped_access a
        where a.group_id=g.id and a.user_id=p.id
      )
  );

create or replace function public.has_manager_permission(
  p_permission text,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_owner(p_user) or exists(
    select 1
    from public.profiles p
    where p.id=p_user
      and p.is_active
      and p.is_manager
      and (p.expires_at is null or p.expires_at>now())
      and case lower(coalesce(p_permission,''))
        when 'weekly_stats' then p.manager_can_weekly_stats
        when 'manage_groups' then p.manager_can_manage_groups
        when 'transfer_members' then p.manager_can_transfer_members
        when 'upload_shared' then p.manager_can_upload_shared
        when 'activate_shared_tkb' then p.manager_can_activate_shared_tkb
        when 'review_all_reports' then p.manager_can_review_all_reports
        when 'view_other_payroll' then p.manager_can_view_other_payroll
        when 'view_payroll_amounts' then p.manager_can_view_payroll_amounts and p.manager_can_view_other_payroll
        else false
      end
  );
$$;

create or replace function public.set_manager_permissions(
  p_user_id uuid,
  p_is_manager boolean,
  p_permissions jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_manager boolean := coalesce(p_is_manager,false);
  v_stats boolean := v_manager and coalesce((p_permissions->>'weekly_stats')::boolean,false);
  v_groups boolean := v_manager and coalesce((p_permissions->>'manage_groups')::boolean,false);
  v_transfer boolean := v_manager and coalesce((p_permissions->>'transfer_members')::boolean,false);
  v_upload boolean := v_manager and coalesce((p_permissions->>'upload_shared')::boolean,false);
  v_activate boolean := v_manager and coalesce((p_permissions->>'activate_shared_tkb')::boolean,false);
  v_reports boolean := v_manager and coalesce((p_permissions->>'review_all_reports')::boolean,false);
  v_payroll boolean := v_manager and coalesce((p_permissions->>'view_other_payroll')::boolean,false);
  v_money boolean := v_payroll and coalesce((p_permissions->>'view_payroll_amounts')::boolean,false);
begin
  if not public.is_owner() then
    raise exception 'Chỉ chủ sở hữu được cấp quyền Quản lý.';
  end if;

  update public.profiles p
  set is_manager=v_manager,
      manager_can_weekly_stats=v_stats,
      manager_can_manage_groups=v_groups,
      manager_can_transfer_members=v_transfer,
      manager_can_upload_shared=v_upload,
      manager_can_activate_shared_tkb=v_activate,
      manager_can_review_all_reports=v_reports,
      manager_can_view_other_payroll=v_payroll,
      manager_can_view_payroll_amounts=v_money,
      can_upload_shared=(p.role='uploader' or v_upload)
  where p.id=p_user_id and p.role<>'owner';

  if not found then
    raise exception 'Không tìm thấy tài khoản để cấp quyền Quản lý.';
  end if;
end;
$$;

-- Trưởng ban chuyên môn là một vai trò riêng; Quản lý có thể được cấp quyền báo giảng
-- toàn hệ thống mà không bị biến thành Trưởng ban chuyên môn.
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

-- Quản lý nhóm và chuyển thành viên là hai quyền độc lập.
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
    or public.has_manager_permission('manage_groups',p_user)
    or public.has_manager_permission('transfer_members',p_user)
    or exists(
      select 1 from public.teacher_group_managers m
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
    or public.has_manager_permission('transfer_members',p_user)
    or exists(
      select 1 from public.teacher_group_managers m
      where m.group_id=p_group and m.user_id=p_user and m.can_manage_members
    );
$$;

create or replace function public.create_teacher_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if not (public.is_owner() or public.has_manager_permission('manage_groups')) then
    raise exception 'Tài khoản không có quyền tạo nhóm.';
  end if;
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 80 then
    raise exception 'Tên nhóm không hợp lệ.';
  end if;
  insert into public.teacher_groups(name,created_by)
  values(btrim(p_name),auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rename_teacher_group(p_group_id uuid,p_name text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not (public.is_owner() or public.has_manager_permission('manage_groups')) then
    raise exception 'Tài khoản không có quyền đổi tên nhóm.';
  end if;
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 80 then
    raise exception 'Tên nhóm không hợp lệ.';
  end if;
  update public.teacher_groups set name=btrim(p_name) where id=p_group_id and is_active;
  if not found then raise exception 'Không tìm thấy nhóm.'; end if;
end;
$$;

create or replace function public.search_group_transfer_candidates(p_query text)
returns table(
  user_id uuid,
  username text,
  display_name text,
  teacher_code text,
  current_group_id uuid,
  current_group_name text
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_q text := btrim(coalesce(p_query,''));
begin
  if not (
    public.is_owner()
    or public.has_manager_permission('transfer_members')
    or public.is_group_leader()
    or exists(select 1 from public.teacher_group_managers m where m.user_id=auth.uid() and m.can_manage_members)
  ) then
    raise exception 'Tài khoản không có quyền tìm thành viên để chuyển nhóm.';
  end if;
  if char_length(v_q)<2 then raise exception 'Nhập ít nhất 2 ký tự để tìm.'; end if;

  return query
  select p.id,p.username,p.display_name,upper(coalesce(p.teacher_code,'')),gm.group_id,g.name
  from public.profiles p
  left join public.teacher_group_memberships gm on gm.user_id=p.id and gm.valid_to is null
  left join public.teacher_groups g on g.id=gm.group_id
  where p.role<>'owner'
    and p.is_active
    and p.teacher_code is not null
    and btrim(p.teacher_code)<>''
    and (
      p.display_name ilike '%'||v_q||'%'
      or p.username ilike '%'||v_q||'%'
      or p.teacher_code ilike '%'||v_q||'%'
    )
  order by p.display_name
  limit 30;
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
  v_report_all boolean;
  v_codes jsonb;
  v_groups jsonb;
  v_managed jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_profile from public.profiles where id=v_uid;
  if not found then raise exception 'Không tìm thấy hồ sơ tài khoản.'; end if;

  v_owner := public.is_owner(v_uid);
  v_report_all := v_owner
    or coalesce(v_profile.can_review_all_reports,false)
    or (coalesce(v_profile.is_manager,false) and coalesce(v_profile.manager_can_review_all_reports,false));

  select coalesce(jsonb_agg(x.teacher_code order by x.teacher_code),'[]'::jsonb)
  into v_codes
  from (
    select distinct upper(btrim(p.teacher_code)) as teacher_code
    from public.profiles p
    where p.teacher_code is not null
      and btrim(p.teacher_code)<>''
      and (
        v_report_all
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
    'is_group_leader',coalesce(v_profile.is_group_leader,false),
    'is_head_specialist',coalesce(v_profile.can_review_all_reports,false),
    'is_manager',coalesce(v_profile.is_manager,false),
    'can_review_all_reports',v_report_all,
    'can_view_all_weekly_stats',v_owner
      or coalesce(v_profile.is_group_leader,false)
      or coalesce(v_profile.can_review_all_reports,false)
      or (coalesce(v_profile.is_manager,false) and coalesce(v_profile.manager_can_weekly_stats,false)),
    'can_manage_groups',v_owner
      or (coalesce(v_profile.is_manager,false) and coalesce(v_profile.manager_can_manage_groups,false)),
    'can_transfer_group_members',v_owner
      or (coalesce(v_profile.is_manager,false) and coalesce(v_profile.manager_can_transfer_members,false)),
    'can_upload_shared',v_owner
      or v_profile.role='uploader'
      or coalesce(v_profile.can_upload_shared,false)
      or (coalesce(v_profile.is_manager,false) and coalesce(v_profile.manager_can_upload_shared,false)),
    'can_activate_shared_tkb',v_owner
      or (coalesce(v_profile.is_manager,false) and coalesce(v_profile.manager_can_activate_shared_tkb,false)),
    'can_view_payroll_details',v_owner
      or coalesce(v_profile.can_view_payroll_details,false)
      or (coalesce(v_profile.is_manager,false) and coalesce(v_profile.manager_can_view_other_payroll,false)),
    'can_view_payroll_amounts',v_owner
      or ((not coalesce(v_profile.is_manager,false)) and coalesce(v_profile.can_view_payroll_details,false))
      or (coalesce(v_profile.is_manager,false) and coalesce(v_profile.manager_can_view_other_payroll,false) and coalesce(v_profile.manager_can_view_payroll_amounts,false)),
    'manager_permissions',jsonb_build_object(
      'weekly_stats',coalesce(v_profile.manager_can_weekly_stats,false),
      'manage_groups',coalesce(v_profile.manager_can_manage_groups,false),
      'transfer_members',coalesce(v_profile.manager_can_transfer_members,false),
      'upload_shared',coalesce(v_profile.manager_can_upload_shared,false),
      'activate_shared_tkb',coalesce(v_profile.manager_can_activate_shared_tkb,false),
      'review_all_reports',coalesce(v_profile.manager_can_review_all_reports,false),
      'view_other_payroll',coalesce(v_profile.manager_can_view_other_payroll,false),
      'view_payroll_amounts',coalesce(v_profile.manager_can_view_payroll_amounts,false)
    ),
    'teacher_codes',v_codes,
    'group_ids',v_groups,
    'managed_group_ids',v_managed
  );
end;
$$;

-- Quản lý có quyền áp dụng TKB chung được chọn bản chính thức.
create or replace function public.set_active_shared_tkb(p_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not (public.is_owner() or public.has_manager_permission('activate_shared_tkb')) then
    raise exception 'Tài khoản không có quyền áp dụng TKB chung.';
  end if;
  if not exists(select 1 from public.tkb_files where id=p_id and scope='shared' and status='ready') then
    raise exception 'Không tìm thấy TKB chung hợp lệ.';
  end if;
  update public.tkb_files set is_active=false where scope='shared' and is_active;
  update public.tkb_files set is_active=true,updated_at=now() where id=p_id and scope='shared';
end;
$$;

-- Quản lý có quyền tải/áp dụng TKB chung cần nhìn thấy các bản chung để thao tác.
drop policy if exists tkb_files_manager_shared_read on public.tkb_files;
create policy tkb_files_manager_shared_read
on public.tkb_files for select to authenticated
using (
  scope='shared' and (
    public.has_manager_permission('upload_shared')
    or public.has_manager_permission('activate_shared_tkb')
  )
);

grant execute on function public.has_manager_permission(text,uuid) to authenticated;
grant execute on function public.set_manager_permissions(uuid,boolean,jsonb) to authenticated;
grant execute on function public.set_global_specialist_access(uuid,boolean) to authenticated;
grant execute on function public.my_access_context() to authenticated;
grant execute on function public.create_teacher_group(text) to authenticated;
grant execute on function public.rename_teacher_group(uuid,text) to authenticated;
grant execute on function public.search_group_transfer_candidates(text) to authenticated;
grant execute on function public.set_active_shared_tkb(uuid) to authenticated;

commit;
