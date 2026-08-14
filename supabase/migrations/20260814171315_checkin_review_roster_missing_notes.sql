begin;

create or replace function public.checkin_review_roster()
returns table(
  user_id uuid,
  display_name text,
  username text,
  teacher_code text,
  group_id uuid,
  group_name text
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_gate jsonb;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  v_gate := public.checkin_access_context();
  if not coalesce((v_gate->>'can_review')::boolean,false) then
    raise exception 'Bạn không có quyền kiểm tra Check-in.';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.username,
    upper(btrim(coalesce(p.teacher_code,''))) as teacher_code,
    grp.group_id,
    grp.group_name
  from public.profiles p
  left join lateral (
    select gm.group_id,g.name as group_name
    from public.teacher_group_memberships gm
    join public.teacher_groups g on g.id=gm.group_id and g.is_active
    where gm.user_id=p.id and gm.valid_to is null
    order by gm.valid_from desc,g.name
    limit 1
  ) grp on true
  where p.is_active
    and p.role<>'owner'
    and (p.expires_at is null or p.expires_at>now())
    and btrim(coalesce(p.teacher_code,''))<>''
    and not public.is_group_leader(p.id)
    and public.can_view_checkin_target(p.id,v_uid)
  order by coalesce(grp.group_name,''),p.display_name,p.username;
end;
$$;

revoke execute on function public.checkin_review_roster() from public,anon;
grant execute on function public.checkin_review_roster() to authenticated;

commit;
