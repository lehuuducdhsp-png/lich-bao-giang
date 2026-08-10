begin;

alter table public.profiles
  add column if not exists teacher_code text,
  add column if not exists is_group_leader boolean not null default false,
  add column if not exists can_view_payroll_details boolean not null default false;

create unique index if not exists profiles_teacher_code_uidx
  on public.profiles (upper(teacher_code))
  where teacher_code is not null and btrim(teacher_code) <> '';

create table if not exists public.teacher_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_groups_name_check check (char_length(btrim(name)) between 1 and 80)
);
create unique index if not exists teacher_groups_name_uidx
  on public.teacher_groups (lower(btrim(name))) where is_active;

create table if not exists public.teacher_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.teacher_groups(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  added_by uuid references auth.users(id),
  ended_by uuid references auth.users(id),
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint membership_time_check check (valid_to is null or valid_to >= valid_from)
);
create unique index if not exists one_current_teacher_group
  on public.teacher_group_memberships(user_id) where valid_to is null;
create index if not exists teacher_group_memberships_group_idx
  on public.teacher_group_memberships(group_id, valid_to, valid_from desc);

create table if not exists public.teacher_group_managers (
  group_id uuid not null references public.teacher_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_primary boolean not null default false,
  can_manage_members boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(group_id, user_id)
);

create table if not exists public.teacher_group_scoped_access (
  group_id uuid not null references public.teacher_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  can_review_reports boolean not null default true,
  can_view_month_total boolean not null default true,
  can_manage_members boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(group_id, user_id)
);

create table if not exists public.teacher_group_transfer_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_group_id uuid references public.teacher_groups(id),
  new_group_id uuid not null references public.teacher_groups(id),
  moved_by uuid not null references public.profiles(id),
  effective_at timestamptz not null default now(),
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists teacher_group_transfer_user_idx
  on public.teacher_group_transfer_log(user_id, effective_at desc);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null default 'info',
  title text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_recipient_idx
  on public.user_notifications(recipient_id, read_at, created_at desc);

create or replace function public.is_group_leader(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles p
    where p.id=p_user and p.is_active and p.is_group_leader
      and (p.expires_at is null or p.expires_at > now())
  );
$$;

create or replace function public.can_view_teacher_group(
  p_group uuid,
  p_user uuid default auth.uid()
)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_owner(p_user)
    or exists(select 1 from public.teacher_group_managers m where m.group_id=p_group and m.user_id=p_user)
    or exists(select 1 from public.teacher_group_scoped_access a where a.group_id=p_group and a.user_id=p_user);
$$;

create or replace function public.can_manage_teacher_group(
  p_group uuid,
  p_user uuid default auth.uid()
)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_owner(p_user)
    or exists(
      select 1 from public.teacher_group_managers m
      where m.group_id=p_group and m.user_id=p_user and m.can_manage_members
    )
    or exists(
      select 1 from public.teacher_group_scoped_access a
      where a.group_id=p_group and a.user_id=p_user and a.can_manage_members
    );
$$;

create or replace function public.can_view_profile(
  p_target uuid,
  p_user uuid default auth.uid()
)
returns boolean language sql stable security definer set search_path=public as $$
  select p_target=p_user
    or public.is_owner(p_user)
    or exists(
      select 1
      from public.teacher_group_memberships gm
      where gm.user_id=p_target and gm.valid_to is null
        and public.can_view_teacher_group(gm.group_id,p_user)
    );
$$;

