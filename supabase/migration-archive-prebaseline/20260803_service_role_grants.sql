begin;

-- Edge Functions use the built-in service_role key for trusted server-side work.
-- This project disabled automatic grants for newly created public tables,
-- so the service role needs explicit privileges while RLS remains enabled
-- for normal authenticated users.

grant usage on schema public to service_role;

grant select, insert, update, delete
on table public.profiles
 to service_role;

grant select, insert, update, delete
on table public.tkb_files
 to service_role;

grant select, insert, update, delete
on table public.user_preferences
 to service_role;

grant usage, select
on all sequences in schema public
 to service_role;

-- Preserve the same server-side privileges for future tables/sequences
-- created by the postgres owner in the public schema.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;

commit;
