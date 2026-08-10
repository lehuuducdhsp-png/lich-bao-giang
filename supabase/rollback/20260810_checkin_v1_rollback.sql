begin;

-- CHECK-IN V1 ROLLBACK ONLY.
-- This script removes only Check-in V1 objects created by the 2026-08-10 migrations.
-- It intentionally does not modify existing TKB, Auth, Storage, groups, reports, or payroll objects.
-- BACK UP THE DATABASE BEFORE RUNNING ON PRODUCTION.

revoke execute on function public.set_checkin_system_mode(boolean,text) from authenticated;
revoke execute on function public.set_checkin_pilot_user(uuid,boolean,boolean,text) from authenticated;
revoke execute on function public.checkin_pilot_list() from authenticated;
revoke execute on function public.checkin_target_in_current_phase(uuid) from authenticated;
revoke execute on function public.checkin_access_context() from authenticated;
revoke execute on function public.checkin_is_pilot_user(uuid,text) from authenticated;
revoke execute on function public.checkin_current_settings() from authenticated;

revoke execute on function public.my_checkin_day(date) from authenticated;
revoke execute on function public.checkin_dashboard(date) from authenticated;
revoke execute on function public.grant_teaching_checkin_quota(uuid,text) from authenticated;
revoke execute on function public.submit_teaching_checkin(date,text,text,text,text,jsonb,double precision,double precision,double precision) from authenticated;
revoke execute on function public.can_grant_checkin_target(uuid,uuid) from authenticated;
revoke execute on function public.can_view_checkin_target(uuid,uuid) from authenticated;
revoke execute on function public.checkin_is_active_manager(uuid) from authenticated;
revoke execute on function public.checkin_school_year(date) from authenticated;

drop function if exists public.set_checkin_system_mode(boolean,text);
drop function if exists public.set_checkin_pilot_user(uuid,boolean,boolean,text);
drop function if exists public.checkin_pilot_list();
drop function if exists public.checkin_target_in_current_phase(uuid);
drop function if exists public.checkin_access_context();
drop function if exists public.checkin_is_pilot_user(uuid,text);
drop function if exists public.checkin_current_settings();

drop function if exists public.my_checkin_day(date);
drop function if exists public.checkin_dashboard(date);
drop function if exists public.grant_teaching_checkin_quota(uuid,text);
drop function if exists public.submit_teaching_checkin(date,text,text,text,text,jsonb,double precision,double precision,double precision);
drop function if exists public.can_grant_checkin_target(uuid,uuid);
drop function if exists public.can_view_checkin_target(uuid,uuid);
drop function if exists public.checkin_is_active_manager(uuid);
drop function if exists public.checkin_school_year(date);

drop table if exists public.teaching_checkin_quota_grants;
drop table if exists public.teaching_checkins;
drop table if exists public.teaching_checkin_slots;
drop table if exists public.checkin_pilot_users;
drop table if exists public.checkin_system_settings;

commit;