create or replace function public.my_access_context()
returns jsonb language plpgsql stable security definer set search_path=public as $$
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
    select distinct upper(btrim(p.teacher_code)) as teacher_code
    from public.profiles p
    where p.teacher_code is not null and btrim(p.teacher_code)<>'' and (
      v_owner or p.id=v_uid or exists(
        select 1 from public.teacher_group_memberships gm
        where gm.user_id=p.id and gm.valid_to is null
          and public.can_view_teacher_group(gm.group_id,v_uid)
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
    'is_group_leader',v_profile.is_group_leader,
    'can_view_payroll_details',v_owner or v_profile.can_view_payroll_details,
    'can_view_all_weekly_stats',v_owner or v_profile.is_group_leader,
    'teacher_codes',v_codes,
    'group_ids',v_groups,
    'managed_group_ids',v_managed
  );
end;
$$;

create or replace function public.my_group_dashboard()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  v_uid uuid := auth.uid();
  v_owner boolean := public.is_owner(auth.uid());
  v_groups jsonb;
  v_people jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select coalesce(jsonb_agg(group_row order by group_row->>'name'),'[]'::jsonb)
  into v_groups
  from (
    select jsonb_build_object(
      'id',g.id,
      'name',g.name,
      'is_active',g.is_active,
      'can_manage',public.can_manage_teacher_group(g.id,v_uid),
      'members',coalesce((
        select jsonb_agg(jsonb_build_object(
          'membership_id',gm.id,
          'user_id',p.id,
          'username',p.username,
          'display_name',p.display_name,
          'teacher_code',upper(coalesce(p.teacher_code,'')),
          'valid_from',gm.valid_from
        ) order by p.display_name)
        from public.teacher_group_memberships gm
        join public.profiles p on p.id=gm.user_id
        where gm.group_id=g.id and gm.valid_to is null
      ),'[]'::jsonb),
      'managers',coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id',p.id,
          'display_name',p.display_name,
          'username',p.username,
          'is_primary',m.is_primary,
          'can_manage_members',m.can_manage_members
        ) order by m.is_primary desc,p.display_name)
        from public.teacher_group_managers m
        join public.profiles p on p.id=m.user_id
        where m.group_id=g.id
      ),'[]'::jsonb),
      'scoped_access',coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id',p.id,
          'display_name',p.display_name,
          'username',p.username,
          'can_review_reports',a.can_review_reports,
          'can_view_month_total',a.can_view_month_total,
          'can_manage_members',a.can_manage_members
        ) order by p.display_name)
        from public.teacher_group_scoped_access a
        join public.profiles p on p.id=a.user_id
        where a.group_id=g.id
      ),'[]'::jsonb)
    ) as group_row
    from public.teacher_groups g
    where g.is_active and (v_owner or public.can_view_teacher_group(g.id,v_uid))
  ) s;

  if v_owner then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',p.id,
      'username',p.username,
      'display_name',p.display_name,
      'teacher_code',upper(coalesce(p.teacher_code,'')),
      'is_group_leader',p.is_group_leader,
      'can_view_payroll_details',p.can_view_payroll_details,
      'is_active',p.is_active
    ) order by p.display_name),'[]'::jsonb)
    into v_people
    from public.profiles p
    where p.role<>'owner';
  else
    v_people := '[]'::jsonb;
  end if;

  return jsonb_build_object('groups',v_groups,'people',v_people);
end;
$$;

