begin;

create or replace function public.schedule_ack_monitor_groups()
returns table(group_id uuid, group_name text)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_access text;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  v_access := public.my_schedule_ack_monitor_access();

  if v_access='all' then
    return query
    select g.id,g.name
    from public.teacher_groups g
    where g.is_active
    order by g.name;
    return;
  end if;

  if v_access='group' then
    return query
    select distinct g.id,g.name
    from public.teacher_groups g
    join public.teacher_group_managers m on m.group_id=g.id
    where g.is_active and m.user_id=v_uid
    order by g.name;
    return;
  end if;

  raise exception 'Bạn không có quyền theo dõi xác nhận lịch dạy.';
end;
$$;

grant execute on function public.schedule_ack_monitor_groups() to authenticated;

commit;
