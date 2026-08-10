


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_manage_shared"("p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from public.profiles
    where id=p_user and is_active
      and (expires_at is null or expires_at > now())
      and (role='owner' or can_upload_shared or role='uploader')
  );
$$;


ALTER FUNCTION "public"."can_manage_shared"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_teacher_group"("p_group" "uuid", "p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.is_owner(p_user)
    or public.has_manager_permission('transfer_members',p_user)
    or exists(
      select 1 from public.teacher_group_managers m
      where m.group_id=p_group and m.user_id=p_user and m.can_manage_members
    );
$$;


ALTER FUNCTION "public"."can_manage_teacher_group"("p_group" "uuid", "p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_profile"("p_target" "uuid", "p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p_target=p_user
    or public.is_owner(p_user)
    or exists(
      select 1
      from public.teacher_group_memberships gm
      where gm.user_id=p_target and gm.valid_to is null
        and public.can_view_teacher_group(gm.group_id,p_user)
    );
$$;


ALTER FUNCTION "public"."can_view_profile"("p_target" "uuid", "p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_teacher_group"("p_group" "uuid", "p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.is_owner(p_user)
    or public.has_manager_permission('manage_groups',p_user)
    or public.has_manager_permission('transfer_members',p_user)
    or exists(
      select 1 from public.teacher_group_managers m
      where m.group_id=p_group and m.user_id=p_user
    );
$$;


ALTER FUNCTION "public"."can_view_teacher_group"("p_group" "uuid", "p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_password_change"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.profiles set must_change_password=false where id=auth.uid();
$$;


ALTER FUNCTION "public"."complete_password_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_teacher_group"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."create_teacher_group"("p_name" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."tkb_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope" "text" NOT NULL,
    "owner_id" "uuid",
    "uploaded_by" "uuid" NOT NULL,
    "original_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "mime_type" "text" DEFAULT 'application/octet-stream'::"text" NOT NULL,
    "status" "text" DEFAULT 'uploading'::"text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tkb_files_scope_check" CHECK (("scope" = ANY (ARRAY['shared'::"text", 'personal'::"text"]))),
    CONSTRAINT "tkb_files_size_bytes_check" CHECK ((("size_bytes" > 0) AND ("size_bytes" <= 52428800))),
    CONSTRAINT "tkb_files_status_check" CHECK (("status" = ANY (ARRAY['uploading'::"text", 'ready'::"text", 'failed'::"text"]))),
    CONSTRAINT "tkb_scope_owner_check" CHECK (((("scope" = 'personal'::"text") AND ("owner_id" IS NOT NULL)) OR (("scope" = 'shared'::"text") AND ("owner_id" IS NULL))))
);


ALTER TABLE "public"."tkb_files" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_tkb_upload"("p_id" "uuid") RETURNS "public"."tkb_files"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_row public.tkb_files;
begin
  select * into v_row from public.tkb_files where id=p_id for update;
  if not found then raise exception 'Không tìm thấy phiên tải lên.'; end if;
  if not (
    (v_row.scope='personal' and (v_row.owner_id=v_uid or public.is_owner(v_uid))) or
    (v_row.scope='shared' and public.can_manage_shared(v_uid))
  ) then raise exception 'Không có quyền hoàn tất file này.'; end if;
  if not exists(select 1 from storage.objects where bucket_id='tkb-private' and name=v_row.storage_path) then
    raise exception 'File chưa được tải lên kho lưu trữ.';
  end if;
  update public.tkb_files set status='ready' where id=p_id returning * into v_row;
  if v_row.scope='personal' and not exists(
    select 1 from public.tkb_files where owner_id=v_row.owner_id and scope='personal' and is_active and status='ready'
  ) then
    update public.tkb_files set is_active=true where id=p_id returning * into v_row;
  end if;
  return v_row;
end;
$$;


ALTER FUNCTION "public"."finalize_tkb_upload"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_username text;
  v_name text;
begin
  v_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  v_username := regexp_replace(v_username, '[^a-z0-9._-]', '', 'g');
  if length(v_username) < 3 then
    v_username := 'user_' || substr(replace(new.id::text,'-',''),1,8);
  end if;
  v_name := coalesce(new.raw_user_meta_data->>'display_name', v_username);
  insert into public.profiles(id, username, display_name)
  values(new.id, v_username, v_name)
  on conflict(id) do nothing;
  insert into public.user_preferences(user_id) values(new.id)
  on conflict(user_id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_manager_permission"("p_permission" "text", "p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."has_manager_permission"("p_permission" "text", "p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_leader"("p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from public.profiles p
    where p.id=p_user and p.is_active and p.is_group_leader
      and (p.expires_at is null or p.expires_at > now())
  );
$$;


ALTER FUNCTION "public"."is_group_leader"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_owner"("p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from public.profiles
    where id=p_user and role='owner' and is_active
      and (expires_at is null or expires_at > now())
  );
$$;


ALTER FUNCTION "public"."is_owner"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_login"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.profiles set last_login_at=now() where id=auth.uid();
$$;


ALTER FUNCTION "public"."mark_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.user_notifications set read_at=coalesce(read_at,now())
  where id=p_notification_id and recipient_id=auth.uid();
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_teacher_to_group"("p_user_id" "uuid", "p_new_group_id" "uuid", "p_effective_at" timestamp with time zone DEFAULT "now"(), "p_reason" "text" DEFAULT ''::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."move_teacher_to_group"("p_user_id" "uuid", "p_new_group_id" "uuid", "p_effective_at" timestamp with time zone, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_access_context"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."my_access_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_group_dashboard"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."my_group_dashboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rename_teacher_group"("p_group_id" "uuid", "p_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."rename_teacher_group"("p_group_id" "uuid", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_tkb_upload"("p_scope" "text", "p_original_name" "text", "p_size_bytes" bigint, "p_mime_type" "text" DEFAULT 'application/octet-stream'::"text", "p_notes" "text" DEFAULT ''::"text") RETURNS "public"."tkb_files"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $_$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_safe_name text;
  v_path text;
  v_count integer;
  v_total bigint;
  v_row public.tkb_files;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  if p_scope not in ('shared','personal') then raise exception 'Phạm vi file không hợp lệ.'; end if;
  if p_size_bytes <= 0 or p_size_bytes > 52428800 then raise exception 'Mỗi file tối đa 50 MB.'; end if;
  if lower(p_original_name) !~ '\.(xlsx|xlsm)$' then raise exception 'Chỉ chấp nhận file .xlsx hoặc .xlsm.'; end if;

  if p_scope='shared' and not public.can_manage_shared(v_uid) then
    raise exception 'Tài khoản không có quyền tải TKB chung.';
  end if;

  if p_scope='personal' then
    select count(*), coalesce(sum(size_bytes),0) into v_count,v_total
    from public.tkb_files
    where owner_id=v_uid and scope='personal' and status in ('uploading','ready');
    if v_count >= 20 then raise exception 'Đã đủ 20 phiên bản TKB cá nhân.'; end if;
    if v_total + p_size_bytes > 524288000 then raise exception 'Tổng dung lượng cá nhân tối đa 500 MB.'; end if;
  end if;

  v_safe_name := regexp_replace(p_original_name, '[^A-Za-z0-9._-]+', '_', 'g');
  if p_scope='personal' then
    v_path := 'personal/'||v_uid::text||'/'||v_id::text||'/'||v_safe_name;
  else
    v_path := 'shared/'||v_id::text||'/'||v_safe_name;
  end if;

  insert into public.tkb_files(id,scope,owner_id,uploaded_by,original_name,storage_path,size_bytes,mime_type,notes)
  values(v_id,p_scope,case when p_scope='personal' then v_uid else null end,v_uid,p_original_name,v_path,p_size_bytes,coalesce(p_mime_type,'application/octet-stream'),coalesce(p_notes,''))
  returning * into v_row;
  return v_row;
end;
$_$;


ALTER FUNCTION "public"."reserve_tkb_upload"("p_scope" "text", "p_original_name" "text", "p_size_bytes" bigint, "p_mime_type" "text", "p_notes" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_branding" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "site_title" "text" DEFAULT 'CÔNG CỤ LẬP LỊCH BÁO GIẢNG'::"text" NOT NULL,
    "site_subtitle" "text" DEFAULT 'Website độc lập — không liên kết trang quản lý lớp học'::"text" NOT NULL,
    "show_header_text" boolean DEFAULT true NOT NULL,
    "logo_path" "text",
    "icon_path" "text",
    "logo_box_width" integer DEFAULT 190 NOT NULL,
    "logo_box_height" integer DEFAULT 64 NOT NULL,
    "logo_mobile_height" integer DEFAULT 48 NOT NULL,
    "logo_align" "text" DEFAULT 'left'::"text" NOT NULL,
    "logo_fit" "text" DEFAULT 'contain'::"text" NOT NULL,
    "logo_background" "text" DEFAULT 'transparent'::"text" NOT NULL,
    "logo_radius" integer DEFAULT 8 NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "site_branding_id_check" CHECK (("id" = 'default'::"text")),
    CONSTRAINT "site_branding_logo_align_check" CHECK (("logo_align" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text"]))),
    CONSTRAINT "site_branding_logo_box_height_check" CHECK ((("logo_box_height" >= 32) AND ("logo_box_height" <= 160))),
    CONSTRAINT "site_branding_logo_box_width_check" CHECK ((("logo_box_width" >= 48) AND ("logo_box_width" <= 420))),
    CONSTRAINT "site_branding_logo_fit_check" CHECK (("logo_fit" = ANY (ARRAY['contain'::"text", 'cover'::"text"]))),
    CONSTRAINT "site_branding_logo_mobile_height_check" CHECK ((("logo_mobile_height" >= 28) AND ("logo_mobile_height" <= 100))),
    CONSTRAINT "site_branding_logo_radius_check" CHECK ((("logo_radius" >= 0) AND ("logo_radius" <= 48)))
);


ALTER TABLE "public"."site_branding" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_site_branding"() RETURNS "public"."site_branding"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.site_branding;
begin
  if not public.is_owner() then
    raise exception 'Chỉ chủ sở hữu được khôi phục giao diện mặc định.';
  end if;
  update public.site_branding set
    site_title='CÔNG CỤ LẬP LỊCH BÁO GIẢNG',
    site_subtitle='Website độc lập — không liên kết trang quản lý lớp học',
    show_header_text=true,
    logo_path=null,
    icon_path=null,
    logo_box_width=190,
    logo_box_height=64,
    logo_mobile_height=48,
    logo_align='left',
    logo_fit='contain',
    logo_background='transparent',
    logo_radius=8,
    updated_by=auth.uid()
  where id='default'
  returning * into v_row;
  return v_row;
end;
$$;


ALTER FUNCTION "public"."reset_site_branding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_site_branding"("p_site_title" "text", "p_site_subtitle" "text", "p_show_header_text" boolean, "p_logo_path" "text", "p_icon_path" "text", "p_logo_box_width" integer, "p_logo_box_height" integer, "p_logo_mobile_height" integer, "p_logo_align" "text", "p_logo_fit" "text", "p_logo_background" "text", "p_logo_radius" integer) RETURNS "public"."site_branding"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.site_branding;
begin
  if not public.is_owner() then
    raise exception 'Chỉ chủ sở hữu được thay đổi giao diện website.';
  end if;
  if char_length(btrim(coalesce(p_site_title,''))) not between 1 and 120 then
    raise exception 'Tên website phải có từ 1 đến 120 ký tự.';
  end if;
  if char_length(coalesce(p_site_subtitle,'')) > 220 then
    raise exception 'Dòng mô tả tối đa 220 ký tự.';
  end if;
  if p_logo_box_width not between 48 and 420
     or p_logo_box_height not between 32 and 160
     or p_logo_mobile_height not between 28 and 100
     or p_logo_radius not between 0 and 48 then
    raise exception 'Kích thước logo không hợp lệ.';
  end if;
  if p_logo_align not in ('left','center','right') then
    raise exception 'Vị trí logo không hợp lệ.';
  end if;
  if p_logo_fit not in ('contain','cover') then
    raise exception 'Kiểu hiển thị logo không hợp lệ.';
  end if;

  update public.site_branding set
    site_title=btrim(p_site_title),
    site_subtitle=coalesce(p_site_subtitle,''),
    show_header_text=coalesce(p_show_header_text,true),
    logo_path=nullif(btrim(coalesce(p_logo_path,'')),''),
    icon_path=nullif(btrim(coalesce(p_icon_path,'')),''),
    logo_box_width=p_logo_box_width,
    logo_box_height=p_logo_box_height,
    logo_mobile_height=p_logo_mobile_height,
    logo_align=p_logo_align,
    logo_fit=p_logo_fit,
    logo_background=coalesce(nullif(btrim(p_logo_background),''),'transparent'),
    logo_radius=p_logo_radius,
    updated_by=auth.uid()
  where id='default'
  returning * into v_row;
  return v_row;
end;
$$;


ALTER FUNCTION "public"."save_site_branding"("p_site_title" "text", "p_site_subtitle" "text", "p_show_header_text" boolean, "p_logo_path" "text", "p_icon_path" "text", "p_logo_box_width" integer, "p_logo_box_height" integer, "p_logo_mobile_height" integer, "p_logo_align" "text", "p_logo_fit" "text", "p_logo_background" "text", "p_logo_radius" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_group_transfer_candidates"("p_query" "text") RETURNS TABLE("user_id" "uuid", "username" "text", "display_name" "text", "teacher_code" "text", "current_group_id" "uuid", "current_group_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."search_group_transfer_candidates"("p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_active_personal_tkb"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_uid uuid := auth.uid();
begin
  if not exists(select 1 from public.tkb_files where id=p_id and scope='personal' and owner_id=v_uid and status='ready') then
    raise exception 'Không tìm thấy TKB cá nhân hợp lệ.';
  end if;
  update public.tkb_files set is_active=false where scope='personal' and owner_id=v_uid and is_active;
  update public.tkb_files set is_active=true where id=p_id;
  insert into public.user_preferences(user_id,preferred_scope,updated_at)
  values(v_uid,'personal',now())
  on conflict(user_id) do update set preferred_scope='personal',updated_at=now();
end;
$$;


ALTER FUNCTION "public"."set_active_personal_tkb"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_active_shared_tkb"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_active_shared_tkb"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_global_specialist_access"("p_user_id" "uuid", "p_enabled" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_global_specialist_access"("p_user_id" "uuid", "p_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_group_manager"("p_group_id" "uuid", "p_user_id" "uuid", "p_enabled" boolean DEFAULT true, "p_is_primary" boolean DEFAULT false, "p_can_manage_members" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_group_manager"("p_group_id" "uuid", "p_user_id" "uuid", "p_enabled" boolean, "p_is_primary" boolean, "p_can_manage_members" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_group_scoped_access"("p_group_id" "uuid", "p_user_id" "uuid", "p_enabled" boolean DEFAULT true, "p_can_review_reports" boolean DEFAULT true, "p_can_view_month_total" boolean DEFAULT true, "p_can_manage_members" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_group_scoped_access"("p_group_id" "uuid", "p_user_id" "uuid", "p_enabled" boolean, "p_can_review_reports" boolean, "p_can_view_month_total" boolean, "p_can_manage_members" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_manager_permissions"("p_user_id" "uuid", "p_is_manager" boolean, "p_permissions" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_manager_permissions"("p_user_id" "uuid", "p_is_manager" boolean, "p_permissions" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_payroll_detail_access"("p_user_id" "uuid", "p_enabled" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ sở hữu được cấp quyền xem bảng kê cá nhân.'; end if;
  update public.profiles set can_view_payroll_details=coalesce(p_enabled,false)
  where id=p_user_id and role<>'owner';
  if not found then raise exception 'Không tìm thấy tài khoản.'; end if;
end;
$$;


ALTER FUNCTION "public"."set_payroll_detail_access"("p_user_id" "uuid", "p_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profile_teacher_code"("p_user_id" "uuid", "p_teacher_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_code text := upper(btrim(coalesce(p_teacher_code,'')));
begin
  if not public.is_owner() then
    raise exception 'Chỉ chủ sở hữu được liên kết mã giáo viên.';
  end if;

  if char_length(v_code) > 40 then
    raise exception 'Mã giáo viên tối đa 40 ký tự.';
  end if;

  if v_code <> '' and v_code ~ '[[:cntrl:]]' then
    raise exception 'Mã giáo viên chứa ký tự điều khiển không hợp lệ.';
  end if;

  update public.profiles
  set teacher_code = nullif(v_code,'')
  where id=p_user_id and role<>'owner';

  if not found then
    raise exception 'Không tìm thấy tài khoản giáo viên.';
  end if;
exception
  when unique_violation then
    raise exception 'Mã giáo viên này đã được liên kết với một tài khoản khác.';
end;
$$;


ALTER FUNCTION "public"."set_profile_teacher_code"("p_user_id" "uuid", "p_teacher_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "can_upload_shared" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "expires_at" timestamp with time zone,
    "must_change_password" boolean DEFAULT true NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid",
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "teacher_code" "text",
    "is_group_leader" boolean DEFAULT false NOT NULL,
    "can_view_payroll_details" boolean DEFAULT false NOT NULL,
    "can_review_all_reports" boolean DEFAULT false NOT NULL,
    "is_manager" boolean DEFAULT false NOT NULL,
    "manager_can_weekly_stats" boolean DEFAULT false NOT NULL,
    "manager_can_manage_groups" boolean DEFAULT false NOT NULL,
    "manager_can_transfer_members" boolean DEFAULT false NOT NULL,
    "manager_can_upload_shared" boolean DEFAULT false NOT NULL,
    "manager_can_activate_shared_tkb" boolean DEFAULT false NOT NULL,
    "manager_can_review_all_reports" boolean DEFAULT false NOT NULL,
    "manager_can_view_other_payroll" boolean DEFAULT false NOT NULL,
    "manager_can_view_payroll_amounts" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'uploader'::"text", 'user'::"text"]))),
    CONSTRAINT "profiles_username_format" CHECK (("username" ~ '^[a-z0-9._-]{3,32}$'::"text"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_group_managers" (
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "can_manage_members" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teacher_group_managers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_group_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_to" timestamp with time zone,
    "added_by" "uuid",
    "ended_by" "uuid",
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "membership_time_check" CHECK ((("valid_to" IS NULL) OR ("valid_to" >= "valid_from")))
);


ALTER TABLE "public"."teacher_group_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_group_scoped_access" (
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "can_review_reports" boolean DEFAULT true NOT NULL,
    "can_view_month_total" boolean DEFAULT true NOT NULL,
    "can_manage_members" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teacher_group_scoped_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_group_transfer_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "old_group_id" "uuid",
    "new_group_id" "uuid" NOT NULL,
    "moved_by" "uuid" NOT NULL,
    "effective_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teacher_group_transfer_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "teacher_groups_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 80)))
);


ALTER TABLE "public"."teacher_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "notification_type" "text" DEFAULT 'info'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "preferred_scope" "text" DEFAULT 'shared'::"text" NOT NULL,
    "last_seen_shared_file_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_preferences_preferred_scope_check" CHECK (("preferred_scope" = ANY (ARRAY['shared'::"text", 'personal'::"text"])))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_branding"
    ADD CONSTRAINT "site_branding_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_group_managers"
    ADD CONSTRAINT "teacher_group_managers_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."teacher_group_memberships"
    ADD CONSTRAINT "teacher_group_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_group_scoped_access"
    ADD CONSTRAINT "teacher_group_scoped_access_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."teacher_group_transfer_log"
    ADD CONSTRAINT "teacher_group_transfer_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_groups"
    ADD CONSTRAINT "teacher_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tkb_files"
    ADD CONSTRAINT "tkb_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tkb_files"
    ADD CONSTRAINT "tkb_files_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



CREATE UNIQUE INDEX "one_active_personal_tkb" ON "public"."tkb_files" USING "btree" ("owner_id") WHERE (("scope" = 'personal'::"text") AND "is_active" AND ("status" = 'ready'::"text"));



CREATE UNIQUE INDEX "one_active_shared_tkb" ON "public"."tkb_files" USING "btree" ("scope") WHERE (("scope" = 'shared'::"text") AND "is_active" AND ("status" = 'ready'::"text"));



CREATE UNIQUE INDEX "one_current_teacher_group" ON "public"."teacher_group_memberships" USING "btree" ("user_id") WHERE ("valid_to" IS NULL);



CREATE UNIQUE INDEX "profiles_teacher_code_uidx" ON "public"."profiles" USING "btree" ("upper"("btrim"("teacher_code"))) WHERE (("teacher_code" IS NOT NULL) AND ("btrim"("teacher_code") <> ''::"text"));



CREATE UNIQUE INDEX "profiles_username_lower_uidx" ON "public"."profiles" USING "btree" ("lower"("username"));



CREATE INDEX "teacher_group_memberships_group_idx" ON "public"."teacher_group_memberships" USING "btree" ("group_id", "valid_to", "valid_from" DESC);



CREATE INDEX "teacher_group_transfer_user_idx" ON "public"."teacher_group_transfer_log" USING "btree" ("user_id", "effective_at" DESC);



CREATE UNIQUE INDEX "teacher_groups_name_uidx" ON "public"."teacher_groups" USING "btree" ("lower"("btrim"("name"))) WHERE "is_active";



CREATE INDEX "tkb_files_owner_idx" ON "public"."tkb_files" USING "btree" ("owner_id", "created_at" DESC);



CREATE INDEX "tkb_files_scope_idx" ON "public"."tkb_files" USING "btree" ("scope", "created_at" DESC);



CREATE INDEX "user_notifications_recipient_idx" ON "public"."user_notifications" USING "btree" ("recipient_id", "read_at", "created_at" DESC);



CREATE OR REPLACE TRIGGER "profiles_touch_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "site_branding_touch_updated_at" BEFORE UPDATE ON "public"."site_branding" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "tkb_files_touch_updated_at" BEFORE UPDATE ON "public"."tkb_files" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_branding"
    ADD CONSTRAINT "site_branding_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."teacher_group_managers"
    ADD CONSTRAINT "teacher_group_managers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."teacher_group_managers"
    ADD CONSTRAINT "teacher_group_managers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."teacher_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_group_managers"
    ADD CONSTRAINT "teacher_group_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_group_memberships"
    ADD CONSTRAINT "teacher_group_memberships_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."teacher_group_memberships"
    ADD CONSTRAINT "teacher_group_memberships_ended_by_fkey" FOREIGN KEY ("ended_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."teacher_group_memberships"
    ADD CONSTRAINT "teacher_group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."teacher_groups"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."teacher_group_memberships"
    ADD CONSTRAINT "teacher_group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_group_scoped_access"
    ADD CONSTRAINT "teacher_group_scoped_access_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."teacher_group_scoped_access"
    ADD CONSTRAINT "teacher_group_scoped_access_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."teacher_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_group_scoped_access"
    ADD CONSTRAINT "teacher_group_scoped_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_group_transfer_log"
    ADD CONSTRAINT "teacher_group_transfer_log_moved_by_fkey" FOREIGN KEY ("moved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."teacher_group_transfer_log"
    ADD CONSTRAINT "teacher_group_transfer_log_new_group_id_fkey" FOREIGN KEY ("new_group_id") REFERENCES "public"."teacher_groups"("id");



ALTER TABLE ONLY "public"."teacher_group_transfer_log"
    ADD CONSTRAINT "teacher_group_transfer_log_old_group_id_fkey" FOREIGN KEY ("old_group_id") REFERENCES "public"."teacher_groups"("id");



ALTER TABLE ONLY "public"."teacher_group_transfer_log"
    ADD CONSTRAINT "teacher_group_transfer_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_groups"
    ADD CONSTRAINT "teacher_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tkb_files"
    ADD CONSTRAINT "tkb_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tkb_files"
    ADD CONSTRAINT "tkb_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_last_seen_shared_file_id_fkey" FOREIGN KEY ("last_seen_shared_file_id") REFERENCES "public"."tkb_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "managers_read_scope" ON "public"."teacher_group_managers" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_owner"() OR "public"."can_view_teacher_group"("group_id")));



CREATE POLICY "memberships_read_scope" ON "public"."teacher_group_memberships" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_owner"() OR "public"."can_view_teacher_group"("group_id")));



CREATE POLICY "notifications_read_own" ON "public"."user_notifications" FOR SELECT TO "authenticated" USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_own" ON "public"."user_notifications" FOR UPDATE TO "authenticated" USING (("recipient_id" = "auth"."uid"())) WITH CHECK (("recipient_id" = "auth"."uid"()));



CREATE POLICY "preferences_own_all" ON "public"."user_preferences" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_read_by_scope" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_owner"() OR "public"."can_view_profile"("id")));



CREATE POLICY "scoped_access_read_scope" ON "public"."teacher_group_scoped_access" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_owner"()));



ALTER TABLE "public"."site_branding" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_branding_owner_update" ON "public"."site_branding" FOR UPDATE TO "authenticated" USING ("public"."is_owner"()) WITH CHECK (("public"."is_owner"() AND ("id" = 'default'::"text")));



CREATE POLICY "site_branding_public_read" ON "public"."site_branding" FOR SELECT TO "authenticated", "anon" USING (("id" = 'default'::"text"));



ALTER TABLE "public"."teacher_group_managers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_group_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_group_scoped_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_group_transfer_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teacher_groups_read_scope" ON "public"."teacher_groups" FOR SELECT TO "authenticated" USING (("public"."is_owner"() OR "public"."can_view_teacher_group"("id") OR (EXISTS ( SELECT 1
   FROM "public"."teacher_group_memberships" "gm"
  WHERE (("gm"."group_id" = "gm"."id") AND ("gm"."user_id" = "auth"."uid"()) AND ("gm"."valid_to" IS NULL))))));



CREATE POLICY "tkb_delete_allowed" ON "public"."tkb_files" FOR DELETE TO "authenticated" USING (((("scope" = 'personal'::"text") AND (("owner_id" = "auth"."uid"()) OR "public"."is_owner"())) OR (("scope" = 'shared'::"text") AND "public"."is_owner"())));



ALTER TABLE "public"."tkb_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tkb_files_manager_shared_read" ON "public"."tkb_files" FOR SELECT TO "authenticated" USING ((("scope" = 'shared'::"text") AND ("public"."has_manager_permission"('upload_shared'::"text") OR "public"."has_manager_permission"('activate_shared_tkb'::"text"))));



CREATE POLICY "tkb_read_allowed" ON "public"."tkb_files" FOR SELECT TO "authenticated" USING (((("scope" = 'personal'::"text") AND (("owner_id" = "auth"."uid"()) OR "public"."is_owner"())) OR (("scope" = 'shared'::"text") AND ("is_active" OR "public"."can_manage_shared"()))));



CREATE POLICY "transfer_log_read_scope" ON "public"."teacher_group_transfer_log" FOR SELECT TO "authenticated" USING (("public"."is_owner"() OR ("moved_by" = "auth"."uid"()) OR "public"."can_view_teacher_group"("old_group_id") OR "public"."can_view_teacher_group"("new_group_id")));



ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."can_manage_teacher_group"("p_group" "uuid", "p_user" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_view_teacher_group"("p_group" "uuid", "p_user" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."complete_password_change"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_teacher_group"("p_name" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tkb_files" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tkb_files" TO "authenticated";
GRANT ALL ON TABLE "public"."tkb_files" TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_tkb_upload"("p_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."has_manager_permission"("p_permission" "text", "p_user" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."mark_login"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."move_teacher_to_group"("p_user_id" "uuid", "p_new_group_id" "uuid", "p_effective_at" timestamp with time zone, "p_reason" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."my_access_context"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."my_group_dashboard"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."rename_teacher_group"("p_group_id" "uuid", "p_name" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."reserve_tkb_upload"("p_scope" "text", "p_original_name" "text", "p_size_bytes" bigint, "p_mime_type" "text", "p_notes" "text") TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."site_branding" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."site_branding" TO "authenticated";
GRANT ALL ON TABLE "public"."site_branding" TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_site_branding"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."save_site_branding"("p_site_title" "text", "p_site_subtitle" "text", "p_show_header_text" boolean, "p_logo_path" "text", "p_icon_path" "text", "p_logo_box_width" integer, "p_logo_box_height" integer, "p_logo_mobile_height" integer, "p_logo_align" "text", "p_logo_fit" "text", "p_logo_background" "text", "p_logo_radius" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."search_group_transfer_candidates"("p_query" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_active_personal_tkb"("p_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_active_shared_tkb"("p_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_global_specialist_access"("p_user_id" "uuid", "p_enabled" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_group_manager"("p_group_id" "uuid", "p_user_id" "uuid", "p_enabled" boolean, "p_is_primary" boolean, "p_can_manage_members" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_group_scoped_access"("p_group_id" "uuid", "p_user_id" "uuid", "p_enabled" boolean, "p_can_review_reports" boolean, "p_can_view_month_total" boolean, "p_can_manage_members" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_manager_permissions"("p_user_id" "uuid", "p_is_manager" boolean, "p_permissions" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_payroll_detail_access"("p_user_id" "uuid", "p_enabled" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_profile_teacher_code"("p_user_id" "uuid", "p_teacher_code" "text") TO "authenticated";


















GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_group_managers" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_group_managers" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_group_managers" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_group_memberships" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_group_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_group_memberships" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_group_scoped_access" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_group_scoped_access" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_group_scoped_access" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_group_transfer_log" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_group_transfer_log" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_group_transfer_log" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_groups" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teacher_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_groups" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_notifications" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

drop policy "site_branding_public_read" on "public"."site_branding";


  create policy "site_branding_public_read"
  on "public"."site_branding"
  as permissive
  for select
  to anon, authenticated
using ((id = 'default'::text));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


  create policy "storage_branding_owner_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'site-branding'::text) AND public.is_owner()));



  create policy "storage_branding_owner_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'site-branding'::text) AND public.is_owner()));



  create policy "storage_branding_owner_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'site-branding'::text) AND public.is_owner()))
with check (((bucket_id = 'site-branding'::text) AND public.is_owner()));



  create policy "storage_branding_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'site-branding'::text));



  create policy "storage_tkb_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'tkb-private'::text) AND (EXISTS ( SELECT 1
   FROM public.tkb_files f
  WHERE ((f.storage_path = objects.name) AND (((f.scope = 'personal'::text) AND ((f.owner_id = auth.uid()) OR public.is_owner())) OR ((f.scope = 'shared'::text) AND public.is_owner())))))));



  create policy "storage_tkb_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'tkb-private'::text) AND (EXISTS ( SELECT 1
   FROM public.tkb_files f
  WHERE ((f.storage_path = objects.name) AND (f.status = 'uploading'::text) AND (f.uploaded_by = auth.uid()) AND (((f.scope = 'personal'::text) AND (f.owner_id = auth.uid())) OR ((f.scope = 'shared'::text) AND public.can_manage_shared())))))));



  create policy "storage_tkb_read"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'tkb-private'::text) AND (EXISTS ( SELECT 1
   FROM public.tkb_files f
  WHERE ((f.storage_path = objects.name) AND (f.status = 'ready'::text) AND (((f.scope = 'personal'::text) AND ((f.owner_id = auth.uid()) OR public.is_owner())) OR ((f.scope = 'shared'::text) AND (f.is_active OR public.can_manage_shared()))))))));