create or replace function public.create_teacher_group(p_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.is_owner() then raise exception 'Chỉ chủ sở hữu được tạo nhóm.'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 80 then raise exception 'Tên nhóm không hợp lệ.'; end if;
  insert into public.teacher_groups(name,created_by)
  values(btrim(p_name),auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rename_teacher_group(p_group_id uuid,p_name text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ sở hữu được đổi tên nhóm.'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 80 then raise exception 'Tên nhóm không hợp lệ.'; end if;
  update public.teacher_groups set name=btrim(p_name) where id=p_group_id;
  if not found then raise exception 'Không tìm thấy nhóm.'; end if;
end;
$$;

create or replace function public.set_profile_teacher_code(p_user_id uuid,p_teacher_code text)
returns void language plpgsql security definer set search_path=public as $$
declare v_code text := upper(btrim(coalesce(p_teacher_code,'')));
begin
  if not public.is_owner() then raise exception 'Chỉ chủ sở hữu được gán mã giáo viên.'; end if;
  if v_code<>'' and v_code !~ '^[A-Z0-9._-]{1,24}$' then raise exception 'Mã giáo viên không hợp lệ.'; end if;
  update public.profiles set teacher_code=nullif(v_code,'') where id=p_user_id and role<>'owner';
  if not found then raise exception 'Không tìm thấy tài khoản giáo viên.'; end if;
end;
$$;

create or replace function public.set_group_manager(
  p_group_id uuid,
  p_user_id uuid,
  p_enabled boolean default true,
  p_is_primary boolean default false,
  p_can_manage_members boolean default true
)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ sở hữu được phân công nhóm trưởng.'; end if;
  if p_enabled then
    insert into public.teacher_group_managers(group_id,user_id,is_primary,can_manage_members,created_by)
    values(p_group_id,p_user_id,p_is_primary,p_can_manage_members,auth.uid())
    on conflict(group_id,user_id) do update
      set is_primary=excluded.is_primary,can_manage_members=excluded.can_manage_members;
    update public.profiles set is_group_leader=true where id=p_user_id and role<>'owner';
  else
    delete from public.teacher_group_managers where group_id=p_group_id and user_id=p_user_id;
    update public.profiles p set is_group_leader=exists(
      select 1 from public.teacher_group_managers m where m.user_id=p.id
    ) where p.id=p_user_id and p.role<>'owner';
  end if;
end;
$$;

create or replace function public.set_group_scoped_access(
  p_group_id uuid,
  p_user_id uuid,
  p_enabled boolean default true,
  p_can_review_reports boolean default true,
  p_can_view_month_total boolean default true,
  p_can_manage_members boolean default false
)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ sở hữu được cấp phạm vi chuyên môn.'; end if;
  if p_enabled then
    insert into public.teacher_group_scoped_access(
      group_id,user_id,can_review_reports,can_view_month_total,can_manage_members,created_by
    ) values(
      p_group_id,p_user_id,p_can_review_reports,p_can_view_month_total,p_can_manage_members,auth.uid()
    ) on conflict(group_id,user_id) do update set
      can_review_reports=excluded.can_review_reports,
      can_view_month_total=excluded.can_view_month_total,
      can_manage_members=excluded.can_manage_members;
  else
    delete from public.teacher_group_scoped_access where group_id=p_group_id and user_id=p_user_id;
  end if;
end;
$$;

create or replace function public.set_payroll_detail_access(p_user_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ sở hữu được cấp quyền xem bảng kê cá nhân.'; end if;
  update public.profiles set can_view_payroll_details=coalesce(p_enabled,false)
  where id=p_user_id and role<>'owner';
  if not found then raise exception 'Không tìm thấy tài khoản.'; end if;
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
language plpgsql stable security definer set search_path=public as $$
declare v_q text := btrim(coalesce(p_query,''));
begin
  if not (public.is_owner() or public.is_group_leader() or exists(
    select 1 from public.teacher_group_managers m where m.user_id=auth.uid() and m.can_manage_members
  )) then raise exception 'Tài khoản không có quyền tìm thành viên để chuyển nhóm.'; end if;
  if char_length(v_q)<2 then raise exception 'Nhập ít nhất 2 ký tự để tìm.'; end if;
  return query
  select p.id,p.username,p.display_name,upper(coalesce(p.teacher_code,'')),gm.group_id,g.name
  from public.profiles p
  left join public.teacher_group_memberships gm on gm.user_id=p.id and gm.valid_to is null
  left join public.teacher_groups g on g.id=gm.group_id
  where p.role<>'owner' and p.is_active and (
    p.display_name ilike '%'||v_q||'%' or p.username ilike '%'||v_q||'%'
    or coalesce(p.teacher_code,'') ilike '%'||v_q||'%'
  )
  order by p.display_name
  limit 20;
end;
$$;

create or replace function public.move_teacher_to_group(
  p_user_id uuid,
  p_new_group_id uuid,
  p_effective_at timestamptz default now(),
  p_reason text default ''
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid := auth.uid();
  v_old_group uuid;
  v_old_name text := 'Chưa phân nhóm';
  v_new_name text;
  v_actor_name text;
  v_teacher_name text;
  v_actor_label text;
  v_log_id uuid;
  v_message text;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  if not public.can_manage_teacher_group(p_new_group_id,v_uid) then
    raise exception 'Bạn không có quyền đưa thành viên vào nhóm này.';
  end if;
  select name into v_new_name from public.teacher_groups where id=p_new_group_id and is_active;
  if v_new_name is null then raise exception 'Nhóm mới không hợp lệ.'; end if;
  select display_name into v_teacher_name from public.profiles where id=p_user_id and role<>'owner' and is_active;
  if v_teacher_name is null then raise exception 'Không tìm thấy giáo viên.'; end if;
  select gm.group_id,g.name into v_old_group,v_old_name
  from public.teacher_group_memberships gm
  join public.teacher_groups g on g.id=gm.group_id
  where gm.user_id=p_user_id and gm.valid_to is null
  for update;
  if v_old_group=p_new_group_id then raise exception 'Giáo viên đã thuộc nhóm này.'; end if;

  update public.teacher_group_memberships
  set valid_to=p_effective_at,ended_by=v_uid
  where user_id=p_user_id and valid_to is null;

  insert into public.teacher_group_memberships(group_id,user_id,valid_from,added_by,notes)
  values(p_new_group_id,p_user_id,p_effective_at,v_uid,coalesce(p_reason,''));

  insert into public.teacher_group_transfer_log(user_id,old_group_id,new_group_id,moved_by,effective_at,reason)
  values(p_user_id,v_old_group,p_new_group_id,v_uid,p_effective_at,coalesce(p_reason,''))
  returning id into v_log_id;

  select display_name into v_actor_name from public.profiles where id=v_uid;
  v_actor_label := case when public.is_owner(v_uid) then 'Chủ sở hữu ' else 'Nhóm trưởng ' end || coalesce(v_actor_name,'');
  v_message := v_actor_label||' đã chuyển giáo viên '||v_teacher_name||' từ '||coalesce(v_old_name,'Chưa phân nhóm')||' sang '||v_new_name||' lúc '||to_char(p_effective_at at time zone 'Asia/Ho_Chi_Minh','HH24:MI "ngày" DD/MM/YYYY')||'.';

  insert into public.user_notifications(recipient_id,notification_type,title,message,payload)
  select distinct r.recipient_id,'group_transfer','Thông báo chuyển nhóm',v_message,
    jsonb_build_object('transfer_id',v_log_id,'teacher_id',p_user_id,'old_group_id',v_old_group,'new_group_id',p_new_group_id)
  from (
    select p.id as recipient_id from public.profiles p where p.role='owner' and p.is_active
    union
    select m.user_id from public.teacher_group_managers m where m.group_id in (v_old_group,p_new_group_id)
  ) r
  where r.recipient_id is not null;

  return v_log_id;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language sql security definer set search_path=public as $$
  update public.user_notifications set read_at=coalesce(read_at,now())
  where id=p_notification_id and recipient_id=auth.uid();
$$;

alter table public.teacher_groups enable row level security;
alter table public.teacher_group_memberships enable row level security;
alter table public.teacher_group_managers enable row level security;
alter table public.teacher_group_scoped_access enable row level security;
alter table public.teacher_group_transfer_log enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists profiles_read_own_or_owner on public.profiles;
drop policy if exists profiles_read_by_scope on public.profiles;
create policy profiles_read_by_scope on public.profiles for select to authenticated
using (id=auth.uid() or public.is_owner() or public.can_view_profile(id));

drop policy if exists teacher_groups_read_scope on public.teacher_groups;
create policy teacher_groups_read_scope on public.teacher_groups for select to authenticated
using (
  public.is_owner() or public.can_view_teacher_group(id)
  or exists(select 1 from public.teacher_group_memberships gm where gm.group_id=id and gm.user_id=auth.uid() and gm.valid_to is null)
);

drop policy if exists memberships_read_scope on public.teacher_group_memberships;
create policy memberships_read_scope on public.teacher_group_memberships for select to authenticated
using (user_id=auth.uid() or public.is_owner() or public.can_view_teacher_group(group_id));

drop policy if exists managers_read_scope on public.teacher_group_managers;
create policy managers_read_scope on public.teacher_group_managers for select to authenticated
using (user_id=auth.uid() or public.is_owner() or public.can_view_teacher_group(group_id));

drop policy if exists scoped_access_read_scope on public.teacher_group_scoped_access;
create policy scoped_access_read_scope on public.teacher_group_scoped_access for select to authenticated
using (user_id=auth.uid() or public.is_owner());

drop policy if exists transfer_log_read_scope on public.teacher_group_transfer_log;
create policy transfer_log_read_scope on public.teacher_group_transfer_log for select to authenticated
using (
  public.is_owner() or moved_by=auth.uid()
  or public.can_view_teacher_group(old_group_id)
  or public.can_view_teacher_group(new_group_id)
);

drop policy if exists notifications_read_own on public.user_notifications;
create policy notifications_read_own on public.user_notifications for select to authenticated
using (recipient_id=auth.uid());

drop policy if exists notifications_update_own on public.user_notifications;
create policy notifications_update_own on public.user_notifications for update to authenticated
using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());

grant usage on schema public to authenticated,service_role;
grant select on public.teacher_groups,public.teacher_group_memberships,public.teacher_group_managers,
  public.teacher_group_scoped_access,public.teacher_group_transfer_log,public.user_notifications to authenticated;
grant select,insert,update,delete on public.teacher_groups,public.teacher_group_memberships,
  public.teacher_group_managers,public.teacher_group_scoped_access,public.teacher_group_transfer_log,
  public.user_notifications to service_role;
grant usage,select on all sequences in schema public to service_role;

grant execute on function public.my_access_context() to authenticated;
grant execute on function public.my_group_dashboard() to authenticated;
grant execute on function public.create_teacher_group(text) to authenticated;
grant execute on function public.rename_teacher_group(uuid,text) to authenticated;
grant execute on function public.set_profile_teacher_code(uuid,text) to authenticated;
grant execute on function public.set_group_manager(uuid,uuid,boolean,boolean,boolean) to authenticated;
grant execute on function public.set_group_scoped_access(uuid,uuid,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.set_payroll_detail_access(uuid,boolean) to authenticated;
grant execute on function public.search_group_transfer_candidates(text) to authenticated;
grant execute on function public.move_teacher_to_group(uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;

commit;
