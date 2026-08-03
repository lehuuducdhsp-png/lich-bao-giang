begin;

grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;
grant select, delete on table public.tkb_files to authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;

grant execute on function public.reserve_tkb_upload(text,text,bigint,text,text) to authenticated;
grant execute on function public.finalize_tkb_upload(uuid) to authenticated;
grant execute on function public.set_active_personal_tkb(uuid) to authenticated;
grant execute on function public.set_active_shared_tkb(uuid) to authenticated;
grant execute on function public.complete_password_change() to authenticated;
grant execute on function public.mark_login() to authenticated;

commit;
