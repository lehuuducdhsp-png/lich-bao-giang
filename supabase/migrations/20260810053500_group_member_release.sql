begin;

-- Safe group member release.
-- Removes only the CURRENT membership of one user from one active group.
-- It does NOT delete the account, teacher code, report history, Check-in history,
-- or any historical membership row.

create or replace function public.remove_teacher_from_group(
  p_group_id uuid,
  p_user_id uuid,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_name text;
  v_teacher_name text;
  v_actor_name text;
  v_membership_id uuid;
  v_reason text := regexp_replace(btrim(coalesce(p_reason,'')), '[[:space:]]+', ' ', 'g');
  v_ended_at timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Bạn chưa đăng nhập.';
  end if;

  if p_group_id is null or p_user_id is null then
    raise exception 'Thiếu thông tin nhóm hoặc thành viên.';
  end if;

  if not public.can_manage_teacher_group(p_group_id,v_uid) then
    raise exception 'Bạn không có quyền đưa thành viên ra khỏi nhóm này.';
  end if;

  if char_length(v_reason)>200 then
    raise exception 'Ghi chú tối đa 200 ký tự.';
  end if;

  select g.name
  into v_group_name
  from public.teacher_groups g
  where g.id=p_group_id and g.is_active
  for update;

  if not found then
    raise exception 'Không tìm thấy nhóm đang hoạt động.';
  end if;

  select p.display_name
  into v_teacher_name
  from public.profiles p
  where p.id=p_user_id and p.role<>'owner';

  if not found then
    raise exception 'Không tìm thấy tài khoản thành viên hợp lệ.';
  end if;

  -- Keep role changes explicit. A Group Leader must be unassigned from the leader
  -- chip first, then the membership can be ended. This prevents a hidden role change.
  if exists(
    select 1
    from public.teacher_group_managers m
    where m.group_id=p_group_id and m.user_id=p_user_id
  ) then
    raise exception 'Tài khoản này đang là Nhóm trưởng của nhóm. Hãy gỡ vai trò Nhóm trưởng trước, sau đó mới Xóa khỏi nhóm.';
  end if;

  select gm.id
  into v_membership_id
  from public.teacher_group_memberships gm
  where gm.group_id=p_group_id
    and gm.user_id=p_user_id
    and gm.valid_to is null
  for update;

  if not found then
    raise exception 'Thành viên hiện không thuộc nhóm này.';
  end if;

  update public.teacher_group_memberships
  set valid_to=v_ended_at,
      ended_by=v_uid,
      notes=case
        when v_reason='' then notes
        when btrim(coalesce(notes,''))='' then 'Kết thúc thành viên: '||v_reason
        else notes||E'\nKết thúc thành viên: '||v_reason
      end
  where id=v_membership_id;

  select coalesce(p.display_name,p.username,'Người quản lý')
  into v_actor_name
  from public.profiles p
  where p.id=v_uid;

  -- Notify the removed member, active Owners and current Group Leaders.
  insert into public.user_notifications(
    recipient_id,notification_type,title,message,payload
  )
  select distinct
    recipients.recipient_id,
    'group_member_removed',
    'Cập nhật thành viên nhóm',
    coalesce(v_actor_name,'Người quản lý')||' đã đưa '||coalesce(v_teacher_name,'thành viên')
      ||' ra khỏi '||v_group_name||' lúc '
      ||to_char(v_ended_at at time zone 'Asia/Ho_Chi_Minh','HH24:MI "ngày" DD/MM/YYYY')
      ||'. Tài khoản và dữ liệu lịch sử vẫn được giữ.',
    jsonb_build_object(
      'group_id',p_group_id,
      'group_name',v_group_name,
      'teacher_id',p_user_id,
      'membership_id',v_membership_id,
      'ended_by',v_uid,
      'ended_at',v_ended_at,
      'reason',nullif(v_reason,'')
    )
  from (
    select p_user_id as recipient_id
    union
    select p.id from public.profiles p
      where p.role='owner' and p.is_active
        and (p.expires_at is null or p.expires_at>now())
    union
    select m.user_id from public.teacher_group_managers m
      join public.profiles p on p.id=m.user_id
      where m.group_id=p_group_id
        and p.is_active
        and (p.expires_at is null or p.expires_at>now())
  ) recipients
  where recipients.recipient_id is not null;

  return jsonb_build_object(
    'group_id',p_group_id,
    'group_name',v_group_name,
    'user_id',p_user_id,
    'display_name',v_teacher_name,
    'membership_id',v_membership_id,
    'removed',true,
    'account_deleted',false,
    'history_deleted',false,
    'ended_at',v_ended_at
  );
end;
$$;

grant execute on function public.remove_teacher_from_group(uuid,uuid,text) to authenticated;

commit;
