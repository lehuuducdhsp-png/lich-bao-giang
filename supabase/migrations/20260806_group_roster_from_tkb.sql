begin;

-- Danh sách giáo viên của nhóm được quản lý trực tiếp bằng mã trong TKB.
-- Giáo viên chưa có tài khoản vẫn có thể thuộc nhóm và được người phụ trách xem báo giảng.
create table if not exists public.teacher_group_roster (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.teacher_groups(id) on delete restrict,
  teacher_code text not null,
  teacher_name text not null default '',
  linked_user_id uuid references public.profiles(id) on delete set null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  added_by uuid references auth.users(id),
  ended_by uuid references auth.users(id),
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint teacher_group_roster_code_check check (char_length(btrim(teacher_code)) between 1 and 40),
  constraint teacher_group_roster_time_check check (valid_to is null or valid_to >= valid_from)
);

create unique index if not exists one_current_teacher_code_group
  on public.teacher_group_roster (upper(btrim(teacher_code)))
  where valid_to is null;
create index if not exists teacher_group_roster_group_idx
  on public.teacher_group_roster(group_id,valid_to,teacher_name);

alter table public.teacher_group_roster enable row level security;

-- Chuyển dữ liệu nhóm cũ dựa trên tài khoản sang danh sách mã TKB mới.
insert into public.teacher_group_roster(
  group_id,teacher_code,teacher_name,linked_user_id,valid_from,added_by,notes
)
select
  gm.group_id,
  upper(btrim(p.teacher_code)),
  p.display_name,
  p.id,
  gm.valid_from,
  gm.added_by,
  'Chuyển từ thành viên tài khoản cũ'
from public.teacher_group_memberships gm
join public.profiles p on p.id=gm.user_id
where gm.valid_to is null
  and p.teacher_code is not null
  and btrim(p.teacher_code)<>''
  and not exists(
    select 1 from public.teacher_group_roster r
    where r.valid_to is null
      and upper(btrim(r.teacher_code))=upper(btrim(p.teacher_code))
  );

create or replace function public.move_teacher_code_to_group(
  p_group_id uuid,
  p_teacher_code text,
  p_teacher_name text default '',
  p_effective_at timestamptz default now(),
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_teacher_code,'')));
  v_name text := btrim(coalesce(p_teacher_name,''));
  v_old public.teacher_group_roster;
  v_old_name text;
  v_new_name text;
  v_actor text;
  v_linked uuid;
  v_message text;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  if not public.can_manage_teacher_group(p_group_id,v_uid) then
    raise exception 'Tài khoản không có quyền quản lý thành viên của nhóm này.';
  end if;
  if char_length(v_code) not between 1 and 40 or v_code ~ '[[:cntrl:]]' then
    raise exception 'Mã giáo viên không hợp lệ.';
  end if;
  if not exists(select 1 from public.teacher_groups where id=p_group_id and is_active) then
    raise exception 'Không tìm thấy nhóm đang hoạt động.';
  end if;

  select id into v_linked
  from public.profiles
  where upper(btrim(coalesce(teacher_code,'')))=v_code
  limit 1;

  select * into v_old
  from public.teacher_group_roster
  where valid_to is null and upper(btrim(teacher_code))=v_code
  for update;

  if found and v_old.group_id=p_group_id then
    update public.teacher_group_roster
    set teacher_name=case when v_name<>'' then v_name else teacher_name end,
        linked_user_id=coalesce(v_linked,linked_user_id),
        notes=case when btrim(coalesce(p_reason,''))<>'' then p_reason else notes end
    where id=v_old.id;
    return jsonb_build_object('ok',true,'changed',false,'teacher_code',v_code,'group_id',p_group_id);
  end if;

  select display_name into v_actor from public.profiles where id=v_uid;
  select name into v_new_name from public.teacher_groups where id=p_group_id;
  if v_old.id is not null then
    select name into v_old_name from public.teacher_groups where id=v_old.group_id;
    update public.teacher_group_roster
    set valid_to=p_effective_at,ended_by=v_uid
    where id=v_old.id;
  end if;

  insert into public.teacher_group_roster(
    group_id,teacher_code,teacher_name,linked_user_id,valid_from,added_by,notes
  ) values(
    p_group_id,v_code,coalesce(nullif(v_name,''),v_code),v_linked,p_effective_at,v_uid,coalesce(p_reason,'')
  );

  if v_old.id is null then
    v_message := format('%s đã đưa giáo viên %s (%s) vào %s lúc %s.',
      coalesce(v_actor,'Một người quản lý'),coalesce(nullif(v_name,''),v_code),v_code,v_new_name,
      to_char(p_effective_at at time zone 'Asia/Ho_Chi_Minh','HH24:MI DD/MM/YYYY'));
  else
    v_message := format('%s đã chuyển giáo viên %s (%s) từ %s sang %s lúc %s.',
      coalesce(v_actor,'Một người quản lý'),coalesce(nullif(v_name,''),v_code),v_code,v_old_name,v_new_name,
      to_char(p_effective_at at time zone 'Asia/Ho_Chi_Minh','HH24:MI DD/MM/YYYY'));
  end if;

  insert into public.user_notifications(recipient_id,notification_type,title,message,payload)
  select distinct recipient_id,'group_transfer','Thay đổi thành viên nhóm',v_message,
    jsonb_build_object('teacher_code',v_code,'teacher_name',v_name,'old_group_id',v_old.group_id,'new_group_id',p_group_id,'moved_by',v_uid)
  from (
    select p.id as recipient_id from public.profiles p where p.role='owner' and p.is_active
    union
    select m.user_id from public.teacher_group_managers m where m.group_id=p_group_id
    union
    select m.user_id from public.teacher_group_managers m where v_old.group_id is not null and m.group_id=v_old.group_id
  ) recipients
  where recipient_id<>v_uid;

  return jsonb_build_object(
    'ok',true,'changed',true,'teacher_code',v_code,
    'old_group_id',v_old.group_id,'new_group_id',p_group_id,'message',v_message
  );
end;
$$;

create or replace function public.my_group_roster_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner boolean := public.is_owner(auth.uid());
  v_groups jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select coalesce(jsonb_agg(group_row order by group_row->>'name'),'[]'::jsonb)
  into v_groups
  from (
    select jsonb_build_object(
      'id',g.id,
      'name',g.name,
      'can_manage',public.can_manage_teacher_group(g.id,v_uid),
      'members',coalesce((
        select jsonb_agg(jsonb_build_object(
          'roster_id',r.id,
          'teacher_code',upper(btrim(r.teacher_code)),
          'teacher_name',r.teacher_name,
          'linked_user_id',r.linked_user_id,
          'valid_from',r.valid_from
        ) order by r.teacher_name,upper(btrim(r.teacher_code)))
        from public.teacher_group_roster r
        where r.group_id=g.id and r.valid_to is null
      ),'[]'::jsonb)
    ) group_row
    from public.teacher_groups g
    where g.is_active and (v_owner or public.can_view_teacher_group(g.id,v_uid))
  ) s;

  return jsonb_build_object('groups',v_groups);
end;
$$;

-- Phạm vi báo giảng lấy mã trực tiếp từ danh sách giáo viên TKB của nhóm,
-- đồng thời giữ tương thích với dữ liệu thành viên tài khoản cũ.
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

grant execute on function public.move_teacher_code_to_group(uuid,text,text,timestamptz,text) to authenticated;
grant execute on function public.my_group_roster_dashboard() to authenticated;
grant execute on function public.my_access_context() to authenticated;

commit;
