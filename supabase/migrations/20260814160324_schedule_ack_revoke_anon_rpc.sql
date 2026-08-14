begin;

-- Các RPC xác nhận lịch chỉ dành cho người dùng đã đăng nhập.
-- PostgreSQL mặc định cấp EXECUTE cho PUBLIC khi tạo function, nên thu hồi rõ ràng.
revoke execute on function public.acknowledge_teaching_schedule(date,text,text,uuid,timestamptz) from public, anon;
revoke execute on function public.my_teaching_schedule_ack(date) from public, anon;
revoke execute on function public.set_schedule_ack_monitor_permission(uuid,boolean) from public, anon;
revoke execute on function public.schedule_ack_monitor_people() from public, anon;
revoke execute on function public.my_schedule_ack_monitor_access() from public, anon;
revoke execute on function public.teaching_schedule_ack_dashboard(date) from public, anon;
revoke execute on function public.schedule_ack_monitor_groups() from public, anon;

grant execute on function public.acknowledge_teaching_schedule(date,text,text,uuid,timestamptz) to authenticated;
grant execute on function public.my_teaching_schedule_ack(date) to authenticated;
grant execute on function public.set_schedule_ack_monitor_permission(uuid,boolean) to authenticated;
grant execute on function public.schedule_ack_monitor_people() to authenticated;
grant execute on function public.my_schedule_ack_monitor_access() to authenticated;
grant execute on function public.teaching_schedule_ack_dashboard(date) to authenticated;
grant execute on function public.schedule_ack_monitor_groups() to authenticated;

commit;
